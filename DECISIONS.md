# Keputusan teknis

1. Hash routing sendiri, bukan react-router.
2. Satu registry, tool lazy.
3. Dependency minimal: react, react-dom, qrcode, pdf-lib.
4. Phase 5: @ffmpeg/ffmpeg + @ffmpeg/util. Core single-thread (@ffmpeg/core@0.12.10) di-load dari CDN via Cache Storage on user action. Alasan: GitHub Pages tidak menyediakan COOP/COEP untuk multi-thread SharedArrayBuffer. Single-thread lebih kompatibel mobile.
5. Codec: MP3 (libmp3lame), AAC, WAV, dan container umum didukung build standar. Tidak diklaim semua codec.
6. Cache FFmpeg terpisah agar bisa dihapus tanpa menghapus cache PWA.
7. Satu job aktif. Progress dari event FFmpeg jika tersedia.
8. Video tools (trim, compress, GIF, frame extractor) NOT IMPLEMENTED di Phase 5 — fokus stabilitas audio extractor & converter.

## Phase 7 — keputusan sementara (Batch 0, lihat docs/PHASE7_LIBRARY_DECISIONS.md)
9. LibreOffice-WASM (`matbeedotcom/libreoffice-document-converter`) ditolak: wajib COOP/COEP (tidak bisa di GitHub Pages), ~150 MB WASM, ~240 MB unduhan awal di browser, lisensi MPL-2.0.
10. Ream (`reamkit`, MIT) menjadi kandidat utama untuk DOCX/XLSX/PPTX→PDF dan PDF→DOCX. Status: BELUM DIUJI di browser. Syarat: font disuplai sendiri (tanpa `remoteFontProvider`/CDN), dimuat malas di Worker, dibungkus adapter agar bisa diganti.
11. SheetJS dipakai versi 0.20.3 yang di-vendor (tarball + checksum di repo). Paket npm `xlsx` (0.18.5) tidak dipakai karena 2 kerentanan yang diketahui.
12. pdf.js (render/teks/password), pdf-lib + fontkit (tulis PDF), PptxGenJS (PPTX), Tesseract.js self-host (OCR) dipilih. Tier konversi: A hanya setelah lolos uji browser nyata.
13. Tidak ada engine yang di-precache oleh service worker secara default; engine berat diunduh atas permintaan dan disimpan di Cache Storage bernama-versi.

## Phase 7 — keputusan Batch 1
14. Tidak ada dependensi baru. Ream, SheetJS, Tesseract, pdf.js, LibreOffice tidak dipasang (sesuai ruang lingkup Batch 1).
15. Pencarian: pencocokan per kata (kata penghubung "ke/to/dari" diabaikan), kelompok sinonim, dan ranking; pencocokan substring utuh lama dipertahankan sehingga hasil lama tidak hilang (diuji sebagai superset). Alasan: query "word ke pdf" gagal di logika lama. Sanitizer HTML (DOMPurify atau buatan sendiri) belum diputuskan: ditunda ke batch yang menghasilkan HTML.
16. Satu halaman = satu komponen bersama `ConverterPage` + data dari `ConversionRegistry`. Halaman tidak punya logika sendiri; fitur baru cukup menambah definisi.
17. Fitur yang sudah ada di Phase 4 (Gambar ke PDF, Gabung PDF, Pisah PDF) hanya ditautkan (`existingToolId`), tidak diduplikasi. Hanya ketiganya yang berlabel "Tersedia".
18. Tombol Konversi aktif hanya jika `status === 'READY'`, `availability === 'available'`, dan `execute` ada (`ConversionRegistry.isRunnable`). Batch 1: tidak ada yang memenuhi.
19. Validasi: magic bytes menentukan; MIME hanya peringatan (browser sering salah melaporkan); Office lama (.doc/.xls/.ppt, OLE) ditolak dengan pesan khusus. Validasi hanya membaca 4 KB pertama.
20. Batas ukuran terpusat di `validation/file-limits.ts`. Tanpa deteksi RAM karena tidak ada API yang akurat di semua peramban; override hanya eksplisit.
21. Engine Manager: status dibaca dari Cache Storage nyata (`docengine-<id>-v1`), terpisah dari precache PWA dan cache FFmpeg. `download()` menolak `NO_SOURCE` sampai ada aset yang benar-benar terdaftar; progres unduhan tidak dikarang. Satu pekerjaan berat sekaligus (`runExclusive`).
22. Tes baru ditaruh di `tests/` (bukan `src/.../__tests__/` seperti usulan prompt) karena `vite.config.ts` hanya menjalankan `tests/**/*.test.ts`. Konfigurasi vitest tidak diubah.
23. Tier konversi tetap SEMENTARA; tidak ada yang naik ke "terbukti" tanpa uji browser nyata.

