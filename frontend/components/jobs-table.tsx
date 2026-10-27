"use client";

import { FileAudio, FileVideo } from "lucide-react";
import Link from "next/link";
import type { Job } from "@/lib/types";
import { formatCredits, formatDuration, formatRelative } from "@/lib/utils";
import { JobStatusBadge } from "./common";
import { Table, Td, Th } from "./ui/primitives";

export function JobIcon({ job }: { job: Pick<Job, "content_type" | "filename"> }) {
  const isVideo = job.content_type?.startsWith("video") || /\.(mp4|mov|mkv)$/i.test(job.filename);
  const Icon = isVideo ? FileVideo : FileAudio;
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-500">
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
      <tbody>
        {jobs.map((job) => {
          const href = hrefFor(job);
          const name = (
            <span className="flex min-w-0 items-center gap-3">
              <JobIcon job={job} />
              <span className="min-w-0">
                <span className="block max-w-[18rem] truncate font-medium text-ink-900">{job.filename}</span>
                {job.text_preview && (
                  <span className="block max-w-[18rem] truncate text-xs text-ink-400">{job.text_preview}</span>
                )}
              </span>
            </span>
          );
          return (
            <tr key={job.id} className="group transition-colors hover:bg-ink-50/60">
              <Td>
                {href ? (
                  <Link href={href} className="block group-hover:[&_span.font-medium]:text-brand-600">
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
              <Td className="text-right tabular-nums">
                {formatCredits(job.credits_cost)}
              </Td>
              <Td className="whitespace-nowrap text-right text-ink-500">{formatRelative(job.created_at)}</Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
