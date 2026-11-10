# Performance & Mobile QA — Batch 10

## Bundle

- Build menghasilkan chunk terpisah.
- Tool components lazy-loaded.
- Precache ~2.7 MB (65 entries).

## Memory

- PDF table extraction dibatasi 30 halaman.
- OCR memproses halaman satu per satu.
- Scanner memproses satu gambar pada satu waktu.
- Object URL dibersihkan.

## Mobile

- Layout responsif ada di beberapa komponen (min-height 44px, overflow-x auto).
- Pengujian perangkat nyata: NOT VERIFIED.

## Angka performa

Tidak diukur (tidak ada Lighthouse/browser timing di sesi ini).
