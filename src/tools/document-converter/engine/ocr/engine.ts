import { createWorker, type Worker } from 'tesseract.js';
import type { OcrOptions, OcrResult, OcrPageResult } from './types';

const SUPPORTED_IMAGE = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_IMAGE_MB = 20;
const DEFAULT_LANG = 'eng';

/** Path lokal untuk worker/core/lang. Sesuaikan base path GitHub Pages. */
function asset(path: string): string {
  const base = (import.meta as any).env?.BASE_URL ?? '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

let worker: Worker | null = null;
let workerLang = '';

async function getWorker(lang: string): Promise<Worker> {
  if (worker && workerLang === lang) return worker;
  if (worker) {
    try { await worker.terminate(); } catch { /* ignore */ }
    worker = null;
  }
  // workerPath/corePath/langPath diarahkan ke public/ocr/ agar offline setelah aset tersedia.
  // Jika file belum ada, tesseract.js akan gagal dengan pesan jelas.
  worker = await createWorker(lang, 1, {
    workerPath: asset('ocr/worker.min.js'),
    corePath: asset('ocr/tesseract-core.wasm.js'),
    langPath: asset('ocr'),
  });
  workerLang = lang;
  return worker;
}

export async function terminateOcrWorker(): Promise<void> {
  if (worker) {
    try { await worker.terminate(); } catch { /* ignore */ }
    worker = null;
    workerLang = '';
  }
}

function fail(msg: string, language = DEFAULT_LANG): OcrResult {
  return { text: '', pages: [], language, status: 'failed', errors: [msg], warnings: [] };
}

async function recognizeImage(file: Blob, lang: string, opts: OcrOptions): Promise<OcrPageResult> {
  if (opts.signal?.aborted) throw new Error('Dibatalkan.');
  opts.onProgress?.('Mengenali teks…', 30);
  const w = await getWorker(lang);
  const { data } = await w.recognize(file);
  if (opts.signal?.aborted) throw new Error('Dibatalkan.');
  const words = (data.words ?? []).map((w: any) => ({
    text: w.text,
    confidence: typeof w.confidence === 'number' ? w.confidence : undefined,
    bbox: w.bbox ? { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 } : undefined,
  }));
  return {
    page: 1,
    text: data.text ?? '',
    confidence: typeof data.confidence === 'number' ? data.confidence : undefined,
    words,
    language: lang,
    source: 'ocr',
  };
}

/**
 * OCR engine foundation.
 * - Gambar: langsung ke Tesseract.
 * - PDF: cek text layer (pdfjs); jika kosong, render halaman lalu OCR (satu per satu).
 * Semua lokal. Model bahasa harus tersedia di public/ocr/ untuk offline.
 */
export async function runOcr(file: File | Blob, opts: OcrOptions = {}): Promise<OcrResult> {
  const language = opts.language ?? DEFAULT_LANG;
  const name = (file as File).name ?? 'file';
  const type = file.type || '';
  const size = file.size;

  if (size === 0) return fail('File kosong (0 byte).', language);
  if (opts.signal?.aborted) return { ...fail('Dibatalkan.', language), status: 'cancelled' };

  // Image path
  if (SUPPORTED_IMAGE.includes(type) || /\.(png|jpe?g|webp|gif)$/i.test(name)) {
    if (size > MAX_IMAGE_MB * 1048576) return fail(`Gambar melebihi ${MAX_IMAGE_MB} MB.`, language);
    try {
      const page = await recognizeImage(file, language, opts);
      return {
        text: page.text,
        pages: [page],
        language,
        status: page.text.trim() ? 'success' : 'partial',
        errors: [],
        warnings: page.text.trim() ? [] : ['Tidak ada teks terdeteksi.'],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/dibatalkan/i.test(msg)) return { ...fail(msg, language), status: 'cancelled' };
      return fail(`OCR gagal: ${msg}`, language);
    }
  }

  // PDF path
  if (type === 'application/pdf' || /\.pdf$/i.test(name)) {
    return runPdfOcr(file, language, opts);
  }

  return fail('Format tidak didukung. Gunakan PNG, JPG, WEBP, atau PDF.', language);
}

async function runPdfOcr(file: Blob, language: string, opts: OcrOptions): Promise<OcrResult> {
  let pdfjs: any;
  try {
    pdfjs = await import('../../../../lib/pdfjs-runtime').then((m) => m.importPdfJs());
  } catch {
    return fail('pdfjs-dist tidak tersedia.', language);
  }
  const data = new Uint8Array(await file.arrayBuffer());
  let doc: any;
  try {
    doc = await pdfjs.getDocument({ data, disableWorker: true, isEvalSupported: false }).promise;
  } catch (e) {
    return fail(`PDF tidak dapat dibaca: ${e instanceof Error ? e.message : String(e)}`, language);
  }
  const num = Math.min(doc.numPages, opts.maxPages ?? 20);
  const pages: OcrPageResult[] = [];
  const errors: string[] = [];
  const scale = opts.pdfScale ?? 1.5;

  for (let i = 1; i <= num; i++) {
    if (opts.signal?.aborted) {
      return { text: pages.map((p) => p.text).join('\n\n'), pages, language, status: 'cancelled', errors: ['Dibatalkan.'], warnings: [] };
    }
    opts.onProgress?.(`Memproses halaman ${i}/${num}…`, Math.round((i / num) * 80));
    try {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const layer = textContent.items.map((it: any) => it.str).join(' ').trim();
      if (layer.length > 20) {
        pages.push({ page: i, text: layer, language, source: 'text-layer' });
        continue;
      }
      // Render ke canvas lalu OCR
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas tidak tersedia.');
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
      if (!blob) throw new Error('Gagal merender halaman.');
      const ocrPage = await recognizeImage(blob, language, opts);
      ocrPage.page = i;
      pages.push(ocrPage);
    } catch (e) {
      errors.push(`Halaman ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const text = pages.map((p) => p.text).join('\n\n');
  const status = errors.length === 0 && pages.length === num ? 'success' : pages.length > 0 ? 'partial' : 'failed';
  return { text, pages, language, status, errors, warnings: [] };
}
