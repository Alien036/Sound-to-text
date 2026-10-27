import type { CreditTxType, JobStatus, Pricing } from "./types";

export const DEFAULT_PRICING: Pricing = {
  credits_per_minute: 1,
  // Modeller /pricing yüklenene kadar bilinmiyor; varsayılan uydurulmaz.
  model_multipliers: {},
  max_duration_sec: 3 * 3600,
  max_file_mb: 2048,
  signup_bonus: 5,
  plan_price_try: 250,
  plan_monthly_credits: 400,
  topup_credits: 100,
  topup_price_try: 60,
  gpu_cost_per_minute_try: 0.083,
};

/** Hedef: KDV ve komisyon düşüldükten sonra gelir ≥ 5 × GPU maliyeti. */
export const TARGET_MARGIN = 5;
export const KDV_RATE = 0.2;
export const PAYMENT_FEE_RATE = 0.04;

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
  signup_bonus: "Hoş geldin bonusu",
  job_hold: "İş ücreti",
  job_refund: "İade",
  job_adjust: "Süre düzeltmesi",
  subscription_grant: "Aylık Pro kredisi",
  subscription_expire: "Dönem sonu (kullanılmayan)",
  topup_purchase: "Ek paket",
};

export const ACTIVE_STATUSES: JobStatus[] = ["uploaded", "queued", "processing"];
