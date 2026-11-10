# Phase 7 — Keputusan Library (Batch 0)

Tanggal: 2026-11-09. Status keputusan: **SEMENTARA** sampai Spike S1/S2 dijalankan di browser nyata (BLOCKED di lingkungan audit).
Tingkat bukti: **[V]** diverifikasi dari sumber online di sesi ini · **[K]** dari pengetahuan umum, belum diverifikasi, wajib dicek saat install.

## 1. Tabel perbandingan

| Kandidat | Peran | Lisensi | Temuan | Keputusan |
|---|---|---|---|---|
| **Ream** (`reamkit` v1.29.0 di npm) | Baca DOCX/XLSX/PPTX/PDF (+ .doc/.xls/.ppt lama); tulis PDF, SVG, HTML, MD, DOCX, XLSX | MIT [V] | TypeScript murni, jalan di browser, dependensi runtime hanya `fflate` + `fast-xml-parser`, `sideEffects:false`, ESM. Dokumentasi "Scope & limitations" jujur soal batas. XLSX hanya sebagai output dari input spreadsheet. Font: dapat disuplai pemanggil; `remoteFontProvider` mengambil dari CDN (**harus dimatikan**). Reader/writer di subpath ditandai `@experimental`. Proyek muda (hak cipta 2026, satu maintainer). Ukuran bundle dan RAM **belum terukur**. | **KANDIDAT UTAMA** untuk DOCX/PPTX/XLSX→PDF dan PDF→DOCX, menunggu Spike S1 |
| LibreOffice WASM (`matbeedotcom/libreoffice-document-converter`) | Konversi office penuh | MPL-2.0 [V] | README: wajib header COOP+COEP; ~150 MB file WASM; ~240 MB unduhan awal di browser. | **DITOLAK**: tidak cocok GitHub Pages dan HP |
| `Skitionek/serverless-office-converter` | — | — | **Belum diperiksa.** Jangan diasumsikan. | NOT EVALUATED |
| **pdf.js** (`pdfjs-dist`) | Render halaman, teks, password | Apache-2.0 [V] (dari paket mirror; versi resmi terbaru belum dipastikan) | Standar untuk render PDF→gambar dan ekstraksi teks. Worker `.mjs` harus self-host. | **DIPILIH** untuk PDF→JPG/PNG/TXT dan pembaca OCR |
| **pdf-lib** | Tulis PDF (gambar, TXT) | MIT [V dari lock: 1.17.1] | Sudah terpasang. `StandardFonts` hanya WinAnsi, emoji/non-Latin gagal; perlu `@pdf-lib/fontkit` + font tertanam. | **DIPERTAHANKAN** untuk gambar/TXT→PDF |
| **SheetJS CE** | CSV/XLSX/XLS/JSON/HTML | Apache-2.0 [V] | **Paket npm `xlsx` berhenti di 0.18.5 (Mar 2022) dan punya 2 kerentanan** (CVE-2023-30533, CVE-2024-22363). Versi terbaru 0.20.3 hanya lewat `cdn.sheetjs.com` (tarball). | **DIPILIH, v0.20.3 di-vendor** (simpan `.tgz` di repo + checksum). Jangan `npm install xlsx` biasa |
| Tesseract.js | OCR | Apache-2.0 [K] | `workerPath`, `corePath`, `langPath` dapat diarahkan ke file lokal; `.traineddata.gz` harus disajikan apa adanya (gzip) [V]. Referensi pihak ketiga menyebut v7.0.0, belum dipastikan terbaru. Ukuran model `eng`/`ind` belum diukur. | **DIPILIH**, model diunduh atas permintaan |
| PptxGenJS | Tulis PPTX | MIT [K] | Perlu `defineLayout` untuk ukuran slide mengikuti rasio PDF. | **DIPILIH** untuk PDF/Gambar→PPTX |
| `docx` (dolanmiu) | Tulis DOCX | MIT [K] | Dipakai untuk TXT/HTML/OCR→DOCX. Bisa gugur jika Ream mencakup. | DIPILIH, tinjau ulang setelah S1 |
| mammoth | DOCX→HTML/TXT | BSD-2 [K] | Bisa gugur jika Ream mencakup DOCX→HTML. | TINJAU ULANG setelah S1 |
| fflate | ZIP + parse OOXML | MIT [K] | Sudah jadi dependensi Ream, jadi dipakai bersama. | **DIPILIH** |
| DOMPurify | Sanitasi HTML | Apache-2.0/MPL-2.0 [K] | Alternatif: sanitizer allow-list buatan sendiri yang lebih kecil. | PUTUSKAN di Batch 1 |

