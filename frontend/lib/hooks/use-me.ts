"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DEFAULT_PRICING } from "@/lib/constants";
import { db } from "@/lib/firebase";
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
  return useMemo(() => ({ ...DEFAULT_PRICING, ...data }), [data]);
}

/** Bakiye: users/{uid} belgesi canlı dinlenir, olmazsa /me cevabına düşülür. */
export function useBalance() {
  const { user } = useAuth();
  const me = useMe();
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    setLive(null);
    // /me tamamlanmadan belge henüz yok olabilir; ondan sonra dinlemeye başla.
    if (!user || !me.isSuccess) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const d = snap.data();
        if (typeof d?.credits_balance === "number") setLive(d.credits_balance);
      },
      () => setLive(null),
    );
  }, [user, me.isSuccess]);

  return {
    balance: live ?? me.data?.credits_balance ?? null,
    loading: me.isLoading,
  };
}
