# Arsitektur

- Shell: App.tsx + hash routing (hooks.ts). Registry tunggal lazy di src/tools/registry.ts.
- Logika murni: src/lib/dev.ts (Phase 2), loan/percentage/date/timezone (Phase 3), color.ts + image.ts (Phase 4).
- Gambar: createImageBitmap({ imageOrientation: 'from-image' }), Canvas, toBlob. Object URL di-revoke di effect cleanup.
- PDF: pdf-lib (merge copyPages, split extract). Tidak ada backend.
- Media (Phase 5): FFmpeg.wasm single-thread core. Manager terpusat di src/services/ffmpeg/ffmpegManager.ts. Core di-download on-demand oleh user dan di-cache di Cache Storage terpisah (ffmpeg-core-v0.12.10). Tidak masuk initial bundle atau precache PWA.
- PWA: vite-plugin-pwa precache js/css/html/svg/png termasuk chunk dynamic import. FFmpeg core di luar precache.
- Kategori: All Tools + turunan dari registry (Developer Tools, Image Tools, PDF Tools, Text Tools, Calculator & Converter, Calculators, Image & PDF, Media Tools).
- Phase 7 (Batch 1): `src/tools/document-converter/` (types, registry, engine, validation, components, pages, services, utils). Lima halaman didaftarkan di `registry.ts` dengan kategori `Document Converter`. Pencarian dipindah ke `src/lib/search.ts` (per kata, sinonim, ranking). Rincian: `docs/PHASE7_ARCHITECTURE.md`.
