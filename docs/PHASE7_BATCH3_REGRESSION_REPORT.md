# Phase 7 Batch 3 — Regression Report

## Scope yang diuji

- Phase 0–6: tidak diubah kode tool lama. Tes `calculators`, `dev`, `phase4`, `nav` tetap hijau.
- Phase 7 Batch 1: registry, validation, search — tetap 33 conversion defs; tes document-converter PASS.
- Phase 7.1: navigasi, page-layouts — PASS.
- Batch 2 Excel Converter: tidak disentuh; chunk xlsx tetap ada di build output.

## Perubahan yang mempengaruhi tes

- `tests/search.test.ts`: ekspektasi jumlah tool non-Document-Converter dinaikkan 31 → 32 (PDF Reader baru).

## Yang tidak diubah

- FFmpeg / Phase 5 media
- PWA config inti (hanya aset worker ikut ter-precache otomatis oleh workbox glob)
- Routing hash, sidebar, theme

## Kesimpulan regression otomatis

**PASS** pada suite Vitest yang ada. Browser/visual regression belum dijalankan di sesi ini.
