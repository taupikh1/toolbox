# Phase 7 — Status Fitur (setelah Batch 1)

> Usang untuk Excel (Batch 2) dan Word (Batch 5). Status terkini: `docs/PHASE_7_PROGRESS.md` dan `NEXT_AI_HANDOFF.md`.

Tidak ada fitur konversi baru yang berfungsi. Tier sementara. "Tersedia" = tool Phase 4 yang sudah ada (belum diuji ulang di sesi ini).

| Halaman | Fitur | Tier | Label | Catatan |
|---|---|---|---|---|
| PDF | PDF ke JPG / PNG / TXT | A | Dalam pengembangan | pdf.js belum dipasang |
| PDF | PDF ke Word | B | Segera hadir | rekonstruksi perkiraan; Ream belum diuji |
| PDF | PDF ke Excel | B | Segera hadir | rekonstruksi tabel heuristik, tanpa jaminan |
| PDF | PDF ke PowerPoint | B | Segera hadir | |
| PDF | Gambar ke PDF | A | **Tersedia** | tautan ke tool `image-to-pdf` |
| PDF | TXT ke PDF | A | Dalam pengembangan | non-Latin butuh font tertanam |
| PDF | HTML ke PDF, SVG ke PDF | B | Segera hadir | |
| PDF | Gabung PDF / Pisah PDF | A | **Tersedia** | tautan ke `pdf-merge`, `pdf-split` |
| Word | DOCX ke TXT, TXT ke DOCX | A | Dalam pengembangan | |
| Word | DOCX ke HTML, HTML ke DOCX | B | Segera hadir | |
| Word | DOCX ke PDF | B | Segera hadir | menunggu Spike S1 |
| Excel | XLSX ke CSV / JSON, CSV ke XLSX, JSON ke XLSX | A | Dalam pengembangan | menunggu SheetJS vendor |
| Excel | XLSX ke HTML, Tabel HTML ke XLSX | B | Segera hadir | |
| Excel | XLSX ke PDF | B | Segera hadir | menunggu Spike S1 |
| PowerPoint | PPTX ke TXT, ekstraksi media, Gambar ke PPTX | A | Dalam pengembangan | |
| PowerPoint | PPTX ke PDF | B | Segera hadir | tanpa janji tata letak identik |
| OCR | OCR gambar, ekspor TXT | A | Dalam pengembangan | Tesseract + model belum ada |
| OCR | OCR PDF scan, ekspor DOCX | B | Segera hadir | |
| OCR | Bahasa Indonesia / Inggris | n/a | Belum diunduh | model belum ada |
| OCR | Searchable PDF | C | Tidak didukung | belum terbukti layak |

## Yang bekerja di Batch 1 (logika diuji lewat shim)
Pemeriksaan kelayakan file, batas ukuran, guard ZIP, registry, Engine Manager (status, eksklusif, cancel, clear), pencarian.
