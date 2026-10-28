import { auth } from "./firebase";
import type {
  AdminUser,
  CreditTransaction,
  EstimateResponse,
  Job,
  JobStatus,
  LicenseKey,
  CostReport,
  CreditLogEntry,
  MeResponse,
  Paginated,
  Pricing,
  ResultFormat,
  SignUploadResponse,
  UnclearResponse,
} from "./types";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "İstek geçersiz.",
  401: "Oturumunuzun süresi doldu, lütfen tekrar giriş yapın.",
  402: "Krediniz bu işlem için yetersiz.",
  403: "Bu işlem için yetkiniz yok.",
  404: "Kayıt bulunamadı.",
  413: "Dosya çok büyük.",
  415: "Bu dosya türü desteklenmiyor.",
  422: "Gönderilen bilgiler geçersiz.",
  429: "Çok fazla istek gönderildi, biraz bekleyin.",
};

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  // FastAPI doğrulama hataları: [{ msg, loc }]
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return undefined;
}

type Query = Record<string, string | number | boolean | null | undefined>;

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; query?: Query } = {},
): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  const user = auth.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.");
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!res.ok) {
    const msg =
      extractMessage(body) ?? STATUS_MESSAGES[res.status] ?? "Beklenmeyen bir hata oluştu.";
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

/** Liste uç noktaları dizi ya da {items, next_cursor} dönebilir; ikisini de kabul et. */
function toPage<T>(res: unknown, key: string): Paginated<T> {
  if (Array.isArray(res)) return { items: res as T[] };
  const obj = (res ?? {}) as Record<string, unknown>;
  const items = (obj.items ?? obj[key] ?? []) as T[];
  return { items, next_cursor: (obj.next_cursor as string | null | undefined) ?? null };
}

export const api = {
  me: () => request<MeResponse>("GET", "/me"),

  /** Yasal metin onayı; backend sürüm, zaman ve IP ile ispat kaydı tutar. */
  acceptTerms: (version: string) => request<MeResponse>("POST", "/me/terms", { body: { version } }),

  /** Lisans anahtarını etkinleştirir; anahtardaki kredi bakiyeye eklenir. */
  redeemLicense: (key: string) =>
    request<{ credits_added: number; credits_balance: number }>("POST", "/me/license", { body: { key } }),

  /** Herkese açık fiyat/limit bilgisi (giriş gerektirmez). */
  pricing: () => request<Partial<Pricing>>("GET", "/pricing"),

  signUpload: (body: { filename: string; content_type: string; size_bytes: number }) =>
    request<SignUploadResponse>("POST", "/uploads/sign", { body }),

  /** Segmentli transkript; API üzerinden geldiği için bucket CORS'una ihtiyaç duymaz. */
  transcript: (id: string) => request<unknown>("GET", `/jobs/${encodeURIComponent(id)}/transcript`),

  estimate: (body: { object_path: string; model: string }) =>
    request<EstimateResponse>("POST", "/jobs/estimate", { body }),

  createJob: (body: {
    object_path: string;
    filename: string;
    language: string;
    model: string;
    context?: string;
  }) =>
    request<Job>("POST", "/jobs", { body }),

  listJobs: async (query: { limit?: number; cursor?: string | null; status?: JobStatus } = {}) =>
    toPage<Job>(await request("GET", "/jobs", { query }), "jobs"),

  getJob: (id: string) => request<Job>("GET", `/jobs/${encodeURIComponent(id)}`),

  downloadUrl: (id: string, format: ResultFormat | "source") =>
    request<{ url: string }>("GET", `/jobs/${encodeURIComponent(id)}/download`, {
      query: { format },
    }),

  /** Modelin [anlaşılmıyor] yazdığı yerler (zaman sırasıyla) ve oynatma adresi. */
  unclear: (id: string) => request<UnclearResponse>("GET", `/jobs/${encodeURIComponent(id)}/unclear`),

  /** Bir yeri doldurur; boş/null düzeltmeyi geri alır. Tüm indirme dosyaları yeniden üretilir. */
  correctUnclear: (id: string, spotId: string, text: string | null) =>
    request<{ total: number; resolved: number }>(
      "PUT",
      `/jobs/${encodeURIComponent(id)}/unclear/${encodeURIComponent(spotId)}`,
      { body: { text } },
    ),

  deleteJob: (id: string) => request<void>("DELETE", `/jobs/${encodeURIComponent(id)}`),

  transactions: async (query: { limit?: number; cursor?: string | null } = {}) =>
    toPage<CreditTransaction>(
      await request("GET", "/credits/transactions", { query }),
      "transactions",
    ),

  admin: {
    users: async (query?: string | { email?: string; limit?: number; cursor?: string | null }) => {
      const q = typeof query === "string" ? { email: query, limit: 100 } : { limit: 100, ...query };
      return toPage<AdminUser>(await request("GET", "/admin/users", { query: q }), "users");
    },
    getUser: (uid: string) =>
      request<AdminUser>("GET", `/admin/users/${encodeURIComponent(uid)}`),
    adjustCredits: (uid: string, body: { amount: number; note?: string }) =>
      request<{ credits_balance: number }>("POST", `/admin/users/${encodeURIComponent(uid)}/credits`, { body }),
    /** Satılacak anahtarları üretir; her biri tek kullanımlık, `credits` kadar yükler. */
    createLicenseKeys: (body: { package?: string; credits?: number; count: number; note?: string }) =>
      request<LicenseKey[]>("POST", "/admin/license-keys", { body }),
    licenseKeys: async (query: { limit?: number; cursor?: string | null } = {}) =>
      toPage<LicenseKey>(await request("GET", "/admin/license-keys", { query }), "keys"),
    /** Yalnızca kullanılmamış anahtar iptal edilebilir. */
    revokeLicenseKey: (key: string) =>
      request<LicenseKey>("DELETE", `/admin/license-keys/${encodeURIComponent(key)}`),
    jobs: async (query: { status?: string; uid?: string; cursor?: string | null } = {}) =>
      toPage<Job>(await request("GET", "/admin/jobs", { query }), "jobs"),
    failJob: (id: string, reason?: string) =>
      request<Job>("POST", `/admin/jobs/${encodeURIComponent(id)}/fail`, {
        body: reason ? { reason } : {},
      }),
    /** Kullanıcı başına Gemini maliyeti (token × fiyat / 1M). */
    costs: (days = 30) => request<CostReport>("GET", "/admin/costs", { query: { days } }),
    /** Elle yapılan bakiye değişiklikleri: kim, kime, ne kadar. */
    creditLog: (limit = 100) => request<CreditLogEntry[]>("GET", "/admin/credit-log", { query: { limit } }),
    getPricing: () => request<Pricing>("GET", "/admin/pricing"),
    updatePricing: (body: Pricing) => request<Pricing>("PUT", "/admin/pricing", { body }),
  },
};

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Beklenmeyen bir hata oluştu.";
}