## Phase 7 Batch 5 — Word
24. Baca DOCX dengan Mammoth, tulis DOCX dengan `docx`, PDF dengan pdf-lib yang sudah ada. Ream tidak dipakai: Spike S1 belum ada, dan klaim layout identik tidak boleh dibuat.
25. `docx-preview` tidak dipasang. Pratinjau adalah HTML tersanitasi atau iframe PDF, bukan tampilan Word.
26. DOCX→PDF bersifat otomatis (bukan window.print / Save as PDF) dan terbatas pada heading, paragraf, daftar, dan tabel sederhana.
27. Sanitasi HTML buatan sendiri (bukan DOMPurify): buang script/iframe/dll beserta isi, buang `on*` dan `javascript:`.
28. Lockfile Batch 4 (mirror `35.245.43.102`) tidak disunting manual. Dibuat ulang terhadap `https://registry.npmjs.org/`.


## Phase 7.1 — keputusan (rincian: docs/PHASE7_1_DESIGN_DECISIONS.md)
24. Nilai kategori registry tidak diubah; pengelompokan/label tampilan di `src/nav.ts`, kategori tak dikenal ke "Lainnya".
25. Rute baru `#/category/<slug>`, `#/favorites`, `#/recent`, `#/search`; rute lama tetap. Kueri pencarian tidak masuk URL.
26. Satu tombol menu: drawer di mobile, sidebar dapat diciutkan di desktop (`localStorage['sidebarCollapsed']`).
27. Tidak ada data "populer" karena tidak ada data penggunaan agregat; Favorit/Terakhir hanya tampil bila ada data.
28. Susunan halaman converter ada di `registry/page-layouts.ts` (data penyajian); status/tier/keterbatasan tetap di `conversion-definitions.ts`. Konversi `unsupported` bukan kartu.
29. Tombol Konversi tetap nonaktif (tidak ada yang `isRunnable`); pemeriksaan file diberi label "bukan konversi".
30. Tanpa dependency baru; `vite.config.ts`, workflow deploy, FFmpeg, dan tool Phase 0–6 tidak disentuh.

## Phase 7 Batch 4 — keputusan
35. PDF Writer memakai `pdf-lib@1.17.1` yang sudah ada di dependencies (tidak ada dependency baru). Font standar Helvetica/HelveticaBold cukup untuk Latin/Indonesia.
36. HTML→PDF menggunakan ekstraksi teks terstruktur setelah sanitasi DOM (hapus script, event handler, resource eksternal). Tidak ada renderer layout penuh (Ream/browser headless) agar tetap ringan dan aman.
37. Preview memakai iframe dengan blob URL hasil PDF aktual. Tidak menduplikasi PDF.js; pengguna bisa membuka hasil di PDF Reader jika perlu.
38. Tool baru `pdf-writer` didaftarkan di Tool Registry. Conversion definitions `image-to-pdf`, `txt-to-pdf`, `html-to-pdf` menunjuk ke existingToolId: 'pdf-writer'.
39. Tidak ada backend, CDN runtime, atau upload file. Semua proses lokal.
