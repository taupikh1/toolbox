# Batch 19 — Audit menu dan fitur

Sumber: ZIP Batch 18 yang diekstrak, lalu dihitung dari `src/tools/registry.ts` dan `src/nav.ts`. Bukan dari klaim dokumen batch lama.

## Kondisi awal

| | Jumlah |
|---|---|
| Tool di registry | 47 |
| Kategori (tanpa All Tools) | 10 |
| Kelompok sidebar | 6 (Dokumen, Gambar & PDF, Developer & Teks, Kalkulator & Utilitas, Media, Sistem) |
| Route hash | `/`, `/search`, `/favorites`, `/recent`, `/category/:slug`, `/tools/:id` |
| Tool tanpa menu | 0. Semua tool muncul karena kategori diturunkan dari registry. |
| Menu tanpa tool | 0 |
| Tool di lebih dari satu kategori registry | 0 |

Yang salah tempat, bukan hilang:

- PDF Merge dan PDF Split di kategori `Image & PDF`, sementara Reader, Writer, Editor, dan Image to PDF di `PDF Tools`.
- Image Crop, Format, EXIF, Color, Watermark di `Image & PDF`. Image Compressor sendirian di `Image Tools`.
- PDF Converter (termasuk XLSX tidak di sini) ada di Document Converter. XLSX ke CSV bukan tool mandiri; ia kartu di Excel Converter. Itu satu mesin, bukan tool tersembunyi.
- Extract Insights di Media Tools. Document Intelligence, Document Assistant, dan Local AI Hub di System.
- Unit Converter dan Pomodoro di `Calculator & Converter` (2 tool), terpisah dari Calculators.
- Backup ada di Developer Tools dan sekali lagi sebagai tautan footer. Footer adalah jalan pintas, bukan implementasi kedua.

Fungsi yang sama, dua pintu:

- Image to PDF (tool) dan PDF Writer (juga menerima gambar). Kartu konversi `image-to-pdf` membuka PDF Writer. Dipertahankan keduanya; kartu sekarang membuka tool Image to PDF.
- PDF ke Word ada di halaman PDF dan halaman Word. Satu definisi `pdf-to-docx`, dua `pages`. Sengaja.
- Gabung/Pisah PDF ada sebagai tool dan sebagai kartu yang menaut ke tool yang sama (`existingToolId`).

Tidak ada tool yang route-nya tidak bisa di-parse. `parseRoute('/tools/<id>')` memakai id registry.

## Sesudah

Registry tetap satu-satunya daftar tool. `nav.ts` hanya label, kelompok, alias slug, dan kategori yang submenu-nya dibuka.

| Kategori registry | Label | Tool |
|---|---|---|
| PDF Tools | PDF | 7: Reader, Writer, Editor, Image to PDF, Merge, Split, PDF Converter |
| Document Converter | Dokumen | 5: Word, Excel, PowerPoint, OCR & Scanner, Document Intelligence |
| Image Tools | Gambar | 6: Compressor, Crop, Format, EXIF, Color, Watermark |
| Media Tools | Audio & Video | 6: Media Tools, Audio Cutter, Audio Recorder, Multimedia Suite, Subtitle, Metadata |
| AI & Intelligence | AI & Ringkasan | 3: Extract Insights, Document Assistant, Local AI Hub |
| Text Tools | Teks | 2 |
| Developer Tools | Developer | 10 (backup keluar) |
| Calculators | Kalkulator | 6 (termasuk satuan dan Pomodoro) |
| System | Sistem | 2: Penyimpanan, Backup & Restore |

Kategori `Image & PDF` dan `Calculator & Converter` tidak punya tool lagi, jadi tidak ditampilkan. Tidak dibuat kategori Spreadsheet atau Presentasi terpisah: masing-masing hanya satu halaman pusat, dan kategori satu tool dilarang spec tanpa alasan kuat.

Submenu sidebar: PDF, Dokumen, AI & Ringkasan. Sisanya satu ketukan ke halaman kategori.

Alias bookmark:

- `#/category/image-dan-pdf` → Gambar (bukan campuran PDF). Merge/Split ada di PDF.
- `#/category/calculator-dan-converter` → Kalkulator.

Jalan pintas yang dipertahankan:

- Footer "Pengaturan & Backup" → `backup-restore` (kategori Sistem).
- Kartu TXT/HTML ke PDF → PDF Writer.
- Kartu Gabung/Pisah → tool yang sama.
- PDF ke Word tampil di dua halaman converter, satu handler.

Duplikasi menu yang dihapus: tidak ada entri registry yang dihapus. Yang hilang hanya nama kategori kosong.

Tes: `tests/menu-sync.test.ts` (id unik, kategori tidak kosong, route, shortcut `existingToolId`, pencarian nama, XLSX ke CSV dan Image to PDF).
