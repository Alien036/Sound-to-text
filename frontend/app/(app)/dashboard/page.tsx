"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Coins, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { setPendingFile, UploadDropzone } from "@/components/upload-dropzone";
import { api, errorMessage } from "@/lib/api";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBalance, usePricing } from "@/lib/hooks/use-me";
import { formatCredits } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { balance } = useBalance();
  const pricing = usePricing();

  const jobs = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => api.listJobs({ limit: 6 }),
    refetchInterval: (q) =>
      q.state.data?.items.some((j) => ACTIVE_STATUSES.includes(j.status)) ? 4000 : false,
  });

  const items = jobs.data?.items ?? [];
  const completed = items.filter((j) => j.status === "completed");
  const active = items.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
  const firstName = user?.displayName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Merhaba, ${firstName}` : "Merhaba"}
        description="Kayıtlarını yükle, transkriptlerini burada takip et."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-0 bg-ink-900 text-white">
          <div className="absolute -right-10 -top-10 size-40 rounded-full bg-brand-500/40 blur-2xl" />
          <CardContent className="relative flex h-full flex-col">
            <p className="flex items-center gap-2 text-sm text-ink-300">
              <Coins className="size-4 text-accent-400" /> Kredi bakiyesi
            </p>
            <div className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
              {balance == null ? <Skeleton className="h-10 w-24 bg-white/10" /> : formatCredits(balance)}
            </div>
            <p className="mt-1 text-sm text-ink-300">
              ≈ {balance == null ? "—" : formatCredits(Math.floor(balance / pricing.credits_per_minute))} dakika
              transkript (Turbo)
            </p>
            <Link
              href="/credits"
              className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-medium text-brand-300 hover:text-white"
            >
              İşlem geçmişi <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent>
            <UploadDropzone
              compact
              onFile={(f) => {
                setPendingFile(f);
                router.push("/upload");
              }}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <MiniStat icon={<ListChecks />} label="Son işler" value={items.length} loading={jobs.isLoading} />
        <MiniStat icon={<Clock3 />} label="Devam eden" value={active} loading={jobs.isLoading} />
        <MiniStat icon={<FileText />} label="Tamamlanan" value={completed.length} loading={jobs.isLoading} />
      </div>

      <Card className="mt-4">
        <CardHeader className="items-center">
          <CardTitle>Son işler</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/jobs">
              Tümü <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <div className="mt-3">
          {jobs.isLoading ? (
            <div className="space-y-3 p-5 pt-0">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : jobs.isError ? (
            <ErrorState message={errorMessage(jobs.error)} onRetry={() => jobs.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="Henüz bir işiniz yok"
              description="İlk dosyanızı yükleyin; transkript hazır olduğunda burada görünecek."
            />
          ) : (
            <JobsTable jobs={items} />
          )}
        </div>
      </Card>
    </>
  );
}

function MiniStat({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="hidden size-9 place-items-center rounded-xl bg-brand-50 text-brand-500 sm:grid [&_svg]:size-4">
          {icon}
        </span>
        <div>
          <p className="text-xs text-ink-500">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-8" />
          ) : (
            <p className="text-xl font-semibold tabular-nums text-ink-900">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
