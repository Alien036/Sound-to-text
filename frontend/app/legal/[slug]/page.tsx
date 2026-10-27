import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/common";
import { LEGAL_DOCS } from "@/lib/legal";

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: LEGAL_DOCS.find((d) => d.slug === slug)?.title };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!LEGAL_DOCS.some((d) => d.slug === slug)) notFound();
  // Metinler bizim; derleme anında HTML'e çevrilir
  const md = await readFile(join(process.cwd(), "content/legal", `${slug}.md`), "utf8");
  const html = await marked.parse(md);

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {LEGAL_DOCS.map((d) => (
              <Link
                key={d.slug}
                href={`/legal/${d.slug}`}
                className={d.slug === slug ? "font-medium text-ink-900" : "text-ink-500 hover:text-ink-900"}
              >
                {d.title}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <article className="legal mx-auto max-w-3xl px-4 py-10 sm:px-8" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
