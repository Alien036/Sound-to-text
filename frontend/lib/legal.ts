/**
 * Yasal metinler content/legal/*.md'de. Metin değişince TERMS_VERSION'ı ve backend'deki
 * TERMS_VERSION ayarını birlikte artır; kullanıcılardan yeniden onay istenir.
 */
export const TERMS_VERSION = "2026-10-27";

export const LEGAL_DOCS = [
  { slug: "kullanim-kosullari", title: "Kullanım Koşulları" },
  { slug: "gizlilik", title: "Gizlilik Politikası" },
  { slug: "kvkk", title: "KVKK Aydınlatma Metni" },
] as const;

export type LegalSlug = (typeof LEGAL_DOCS)[number]["slug"];
