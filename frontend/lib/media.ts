import type { Pricing } from "./types";
import { ACCEPTED_EXTENSIONS } from "./constants";

/** Tarayıcıda dosyanın süresini ölçer (metadata okunamazsa null). */
export function getMediaDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    el.preload = "metadata";
    const done = (v: number | null) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      el.removeAttribute("src");
      resolve(v);
    };
    const timer = setTimeout(() => done(null), 10_000);
    el.onloadedmetadata = () => done(isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

export function estimateCredits(durationSec: number, pricing: Pricing, model: string): number {
  const mult = pricing.model_multipliers[model] ?? 1;
  return Math.max(1, Math.ceil((durationSec / 60) * pricing.credits_per_minute * mult));
}

export function fileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function isAcceptedFile(name: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}

export function guessMime(file: File): string {
  if (file.type) return file.type;
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
    ogg: "audio/ogg",
    flac: "audio/flac",
    webm: "audio/webm",
    mp4: "video/mp4",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
  };
  return map[fileExtension(file.name)] ?? "application/octet-stream";
}

/** Signed URL'e PUT; fetch yükleme ilerlemesi veremediği için XHR kullanılıyor. */
export function uploadWithProgress(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (pct: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Yükleme başarısız (HTTP ${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Yükleme sırasında bağlantı koptu."));
    xhr.onabort = () => reject(new DOMException("Yükleme iptal edildi.", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/**
 * Bu oturumda yüklenen dosyaların yerel önizleme adresleri; iş detayındaki
 * oynatıcı sunucudan kaynak URL'i beklemeden açılabilsin diye tutulur.
 */
const localMedia = new Map<string, { url: string; isVideo: boolean }>();

export function rememberLocalMedia(jobId: string, file: File) {
  localMedia.set(jobId, {
    url: URL.createObjectURL(file),
    isVideo: file.type.startsWith("video"),
  });
}

export function getLocalMedia(jobId: string) {
  return localMedia.get(jobId);
}
