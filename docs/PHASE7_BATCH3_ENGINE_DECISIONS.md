# Phase 7 Batch 3 — Engine Decisions (PDF Reader)

Tanggal: 2026-11-09

## Engine yang dipilih

| Engine | Paket | Versi | Lisensi | Peran |
|--------|-------|-------|---------|-------|
| PDF.js | `pdfjs-dist` | 6.4.299 | Apache-2.0 | Render halaman, ekstraksi teks, pencarian teks, text layer |

## Alasan pemilihan

- Standar industri untuk render PDF di browser (Mozilla).
- Tidak membutuhkan backend atau CDN runtime.
- Worker dapat di-self-host via Vite `?url` import → aset masuk ke bundle/build.
- Mendukung text layer (seleksi & salin teks) dan `getTextContent` untuk pencarian.
- Lazy-load: chunk terpisah (~484 KB / ~145 KB gzip).
- Versi ≥ 6.2.108 menghindari CVE-2026-16633 (arbitrary JS execution pada PDF berbahaya di rentang 5.6.x–6.1.x).

## Konfigurasi keamanan

```ts
getDocument({
  data: ...,
  disableAutoFetch: true,
  disableStream: false,
  useSystemFonts: false,
})
```

- Tidak memakai `eval` / `isEvalSupported`.
- Tidak auto-fetch resource eksternal dari dalam PDF.
- File tidak pernah dikirim ke server.

## Worker

```ts
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
```

Worker di-bundle oleh Vite; tidak ada permintaan ke unpkg/cdnjs saat runtime.

## Batasan yang diketahui

- PDF berpassword: ditolak dengan pesan jelas (belum diimplementasi dialog password).
- PDF berbasis gambar murni: tidak ada teks yang bisa dicari/diseleksi (OCR → Batch 8).
- Continuous mode merender jendela halaman di sekitar halaman aktif (bukan seluruh dokumen sekaligus) untuk menghemat memori.
- Batas ukuran soft: 80 MB.
- Full annotation / form filling / digital signature: di luar scope Batch 3.

## Tidak dipakai

- react-pdf / @react-pdf-viewer: menambah abstraksi dan ukuran; kita butuh kontrol penuh atas toolbar & mode.
- PDF.js viewer lengkap dari Mozilla: terlalu besar dan sulit diintegrasikan ke design system yang ada.
