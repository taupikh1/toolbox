# Regression test report — Batch 18

Lingkungan: Node v22.23.3, Vitest 2.1.9, direktori source Toolbox Offline.

## Perintah

```text
npm run typecheck
# tsc --noEmit
# exit 0

npm test
# Test Files  25 passed (25)
# Tests       179 passed (179)
# Duration    ~12s

npm run build
# vite build exit 0
# PWA precache 72 entries (~2836 KiB)
```

## Tes baru

`tests/batch18-regression.test.ts`

- `escapeHtml` menghasilkan entitas, bukan markup mentah.
- HTML tabel PDF meng-escape `<script>` dan `&`.
- Teks PPTX `&` dan `<` terdekode.
- Tool `pdf-editor` ada di registry.
- Kartu `pdf-to-txt`, `pdf-to-docx`, `pdf-to-xlsx`, `pptx-to-pdf` runnable dan limitations tidak kosong. Nama PPTX→PDF menyebut teks. PDF→PPTX menyebut gambar.
- Registry model Local AI tidak berstatus available.
- PDF dengan teks "Halo Batch 18" menjadi DOCX yang memuat string itu di `word/document.xml`. Bukan hanya cek `%PDF-`.
- Byte sampah tidak menggantung `pdfToDocx`.
- PPTX mini menjadi PDF yang diawali `%PDF-` dan berlabel text-only.

## Tes yang tadinya gagal

`tests/advanced-converter.test.ts` timeout 5000 ms karena `Promise.try` tidak ada. Setelah loader legacy: lulus (~330 ms).

## Yang tidak diuji

- Klik UI di browser.
- Kamera, mikrofon, BarcodeDetector.
- Unduh FFmpeg dan model OCR sungguhan.
- iPhone Safari dan Android Chrome.
- Service worker saat jaringan dimatikan.
- Membuka hasil di Microsoft Word, Excel, atau PowerPoint desktop. Parser yang dipakai: pdf-lib, pdf.js, JSZip, mammoth/docx lewat unit tes yang sudah ada, SheetJS lewat tes Excel lama.
