# Phase 7.1 — Laporan pengujian

Lingkungan: sandbox tanpa akses npm registry (HTTP 403 untuk semua paket), tanpa browser, tanpa akses GitHub.

| Pemeriksaan | Status | Bukti / catatan |
|---|---|---|
| Instalasi dependency (`npm install`) | **BLOCKED** | `npm error 403 Forbidden` pada registry mirror |
| TypeScript typecheck penuh (`npm run typecheck`) | **BLOCKED** | `@types/react` dan dependency tidak terpasang |
| Pemeriksaan sintaks TypeScript parsial | **PARTIAL** | `tsc` dengan stub React buatan sendiri: 0 galat sintaks (TS1xxx). Galat tersisa hanya artefak stub (tipe `any`), bukan bukti tipe benar |
| Vitest asli (`npm test`) | **BLOCKED** | vitest tidak dapat dipasang |
| Tes logika lewat shim buatan sendiri (BUKAN Vitest) | **PARTIAL** | 6 file tes dijalankan: 107 lulus, 0 gagal (calculators 21, dev 12, document-converter 33, phase4 5, search 16, nav 14, page-layouts 6). Termasuk 20 tes baru. Tidak boleh dibaca sebagai "Vitest PASS" |
| Render server-side komponen (React 19 + `renderToStaticMarkup`) | **PARTIAL** | 5 halaman converter dirender tanpa galat; grup 3/2/2/2/2; tombol Konversi aktif: 0; sidebar: 1 `aria-current`, submenu ada; 36 kartu, tidak ada tombol di dalam tautan |
| Production build (`npm run build`) | **BLOCKED** | |
| Browser runtime, navigasi, drawer, fokus | **NOT TESTED** | tidak ada browser |
| Responsive 320–1440 px, horizontal overflow | **NOT TESTED** | CSS ditulis dengan `minmax(min(100%,…))`, `overflow-wrap`, dan breakpoint 480/700/900/1280, tetapi belum dilihat |
| Dark/light mode visual | **NOT TESTED** | kontras token dihitung (lihat DESIGN_DECISIONS) |
| Screen reader, WCAG 2.2 AA | **NOT TESTED** | hanya pemeriksaan kode |
| iPhone fisik / Safari iOS | **NOT TESTED** | |
| PWA offline, service worker | **NOT TESTED** | |
| Deploy GitHub Pages | **NOT TESTED** | tidak ada akses; `vite.config.ts` dan workflow tidak diubah |

## Perintah untuk pemeriksa
```bash
npm install && npm run typecheck && npm test && npm run build
npm run dev   # periksa 8 lebar viewport, dark/light, drawer, keyboard
```
