import type { Metadata } from "next";
import { PackageCards } from "@/components/packages";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { FadeIn } from "@/components/ui/motion";
import { SALES_EMAIL } from "@/lib/constants";

export const metadata: Metadata = { title: "Paketler" };

export default function PackagesPage() {
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

          <FadeIn inView className="mx-auto mt-8 max-w-5xl">
            <ol className="grid gap-3 rounded-2xl border border-ink-100 bg-[#f8f8fb] p-5 text-sm text-ink-600 sm:grid-cols-3">
              {[
                <>
                  Paketi seç,{" "}
                  <a href={`mailto:${SALES_EMAIL}`} className="font-medium text-brand-600 hover:underline">
                    {SALES_EMAIL}
                  </a>{" "}
                  adresine yaz.
                </>,
                <>Lisans anahtarın e-postayla gelsin (BUS-XXXX-XXXX-XXXX).</>,
                <>
                  Kayıt ol, <strong className="font-medium text-ink-900">Krediler</strong> sayfasında anahtarı etkinleştir.
                </>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white font-mono text-xs font-semibold text-brand-600 ring-1 ring-ink-200/70">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-center text-xs text-ink-400">
              Fiyatlara KDV dahildir. Krediler kaydın süresine göre düşer; Argon 4, Flash&apos;tan daha fazla kredi kullanır.
            </p>
          </FadeIn>

        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
