"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Coins, Info, Receipt } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton, Table, Td, Th } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { TX_LABELS } from "@/lib/constants";
import { useBalance, usePricing } from "@/lib/hooks/use-me";
import { formatTry } from "@/lib/pricing";
import { cn, formatCredits, formatDate, formatDay } from "@/lib/utils";

export default function CreditsPage() {
  const { balance, subscription } = useBalance();
  const pricing = usePricing();

  const q = useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => api.transactions({ limit: 25, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

  const txs = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Krediler" description="Bakiyeniz ve tüm kredi hareketleriniz." />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-0 bg-ink-900 text-white">
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm text-ink-300">
                <Coins className="size-4 text-accent-400" /> Kalan dakika
              </p>
              {subscription && <Badge tone="solid">Pro</Badge>}
            </div>
            <div className="mt-3 text-5xl font-semibold tabular-nums tracking-tight">
              {balance == null ? <Skeleton className="h-12 w-28 bg-white/10" /> : formatCredits(balance)}
            </div>
            <p className="mt-1 text-sm text-ink-300">kredi · 1 kredi = {1 / pricing.credits_per_minute} dk (Turbo)</p>

            {subscription && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-ink-300">
                  <span>
                    Bu ay {formatCredits(subscription.period_used)} / {formatCredits(subscription.period_credits)} dk
                  </span>
                  <span>Yenilenme: {formatDay(subscription.current_period_end)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      subscription.period_used >= subscription.period_credits ? "bg-accent-500" : "bg-brand-400",
                    )}
                    style={{
                      width: `${Math.min(100, (subscription.period_used / Math.max(1, subscription.period_credits)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col">
            {subscription ? (
              <>
                <p className="font-medium text-ink-900">Ek paket</p>
                <p className="mt-1 text-sm text-ink-500">
                  Aylık kotan biterse {formatTry(pricing.topup_price_try)} karşılığında +{pricing.topup_credits}{" "}
                  dakika ekleyebilirsin. Ek paket dakikaları ay sonunda silinmez.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-ink-900">
                  Pro · {formatTry(pricing.plan_price_try)}
                  <span className="font-normal text-ink-500"> / ay</span>
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                  <li>· Her ay {pricing.plan_monthly_credits} dakika transkript</li>
                  <li>
                    · Kota bitince ek paket: {pricing.topup_credits} dk = {formatTry(pricing.topup_price_try)}
                  </li>
                  <li>· Başarısız işlerin dakikası otomatik iade edilir</li>
                </ul>
              </>
            )}
            <div className="min-h-4 flex-1" />
            <p className="flex items-start gap-2 rounded-xl bg-accent-50 px-3 py-2.5 text-sm text-accent-700">
              <Info className="mt-0.5 size-4 shrink-0" />
              {subscription
                ? "Ek paket için yöneticiye başvurun; çevrimiçi ödeme yakında."
                : "Pro'ya geçmek için yöneticiye başvurun; çevrimiçi ödeme yakında."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>İşlem geçmişi</CardTitle>
        </CardHeader>
        <div className="mt-3">
          {q.isLoading ? (
            <div className="space-y-3 p-5 pt-0">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : q.isError ? (
            <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
          ) : txs.length === 0 ? (
            <EmptyState icon={<Receipt />} title="Henüz kredi hareketi yok" />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>İşlem</Th>
                    <Th>Açıklama</Th>
                    <Th className="text-right">Miktar</Th>
                    <Th className="text-right">Bakiye</Th>
                    <Th className="text-right">Tarih</Th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t) => (
                    <tr key={t.id}>
                      <Td className="font-medium text-ink-900">{TX_LABELS[t.type] ?? t.type}</Td>
                      <Td className="max-w-xs truncate text-ink-500">
                        {t.job_id ? (
                          <Link href={`/jobs/${t.job_id}`} className="text-brand-600 hover:underline">
                            İşi görüntüle
                          </Link>
                        ) : (
                          t.note || "—"
                        )}
                      </Td>
                      <Td
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          t.amount > 0 ? "text-brand-600" : "text-accent-600",
                        )}
                      >
                        {t.amount > 0 ? "+" : ""}
                        {formatCredits(t.amount)}
                      </Td>
                      <Td className="text-right tabular-nums">{formatCredits(t.balance_after)}</Td>
                      <Td className="whitespace-nowrap text-right text-ink-500">{formatDate(t.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {q.hasNextPage && (
                <div className="flex justify-center p-4">
                  <Button variant="outline" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
                    Daha fazla göster
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </>
  );
}
