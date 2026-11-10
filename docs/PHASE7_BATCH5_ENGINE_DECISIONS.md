# Phase 7 Batch 5 — Keputusan engine Word

Tanggal: 2026-11-09. Lingkungan verifikasi: Node v22.23.3.

## Library yang dipasang

| Library | Range package.json | Versi terpasang | Lisensi | Peran |
|---|---|---|---|---|
| mammoth | ^1.9.0 | 1.13.0 | BSD-2-Clause | Baca DOCX → HTML. Lazy `import()`. |
| docx | ^9.5.0 | 9.15.3 | MIT | Tulis DOCX dari blok sederhana. Lazy `import()`. |
| pdf-lib | ^1.17.1 (sudah ada) | 1.17.1 | MIT | DOCX → PDF otomatis. Tidak ada dialog cetak. |

Tidak dipasang: `docx-preview` (pratinjau memakai HTML hasil Mammoth yang sudah disanitasi; library kedua hanya menduplikasi), Ream/`reamkit` (Spike S1 belum dijalankan; tidak dipakai untuk mengklaim fidelitas Word), DOMPurify (sanitasi allow-list kecil di `blocks.ts` sudah cukup untuk tag yang didukung).

Tidak ada CDN. Worker Mammoth/docx tidak diperlukan; keduanya JavaScript murni. Aset Cache Storage engine tetap kosong (library ikut bundle lazy, bukan unduhan terpisah).

## Pendekatan DOCX → PDF

Dipilih konversi lokal otomatis: Mammoth → blok (heading, paragraf, daftar, tabel, bold/italic) → pdf-lib (Helvetica, A4).

Bukan dialog print / Save as PDF. Pengguna tidak harus memilih printer. Tata letak **tidak** identik dengan Microsoft Word. Gambar, header, footer, text box, dan CSS kompleks tidak ikut. Karakter di luar Latin dasar (WinAnsi) diganti `?` dan dicatat di peringatan hasil.

## Keamanan

- `readZipEntries` hanya membaca central directory. `checkZipEntries` (ZIP bomb, path, ukuran) wajib lolos sebelum Mammoth.
- Macro `vbaProject.bin` tidak dijalankan; hanya peringatan.
- HTML: tag berbahaya dibuang beserta isinya; atribut `on*`, `javascript:`, dan `data:` dibuang. Pratinjau HTML memakai `iframe sandbox=""`. Tidak ada `dangerouslySetInnerHTML`.
- Tidak ada unggahan ke server. Object URL PDF dicabut saat pratinjau diganti.

## Lockfile

Lockfile Batch 4 berisi 467 URL `http://35.245.43.102`. Tidak disunting dengan sed. Dibuat ulang dengan `npm install --registry=https://registry.npmjs.org/`. Hasil bersih (hanya `https://registry.npmjs.org`). Efek samping: `pdfjs-dist` naik dari 6.4.299 ke 6.5.438 di dalam range `^6.4.299` yang sudah ada. Range dependency lain tidak diubah.
