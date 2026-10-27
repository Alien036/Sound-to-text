"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { FileText, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { ACTIVE_STATUSES } from "@/lib/constants";
import type { JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { value: JobStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "queued", label: "Kuyrukta" },
  { value: "processing", label: "İşleniyor" },
  { value: "completed", label: "Tamamlandı" },
  { value: "failed", label: "Başarısız" },
];

export default function JobsPage() {
  const [filter, setFilter] = useState<JobStatus | "all">("all");

  const q = useInfiniteQuery({
    // /jobs durum filtresi almıyor; filtre istemci tarafında uygulanır.
    queryKey: ["jobs", "list"],
    queryFn: ({ pageParam }) => api.listJobs({ limit: 20, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) => p.items.some((j) => ACTIVE_STATUSES.includes(j.status)))
        ? 5000
        : false,
  });

  const jobs = (q.data?.pages.flatMap((p) => p.items) ?? []).filter(
    (j) => filter === "all" || j.status === filter,
  );

  return (
    <>
      <PageHeader
        title="İşlerim"
        description="Yüklediğiniz tüm dosyalar ve transkript durumları."
        actions={
          <Button asChild>
            <Link href="/upload">
              <Upload /> Yeni yükleme
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-ink-100 sm:inline-flex">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              filter === f.value ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {q.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={<FileText />}
            title={filter === "all" ? "Henüz bir işiniz yok" : "Bu filtreye uyan iş yok"}
            description={filter === "all" ? "Bir ses ya da video dosyası yükleyerek başlayın." : undefined}
            action={
              filter === "all" && (
                <Button asChild>
                  <Link href="/upload">Dosya yükle</Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <JobsTable jobs={jobs} />
            {q.hasNextPage && (
              <div className="flex justify-center p-4">
                <Button variant="outline" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
                  Daha fazla göster
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
