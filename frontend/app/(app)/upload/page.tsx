"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, Coins, FileAudio, FileVideo, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, AnimatePresence, motion, SoundWave, SPRING_SNAPPY } from "@/components/ui/motion";
import { Card, CardContent, Label, Progress, Select, Skeleton, Textarea } from "@/components/ui/primitives";
import { takePendingFile, UploadDropzone } from "@/components/upload-dropzone";
import { api, ApiError, errorMessage } from "@/lib/api";
import { CONTEXT_MAX_LENGTH, LANGUAGES } from "@/lib/constants";
import {
  FFmpegUnavailableError,
  needsPreparation,
  NoAudioError,
  prepareForUpload,
  type PreparePhase,
} from "@/lib/extract-audio";
import { useBalance, usePricing } from "@/lib/hooks/use-me";
import { estimateModelCredits, useModels } from "@/lib/hooks/use-models";
import {
  getMediaDuration,
  guessMime,
  rememberLocalMedia,
  uploadWithProgress,
} from "@/lib/media";
import type { ModelDetail } from "@/lib/types";
import { cn, formatBytes, formatCredits, formatDuration } from "@/lib/utils";

type Stage = "idle" | "ready" | "extracting" | "uploading" | "creating";

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";

const MODEL_STORAGE_KEY = "stt:model";

