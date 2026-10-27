"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileQuestion, Loader2, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, JobStatusBadge, progressPct } from "@/components/common";
import { JobIcon } from "@/components/jobs-table";
import { DownloadButtons, TranscriptViewer } from "@/components/transcript-viewer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, Progress, Skeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { ACTIVE_STATUSES, LANGUAGE_LABELS } from "@/lib/constants";
import { useModels } from "@/lib/hooks/use-models";
import { useJob } from "@/lib/hooks/use-job";
import { getLocalMedia } from "@/lib/media";
import type { Job, ResultFormat, TranscriptJson, TranscriptSegment } from "@/lib/types";
import { formatBytes, formatCredits, formatDate, formatDuration } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { job, loading, notFound, error } = useJob(id);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (notFound || !job) {
    return (
      <Card>
        {error && !notFound ? (
          <ErrorState message={errorMessage(error)} />
        ) : (
          <EmptyState
            icon={<FileQuestion />}
            title="İş bulunamadı"
            description="Bu iş silinmiş olabilir ya da size ait değil."
            action={
              <Button asChild variant="outline">
                <Link href="/jobs">İşlerime dön</Link>
              </Button>
            }
          />
        )}
      </Card>
    );
  }

  return <JobView job={job} />;
}

function JobView({ job }: { job: Job }) {
  const { label: modelLabel } = useModels();
  const meta = [
    formatDuration(job.duration_sec),
    formatBytes(job.size_bytes),
    LANGUAGE_LABELS[job.detected_language ?? job.language ?? "auto"] ?? job.detected_language,
    modelLabel(job.model),
  ].filter(Boolean);

  return (
    <>
      <Link
        href="/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" /> İşlerim
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <JobIcon job={job} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-ink-900">{job.filename}</h1>
              <JobStatusBadge job={job} />
            </div>
            <p className="mt-1 text-sm text-ink-500">
              {meta.join(" · ")} · {formatDate(job.created_at)}
            </p>
          </div>
        </div>
        {!ACTIVE_STATUSES.includes(job.status) && <DeleteJobButton job={job} />}
      </div>

      {job.status === "completed" ? (
        <CompletedView job={job} />
      ) : job.status === "failed" ? (
        <FailedView job={job} />
      ) : (
        <PendingView job={job} />
      )}
    </>
  );
}

function PendingView({ job }: { job: Job }) {
  const processing = job.status === "processing";
  const pct = progressPct(job.progress);
  return (
    <Card className="px-6 py-14 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">
        {processing ? <Loader2 className="size-6 animate-spin" /> : <Clock className="size-6" />}
      </div>
      <p className="mt-5 text-lg font-semibold text-ink-900">
        {processing ? "Transkript hazırlanıyor" : "Sırada bekliyor"}
      </p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
        {processing
          ? "Kaydınız dinleniyor. Bu sayfa kendiliğinden güncellenecek, kapatabilirsiniz."
          : "İşiniz kuyruğa alındı, birazdan işlenmeye başlayacak."}
      </p>
      <div className="mx-auto mt-6 max-w-sm">
        {processing ? (
          <>
            <Progress value={pct} />
            <p className="mt-2 text-sm tabular-nums text-ink-500">%{pct}</p>
          </>
        ) : (
          <div className="h-2 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-200" />
          </div>
        )}
      </div>
      {job.credits_cost != null && (
        <p className="mt-6 text-xs text-ink-400">
          Bu iş için {formatCredits(job.credits_cost)} kredi ayrıldı.
        </p>
      )}
    </Card>
  );
}

function FailedView({ job }: { job: Job }) {
  return (
    <Card className="px-6 py-14 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent-50 text-accent-500">
        <XCircle className="size-6" />
      </div>
      <p className="mt-5 text-lg font-semibold text-ink-900">Transkript oluşturulamadı</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        {job.error || "Dosya işlenirken bir sorun oluştu."}
      </p>
      <p className="mx-auto mt-4 inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
        Ayrılan kredi bakiyenize iade edildi
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/upload">Yeni dosya yükle</Link>
        </Button>
      </div>
    </Card>
  );
}

