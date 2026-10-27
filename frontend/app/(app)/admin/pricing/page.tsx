"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { DEFAULT_PRICING, KDV_RATE, PAYMENT_FEE_RATE, TARGET_MARGIN } from "@/lib/constants";
import { useModels } from "@/lib/hooks/use-models";
import { formatTry, marginMultiplier, netRevenue } from "@/lib/pricing";
import type { Pricing } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCALAR_FIELDS = [
  "plan_price_try",
  "plan_monthly_credits",
  "topup_price_try",
  "topup_credits",
  "gpu_cost_per_minute_try",
  "credits_per_minute",
  "signup_bonus",
  "max_duration_min",
  "max_file_mb",
] as const;
type ScalarField = (typeof SCALAR_FIELDS)[number];

type Form = Record<ScalarField, string> & { multipliers: Record<string, string> };

function toForm(raw: Pricing): Form {
  // Backend yeni alanları henüz dönmüyorsa varsayılanlarla doldur.
  const p = { ...DEFAULT_PRICING, ...raw };
  return {
    plan_price_try: String(p.plan_price_try),
    plan_monthly_credits: String(p.plan_monthly_credits),
    topup_price_try: String(p.topup_price_try),
    topup_credits: String(p.topup_credits),
    gpu_cost_per_minute_try: String(p.gpu_cost_per_minute_try),
    credits_per_minute: String(p.credits_per_minute),
    signup_bonus: String(p.signup_bonus),
    max_duration_min: String(Math.round(p.max_duration_sec / 60)),
    max_file_mb: String(p.max_file_mb),
    multipliers: Object.fromEntries(
      [...new Set([...(p.models ?? []), ...Object.keys(p.model_multipliers)])].map((k) => [
        k,
        String(p.model_multipliers[k] ?? 1),
      ]),
    ),
  };
}

function fromForm(f: Form): Pricing {
  const n = (k: ScalarField) => Number(f[k]);
  return {
    plan_price_try: n("plan_price_try"),
    plan_monthly_credits: Math.floor(n("plan_monthly_credits")),
    topup_price_try: n("topup_price_try"),
    topup_credits: Math.floor(n("topup_credits")),
    gpu_cost_per_minute_try: n("gpu_cost_per_minute_try"),
    credits_per_minute: n("credits_per_minute"),
    signup_bonus: Math.floor(n("signup_bonus")),
    max_duration_sec: Math.round(n("max_duration_min") * 60),
    max_file_mb: n("max_file_mb"),
    model_multipliers: Object.fromEntries(Object.entries(f.multipliers).map(([k, v]) => [k, Number(v)])),
  };
}

