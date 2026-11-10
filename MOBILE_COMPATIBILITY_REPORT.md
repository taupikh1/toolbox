# Mobile compatibility — Batch 18

Tidak ada perangkat fisik di sesi ini. **Jangan membaca laporan ini sebagai PASS iPhone atau Android.**

## Yang dicek dari kode

- Layout memakai breakpoint sekitar 900px, drawer, dan skip link (Phase 7.1).
- Target sentuh utama memakai kelas `.btn`. Tidak diukur pikselnya di perangkat.
- Input file memakai `<input type="file">` dan dropzone. iOS Safari kadang tidak mengirim drag-and-drop; unggah lewat pemilih file tetap jalur utama.
- PDF ke PPTX membatasi canvas 1600px dan 20 halaman agar mengurangi risiko tab crash. Belum diukur di iPhone.
- PDF teks dibatasi 30 halaman.
- Tidak ada base64 permanen untuk seluruh file PDF pada jalur DOCX. PDF→PPTX masih memakai data URL gambar per slide. Itu berat di memori. Statusnya PARTIAL.

## Matrix

| Lingkungan | Hasil |
|---|---|
| Node 22 (logika) | PASS untuk tes unit |
| Desktop Chrome / Edge / Firefox | NOT VERIFIED (tidak ada sesi klik) |
| Android Chrome | NOT VERIFIED |
| iPhone Safari | NOT VERIFIED |

## Risiko yang diketahui tanpa bukti perangkat

- Chunk JS besar (pdf.js + halaman converter) memperlambat unduhan pertama di seluler.
- PWA precache ~2.8 MB.
- OCR dan FFmpeg menambah unduhan dan RAM.
- Keyboard dapat menutupi textarea tempel di halaman Word. Tidak diuji.
