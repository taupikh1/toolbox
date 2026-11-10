# Status phase

| Item | Status |
|---|---|
| Phase 0–4 | IMPLEMENTED |
| Phase 5 FFmpeg Module Manager | IMPLEMENTED |
| Phase 5 Audio Extractor | IMPLEMENTED |
| Phase 5 Audio Converter | IMPLEMENTED |
| Phase 5 Video tools | NOT IMPLEMENTED (out of Phase 6 scope) |
| Phase 6 Favorites | IMPLEMENTED |
| Phase 6 Usage History | IMPLEMENTED |
| Phase 6 QR Camera Scanner | IMPLEMENTED (BarcodeDetector; fallback message if unsupported) |
| Phase 6 Audio Cutter | IMPLEMENTED (FFmpeg re-encode) |
| Phase 6 Audio Recorder | IMPLEMENTED (MediaRecorder) |
| Phase 6 Pomodoro Timer | IMPLEMENTED (timestamp-based) |
| Phase 6 Backup & Restore | IMPLEMENTED |
| `npm install` / typecheck / build | PASS (sandbox) |
| Offline / mobile / Lighthouse | NOT TESTED in this environment (logic + PWA config present) |
| Browser camera/mic | Depends on secure context + user permission |

Jangan anggap PASS perangkat/offline sebelum diuji di browser nyata.

## Phase 7 — Document Converter
| Item | Status |
|---|---|
| Batch 0: audit kondisi awal (docs/PHASE7_AUDIT.md) | DONE (hanya baca file) |
| Batch 0: riset library (docs/PHASE7_LIBRARY_DECISIONS.md) | PARTIAL (serverless-office-converter belum diperiksa; mammoth/docx/PptxGenJS/Tesseract belum diverifikasi online) |
| Baseline ukuran bundle | BLOCKED (tanpa `npm install`/build) |
| `npm install` / typecheck / test / build di sesi Phase 7 | BLOCKED (tidak ada internet) |
| Spike S1 (Ream di browser) dan S2 (SheetJS vendor) | NOT TESTED |
| Batch 1: kategori + 5 halaman kerangka | IMPLEMENTED (kode ditulis; belum di-build) |
| Batch 1: Conversion Registry, Engine Registry, Engine Manager (fondasi) | IMPLEMENTED (diuji logika lewat shim, lihat PHASE7_TEST_REPORT.md) |
| Batch 1: validasi file, batas ukuran, guard OOXML (fondasi) | IMPLEMENTED (diuji logika lewat shim) |
| Batch 1: pencarian per kata + sinonim | IMPLEMENTED (diuji logika lewat shim) |
| Batch 1: `npm install` / `typecheck` / vitest asli / `build` | BLOCKED (sandbox tanpa internet) |
| Batch 1: tampilan UI di browser, dark/light, mobile, PWA offline | NOT TESTED |
| Konversi dokumen apa pun (selain tool Phase 4 yang ditautkan) | NOT IMPLEMENTED |
| Batch 2 Excel Converter | IMPLEMENTED |
| Batch 3 PDF Reader | IMPLEMENTED |
| Batch 4 PDF Writer | IMPLEMENTED |
| Batch 5 Word Converter | IMPLEMENTED (DOCX→TXT/HTML/PDF, TXT→DOCX, HTML→DOCX). PDF→DOCX belum. Browser NOT TESTED |
| Batch 6+ (PowerPoint, OCR, PDF→Excel, QA perangkat) | NOT IMPLEMENTED |
| Regression Phase 0–6 | Unit test lulus di Batch 5 (122 tes). Browser NOT TESTED |

