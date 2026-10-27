"use client";

import { AudioLines, CheckCircle2, Clock, Coins, Loader2, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import type { Job, JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnimatedNumber, SoundWave } from "./ui/motion";
import { Badge } from "./ui/primitives";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("group/logo inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/25 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:-rotate-3 group-hover/logo:scale-105">
        <AudioLines className="size-4.5" />
      </span>
      <span className={cn("text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-ink-900")}>
        Etheria
      </span>
    </Link>
  );
}

const statusTone: Record<JobStatus, "neutral" | "brand" | "solid" | "accent"> = {
  uploaded: "neutral",
  queued: "neutral",
  processing: "brand",
  completed: "solid",
  failed: "accent",
};

const statusIcon: Record<JobStatus, React.ReactNode> = {
  uploaded: <Upload />,
  queued: <Clock />,
  processing: <Loader2 className="animate-spin" />,
  completed: <CheckCircle2 />,
  failed: <XCircle />,
};

export function JobStatusBadge({ job }: { job: Pick<Job, "status" | "progress"> }) {
  const showPct = job.status === "processing" && typeof job.progress === "number";
  return (
    <Badge tone={statusTone[job.status]}>
      {statusIcon[job.status]}
      {STATUS_LABELS[job.status]}
      {showPct && <span className="tabular-nums">%{progressPct(job.progress)}</span>}
    </Badge>
  );
}

/** progress 0–1 ya da 0–100 gelebilir; yüzdeye çevir. */
export function progressPct(p?: number | null): number {
  if (p == null) return 0;
  return Math.round(p <= 1 ? p * 100 : p);
}

export function CreditBadge({ balance, className }: { balance: number | null; className?: string }) {
  const low = balance != null && balance <= 3;
  return (
    <Link
      href="/credits"
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-[0_1px_2px_rgba(22,22,63,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm",
        low
          ? "border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100"
          : "border-ink-200/70 bg-white text-ink-900 hover:border-ink-300",
        className,
      )}
    >
      <Coins
        className={cn(
          "size-4 transition-transform duration-200 group-hover:scale-110",
          low ? "text-accent-500" : "text-brand-500",
        )}
      />
      {balance == null ? <span className="tabular-nums text-ink-400">…</span> : <AnimatedNumber value={balance} />}
      <span className="text-ink-400">kredi</span>
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid size-13 animate-float place-items-center rounded-2xl bg-brand-50 text-brand-500 ring-8 ring-brand-50/50 [&_svg]:size-5">
        {icon}
      </div>
      <p className="font-medium text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent-50 text-accent-500 ring-8 ring-accent-50/50">
        <XCircle className="size-5" />
      </div>
      <p className="text-sm text-ink-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="cursor-pointer text-sm font-medium text-brand-600 hover:underline">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <SoundWave bars={5} className="h-7" />
    </div>
  );
}
