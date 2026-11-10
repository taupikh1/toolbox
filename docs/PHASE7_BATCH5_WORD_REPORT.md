# Phase 7 Batch 5 — Word Converter

## Yang berfungsi

| Konversi | Status | Cara |
|---|---|---|
| DOCX → TXT | Berfungsi | Mammoth → teks UTF-8. Tabel dipisah tab. |
| DOCX → HTML | Berfungsi | Blok yang sama, HTML disanitasi, charset UTF-8. |
| DOCX → PDF | Berfungsi, terbatas | Otomatis via pdf-lib. Bukan Save as PDF. |
| TXT → DOCX | Berfungsi | Paragraf (baris kosong) dan baris. Nama file bisa diatur. Tempel teks atau unggah. |
| HTML → DOCX | Berfungsi, terbatas | Heading, paragraf, daftar, tabel, bold, italic, perataan dasar. |

Halaman: Word Converter (`#/tool/doc-word-converter` lewat hash router aplikasi). Tombol Konversi memanggil `execute` di registry. Unduhan berasal dari blob hasil proses.

## Yang belum

- PDF → DOCX (masih Segera hadir).
- File `.doc` Office lama (ditolak).
- OCR, PowerPoint, PDF → Excel.

## Keterbatasan format (wajib diketahui)

- Bukan salinan visual Microsoft Word atau halaman HTML.
- Gambar di dalam DOCX diabaikan.
- Header, footer, komentar, catatan kaki, text box, dan macro tidak dijalankan dan tidak dijamin ikut.
- PDF memakai font Helvetica. Karakter di luar Latin dasar bisa menjadi `?`.
- Justify pada PDF dirender sebagai rata kiri.
- Tebal/miring di dalam paragraf disederhanakan pada PDF; heading tetap tebal. HTML dan DOCX mempertahankan bold/italic.
- CSS kompleks, layout, dan gambar HTML tidak dipertahankan.

## Pratinjau

- TXT: teks di `<pre>`.
- HTML dan DOCX: iframe `sandbox=""` (skrip tidak jalan).
- PDF: iframe blob. Object URL dicabut saat komponen lepas.

## Dependency

Lihat `docs/PHASE7_BATCH5_ENGINE_DECISIONS.md`.
