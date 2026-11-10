// Tipe Engine Manager. Engine = kumpulan aset yang dibutuhkan sebuah konversi.
export type EngineId =
  | 'pdfjs' | 'pdf-lib' | 'sheetjs' | 'pptxgenjs'
  | 'docx-writer' | 'ooxml-reader' | 'ream' | 'tesseract';

export type EngineStatus =
  | 'NOT_DOWNLOADED'
  | 'DOWNLOADING'
  | 'READY_OFFLINE'
  | 'PROCESSING'
  | 'ERROR';

/** Jenis aset dipisah agar strategi cache dan ukuran bisa berbeda. */
export type EngineAssetKind =
  | 'js-chunk'      // chunk JavaScript hasil lazy import
  | 'wasm'          // biner WebAssembly
  | 'ocr-model'     // model bahasa OCR (.traineddata)
  | 'worker'        // skrip Worker
  | 'support-file'; // font, data pendukung lain

export interface EngineAsset {
  kind: EngineAssetKind;
  /** Path relatif terhadap base aplikasi. */
  path: string;
  /** Ukuran byte yang terukur. Jangan diisi dengan tebakan. */
  bytes?: number;
}

export interface EngineDefinition {
  id: EngineId;
  name: string;
  purpose: string;
  /** Nama Cache Storage khusus engine ini (terpisah dari precache PWA dan FFmpeg). */
  cacheName: string;
  /** Aset yang sudah terdaftar. Kosong = belum ada yang dapat diunduh. */
  assets: EngineAsset[];
  /** true jika sudah ada di package.json (bukan berarti sudah dipakai atau terverifikasi). */
  installedInApp: boolean;
  note?: string;
}

export interface EngineState {
  status: EngineStatus;
  /** 0..1, hanya diisi jika benar-benar terukur dari byte yang diterima. */
  progress?: number;
  error?: string;
}

export type EngineErrorCode =
  | 'NO_SOURCE'
  | 'BUSY'
  | 'UNKNOWN_ENGINE'
  | 'CANCELLED'
  | 'STORAGE_UNAVAILABLE';

export class EngineError extends Error {
  readonly code: EngineErrorCode;
  constructor(code: EngineErrorCode, message: string) {
    super(message);
    this.name = 'EngineError';
    this.code = code;
  }
}
