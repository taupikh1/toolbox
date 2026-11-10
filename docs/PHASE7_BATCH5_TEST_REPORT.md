# Phase 7 Batch 5 — Laporan uji

Tanggal: 2026-11-09. Node v22.23.3. Perintah dijalankan pada sumber Batch 5.

## Perintah dan hasil

| Perintah | Hasil |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | LULUS, exit 0 |
| `npm test` (`vitest run`) | LULUS. 8 file, 122 tes, 0 gagal |
| `npm run build` (`vite build`) | LULUS, ~8.3 dtk. PWA precache 64 entri |

Tes Word baru (`tests/word-converter.test.ts`, 15 tes):

- DOCX → TXT: paragraf, baris, tabel (tab), karakter Indonesia.
- DOCX → HTML: heading, strong, em, tabel, tanpa script.
- DOCX → PDF: magic `%PDF-`, bukan alur dialog cetak.
- TXT → DOCX dan putar balik ke teks.
- HTML → DOCX: script `alert(1)` tidak ada di hasil; tabel `Satu<tab>Dua`.
- File rusak, kosong, .doc lama, ekstensi palsu, terlalu besar.
- ZIP bomb (rasio central directory) ditolak sebelum ekstraksi.
- Nama file dengan spasi dan karakter khusus.

Tes regresi yang ikut jalan: `document-converter`, `page-layouts`, `search`, `nav`, `calculators`, `dev`, `phase4`. Semua lulus.

Penyesuaian assertion yang sudah usang sejak Batch 4 (bukan perubahan perilaku Batch 5):

- Jumlah tool di luar Document Converter 32 → 33 karena PDF Writer.
- Daftar konversi `available` sekarang mencakup `txt-to-pdf` dan `html-to-pdf` (sudah `available` di Batch 4) plus lima konversi Word.
- Pencarian "gambar/foto ke pdf" tetap harus memuat PDF Converter dan Image to PDF; peringkat pertama boleh PDF Writer karena kata kunci Batch 4.

## Yang tidak diuji

| Jenis | Status |
|---|---|
| Browser desktop / iPhone, dark/light, unggah sungguhan | NOT VERIFIED (tidak ada sesi browser pada sumber ini) |
| PWA offline setelah build | NOT VERIFIED |
| GitHub Actions / GitHub Pages | NOT VERIFIED (hanya pengguna yang bisa melihat tab Actions) |

Jangan menganggap tampilan HP atau deploy sudah terbukti.
