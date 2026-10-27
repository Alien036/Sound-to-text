import type { CreditTxType, JobStatus, Pricing } from "./types";

export const DEFAULT_PRICING: Pricing = {
  credits_per_minute: 1,
  // Modeller /pricing yüklenene kadar bilinmiyor; varsayılan uydurulmaz.
  model_multipliers: {},
  max_duration_sec: 3 * 3600,
  max_file_mb: 2048,
  // /pricing yüklenene kadar (ve statik ana sayfada) backend varsayılanlarıyla aynı paketler
  packages: [
    { id: "baslangic", name: "Başlangıç", credits: 300, price_try: 149 },
    { id: "standart", name: "Standart", credits: 900, price_try: 399 },
    { id: "profesyonel", name: "Profesyonel", credits: 2400, price_try: 899 },
  ],
};

/** Lisans anahtarı satın almak için iletişim adresi (anahtarlar elle satılır). */
export const SALES_EMAIL = "info@bustudio.dev";

export const ACCEPTED_EXTENSIONS = [
  "mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4", "mov", "mkv",
] as const;

export const ACCEPT_MAP: Record<string, string[]> = {
  "audio/*": [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"],
  "video/*": [".mp4", ".mov", ".mkv", ".webm"],
};

export const LANGUAGES = [
  { value: "auto", label: "Otomatik algıla" },
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "İngilizce" },
  { value: "de", label: "Almanca" },
  { value: "fr", label: "Fransızca" },
  { value: "es", label: "İspanyolca" },
  { value: "it", label: "İtalyanca" },
  { value: "ru", label: "Rusça" },
  { value: "ar", label: "Arapça" },
] as const;

// Model adları, açıklamaları ve fiyatları GET /pricing → model_details'tan gelir (lib/hooks/use-models.ts).
export const CONTEXT_MAX_LENGTH = 300;

export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.label]),
);

export const STATUS_LABELS: Record<JobStatus, string> = {
  uploaded: "Yüklendi",
  queued: "Kuyrukta",
  processing: "İşleniyor",
  completed: "Tamamlandı",
  failed: "Başarısız",
};

export const TX_LABELS: Record<CreditTxType, string> = {
  admin_grant: "Yönetici yüklemesi",
  license_key: "Lisans anahtarı",
  signup_bonus: "Hoş geldin bonusu",
  job_hold: "İş ücreti",
  job_refund: "İade",
};

export const ACTIVE_STATUSES: JobStatus[] = ["uploaded", "queued", "processing"];
