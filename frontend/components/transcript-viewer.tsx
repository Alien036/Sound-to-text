"use client";

import { Check, Copy, Download, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api, errorMessage } from "@/lib/api";
import type { ResultFormat, TranscriptSegment } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/primitives";

const FORMATS: { value: ResultFormat; label: string }[] = [
  { value: "txt", label: "TXT" },
  { value: "srt", label: "SRT" },
  { value: "vtt", label: "VTT" },
  { value: "json", label: "JSON" },
];

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLocaleLowerCase("tr");
  const q = query.toLocaleLowerCase("tr");
  const parts: React.ReactNode[] = [];
  let i = 0;
  for (let idx = lower.indexOf(q); idx !== -1; idx = lower.indexOf(q, i)) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="rounded bg-accent-200 px-0.5 text-ink-900">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
}

export function DownloadButtons({ jobId, available }: { jobId: string; available?: ResultFormat[] }) {
  const [busy, setBusy] = useState<ResultFormat | null>(null);

  async function download(format: ResultFormat) {
    setBusy(format);
    try {
      const { url } = await api.downloadUrl(jobId, format);
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      a.click();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.filter((f) => !available || available.includes(f.value)).map((f) => (
        <Button
          key={f.value}
          variant="outline"
          size="sm"
          loading={busy === f.value}
          disabled={busy !== null}
          onClick={() => download(f.value)}
        >
          {busy !== f.value && <Download />}
          {f.label}
        </Button>
      ))}
    </div>
  );
}

export function TranscriptViewer({
  segments,
  currentTime,
  onSeek,
}: {
  segments: TranscriptSegment[];
  currentTime?: number;
  onSeek?: (t: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [follow, setFollow] = useState(true);

  const q = query.trim();
  const visible = useMemo(() => {
    const all = segments.map((s, idx) => ({ s, idx }));
    if (!q) return all;
    const needle = q.toLocaleLowerCase("tr");
    return all.filter(
      ({ s }) =>
        s.text.toLocaleLowerCase("tr").includes(needle) ||
        !!s.speaker?.toLocaleLowerCase("tr").includes(needle),
    );
  }, [segments, q]);

  const activeIdx =
    currentTime == null ? -1 : segments.findIndex((s) => currentTime >= s.start && currentTime < s.end);

  useEffect(() => {
    if (follow && !q) activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIdx, follow, q]);

  // Gemini işlerinde konuşmacılar var: aynı konuşmacının ardışık bölümleri tek paragraf olur.
  const hasSpeakers = segments.some((s) => s.speaker);

  function plainText() {
    if (!hasSpeakers) return segments.map((s) => s.text.trim()).join(" ");
    const paras: { speaker: string; text: string[] }[] = [];
    for (const s of segments) {
      const speaker = s.speaker ?? "";
      const last = paras[paras.length - 1];
      if (last && last.speaker === speaker) last.text.push(s.text.trim());
      else paras.push({ speaker, text: [s.text.trim()] });
    }
    return paras.map((p) => (p.speaker ? `${p.speaker}: ` : "") + p.text.join(" ")).join("\n\n");
  }

  async function copyAll() {
    await navigator.clipboard.writeText(plainText());
    setCopied(true);
    toast.success("Metin panoya kopyalandı.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex flex-col gap-2 border-b border-ink-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Transkriptte ara…"
            className="pl-9"
          />
        </div>
        {q && (
          <span className="text-sm text-ink-500">
            {visible.length} sonuç
          </span>
        )}
        <Button variant="outline" size="md" onClick={copyAll}>
          {copied ? <Check /> : <Copy />}
          Kopyala
        </Button>
      </div>

      <div
        className="max-h-[60vh] overflow-y-auto p-2"
        onWheel={() => setFollow(false)}
        onTouchMove={() => setFollow(false)}
      >
        {visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">Eşleşen bölüm bulunamadı.</p>
        ) : (
          visible.map(({ s, idx }, i) => {
            const active = idx === activeIdx;
            // Konuşmacı değiştiğinde (ya da arama sonuçlarında her satırda) etiketi göster.
            const prev = visible[i - 1];
            const showSpeaker = !!s.speaker && (!prev || prev.idx !== idx - 1 || prev.s.speaker !== s.speaker);
            return (
              <button
                key={`${s.start}-${idx}`}
                ref={active ? activeRef : undefined}
                onClick={() => {
                  onSeek?.(s.start);
                  setFollow(true);
                }}
                className={cn(
                  "flex w-full gap-4 rounded-xl px-3 py-2.5 text-left transition-colors",
                  active ? "bg-brand-50" : "hover:bg-ink-50",
                  !onSeek && "cursor-text",
                )}
              >
                <span
                  className={cn(
                    "w-14 shrink-0 pt-0.5 font-mono text-xs tabular-nums",
                    active ? "text-brand-600" : "text-ink-400",
                  )}
                >
                  {formatDuration(s.start)}
                </span>
                <span className={cn("text-[15px] leading-relaxed", active ? "text-ink-900" : "text-ink-700")}>
                  {showSpeaker && (
                    <span className="mb-0.5 block text-xs font-semibold text-brand-600">
                      <Highlight text={s.speaker!} query={q} />
                    </span>
                  )}
                  <Highlight text={s.text.trim()} query={q} />
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