export default function AdminPricingPage() {
  const { label: modelName } = useModels();
  const qc = useQueryClient();
  const pricing = useQuery({ queryKey: ["admin", "pricing"], queryFn: api.admin.getPricing });
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pricing.data) setForm(toForm(pricing.data));
  }, [pricing.data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const body = fromForm(form);
    const { signup_bonus, model_multipliers, models: _m, allowed_extensions: _e, model_details: _d, default_model: _dm, ...rest } = body;
    const nums: number[] = [...Object.values(rest), ...Object.values(model_multipliers)];
    if (nums.some((n) => !Number.isFinite(n) || n <= 0) || !(signup_bonus >= 0)) {
      toast.error("Tüm değerler pozitif sayı olmalı.");
      return;
    }
    setBusy(true);
    try {
      const saved = await api.admin.updatePricing(body);
      qc.setQueryData(["admin", "pricing"], saved ?? body);
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Fiyatlandırma kaydedildi.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: ScalarField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Fiyatlandırma" description="Paket fiyatları, kotalar ve yükleme limitleri." />

      {pricing.isLoading || (!form && !pricing.isError) ? (
        <Skeleton className="h-96" />
      ) : pricing.isError ? (
        <Card>
          <ErrorState message={errorMessage(pricing.error)} onRetry={() => pricing.refetch()} />
        </Card>
      ) : (
        form && (
          <form onSubmit={save} className="space-y-4">
            <MarginPanel p={fromForm(form)} />

            <Card>
              <CardHeader className="block">
                <CardTitle>Paketler</CardTitle>
                <CardDescription>Fiyatlar KDV dahil TL. 1 kredi = 1 dakika (Turbo).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="pp" label="Pro aylık fiyat (TL)" value={form.plan_price_try} onChange={set("plan_price_try")} step="1" />
                <Field id="pc" label="Pro aylık kredi" value={form.plan_monthly_credits} onChange={set("plan_monthly_credits")} step="1" />
                <Field id="tp" label="Ek paket fiyatı (TL)" value={form.topup_price_try} onChange={set("topup_price_try")} step="1" />
                <Field id="tc" label="Ek paket kredisi" value={form.topup_credits} onChange={set("topup_credits")} step="1" />
                <Field id="bonus" label="Kayıt denemesi (kredi)" value={form.signup_bonus} onChange={set("signup_bonus")} step="1" />
                <Field
                  id="gpu"
                  label="GPU maliyeti (TL / dk ses)"
                  value={form.gpu_cost_per_minute_try}
                  onChange={set("gpu_cost_per_minute_try")}
                  step="0.001"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="block">
                <CardTitle>Kredi hesabı</CardTitle>
                <CardDescription>İş maliyeti = ⌈dakika × dakika başı kredi × model çarpanı⌉, en az 1.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <Field id="cpm" label="Dakika başı kredi" value={form.credits_per_minute} onChange={set("credits_per_minute")} step="0.1" />
                {Object.entries(form.multipliers).map(([k, v]) => (
                  <Field
                    key={k}
                    id={`mult-${k}`}
                    label={`${modelName(k)} çarpanı`}
                    value={v}
                    step="0.1"
                    onChange={(e) =>
                      setForm((f) => (f ? { ...f, multipliers: { ...f.multipliers, [k]: e.target.value } } : f))
                    }
                  />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="block">
                <CardTitle>Limitler</CardTitle>
                <CardDescription>Sunucuya gidecek en büyük dosya ve en uzun kayıt.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="dur" label="En uzun süre (dakika)" value={form.max_duration_min} onChange={set("max_duration_min")} step="1" />
                <Field id="size" label="En büyük dosya (MB)" value={form.max_file_mb} onChange={set("max_file_mb")} step="1" />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => pricing.data && setForm(toForm(pricing.data))}
                disabled={busy}
              >
                Sıfırla
              </Button>
              <Button type="submit" loading={busy}>
                Kaydet
              </Button>
            </div>
          </form>
        )
      )}
    </div>
  );
}

/** Her paket için net gelir / en kötü durum GPU maliyeti; hedefin altındaysa uyarır. */
function MarginPanel({ p }: { p: Pricing }) {
  const rows = [
    { label: "Pro paket", price: p.plan_price_try, credits: p.plan_monthly_credits },
    { label: "Ek paket", price: p.topup_price_try, credits: p.topup_credits },
  ];
  return (
    <Card className="border-0 bg-ink-900 text-white">
      <CardContent>
        <p className="text-sm text-ink-300">
          Kâr çarpanı · hedef en az {TARGET_MARGIN}× · KDV %{KDV_RATE * 100} ve komisyon %{PAYMENT_FEE_RATE * 100} düşülmüş
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rows.map((r) => {
            const m = marginMultiplier(r.price, r.credits, p.gpu_cost_per_minute_try);
            const ok = m >= TARGET_MARGIN;
            const valid = Number.isFinite(m) && m > 0;
            return (
              <div key={r.label} className="rounded-2xl bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink-200">{r.label}</p>
                  {valid &&
                    (ok ? (
                      <CheckCircle2 className="size-4 text-brand-300" />
                    ) : (
                      <AlertTriangle className="size-4 text-accent-400" />
                    ))}
                </div>
                <p className={cn("mt-1 text-3xl font-semibold tabular-nums", ok ? "text-white" : "text-accent-400")}>
                  {valid ? `${m.toFixed(1)}×` : "—"}
                </p>
                <p className="mt-1 text-xs text-ink-400">
                  Net {formatTry(netRevenue(r.price))} · maliyet en fazla{" "}
                  {formatTry(r.credits * p.gpu_cost_per_minute_try)} · dk başı{" "}
                  {formatTry(r.credits > 0 ? r.price / r.credits : 0)}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  ...props
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min={0} required inputMode="decimal" {...props} />
    </div>
  );
}
