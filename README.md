# Toolbox Offline

PWA utilitas yang memproses file di browser. Tidak ada backend dan tidak ada akun.

Versi paket: `0.5.0`. Batch 19 merapikan menu dan teks status. Bukan penambahan fitur besar.

**Status rilis: READY WITH LIMITATIONS.** Typecheck, 187 tes, dan build lulus di lingkungan ini. Uji perangkat fisik (iPhone Safari, Android) dan reload offline belum dilakukan. Beberapa konversi bersifat parsial dan ditandai di UI.

## Yang benar-benar bisa dipakai

- Tool Phase 0–6: QR, gambar, teks, developer, kalkulator, PDF merge/split/reader/writer, audio (sebagian butuh unduhan FFmpeg sekali), Pomodoro, backup.
- PDF Editor: susun/putar/duplikasi/hapus halaman dan anotasi sederhana. Bukan edit teks asli. Ada di menu PDF, bersama Reader, Writer, Merge, Split, Image to PDF, dan PDF Converter.
- Excel: XLSX ↔ CSV/JSON/HTML dan XLSX → PDF sederhana. Ada di menu Dokumen (Excel Converter), bukan kategori spreadsheet terpisah.
- Word: DOCX → TXT/HTML/PDF, TXT/HTML → DOCX. Bukan file `.doc` lama.
- PDF → TXT dan PDF → DOCX: rekonstruksi **teks**, bukan tata letak.
- PDF → PPTX: setiap halaman menjadi **gambar**. Objek tidak dapat diedit.
- PPTX → PDF: rekonstruksi **teks** saja, bukan render slide.
- PPTX: parser, viewer teks+gambar, writer, gambar → PPTX.
- PDF → Excel: deteksi tabel heuristik dari text layer. Bukan OCR.
- OCR dan scanner: kode ada. Model bahasa di `public/ocr/` harus tersedia. Belum di-bundle.
- Document Assistant: rule-based, bukan model generatif.
- Local AI Hub: status saja. **Tidak ada inference.**

## Yang belum

- PDF → JPG/PNG, SVG → PDF, searchable PDF.
- Render slide PowerPoint yang identik.
- Speech-to-text dan model AI lokal.
- Konversi video tanpa modul FFmpeg yang diunduh pengguna.

Rincian: `MASTER_FEATURE_MATRIX.md`, `BATCH19_MENU_FEATURE_AUDIT.md`, `RELEASE_NOTES.md`, `NEXT_AI_HANDOFF.md`.

## Development

Butuh Node.js 22.13 atau lebih baru (`pdfjs-dist` 6.x). Jangan turunkan ke Node 20.

```bash
npm install --registry=https://registry.npmjs.org/
npm run typecheck
npm test
npm run build
```

## Deploy

Workflow GitHub Pages milik pengguna tidak ikut ZIP dan tidak diubah di Batch 18. Pertahankan `node-version: 22`. Buka aplikasi sekali saat online agar service worker meng-cache shell, lalu unduh FFmpeg atau model OCR hanya jika fitur itu dipakai.

