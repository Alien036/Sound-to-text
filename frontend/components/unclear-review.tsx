"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HelpCircle, Play, RotateCcw, Rewind, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Input, Progress } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { getLocalMedia } from "@/lib/media";
import type { Job, UnclearResponse, UnclearSpot } from "@/lib/types";
import { cn, formatDate, formatDuration } from "@/lib/utils";

/** Backend'deki işaretle aynı (büyük harf / boşluklu yazımlar dahil). */
export const UNCLEAR_RE = /\[\s*[Aa]nla[şs][ıi]lm[ıi]yor\s*\]/g;

const dismissKey = (jobId: string) => `unclear-dismissed:${jobId}`;

function isDismissed(jobId: string) {
  try {
    return sessionStorage.getItem(dismissKey(jobId)) === "1";
  } catch {
    return false;
  }
}

function dismiss(jobId: string) {
  try {
    sessionStorage.setItem(dismissKey(jobId), "1");
  } catch {
    // depolama kapalıysa pencere bu oturumda tekrar açılabilir, sorun değil
  }
}

export function useUnclear(job: Job) {
  return useQuery({
    queryKey: ["unclear", job.id],
    queryFn: () => api.unclear(job.id),
    // unclear_count yalnızca bu özellikten önceki işlerde yok; o zaman sormak gerekir
    enabled: job.status === "completed" && job.unclear_count !== 0,
    staleTime: 10 * 60_000, // oynatma adresi 30 dk geçerli
  });
}

function isEditable(data: UnclearResponse) {
  return !data.editable_until || new Date(data.editable_until).getTime() > Date.now();
}

/**
 * İş detayında: [anlaşılmıyor] yerleri varsa düzeltme ekranını (doldurulmamış yer kalmışsa) kendiliğinden
 * açar ve yan panelde tekrar açma kartını gösterir. Kayıt yüklendikten sonra 7 gün boyunca düzeltilebilir.
 */
