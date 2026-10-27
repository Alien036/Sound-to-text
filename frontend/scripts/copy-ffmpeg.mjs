// ffmpeg çekirdeğini node_modules'tan public/ffmpeg'e kopyalar (CDN'e bağımlı kalmamak için).
// UMD sürümü: webpack ffmpeg worker'ını klasik worker olarak paketliyor, o da çekirdeği
// importScripts ile yüklüyor; ESM sürümü klasik worker'da çalışmaz.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/@ffmpeg/core/dist/umd");
const dest = join(root, "public/ffmpeg");

mkdirSync(dest, { recursive: true });
for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) copyFileSync(join(src, f), join(dest, f));
console.log("ffmpeg çekirdeği public/ffmpeg klasörüne kopyalandı");
