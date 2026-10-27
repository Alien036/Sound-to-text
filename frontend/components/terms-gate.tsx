"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMe } from "@/lib/hooks/use-me";
import { TERMS_VERSION } from "@/lib/legal";
import { TermsConsent } from "./terms-consent";

/**
 * Kayıtta onay vermemiş (eski hesaplar, ilk kez Google ile giriş) ya da metinler güncellendiği için
 * yeniden onay gereken kullanıcıya kapatılamayan pencere gösterir.
 */
export function TermsGate() {
  const { user, signOut } = useAuth();
  const me = useMe();
  const queryClient = useQueryClient();
  const [consent, setConsent] = useState(false);

  const accept = useMutation({
    mutationFn: () => api.acceptTerms(TERMS_VERSION),
    onSuccess: (data) => queryClient.setQueryData(["me", user?.uid], data),
    // 409: sitedeki metin sürümü backend'den eski; sayfa yenilenince güncel metin gelir
    onError: () => void me.refetch(),
  });

  // Backend sürüm bilgisi dönmüyorsa (eski API) pencere açılmaz
  const required = me.data?.terms_version;
  const open = !!required && me.data?.accepted_terms_version !== required;
  if (!open) return null;

  return (
    <DialogPrimitive.Root open>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink-900/30 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl shadow-ink-900/10 animate-dialog-in"
        >
          <DialogPrimitive.Title className="text-lg font-semibold text-ink-900">
            {me.data?.accepted_terms_version ? "Koşullarımız güncellendi" : "Devam etmeden önce"}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-sm text-ink-500">
            Hizmeti kullanmaya devam etmek için aşağıdaki metinleri onaylamanız gerekiyor.
          </DialogPrimitive.Description>

          <div className="mt-5 rounded-xl border border-ink-100 p-3.5">
            <TermsConsent checked={consent} onChange={setConsent} />
          </div>

          {accept.isError && (
            <p className="mt-3 rounded-xl bg-accent-50 px-3 py-2.5 text-sm text-accent-700">
              {errorMessage(accept.error)}
              {TERMS_VERSION !== required && " Sayfayı yenileyip tekrar deneyin."}
            </p>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={signOut}>
              Çıkış yap
            </Button>
            <Button onClick={() => accept.mutate()} disabled={!consent} loading={accept.isPending}>
              Devam et
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
