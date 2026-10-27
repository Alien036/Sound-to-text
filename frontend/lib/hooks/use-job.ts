"use client";

import { useQuery } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { db } from "@/lib/firebase";
import type { Job } from "@/lib/types";
import { useAuth } from "./use-auth";

/**
 * jobs/{id} belgesini Firestore onSnapshot ile canlı izler.
 * Dinleyici kurulamazsa (kural/ağ hatası) API'ye periyodik sorguyla düşer.
 */
export function useJob(id: string) {
  const { user } = useAuth();
  const [live, setLive] = useState<Job | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [listenerFailed, setListenerFailed] = useState(false);

  useEffect(() => {
    setLive(null);
    setNotFound(false);
    setListenerFailed(false);
    if (!user || !id) return;
    return onSnapshot(
      doc(db, "jobs", id),
      (snap) => {
        if (!snap.exists()) {
          setNotFound(true);
          setLive(null);
          return;
        }
        setNotFound(false);
        setLive({ id: snap.id, ...(snap.data() as Omit<Job, "id">) });
      },
      () => setListenerFailed(true),
    );
  }, [user, id]);

  const fallback = useQuery({
    queryKey: ["job", id],
    queryFn: () => api.getJob(id),
    enabled: !!user && listenerFailed,
    refetchInterval: (q) =>
      q.state.data && ACTIVE_STATUSES.includes(q.state.data.status) ? 3000 : false,
  });

  const job = live ?? fallback.data ?? null;
  return {
    job,
    loading: !job && !notFound && !fallback.isError,
    notFound: notFound || (fallback.error as { status?: number } | null)?.status === 404,
    error: fallback.error,
  };
}
