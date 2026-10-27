import { AudioLines, CheckCircle2, Clock, Coins, Loader2, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import type { Job, JobStatus } from "@/lib/types";
import { cn, formatCredits } from "@/lib/utils";
import { Badge } from "./ui/primitives";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-brand-500 text-white">
        <AudioLines className="size-4.5" />
      </span>
      <span className={cn("text-[15px] font-semibold tracking-tight", light ? "text-white" : "text-ink-900")}>
        Sesyaz
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
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        low
          ? "border-accent-200 bg-accent-50 text-accent-700 hover:bg-accent-100"
          : "border-ink-100 bg-white text-ink-900 hover:bg-ink-50",
        className,
      )}
    >
      <Coins className={cn("size-4", low ? "text-accent-500" : "text-brand-500")} />
      <span className="tabular-nums">{balance == null ? "…" : formatCredits(balance)}</span>
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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
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
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-500 [&_svg]:size-5">
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
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-accent-50 text-accent-500">
        <XCircle className="size-5" />
      </div>
      <p className="text-sm text-ink-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-brand-600 hover:underline">
          Tekrar dene
        </button>
      )}
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <Loader2 className="size-6 animate-spin text-brand-500" />
    </div>
  );
}
