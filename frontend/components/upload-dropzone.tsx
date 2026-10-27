"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { ACCEPT_MAP, ACCEPTED_EXTENSIONS } from "@/lib/constants";
import { isAcceptedFile } from "@/lib/media";
import { cn } from "@/lib/utils";
import { motion, SPRING_SNAPPY } from "./ui/motion";

export function UploadDropzone({
  onFile,
  compact,
  disabled,
}: {
  onFile: (file: File) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPT_MAP,
    multiple: false,
    disabled,
    onDrop: (accepted: File[], rejected: FileRejection[]) => {
      if (rejected.length) {
        toast.error("Bu dosya türü desteklenmiyor.");
        return;
      }
      const file = accepted[0];
      if (!file) return;
      if (!isAcceptedFile(file.name)) {
        toast.error("Bu dosya türü desteklenmiyor.");
        return;
      }
      onFile(file);
    },
  });

  const rootProps = getRootProps({
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
    },
  });

  return (
    <div
      {...rootProps}
      className={cn(
        "card-spotlight group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed text-center transition-all duration-300",
        compact ? "px-6 py-8" : "px-6 py-16",
        isDragActive
          ? " scale-[1.01] border-brand-500 bg-brand-50/70 shadow-lg shadow-brand-500/10"
          : "border-ink-200/80 bg-white/80 hover:border-brand-300 hover:bg-brand-50/25 hover:shadow-md hover:shadow-ink-900/5",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input {...getInputProps()} />

      <motion.div
        animate={isDragActive ? { scale: 1.12, y: -4 } : { scale: 1, y: 0 }}
        transition={SPRING_SNAPPY}
        className="relative grid place-items-center"
      >
        {isDragActive && (
          <span className="absolute size-14 animate-pulse-ring rounded-2xl bg-brand-400/40" />
        )}
        <div
          className={cn(
            "relative grid size-13 place-items-center rounded-2xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-105",
            isDragActive
              ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
              : "bg-brand-50 text-brand-500 ring-8 ring-brand-50/50 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-brand-500/25",
          )}
        >
          <UploadCloud className="size-5.5" />
        </div>
      </motion.div>

      <p className="mt-4 font-medium text-ink-900">
        {isDragActive ? "Dosyayı buraya bırakın" : "Dosyanızı sürükleyin ya da seçin"}
      </p>

      <div className="mt-2.5 flex flex-wrap justify-center gap-1">
        {ACCEPTED_EXTENSIONS.slice(0, 6).map((e) => (
          <span
            key={e}
            className="rounded-md bg-ink-100/70 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase text-ink-500 transition-colors group-hover:bg-brand-50 group-hover:text-brand-600"
          >
            {e}
          </span>
        ))}
        {ACCEPTED_EXTENSIONS.length > 6 && (
          <span className="rounded-md bg-ink-100/70 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink-400">
            +{ACCEPTED_EXTENSIONS.length - 6}
          </span>
        )}
      </div>
    </div>
  );
}

/** Genel bakıştaki hızlı yüklemeden /upload sayfasına dosya aktarmak için. */
let pendingFile: File | null = null;
export function setPendingFile(f: File) {
  pendingFile = f;
}
export function takePendingFile() {
  const f = pendingFile;
  pendingFile = null;
  return f;
}
