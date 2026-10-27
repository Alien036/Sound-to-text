"use client";

import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Card } from "@/components/ui/primitives";
import { SALES_EMAIL } from "@/lib/constants";
import { usePricing } from "@/lib/hooks/use-me";
import type { CreditPackage } from "@/lib/types";
import { cn, formatCredits, formatTry } from "@/lib/utils";

function minutesLabel(min: number): string {
  return min < 120 ? `${Math.round(min)} dk` : `${Math.round(min / 60)} saat`;
}

/** Kredinin kaç dakikalık kayda yettiği: en pahalı modelle en az, en ucuzuyla en çok. */
function useDuration() {
  const pricing = usePricing();
  const rates = (pricing.model_details ?? []).map((m) => m.credits_per_minute).filter((r) => r > 0);
  return (credits: number) => {
    if (rates.length === 0) return null;
    const lo = credits / Math.max(...rates);
    const hi = credits / Math.min(...rates);
    return lo === hi ? `≈ ${minutesLabel(lo)} kayıt` : `≈ ${minutesLabel(lo)} – ${minutesLabel(hi)} kayıt`;
  };
}

function mailto(p: CreditPackage) {
  const subject = encodeURIComponent(`${p.name} paketi (${p.credits} kredi)`);
  return `mailto:${SALES_EMAIL}?subject=${subject}`;
}

/** Lisans anahtarı olarak elle satılan kredi paketleri; ortadaki öne çıkarılır. */
export function PackageCards({ compact = false }: { compact?: boolean }) {
  const packages = usePricing().packages ?? [];
  const duration = useDuration();
  const featured = packages.length === 3 ? 1 : -1;

  return (
    <StaggerGroup inView className={cn("grid gap-4", packages.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {packages.map((p, i) => {
        const hot = i === featured;
        return (
          <StaggerItem key={p.id} className="h-full">
            <Card
              dark={hot}
              hover
              className={cn("relative flex h-full flex-col overflow-hidden", compact ? "p-5" : "rounded-3xl p-7")}
            >
              {hot && (
                <div className="pointer-events-none absolute -right-16 -top-16 size-56 animate-aurora rounded-full bg-brand-500/35 blur-3xl" />
              )}
              <div className="relative flex flex-1 flex-col">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold", hot ? "text-white" : "text-ink-900")}>{p.name}</span>
                  {hot && (
                    <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-semibold text-white">
                      En çok tercih edilen
                    </span>
                  )}
                </div>
                <p className={cn("mt-4 font-semibold tracking-tight", compact ? "text-3xl" : "text-4xl")}>
                  {formatTry(p.price_try)}
                </p>
                <p className={cn("mt-1 text-sm font-medium", hot ? "text-brand-300" : "text-brand-600")}>
                  {formatCredits(p.credits)} kredi
                </p>
                <ul className={cn("mt-4 space-y-2 text-sm", hot ? "text-ink-200" : "text-ink-600")}>
                  {[duration(p.credits), "Tek seferlik, süresiz kredi", "Başarısız işlerde otomatik iade"]
                    .filter(Boolean)
                    .map((t) => (
                      <li key={t} className="flex items-center gap-2">
                        <Check className={cn("size-4 shrink-0", hot ? "text-brand-300" : "text-brand-500")} />
                        {t}
                      </li>
                    ))}
                </ul>
                <Button
                  asChild
                  variant={hot ? "accent" : "outline"}
                  size={compact ? "md" : "lg"}
                  className="mt-6 w-full"
                >
                  <a href={mailto(p)}>
                    <Mail /> Satın al
                  </a>
                </Button>
              </div>
            </Card>
          </StaggerItem>
        );
      })}
    </StaggerGroup>
  );
}
