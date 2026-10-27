"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Coins,
  Equal,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Badge,
  Card,
  CardContent,
  Input,
  Label,
  Skeleton,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui/primitives";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { usePricing } from "@/lib/hooks/use-me";
import { formatTry } from "@/lib/pricing";
import type { AdminUser } from "@/lib/types";
import { cn, formatCredits, formatDate } from "@/lib/utils";

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function AlienAdminPage() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const [selected, setSelected] = useState<AdminUser | null>(null);

  // Eğer arama e-posta gibi görünüyorsa API'ye de gönder, aksi halde tüm listeyi çekip istemcide de filtrele.
  const apiEmailQuery = q.includes("@") ? q : undefined;

  const usersQuery = useInfiniteQuery({
    queryKey: ["admin", "users", apiEmailQuery],
    queryFn: ({ pageParam }) =>
      api.admin.users({ email: apiEmailQuery, limit: 100, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });

  const allItems = useMemo(
    () => usersQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [usersQuery.data],
  );

  const items = useMemo(() => {
    if (!q) return allItems;
    const needle = q.toLowerCase();
    return allItems.filter(
      (u) =>
        u.email?.toLowerCase().includes(needle) ||
        u.display_name?.toLowerCase().includes(needle) ||
        u.uid.toLowerCase().includes(needle),
    );
  }, [allItems, q]);

  const totalTokens = useMemo(
    () => allItems.reduce((sum, u) => sum + (u.credits_balance ?? 0), 0),
    [allItems],
  );

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["admin", "users"] });
    qc.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <>
      <PageHeader
        title="Admin Paneli · Token Yönetimi"
        description="Tüm kullanıcıları görüntüleyin; herkesin token (kredi) bakiyesini doğrudan belirleyin, ekleyin veya düşün."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => usersQuery.refetch()}
              loading={usersQuery.isFetching}
            >
              <RefreshCw /> Yenile
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/jobs">
                <Workflow /> Tüm işler
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/pricing">
                <Settings2 /> Fiyatlandırma
              </Link>
            </Button>
          </div>
        }
      />

      {/* Özet Kartları */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-ink-900 text-white">
          <CardContent className="flex items-center gap-3.5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-brand-300">
              <Users className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-300">Toplam Kullanıcı</p>
              <p className="text-2xl font-semibold tabular-nums">
                {usersQuery.isLoading ? "…" : allItems.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3.5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Coins className="size-5" />
            </span>
            <div>
              <p className="text-xs text-ink-500">Toplam Kullanıcı Tokenı</p>
              <p className="text-2xl font-semibold tabular-nums text-ink-900">
                {usersQuery.isLoading ? "…" : formatCredits(totalTokens)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3.5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600">
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-ink-500">Aktif Yönetici Oturumu</p>
              <p className="truncate text-sm font-medium text-ink-900">
                {currentUser?.email ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arama Çubuğu */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="E-posta, isim veya UID ile kullanıcı ara…"
            className="pl-9"
          />
        </div>
        {q && (
          <p className="text-xs text-ink-500">
            Arama sonucu: <span className="font-semibold text-ink-900">{items.length}</span> kullanıcı
          </p>
        )}
      </div>

      {/* Kullanıcı Tablosu */}
      <Card>
        {usersQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : usersQuery.isError ? (
          <ErrorState
            message={errorMessage(usersQuery.error)}
            onRetry={() => usersQuery.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Kullanıcı bulunamadı"
            description={q ? `"${q}" aramasına uygun kullanıcı yok.` : "Sistemde henüz kayıtlı kullanıcı yok."}
          />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Kullanıcı</Th>
                  <Th className="text-right">Mevcut Token</Th>
                  <Th>Hızlı Token Ayarla</Th>
                  <Th className="text-right">Kayıt</Th>
                  <Th className="text-right">İşlem</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <UserTokenRow
                    key={u.uid}
                    user={u}
                    onOpenModal={() => setSelected(u)}
                    onUpdated={refreshAll}
                  />
                ))}
              </tbody>
            </Table>

            {usersQuery.hasNextPage && (
              <div className="flex justify-center border-t border-ink-100 p-4">
                <Button
                  variant="outline"
                  onClick={() => usersQuery.fetchNextPage()}
                  loading={usersQuery.isFetchingNextPage}
                >
                  Daha fazla kullanıcı yükle
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <TokenDialog
        user={selected}
        onClose={() => setSelected(null)}
        onUpdated={refreshAll}
      />
    </>
  );
}

function UserTokenRow({
  user,
  onOpenModal,
  onUpdated,
}: {
  user: AdminUser;
  onOpenModal: () => void;
  onUpdated: () => void;
}) {
  const [targetValue, setTargetValue] = useState(String(user.credits_balance));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTargetValue(String(user.credits_balance));
  }, [user.credits_balance]);

  async function applyDelta(delta: number, noteText: string) {
    if (delta === 0) {
      toast.info("Bakiye zaten bu değerde.");
      return;
    }
    if (user.credits_balance + delta < 0) {
      toast.error("Bakiye 0'ın altına düşemez.");
      return;
    }
    setBusy(true);
    try {
      await api.admin.adjustCredits(user.uid, { amount: delta, note: noteText });
      toast.success(
        `${user.email || user.uid}: ${formatCredits(user.credits_balance)} → ${formatCredits(
          user.credits_balance + delta,
        )} token (${delta > 0 ? "+" : ""}${formatCredits(delta)})`,
      );
      onUpdated();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDirectSet(e: React.FormEvent) {
    e.preventDefault();
    const target = Math.floor(Number(targetValue));
    if (!Number.isFinite(target) || target < 0) {
      toast.error("Geçerli bir token sayısı girin (0 veya üzeri).");
      return;
    }
    const delta = target - user.credits_balance;
    await applyDelta(delta, `Admin panelinden bakiye ${target} olarak ayarlandı`);
  }

  const parsedTarget = Math.floor(Number(targetValue));
  const targetChanged =
    targetValue.trim() !== "" &&
    Number.isFinite(parsedTarget) &&
    parsedTarget >= 0 &&
    parsedTarget !== user.credits_balance;

  return (
    <tr className="hover:bg-ink-50/60">
      <Td>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
            {(user.display_name || user.email || "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-1.5 truncate font-medium text-ink-900">
              <span>{user.display_name || "—"}</span>
              {user.is_admin && <Badge tone="dark">Admin</Badge>}
              {user.subscription?.status === "active" && <Badge tone="solid">Pro</Badge>}
              {user.disabled && <Badge tone="accent">Devre dışı</Badge>}
            </p>
            <p className="truncate text-xs text-ink-500">{user.email || user.uid}</p>
          </div>
        </div>
      </Td>

      <Td className="text-right">
        <span className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-1 font-semibold tabular-nums text-brand-700">
          <Coins className="size-3.5 text-brand-500" />
          {formatCredits(user.credits_balance)}
        </span>
      </Td>

      <Td>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Hızlı Ekle / Düş Butonları */}
          <button
            type="button"
            disabled={busy || user.credits_balance < 10}
            onClick={() => applyDelta(-10, "Hızlı -10 token")}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-accent-600 transition-colors hover:bg-accent-50 disabled:opacity-40 cursor-pointer"
            title="10 token düş"
          >
            -10
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyDelta(10, "Hızlı +10 token")}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 cursor-pointer"
            title="10 token ekle"
          >
            +10
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyDelta(50, "Hızlı +50 token")}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 cursor-pointer"
            title="50 token ekle"
          >
            +50
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => applyDelta(100, "Hızlı +100 token")}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-40 cursor-pointer"
            title="100 token ekle"
          >
            +100
          </button>

          {/* Doğrudan Hedef Bakiye Girişi */}
          <form onSubmit={handleDirectSet} className="ml-1 flex items-center gap-1">
            <Input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              disabled={busy}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="h-8 w-24 rounded-lg px-2 text-right text-xs tabular-nums"
              title="Doğrudan yeni token bakiyesini yazın"
            />
            <Button
              type="submit"
              size="sm"
              variant={targetChanged ? "primary" : "outline"}
              disabled={busy || !targetChanged}
              loading={busy}
              className="h-8 px-2.5 text-xs"
            >
              <Check className="size-3.5" />
              Ayarla
            </Button>
          </form>
        </div>
      </Td>

      <Td className="whitespace-nowrap text-right text-xs text-ink-500">
        {formatDate(user.created_at)}
      </Td>

      <Td className="text-right">
        <Button size="sm" variant="outline" onClick={onOpenModal}>
          <SlidersHorizontal /> Detaylı
        </Button>
      </Td>
    </tr>
  );
}

/** Ödeme entegrasyonu gelene kadar Pro aboneliği buradan elle açılıp kapatılır. */
function SubscriptionRow({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const pricing = usePricing();
  const [busy, setBusy] = useState(false);
  const active = user.subscription?.status === "active";

  async function toggle() {
    setBusy(true);
    try {
      await api.admin.setSubscription(user.uid, { plan: active ? null : "pro" });
      toast.success(active ? "Pro aboneliği iptal edildi." : "Pro aboneliği başlatıldı.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 flex items-center justify-between gap-4 border-t border-ink-100 pt-5">
      <div className="text-sm">
        <p className="font-medium text-ink-900">Pro aboneliği</p>
        <p className="text-ink-500">
          {active
            ? `Aktif · bitiş ${formatDate(user.subscription?.current_period_end)}`
            : `${formatTry(pricing.plan_price_try)} / ay · ${pricing.plan_monthly_credits} dk`}
        </p>
      </div>
      <Button variant={active ? "danger" : "dark"} size="sm" onClick={toggle} loading={busy}>
        {active ? "İptal et" : "Pro başlat"}
      </Button>
    </div>
  );
}

const SET_PRESETS = [0, 5, 25, 50, 100, 250, 400, 1000];
const DELTA_PRESETS = [5, 10, 25, 50, 100, 250, 400, 1000];

export function TokenDialog({
  user,
  onClose,
  onUpdated,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [mode, setMode] = useState<"set" | "add" | "remove">("set");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setMode("set");
      setAmount(String(user.credits_balance));
      setNote("");
    }
  }, [user]);

  function handleModeChange(nextMode: "set" | "add" | "remove") {
    setMode(nextMode);
    if (nextMode === "set" && user) {
      setAmount(String(user.credits_balance));
    } else {
      setAmount("");
    }
  }

  const rawNum = Number(amount);
  const n = Math.floor(rawNum);

  let valid = false;
  let delta = 0;
  let after: number | null = null;

  if (user && amount.trim() !== "" && Number.isFinite(n)) {
    if (mode === "set") {
      valid = n >= 0 && n !== user.credits_balance;
      delta = n - user.credits_balance;
      after = n >= 0 ? n : null;
    } else if (mode === "add") {
      valid = n > 0;
      delta = n;
      after = valid ? user.credits_balance + n : null;
    } else {
      valid = n > 0 && user.credits_balance - n >= 0;
      delta = -n;
      after = n > 0 ? user.credits_balance - n : null;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !valid) return;
    setBusy(true);
    try {
      const defaultNote =
        mode === "set"
          ? `Admin: bakiye ${after} olarak ayarlandı`
          : mode === "add"
            ? `Admin: +${n} token eklendi`
            : `Admin: -${n} token düşüldü`;
      await api.admin.adjustCredits(user.uid, {
        amount: delta,
        note: note.trim() || defaultNote,
      });
      toast.success(
        `${user.email || user.uid}: yeni bakiye ${formatCredits(after)} token (${
          delta > 0 ? "+" : ""
        }${formatCredits(delta)})`,
      );
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      {user && (
        <DialogContent
          title="Kullanıcı Token Ayarla"
          description={`${user.display_name ? `${user.display_name} · ` : ""}${user.email || user.uid}`}
        >
          <form onSubmit={submit} className="space-y-4">
            {/* Mod Seçici */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-ink-50 p-1">
              {(
                [
                  { id: "set", label: "Bakiye Belirle", icon: Equal },
                  { id: "add", label: "Token Ekle", icon: Plus },
                  { id: "remove", label: "Token Düş", icon: Minus },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleModeChange(m.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors cursor-pointer",
                    mode === m.id
                      ? m.id === "remove"
                        ? "bg-white text-accent-600 shadow-sm"
                        : "bg-white text-brand-600 shadow-sm"
                      : "text-ink-500 hover:text-ink-800",
                  )}
                >
                  <m.icon className="size-3.5" />
                  {m.label}
                </button>
              ))}
            </div>

            {/* Hazır Değer Butonları */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-500">
                {mode === "set" ? "Hızlı bakiye seç:" : "Hızlı miktar seç:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(mode === "set" ? SET_PRESETS : DELTA_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums transition-colors cursor-pointer",
                      Number(amount) === preset && amount.trim() !== ""
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
                    )}
                  >
                    {mode === "add" ? `+${preset}` : mode === "remove" ? `-${preset}` : preset === 0 ? "0 (Sıfırla)" : preset}
                  </button>
                ))}
                {mode === "remove" && user.credits_balance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(user.credits_balance))}
                    className="rounded-lg border border-accent-200 bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100 cursor-pointer"
                  >
                    Tümünü düş ({user.credits_balance})
                  </button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="amount">
                {mode === "set"
                  ? "Yeni Token Bakiyesi"
                  : mode === "add"
                    ? "Eklenecek Token Miktarı"
                    : "Düşülecek Token Miktarı"}
              </Label>
              <Input
                id="amount"
                type="number"
                min={mode === "set" ? 0 : 1}
                step={1}
                inputMode="numeric"
                required
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={mode === "set" ? "ör. 100" : "ör. 50"}
              />
            </div>

            <div>
              <Label htmlFor="note">Not (isteğe bağlı)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ör. Paket tanımlaması / Manuel token ayarı"
              />
            </div>

            {/* Önizleme Kutusu */}
            <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3 text-sm">
              <span className="text-ink-500">
                Mevcut: <strong className="text-ink-900">{formatCredits(user.credits_balance)}</strong> → Yeni:{" "}
                <span
                  className={cn(
                    "font-semibold",
                    after != null && after < 0 ? "text-accent-600" : "text-ink-900",
                  )}
                >
                  {after == null ? "—" : formatCredits(after)}
                </span>
              </span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  delta > 0 ? "text-brand-600" : delta < 0 ? "text-accent-600" : "text-ink-400",
                )}
              >
                {delta !== 0 ? `${delta > 0 ? "+" : ""}${formatCredits(delta)} token` : "Değişiklik yok"}
              </span>
            </div>

            <Button
              type="submit"
              size="lg"
              variant={mode === "remove" ? "accent" : "primary"}
              className="w-full"
              loading={busy}
              disabled={!valid || (after != null && after < 0)}
            >
              {mode === "set"
                ? "Bakiyeyi Kaydet"
                : mode === "add"
                  ? "Token Ekle"
                  : "Token Düş"}
            </Button>
          </form>

          <SubscriptionRow
            user={user}
            onDone={() => {
              onUpdated();
              onClose();
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
