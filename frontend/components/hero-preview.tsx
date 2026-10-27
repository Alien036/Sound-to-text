"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FadeIn, motion, SoundWave, SPRING_SNAPPY } from "./ui/motion";
import { Card } from "./ui/primitives";

const SAMPLE_LINES = [
  { time: "00:00", speaker: "Konuşmacı 1", text: "Herkese günaydın, bu haftanın gündemiyle başlayalım." },
  { time: "00:06", speaker: "Konuşmacı 2", text: "İlk madde yeni sürümün yayın tarihi ve son kontroller." },
  { time: "00:11", speaker: "Konuşmacı 1", text: "Test ekibinden gelen geri bildirimlere göre cuma günü hazırız." },
];

export function HeroPreview() {
  const [active, setActive] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % SAMPLE_LINES.length);
    }, 2800);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <FadeIn delay={0.22} y={20} className="mx-auto mt-16 max-w-4xl">
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="rounded-3xl border border-ink-200/70 bg-white/60 p-2.5 shadow-[0_24px_64px_-16px_rgba(91,91,214,0.14)] backdrop-blur-md"
      >
        <Card className="rounded-[20px] border-ink-100/80 p-5 shadow-none sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50">
                <SoundWave bars={4} className="h-4" />
              </span>
              <div className="text-left">
                <p className="font-medium text-ink-900">haftalik-toplanti.m4a</p>
                <p className="text-xs text-ink-400">42:18 · Türkçe · 43 kredi</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white shadow-xs shadow-brand-500/25">
              <span className="size-1.5 rounded-full bg-white" />
              Tamamlandı
            </span>
          </div>

          <div className="mt-4 space-y-1 text-left text-sm">
            {SAMPLE_LINES.map((line, i) => {
              const isActive = i === active;
              return (
                <button
                  key={line.time}
                  type="button"
                  onClick={() => setActive(i)}
                  className="relative flex w-full cursor-pointer items-start gap-4 rounded-xl px-3.5 py-2.5 text-left transition-colors"
                >
                  {isActive && (
                    <motion.span
                      layoutId="hero-preview-active"
                      transition={SPRING_SNAPPY}
                      className="absolute inset-0 rounded-xl bg-brand-50/90 ring-1 ring-inset ring-brand-200/60"
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10 pt-0.5 font-mono text-xs tabular-nums transition-colors",
                      isActive ? "font-semibold text-brand-600" : "text-ink-400",
                    )}
                  >
                    {line.time}
                  </span>
                  <span className="relative z-10 flex-1">
                    <span
                      className={cn(
                        "mb-0.5 block text-[11px] font-semibold transition-colors",
                        isActive ? "text-brand-600" : "text-ink-400",
                      )}
                    >
                      {line.speaker}
                    </span>
                    <span className={cn("transition-colors", isActive ? "text-ink-900" : "text-ink-600")}>
                      {line.text}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </FadeIn>
  );
}
