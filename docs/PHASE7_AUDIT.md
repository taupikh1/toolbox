# Phase 7 — Batch 0: Audit Kondisi Awal

Tanggal: 2026-11-09 · Basis: `Toolbox-Offline-phase06.zip` (v0.2.0) · Tidak ada perubahan kode aplikasi pada Batch 0.

## Batas lingkungan audit (jujur)
- Sandbox audit **tidak punya internet untuk bash**, jadi `npm install`, `typecheck`, `test`, dan `build` **tidak dijalankan** (BLOCKED). Folder `node_modules` juga tidak ada di ZIP.
- Pencarian web dan fetch halaman tersedia, dipakai untuk riset library.
- Semua temuan di bawah berasal dari **membaca file**, bukan menjalankan aplikasi.

## 8 pertanyaan audit

| # | Pertanyaan | Jawaban | Status |
|---|---|---|---|
| 1 | Aplikasi masih berjalan? | `PHASE_STATUS.md` melaporkan install/typecheck/build PASS di sandbox sebelumnya. Tidak diverifikasi ulang di sesi ini. | NOT TESTED |
| 2 | Semua menu lama berfungsi? | 31 tool terdaftar di `registry.ts`. Tidak dijalankan. | NOT TESTED |
| 3 | Struktur modular mendukung Document Converter? | Ya. Satu entri per tool, `lazy()`, kategori dibentuk otomatis dari field `category`. Route `^/tools/([\w-]+)$`, jadi `id` converter hanya boleh huruf/angka/`_`/`-`. | OK (dari kode) |
| 4 | Service worker bisa menangani aset tambahan? | `globPatterns` hanya `js,css,html,svg,png,webmanifest`. **`.wasm`, `.mjs`, `.traineddata(.gz)`, dan font `.ttf` tidak ter-precache.** Perlu strategi cache terpisah (Engine Manager). `registerType: 'autoUpdate'`. | Perlu kerja |
| 5 | GitHub Pages sesuai? | `deploy.yml` memakai `BASE_PATH=/<repo>/`, Node 20, `npm install`. GitHub Pages tidak bisa mengatur header (COOP/COEP). | OK, dengan batas |
| 6 | Konflik dependensi? | Tidak bisa diperiksa (tidak bisa install). Lock berisi 468 paket: react 18.3.1, vite 5.4.21, vite-plugin-pwa 0.21.2, vitest 2.1.9, pdf-lib 1.17.1, @ffmpeg/ffmpeg 0.12.15. | NOT TESTED |
| 7 | Batas memori / ukuran bundle? | Ukuran bundle awal **tidak bisa diukur** (butuh build). Baseline wajib diambil di lingkungan yang bisa `npm run build`. | BLOCKED |
| 8 | Navigasi menampung kategori baru? | Ya. Di mobile nav berupa deret tombol yang bisa digeser horizontal (`overflow-x:auto`), di desktop sidebar vertikal. Tampilan visual belum diuji. | OK (dari CSS) |

## Temuan tambahan
1. **Pencarian global hanya mencocokkan satu substring utuh** (`App.tsx`: gabungan `name + description + keywords`, lalu `includes(query)`). Query "pdf ke word" hanya ketemu jika frasa persis itu ada di keyword. "word ke pdf" atau "ke word pdf" tidak akan cocok. **Rekomendasi Batch 1:** ubah ke pencocokan per kata (semua kata harus ada), perubahan kecil dan berisiko rendah.
2. **Kategori lama tidak konsisten** (8 nilai: `Developer Tools` 11, `Image & PDF` 7, `Calculators` 4, `Media Tools` 3, `Calculator & Converter` 2, `Text Tools` 2, `Image Tools` 1, `PDF Tools` 1). Tidak diubah.
3. **FFmpeg (Phase 5) memuat core dari CDN jsDelivr** atas aksi pengguna. Phase 7 harus self-host; Phase 5 dibiarkan.
4. **CI memakai `npm install`**, bukan `npm ci`, dan Node 20 (lokal pernah Node 22). Rekomendasi opsional: `npm ci` + langkah `typecheck` dan `test` sebelum build.
5. **Tes memakai vitest environment `node`** (tanpa jsdom). Logika konversi harus berupa fungsi murni agar bisa diuji.
6. **`THIRD_PARTY_NOTICES.md` terlalu ringkas** (tanpa versi per paket). Akan diperluas saat dependensi Phase 7 dipasang.

## Yang harus dilakukan di lingkungan yang punya internet
- `npm install && npm run typecheck && npm test && npm run build`, catat ukuran per chunk (baseline bundle).
- Jalankan Spike S1 dan S2 (lihat `PHASE7_LIBRARY_DECISIONS.md`).
