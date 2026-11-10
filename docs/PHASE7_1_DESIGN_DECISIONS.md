# Phase 7.1 — Keputusan desain

1. **Nilai kategori registry tidak diubah.** Pengelompokan dan label Indonesia ada di `src/nav.ts` (`GROUP_MAP`, `CATEGORY_LABELS`). Kategori baru yang tidak ada di peta masuk "Lainnya" otomatis, jadi sidebar tetap terhubung ke registry. Dikunci oleh `tests/nav.test.ts`.
2. **Rute baru, rute lama tetap.** `#/`, `#/tools/<id>` tidak berubah. Ditambah `#/category/<slug>`, `#/favorites`, `#/recent`, `#/search`. Pencarian tidak menaruh kueri di URL (kueri tetap state); `#/search` hanya menandai mode hasil agar Back bekerja.
3. **Satu tombol menu, dua perilaku.** Mobile (<900px): drawer. Desktop: sidebar dapat diciutkan, pilihan disimpan di `localStorage['sidebarCollapsed']`.
4. **Header global:** menu, logo, pencarian, status koneksi/cache, tema. Status memakai `navigator.onLine` dan pengecekan cache yang sudah ada; tidak ada status palsu.
5. **Beranda tanpa data karangan.** Bagian Favorit dan Terakhir dibuka hanya muncul jika ada data. Tidak ada "populer" karena tidak ada data penggunaan agregat.
6. **Kartu tool standar (`ToolCard`)**, kartu kategori, dan kartu fitur converter memakai token yang sama (`--r`, `--bd`, `--shadow`). Warna aksen tetap satu (`--ac`); `--ok`, `--er`, `--warn` hanya untuk status.
7. **Halaman converter:** kerangka bersama dipertahankan, tetapi susunan (`registry/page-layouts.ts`) khusus per halaman: grup, catatan, penjelasan slide gambar vs dapat diedit (PowerPoint), panel bahasa OCR. Status, tier, dan keterbatasan tetap dari `conversion-definitions.ts` (tidak diubah). Fitur `unsupported` (Searchable PDF) tidak jadi kartu.
8. **Tidak ada tombol palsu:** tombol Konversi tetap `disabled` kecuali `ConversionRegistry.isRunnable` (tidak ada yang memenuhi). Dikunci oleh `tests/page-layouts.test.ts`. Tidak ada progress atau unduhan.
9. **Aksesibilitas:** skip link, fokus ke konten saat rute berubah (tidak saat mengetik di pencarian), `aria-current`, `aria-pressed`, `aria-expanded`, label ikon, area sentuh 44px, `role=status` untuk perubahan hasil.
10. **Tidak ada dependency baru, tidak ada perubahan `vite.config.ts`, workflow deploy, FFmpeg, atau tool Phase 0–6.**

## Kontras (dihitung dari token, bukan dari browser)
Semua pasangan teks utama/sekunder/aksen/status ≥ 4,9:1 di tema gelap dan terang (terendah: `--warn` di kartu terang 4,92:1). Ini hanya perhitungan token; kontras aktual di browser NOT TESTED.
