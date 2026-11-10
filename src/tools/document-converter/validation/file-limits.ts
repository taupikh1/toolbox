import type { LimitCategory } from '../types/file';

/**
 * Batas ukuran file terpusat. Nilai AWAL dan konservatif, BUKAN klaim bahwa semua
 * perangkat sanggup memproses file sebesar itu. Tidak ada deteksi RAM: browser tidak
 * memberi angka yang akurat (navigator.deviceMemory dibulatkan, tidak ada di Safari/Firefox).
 * Penyesuaian per perangkat harus lewat `overrides` yang eksplisit, bukan tebakan.
 */
export const DOCUMENT_LIMITS = {
  maxPdfSizeMB: 50,
  maxOfficeFileSizeMB: 30,
  maxImageSizeMB: 20,
  maxTextFileSizeMB: 10,
  maxConcurrentJobs: 1,
} as const;

/** Batas pemeriksaan arsip OOXML (ZIP). Dipakai ooxml-guard.ts. */
export const OOXML_GUARD_LIMITS = {
  maxEntries: 5000,
  maxTotalUncompressedMB: 200,
  maxEntryUncompressedMB: 100,
  /** Rasio kompresi per entri di atas ini dianggap mencurigakan (ZIP bomb). */
  maxCompressionRatio: 100,
} as const;

export type LimitOverrides = Partial<Record<LimitCategory, number>>; // dalam MB

const MB = 1048576;

const DEFAULT_MB: Record<LimitCategory, number> = {
  pdf: DOCUMENT_LIMITS.maxPdfSizeMB,
  office: DOCUMENT_LIMITS.maxOfficeFileSizeMB,
  image: DOCUMENT_LIMITS.maxImageSizeMB,
  text: DOCUMENT_LIMITS.maxTextFileSizeMB,
};

/** Batas ukuran dalam byte. Override hanya diterima jika angka positif dan terhingga. */
export function getMaxBytes(category: LimitCategory, overrides?: LimitOverrides): number {
  const o = overrides?.[category];
  const mb = typeof o === 'number' && Number.isFinite(o) && o > 0 ? o : DEFAULT_MB[category];
  return Math.floor(mb * MB);
}

export function getMaxMB(category: LimitCategory, overrides?: LimitOverrides): number {
  return getMaxBytes(category, overrides) / MB;
}
