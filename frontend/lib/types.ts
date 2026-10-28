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

export interface UserProfile {
  uid: string;
  email: string;
  display_name?: string | null;
  credits_balance: number;
  is_admin?: boolean | null;
  /** Owner: krediyi doğrudan yükleyebilen ve fiyatı değiştirebilen tek rol. */
  is_owner?: boolean | null;
  created_at?: DateLike;
  disabled?: boolean;
  /** Kullanıcının onayladığı ve güncel yasal metin sürümü; farklıysa yeniden onay istenir. */
  accepted_terms_version?: string | null;
  terms_version?: string | null;
}

export interface Pricing {
  credits_per_minute: number;
  model_multipliers: Record<string, number>;
  max_duration_sec: number;
  max_file_mb: number;
  /** GET /pricing: kullanılabilir modeller (ör. ["gemini", "turbo", "large-v3"]). */
  models?: string[];
  /** GET /pricing: ucuzdan pahalıya sıralı model kartları; ad/açıklama/fiyat buradan. */
  model_details?: ModelDetail[];
  default_model?: string;
  allowed_extensions?: string[];
  /** Lisans anahtarı olarak satılan tek seferlik kredi paketleri (ucuzdan pahalıya). */
  packages?: CreditPackage[];
  /** Yalnızca /admin/pricing: model başına 1M token USD fiyatı */
  model_costs?: Record<string, ModelCost>;
  /** Yalnızca /admin/pricing: maliyet raporunda kullanılan USD→TL kuru */
  usd_try?: number;
  /** Yalnızca /admin/pricing: owner olmayan adminin 24 saatte anahtarla verebileceği kredi */
  admin_daily_key_credits?: number;
}

export interface ModelCost {
  input_usd_per_m: number;
  /** Düşünme token'ları da bu fiyattan */
  output_usd_per_m: number;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  /** KDV dahil TL; yalnızca gösterim, ödeme elle alınır */
  price_try: number;
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
  /** Modelin [anlaşılmıyor] yazdığı yer sayısı ve kullanıcının doldurduğu; eski işlerde yok. */
  unclear_count?: number | null;
  unclear_resolved?: number;
}

export interface UnclearSpot {
  /** "<segment>-<segmentteki sırası>"; orijinal transkripte göre sabit */
  id: string;
  segment_id: number;
  start: number;
  end: number;
  /** Oynatılacak aralık: zaman damgaları kayabildiği için segmentten biraz geniş */
  play_start: number;
  play_end: number;
  speaker: string | null;
  /** Segmentin orijinal metni ([anlaşılmıyor] dahil) */
  text: string;
  before: string | null;
  after: string | null;
  correction: string | null;
}

export interface UnclearResponse {
  total: number;
  resolved: number;
  spots: UnclearSpot[];
  /** Kaynak ses; yükleme 7 gün sonra silinince null */
  media: { url: string; content_type: string | null; expires_at: string } | null;
  /** Bu tarihten sonra düzeltme kaydedilemez */
  editable_until: string | null;
}

export type CreditTxType =
  | "admin_grant"
  | "license_key"
  /** Kaldırılan kayıt bonusu; eski hesapların geçmişinde görünür */
  | "signup_bonus"
  | "job_hold"
  | "job_refund";

export interface LicenseKey {
  /** BUS-XXXX-XXXX-XXXX */
  key: string;
  credits: number;
  /** Üretilirken seçilen paketin adı; özel anahtarda yok */
  package?: string | null;
  status: "active" | "redeemed" | "revoked";
  /** Yöneticinin notu (müşteri adı, sipariş) */
  note?: string | null;
  created_at?: DateLike;
  created_by?: string | null;
  created_by_email?: string | null;
  redeemed_by?: string | null;
  redeemed_email?: string | null;
  redeemed_at?: DateLike;
}

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

export interface UserCost {
  uid: string;
  email?: string | null;
  credits_balance: number;
  jobs: number;
  completed_jobs: number;
  minutes: number;
  credits_spent: number;
  input_tokens: number;
  /** Düşünme dahil */
  output_tokens: number;
  cost_usd: number;
  cost_try: number;
  /** Token kaydı başlamadan önce tamamlanmış işler (maliyete dahil değil) */
  untracked_jobs: number;
  /** Bakiye tamamen Argon'la harcanırsa tahmini maliyet */
  balance_risk_usd?: number | null;
}

export interface CostReport {
  since: DateLike;
  usd_try: number;
  total_cost_usd: number;
  total_cost_try: number;
  total_balance_risk_usd?: number | null;
  model_usd_per_minute: Record<string, number>;
  users: UserCost[];
}

export interface CreditLogEntry {
  id: string;
  created_at?: DateLike;
  uid: string;
  email?: string | null;
  amount: number;
  balance_after: number;
  admin_uid?: string | null;
  admin_email?: string | null;
  note?: string | null;
}
