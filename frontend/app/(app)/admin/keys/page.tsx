"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Table,
  Td,
  Th,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import type { LicenseKey } from "@/lib/types";
import { usePricing } from "@/lib/hooks/use-me";
import { cn, formatCredits, formatDate } from "@/lib/utils";

const STATUS: Record<LicenseKey["status"], { label: string; tone: "brand" | "neutral" | "accent" }> = {
  active: { label: "Kullanılmadı", tone: "brand" },
  redeemed: { label: "Kullanıldı", tone: "neutral" },
  revoked: { label: "İptal", tone: "accent" },
};

export default function AdminKeysPage() {
  const qc = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["admin", "license-keys"],
    queryFn: ({ pageParam }) => api.admin.licenseKeys({ cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
  const keys = q.data?.pages.flatMap((p) => p.items) ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "license-keys"] });

  return (
    <>
      <PageHeader
        title="Lisans anahtarları"
        description="Anahtarları burada üretip müşteriye iletin; müşteri Krediler sayfasında etkinleştirir."
      />

      <FadeIn>
        <CreateKeys onCreated={refresh} />
      </FadeIn>

      <FadeIn delay={0.08} className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Tüm anahtarlar</CardTitle>
          </CardHeader>
          <div className="mt-3">
            {q.isLoading ? (
              <div className="space-y-3 p-5 pt-0">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : q.isError ? (
              <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : keys.length === 0 ? (
              <EmptyState icon={<KeyRound />} title="Henüz anahtar üretilmedi" />
            ) : (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>Anahtar</Th>
                      <Th className="text-right">Kredi</Th>
                      <Th>Durum</Th>
                      <Th>Not</Th>
                      <Th>Kullanan</Th>
                      <Th className="text-right">Oluşturma</Th>
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <KeyRow key={k.key} k={k} onChanged={refresh} />
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

function CreateKeys({ onCreated }: { onCreated: () => void }) {
  const packages = usePricing().packages ?? [];
  const [pkg, setPkg] = useState<string>("");
  const [credits, setCredits] = useState("");
  const [count, setCount] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<LicenseKey[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.admin.createLicenseKeys({
        ...(pkg ? { package: pkg } : { credits: Math.floor(Number(credits)) }),
        count: Math.floor(Number(count)),
        note: note.trim() || undefined,
      });
      setCreated(res);
      toast.success(res.length === 1 ? "Anahtar üretildi." : `${res.length} anahtar üretildi.`);
      onCreated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni anahtar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {[...packages.map((p) => ({ id: p.id, label: `${p.name} · ${formatCredits(p.credits)} kredi` })), { id: "", label: "Özel" }].map(
            (o) => (
              <button
                key={o.id || "custom"}
                type="button"
                onClick={() => setPkg(o.id)}
                className={cn(
                  "cursor-pointer rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors",
                  pkg === o.id
                    ? "border-brand-300 bg-brand-50 text-brand-700"
                    : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50",
                )}
              >
                {o.label}
              </button>
            ),
          )}
        </div>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
          <div>
            <Label htmlFor="credits">Kredi</Label>
            <Input
              id="credits"
              type="number"
              min={1}
              step={1}
              required={!pkg}
              disabled={!!pkg}
              inputMode="numeric"
              value={pkg ? String(packages.find((p) => p.id === pkg)?.credits ?? "") : credits}
              onChange={(e) => setCredits(e.target.value)}
              placeholder="300"
            />
          </div>
          <div>
            <Label htmlFor="count">Adet</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={50}
              step={1}
              required
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="note">Not (isteğe bağlı)</Label>
            <Input
              id="note"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Müşteri adı, sipariş"
            />
          </div>
          <Button type="submit" loading={busy}>
            <KeyRound /> Üret
          </Button>
        </form>

        {created.length > 0 && (
          <div className="mt-5 rounded-xl border border-brand-200/60 bg-brand-50/50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-brand-700">
                Yeni anahtarlar · {created[0].package ? `${created[0].package} · ` : ""}
                {formatCredits(created[0].credits)} kredi
              </p>
              <CopyButton text={created.map((k) => k.key).join("\n")} label="Tümünü kopyala" />
            </div>
            <ul className="mt-3 space-y-1.5">
              {created.map((k) => (
                <li key={k.key} className="flex items-center justify-between gap-3">
                  <code className="font-mono text-sm tracking-wider text-ink-900">{k.key}</code>
                  <CopyButton text={k.key} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KeyRow({ k, onChanged }: { k: LicenseKey; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const status = STATUS[k.status];

  async function revoke() {
    if (!window.confirm(`${k.key} iptal edilsin mi? Bu anahtar artık etkinleştirilemez.`)) return;
    setBusy(true);
    try {
      await api.admin.revokeLicenseKey(k.key);
      toast.success("Anahtar iptal edildi.");
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="transition-colors hover:bg-ink-50/70">
      <Td>
        <span className="flex items-center gap-1.5">
          <code className="font-mono text-sm tracking-wider text-ink-900">{k.key}</code>
          {k.status === "active" && <CopyButton text={k.key} />}
        </span>
      </Td>
      <Td className="text-right tabular-nums">
        <span className="font-semibold">{formatCredits(k.credits)}</span>
        {k.package && <span className="block text-xs text-ink-500">{k.package}</span>}
      </Td>
      <Td>
        <Badge tone={status.tone}>{status.label}</Badge>
      </Td>
      <Td className="max-w-48 truncate text-ink-500">{k.note || "—"}</Td>
      <Td className="text-ink-500">
        {k.status === "redeemed" ? (
          <span className="block">
            <span className="block truncate text-ink-700">{k.redeemed_email || k.redeemed_by}</span>
            <span className="text-xs">{formatDate(k.redeemed_at)}</span>
          </span>
        ) : (
          "—"
        )}
      </Td>
      <Td className="whitespace-nowrap text-right text-ink-500">{formatDate(k.created_at)}</Td>
      <Td className="text-right">
        {k.status === "active" && (
          <Button size="sm" variant="ghost" onClick={revoke} loading={busy}>
            İptal et
          </Button>
        )}
      </Td>
    </tr>
  );
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <Button type="button" size={label ? "sm" : "icon"} variant="ghost" onClick={copy} title="Kopyala">
      {copied ? <Check className="text-brand-600" /> : <Copy />}
      {label}
    </Button>
  );
}
