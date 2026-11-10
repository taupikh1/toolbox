# BATCH 20 — Offline Verification

## Target

Setelah model + runtime + aset pendukung tersedia lokal, inference harus berjalan tanpa request jaringan.

## Yang sudah disiapkan

- Model hanya diunduh saat user menekan tombol Download.
- Penyimpanan: Cache Storage (`vocal-separator-models-v1`).
- SHA256 diverifikasi sebelum status READY.
- Tidak ada auto-download saat buka halaman.

## Yang belum diverifikasi (NOT VERIFIED)

| Uji | Status |
|-----|--------|
| Model tetap terdeteksi setelah tutup & buka browser | NOT VERIFIED (membutuhkan browser nyata) |
| Inference tanpa internet (mode pesawat) | NOT VERIFIED (inference belum ada) |
| Network panel kosong selama proses separation | NOT VERIFIED |
| FFmpeg core offline untuk path video | DITUNDA |

## Catatan

Jangan mengklaim offline-first penuh sampai real inference + cache model + network panel diuji di perangkat nyata.