export function UnclearSection({ job }: { job: Job }) {
  const unclear = useUnclear(job);
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const data = unclear.data;

  useEffect(() => {
    if (!data || autoOpened) return;
    setAutoOpened(true);
    if (data.total > data.resolved && isEditable(data) && !isDismissed(job.id)) setOpen(true);
  }, [data, autoOpened, job.id]);

  if (!data || data.total === 0) return null;
  const editable = isEditable(data);

  return (
    <>
      <Card hover className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600">
            <HelpCircle className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink-900">Anlaşılmayan yerler</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {data.resolved}/{data.total} dolduruldu
              {editable && data.editable_until && ` · ${formatDate(data.editable_until)}`}
            </p>
          </div>
        </div>
        <Progress value={(data.resolved / data.total) * 100} className="mt-3" />
        {editable ? (
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setOpen(true)}>
            {data.resolved < data.total ? "Dinle ve doldur" : "Gözden geçir"}
          </Button>
        ) : (
          <p className="mt-3 text-xs text-ink-400">Düzeltme süresi sona erdi</p>
        )}
      </Card>
      {open && (
        <UnclearReview
          job={job}
          data={data}
          onClose={(skipped) => {
            if (skipped) dismiss(job.id);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function UnclearReview({
  job,
  data,
  onClose,
}: {
  job: Job;
  data: UnclearResponse;
  onClose: (skipped: boolean) => void;
}) {
  const qc = useQueryClient();
  const spots = data.spots;
  const [step, setStep] = useState(() => {
    const first = spots.findIndex((s) => !s.correction);
    return first === -1 ? 0 : first;
  });
  const spot = spots[step];
  const [value, setValue] = useState(spot.correction ?? "");
  const [changed, setChanged] = useState(false);

  useEffect(() => {
    setValue(spot.correction ?? "");
  }, [spot.id, spot.correction]);

  const save = useMutation({
    mutationFn: (text: string | null) => api.correctUnclear(job.id, spot.id, text),
    onSuccess: (res, text) => {
      setChanged(true);
      qc.setQueryData<UnclearResponse>(["unclear", job.id], (old) =>
        old && {
          ...old,
          resolved: res.resolved,
          spots: old.spots.map((s) => (s.id === spot.id ? { ...s, correction: text } : s)),
        },
      );
      next();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  function finish(skipped: boolean) {
    if (changed) {
      // Düzeltilmiş metin ve indirme dosyaları backend'de yeniden üretildi
      void qc.invalidateQueries({ queryKey: ["transcript", job.id] });
      toast.success("Düzeltmeler transkripte işlendi.");
    }
    onClose(skipped);
  }

  function next() {
    if (step + 1 < spots.length) setStep(step + 1);
    else finish(false);
  }

  function submit() {
    if (save.isPending) return;
    const text = value.trim();
    // Değişmeyen yer için istek atma; boş bırakılan ve önceden doldurulmamış yer "geç" sayılır
    if (text === (spot.correction ?? "")) next();
    else save.mutate(text || null);
  }

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && finish(true)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => {
            // Esc: bu yeri geç (pencereyi kapatmaz)
            e.preventDefault();
            if (!save.isPending) next();
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl shadow-ink-900/10 animate-dialog-in sm:p-6"
        >
          <div className="flex items-start justify-between gap-4 pr-1">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-ink-900">
                Anlaşılmayan yerler
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-sm tabular-nums text-ink-500">
                {step + 1} / {spots.length}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900">
              <X className="size-4" />
              <span className="sr-only">Kapat</span>
            </DialogPrimitive.Close>
          </div>
          <Progress value={(step / spots.length) * 100} className="mt-3" />

          <div key={spot.id} className="animate-enter">
            <SpotPlayer job={job} spot={spot} mediaUrl={data.media?.url} />
            <SpotText spot={spot} value={value} />
          </div>

          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={500}
              placeholder="Duyduğunu yaz…"
              aria-label="Anlaşılmayan yer için metin"
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => finish(true)}
                className="cursor-pointer text-sm text-ink-500 transition-colors hover:text-ink-900 sm:mr-auto"
              >
                Sonra yap
              </button>
              <Button type="button" variant="ghost" onClick={next} disabled={save.isPending}>
                Geç
              </Button>
              <Button type="submit" loading={save.isPending}>
                {step + 1 < spots.length ? "Kaydet ve ilerle" : "Kaydet ve bitir"}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** O anı çalar: önce bu oturumda yüklenen orijinal video, yoksa sunucudaki ses. */
function SpotPlayer({ job, spot, mediaUrl }: { job: Job; spot: UnclearSpot; mediaUrl?: string }) {
  const local = getLocalMedia(job.id);
  const src = local?.url ?? mediaUrl;
  const isVideo = !!local?.isVideo;
  const ref = useRef<HTMLMediaElement | null>(null);
  const windowStart = useRef(spot.play_start);
  const [blocked, setBlocked] = useState(false);
  const [slow, setSlow] = useState(false);

  function play(from = windowStart.current) {
    const el = ref.current;
    if (!el) return;
    el.currentTime = from;
    el.play().then(
      () => setBlocked(false),
      () => setBlocked(true), // tarayıcı kendiliğinden oynatmayı engelledi
    );
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        play();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = slow ? 0.75 : 1;
  }, [slow]);

  if (!src) {
    return (
      <p className="mt-4 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-500">
        Kayıt artık sunucuda yok; metne ve bağlama bakarak doldurabilirsin.
      </p>
    );
  }

  const mediaProps = {
    src,
    preload: "auto" as const,
    onLoadedMetadata: () => play(spot.play_start),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      if (e.currentTarget.currentTime >= spot.play_end) e.currentTarget.pause();
    },
  };

  return (
    <div className="mt-4 rounded-xl bg-ink-50 p-3">
      {isVideo ? (
        <video
          ref={(el) => {
            ref.current = el;
          }}
          {...mediaProps}
          playsInline
          className="max-h-56 w-full rounded-lg bg-ink-900"
        />
      ) : (
        <audio
          ref={(el) => {
            ref.current = el;
          }}
          {...mediaProps}
        />
      )}
      <div className={cn("flex flex-wrap items-center gap-2", isVideo && "mt-3")}>
        <Button size="sm" variant={blocked ? "primary" : "outline"} onClick={() => play()}>
          {blocked ? <Play /> : <RotateCcw />}
          {blocked ? "Oynat" : "Tekrar dinle"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // Zaman damgaları kayabiliyor: pencereyi geri genişlet
            windowStart.current = Math.max(0, windowStart.current - 5);
            play();
          }}
        >
          <Rewind /> −5 sn
        </Button>
        <Button size="sm" variant={slow ? "dark" : "outline"} onClick={() => setSlow(!slow)}>
          0.75×
        </Button>
        <span className="ml-auto font-mono text-xs tabular-nums text-ink-500">
          {formatDuration(spot.play_start)} – {formatDuration(spot.play_end)}
        </span>
      </div>
    </div>
  );
}

/** Önceki/sonraki cümleyle birlikte; doldurulan yer metnin içinde vurgulanır. */
function SpotText({ spot, value }: { spot: UnclearSpot; value: string }) {
  const target = Number(spot.id.split("-")[1]);
  const parts: React.ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of spot.text.matchAll(UNCLEAR_RE)) {
    parts.push(spot.text.slice(last, m.index));
    parts.push(
      k === target ? (
        <span
          key={m.index}
          className="rounded-md bg-accent-100 px-1.5 py-0.5 font-medium text-accent-700 ring-1 ring-accent-300"
        >
          {value.trim() || "_____"}
        </span>
      ) : (
        <span key={m.index} className="text-ink-400">
          {m[0]}
        </span>
      ),
    );
    last = m.index + m[0].length;
    k++;
  }
  parts.push(spot.text.slice(last));

  return (
    <div className="mt-4 space-y-2 text-[15px] leading-relaxed">
      {spot.before && <p className="text-sm text-ink-400">…{spot.before}</p>}
      <p className="text-ink-900">
        {spot.speaker && <span className="mr-1.5 text-xs font-semibold text-brand-600">{spot.speaker}:</span>}
        {parts}
      </p>
      {spot.after && <p className="text-sm text-ink-400">{spot.after}…</p>}
    </div>
  );
}
