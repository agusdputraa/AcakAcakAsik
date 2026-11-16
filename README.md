# Acak Acak Asik

Developed by Agus Dzuriana.

Source ekspor versi website dengan kategori Single, Grup, Urutan; kamera bebas dan mengikuti peserta; sidebar desktop; serta selebrasi finis.

## Menjalankan lokal

Gunakan Node.js 22.12+ (atau Node 24 LTS) dan npm.

```bash
cd Acak_Acak_Asik
npm ci
npm run dev
```

Buka alamat Local yang dicetak Vite (biasanya http://localhost:5173).
Jangan membuka index.html langsung. Instalasi awal memerlukan internet.
Tidak memerlukan akun ChatGPT, API key, atau backend untuk menjalankan aplikasi lokal.
Data peserta tersimpan di localStorage browser. Data dari situs online tidak otomatis berpindah ke localhost.

## Build dan pengujian

```bash
npm run build
npm run preview
node --test tests/*.test.js
```

## Struktur

- src/components/arena/: komponen UI fitur dan panel.
- src/components/ui/: komponen shadcn/ui.
- src/engine/characters/character.js: model dan animasi karakter yang digunakan ulang.
- src/engine/: Three.js, simulasi, kamera, suara, dan penyimpanan lokal.
- src/styles/app.css: tema dan layout.
- public/: aset statis.
- tests/: tes kamera, peserta, dan balapan.

React mengurus UI; Three.js mengurus scene dan animasi tanpa render React setiap frame.
Browser tanpa WebGL menggunakan grafik sederhana. Gunakan browser dengan WebGL untuk tampilan 3D penuh.

ZIP menyertakan source dan package-lock.json. node_modules, hasil build, riwayat Git, serta konfigurasi hosting ChatGPT tidak disertakan.

Source commit: 0b1d97ab44a9c18175c29986a3a8c9eb88c5fe3e
