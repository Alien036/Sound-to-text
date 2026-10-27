"use client";

import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { auth } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claimAdmin, setClaimAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    // onIdTokenChanged: claim'ler (admin) token yenilenince de güncellensin.
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const token = await u.getIdTokenResult();
        setClaimAdmin(token.claims.admin === true);
      } else {
        setClaimAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  const me = useQuery({
    queryKey: ["me", user?.uid],
    queryFn: api.me,
    enabled: !!user,
    staleTime: 60_000,
  });

  const isAdmin = claimAdmin || me.data?.is_admin === true;

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAdmin,
      loading,
      signOut: async () => {
        await fbSignOut(auth);
        qc.clear();
      },
    }),
    [user, isAdmin, loading, qc],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}
