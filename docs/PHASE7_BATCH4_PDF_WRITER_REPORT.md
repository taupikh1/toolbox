# Phase 7 Batch 4 — PDF Writer Report

**Tanggal:** 2026-11-09  
**Status:** IMPLEMENTED

## Fitur selesai

| Fitur | Status | Catatan |
|---|---|---|
| Gambar (JPG/JPEG/PNG/WebP) → PDF | Tersedia | Multi-file, reorder, hapus, thumbnail |
| Banyak gambar → satu PDF | Tersedia | Urutan sesuai pengguna |
| TXT → PDF | Tersedia | Paste atau upload, wrapping, multi-page |
| HTML → PDF (terbatas) | Tersedia | Heading, paragraf, list, tabel sederhana (teks) |
| Pengaturan halaman | Tersedia | A4/A3/A5/Letter/Legal, portrait/landscape, margin |
| Fit gambar | Tersedia | Fit / Fill / Original (diperkecil jika perlu) |
| Preview sebelum download | Tersedia | iframe blob URL hasil PDF aktual |
| Download PDF | Tersedia | Nama file dapat diatur |

## Library & Engine

- **pdf-lib@1.17.1** (MIT) — sudah ada di package.json. Digunakan untuk create, embed image, draw text, save.
- Tidak ada dependency baru.
- Font: StandardFonts.Helvetica + HelveticaBold.

## File yang dibuat

- `src/tools/pdf-writer/engine.ts`
- `src/tools/pdf-writer/PdfWriter.tsx`
- `docs/PHASE7_BATCH4_PDF_WRITER_REPORT.md` (ini)
- `docs/PHASE7_BATCH4_TEST_REPORT.md`
- `docs/PHASE7_BATCH4_REGRESSION_REPORT.md`
- `docs/PHASE7_BATCH4_ENGINE_DECISIONS.md`

## File yang diubah

- `src/tools/registry.ts` (tambah tool pdf-writer)
- `src/tools/document-converter/registry/conversion-definitions.ts` (availability + existingToolId)
- `src/tools/document-converter/registry/page-layouts.ts` (notes)
- README.md, HANDOFF.md, PHASE_STATUS.md, DECISIONS.md, CHANGELOG.md

## Batasan

- Font standar (Latin). Karakter di luar Latin dasar mungkin tidak sempurna.
- HTML: hanya ekstraksi teks terstruktur. Tidak ada CSS layout, gambar eksternal, atau script.
- Preview bergantung pada kemampuan browser menampilkan PDF di iframe.
- Gambar sangat besar diperkecil (sisi terpanjang max 2500 px) untuk keamanan memori.

## Risiko

- Memory pada banyak gambar besar di perangkat rendah.
- HTML kompleks menghasilkan teks yang kehilangan layout.
- Beberapa browser mobile mungkin membatasi iframe PDF.

## Pekerjaan tersisa

- Font tertanam untuk Unicode penuh (opsional).
- Integrasi preview penuh dengan komponen PDF Reader (jika diinginkan).
- Opsi page numbering eksplisit.
- Batch 5+ (PDF→format lain, dll.).
