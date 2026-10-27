"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, AudioLines, Clock3, Coins, FileAudio, FileVideo, Info, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
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
import type { ModelDetail } from "@/lib/types";
import {
  getMediaDuration,
  guessMime,
  rememberLocalMedia,
  uploadWithProgress,
} from "@/lib/media";
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

/** 402 insufficient_credits: detail.balance ve detail.required ile açıklayıcı mesaj. */
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

  // Kayıtlı/seçili model artık listede yoksa backend'in default_model'ine dön.
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
          // Ayrıştırma olmadıysa ve dosya sınırın altındaysa orijinali yükle.
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
      <PageHeader title="Yeni yükleme" description="Ses ya da video dosyanızı yükleyin, metne dönüştürelim." />

      {!file ? (
        <UploadDropzone onFile={selectFile} />
      ) : (
        <Card>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                <FileIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900">{file.name}</p>
                <p className="text-sm text-ink-500">
                  {formatBytes(file.size)}
                  {audioSize != null && <span className="text-brand-600"> → {formatBytes(audioSize)} ses</span>} ·{" "}
                  {duration === undefined ? "süre ölçülüyor…" : duration ? formatDuration(duration) : "süre okunamadı"}
                </p>
              </div>
              {!busy && (
                <Button variant="ghost" size="icon" onClick={reset} title="Dosyayı kaldır">
                  <X />
                </Button>
              )}
            </div>

            {willExtract && (
              <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-700">
                <AudioLines className="mt-0.5 size-4 shrink-0" />
                <span>
                  {isVideo
                    ? "Yüklemeyi hızlandırmak için videonun sesi tarayıcınızda ayrılacak, kalite kaybı olmadan."
                    : "Büyük WAV dosyası yüklemeden önce tarayıcınızda sıkıştırılacak."}{" "}
                  İlk seferde ses işleyici (~30 MB) indirilir. Bu sırada sekmeyi kapatmayın.
                </span>
              </p>
            )}

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
                  <Label htmlFor="context">Kayıt hakkında kısa bilgi (isteğe bağlı)</Label>
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
                  placeholder="Ör. Psikolojik danışmanlık görüşmesi. Süpervizör: Gökhan Hoca. Geçen terimler: YKS, yurt."
                />
                <p className="mt-1 text-xs text-ink-400">
                  Konu ve geçen özel isimler/terimler, doğru yazılma ihtimalini artırır.
                </p>
              </div>
            </div>

            <div>
              <Label>Model</Label>
              {modelsLoaded ? (
                <div className={cn("grid gap-2", models.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
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
                <div className="grid gap-2 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-36" />
                  ))}
                </div>
              )}
              {selected && !selected.precise_timestamps && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
                  <Info className="size-3.5 shrink-0" />
                  Altyazı (SRT) için zaman damgaları birkaç saniye kayabilir.
                </p>
              )}
            </div>

            {/* Maliyet özeti */}
            <div className="grid grid-cols-3 divide-x divide-ink-100 rounded-2xl bg-ink-50">
              <Stat icon={<Clock3 />} label="Süre" value={duration ? formatDuration(duration) : "—"} />
              <Stat
                icon={<Coins />}
                label="Tahmini maliyet"
                value={cost != null ? `${formatCredits(cost)} kredi` : "—"}
                highlight
              />
              <Stat
                icon={<Coins />}
                label="Bakiye"
                value={balance != null ? `${formatCredits(balance)} kredi` : "—"}
                danger={insufficient}
              />
            </div>

            {duration === null && (
              <Notice>Tarayıcı süreyi okuyamadı; kesin maliyet sunucuda hesaplanacak.</Notice>
            )}
            {tooLong && (
              <Notice tone="accent">Kayıt en fazla {formatDuration(pricing.max_duration_sec)} olabilir.</Notice>
            )}
            {tooBig && <Notice tone="accent">Dosya en fazla {formatBytes(maxBytes)} olabilir.</Notice>}
            {insufficient && (
              <Notice tone="accent">
                Seçili model için krediniz yetmiyor. Daha uygun bir model seçebilir ya da{" "}
                <Link href="/credits" className="font-medium underline">
                  kredi yükletebilirsiniz
                </Link>
                .
              </Notice>
            )}

            {stage === "extracting" && (
              <ProgressRow
                label={
                  extractPhase === "loading"
                    ? "Ses işleyici hazırlanıyor…"
                    : extractPhase === "copying"
                      ? "Ses ayrıştırılıyor…"
                      : "Ses dönüştürülüyor…"
                }
                pct={extractPhase === "loading" ? null : extractPct}
              />
            )}
            {stage === "uploading" && <ProgressRow label="Yükleniyor" pct={progress} />}

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
                  ? "Ses ayrıştırılıyor…"
                  : stage === "uploading"
                    ? "Yükleniyor…"
                    : stage === "creating"
                      ? "İş oluşturuluyor…"
                      : "Metne dönüştür"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-center text-xs text-ink-400">
        {pricing.credits_per_minute} kredi = 1 dakika · süre yukarı yuvarlanır · iş başarısız olursa kredi iade edilir
      </p>
    </div>
  );
}

/** 1–3 arası değeri üç çubukla gösterir (0 = bilinmiyor, gösterilmez). */
function Meter({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1.5" aria-label={`${label} ${value}/3`}>
      <span className="text-ink-500">{label}</span>
      <span className="flex gap-0.5">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 w-3 rounded-full", i <= value ? "bg-brand-500" : "bg-ink-200")} />
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
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col rounded-2xl border p-4 text-left transition-colors disabled:opacity-60",
        selected ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-ink-200 hover:bg-ink-50",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className={cn("font-semibold", selected ? "text-brand-700" : "text-ink-900")}>{m.label}</span>
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
          <Users className="size-3" /> Konuşmacıları ayırır
        </span>
      )}

      {m.description && <span className="mt-2 text-xs leading-snug text-ink-500">{m.description}</span>}

      <span className="mt-auto pt-3">
        <span className="block text-sm font-semibold tabular-nums text-ink-900">
          {cost != null ? `${formatCredits(cost)} kredi` : `${formatCredits(m.credits_per_minute)} kredi / dk`}
        </span>
        {short && (
          <span className="mt-0.5 block text-xs font-medium text-accent-600">
            Yetersiz kredi (bakiye: {formatCredits(balance)})
          </span>
        )}
      </span>
    </button>
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
  value: string;
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
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm",
        tone === "accent" ? "bg-accent-50 text-accent-700" : "bg-ink-50 text-ink-600",
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