## Phase 7.1 — UI/UX refinement
| Item | Status |
|---|---|
| Navigasi desktop (sidebar, ciut, submenu Document Converter) | IMPLEMENTED (kode; belum dilihat di browser) |
| Navigasi mobile (drawer, fokus, Escape) | IMPLEMENTED (kode; NOT TESTED) |
| Rute kategori/favorit/terakhir/cari | IMPLEMENTED (tes `parseRoute` lewat shim) |
| Beranda berjenjang + keadaan kosong pencarian | IMPLEMENTED (kode; NOT TESTED) |
| Lima halaman converter per fungsi | IMPLEMENTED (render server-side OK; browser NOT TESTED) |
| Sinonim pencarian baru | IMPLEMENTED (tes logika lewat shim) |
| `npm install` / typecheck penuh / Vitest asli / build | BLOCKED (registry 403) |
| Tes logika lewat shim buatan (bukan Vitest) | PARTIAL: 107 lulus / 0 gagal |
| Browser, responsive, dark/light, a11y, iPhone, PWA, deploy Pages | NOT TESTED |
| Regression Phase 0–6 runtime | NOT TESTED (kode tool tidak berubah) |
| Keputusan akhir | NOT READY FOR BATCH 2 (menunggu verifikasi) |

## Phase 7 Batch 2 — Excel Converter (2026-11-09)
| Item | Status |
|---|---|
| XLSX → CSV / JSON / HTML | IMPLEMENTED (available) |
| CSV / JSON / HTML-table → XLSX | IMPLEMENTED (available) |
| XLSX → PDF (simple table) | IMPLEMENTED (available, limited) |
| SheetJS `xlsx@0.18.5` lazy-load | IMPLEMENTED |
| `npm install` / typecheck / test / build | PASS |
| Browser interactive conversion | NOT TESTED in this environment |
| Advanced options UI (sheet picker, delimiter, etc.) | NOT IMPLEMENTED (engine accepts options; UI uses defaults) |
| PDF → XLSX | NOT IN SCOPE (Batch 7+) |
| Regression Phase 0–6 unit tests | PASS (107 tests) |

## Phase 7 Batch 6A — PPTX Reader & Parser (2026-11-10)
| Item | Status |
|---|---|
| Upload + validasi PPTX | IMPLEMENTED |
| Parser struktur (urutan slide, teks, media refs) | IMPLEMENTED |
| Kontrak data PptxParseResult | IMPLEMENTED |
| pptx-to-txt / pptx-media handler | IMPLEMENTED (available) |
| npm typecheck / test / build | PASS |
| Slide Viewer / thumbnail / Writer | NOT IN SCOPE (Batch 6B/6C) |
| Browser interactive | NOT TESTED |

## Phase 7 Batch 6B — PPTX Slide Viewer (2026-11-10)
| Item | Status |
|---|---|
| Slide Viewer (teks + gambar) | IMPLEMENTED |
| Navigasi prev/next + daftar thumbnail | IMPLEMENTED |
| Integrasi halaman PowerPoint | IMPLEMENTED |
| Cleanup object URL | IMPLEMENTED |
| npm typecheck / test / build | PASS |
| Render visual penuh / animasi / chart | NOT SUPPORTED |
| PPTX Writer / PPTX→PDF | NOT IN SCOPE (Batch 6C) |

## Phase 7 Batch 6C — PPTX Writer & Final (2026-11-10)
| Item | Status |
|---|---|
| PPTX Writer (judul, teks, gambar, urut, hapus) | IMPLEMENTED |
| Preview via Viewer | IMPLEMENTED |
| Unduh PPTX valid | IMPLEMENTED |
| Round-trip Writer → Reader | PASS (unit) |
| image-to-pptx | IMPLEMENTED |
| PPTX→PDF / PPTX→gambar | UNSUPPORTED (no accurate offline renderer) |
| npm typecheck / test / build | PASS |
| Browser interactive | NOT TESTED |

## Phase 7 Batch 7A — OCR Engine Foundation (2026-11-10)
| Item | Status |
|---|---|
| OCR engine modular (tesseract.js) | IMPLEMENTED |
| Validasi file + progress + abort | IMPLEMENTED |
| PDF text-layer check + render-to-OCR path | IMPLEMENTED (browser) |
| Model bahasa lokal (public/ocr/) | DOCUMENTED (not bundled) |
| Handler ocr-image | IMPLEMENTED (in-development) |
| Offline tested | NOT TESTED |
| Kamera scanner / crop | NOT IN SCOPE (7B/7C) |
| npm typecheck / test / build | PASS |

