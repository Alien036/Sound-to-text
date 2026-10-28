"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerItem } from "@/components/ui/motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { DEFAULT_PRICING } from "@/lib/constants";
import { useModels } from "@/lib/hooks/use-models";
import type { Pricing } from "@/lib/types";

const SCALAR_FIELDS = [
  "credits_per_minute",
  "max_duration_min",
  "max_file_mb",
  "usd_try",
  "admin_daily_key_credits",
] as const;
type ScalarField = (typeof SCALAR_FIELDS)[number];

type PackageForm = { id: string; name: string; credits: string; price_try: string };
type CostForm = { input_usd_per_m: string; output_usd_per_m: string };
type Form = Record<ScalarField, string> & {
  multipliers: Record<string, string>;
  packages: PackageForm[];
  costs: Record<string, CostForm>;
};

function toForm(raw: Pricing): Form {
  const p = { ...DEFAULT_PRICING, ...raw };
  return {
    credits_per_minute: String(p.credits_per_minute),
    max_duration_min: String(Math.round(p.max_duration_sec / 60)),
    max_file_mb: String(p.max_file_mb),
    usd_try: String(p.usd_try ?? 42),
    admin_daily_key_credits: String(p.admin_daily_key_credits ?? 5000),
    costs: Object.fromEntries(
      Object.entries(p.model_costs ?? {}).map(([k, c]) => [
        k,
        { input_usd_per_m: String(c.input_usd_per_m), output_usd_per_m: String(c.output_usd_per_m) },
      ]),
    ),
    multipliers: Object.fromEntries(
      [...new Set([...(p.models ?? []), ...Object.keys(p.model_multipliers)])].map((k) => [
        k,
        String(p.model_multipliers[k] ?? 1),
      ]),
    ),
    packages: (p.packages ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      credits: String(k.credits),
      price_try: String(k.price_try),
    })),
  };
}

function fromForm(f: Form): Pricing {
  const n = (k: ScalarField) => Number(f[k]);
  return {
    credits_per_minute: n("credits_per_minute"),
    max_duration_sec: Math.round(n("max_duration_min") * 60),
    max_file_mb: n("max_file_mb"),
    usd_try: n("usd_try"),
    admin_daily_key_credits: Math.floor(n("admin_daily_key_credits")),
    model_costs: Object.fromEntries(
      Object.entries(f.costs).map(([k, c]) => [
        k,
        { input_usd_per_m: Number(c.input_usd_per_m), output_usd_per_m: Number(c.output_usd_per_m) },
      ]),
    ),
    model_multipliers: Object.fromEntries(Object.entries(f.multipliers).map(([k, v]) => [k, Number(v)])),
    packages: f.packages.map((k) => ({
      id: k.id,
      name: k.name.trim(),
      credits: Math.floor(Number(k.credits)),
      price_try: Number(k.price_try),
    })),
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
    const { model_multipliers, packages = [], model_costs = {}, admin_daily_key_credits = 0, models: _m, allowed_extensions: _e, model_details: _d, default_model: _dm, ...rest } = body;
    const nums: number[] = [...Object.values(rest), ...Object.values(model_multipliers), ...packages.map((k) => k.credits)];
    if (nums.some((n) => !Number.isFinite(n) || n <= 0)) {
      toast.error("Tüm değerler pozitif sayı olmalı.");
      return;
    }
    const costNums = Object.values(model_costs).flatMap((c) => [c.input_usd_per_m, c.output_usd_per_m]);
    if (!Number.isFinite(admin_daily_key_credits) || admin_daily_key_credits < 0 || costNums.some((n) => !Number.isFinite(n) || n < 0)) {
      toast.error("Token fiyatları ve günlük limit negatif olamaz.");
      return;
    }
    if (packages.some((k) => !k.name || !Number.isFinite(k.price_try) || k.price_try < 0)) {
      toast.error("Paket adı boş, fiyat negatif olamaz.");
      return;
    }
    setBusy(true);
    try {
      const saved = await api.admin.updatePricing(body);
      qc.setQueryData(["admin", "pricing"], saved ?? body);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["pricing"] });
      toast.success("Fiyatlandırma kaydedildi.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const set = (k: ScalarField) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));
  const setPackage = (i: number, k: keyof Omit<PackageForm, "id">) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) =>
      f ? { ...f, packages: f.packages.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) } : f,
    );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Fiyatlandırma" />

      {pricing.isLoading || (!form && !pricing.isError) ? (
        <Skeleton className="h-96" />
      ) : pricing.isError ? (
        <Card>
          <ErrorState message={errorMessage(pricing.error)} onRetry={() => pricing.refetch()} />
        </Card>
      ) : (
        form && (
          <form onSubmit={save}>
            <StaggerGroup className="space-y-4">
              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Paketler</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-ink-500">
                      Ana sayfada ve Krediler sayfasında gösterilir; anahtar üretirken seçilir. Fiyat yalnızca
                      gösterimdir (KDV dahil), ödeme elle alınır.
                    </p>
                    {form.packages.map((p, i) => (
                      <div key={p.id} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                        <div>
                          <Label htmlFor={`pkg-name-${p.id}`}>Ad</Label>
                          <Input
                            id={`pkg-name-${p.id}`}
                            required
                            maxLength={40}
                            value={p.name}
                            onChange={setPackage(i, "name")}
                          />
                        </div>
                        <Field
                          id={`pkg-credits-${p.id}`}
                          label="Kredi"
                          value={p.credits}
                          onChange={setPackage(i, "credits")}
                          step="1"
                        />
                        <Field
                          id={`pkg-price-${p.id}`}
                          label="Fiyat (TL)"
                          value={p.price_try}
                          onChange={setPackage(i, "price_try")}
                          step="1"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Çarpanlar</CardTitle>
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
              </StaggerItem>

              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Limitler</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field id="dur" label="En uzun süre (dakika)" value={form.max_duration_min} onChange={set("max_duration_min")} step="1" />
                    <Field id="size" label="En büyük dosya (MB)" value={form.max_file_mb} onChange={set("max_file_mb")} step="1" />
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem>
                <Card>
                  <CardHeader>
                    <CardTitle>Maliyet ve admin sınırı</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-ink-500">
                      Vertex AI'nin 1M token fiyatı (USD); maliyet raporu bunlarla hesaplanır. Düşünme token'ları
                      çıkış fiyatındandır. Google fiyat değiştirince burayı güncelleyin.
                    </p>
                    {Object.entries(form.costs).map(([k, c]) => (
                      <div key={k} className="grid gap-3 sm:grid-cols-2">
                        {(["input_usd_per_m", "output_usd_per_m"] as const).map((field) => (
                          <Field
                            key={field}
                            id={`cost-${k}-${field}`}
                            label={`${modelName(k)} · ${field === "input_usd_per_m" ? "giriş" : "çıkış"} $/1M`}
                            value={c[field]}
                            step="0.01"
                            onChange={(e) =>
                              setForm((f) =>
                                f ? { ...f, costs: { ...f.costs, [k]: { ...f.costs[k], [field]: e.target.value } } } : f,
                              )
                            }
                          />
                        ))}
                      </div>
                    ))}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="usd-try" label="1 USD kaç TL" value={form.usd_try} onChange={set("usd_try")} step="0.01" />
                      <Field
                        id="daily-key"
                        label="Admin günlük anahtar kredisi"
                        value={form.admin_daily_key_credits}
                        onChange={set("admin_daily_key_credits")}
                        step="1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>

              <StaggerItem className="flex justify-end gap-2">
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
              </StaggerItem>
            </StaggerGroup>
          </form>
        )
      )}
    </div>
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
