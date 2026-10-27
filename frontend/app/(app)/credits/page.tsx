"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Coins, KeyRound, Mail, Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { AnimatedNumber, FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton, Table, Td, Th } from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { SALES_EMAIL, TX_LABELS } from "@/lib/constants";
import { useBalance } from "@/lib/hooks/use-me";
import { cn, formatCredits, formatDate } from "@/lib/utils";

export default function CreditsPage() {
  const { balance } = useBalance();

  const q = useInfiniteQuery({
    queryKey: ["transactions"],
    queryFn: ({ pageParam }) => api.transactions({ limit: 25, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

  const txs = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Krediler" />

      <StaggerGroup className="grid gap-4 md:grid-cols-2">
        <StaggerItem className="h-full">
          <Card dark hover className="relative h-full overflow-hidden">
            <div className="pointer-events-none absolute -right-12 -top-12 size-44 animate-aurora rounded-full bg-brand-500/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-10 size-36 animate-aurora rounded-full bg-accent-500/20 blur-2xl [animation-delay:-4s]" />
            <CardContent className="relative">
              <p className="flex items-center gap-2 text-sm text-ink-300">
                <Coins className="size-4 text-accent-400" /> Bakiye
              </p>
              <div className="mt-3 text-5xl font-semibold tabular-nums tracking-tight">
                {balance == null ? (
                  <Skeleton className="h-12 w-28 bg-white/10" />
                ) : (
                  <AnimatedNumber value={balance} />
                )}
              </div>
              <p className="mt-1 text-sm text-ink-300">kredi</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem className="h-full">
          <LicenseCard />
        </StaggerItem>
      </StaggerGroup>

      <FadeIn delay={0.12} className="mt-4">
        <Card>
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
                  <tbody className="stagger">
                    {txs.map((t) => (
                      <tr key={t.id} className="transition-colors hover:bg-ink-50/70">
                        <Td className="font-medium text-ink-900">{TX_LABELS[t.type] ?? t.type}</Td>
                        <Td className="max-w-xs truncate text-ink-500">
                          {t.job_id ? (
                            <Link href={`/jobs/${t.job_id}`} className="font-medium text-brand-600 hover:underline">
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
      </FadeIn>
    </>
  );
}

function LicenseCard() {
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setBusy(true);
    try {
      const res = await api.redeemLicense(key);
      toast.success(`${formatCredits(res.credits_added)} kredi yüklendi.`);
      setKey("");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card hover className="h-full">
      <CardContent className="flex h-full flex-col">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-900">
          <KeyRound className="size-4 text-brand-500" /> Lisans anahtarı
        </p>
        <form onSubmit={redeem} className="mt-4">
          <Label htmlFor="license">Anahtarınızı girin</Label>
          <div className="flex gap-2">
            <Input
              id="license"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="BUS-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              className="font-mono tracking-wider"
            />
            <Button type="submit" loading={busy} disabled={!key.trim()}>
              Etkinleştir
            </Button>
          </div>
        </form>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5 text-sm text-ink-500">
          <span className="flex items-center gap-2">
            <Mail className="size-4 shrink-0 text-ink-400" />
            <a href={`mailto:${SALES_EMAIL}`} className="font-medium text-brand-600 hover:underline">
              {SALES_EMAIL}
            </a>
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href="/paketler">Paketleri gör</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
