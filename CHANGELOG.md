# Changelog

## Batch 19 — Menu, sinkronisasi fitur, perapian UI (2026-11-10)

Bukan fitur baru. Registry tetap satu sumber tool.

- PDF Merge, PDF Split, dan PDF Converter pindah ke kategori PDF Tools. Tool gambar yang sempat di "Image & PDF" masuk Image Tools. Kategori "Image & PDF" dan "Calculator & Converter" dihapus karena isinya pindah, bukan karena tool dihapus.
- Document Intelligence ikut Dokumen. Extract Insights, Document Assistant, dan Local AI Hub masuk AI & Intelligence. Backup pindah ke Sistem; tautan footer tetap jalan pintas.
- Teks beranda, halaman kategori, dan pita "file diproses di perangkat" tidak lagi mengklaim bahwa konversi Word/Excel/PowerPoint belum ada.
- Kartu "Gambar ke PDF" membuka tool Image to PDF, bukan PDF Writer. PDF Writer tetap untuk teks dan HTML.
- Badge jujur: Local AI "Tidak ada model", Media Tools dan Audio Cutter "Butuh FFmpeg".
- Kartu konversi tidak lagi menampilkan badge Tier di daftar. Keterbatasan tetap di detail.
- Slug lama `#/category/image-dan-pdf` membuka Gambar. `#/category/calculator-dan-converter` membuka Kalkulator.

Verifikasi sesi ini: `tsc` lulus, Vitest 187 tes lulus (Batch 18: 179), `vite build` lulus. Perangkat fisik: NOT VERIFIED.

## Batch 18 — Final integration gate (2026-11-10)

Bukan rilis fitur baru. Perbaikan bug yang ketahuan saat audit kode Batch 1–17:

- PDF.js 6.x memakai `Promise.try`, yang tidak ada di Node 22 lingkungan ini. PDF → DOCX menggantung. Loader sekarang memakai build legacy dan polyfill.
- `escapeHtml` dan ekspor HTML tabel PDF tidak meng-escape markup (no-op). Diperbaiki.
- Dekode entitas XML pada teks PPTX tidak jalan. Diperbaiki.
- PDF Editor ada di kode tetapi tidak terdaftar di navigasi. Sekarang ada di menu PDF.
- Kartu PDF → TXT/DOCX/PPTX/XLSX dan PPTX → PDF (teks) mengeksekusi mesin yang sudah ada, dengan catatan kehilangan. Bukan klaim tata letak identik.
- Badge Excel, PowerPoint, dan OCR diselaraskan ke "Sebagian tersedia".
- Kategori System masuk grup Sistem, bukan "Lainnya".
- Versi yang tampil di UI disamakan ke 0.5.0.

Verifikasi sesi ini: `tsc` lulus, Vitest 179 tes lulus, `vite build` lulus. Perangkat fisik dan offline end-to-end: NOT VERIFIED.

## 0.5.0 — Phase 7 Batch 5 Word Converter (2026-11-09)


- Word Converter berfungsi secara lokal: DOCX→TXT, DOCX→HTML, DOCX→PDF, TXT→DOCX, HTML→DOCX.
- Mammoth 1.13.0 (baca) dan docx 9.15.3 (tulis), dimuat saat konversi. PDF memakai pdf-lib yang sudah ada. Bukan dialog cetak.
- Penjaga ZIP (central directory) sebelum parse. HTML disanitasi. Macro tidak dijalankan.
- Pratinjau hasil dan tempel teks/HTML pada halaman Word. PDF→Word tetap belum tersedia.
- Lockfile dibuat ulang dari registry.npmjs.org (lockfile Batch 4 menunjuk mirror pribadi).

