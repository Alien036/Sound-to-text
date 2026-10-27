import Link from "next/link";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { LEGAL_DOCS } from "@/lib/legal";

/** Giriş gerektirmeyen sayfaların (ana sayfa, paketler) üst menüsü. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/40 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/paketler">Paketler</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Giriş yap</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/login?mode=signup">Kayıt ol</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-ink-400 sm:px-8">
        <Logo />
        <nav className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          <Link href="/paketler" className="transition-colors hover:text-ink-700">
            Paketler
          </Link>
          {LEGAL_DOCS.map((d) => (
            <Link key={d.slug} href={`/legal/${d.slug}`} className="transition-colors hover:text-ink-700">
              {d.title}
            </Link>
          ))}
          <span>© {new Date().getFullYear()} Etheria</span>
        </nav>
      </div>
    </footer>
  );
}
