"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock3, Coins, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { setPendingFile, UploadDropzone } from "@/components/upload-dropzone";
import { api, errorMessage } from "@/lib/api";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { useAuth } from "@/lib/hooks/use-auth";
import { useBalance, usePricing } from "@/lib/hooks/use-me";

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
      <PageHeader title={firstName ? `Merhaba, ${firstName}` : "Genel bakış"} />

      <StaggerGroup className="grid gap-4 lg:grid-cols-3">
        <StaggerItem className="h-full">
          <Card dark hover className="relative h-full overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -top-12 size-44 animate-aurora rounded-full bg-brand-500/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 size-36 animate-aurora rounded-full bg-accent-500/20 blur-2xl [animation-delay:-4s]" />
            <CardContent className="relative flex h-full flex-col">
              <p className="flex items-center gap-2 text-sm text-ink-300">
                <Coins className="size-4 text-accent-400" /> Kredi bakiyesi
              </p>
              <div className="mt-3 text-4xl font-semibold tabular-nums tracking-tight">
                {balance == null ? (
                  <Skeleton className="h-10 w-24 bg-white/10" />
                ) : (
                  <AnimatedNumber value={balance} />
                )}
              </div>
              <p className="mt-1 text-sm text-ink-300">
                ≈{" "}
                {balance == null ? (
                  "—"
                ) : (
                  <AnimatedNumber value={Math.floor(balance / pricing.credits_per_minute)} />
                )}{" "}
                dakika
              </p>
              <Link
                href="/credits"
                className="group/link mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-brand-300 transition-colors hover:text-white"
              >
                İşlem geçmişi
                <ArrowRight className="size-4 transition-transform duration-200 group-hover/link:translate-x-1" />
              </Link>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem className="lg:col-span-2">
          <Card className="h-full">
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
        </StaggerItem>
      </StaggerGroup>

      <StaggerGroup stagger={0.05} className="mt-4 grid grid-cols-3 gap-4">
        <StaggerItem>
          <MiniStat icon={<ListChecks />} label="Son işler" value={items.length} loading={jobs.isLoading} />
        </StaggerItem>
        <StaggerItem>
          <MiniStat
            icon={<Clock3 />}
            label="Devam eden"
            value={active}
            loading={jobs.isLoading}
            live={active > 0}
          />
        </StaggerItem>
        <StaggerItem>
          <MiniStat icon={<FileText />} label="Tamamlanan" value={completed.length} loading={jobs.isLoading} />
        </StaggerItem>
      </StaggerGroup>

      <FadeIn delay={0.14} className="mt-4">
        <Card>
          <CardHeader className="items-center">
            <CardTitle>Son işler</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/jobs">
                Tümü <ArrowRight className="group-hover/btn:translate-x-0.5" />
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
              <EmptyState icon={<FileText />} title="Henüz bir işiniz yok" />
            ) : (
              <JobsTable jobs={items} />
            )}
          </div>
        </Card>
      </FadeIn>
    </>
  );
}

function MiniStat({
  icon,
  label,
  value,
  loading,
  live,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  live?: boolean;
}) {
  return (
    <Card hover className="group">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className="hidden size-10 place-items-center rounded-xl bg-brand-50 text-brand-500 transition-transform duration-300 group-hover:scale-110 sm:grid [&_svg]:size-4.5">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-ink-500">
            {label}
            {live && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-brand-500" />
              </span>
            )}
          </p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-8" />
          ) : (
            <p className="text-xl font-semibold tabular-nums text-ink-900">
              <AnimatedNumber value={value} />
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
