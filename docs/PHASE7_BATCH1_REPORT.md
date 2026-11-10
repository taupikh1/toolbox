# Phase 7 — Batch 1: Laporan

Tanggal: 2026-11-09 · Basis: `Toolbox-Offline-phase07-batch0.zip` (v0.2.0) · Hasil: v0.3.0 (kerangka)

## Ringkasan
Fondasi Document Converter dibangun dan terhubung ke registry, navigasi, dan pencarian. **Belum ada konversi dokumen baru yang berfungsi.** Kode belum pernah di-build: sandbox tidak punya internet (BLOCKED).

## Dikerjakan
- Kategori `Document Converter` (turunan otomatis dari registry; tidak ada kategori serupa) dan 5 halaman: `doc-pdf-converter`, `doc-word-converter`, `doc-excel-converter`, `doc-powerpoint-converter`, `doc-ocr-scanner`.
- Conversion Registry: 33 definisi (tier A 18, B 14, C 1; Tersedia 3, Dalam pengembangan 15, Segera hadir 14, Tidak didukung 1). Tidak satu pun punya `execute`/`validate`.
- Engine Registry (8 engine, tanpa aset) dan Engine Manager.
- Validasi file (ekstensi, magic bytes, ukuran, isi ringan, MIME sebagai peringatan), `DOCUMENT_LIMITS`, dan `checkZipEntries` (fondasi anti ZIP bomb).
- Komponen UI bersama dan `ConverterPage`. Pengguna dapat memilih fitur, membaca keterbatasan, dan **memeriksa kelayakan file**; tombol Konversi nonaktif.
- Pencarian per kata + sinonim + ranking.

## File baru
`src/lib/search.ts`; `src/tools/document-converter/**` (types/3, registry/3, engine/2, validation/5, components/9, pages/5, services/1, utils/2, index.ts); `tests/document-converter.test.ts`; `tests/search.test.ts`; `docs/PHASE7_*.md` (4 berkas).

## File lama yang diubah
- `src/tools/registry.ts`: +5 entri (tool lama tidak disentuh).
- `src/App.tsx`: filter pencarian diganti `searchTools`; teks versi dan placeholder.
- `src/styles.css`: gaya `.dc-*` ditambahkan di akhir.
- `package.json`: versi 0.3.0.
- Dokumen: README, ARCHITECTURE, DECISIONS, PHASE_STATUS, HANDOFF, CHANGELOG.

Tidak diubah (diverifikasi dengan `diff -rq` terhadap ZIP Batch 0): `vite.config.ts`, `deploy.yml`, `package-lock.json`, `src/services/ffmpeg/*`, `src/tools/media/*`, `src/hooks.ts`, semua tool Phase 0–6, dokumen Batch 0 (`docs/PHASE7_AUDIT.md`, `docs/PHASE7_LIBRARY_DECISIONS.md`).

## Penyimpangan dari prompt (disengaja)
- Tes di `tests/`, bukan `src/.../__tests__/` (konfigurasi vitest hanya membaca `tests/**`).
- `ConverterLayout`, `ConversionStatus`, dll. ada; `ConverterPage` ditambahkan sebagai kerangka bersama.
- Tidak ada Engine Manager "download": ditolak `NO_SOURCE` karena belum ada aset.

## Risiko dan keterbatasan
1. Build, typecheck penuh, vitest asli, dan UI di browser belum dijalankan. Galat tipe pada TSX atau runtime mungkin masih ada.
2. Tier bersifat sementara; Spike S1 (Ream) dan S2 (SheetJS) belum dijalankan.
3. Pemeriksaan isi file teks hanya heuristik awal (bukan parser). File teks UTF-16 hanya dikenali lewat BOM.
4. `.doc/.xls/.ppt` lama ditolak.
5. Rasio ZIP-bomb dan batas entri di `OOXML_GUARD_LIMITS` adalah angka awal, belum dikalibrasi dengan file nyata.
6. Hasil pencarian kini diurutkan berdasarkan skor (bukan urutan registry) saat ada query.
