import type { EngineId } from './engine';
import type { FormatId, LimitCategory, FileMeta, ValidationResult } from './file';

export type SupportTier = 'A' | 'B' | 'C';

/** Status pekerjaan / implementasi sebuah konversi. */
export type ConversionStatus =
  | 'NOT_IMPLEMENTED'
  | 'READY'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Label untuk pengguna.
 * available       = Tersedia (sudah ada fungsi yang bisa dipakai)
 * in-development  = Dalam pengembangan (engine dipilih, dijadwalkan)
 * coming-soon     = Segera hadir (bergantung hasil uji engine)
 * unsupported     = Tidak didukung
 */
export type Availability = 'available' | 'in-development' | 'coming-soon' | 'unsupported';

export type ConverterPageId = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'ocr';

/** Progres hanya boleh dilaporkan dari pekerjaan nyata. percent kosong = tidak terukur. */
export interface ConversionProgress {
  phase: string;
  percent?: number;
  message?: string;
}

export interface ConversionContext {
  signal: AbortSignal;
  onProgress: (p: ConversionProgress) => void;
}

export interface ConversionOutput {
  blob: Blob;
  fileName: string;
  /** Daftar kehilangan atau pendekatan yang terjadi. Tampilkan apa adanya ke pengguna. */
  losses?: string[];
  /** Pratinjau teks UTF-8 bila hasil atau sumbernya teks. */
  previewText?: string;
  /** HTML yang sudah disanitasi untuk pratinjau. Jangan di-inject tanpa sandbox. */
  previewHtml?: string;
}

export interface ConversionDefinition {
  id: string;
  name: string;
  description: string;
  pages: ConverterPageId[];
  inputFormats: FormatId[];
  outputFormats: string[];
  tier: SupportTier;
  engines: EngineId[];
  availability: Availability;
  status: ConversionStatus;
  limitCategory: LimitCategory;
  /** Keterbatasan yang wajib ditampilkan ke pengguna. */
  limitations: string[];
  /** Jika fungsi sudah ada sebagai tool Phase 0-6, id tool tersebut (route #/tools/<id>). */
  existingToolId?: string;
  keywords: string[];
  /** Diisi saat engine nyata ada. Batch 1: tidak ada yang mengisi. */
  validate?: (file: FileMeta, head: Uint8Array) => ValidationResult;
  execute?: (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;
}
