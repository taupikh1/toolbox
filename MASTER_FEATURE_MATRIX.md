# Master feature matrix

Status kemampuan diambil dari source setelah Batch 18. **Pengelompokan menu diperbarui di Batch 19** — lihat `BATCH19_MENU_FEATURE_AUDIT.md`. Kolom di bawah ini tetap soal kemampuan, bukan nama kategori lama.

Bukti tes berarti ada unit test yang menyentuh fungsi itu. "Tes lama" = berkas di `tests/` sebelum Batch 18 yang masih lulus. Bukan uji klik browser.

| Fitur | Asal | Status | Implementasi | Bukti | Batas |
|---|---|---|---|---|---|
| Dashboard, cari, favorit, riwayat, tema | 0–7.1 | AVAILABLE | `App.tsx`, `nav.ts`, `storage.ts` | `nav.test.ts`, `search.test.ts` | Browser NOT VERIFIED |
| Registry + routing hash | 0–7.1 | AVAILABLE | `registry.ts`, `parseRoute` | tes nav | Tool tak dikenal → notfound |
| PWA shell | 9 | PARTIAL | `vite.config.ts` | build menghasilkan sw.js | Offline perangkat NOT VERIFIED |
| Storage manager | 9 | AVAILABLE | `StorageManager.tsx` | `storage-manager.test.ts` | Estimasi kuota bergantung browser |
| PDF Reader | 3 | AVAILABLE | `PdfReader.tsx` | loader + build | Sandi tidak didukung. Font standar memperingatkan di Node |
| PDF Writer gambar/TXT/HTML | 4 | AVAILABLE | `PdfWriter.tsx` | tes phase/writer lama | HTML sederhana. Bukan CSS penuh |
| Image to PDF | 4 | AVAILABLE | tool + kartu `image-to-pdf` | tes registry | Gambar besar diperkecil |
| Merge / Split PDF | 4 | AVAILABLE | `PdfMerge.tsx`, `PdfSplit.tsx` | ada di registry | PDF sandi ditolak |
| PDF Editor | 11 | PARTIAL | `PdfEditor.tsx` | `pdf-editor.test.ts` + kini di menu | Bukan edit teks asli. Crop/freehand tidak ada |
| PDF ke TXT | 18 wire | PARTIAL | `extractPdfPages` | tes Batch 18 | Text layer saja, max 30 halaman |
| PDF ke DOCX | 12 | PARTIAL | `pdf-to-docx.ts` | teks "Halo Batch 18" di document.xml | Bukan tata letak Word |
| PDF ke XLSX | 8 | PARTIAL | `pdf-table/` | `pdf-table.test.ts` | Heuristik. Scan gagal |
| PDF ke PPTX | 12 | PARTIAL | `pdf-to-pptx.ts` | kartu runnable | Gambar. Butuh canvas. Bukan objek edit |
| PDF ke JPG/PNG | rencana | NOT FOUND sebagai eksekusi | definisi `in-development` | kartu tidak runnable | Belum ada renderer unduhan |
| SVG ke PDF | rencana | PLANNED | definisi coming-soon | tidak runnable | |
| Searchable PDF | rencana | UNAVAILABLE | tier C unsupported | tes tier C | |
| DOCX ke TXT/HTML/PDF | 5 | AVAILABLE | `engine/word` | `word-converter.test.ts` | Bukan `.doc`. Gambar DOCX dibuang pada PDF |
| TXT/HTML ke DOCX | 5 | AVAILABLE | `engine/word` | tes word | HTML dasar |
| XLSX ke CSV/JSON/HTML/PDF | 2 | AVAILABLE | `engine/excel` | tes document-converter | Satu sheet CSV. PDF tabel sederhana |
| CSV/JSON/HTML table ke XLSX | 2 | AVAILABLE | `engine/excel` | tes lama | JSON harus array objek |
| PPTX parser + TXT + media list | 6A | AVAILABLE | `engine/powerpoint` | `pptx-parser.test.ts` | Bukan chart/SmartArt |
| PPTX viewer | 6B | PARTIAL | `PptxViewer.tsx` | `pptx-viewer.test.ts` | Teks + gambar, bukan pixel-perfect |
| PPTX writer + gambar ke PPTX | 6C | AVAILABLE | `writer.ts` | `pptx-writer.test.ts` | Bukan impor slide kompleks |
| PPTX ke PDF | 12 | PARTIAL | `pptx-to-pdf.ts` | tes Batch 18 cek `%PDF-` dan label teks | Bukan render visual |
| OCR gambar | 7A | PARTIAL | `engine/ocr` | `ocr-engine.test.ts` | Model tidak di-bundle |
| OCR PDF | 7A | PARTIAL | text layer lalu canvas | tes engine | Butuh DOM untuk halaman tanpa teks |
| Document scanner | 7B | PARTIAL | `DocumentScanner.tsx` | `scanner.test.ts` | Bukan crop perspektif 4 titik. Kamera NOT VERIFIED |
| Document Intelligence | 15 | PARTIAL | `DocumentIntelligence.tsx` | tes kecil | Heuristik, bukan AI |
| Document Assistant | 16 | PARTIAL | `DocumentAssistant.tsx` | `document-assistant.test.ts` | Rule-based. Bukan LLM |
| Local AI Hub | 17 | AVAILABLE sebagai status | `LocalAIHub.tsx` | `local-ai.test.ts` | Inference UNAVAILABLE |
| Image compress/crop/format/exif/watermark | 0–4 | AVAILABLE | `src/tools/image-*` | tes phase4 sebagian | Browser NOT VERIFIED |
| Audio cutter/convert/extract | 5–6 | PARTIAL | FFmpeg | tes multimedia status | Butuh runtime diunduh |
| Audio recorder | 6 | PARTIAL | MediaRecorder | tidak diuji mikrofon | Izin browser |
| Video convert/compress | 13 | PARTIAL | lewat FFmpeg manager | bukan tes media nyata | Tanpa runtime: tidak jalan |
| Subtitle SRT/VTT | 14 | AVAILABLE | `subtitle/parser.ts` | `subtitle.test.ts` | Bukan terjemahan |
| Metadata media | 14 | PARTIAL | `MetadataAnalyzer.tsx` | tes multimedia | Bukan semua codec |
| Insights | 13–14 | PARTIAL | rule-based | tes | Bukan model bahasa |
| QR generate/scan | 0–6 | PARTIAL | qrcode + BarcodeDetector | tes dev | Kamera NOT VERIFIED. URL tidak dibuka otomatis |
| Kalkulator, teks, JSON, hash, dll. | 0–4 | AVAILABLE | tool masing-masing | `calculators.test.ts`, `dev.test.ts` | |
| Online Gotenberg | 7D | UNAVAILABLE | `OnlineConversionNotice` | `online-provider.test.ts` | CORS gagal. Sengaja tidak dipakai |