## 0.3.1 — Phase 7.1 (UI/UX refinement)
- Baru: header global, sidebar bergrup + submenu Document Converter, drawer mobile, sidebar dapat diciutkan, rute kategori/favorit/terakhir/cari, skip link, fokus rute, judul dokumen.
- Beranda: Favorit, Terakhir dibuka, Kategori, Semua tools, info aplikasi; keadaan kosong pencarian dengan saran.
- `ToolCard` standar (tautan dan tombol favorit tidak lagi bersarang).
- Document Converter: halaman per fungsi (`page-layouts.ts`), ringkasan status dari registry, detail di bawah grup, "Periksa kelayakan file (bukan konversi)", penjelasan slide gambar vs dapat diedit, panel bahasa OCR.
- Pencarian: sinonim kompres/gabung/pisah/jpeg.
- Tes baru: `nav.test.ts`, `page-layouts.test.ts`. Tidak ada konversi baru. Belum diverifikasi dengan npm/Vitest/build/browser.

# Changelog

## 0.2.0 — Phase 6
- Favorites system (localStorage)
- Usage history with toggle
- QR Camera Scanner
- Audio Cutter (FFmpeg)
- Audio Recorder
- Pomodoro Timer
- Backup & Restore settings
- Dashboard polish (recent + favorites)

## 0.1.0 — Phase 0–5
- Core utilities, developer tools, calculators, image/PDF, media module (FFmpeg audio)

## 0.3.0 — Phase 7 Batch 1 (kerangka, BELUM diuji build)
- Kategori `Document Converter` + 5 halaman: PDF, Word, Excel, PowerPoint, OCR & Scanner (kerangka, tanpa konversi baru)
- Conversion Registry (33 definisi, tier A/B/C sementara), Engine Registry (8 engine, belum ada aset), Engine Manager (status dari Cache Storage, eksklusif 1 pekerjaan, cancel, clear cache)
- Validasi file: ekstensi + magic bytes + ukuran + isi ringan; fondasi pemeriksaan ZIP bomb OOXML
- Batas ukuran terpusat (`DOCUMENT_LIMITS`)
- Pencarian per kata + sinonim + ranking (`src/lib/search.ts`), kompatibel mundur
- Tes baru: `tests/document-converter.test.ts`, `tests/search.test.ts`
- Tidak ada dependensi baru; Phase 5 FFmpeg, PWA config, routing, deploy tidak diubah

## Phase 7 Batch 0
- Docs: audit kondisi awal dan keputusan library sementara (tanpa perubahan kode)

## 0.4.0 — Phase 7 Batch 2 Excel Converter (2026-11-09)

- Excel Converter: XLSX↔CSV, XLSX↔JSON, XLSX→HTML, HTML-table→XLSX, XLSX→PDF berfungsi secara lokal (SheetJS + pdf-lib).
- Lazy-load `xlsx@0.18.5`; chunk terpisah (~143 KB gzip).
- Formula-injection protection default pada CSV; HTML escape; script strip pada HTML table.
- CSV→XLSX default preserve-text (leading zeros).
- ConverterPage menjalankan execute, unduh hasil, tampilkan losses.
- Docs: PHASE7_BATCH2_*.md

## 0.4.2 — Phase 7 Batch 4 PDF Writer (2026-11-09)

- PDF Writer: Gambar (JPG/PNG/WebP, multi dengan reorder) → PDF, TXT → PDF, HTML sederhana → PDF.
- Pengaturan: ukuran kertas (A4/A3/A5/Letter/Legal), orientasi, margin, fit gambar, font size, line spacing, alignment, judul.
- Preview PDF hasil aktual (iframe blob URL) + unduh.
- Sanitasi HTML: strip script, event handler, resource eksternal.
- Terintegrasi ke Conversion Registry (txt-to-pdf, html-to-pdf, image-to-pdf → existingToolId: pdf-writer).
- Docs: PHASE7_BATCH4_*.md

## 0.4.1 — Phase 7 Batch 3 PDF Reader (2026-11-09)

- PDF Reader: buka PDF lokal (picker + drag-drop), validasi signature, tampil meta (nama/ukuran/halaman).
- Viewer: render canvas pdf.js, zoom, fit width/page, mode satu halaman & gulir kontinu, navigasi keyboard.
- Toolbar lengkap, fullscreen, tutup dokumen dengan cleanup memori.
- Pencarian teks + navigasi hasil; text layer untuk seleksi/salin (PDF berbasis teks).
- Lazy-load `pdfjs-dist@6.4.299` + worker self-hosted (tanpa CDN runtime).
- Docs: PHASE7_BATCH3_*.md
