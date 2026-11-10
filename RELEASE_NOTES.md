# Release notes — Batch 19

Keputusan: **READY WITH LIMITATIONS**.

Batch 19 tidak menambah fitur. Menu mengikuti registry. Teks yang masih bilang "konversi belum berjalan" dihapus. Uji iPhone, Android, dan reload offline tetap belum ada.

Rincian Batch 18 di bawah ini masih berlaku untuk kemampuan konversi.

# Release notes — Batch 18

Keputusan: **CONDITIONAL RELEASE**.

Aplikasi tidak dinyatakan sempurna. Fungsi utama yang diuji unit berjalan. Uji iPhone, Android, dan reload offline belum ada.

## Tersedia (kode + tes)

- Dasbor, pencarian, favorit, riwayat, tema, backup, hash routing.
- PDF Reader, PDF Writer (gambar/TXT/HTML sederhana), merge, split, PDF Editor (halaman + anotasi, bukan edit teks asli).
- Gambar: kompres, crop, format, watermark, hapus EXIF.
- Excel: XLSX ke CSV, JSON, HTML, PDF sederhana; CSV/JSON/tabel HTML ke XLSX.
- Word: DOCX ke TXT, HTML, PDF; TXT dan HTML sederhana ke DOCX.
- PowerPoint: parser, viewer teks dan gambar, writer, gambar ke PPTX, PPTX ke TXT.
- PDF ke TXT dan PDF ke DOCX dari text layer (bukti tes: teks "Halo Batch 18" ada di `word/document.xml`).
- PDF ke Excel heuristik bila text layer membentuk baris.
- PPTX ke PDF teks (bukan render slide). Tanda tangan berkas `%PDF-` dicek, isi visual tidak diklaim.
- Subtitle SRT/VTT, kalkulator, developer tools, QR.
- Document Assistant rule-based.
- Local AI Hub menampilkan UNAVAILABLE.

## Parsial

- PDF ke PPTX: gambar halaman, hanya di browser (canvas).
- OCR dan scanner: butuh berkas bahasa di `public/ocr/`. Belum di-bundle.
- Audio/video dan audio cutter: butuh unduhan FFmpeg sekali.
- Insights dan metadata media: rule-based / informasi dasar.
- Document Intelligence: heuristik, bukan model.

## Tidak tersedia

- Inference AI lokal, speech-to-text, searchable PDF.
- PDF ke JPG/PNG, SVG ke PDF.
- File `.doc` lama, PDF ber-sandi.
- URL ke PDF (CORS).
- Render PowerPoint yang identik (animasi, chart, SmartArt).

## Bug yang diperbaiki

Lihat tabel di `NEXT_AI_HANDOFF.md` (B18-001 sampai B18-009).

## Bug / batas yang masih ada

- Chunk utama Document Converter besar (~1.2 MB). Belum dipecah.
- PWA precache sekitar 2.8 MB.
- pdf.js memperingatkan `standardFontDataUrl` saat ekstraksi teks di Node. Teks uji tetap terbaca. Font khusus tidak di-bundle.
- OCR tanpa model gagal dengan pesan, bukan hasil palsu.
- Tidak ada uji memori iPhone untuk PDF besar. Batas halaman sengaja dipasang (30 PDF teks, 20 PDF gambar).

## Browser dan offline

- Desktop: logika diuji di Node. Render UI tidak diuji di browser pada sesi ini.
- Android Chrome dan iPhone Safari: NOT VERIFIED.
- Shell PWA dapat di-cache setelah kunjungan online. Model OCR dan FFmpeg tidak otomatis offline.

## Keamanan

- File diproses di perangkat. Tidak ada unggah ke server aplikasi.
- HTML hasil konversi di-escape. Pratinjau Word memakai iframe `sandbox`.
- JavaScript di dalam PDF dimatikan (`isEvalSupported: false`) pada jalur yang diubah.
- ZIP OOXML tetap lewat penjaga jumlah entri, ukuran, rasio, dan path.
