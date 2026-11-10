# Phase 7 — Laporan Pengujian Batch 1

Lingkungan: sandbox tanpa akses jaringan; `node_modules` tidak ada; Node v22; `tsc` global 6.0.3 (proyek memakai ~5.6.3).

| Pengujian | Status | Cara dan hasil aktual |
|---|---|---|
| `npm install` | BLOCKED | Tidak ada internet di sandbox. Tidak dijalankan. |
| `npm run typecheck` (penuh) | BLOCKED | Butuh `@types/react` dll. dari npm. |
| TypeScript parsial: `.ts` murni Document Converter + `search.ts` + `file-service.ts` | PASS (parsial) | `tsc --noEmit --strict` dengan tsc 6.0.3, 0 galat. Bukan konfigurasi proyek penuh. |
| TypeScript parsial: 5 halaman + komponen (.tsx) | PARTIAL | Dicek dengan stub tipe React buatan sendiri; hanya 3 galat `implicit any` pada handler event di `FileDropzone.tsx` yang berasal dari stub (tipe asli React menyediakannya). Tidak dianggap PASS. |
| Unit test (vitest asli) `npm test` | BLOCKED | vitest tidak terpasang. |
| Unit test baru lewat **shim** buatan (bukan vitest) | PASS (49/49) | `tests/document-converter.test.ts` + `tests/search.test.ts` dijalankan dengan `node --experimental-strip-types` dan shim `describe/it/expect` minimal; import diberi ekstensi `.ts` pada salinan di /tmp. Satu kegagalan awal (hitungan OCR di tes) adalah salah tes, sudah diperbaiki lalu 49/49. Perilaku vitest asli belum terbukti identik. |
| Unit test lama (`tests/dev`, `phase4`, `calculators`) | NOT TESTED | Tidak dijalankan; berkas tidak diubah. |
| Production build (`vite build`) | BLOCKED | Butuh dependensi. Baseline ukuran bundle tetap BLOCKED. |
| Registry (5 halaman, kategori, id unik, tool lama) | PASS (via shim) | Termasuk 31 tool lama tetap ada, 36 total, satu kategori `Document Converter`. |
| Search | PASS (via shim) | Query pada spesifikasi diuji; tes superset terhadap pencarian lama atas semua nama/keyword tool lama (>100 pasangan). |
| Engine Manager | PASS (via shim) | Dengan penyimpanan palsu: status, BUSY saat dua pekerjaan, abort, clearCache, subscribe, NO_SOURCE. Cache Storage asli di browser NOT TESTED. |
| Validator / limits / guard ZIP | PASS (via shim) | Input sintetis (byte buatan), bukan file DOCX/XLSX/PPTX asli. |
| Routing ke 5 halaman | NOT TESTED | Hanya diperiksa bahwa id cocok regex route `^/tools/([\w-]+)$`. |
| Tampilan UI, dark/light, mobile, desktop | NOT TESTED | Tidak ada browser. |
| PWA offline / service worker / GitHub Pages base path | NOT TESTED | `vite.config.ts` dan `deploy.yml` tidak diubah (diff). |
| Regresi Phase 0–6 | PARTIAL | Hanya: berkas Phase 0–6 dan Phase 5 identik dengan ZIP Batch 0 (`diff -rq`), registry lama utuh, pencarian lama superset. Perilaku runtime NOT TESTED. |
| iPhone / Android nyata | NOT TESTED | Tidak ada perangkat. |

## Untuk mengulang di lingkungan normal
`npm install && npm run typecheck && npm test && npm run build`, lalu uji manual lima halaman.
