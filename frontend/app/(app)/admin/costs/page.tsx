"use client";

import { useQuery } from "@tanstack/react-query";
import { Coins, Receipt, ShieldAlert, Timer } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, Select, Skeleton, Table, Td, Th } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { usePricing } from "@/lib/hooks/use-me";
import { cn, formatCredits, formatDate, formatTry } from "@/lib/utils";

const usd = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: v < 1 ? 4 : 2 }).format(v);

const tokens = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v);

export default function AdminCostsPage() {
  const [days, setDays] = useState(30);
  const costs = useQuery({ queryKey: ["admin", "costs", days], queryFn: () => api.admin.costs(days) });
  const log = useQuery({ queryKey: ["admin", "credit-log"], queryFn: () => api.admin.creditLog(100) });
  const models = usePricing().model_details ?? [];
  const label = (id: string) => models.find((m) => m.id === id)?.label ?? id;
  const r = costs.data;

  return (
    <>
      <PageHeader
        title="Maliyet"
        description="Gemini'ye ödenen tutar: işlerde kaydedilen token × model fiyatı / 1M."
        actions={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-40">
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>
                Son {d} gün
              </option>
            ))}
          </Select>
        }
      />

      {costs.isError ? (
        <ErrorState message={errorMessage(costs.error)} onRetry={() => costs.refetch()} />
      ) : (
        <>
          <StaggerGroup className="mb-6 grid gap-4 sm:grid-cols-3">
            <Stat
              icon={<Receipt className="size-5" />}
              title="Toplam maliyet"
              value={r ? usd(r.total_cost_usd) : null}
              sub={r ? formatTry(r.total_cost_try) : undefined}
              dark
            />
            <Stat
              icon={<ShieldAlert className="size-5" />}
              title="Bakiyelerin olası maliyeti"
              value={r ? (r.total_balance_risk_usd == null ? "—" : usd(r.total_balance_risk_usd)) : null}
              sub={
                r?.total_balance_risk_usd != null
                  ? `${formatTry(r.total_balance_risk_usd * r.usd_try)} · hepsi Argon'la harcanırsa`
                  : "Henüz ölçüm yok"
              }
            />
            <Stat
              icon={<Timer className="size-5" />}
              title="Dakika başı maliyet"
              value={
                r
                  ? Object.keys(r.model_usd_per_minute).length
                    ? Object.entries(r.model_usd_per_minute)
                        .map(([m, v]) => `${label(m)} ${usd(v)}`)
                        .join(" · ")
                    : "—"
                  : null
              }
              sub={r ? `1 $ = ${r.usd_try} ₺` : undefined}
              small
            />
          </StaggerGroup>

          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle>Kullanıcı başına</CardTitle>
              </CardHeader>
              <div className="mt-3">
                {costs.isLoading ? (
                  <div className="space-y-3 p-5 pt-0">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : !r || r.users.length === 0 ? (
                  <EmptyState icon={<Coins />} title="Bu dönemde kullanım yok" />
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Kullanıcı</Th>
                        <Th className="text-right">Bakiye</Th>
                        <Th className="text-right">İş</Th>
                        <Th className="text-right">Dakika</Th>
                        <Th className="text-right">Harcanan kredi</Th>
                        <Th className="text-right">Token (giriş / çıkış)</Th>
                        <Th className="text-right">Maliyet</Th>
                        <Th className="text-right">Bakiye riski</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.users.map((u) => (
                        <tr key={u.uid} className="transition-colors hover:bg-ink-50/70">
                          <Td className="max-w-56 truncate">
                            <span className="text-ink-900">{u.email || u.uid}</span>
                            {u.untracked_jobs > 0 && (
                              <span className="block text-xs text-ink-500">
                                {u.untracked_jobs} eski işin token kaydı yok
                              </span>
                            )}
                          </Td>
                          <Td className="text-right tabular-nums">{formatCredits(u.credits_balance)}</Td>
                          <Td className="text-right tabular-nums">{u.jobs}</Td>
                          <Td className="text-right tabular-nums">{u.minutes}</Td>
                          <Td className="text-right tabular-nums">{formatCredits(u.credits_spent)}</Td>
                          <Td className="text-right tabular-nums text-ink-500">
                            {tokens(u.input_tokens)} / {tokens(u.output_tokens)}
                          </Td>
                          <Td className="text-right tabular-nums">
                            <span className="font-semibold text-ink-900">{usd(u.cost_usd)}</span>
                            <span className="block text-xs text-ink-500">{formatTry(u.cost_try)}</span>
                          </Td>
                          <Td
                            className={cn(
                              "text-right tabular-nums",
                              (u.balance_risk_usd ?? 0) >= 20 ? "font-semibold text-accent-600" : "text-ink-500",
                            )}
                          >
                            {u.balance_risk_usd == null ? "—" : usd(u.balance_risk_usd)}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Card>
          </FadeIn>
        </>
      )}

      <FadeIn delay={0.08} className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Elle yapılan bakiye değişiklikleri</CardTitle>
          </CardHeader>
          <div className="mt-3">
            {log.isLoading ? (
              <div className="space-y-3 p-5 pt-0">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : log.isError ? (
              <ErrorState message={errorMessage(log.error)} onRetry={() => log.refetch()} />
            ) : !log.data?.length ? (
              <EmptyState icon={<Coins />} title="Kayıt yok" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Tarih</Th>
                    <Th>Yapan</Th>
                    <Th>Kullanıcı</Th>
                    <Th className="text-right">Miktar</Th>
                    <Th className="text-right">Sonraki bakiye</Th>
                    <Th>Not</Th>
                  </tr>
                </thead>
                <tbody>
                  {log.data.map((e) => (
                    <tr key={e.id} className="transition-colors hover:bg-ink-50/70">
                      <Td className="whitespace-nowrap text-ink-500">{formatDate(e.created_at)}</Td>
                      <Td className="max-w-48 truncate">{e.admin_email || e.admin_uid || "—"}</Td>
                      <Td className="max-w-48 truncate">{e.email || e.uid}</Td>
                      <Td
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          e.amount > 0 ? "text-brand-600" : "text-accent-600",
                        )}
                      >
                        {e.amount > 0 ? "+" : ""}
                        {formatCredits(e.amount)}
                      </Td>
                      <Td className="text-right tabular-nums">{formatCredits(e.balance_after)}</Td>
                      <Td className="max-w-56 truncate text-ink-500">{e.note || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Card>
      </FadeIn>
    </>
  );
}

function Stat({
  icon,
  title,
  value,
  sub,
  dark,
  small,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | null;
  sub?: string;
  dark?: boolean;
  small?: boolean;
}) {
  return (
    <StaggerItem>
      <Card dark={dark} hover className="h-full">
        <CardContent className="flex items-center gap-3.5 p-4">
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              dark ? "bg-white/10 text-brand-300" : "bg-brand-50 text-brand-600",
            )}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className={cn("text-xs", dark ? "text-ink-300" : "text-ink-500")}>{title}</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                small ? "text-sm" : "text-2xl",
                dark ? "text-white" : "text-ink-900",
              )}
            >
              {value ?? "…"}
            </p>
            {sub && <p className={cn("text-xs", dark ? "text-ink-300" : "text-ink-500")}>{sub}</p>}
          </div>
        </CardContent>
      </Card>
    </StaggerItem>
  );
}
