# Offline compatibility — Batch 18

PWA dikonfigurasi di `vite.config.ts`: `registerType: autoUpdate`, manifest, precache `js/css/html/svg/png/webmanifest`. Ini **bukan** bukti aplikasi terbuka saat pesawat diaktifkan.

## Skenario

| Skenario | Hasil |
|---|---|
| A. Pertama kali, ada internet | NOT VERIFIED di browser. Build menghasilkan `sw.js`. |
| B. Setelah cache | NOT VERIFIED. Precache 72 berkas saat build. |
| C. Reload tanpa internet | NOT VERIFIED. |
| D. Fitur yang mengaku offline | Shell, kalkulator, teks, PDF/Office yang library-nya ada di bundle: dirancang lokal. Tidak diuji dengan jaringan mati. |
| E. Runtime luar | OCR: `public/ocr/` kosong dari model (hanya README). FFmpeg: diunduh ke cache browser saat pengguna meminta. Keduanya gagal jika belum pernah diunduh. Local AI: tidak ada model. |

## Jangan diklaim

- "Semua fitur offline" hanya karena service worker terdaftar.
- OCR bahasa Indonesia offline sebelum berkas `ind.traineddata` (atau setara yang dipakai tesseract.js) ada di path lokal.
- Konversi video offline sebelum core FFmpeg selesai diunduh.
