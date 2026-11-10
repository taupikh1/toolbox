# Phase 7 Batch 7D — Online Conversion Engine

Tanggal: 2026-11-10

## Hasil verifikasi

Demo Gotenberg (`https://demo.gotenberg.dev`) **tidak mendukung CORS** dari browser (tidak ada `Access-Control-Allow-Origin` pada preflight).

Oleh karena itu:
- PPTX → PDF online: **Unavailable**
- PPTX → PNG / JPG online: **Unavailable**
- Tidak ada tombol yang mengklaim konversi berhasil.

## Yang ditambahkan

Fondasi provider (interface, konfigurasi terpusat, client yang menolak jika CORS tidak ada) + notice UI yang jujur.

## Verifikasi kode

typecheck PASS, npm test 145 PASS, build PASS, lockfile bersih.
