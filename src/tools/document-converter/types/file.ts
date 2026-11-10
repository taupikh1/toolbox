// Tipe dasar file untuk Document Converter (Phase 7).
export type FormatId =
  | 'pdf' | 'docx' | 'xlsx' | 'pptx'
  | 'txt' | 'csv' | 'json' | 'html' | 'svg'
  | 'jpg' | 'png' | 'webp';

/** Kategori batas ukuran. Dipakai file-limits.ts. */
export type LimitCategory = 'pdf' | 'office' | 'image' | 'text';

/** Hasil deteksi magic bytes. */
export type SignatureKind =
  | 'empty' | 'pdf' | 'zip' | 'png' | 'jpeg' | 'webp' | 'ole' | 'text' | 'binary';

export type ValidationErrorCode =
  | 'EMPTY_FILE'
  | 'TOO_LARGE'
  | 'UNSUPPORTED_EXTENSION'
  | 'LEGACY_OFFICE'
  | 'SIGNATURE_MISMATCH'
  | 'BINARY_AS_TEXT'
  | 'CONTENT_MISMATCH';

export interface FileMeta {
  name: string;
  size: number;
  type?: string;
}

export type ValidationResult =
  | { ok: true; format: FormatId; detected: SignatureKind; warnings: string[] }
  | { ok: false; code: ValidationErrorCode; message: string; detected?: SignatureKind };
