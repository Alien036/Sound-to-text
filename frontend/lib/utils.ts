import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DateLike } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDate(v: DateLike): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if ("toDate" in v && typeof v.toDate === "function") return v.toDate();
  if ("seconds" in v) return new Date(v.seconds * 1000);
  if ("_seconds" in v) return new Date(v._seconds * 1000);
  return null;
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(v: DateLike): string {
  const d = toDate(v);
  return d ? dateFmt.format(d) : "—";
}

const dayFmt = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });

export function formatDay(v: DateLike): string {
  const d = toDate(v);
  return d ? dayFmt.format(d) : "—";
}

export function formatRelative(v: DateLike): string {
  const d = toDate(v);
  if (!d) return "—";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} gün önce`;
  return formatDate(d);
}

/** 3725 → "1:02:05", 65 → "1:05" */
export function formatDuration(sec?: number | null): string {
  if (sec == null || !isFinite(sec)) return "—";
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

export function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatCredits(n?: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("tr-TR").format(n);
}
