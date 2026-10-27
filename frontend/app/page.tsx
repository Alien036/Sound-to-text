import { ArrowRight, Check, Clock3, Coins, FileText, Globe2, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRICING as P } from "@/lib/constants";
import { formatTry } from "@/lib/pricing";

const STEPS = [
  { icon: Upload, title: "Dosyanı yükle", text: "MP3, WAV, M4A, MP4, MOV ve daha fazlası. 3 saate kadar." },
  { icon: Clock3, title: "Biz dinleyelim", text: "Whisper modeli GPU üzerinde kaydınızı dakikalar içinde işler." },
  { icon: FileText, title: "Metni al", text: "Zaman damgalı transkript; TXT, SRT, VTT ve JSON olarak indir." },
];

const FEATURES = [
  { icon: Globe2, title: "Çok dilli", text: "Türkçe, İngilizce ve 90+ dil; dil otomatik algılanır." },
  { icon: Coins, title: "Adil kullanım", text: "Kotanızdan yalnızca kaydın süresi kadar düşer. Başarısız işler iade edilir." },
  { icon: ShieldCheck, title: "Gizli kalır", text: "Dosyalarınız yalnızca size aittir, yüklemeler 7 gün sonra silinir." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Giriş yap</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?mode=signup">{P.signup_bonus} dk dene</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <span className="size-1.5 rounded-full bg-accent-500" />
            Kayıt olana {P.signup_bonus} dakika deneme
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink-900 sm:text-6xl">
            Sesi <span className="text-brand-500">saniyeler</span> içinde
            <br className="hidden sm:block" /> metne dönüştür
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink-500 sm:text-lg">
            Toplantı, röportaj, ders ya da podcast. Dosyanı yükle, zaman damgalı ve aranabilir
            transkriptini al.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login?mode=signup">
                Hemen dene <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#nasil">Nasıl çalışır?</Link>
            </Button>
          </div>
        </div>

        {/* Ürün önizlemesi */}
        <div className="mx-auto mt-16 max-w-4xl rounded-3xl bg-ink-900 p-2 shadow-2xl shadow-brand-500/10">
          <div className="rounded-[20px] bg-white p-5 sm:p-8">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div>
                <p className="font-medium text-ink-900">haftalik-toplanti.m4a</p>
                <p className="text-xs text-ink-400">42:18 · Türkçe · 43 kredi</p>
              </div>
              <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-medium text-white">
                Tamamlandı
              </span>
            </div>
            <div className="mt-4 space-y-1 text-left text-sm">
              {[
                ["00:00", "Herkese günaydın, bu haftanın gündemiyle başlayalım."],
                ["00:06", "İlk madde yeni sürümün yayın tarihi."],
                ["00:11", "Test ekibinden gelen geri bildirimlere göre cuma günü hazırız."],
              ].map(([t, s], i) => (
                <div
                  key={t}
                  className={`flex gap-4 rounded-xl px-3 py-2 ${i === 1 ? "bg-brand-50" : ""}`}
                >
                  <span className="font-mono text-xs leading-5 text-brand-500">{t}</span>
                  <span className="text-ink-700">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="nasil" className="bg-ink-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-900">Üç adımda transkript</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-500 text-white">
                    <s.icon className="size-5" />
                  </span>
                  <span className="text-3xl font-semibold text-ink-100">0{i + 1}</span>
                </div>
                <h3 className="mt-5 font-semibold text-ink-900">{s.title}</h3>
                <p className="mt-1.5 text-sm text-ink-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fiyat" className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900">Tek paket, net fiyat</h2>
            <p className="mt-3 text-ink-500">
              Kayıt ol, {P.signup_bonus} dakikayı dene. Beğenirsen Pro&apos;ya geç; kota biterse ek paketle devam et.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-[1.3fr_1fr]">
            <div className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-white sm:p-10">
              <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-500/30 blur-3xl" />
              <div className="relative">
                <span className="rounded-full bg-accent-500 px-2.5 py-0.5 text-xs font-medium">Pro</span>
                <p className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-semibold tracking-tight">{formatTry(P.plan_price_try)}</span>
                  <span className="text-ink-300">/ ay</span>
                </p>
                <p className="mt-2 text-brand-300">
                  Her ay {P.plan_monthly_credits} dakika transkript
                </p>
                <ul className="mt-6 space-y-2.5 text-sm text-ink-200">
                  {[
                    "Saatlerce süren video ve ses dosyaları",
                    "TXT, SRT, VTT ve JSON çıktı",
                    "Başarısız işlerde otomatik iade",
                    "Turbo ve Large v3 modelleri",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check className="size-4 text-brand-300" /> {t}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="accent" size="lg" className="mt-8 w-full">
                  <Link href="/login?mode=signup">
                    {P.signup_bonus} dakika dene <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="flex flex-col rounded-3xl border border-ink-100 bg-white p-8">
              <p className="text-sm font-medium text-ink-500">Ek paket</p>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-ink-900">
                  {formatTry(P.topup_price_try)}
                </span>
              </p>
              <p className="mt-2 text-brand-600">+{P.topup_credits} dakika</p>
              <p className="mt-4 text-sm text-ink-500">
                Aylık kotan bittiğinde istediğin kadar ekle. Ek paket dakikaları ay sonunda silinmez.
              </p>
              <p className="mt-auto pt-6 text-xs text-ink-400">
                Fiyatlara KDV dahildir. Süre dakikaya yukarı yuvarlanır; Large v3 modeli 2 kat dakika kullanır.
              </p>
            </div>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <f.icon className="size-5 text-accent-500" />
                <p className="mt-2 font-medium text-ink-900">{f.title}</p>
                <p className="mt-1 text-sm text-ink-500">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-sm text-ink-400 sm:px-8">
          <Logo />
          <span>© {new Date().getFullYear()} Sesyaz</span>
        </div>
      </footer>
    </div>
  );
}
