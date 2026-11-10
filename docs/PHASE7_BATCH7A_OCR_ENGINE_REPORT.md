# Phase 7 Batch 7A — OCR Engine Foundation

Tanggal: 2026-11-10

## Library

tesseract.js@5.1.1 (Apache-2.0). Core WASM ~15–30 MB. Model eng/ind tidak di-bundle.

## Kontrak

Lihat `engine/ocr/types.ts` dan `engine/ocr/engine.ts`.

## Status

- Validasi + alur gambar/PDF siap.
- Handler `ocr-image` terpasang, availability `in-development`.
- Offline penuh belum diuji (aset model harus disediakan pengguna di `public/ocr/`).

## Verifikasi

typecheck PASS, npm test PASS, build PASS, lockfile bersih (hanya registry.npmjs.org).
