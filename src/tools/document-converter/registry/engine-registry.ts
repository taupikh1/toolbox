import type { EngineDefinition, EngineId } from '../types/engine';

// Cache Storage per engine, terpisah dari precache PWA dan dari cache FFmpeg Phase 5
// (ffmpeg-core-v0.12.10). Nama diberi versi agar pembaruan engine tidak bentrok.
// Batch 1: TIDAK ada aset yang terdaftar dan tidak ada library baru yang dipasang.
const e = (x: Omit<EngineDefinition, 'assets'> & { assets?: EngineDefinition['assets'] }): EngineDefinition => ({ assets: [], ...x });

export const ENGINE_DEFINITIONS: EngineDefinition[] = [
  e({ id: 'pdfjs', name: 'pdf.js', purpose: 'Render halaman PDF dan ekstraksi teks', cacheName: 'docengine-pdfjs-v1', installedInApp: false, note: 'Rencana: worker .mjs self-host.' }),
  e({ id: 'pdf-lib', name: 'pdf-lib', purpose: 'Menulis dan memanipulasi PDF', cacheName: 'docengine-pdf-lib-v1', installedInApp: true, note: 'Sudah ada di package.json (dipakai tool Phase 4); belum diadaptasi ke Engine Manager.' }),
  e({ id: 'sheetjs', name: 'SheetJS CE', purpose: 'Membaca dan menulis XLSX/CSV/JSON/HTML', cacheName: 'docengine-sheetjs-v1', installedInApp: true, note: 'xlsx@0.18.5 (SheetJS CE) terpasang via npm; lazy-loaded.' }),
  e({ id: 'pptxgenjs', name: 'PptxGenJS', purpose: 'Menulis PPTX', cacheName: 'docengine-pptxgenjs-v1', installedInApp: true, note: 'pptxgenjs@3.12.0 terpasang via npm; lazy-loaded saat menulis. MIT.' }),
  e({ id: 'docx-writer', name: 'Penulis DOCX', purpose: 'Menulis DOCX dari teks atau HTML sederhana', cacheName: 'docengine-docx-v1', installedInApp: true, note: 'docx (dolanmiu) terpasang via npm; lazy-loaded saat konversi. Tidak memakai CDN.' }),
  e({ id: 'ooxml-reader', name: 'Pembaca OOXML', purpose: 'Membaca DOCX (ZIP + XML) lalu mengekstrak isi', cacheName: 'docengine-ooxml-v1', installedInApp: true, note: 'mammoth terpasang via npm; lazy-loaded. ooxml-guard wajib lolos sebelum parse.' }),
  e({ id: 'ream', name: 'Ream (kandidat)', purpose: 'Konversi Office ke PDF dan PDF ke DOCX', cacheName: 'docengine-ream-v1', installedInApp: false, note: 'Belum teruji di browser (Spike S1 BLOCKED).' }),
  e({ id: 'tesseract', name: 'Tesseract.js', purpose: 'OCR (worker, core WASM, model bahasa)', cacheName: 'docengine-tesseract-v1', installedInApp: true, note: 'tesseract.js@5.1.1. Worker/core/lang harus ada di public/ocr/ untuk offline. Model eng/ind tidak di-bundle (besar).' }),
];

export function getEngineDefinition(id: EngineId): EngineDefinition | undefined {
  return ENGINE_DEFINITIONS.find((x) => x.id === id);
}