## Phase 7 Batch 7B — Document Scanner (2026-11-10)
| Item | Status |
|---|---|
| Kamera + unggah gambar | IMPLEMENTED |
| Multi-halaman, urut, hapus | IMPLEMENTED |
| Rotasi 90° + filter Canvas | IMPLEMENTED |
| Kirim ke OCR Engine 7A | IMPLEMENTED |
| Crop 4-titik / perspektif penuh | NOT IMPLEMENTED |
| npm typecheck / test / build | PASS |
| Browser kamera nyata | NOT TESTED |

## Phase 7 Batch 7C — Final Integration (2026-11-10)
| Item | Status |
|---|---|
| Alur Scanner → OCR → Editor | IMPLEMENTED |
| Export TXT / TXT per halaman | IMPLEMENTED |
| Export PDF gambar (bukan searchable) | IMPLEMENTED |
| Pilihan bahasa eng/ind | IMPLEMENTED (model lokal diperlukan) |
| Searchable PDF / DOCX OCR | NOT IMPLEMENTED |
| Offline penuh | NOT TESTED |
| npm typecheck / test / build | PASS |

## Phase 7 Batch 7D — Online Conversion Engine (2026-11-10)
| Item | Status |
|---|---|
| Provider architecture | IMPLEMENTED |
| Gotenberg demo CORS | FAILED (no ACAO) |
| PPTX→PDF / PNG / JPG online | UNAVAILABLE |
| Honest UI notice | IMPLEMENTED |
| Offline features | UNCHANGED |
| npm typecheck / test / build | PASS |

## Batch 8 — PDF to Excel + Table Editor (2026-11-10)
| Item | Status |
|---|---|
| Text extraction (pdfjs) | IMPLEMENTED |
| Table detection (Y/X grouping) | IMPLEMENTED (heuristic) |
| Table Editor (edit/add/del row/col) | IMPLEMENTED |
| XLSX / CSV / JSON / HTML export | IMPLEMENTED |
| Multi-page merge | NOT IMPLEMENTED |
| OCR → table | NOT IMPLEMENTED (warning only) |
| npm typecheck / test / build | PASS |

## Batch 9 — Offline/PWA & Storage (2026-11-10)
| Item | Status |
|---|---|
| PWA audit & documentation | COMPLETED |
| Storage Manager tool | IMPLEMENTED |
| Offline Feature Matrix | DOCUMENTED |
| End-to-end offline device test | NOT VERIFIED |
| npm typecheck / test / build | PASS |

## Batch 10 — QA & Release Gate (2026-11-10)
| Item | Status |
|---|---|
| Functional QA (kode) | COMPLETED |
| Security audit | COMPLETED (no P0/P1) |
| Performance/Mobile | DOCUMENTED (device NOT VERIFIED) |
| Accessibility | PARTIAL |
| typecheck / test / build | PASS |
| Release decision | READY WITH LIMITATIONS |

## Batch 11 — PDF Editor Suite (2026-11-10)
| Item | Status |
|---|---|
| Page organizer (move/rotate/dup/delete) | IMPLEMENTED |
| Text note / rect / image overlay | IMPLEMENTED |
| Export valid PDF | IMPLEMENTED |
| Crop / freehand / text-aware highlight | NOT IMPLEMENTED |
| Original text editing | NOT SUPPORTED |
| Device testing | NOT VERIFIED |
| npm typecheck / test / build | PASS |

## Batch 12 — Advanced Document Converter (2026-11-10)
| Item | Status |
|---|---|
| PDF→DOCX (text) | PARTIAL |
| PDF→PPTX (image) | PARTIAL |
| PPTX→PDF (text) | PARTIAL |
| XLSX/DOCX→PDF | AVAILABLE (existing) |
| URL→PDF | UNAVAILABLE (CORS) |
| npm typecheck / test / build | PASS |

