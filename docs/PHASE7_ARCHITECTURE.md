# Phase 7 — Arsitektur (Batch 1)

```
src/tools/document-converter/
├── index.ts                    pintu masuk publik
├── types/        file.ts · engine.ts · conversion.ts
├── registry/     conversion-definitions.ts (data) · conversion-registry.ts · engine-registry.ts
├── engine/       engine-manager.ts · engine-status.ts
├── validation/   file-formats.ts · file-signature.ts · file-validator.ts · file-limits.ts · ooxml-guard.ts
├── services/     file-service.ts (baca 4 KB awal untuk validasi; tidak menyimpan file)
├── components/   ConverterPage (bersama) · ConverterLayout · ConversionOptions · ConversionStatus
│                 FileDropzone · FileQueue · ConversionProgress · UnsupportedFeatureNotice
├── pages/        PDF · Word · Excel · PowerPoint · OCR (masing-masing ±10 baris)
└── utils/        format-file-size.ts · format-error.ts
src/lib/search.ts               pencarian global (murni, diuji)
```

## Alur
`registry.ts` (lazy) → halaman → `ConverterPage(page)` → `conversionRegistry.forPage(page)` → kartu. Pilih kartu → `ConversionOptions` (detail, keterbatasan, tombol). Pilih file → `checkFiles` → `validateBlob` → `FileQueue`.

## Conversion Registry
`ConversionDefinition`: id, nama, halaman, format masukan/keluaran, tier A/B/C, engine, availability, status, kategori batas, keterbatasan, `existingToolId?`, keywords, `validate?`, `execute?`. `isRunnable` = status READY **dan** available **dan** `execute` ada. Tier C wajib `unsupported` (dicek saat `register`). Label: Tersedia / Dalam pengembangan / Segera hadir / Tidak didukung. Arti: "Dalam pengembangan" = engine sudah dipilih; "Segera hadir" = bergantung hasil uji engine.

## Engine Manager
- Status: NOT_DOWNLOADED, DOWNLOADING, READY_OFFLINE, PROCESSING, ERROR. Semua awalnya NOT_DOWNLOADED.
- `refresh` membaca Cache Storage nyata (`docengine-<id>-v1`, semua aset harus ada). Tanpa Cache API atau tanpa aset terdaftar: tidak siap.
- Jenis aset dipisah: `js-chunk`, `wasm`, `ocr-model`, `worker`, `support-file`.
- `runExclusive`: satu pekerjaan berat (`maxConcurrentJobs`), engine harus READY_OFFLINE, pembatalan lewat AbortSignal (`cancelActive`).
- `clearCache` menghapus cache satu engine. `download` belum ada (NO_SOURCE).
- Penyimpanan diabstraksi (`EngineStorage`) agar teruji tanpa browser.

## Validasi dan keamanan
Urutan: kosong → ekstensi Office lama → ekstensi vs format yang diharapkan → ukuran → magic bytes → isi ringan (JSON/SVG/HTML) → peringatan MIME. Tidak ada isi dokumen, nama file, atau sandi yang ditulis ke localStorage/IndexedDB/console. `checkZipEntries` (entri, ukuran total, rasio, path `..`) wajib dipanggil pembaca OOXML kelak sebelum ekstraksi. XXE: parser XML kelak harus menolak DTD/entitas eksternal (belum ada parser).

## PWA / offline
Tidak ada perubahan `vite.config.ts`. Halaman Phase 7 ikut precache sebagai chunk JS biasa (kecil). Engine berat nanti di Cache Storage terpisah dan tidak di-precache. **Halaman bisa dibuka offline, tetapi belum ada engine konversi yang tersedia offline.**

## Pencarian
`scoreTool`: substring utuh lama (+5), kecocokan penuh nama/keyword (+20) atau frasa (+10), semua kata cocok pada batas kata dengan sinonim (+jumlah kata). Kata penghubung (ke, to, into, jadi, menjadi, dari, from, dan, and) diabaikan. Kelompok sinonim: word/docx, excel/xlsx/spreadsheet, powerpoint/pptx/ppt/slide/presentasi, gambar/image/foto, teks/text/txt, indonesia, scan/pindai, dokumen/document. Query kosong = urutan asli.