function CompletedView({ job }: { job: Job }) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>();
  const local = getLocalMedia(job.id);

  const transcript = useQuery({
    queryKey: ["transcript", job.id],
    queryFn: async (): Promise<TranscriptJson> => {
      const res = await api.transcript(job.id);
      // Yanıt {segments: [...]} ya da doğrudan segment dizisi olabilir.
      if (Array.isArray(res)) return { segments: res as TranscriptSegment[] };
      const obj = (res ?? {}) as Partial<TranscriptJson>;
      return { ...obj, segments: obj.segments ?? [] };
    },
    staleTime: Infinity,
  });

  // Bu oturumda yüklenmediyse kaynak medyayı sunucudan istemeyi dene; yoksa oynatıcı gizlenir.
  const source = useQuery({
    queryKey: ["source", job.id],
    queryFn: () => api.downloadUrl(job.id, "source"),
    enabled: !local,
    retry: false,
    staleTime: 10 * 60_000,
  });

  const mediaUrl = local?.url ?? source.data?.url;
  const isVideo = local?.isVideo ?? job.content_type?.startsWith("video");
  const formats: ResultFormat[] | undefined = undefined;

  function seek(t: number) {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = t;
    void el.play().catch(() => {});
  }

  const mediaProps = {
    src: mediaUrl,
    controls: true,
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => setCurrentTime(e.currentTarget.currentTime),
    className: "w-full",
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card className="order-2 overflow-hidden lg:order-1">
        {transcript.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
            ))}
          </div>
        ) : transcript.isError ? (
          <ErrorState message={errorMessage(transcript.error)} onRetry={() => transcript.refetch()} />
        ) : (
          <TranscriptViewer
            segments={transcript.data?.segments ?? []}
            currentTime={currentTime}
            onSeek={mediaUrl ? seek : undefined}
          />
        )}
      </Card>

      <div className="order-1 space-y-4 lg:order-2">
        {mediaUrl && (
          <Card className="overflow-hidden p-3">
            {isVideo ? (
              <video ref={(el) => { mediaRef.current = el; }} {...mediaProps} className="w-full rounded-xl bg-ink-900" />
            ) : (
              <audio ref={(el) => { mediaRef.current = el; }} {...mediaProps} />
            )}
          </Card>
        )}

        <Card className="p-5">
          <p className="text-sm font-medium text-ink-900">İndir</p>
          <p className="mb-3 mt-0.5 text-xs text-ink-500">SRT ve VTT altyazı olarak kullanılabilir.</p>
          <DownloadButtons jobId={job.id} available={formats} />
        </Card>

        <Card className="p-5">
          <dl className="space-y-2.5 text-sm">
            <Row label="Süre" value={formatDuration(job.duration_sec)} />
            <Row label="Kullanılan kredi" value={formatCredits(job.credits_cost)} />
            <Row
              label="Algılanan dil"
              value={LANGUAGE_LABELS[job.detected_language ?? ""] ?? job.detected_language ?? "—"}
            />
            <Row label="Tamamlanma" value={formatDate(job.finished_at)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium tabular-nums text-ink-900">{value}</dd>
    </div>
  );
}

function DeleteJobButton({ job }: { job: Job }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    setBusy(true);
    try {
      await api.deleteJob(job.id);
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("İş silindi.");
      router.replace("/jobs");
    } catch (e) {
      toast.error(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="self-start">
          <Trash2 /> Sil
        </Button>
      </DialogTrigger>
      <DialogContent
        title="İşi sil"
        description="Transkript ve yüklenen dosya kalıcı olarak silinecek. Bu işlem geri alınamaz."
      >
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Vazgeç</Button>
          </DialogClose>
          <Button variant="accent" onClick={onDelete} loading={busy}>
            Kalıcı olarak sil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
