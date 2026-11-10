# Offline / PWA Architecture (Batch 9)

## Build & Deploy

- Vite + vite-plugin-pwa (`registerType: 'autoUpdate'`).
- Base path dari `BASE_PATH` (GitHub Pages: `/toolbox/`).
- Manifest: name, short_name, start_url=scope=base, display=standalone, theme/background `#101114`, icons 192/512.
- Service worker dihasilkan Workbox. Precache: `**/*.{js,css,html,svg,png,webmanifest}`.
- Registrasi: `registerSW({ immediate: true })` di `src/main.tsx`.

## Offline behavior

- Setelah instalasi + precache selesai, app shell (HTML/JS/CSS/ikon/manifest) tersedia offline.
- Navigasi hash routing tetap berfungsi offline (semua rute adalah client-side).
- Fitur yang memproses file lokal (PDF, Excel, Word, PPTX, Scanner, Table Editor) tetap berjalan tanpa jaringan **setelah** asetnya ter-cache.
- First install tetap membutuhkan koneksi ke GitHub Pages.

## Cache strategy

- Precache untuk aset inti (Workbox).
- Cache Storage terpisah untuk engine assets (lihat `engine-manager.ts`).
- Tidak ada runtime caching khusus untuk API eksternal (Batch 7D online tidak aktif).
- Cache lama dibersihkan oleh Workbox pada activate.

## Storage

- localStorage: favorit, riwayat, pengaturan (bukan isi dokumen).
- Cache Storage: precache + engine caches.
- navigator.storage.estimate() digunakan di Storage Manager jika tersedia.
- Object URL di-revoke setelah dipakai (pola di komponen converter).

## Keterbatasan

- Model OCR tidak di-bundle; offline OCR membutuhkan aset di `public/ocr/`.
- Online conversion (Batch 7D) tetap Unavailable.
- Pengujian offline nyata di perangkat: NOT VERIFIED di sesi ini.
