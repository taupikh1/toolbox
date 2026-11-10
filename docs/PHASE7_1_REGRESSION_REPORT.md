# Phase 7.1 — Regression Phase 0–6

Metode: (a) perbandingan berkas dengan `Toolbox-batch1.zip`; (b) tes logika lewat shim; (c) render server-side. **Tidak ada regression runtime di browser.**

**Bukti perbandingan berkas:** tidak ada berkas di `src/tools/<tool lama>/`, `src/services/`, `src/lib/` (selain `search.ts`), `vite.config.ts`, `.github/`, `package-lock.json` yang berubah. Yang berubah: `App.tsx`, `hooks.ts`, `styles.css`, `lib/search.ts` (hanya menambah sinonim), `tools/registry.ts` (hanya menambah field opsional `badge` pada lima entri Document Converter), komponen dan halaman Document Converter, `package.json` (versi), berkas baru `nav.ts`, `components/*`, `registry/page-layouts.ts`, dua tes baru, dokumen.

| Fitur | Status | Catatan |
|---|---|---|
| 31 tool Phase 0–6 terdaftar, id tidak berubah, kategori lama utuh | PASS (tes logika, shim) | `search.test.ts` |
| Pencarian lama (superset) | PASS (tes logika, shim) | |
| Kalkulator, Dev tools (JSON, regex, timestamp, diff, dll.), PDF/Image tool | PASS (tes logika, shim) | hanya logika murni; UI-nya tidak dijalankan |
| Favorit & riwayat: fungsi `services/storage.ts` tidak diubah, App memanggil API yang sama | PARTIAL | perilaku UI NOT TESTED |
| Tema (tersimpan di localStorage) | PARTIAL | logika tetap; ditambah update `theme-color`; visual NOT TESTED |
| Hash routing: rute lama dipertahankan | PASS (tes `parseRoute`, shim) | back/forward di browser NOT TESTED |
| QR generator/scanner, image tools, FFmpeg/media, audio, Pomodoro, Backup/Restore, PWA | NOT TESTED | kode tool tidak berubah; tidak dijalankan |
| Video tools Phase 5 | NOT IMPLEMENTED | sesuai status sebelumnya |
