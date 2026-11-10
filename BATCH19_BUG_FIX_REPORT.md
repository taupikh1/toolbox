# Batch 19 — Bug fix report

Prioritas dari bukti di source Batch 18, bukan dari asumsi.

## Diperbaiki

| ID | Severity | Bukti | Perbaikan |
|---|---|---|---|
| B19-001 | HIGH | `ConverterLayout.tsx` menulis "Konversi baru belum berjalan: yang bisa dipakai hanya tool PDF yang ditautkan" padahal handler Word, Excel, PDF→TXT/DOCX/XLSX dan PPTX→PDF teks sudah `available`. | Pita diganti: kartu Tersedia bisa dijalankan, keterbatasan ada di detail, kartu lain belum bisa dikonversi. |
| B19-002 | HIGH | Footer beranda dan intro kategori Document Converter mengulang kalimat Batch 1 yang sama. | Copy mengikuti status nyata. Lihat `App.tsx` dan `CATEGORY_INTRO`. |
| B19-003 | HIGH | PDF Merge/Split tidak sekelompok dengan PDF lain. Tool gambar terpecah. AI dan Insights ada di Sistem/Media. | Kategori registry dipindah. Tidak ada tool yang dihapus. |
| B19-004 | MEDIUM | `existingToolId` kartu `image-to-pdf` adalah `pdf-writer`, sehingga "Gambar ke PDF" tidak membuka tool mandiri. | Menjadi `image-to-pdf`. TXT/HTML ke PDF tetap ke PDF Writer. |
| B19-005 | MEDIUM | Local AI Hub tidak punya badge, jadi terlihat seperti tool yang siap inferensi. Media Tools dan Audio Cutter tidak menandai bahwa FFmpeg belum terpasang. | Badge "Tidak ada model" dan "Butuh FFmpeg". |
| B19-006 | LOW | Halaman OCR menulis "OCR belum bisa dipakai, online maupun offline" sementara engine ada dan gagal hanya tanpa model. | Kalimat diganti: tanpa berkas bahasa di folder `ocr`, ekstraksi gagal. |
| B19-007 | LOW | Setiap kartu konversi menampilkan badge Tier A/B di samping status. | Tier tidak ditampilkan di daftar. Tetap ada di panel detail. |
| B19-008 | LOW | Penyimpanan dan Backup memakai ikon yang sama. | Penyimpanan memakai ikon lain. |

## Tidak rusak (regresi Batch 18 dicek ulang)

Tes `tests/batch18-regression.test.ts` lulus di sesi ini, termasuk:

- `escapeHtml` meng-escape `<`, `&`, `"`.
- HTML tabel PDF meng-escape `<script>`.
- `decodeXml` pada teks PPTX.
- `pdfToDocx` menghasilkan DOCX berisi teks, tidak timeout `Promise.try`.
- PDF Editor ada di registry, dan sekarang kategorinya PDF Tools.

## Tidak diperbaiki (bukan karena disembunyikan)

- PDF ke JPG/PNG dan SVG ke PDF masih `in-development` / `coming-soon`. Kartu tetap tampil dengan status itu.
- Searchable PDF tetap `unsupported` dan tidak menjadi kartu aktif.
- Model OCR dan runtime FFmpeg tidak di-bundle.
- Inference Local AI tidak ada.
- Chunk `ConverterPage` ~1.2 MB. Tidak dipecah; peringatan build yang sama dengan Batch 18.
- Tidak ada uji klik di iPhone atau Android.
