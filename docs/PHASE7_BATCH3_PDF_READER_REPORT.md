# Phase 7 Batch 3 — PDF Reader Report

## Status: IMPLEMENTED (READY WITH KNOWN LIMITATIONS)

## Fitur yang selesai

### A. Membuka PDF
- File picker
- Drag & drop
- Validasi ekstensi + magic bytes `%PDF`
- Tampil nama, ukuran, jumlah halaman
- Error jelas untuk non-PDF, kosong, rusak, terlalu besar, berpassword

### B. PDF Viewer
- Render halaman via canvas (pdf.js)
- Zoom in / out / 100% / fit width / fit page
- Navigasi prev/next + input nomor halaman
- Indikator halaman saat ini / total
- Loading & error state
- Keyboard: ←/→, PageUp/Down, Home/End, Ctrl+/- /0

### C. Tampilan dokumen
- Mode satu halaman
- Mode continuous scroll (render jendela ± halaman aktif)
- Latar nyaman, kertas putih, label halaman di mode gulir
- Responsive (toolbar wrap di mobile)

### D. Toolbar
- Buka, prev, page input, next, zoom −/%/+, fit width, fit page, 100%, mode Satu/Gulir, fullscreen, tutup
- Tombol yang belum berfungsi tidak ditampilkan

### E. Pencarian teks
- Cari kata/frasa (case-insensitive)
- Jumlah kecocokan + navigasi hasil
- Melompat ke halaman yang berisi hasil
- (Highlight visual pada text layer bersifat best-effort; bergantung pada layout PDF)

### F. Seleksi & salin teks
- Text layer diaktifkan bila memungkinkan
- Teks dapat dipilih/disalin pada PDF berbasis teks
- PDF gambar dijelaskan membutuhkan OCR (Batch 8)

### G. Memory & performance
- Lazy-load `pdfjs-dist` + worker
- Render on-demand, batasi devicePixelRatio ≤ 2
- Cancel render task saat ganti halaman/zoom/tutup
- `page.cleanup()` + `doc.cleanup()` saat tutup
- Soft limit 80 MB

### H. Security
- Tidak eval, tidak auto-fetch resource eksternal
- Semua pemrosesan lokal
- Tidak menyimpan dokumen permanen

## Fitur yang belum / batasan
- Dialog password untuk PDF terenkripsi
- Highlight visual penuh hasil pencarian (bergantung struktur text layer)
- Virtualisasi penuh ratusan halaman di continuous mode (saat ini render jendela kecil)
- Annotation, form, signature, outline/bookmarks sidebar
- OCR (Batch 8)

## Library
- `pdfjs-dist@6.4.299` (Apache-2.0)

## File utama
- `src/tools/pdf-reader/PdfReader.tsx`
- `src/tools/pdf-reader/pdfjs-loader.ts`
- Registrasi di `src/tools/registry.ts`
- Gaya di `src/styles.css`

## Verifikasi
- `npm run typecheck` — PASS
- `npm test` — 107 tests PASS
- `npm run build` — PASS (PdfReader chunk ~12 KB gzip; pdf.js ~145 KB gzip terpisah)
