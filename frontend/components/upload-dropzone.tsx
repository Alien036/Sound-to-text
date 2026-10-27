"use client";

import { UploadCloud } from "lucide-react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { toast } from "sonner";
import { ACCEPT_MAP, ACCEPTED_EXTENSIONS } from "@/lib/constants";
import { isAcceptedFile } from "@/lib/media";
import { cn } from "@/lib/utils";

// Boyut sınırı burada uygulanmaz: büyük dosyaların sesi tarayıcıda ayrılıp
// küçültüldüğü için sınır, yüklenecek son dosyaya upload sayfasında bakılır.
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
      // Bazı tarayıcılar MIME türünü boş bırakır; uzantıyla da kontrol et.
      if (!isAcceptedFile(file.name)) {
        toast.error("Bu dosya türü desteklenmiyor.");
        return;
      }
      onFile(file);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors",
        compact ? "px-6 py-8" : "px-6 py-16",
        isDragActive
          ? "border-brand-400 bg-brand-50"
          : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input {...getInputProps()} />
      <div
        className={cn(
          "grid size-12 place-items-center rounded-2xl transition-colors",
          isDragActive ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-500 group-hover:bg-brand-100",
        )}
      >
        <UploadCloud className="size-5" />
      </div>
      <p className="mt-4 font-medium text-ink-900">
        {isDragActive ? "Bırakın, gerisini biz halledelim" : "Dosyanızı sürükleyin ya da seçin"}
      </p>
      <p className="mt-1 text-sm text-ink-500">
        {ACCEPTED_EXTENSIONS.map((e) => e.toUpperCase()).join(", ")}
      </p>
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
