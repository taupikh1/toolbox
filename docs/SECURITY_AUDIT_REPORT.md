# Security Audit Report — Batch 10

## Threat model

Aplikasi browser-only, pemrosesan lokal. Risiko utama: file berbahaya (ZIP bomb, path traversal, XSS via HTML), kebocoran data jika fitur online diaktifkan.

## File upload

- Validasi ekstensi, MIME, signature (magic bytes) ada di `validation/file-signature.ts` dan `file-validator.ts`.
- Batas ukuran terpusat di `file-limits.ts` (PDF 50MB, Office 30MB, Image 20MB, Text 10MB).

## ZIP / XML

- `ooxml-guard.ts`: batas entri, ukuran, rasio kompresi, path tidak aman (`..`, `/`, `\`, drive).
- Guard harus dipanggil sebelum ekstraksi (sudah didokumentasikan).

## XSS

- Tidak ditemukan `dangerouslySetInnerHTML`.
- Satu `innerHTML = ''` di PdfReader (clear, bukan inject).
- HTML export table memakai escape dasar.

## Privacy

- Tidak ada upload otomatis.
- Online Conversion menampilkan peringatan dan status Unavailable.
- Object URL di-revoke di komponen converter.
- localStorage hanya pengaturan/riwayat/favorit.

## Dependency

- Tidak ada audit CVE penuh di sesi ini (jaringan terbatas).
- Lockfile bersih (hanya registry.npmjs.org).
- Tidak ada API key atau secret di source.

## Temuan

| Severity | Temuan | Status |
|---|---|---|
| Low | OCR model tidak di-bundle (bukan risiko keamanan) | Info |
| Info | Online 7D Unavailable — tidak ada upload | OK |
| Info | ZIP bomb guard ada | OK |

Tidak ada temuan P0/P1 keamanan.
