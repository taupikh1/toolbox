import type { ConversionRequest, ConversionResult, OnlineProvider } from './types';

/**
 * Client konversi online.
 * Saat ini tidak melakukan request nyata karena tidak ada provider
 * yang terverifikasi mendukung CORS dari browser GitHub Pages.
 */
export async function convertOnline(
  provider: OnlineProvider,
  req: ConversionRequest,
): Promise<ConversionResult> {
  if (!provider.supportsBrowserCors || !provider.isAvailable) {
    throw new Error(
      `${provider.providerName} tidak dapat digunakan dari browser (CORS tidak didukung atau layanan tidak tersedia). ` +
      'Fitur online ditandai Unavailable sampai ada endpoint publik yang terverifikasi.',
    );
  }
  // Placeholder: implementasi nyata hanya boleh ditambahkan setelah CORS terbukti.
  throw new Error('Endpoint belum diverifikasi untuk penggunaan browser.');
}

export function mapError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/cors|blocked|failed to fetch/i.test(msg)) return 'Provider tidak dapat diakses dari browser (CORS atau jaringan).';
  if (/429/.test(msg)) return 'Batas penggunaan provider tercapai. Coba lagi nanti.';
  if (/413/.test(msg)) return 'File terlalu besar untuk provider.';
  if (/timeout/i.test(msg)) return 'Permintaan habis waktu. Coba lagi.';
  return msg || 'Konversi online gagal.';
}