## 2. Koreksi terhadap prompt Phase 7 versi awal
Prompt awal menetapkan DOCX→PDF, PPTX→PDF, dan PPTX→PNG/JPG sebagai **Tier C (tidak didukung)** berdasarkan penolakan LibreOffice-WASM, **tanpa memeriksa Ream terlebih dahulu**. Itu terlalu dini. Dengan Ream sebagai kandidat, status berubah menjadi:

| Konversi | Tier lama | Tier sementara | Syarat naik jadi tersedia |
|---|---|---|---|
| DOCX → PDF | B (via HTML) | **B (Ream)** | Lolos S1 (hasil dibuka, teks Indonesia benar, font bundel offline) |
| XLSX → PDF | A (renderer sendiri) | **B (Ream) atau A (sendiri)** | Bandingkan hasil di S1; pilih yang lebih ringan dan benar |
| PPTX → PDF | C | **B (Ream)** | Lolos S1 |
| PPTX → PNG/JPG | C | **B**: Ream → SVG → raster lewat canvas | Lolos S1, uji di iOS Safari (batas canvas) |
| PDF → DOCX | B (heuristik sendiri) | **B (Ream)**, heuristik sendiri sebagai cadangan | Lolos S1 |
| PDF → XLSX | B | **B (sendiri)**: Ream hanya menulis XLSX dari input spreadsheet | Tetap `tableDetect` + editor grid |
| PDF → PPTX | A/B | A/B (sendiri: pdf.js + PptxGenJS) | Tidak berubah |
| Konversi lain | — | Tidak berubah | — |

**Tidak ada tier yang naik ke A sebelum diuji di browser nyata.** Semua yang bergantung Ream tetap **B / NOT TESTED**.

## 3. Syarat memakai Ream (wajib)
- Font **disuplai sendiri** (`callerFontProvider`), `remoteFontProvider` tidak boleh dipakai (konflik "tanpa CDN runtime"). Pakai font substitusi metrik-kompatibel berlisensi terbuka (mis. Carlito, Caladea, Arimo, Tinos, Cousine); catat lisensi dan ukuran di `THIRD_PARTY_NOTICES.md`.
- Impor hanya modul yang dipakai (reader/writer subpath) agar bundle kecil; muat lewat `import()` malas.
- Jalankan di Web Worker; batasi ukuran file di `limits.ts`.
- Karena proyek muda, buat **lapisan adapter** (`engines/*`) sehingga Ream bisa diganti tanpa mengubah UI.
- Tampilkan "laporan kehilangan" (`doc.losses`) ke pengguna sebagai daftar keterbatasan nyata.
- Fidelity "mendekati Word" adalah klaim penulis library, **belum diverifikasi di sini**. Jangan menjanjikan layout identik.

## 4. Spike yang masih harus dijalankan (BLOCKED di lingkungan ini)
**S1 — Ream di browser nyata** (Chrome desktop, lalu Android Chrome dan iPhone Safari):
1. `npm i reamkit` pada branch uji; buat halaman uji yang memuat `Ream.parse(bytes)` lalu `convert('pdf')` dengan font lokal.
2. Fixture: DOCX Indonesia (heading, tabel, gambar), XLSX multi-sheet, PPTX dengan gambar, PDF teks.
3. Catat: ukuran chunk (gzip), waktu, puncak RAM, hasil dibuka oleh pdf.js, teks Indonesia benar, loss report.
4. Uji offline: setelah font dan chunk ter-cache, matikan internet, ulangi.
5. Keputusan: lolos / lolos dengan batas / gagal, lalu perbarui tabel di atas.

**S2 — Baseline dan SheetJS:** `npm install`, `npm run build` (catat ukuran), pasang SheetJS 0.20.3 dari tarball yang di-vendor, uji CSV/XLSX leading zero dan formula berbahaya.

## 5. Dampak ke rencana batch
- Batch 1 (fondasi) tidak terblokir dan boleh jalan.
- Batch 4 (PDF writer) dan Batch 5–6 (Word/PPT) menunggu hasil S1.
- Batch 2 (Excel/CSV) menunggu S2 hanya untuk pemasangan SheetJS.
