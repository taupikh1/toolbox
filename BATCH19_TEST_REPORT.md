# Batch 19 — Test report

Lingkungan: Node v22.23.3. Perintah dijalankan di folder source Toolbox Offline setelah `npm install --registry=https://registry.npmjs.org/`. Lockfile tidak berubah dibanding ZIP Batch 18 (`cmp` identik).

## Sebelum

Angka Batch 18 dari `NEXT_AI_HANDOFF.md` sesi sebelumnya, bukan diulang di mesin ini sebelum edit:

```text
npm test    # 25 file, 179 passed
```

## Sesudah (keluaran sesi ini)

```text
npm run typecheck
# toolbox-offline@0.5.0 typecheck
# tsc --noEmit
# exit 0

npm test
# Test Files  26 passed (26)
# Tests       187 passed (187)
# Duration    8.11s

npm run build
# vite v5.4.21
# ✓ built in 9.36s
# PWA precache 72 entries (2838.44 KiB)
# peringatan chunk > 500 kB (ConverterPage ~1.2 MB, pdf.js ~558 kB)
# exit 0
```

Selisih 179 → 187: `tests/menu-sync.test.ts` (6) dan dua kasus navigasi tambahan di `tests/nav.test.ts`. Tidak ada tes lama yang dihapus. Tes yang mengunci kategori `Image & PDF` dan `Calculator & Converter` diubah karena kategori itu memang sengaja dibubarkan; asersi baru memastikan tool lama tetap ada dan slug lama masih terbuka.

`tests/batch18-regression.test.ts`: 9 passed, termasuk escape HTML, entitas XML, dan `pdfToDocx`.

Peringatan stderr yang sudah dikenal: `standardFontDataUrl` dari pdf.js saat tes DOCX di Node. Bukan kegagalan.

Browser fisik, Lighthouse, dan reload offline: NOT VERIFIED.
