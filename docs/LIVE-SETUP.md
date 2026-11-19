# Siaran langsung dan replay 7 hari

Implementasi tetap lokal sampai pemilik menjalankan deploy. Tidak diperlukan akun Cloudflare/Neon untuk mencoba emulator lokal.

## Alur

1. Host memilih kategori dan daftar, lalu menekan **Bagikan siaran → Buat link tontonan**.
2. Satu link untuk satu proses. Daftar dikunci. Host membagikan URL /#watch/<id>; token pengirim tidak dimasukkan ke URL.
3. Penonton menerima gerakan yang benar-benar terjadi lewat WebSocket. Rekaman menyimpan pose karakter, kamera, sorotan, posisi daftar Pilihan, dan hasil. Ini rekaman simulasi, bukan video atau undian ulang. Konfeti/audio dekoratif tidak direkam.
4. Penonton yang masuk saat proses berlangsung mengikuti posisi terbaru. Setelah selesai, link mulai replay dari awal. Penonton dapat jeda, menggeser waktu, putar ulang, atau memakai kamera bebas; tidak dapat mengubah peserta/hasil.
5. Umur link **7 × 24 jam sejak dibuat**. Semua endpoint menolak sesi kedaluwarsa dengan HTTP 410; halaman permohonan maaf menggantikan arena.

Tab host harus tetap terbuka. Koneksi singkat yang terputus dicoba ulang dengan nomor paket yang sama. Menutup/reload tab host menghentikan perekaman; token hanya berada di memori dan sesi tidak dapat dilanjutkan. Bagian yang sudah tersimpan tetap dapat ditonton. Belum ada pembuktian fairness kriptografis terhadap host yang memodifikasi aplikasi.

## Layanan

| Layanan | Peran |
|---|---|
| Frontend Vercel | Hosting SPA React + Three.js + Tailwind CSS |
| Cloudflare Worker | Validasi pembuatan link, API Gateway, CORS whitelist, Cron pembersihan |
| SQLite Durable Object per sesi | Urutan paket, WebSocket Hibernation, koordinasi broadcast langsung |
| Neon Postgres via HTTP driver | Penyimpanan konfigurasi room & chunks frame rekaman 7 hari (hard-delete CASCADE) |
| Cloudflare Turnstile (Opsional) | Anti-bot pada pembuatan room publik |

Batas resmi:
- Workers Free: 100.000 request/hari, CPU 10 ms/invocation. Durable Objects SQLite & WebSocket Hibernation menjaga memori tetap hemat saat idle.
- Neon Free: Storage & transfer hemat berkat batas 1 MB per rekaman dan pembersihan otomatis setelah 7 hari.

## Batas versi awal

- Lokal biasa: hingga 30 kotak kelompok/topik, daftar peserta tidak diberi batas baru.
- Siaran: maksimal 200 karakter, 3 menit, **1 MB/sesi**, 100 koneksi penonton serentak/sesi.
- Pose 3–4 kali/detik dengan interpolasi, presisi koordinat 2 desimal (~1 cm).
- Paket langsung ke penonton via WebSocket; Neon dibaca saat penonton baru/reconnect/replay, bukan per penonton per frame.
- Jika batas durasi/ukuran 1 MB habis, rekaman berhenti dengan anggun sebagai rekaman parsial. Proses lokal tetap berjalan lancar.
- Belum load test produksi/SLA. Ukur CPU Worker/DO, koneksi, dan database sebelum menaikkan batas.

## Lokal

~~~sh
npm install
cp .dev.vars.example .dev.vars
npm run build
npm run dev:live
~~~

Terminal kedua:

~~~sh
npm run dev
~~~

Buka http://localhost:5173. Vite meneruskan /api dan WebSocket ke 127.0.0.1:8787. Jika port Vite berubah, sesuaikan APP_ORIGIN di .dev.vars lalu restart layanan live.

LOCAL_MODE=true memakai storage Durable Object lokal untuk metadata dan paket. Tidak menghubungi Neon/Turnstile. Data emulator di .wrangler/ diabaikan Git. Jangan pakai mode ini di deployment.

~~~sh
LIVE_TEST_URL=http://127.0.0.1:8787 node --test tests/live-api.test.js
npm test
npm run deploy:check
~~~

deploy:check hanya memeriksa bundel, tidak deploy.

## Siapkan Neon

1. Buat project Neon dan database aplikasi, pilih region dekat mayoritas pengguna.
2. Jalankan server/migrations/001_live_rooms.sql di SQL Editor Neon, atau:
   ~~~sh
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f server/migrations/001_live_rooms.sql
   ~~~
3. Siapkan role aplikasi terpisah dengan SELECT/INSERT/UPDATE/DELETE pada live_rooms dan live_chunks. Role pemilik hanya untuk migrasi.
4. Connection string role aplikasi menjadi **secret Worker**, bukan variabel VITE_*.
5. Atur history window/backup sesuai retensi. DELETE menghapus baris aktif dan tabel anak melalui cascade; tidak menjanjikan penghapusan fisik seketika dari WAL, snapshot, backup, atau salinan penonton.

## Siapkan Cloudflare

1. Akun Workers Free dengan SQLite Durable Objects dan hostname tujuan (workers.dev/domain sendiri).
2. Buat Turnstile widget untuk hostname tersebut. Public site key di .env.local:
   ~~~
   VITE_TURNSTILE_SITE_KEY=<public-site-key>
   ~~~
3. Ubah name dan vars.APP_ORIGIN di wrangler.jsonc ke Worker/origin HTTPS sebenarnya. LOCAL_MODE harus **false**.
4. Login dan isi secret dari terminal Anda:
   ~~~sh
   npx wrangler login
   npx wrangler secret put DATABASE_URL
   npx wrangler secret put TURNSTILE_SECRET
   ~~~
5. Setelah siap mempublikasikan:
   ~~~sh
   npm run build
   npx wrangler deploy
   ~~~
   Migrasi SQLite DO v1 otomatis lewat Wrangler; migrasi Neon terpisah.
6. Verifikasi dari perangkat lain, replay, dan kedaluwarsa. Cron lima-menitan sudah dikonfigurasi.

Jangan kirim connection string/token akun melalui chat atau menyimpannya di repository.

## Retensi dan kegagalan

Alarm DO dijadwalkan pada expiresAt. Alarm menghapus baris Neon (cascade paket), menutup WebSocket, lalu menghapus storage DO. Alarm bisa terlambat atau retry saat gagal; semua pembacaan tetap memeriksa waktu kedaluwarsa. Cron lima-menitan menghapus baris Neon yang tertinggal. Tidak ada soft-delete.

Jika Neon gagal, paket tidak diakui sampai database mengonfirmasi. Host mencoba ulang. Jika penyimpanan berhasil tetapi respons hilang, digest/nomor paket mencegah pencatatan ganda. Paket final membuat sesi immutable. Token host acak 256-bit disimpan sebagai SHA-256; ID URL penonton acak 128-bit.

Link memakai kepemilikan URL, bukan autentikasi identitas. Nama daftar dapat dibaca pemegang link. Informasi ini tampil sebelum host membuat link. Acara dengan data rahasia memerlukan autentikasi peserta tambahan.
