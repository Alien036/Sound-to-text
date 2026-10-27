import Link from "next/link";

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} target="_blank" className="font-medium text-brand-600 hover:underline">
      {children}
    </Link>
  );
}

/** Kullanım koşulları + gizlilik + KVKK için tek onay kutusu (kayıt ve yeniden onay ekranı). */
export function TermsConsent({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-ink-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 size-4 shrink-0 accent-brand-500"
      />
      {/* Aydınlatma metni onaylanmaz, okunur: ifade bilerek ayrı */}
      <span>
        <DocLink href="/legal/kullanim-kosullari">Kullanım Koşulları</DocLink>&apos;nı ve{" "}
        <DocLink href="/legal/gizlilik">Gizlilik Politikası</DocLink>&apos;nı okudum, kabul ediyorum.{" "}
        <DocLink href="/legal/kvkk">KVKK Aydınlatma Metni</DocLink>&apos;ni okudum.
      </span>
    </label>
  );
}