function readStoredModel(): string | null {
  try {
    return localStorage.getItem(MODEL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeModel(id: string) {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, id);
  } catch {
    // Gizli pencere vb.: hatırlamasak da olur.
  }
}

function insufficientMessage(e: ApiError): string {
  const d = (e.detail as { detail?: { balance?: number; required?: number } } | undefined)?.detail;
  if (typeof d?.required === "number" && typeof d?.balance === "number") {
    return `Bu iş için ${formatCredits(d.required)} kredi gerekiyor, bakiyeniz ${formatCredits(d.balance)} kredi.`;
  }
  return "Krediniz bu iş için yetersiz.";
}

export default function UploadPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const pricing = usePricing();
  const { models, defaultModel, loaded: modelsLoaded } = useModels();
  const { balance } = useBalance();

  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null | undefined>(undefined);
  const [language, setLanguage] = useState("tr");
  const [pickedModel, setPickedModel] = useState<string | null>(null);
  const [context, setContext] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [extractPhase, setExtractPhase] = useState<PreparePhase>("loading");
  const [extractPct, setExtractPct] = useState(0);
  const [audioSize, setAudioSize] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setPickedModel(readStoredModel());
    const f = takePendingFile();
    if (f) selectFile(f);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseModel(id: string) {
    setPickedModel(id);
    storeModel(id);
  }

  async function selectFile(f: File) {
    setFile(f);
    setStage("ready");
    setAudioSize(null);
    setDuration(undefined);
    setDuration(await getMediaDuration(f));
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setDuration(undefined);
    setStage("idle");
    setProgress(0);
    setExtractPct(0);
    setAudioSize(null);
  }

  const selected: ModelDetail | undefined =
    models.find((m) => m.id === pickedModel) ?? models.find((m) => m.id === defaultModel);
  const model = selected?.id;

  const maxBytes = pricing.max_file_mb * 1024 * 1024;
  const willExtract = file ? needsPreparation(file) : false;
  const cost = duration && selected ? estimateModelCredits(duration, selected) : null;
  const tooLong = duration != null && duration > pricing.max_duration_sec;
  const tooBig = file != null && !willExtract && file.size > maxBytes;
  const insufficient = cost != null && balance != null && cost > balance;
  const busy = stage === "extracting" || stage === "uploading" || stage === "creating";

  async function start() {
    if (!file || !model) return;
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      let uploadFile = file;
      if (willExtract) {
        setStage("extracting");
        setExtractPct(0);
        try {
          uploadFile = await prepareForUpload(file, {
            durationSec: duration,
            onPhase: setExtractPhase,
            onProgress: setExtractPct,
            signal: ac.signal,
          });
          if (uploadFile !== file) setAudioSize(uploadFile.size);
        } catch (e) {
          if (isAbort(e) || e instanceof NoAudioError || file.size > maxBytes) throw e;
          if (!(e instanceof FFmpegUnavailableError)) {
            toast.warning("Ses ayrıştırılamadı, dosyanın kendisi yükleniyor.");
          }
          uploadFile = file;
        }
      }
      if (uploadFile.size > maxBytes) {
        throw new Error(`Yüklenecek dosya ${formatBytes(maxBytes)} sınırını aşıyor.`);
      }

      setStage("uploading");
      setProgress(0);
      const mime = uploadFile.type || guessMime(uploadFile);
      const signed = await api.signUpload({ filename: uploadFile.name, content_type: mime, size_bytes: uploadFile.size });
      await uploadWithProgress(
        signed.upload_url,
        uploadFile,
        signed.headers ?? { "Content-Type": mime },
        setProgress,
        ac.signal,
      );

      setStage("creating");
      const job = await api.createJob({
        object_path: signed.object_path,
        filename: file.name,
        language,
        model,
        context: context.trim() || undefined,
      });
      rememberLocalMedia(job.id, file);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Dosya alındı, transkript hazırlanıyor.");
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      if (isAbort(e)) return;
      setStage("ready");
      if (e instanceof ApiError && e.status === 402) {
        toast.error(insufficientMessage(e));
      } else {
        toast.error(errorMessage(e));
      }
    }
  }

  const isVideo = file?.type.startsWith("video");
  const FileIcon = isVideo ? FileVideo : FileAudio;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Yeni yükleme" />

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <UploadDropzone onFile={selectFile} />
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-ink-50/50 p-3.5">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/25">
                    {busy ? <SoundWave bars={4} className="h-4" barClassName="bg-white" /> : <FileIcon className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">{file.name}</p>
                    <p className="text-sm text-ink-500">
                      {formatBytes(file.size)}
                      {audioSize != null && <span className="text-brand-600"> → {formatBytes(audioSize)}</span>} ·{" "}
                      {duration === undefined ? "…" : duration ? formatDuration(duration) : "—"}
                    </p>
                  </div>
                  {!busy && (
                    <Button variant="ghost" size="icon" onClick={reset} title="Dosyayı kaldır">
                      <X />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                  <div>
                    <Label htmlFor="lang">Dil</Label>
                    <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={busy}>
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor="context">Bağlam (isteğe bağlı)</Label>
                      <span className="text-xs tabular-nums text-ink-400">
                        {context.length}/{CONTEXT_MAX_LENGTH}
                      </span>
                    </div>
                    <Textarea
                      id="context"
                      rows={2}
                      maxLength={CONTEXT_MAX_LENGTH}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      disabled={busy}
                      placeholder="Özel isimler, teknik terimler, konu…"
                    />
                  </div>
                </div>

                <div>
                  <Label>Model</Label>
                  {modelsLoaded ? (
                    <div className={cn("grid gap-2.5", models.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
                      {models.map((m) => (
                        <ModelCard
                          key={m.id}
                          model={m}
                          selected={model === m.id}
                          recommended={m.id === defaultModel}
                          duration={duration}
                          balance={balance}
                          disabled={busy}
                          onSelect={() => chooseModel(m.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-36" />
                      ))}
                    </div>
                  )}
                </div>

                {/* Maliyet özeti */}
                <div className="grid grid-cols-3 divide-x divide-ink-200/60 rounded-2xl border border-ink-100 bg-ink-50/60">
                  <Stat icon={<Clock3 />} label="Süre" value={duration ? formatDuration(duration) : "—"} />
                  <Stat
                    icon={<Coins />}
                    label="Maliyet"
                    value={cost != null ? <><AnimatedNumber value={cost} /> kredi</> : "—"}
                    highlight
                  />
                  <Stat
                    icon={<Coins />}
                    label="Bakiye"
                    value={balance != null ? <><AnimatedNumber value={balance} /> kredi</> : "—"}
                    danger={insufficient}
                  />
                </div>

                {tooLong && (
                  <Notice tone="accent">Kayıt en fazla {formatDuration(pricing.max_duration_sec)} olabilir.</Notice>
                )}
                {tooBig && <Notice tone="accent">Dosya en fazla {formatBytes(maxBytes)} olabilir.</Notice>}
                {insufficient && (
                  <Notice tone="accent">
                    Seçili model için krediniz yetersiz.{" "}
                    <Link href="/credits" className="font-medium underline">
                      Krediler
                    </Link>
                  </Notice>
                )}

                <AnimatePresence>
                  {stage === "extracting" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ProgressRow
                        label={
                          extractPhase === "loading"
                            ? "Hazırlanıyor…"
                            : extractPhase === "copying"
                              ? "Ses ayrıştırılıyor…"
                              : "Ses dönüştürülüyor…"
                        }
                        pct={extractPhase === "loading" ? null : extractPct}
                      />
                    </motion.div>
                  )}
                  {stage === "uploading" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <ProgressRow label="Yükleniyor" pct={progress} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  {busy && (
                    <Button variant="ghost" onClick={reset}>
                      İptal
                    </Button>
                  )}
                  <Button
                    size="lg"
                    onClick={start}
                    loading={busy}
                    disabled={busy || !model || duration === undefined || insufficient || tooLong || tooBig}
                  >
                    {stage === "extracting"
                      ? "Hazırlanıyor…"
                      : stage === "uploading"
                        ? "Yükleniyor…"
                        : stage === "creating"
                          ? "Başlatılıyor…"
                          : "Metne dönüştür"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1.5" aria-label={`${label} ${value}/3`}>
      <span className="text-ink-500">{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-3 rounded-full transition-colors duration-300",
              i <= value ? "bg-brand-500" : "bg-ink-200",
            )}
          />
        ))}
      </span>
    </span>
  );
}

function ModelCard({
  model: m,
  selected,
  recommended,
  duration,
  balance,
  disabled,
  onSelect,
}: {
  model: ModelDetail;
  selected: boolean;
  recommended: boolean;
  duration: number | null | undefined;
  balance: number | null;
  disabled: boolean;
  onSelect: () => void;
}) {
  const cost = duration ? estimateModelCredits(duration, m) : null;
  const short = cost != null && balance != null && cost > balance;
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={SPRING_SNAPPY}
      aria-pressed={selected}
      className={cn(
        "relative flex cursor-pointer flex-col rounded-2xl border p-4 text-left transition-colors disabled:pointer-events-none disabled:opacity-60",
        selected ? "border-transparent" : "border-ink-200/80 bg-white hover:border-ink-300 hover:bg-ink-50/40",
      )}
    >
      {selected && (
        <motion.span
          layoutId="upload-model-active"
          transition={SPRING_SNAPPY}
          className="absolute inset-0 -z-10 rounded-2xl border-2 border-brand-500 bg-brand-50/60 shadow-sm shadow-brand-500/10"
        />
      )}

      <span className="flex items-start justify-between gap-2">
        <span className={cn("font-semibold transition-colors", selected ? "text-brand-700" : "text-ink-900")}>
          {m.label}
        </span>
        {recommended && (
          <span className="shrink-0 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Önerilen
          </span>
        )}
      </span>

      <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <Meter label="Kalite" value={m.quality} />
        <Meter label="Hız" value={m.speed} />
      </span>

      {m.speakers && (
        <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-white">
          <Users className="size-3" /> Konuşmacı ayrımı
        </span>
      )}

      {m.description && <span className="mt-2 text-xs leading-snug text-ink-500">{m.description}</span>}

      <span className="mt-auto pt-3">
        <span className="block text-sm font-semibold tabular-nums text-ink-900">
          {cost != null ? `${formatCredits(cost)} kredi` : `${formatCredits(m.credits_per_minute)} kredi / dk`}
        </span>
        {short && <span className="mt-0.5 block text-xs font-medium text-accent-600">Yetersiz bakiye</span>}
      </span>
    </motion.button>
  );
}

function ProgressRow({ label, pct }: { label: string; pct: number | null }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-ink-600">{label}</span>
        {pct != null && <span className="tabular-nums text-ink-500">%{pct}</span>}
      </div>
      {pct != null ? (
        <Progress value={pct} />
      ) : (
        <div className="h-2 overflow-hidden rounded-full bg-ink-100">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-300" />
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-xs text-ink-500 [&_svg]:size-3.5">
        {icon}
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-semibold tabular-nums",
          danger ? "text-accent-600" : highlight ? "text-brand-600" : "text-ink-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ring-1 ring-inset",
        tone === "accent"
          ? "bg-accent-50 text-accent-700 ring-accent-200/60"
          : "bg-ink-50 text-ink-600 ring-ink-200/60",
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
