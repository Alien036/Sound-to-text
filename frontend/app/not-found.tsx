import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold text-accent-500">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink-900">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-ink-500">Aradığınız sayfa taşınmış ya da hiç var olmamış olabilir.</p>
        <Button asChild className="mt-6">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>
    </div>
  );
}
