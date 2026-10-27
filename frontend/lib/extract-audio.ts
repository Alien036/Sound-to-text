"use client";

import type { FFFSType, FFmpeg } from "@ffmpeg/ffmpeg";

/**
 * Yüklemeyi hızlandırmak için büyük dosyaların sesini tarayıcıda ayırır (ffmpeg.wasm).
 *
 * Kazanç görüntüyü atmaktan gelir, bit hızını düşürmekten değil. Bu yüzden ses izi
 * mümkünse yeniden kodlanmadan kopyalanır (kayıpsız, birkaç saniye); olmazsa Whisper'ın
 * çalıştığı 16 kHz mono'da Opus 48 kbps'e kodlanır. Gürültü azaltma / normalizasyon
 * yapılmaz, sunucu Whisper'a uygun normalizasyonu kendisi yapıyor.
 *
 * Kaynak dosya belleğe alınmaz; WORKERFS ile parça parça okunur, GB'larca dosya işlenebilir.
 */

// Tek iş parçacıklı çekirdek, sitenin kendisinden (scripts/copy-ffmpeg.mjs). core-mt'nin
// istediği COOP/COEP başlıkları Firebase'in Google giriş popup'ını bozardı.
const CORE_PATH = "/ffmpeg";

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|opus|flac|wav)$/i;
const WAV_EXT = /\.wav$/i;
const BIG = 100 * 1024 * 1024;

/** ffmpeg codec adı → kopyalanınca kullanılacak kap. */
const COPY_TARGETS: Record<string, { ext: string; mime: string }> = {
  aac: { ext: "m4a", mime: "audio/mp4" },
  mp3: { ext: "mp3", mime: "audio/mpeg" },
  opus: { ext: "ogg", mime: "audio/ogg" },
  vorbis: { ext: "ogg", mime: "audio/ogg" },
  flac: { ext: "flac", mime: "audio/flac" },
};

/**
 * Dönüştürme gerekiyor mu?
 * - Ses: yalnızca 100 MB üstü WAV (Opus'a kodlanır); diğerleri olduğu gibi gider.
 * - Video: 100 MB üstü; altı olduğu gibi gider (ffmpeg'i indirmeye değmez).
 */
export function needsPreparation(file: File): boolean {
  if (AUDIO_EXT.test(file.name)) return WAV_EXT.test(file.name) && file.size > BIG;
  return file.size > BIG;
}

let instance: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  instance ??= (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ff = new FFmpeg();
    // Worker /_next/static altında çalıştığı için adresler mutlak verilir.
    const base = new URL(CORE_PATH, window.location.origin).href;
    await ff.load({ coreURL: `${base}/ffmpeg-core.js`, wasmURL: `${base}/ffmpeg-core.wasm` });
    return ff;
  })();
  instance.catch(() => {
    instance = null;
  });
  return instance;
}

/** ffmpeg yüklenemedi (ör. /ffmpeg/ 404): çağıran orijinal dosyayı yükleyebilir. */
export class FFmpegUnavailableError extends Error {}

/** Dosyada ses izi yok: yüklemenin anlamı yok. */
export class NoAudioError extends Error {}

export type PreparePhase = "loading" | "copying" | "encoding";

const abortError = () => new DOMException("İptal edildi.", "AbortError");

