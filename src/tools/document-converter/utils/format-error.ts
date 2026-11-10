import type { ValidationErrorCode } from '../types/file';

/** Judul singkat per kode galat, untuk badge atau ringkasan. */
export const VALIDATION_TITLES: Record<ValidationErrorCode, string> = {
  EMPTY_FILE: 'File kosong',
  TOO_LARGE: 'File terlalu besar',
  UNSUPPORTED_EXTENSION: 'Format tidak sesuai',
  LEGACY_OFFICE: 'Format Office lama',
  SIGNATURE_MISMATCH: 'Isi file tidak cocok',
  BINARY_AS_TEXT: 'Bukan file teks',
  CONTENT_MISMATCH: 'Isi file tidak cocok',
};

/** Ubah error tak dikenal menjadi pesan aman. Tidak menyertakan isi dokumen. */
export function formatError(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  return 'Terjadi kesalahan yang tidak diketahui.';
}
