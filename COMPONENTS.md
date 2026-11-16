# Arena Acak 3D — komponen dan perilaku

React + Vite mengelola antarmuka shadcn/ui. Three.js mengelola scene dan rig karakter.

## Karakter yang dapat dipanggil ulang

`src/engine/characters/character.js` mengekspor `createCharacter(options)` dan `animateCharacter(parts, phase, moving, running)`.

```js
const character = createCharacter({ shirtColor: 0x3b82f6, skinColor: 0xffdbac, styleSeed: 1 });
scene.add(character.root);
animateCharacter(character, phase, true, false);
```

Factory Three.js ini digunakan bersama oleh peserta dan MC. Referensi kepala, lengan, siku, dan kaki eksplisit; tidak mengandalkan urutan children. UI terpisah dalam `src/components/arena`, termasuk pengaturan mode, daftar peserta, panel kamera, hasil, dan banner orang terpilih.

## Mode dan penyimpanan

- Single: Sorot Lampu atau Dijemput MC.
- Grup: pengacakan seimbang, beberapa tujuan acak lalu kotak akhir; hasil baru dibuka saat seluruh peserta tiba.
- Individu: pemilihan langsung satu orang.
- Urutan: daftar independen, tiga jenis input, 1–10 lap. Konfigurasi disimpan lokal di browser.
- Keluarkan dari daftar bersifat sementara; Reset mengembalikan semua orang yang dikeluarkan. Hapus di tabel tetap menghapus peserta.

## Balapan dan keacakan

`random.js` menggunakan Web Crypto. Semua pelari mendapat distribusi kecepatan yang sama dan undian baru setiap setengah lap dalam setiap balapan. Nama, warna, atau ID tidak memengaruhi kecepatan. Progres dinormalisasi ke panjang sirkuit yang sama untuk menghindari keuntungan dari jalur bagian dalam. Hasil dihitung dari waktu matematis, bukan urutan iterasi atau frame yang merender finis. Seri dipecahkan dengan acak baru.

Kelompok finis ketika anggota terakhir finis. Karena aturan ini, jumlah anggota yang berbeda tidak berarti peluang kelompok sama; kelompok besar menunggu lebih banyak anggota.

Format salin/tempel:

```text
[Kelompok 1]
- Ayu
- Bima

[Kelompok 2]
- Citra
- Dini
```

## Verifikasi

`node --test tests/*.test.js` memeriksa format, jumlah pelari, jumlah lap, peringkat anggota terakhir, independensi nama, rig, dan keluarkan/reset termasuk nama duplikat. `npm run build` memproduksi dist.

Browser QA menggunakan renderer Canvas fallback karena browser pengujian tidak menyediakan WebGL. Uji visual WebGL pada perangkat pengguna tetap diperlukan.
