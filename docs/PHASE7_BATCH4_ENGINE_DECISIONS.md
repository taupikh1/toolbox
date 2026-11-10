# Phase 7 Batch 4 — Engine Decisions

**Tanggal:** 2026-11-09

## Library dipilih

| Library | Versi | Lisensi | Alasan |
|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | Sudah terpasang. Ringan, TypeScript, offline, embed image + draw text, metadata. Tidak butuh CDN. |

Tidak dievaluasi untuk dipasang baru: jsPDF (redundan), Ream (berat, tidak diperlukan untuk scope terbatas).

## Keputusan teknis

1. **Tidak ada dependency baru.** pdf-lib cukup.
2. **Image embedding:** canvas resize + createImageBitmap (EXIF orientation) → PNG/JPEG bytes → embedPng/embedJpg.
3. **Text rendering:** StandardFonts.Helvetica, manual word wrap, multi-page.
4. **HTML:** DOMParser + sanitasi (hapus script/style/iframe/event handlers) → ekstraksi teks terstruktur → reuse textToPdf.
5. **Preview:** blob URL + iframe. Tidak menduplikasi pdf.js.
6. **Integrasi:** existingToolId di Conversion Registry mengarah ke tool baru. ConverterPage menampilkan tombol "Buka tool ini".
7. **Keamanan:** semua lokal, no eval, no external fetch dari HTML, resource cleanup (revokeObjectURL).

## Alternatif yang ditolak

- Full HTML-to-PDF via browser print atau headless: ukuran dan keamanan tidak sesuai offline-first.
- Embed font custom: menambah ukuran; Helvetica cukup untuk target Indonesia/Latin.
