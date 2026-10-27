"use client";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/common";
import { PackageCards, PackagesSteps } from "@/components/packages";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FadeIn } from "@/components/ui/motion";
import { useAuth } from "@/lib/hooks/use-auth";

export default function PackagesPage() {
  const { user } = useAuth();

  if (user) {
    return (
      <AppShell>
        <PageHeader
          title="Paketler"
          description="Abonelik yok. Paketini seç, lisans anahtarın e-postayla gelsin, hesabında etkinleştir."
        />
        <PackageCards />
        <PackagesSteps />
      </AppShell>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader />

      <section className="relative overflow-hidden py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <FadeIn inView className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-ink-900">Paketler</h1>
            <p className="mt-3 text-ink-500">
              Abonelik yok. Paketini seç, lisans anahtarın e-postayla gelsin, hesabında etkinleştir.
            </p>
          </FadeIn>

          <div className="mx-auto mt-12 max-w-5xl">
            <PackageCards />
          </div>

          <div className="mx-auto max-w-5xl">
            <PackagesSteps />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
