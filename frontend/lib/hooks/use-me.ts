"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_PRICING } from "@/lib/constants";
import { db } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";
import { useAuth } from "./use-auth";

/** GET /me — ilk çağrıda backend kullanıcı belgesini oluşturur. */
export function useMe() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["me", user?.uid],
    queryFn: api.me,
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function usePricing() {
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: api.pricing, staleTime: 5 * 60_000 });
  // Backend paket alanlarını (plan_*, topup_*) henüz dönmüyorsa varsayılanlardan gelir.
  return useMemo(() => ({ ...DEFAULT_PRICING, ...data }), [data]);
}

/** Bakiye ve abonelik: users/{uid} belgesi canlı dinlenir, olmazsa /me cevabına düşülür. */
export function useBalance() {
  const { user } = useAuth();
  const me = useMe();
  const [live, setLive] = useState<Pick<UserProfile, "credits_balance" | "subscription"> | null>(null);

  useEffect(() => {
    setLive(null);
    // /me tamamlanmadan belge henüz yok olabilir; ondan sonra dinlemeye başla.
    if (!user || !me.isSuccess) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const d = snap.data();
        if (typeof d?.credits_balance === "number") {
          setLive({ credits_balance: d.credits_balance, subscription: d.subscription ?? null });
        }
      },
      () => setLive(null),
    );
  }, [user, me.isSuccess]);

  const subscription = live ? live.subscription : me.data?.subscription;
  return {
    balance: live?.credits_balance ?? me.data?.credits_balance ?? null,
    subscription: subscription?.status === "active" ? subscription : null,
    loading: me.isLoading,
  };
}