## Batch 13 — Multimedia Processing Suite (2026-11-10)
| Item | Status |
|---|---|
| Image Converter/Compressor | AVAILABLE (existing) |
| Audio/Video (FFmpeg) | PARTIAL |
| Transcription | UNAVAILABLE |
| Insights (rule-based) | PARTIAL |
| npm typecheck / test / build | PASS |

## Batch 14 — Advanced Multimedia & AI (2026-11-10)
| Item | Status |
|---|---|
| Subtitle Tools (SRT/VTT) | AVAILABLE |
| Media Metadata Analyzer | PARTIAL |
| FFmpeg Core Manager | PARTIAL (existing) |
| Speech-to-Text | UNAVAILABLE |
| Insights | PARTIAL (rule-based) |
| npm typecheck / test / build | PASS |

## Batch 15 — Advanced OCR & Document Intelligence (2026-11-10)
| Item | Status |
|---|---|
| OCR Engine | PARTIAL (existing) |
| Image Preprocessing | PARTIAL |
| Layout Analysis | PARTIAL (heuristic) |
| Table Extraction | PARTIAL (existing) |
| Searchable PDF | PLANNED |
| Local AI | UNAVAILABLE |
| npm typecheck / test / build | PASS |

## Batch 16 — AI Document Assistant (2026-11-10)
| Item | Status |
|---|---|
| Document Assistant (rule-based) | PARTIAL |
| Local AI | UNAVAILABLE |
| Grounded search | PARTIAL |
| Fact extraction | PARTIAL |
| npm typecheck / test / build | PASS |

## Batch 17 — Local AI Hub (2026-11-10)
| Item | Status |
|---|---|
| Local AI Hub | AVAILABLE (status only) |
| Model inference | UNAVAILABLE |
| Model Manager | status-only |
| npm typecheck / test / build | PASS |

## Batch 18 — Final release gate (2026-11-10)

| Item | Status |
|---|---|
| Audit source Batch 1–17 | DONE (dari ZIP Batch 17, bukan dari klaim dokumen lama) |
| typecheck / test / build | PASS (tsc exit 0, Vitest 179 passed, vite build exit 0) |
| Lockfile registry.npmjs.org | PASS (`35.245` count 0; 537 resolved host resmi) |
| PDF.js Promise.try / PDF ke DOCX hang | FIXED |
| HTML escape + entitas XML PPTX | FIXED |
| PDF Editor di navigasi | FIXED |
| Konversi parsial (teks atau gambar) | WIRED, keterbatasan ditampilkan |
| iPhone / Android fisik | NOT VERIFIED |
| Offline reload perangkat | NOT VERIFIED |
| Model OCR dan runtime FFmpeg | NOT BUNDLED |
| Local AI inference | UNAVAILABLE |
| Keputusan | CONDITIONAL RELEASE |

## Batch 19 — Menu, bug, UI (2026-11-10)
| Item | Status |
|---|---|
| Audit menu vs registry vs route | DONE (`BATCH19_MENU_FEATURE_AUDIT.md`) |
| Kategori salah tempat (PDF merge/split, gambar, AI) | FIXED di `registry.ts` + `nav.ts` |
| Teks UI yang mengklaim konversi belum ada | FIXED |
| Shortcut Gambar ke PDF membuka Image to PDF | FIXED |
| Tes sinkronisasi menu | PASS (`tests/menu-sync.test.ts`) |
| typecheck / test / build | PASS (tsc exit 0, Vitest 187 passed, vite build exit 0) |
| Lockfile | Tidak diubah. `35.245` = 0. 537 `registry.npmjs.org` |
| iPhone / Android fisik | NOT VERIFIED |
| Keputusan | READY WITH LIMITATIONS |


