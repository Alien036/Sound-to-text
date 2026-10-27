export type JobStatus = "uploaded" | "queued" | "processing" | "completed" | "failed";
export type ResultFormat = "txt" | "srt" | "vtt" | "json";

/** Firestore Timestamp, API'den gelen ISO string ya da epoch olabilir. */
export type DateLike =
  | string
  | number
  | Date
  | { seconds: number; nanoseconds?: number }
  | { _seconds: number }
  | { toDate: () => Date }
  | null
  | undefined;

export interface Subscription {
  plan: "pro";
  status: "active" | "canceled" | "expired";
  current_period_end?: DateLike;
  /** Dönem başında yüklenen aylık kredi ve bu dönemde harcanan kısmı. */
  period_credits: number;
  period_used: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  display_name?: string | null;
  credits_balance: number;
  is_admin?: boolean | null;
  subscription?: Subscription | null;
  created_at?: DateLike;
  disabled?: boolean;
}

export interface Pricing {
  credits_per_minute: number;
  model_multipliers: Record<string, number>;
  max_duration_sec: number;
  max_file_mb: number;
  signup_bonus: number;
  /** GET /pricing: kullanılabilir modeller (ör. ["gemini", "turbo", "large-v3"]). */
  models?: string[];
  /** GET /pricing: ucuzdan pahalıya sıralı model kartları; ad/açıklama/fiyat buradan. */
  model_details?: ModelDetail[];
  default_model?: string;
  allowed_extensions?: string[];
  /** Aylık Pro paket (KDV dahil TL) ve her ay yüklenen kredi. */
  plan_price_try: number;
  plan_monthly_credits: number;
  /** Kota bitince alınan ek paket. */
  topup_credits: number;
  topup_price_try: number;
  /** Turbo ile 1 dakika sesin tahmini GPU maliyeti (TL); kâr çarpanı hesabı için. */
  gpu_cost_per_minute_try: number;
}

export interface ModelDetail {
  /** API'deki kimlik ("gemini"); ekranda `label` ("Argon 4") gösterilir. */
  id: string;
  label: string;
  description: string;
  /** 1–3 */
  quality: number;
  /** 1–3 */
  speed: number;
  speakers: boolean;
  precise_timestamps: boolean;
  /** Çarpan dahil dakika başı kredi. */
  credits_per_minute: number;
}

export interface MeResponse extends UserProfile {
  is_admin?: boolean;
  /** Backend isterse /me cevabında fiyatlandırmayı da döndürebilir. */
  pricing?: Pricing;
}

export interface Job {
  id: string;
  uid: string;
  status: JobStatus;
  filename: string;
  content_type?: string | null;
  size_bytes?: number | null;
  duration_sec?: number | null;
  language?: string;
  model?: string;
  /** Kullanıcının verdiği kayıt bağlamı (konu, özel isimler); modele ipucu. */
  context?: string | null;
  /** Bloke edilen / düşülen kredi; iş başarısız olursa `refunded` true olur. */
  credits_cost?: number;
  refunded?: boolean;
  text_preview?: string | null;
  detected_language?: string | null;
  error?: string | null;
  progress?: number | null;
  created_at?: DateLike;
  started_at?: DateLike;
  finished_at?: DateLike;
}

export type CreditTxType =
  | "admin_grant"
  | "signup_bonus"
  | "job_hold"
  | "job_refund"
  | "job_adjust"
  | "subscription_grant"
  | "subscription_expire"
  | "topup_purchase";

export interface CreditTransaction {
  id: string;
  uid: string;
  type: CreditTxType;
  amount: number;
  balance_after: number;
  job_id?: string | null;
  admin_uid?: string | null;
  note?: string | null;
  created_at?: DateLike;
}

export interface AdminUser extends UserProfile {
  job_count?: number;
}

export interface Paginated<T> {
  items: T[];
  next_cursor?: string | null;
}

export interface SignUploadResponse {
  upload_url: string;
  object_path: string;
  /** Signed URL bu başlıklarla imzalandıysa PUT'ta aynen gönderilmeli. */
  headers?: Record<string, string>;
}

export interface EstimateResponse {
  duration_sec: number;
  credits: number;
}

export interface TranscriptSegment {
  id?: number;
  start: number;
  end: number;
  text: string;
  /** Yalnızca Gemini işlerinde: "Danışman", "Danışan", "Konuşmacı 1"… */
  speaker?: string | null;
}

export interface TranscriptJson {
  text?: string;
  language?: string;
  /** Gemini işlerinde null. */
  language_probability?: number | null;
  duration?: number;
  segments: TranscriptSegment[];
}
