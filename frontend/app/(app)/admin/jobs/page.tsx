"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, Workflow } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { Card, Input, Select, Skeleton } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { STATUS_LABELS } from "@/lib/constants";

export default function AdminJobsPage() {
  const [status, setStatus] = useState("");
  const [uidInput, setUidInput] = useState("");
  const [uid, setUid] = useState("");

  const q = useInfiniteQuery({
    queryKey: ["admin", "jobs", status, uid],
    queryFn: ({ pageParam }) =>
      api.admin.jobs({ status: status || undefined, uid: uid || undefined, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    refetchInterval: 15_000,
  });

  const jobs = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Tüm işler" description="Sistemdeki tüm transkript işleri." />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <form
          className="relative flex-1 sm:max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setUid(uidInput.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            onBlur={() => setUid(uidInput.trim())}
            placeholder="Kullanıcı UID ile filtrele"
            className="pl-9"
          />
        </form>
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
          <EmptyState icon={<Workflow />} title="İş bulunamadı" />
        ) : (
          <>
            {/* Firestore kuralları başka kullanıcının işini okumaya izin vermediği için detay linki yok. */}
            <JobsTable jobs={jobs} showOwner hrefFor={() => null} />
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
