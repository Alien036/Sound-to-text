import { ArrowRight, Clock3, Coins, FileText, Globe2, ShieldCheck, Upload } from "lucide-react";
import Link from "next/link";
import { HeroPreview } from "@/components/hero-preview";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { FadeIn, StaggerGroup, StaggerItem } from "@/components/ui/motion";
import { Card } from "@/components/ui/primitives";

const STEPS = [
  { icon: Upload, title: "Dosyanı yükle", text: "MP3, WAV, M4A, MP4, MOV ve daha fazlası. 3 saate kadar." },
  { icon: Clock3, title: "Hızlı işleme", text: "Yapay zekâ kaydı dinler, konuşmacıları ayırır ve dakikalar içinde yazıya döker." },
  { icon: FileText, title: "Metni al", text: "Zaman damgalı transkripti TXT, SRT, VTT ve JSON olarak indir." },
];

const FEATURES = [
  { icon: Globe2, title: "Çok dilli", text: "Türkçe, İngilizce ve diğer yaygın diller." },
  { icon: Coins, title: "Adil kullanım", text: "Yalnızca kaydın süresi kadar düşer; başarısız işler iade edilir." },
  { icon: ShieldCheck, title: "Gizli kalır", text: "Dosyalarınız size aittir, yüklemeler 7 gün sonra silinir." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-white">
      <SiteHeader />

      <section className="relative overflow-hidden pb-20 pt-16 sm:pt-24">
        <div className="bg-dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,#000_35%,transparent_100%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-brand-400/12 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-8">
          <StaggerGroup className="mx-auto max-w-3xl text-center">
            <StaggerItem>
              <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-6xl sm:leading-[1.08]">
                Sesi{" "}
                <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 bg-clip-text text-transparent">
                  saniyeler
                </span>{" "}
                içinde
                <br className="hidden sm:block" /> metne dönüştür
              </h1>
            </StaggerItem>

            <StaggerItem>
              <p className="mx-auto mt-5 max-w-xl text-base text-ink-500 sm:text-lg">
                Toplantı, röportaj, ders ya da podcast. Dosyanı yükle, zaman damgalı ve aranabilir
                transkriptini al.
              </p>
            </StaggerItem>

            <StaggerItem>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login?mode=signup">
                    Hemen başla <ArrowRight className="group-hover/btn:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="#nasil">Nasıl çalışır?</Link>
                </Button>
              </div>
            </StaggerItem>
          </StaggerGroup>

          <HeroPreview />
        </div>
      </section>

      <section id="nasil" className="border-y border-ink-100/80 bg-[#f8f8fb] py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <FadeIn inView>
            <h2 className="text-center text-3xl font-semibold tracking-tight text-ink-900">
              Üç adımda transkript
            </h2>
          </FadeIn>

          <StaggerGroup inView className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <StaggerItem key={s.title}>
                <Card hover className="group h-full p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/25 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
                      <s.icon className="size-5" />
                    </span>
                    <span className="font-mono text-2xl font-semibold text-ink-200 transition-colors duration-300 group-hover:text-brand-300">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-base font-semibold text-ink-900">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.text}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <StaggerGroup inView className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <StaggerItem key={f.title}>
                <Card hover className="group h-full p-5">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-50 text-accent-500 transition-transform duration-300 group-hover:scale-110">
                    <f.icon className="size-4.5" />
                  </span>
                  <p className="mt-3.5 font-medium text-ink-900">{f.title}</p>
                  <p className="mt-1 text-sm text-ink-500">{f.text}</p>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>

          <FadeIn inView className="mt-12 text-center">
            <Button asChild size="lg" variant="outline">
              <Link href="/paketler">
                Paketleri incele <ArrowRight className="group-hover/btn:translate-x-0.5" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
