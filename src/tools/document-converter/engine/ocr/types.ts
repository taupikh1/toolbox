/** Kontrak hasil OCR untuk Batch 7B/7C. */

export interface OcrWord {
  text: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrPageResult {
  /** Nomor halaman/gambar 1-based. */
  page: number;
  text: string;
  confidence?: number;
  words?: OcrWord[];
  language: string;
  source: 'ocr' | 'text-layer';
}

export interface OcrResult {
  text: string;
  pages: OcrPageResult[];
  language: string;
  status: 'success' | 'partial' | 'failed' | 'cancelled';
  errors: string[];
  warnings: string[];
}

export interface OcrOptions {
  language?: 'eng' | 'ind' | 'eng+ind';
  /** Resolusi render PDF (scale). Default 1.5 untuk hemat memori. */
  pdfScale?: number;
  /** Maks halaman PDF yang diproses. */
  maxPages?: number;
  signal?: AbortSignal;
  onProgress?: (msg: string, percent?: number) => void;
}