/** Yüklenecek dosyayı döner: gerekmiyorsa orijinal dosya, gerekiyorsa ayrılmış ses. */
export async function prepareForUpload(
  file: File,
  opts: {
    durationSec?: number | null;
    onPhase?: (p: PreparePhase) => void;
    onProgress?: (pct: number) => void;
    signal?: AbortSignal;
  } = {},
): Promise<File> {
  if (!needsPreparation(file)) return file;

  const { durationSec, onPhase, onProgress, signal } = opts;
  if (signal?.aborted) throw abortError();

  onPhase?.("loading");
  let ff: FFmpeg;
  try {
    ff = await getFFmpeg();
  } catch {
    throw new FFmpegUnavailableError("Ses işleyici yüklenemedi.");
  }
  if (signal?.aborted) throw abortError();

  const stamp = Date.now();
  const dir = `/in-${stamp}`;
  const input = `${dir}/${file.name}`;
  const stem = file.name.replace(/\.[^.]+$/, "");
  const outputs: string[] = [];

  let log = "";
  // ffmpeg ilerlemeyi "time=00:12:34.56" satırlarıyla verir; `progress` olayı
  // yalnızca-ses çıktısında ve kopyalamada güvenilir değil.
  const onLog = ({ message }: { message: string }) => {
    log += message + "\n";
    const m = /time=(\d+):(\d+):(\d+\.?\d*)/.exec(message);
    if (m && durationSec) {
      const t = +m[1] * 3600 + +m[2] * 60 + +m[3];
      onProgress?.(Math.min(99, Math.round((t / durationSec) * 100)));
    }
  };

  // wasm çalışırken durdurmanın tek yolu worker'ı sonlandırmak.
  const onAbort = () => {
    ff.terminate();
    instance = null;
  };
  signal?.addEventListener("abort", onAbort);
  ff.on("log", onLog);

  const run = async (args: string[]) => {
    const code = await ff.exec(["-hide_banner", "-y", ...args]);
    if (signal?.aborted) throw abortError();
    return code;
  };

  try {
    await ff.createDir(dir);
    // FFFSType çalışma anında düz string; enum için paketi ayrıca import etmeye gerek yok.
    await ff.mount("WORKERFS" as unknown as FFFSType, { files: [file] }, dir);

    // 1) Ses codec'ini öğren. Çıktısız çalıştırma hata kodu döner, bu normal.
    log = "";
    await run(["-i", input]);
    if (!/Stream #\d+:\d+.*: Audio:/.test(log)) throw new NoAudioError("Bu dosyada ses kanalı bulunamadı.");
    const codec = /Audio:\s*(\w+)/.exec(log)?.[1];

    // 2) Kopyalanabiliyorsa yeniden kodlamadan kopyala (kayıpsız, hızlı).
    const target = codec && !WAV_EXT.test(file.name) ? COPY_TARGETS[codec] : undefined;
    if (target) {
      onPhase?.("copying");
      onProgress?.(0);
      const out = `/out-${stamp}.${target.ext}`;
      outputs.push(out);
      if ((await run(["-i", input, "-map", "0:a:0", "-vn", "-sn", "-dn", "-c:a", "copy", out])) === 0) {
        return await finish(out, `${stem}.${target.ext}`, target.mime);
      }
    }

    // 3) Değilse Opus 48 kbps, 16 kHz mono (Whisper bu çözünürlükte çalışıyor).
    onPhase?.("encoding");
    onProgress?.(0);
    const out = `/out-${stamp}.ogg`;
    outputs.push(out);
    const code = await run([
      "-i", input,
      "-map", "0:a:0", "-vn", "-sn", "-dn",
      "-ac", "1", "-ar", "16000",
      "-c:a", "libopus", "-b:a", "48k",
      out,
    ]);
    if (code !== 0) throw new Error("Ses ayrıştırılamadı; dosya bozuk ya da desteklenmiyor olabilir.");
    return await finish(out, `${stem}.ogg`, "audio/ogg");
  } catch (e) {
    if (signal?.aborted) throw abortError();
    throw e;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (!signal?.aborted) {
      ff.off("log", onLog);
      for (const o of outputs) await ff.deleteFile(o).catch(() => {});
      await ff.unmount(dir).catch(() => {});
      await ff.deleteDir(dir).catch(() => {});
    }
  }

  async function finish(path: string, name: string, type: string) {
    const data = (await ff.readFile(path)) as Uint8Array;
    onProgress?.(100);
    return new File([data as BlobPart], name, { type });
  }
}
