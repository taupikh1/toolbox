# Phase 7.1 — Audit UI/UX (kondisi awal dan temuan)

Sumber: isi `Toolbox-batch1.zip` (kode di repo saat unggahan). Audit dilakukan dengan membaca kode; **tidak ada audit visual di browser** (BLOCKED, lihat PHASE7_1_TEST_REPORT.md).

## Kondisi awal
- Shell: satu `App.tsx` (230 baris). Sidebar di desktop, di mobile berubah menjadi strip horizontal yang bisa digeser berisi semua kategori.
- Kategori hanya state lokal (`useState`), bukan rute: tombol Back/Forward dan URL langsung tidak bisa menuju kategori atau Favorit.
- Kartu tool: `<a>` yang membungkus `<button>` favorit (HTML tidak valid, dua kontrol interaktif bersarang).
- Pencarian ada di beranda saja. Keadaan kosong hanya satu kalimat.
- Lima halaman converter memakai satu kerangka yang sama: daftar datar kartu + detail di paling bawah halaman.
- Tidak ada skip link, tidak ada pengelolaan fokus saat pindah halaman, drawer tidak ada.

## Temuan dan prioritas
| # | Temuan | Prioritas | Penanganan |
|---|---|---|---|
| 1 | Navigasi mobile berupa strip geser; kategori panjang sulit dijangkau | Tinggi | Drawer dengan scrim, Escape, kurung fokus |
| 2 | Kategori/Favorit tanpa rute | Tinggi | Rute `#/category/<slug>`, `#/favorites`, `#/recent`, `#/search` |
| 3 | Document Converter tanpa submenu | Tinggi | Submenu lima halaman di sidebar |
| 4 | Tombol di dalam tautan pada kartu | Sedang | `ToolCard`: tautan dan tombol bersaudara |
| 5 | Halaman converter generik, detail jauh dari kartu | Tinggi | `PAGE_LAYOUTS`: grup per fungsi; detail muncul di bawah grupnya |
| 6 | Pemeriksaan file bisa terbaca sebagai konversi | Tinggi | Judul "Periksa kelayakan file (bukan konversi)", teks hasil "Sesuai format X" |
| 7 | Teks status halaman masih menyebut "Batch 1" | Rendah | Diganti teks yang menjelaskan keadaan nyata |
| 8 | Tidak ada skip link / fokus rute / judul dokumen | Sedang | Ditambahkan |
| 9 | Pencarian tanpa sinonim kompres/gabung/pisah/jpeg | Sedang | Empat kelompok sinonim ditambahkan |
| 10 | `checkFiles` tanpa penanganan galat | Rendah | try/catch + pesan |

## Masalah lama yang TIDAK diubah (di luar ruang lingkup)
- Indikator "siap offline" memakai heuristik cache `precache`; di `npm run dev` tidak pernah true (perilaku lama).
- Tidak ada error boundary untuk gagal memuat chunk lazy saat offline dan chunk belum ada di cache (perilaku lama).
- `package-lock.json` masih mencatat versi 0.2.0 (sudah dicatat di HANDOFF Batch 1); `npm install` akan menyelaraskannya.
- Video tools Phase 5: tetap NOT IMPLEMENTED.
