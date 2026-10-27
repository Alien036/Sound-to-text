import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/motion";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <FadeIn>
        <span className="inline-flex rounded-full bg-accent-50 px-3 py-1 font-mono text-xs font-semibold text-accent-600 ring-1 ring-inset ring-accent-200/60">
          404
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Sayfa bulunamadı</h1>
        <Button asChild className="mt-6">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </FadeIn>
    </div>
  );
}
