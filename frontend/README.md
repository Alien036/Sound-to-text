# Etheria — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind v4. Firebase Auth ile giriş, Firestore'dan canlı bakiye/iş durumu, FastAPI backend ile REST.

## Çalıştırma

```bash
cp .env.example .env.local   # değerleri doldurun
npm install
npm run dev                  # http://localhost:3000
```

Lokal geliştirmede Firebase Emulator kullanmak için `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` (Auth :9099, Firestore :8080).

## Renkler

| Token | Renk | Kullanım |
|---|---|---|
| `ink` | `#16163F` | metin, yan menü, koyu kartlar |
| `brand` | `#5B5BD6` | birincil butonlar, vurgular, ilerleme |
| `accent` | `#FF7A59` | uyarı, hata, düşük bakiye |

Tanımlar `app/globals.css` içindeki `@theme` bloğunda.

## Büyük dosyalar: tarayıcıda ses ayrıştırma

Kazanç görüntüyü atmaktan gelir, bit hızını düşürmekten değil. Karar akışı ([lib/extract-audio.ts](lib/extract-audio.ts)):

```
Ses dosyası:  100 MB üstü WAV → Opus'a kodla · diğerleri → olduğu gibi yükle
Video:        ≤ 100 MB → olduğu gibi yükle
              > 100 MB → ses izini KOPYALA (-c:a copy, kayıpsız)
                         olmazsa → Opus 48 kbps, 16 kHz mono
                         ffmpeg yüklenemezse → orijinal video (max_file_mb altındaysa)
Ses izi yok → kullanıcıya hata, yükleme yapılmaz
```

| Kaynak ses | Çıktı |
|---|---|
| AAC (iPhone `.mov`, Android `.mp4`) | `.m4a` kopya |
| Opus / Vorbis (`.webm`, `.mkv`) | `.ogg` kopya |
| MP3 / FLAC | `.mp3` / `.flac` kopya |
| PCM ve diğerleri | `.ogg` Opus 48 kbps |

- Kaynak dosya belleğe alınmaz, `WORKERFS` ile parça parça okunur; GB'larca video işlenebilir.
- Gürültü azaltma / normalizasyon yapılmaz (sunucu yapıyor), bit hızı 48 kbps'nin altına inmez.
- Sunucuya ayrılan ses gider; işin `filename` alanında orijinal dosya adı tutulur.
- ffmpeg çekirdeği (~30 MB, **tek iş parçacıklı UMD** sürümü) `npm run dev` / `npm run build` öncesinde `scripts/copy-ffmpeg.mjs` ile `public/ffmpeg/`'e kopyalanır; CDN'e bağımlılık yok. UMD seçildi çünkü webpack ffmpeg worker'ını klasik worker olarak paketliyor ve klasik worker ESM çekirdeği yükleyemez. Tek iş parçacıklı sürüm COOP/COEP başlığı gerektirmez, Google giriş popup'ı bozulmaz.

## Fiyatlandırma modeli

Ücretsiz paket yok; kayıtta yalnızca `signup_bonus` kadar (5 dk) deneme kredisi.

| | Fiyat (KDV dahil) | Kredi | Kâr çarpanı* |
|---|---|---|---|
| Pro | 250 TL / ay | 400 dk / ay | ~6,0× |
| Ek paket | 60 TL | +100 dk | ~5,8× |

\* Net gelir (KDV %20 ve ~%4 komisyon düşülmüş) ÷ en kötü durum GPU maliyeti (0,083 TL/dk varsayımı). Gerçek maliyet ölçülünce admin → Fiyatlandırma'dan `gpu_cost_per_minute_try` güncellenir; çarpan 5×'in altına düşerse sayfa uyarır.

Backend'den beklenen ek alanlar:
- `config/pricing`: `plan_price_try, plan_monthly_credits, topup_credits, topup_price_try, gpu_cost_per_minute_try` (eksikse frontend varsayılanları kullanır).
- `users/{uid}.subscription`: `{ plan: "pro", status: "active"|"canceled"|"expired", current_period_end, period_credits, period_used }`.
- Her dönem başında `subscription_grant` (+400). Harcamada önce aylık krediler kullanılır. Dönem sonunda kullanılmayan aylık kredi `subscription_expire` ile silinir; ek paket (`topup_purchase`) kredisi kalır.
- Ödeme gelene kadar: `POST /admin/users/{uid}/subscription` `{ plan: "pro" | null }` ile yönetici Pro'yu elle başlatır/iptal eder.

## Backend'den beklenenler

- Tüm istekler `Authorization: Bearer <Firebase ID token>` ile gider.
- Liste uç noktaları (`/jobs`, `/credits/transactions`, `/admin/users`, `/admin/jobs`) ya dizi ya da `{ items, next_cursor }` dönebilir.
- `POST /uploads/sign` → `{ upload_url, object_path, headers? }`. `headers` verilmezse PUT `Content-Type: <mime>` ile yapılır.
- `GET /jobs/{id}/download?format=json` dosyası `{ segments: [{ start, end, text }] }` biçiminde olmalı; tarayıcı bu dosyayı doğrudan GCS'ten okur, bu yüzden bucket CORS'unda frontend domainine **GET** izni de gerekir.
- İsteğe bağlı: `/me` cevabında `pricing` alanı (yoksa varsayılan 1 kredi/dk kullanılır), `format=source` ile orijinal medya URL'i (yoksa oynatıcı yalnızca aynı oturumda yüklenen dosya için görünür).
- `jobs.progress` 0–1 ya da 0–100 olabilir.
- Admin sayfaları ID token'daki `admin: true` claim'ine göre açılır.

## Deploy (Cloud Run)

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://stt-api-xxxx.run.app \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=... \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=... \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID=... \
  -t REGION-docker.pkg.dev/PROJECT/stt/frontend .
docker push REGION-docker.pkg.dev/PROJECT/stt/frontend
gcloud run deploy stt-frontend --image REGION-docker.pkg.dev/PROJECT/stt/frontend \
  --region europe-west1 --allow-unauthenticated
```
