"use client";

import { ChevronRight, FileAudio, FileVideo } from "lucide-react";
import Link from "next/link";
import type { Job } from "@/lib/types";
import { cn, formatCredits, formatDuration, formatRelative } from "@/lib/utils";
import { JobStatusBadge } from "./common";
import { Table, Td, Th } from "./ui/primitives";

export function JobIcon({ job, className }: { job: Pick<Job, "content_type" | "filename">; className?: string }) {
  const isVideo = job.content_type?.startsWith("video") || /\.(mp4|mov|mkv)$/i.test(job.filename);
  const Icon = isVideo ? FileVideo : FileAudio;
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-500 ring-1 ring-inset ring-ink-200/50 transition-all duration-200 group-hover:scale-105 group-hover:bg-brand-50 group-hover:text-brand-600 group-hover:ring-brand-200/60",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

export function JobsTable({
  jobs,
  showOwner,
  hrefFor = (j) => `/jobs/${j.id}`,
}: {
  jobs: Job[];
  showOwner?: boolean;
  hrefFor?: (j: Job) => string | null;
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Dosya</Th>
          {showOwner && <Th>Kullanıcı</Th>}
          <Th>Durum</Th>
          <Th className="text-right">Süre</Th>
          <Th className="text-right">Kredi</Th>
          <Th className="text-right">Tarih</Th>
        </tr>
      </thead>
      <tbody className="stagger">
        {jobs.map((job) => {
          const href = hrefFor(job);
          const name = (
            <span className="flex min-w-0 items-center gap-3">
              <JobIcon job={job} />
              <span className="min-w-0">
                <span className="block max-w-[18rem] truncate font-medium text-ink-900 transition-colors group-hover:text-brand-600">
                  {job.filename}
                </span>
                {job.text_preview && (
                  <span className="block max-w-[18rem] truncate text-xs text-ink-400">{job.text_preview}</span>
                )}
              </span>
            </span>
          );
          return (
            <tr key={job.id} className="group transition-colors duration-200 hover:bg-ink-50/70">
              <Td>
                {href ? (
                  <Link href={href} className="block">
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </Td>
              {showOwner && <Td className="font-mono text-xs text-ink-500">{job.uid.slice(0, 10)}…</Td>}
              <Td>
                <JobStatusBadge job={job} />
              </Td>
              <Td className="text-right tabular-nums">{formatDuration(job.duration_sec)}</Td>
              <Td className="text-right tabular-nums">{formatCredits(job.credits_cost)}</Td>
              <Td className="whitespace-nowrap text-right text-ink-500">
                <span className="inline-flex items-center justify-end gap-1.5">
                  {formatRelative(job.created_at)}
                  {href && (
                    <ChevronRight className="size-4 -translate-x-1 text-ink-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-brand-500 group-hover:opacity-100" />
                  )}
                </span>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