## Batch 20 — AI Vocal Separator (2026-11-10)
| Item | Status |
|---|---|
| Model feasibility (UVR-MDX-NET-Inst_HQ_3) | DONE — FEASIBLE WITH LIMITATIONS |
| Model registry + SHA256 + size | IMPLEMENTED |
| Model downloader + Cache Storage | IMPLEMENTED |
| Model integrity (SHA256) | IMPLEMENTED |
| UI + registry integration | IMPLEMENTED (badge NOT READY) |
| Real STFT / ONNX / iSTFT pipeline | NOT IMPLEMENTED |
| Real inference evidence (non-empty stems) | NOT VERIFIED |
| Quality metrics (SDR) | NOT VERIFIED |
| Offline inference after model ready | NOT VERIFIED |
| Video path (FFmpeg reuse) | DITUNDA |
| onnxruntime-web dependency | BELUM DITAMBAHKAN (inference belum ada) |
| typecheck / test / build | Akan dilaporkan |
| iPhone / Android | NOT VERIFIED |
| Keputusan | **NOT READY** |

## Batch 21 — Real Inference attempt (2026-11-10)
| Item | Status |
|---|---|
| Koreksi param MDX (dim_f=3072, n_fft=6144, compensate=1.022) | DONE |
| audioUtils (decode / WAV / validate) | IMPLEMENTED |
| Real ONNX session.run + STFT/ISTFT | NOT IMPLEMENTED |
| Stem Vocal + Instrumental non-kosong | NOT VERIFIED |
| onnxruntime-web dependency | BELUM DITAMBAHKAN |
| typecheck / test / build | NOT VERIFIED (sandbox) |
| Keputusan | **NOT READY** |

## Batch 22 — Real MDX engine path (2026-11-10)
| Item | Status |
|---|---|
| package.json +ort +web-audio-separation | DONE (alasan tertulis) |
| engine.separate() via library | IMPLEMENTED (kode) |
| npm install / lockfile ort | NOT VERIFIED (timeout) |
| session.run + stem WAV | NOT VERIFIED |
| Keputusan | **NOT READY** |

## Batch 22A — ORT + Worker foundation (2026-11-10)
| Item | Status |
|---|---|
| workerMessages + ort.worker + runtimeClient | IMPLEMENTED |
| UI Init Runtime / Dispose / capabilities | IMPLEMENTED |
| Real ORT import in browser | NOT VERIFIED (sandbox) |
| Model load / session.run / stems | NOT IN SCOPE |
| Keputusan | **CONDITIONAL** (siap 22B setelah bukti browser) |

## Batch 22B-FIX — FFT 6144 / iSTFT / overlap-add (2026-11-10)

| Item | Status |
|---|---|
| FFT 6144 (Bluestein, bukan pad 8192) | PASS (uji numerik, max abs impuls ~0, vs DFT naif < 3e-6) |
| FFT 512 / 1024 | PASS (round-trip < 1e-5) |
| STFT/iSTFT amplitudo | PASS (rasio RMS ≈ 1, SNR nada > 80 dB pada spektrum penuh) |
| Overlap-add chunk | PASS (indeks lokal; pola `window[min(i,nFft-1)]` dihapus) |
| Identity bypass MDX 6144/1024/3072 | PASS (bukan bukti pemisahan vokal) |
| Metadata ONNX / session.run | NOT VERIFIED |
| Provider aktual | NOT VERIFIED (kode tidak lagi mengaku WebGPU hanya karena `navigator.gpu`) |
| WASM di hasil build | NOT VERIFIED (build gagal sebelum emit) |
| typecheck | FAIL di ZIP ini (65 error, modul `src/lib` dan converter hilang dari arsip; 0 error di file STFT) |
| vitest | 92 passed / 0 failed; 18 suite tidak dimuat (file sumber absen) |
| build | FAIL (`src/lib/pdfjs-runtime` tidak ada di ZIP) |
| Vocal / Instrumental nyata | NOT VERIFIED |
| Keputusan | **CONDITIONAL** — DSP lulus, Vocal Remover belum READY |

