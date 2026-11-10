import type { ConversionContext, ConversionDefinition, ConversionOutput } from '../../types/conversion';
import { runOcr } from './engine';

type Handler = (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;

const HANDLERS: Record<string, Handler> = {
  'ocr-image': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca gambar…' });
    const r = await runOcr(files[0], {
      language: 'eng',
      signal: ctx.signal,
      onProgress: (m) => ctx.onProgress({ phase: 'convert', message: m }),
    });
    if (r.status === 'failed' || r.status === 'cancelled') {
      throw new Error(r.errors[0] || 'OCR gagal.');
    }
    const blob = new Blob([r.text], { type: 'text/plain;charset=utf-8' });
    return { blob, fileName: 'ocr.txt', losses: r.warnings, previewText: r.text.slice(0, 2000) };
  },
};

export const BATCH7A_AVAILABLE_IDS = Object.keys(HANDLERS);

export function bindOcrHandlers(defs: ConversionDefinition[]): void {
  for (const def of defs) {
    const h = HANDLERS[def.id];
    if (h) {
      def.execute = h;
      // Tetap in-development sampai model bahasa lokal tersedia dan diuji offline.
      def.status = 'READY';
      def.availability = 'in-development';
    }
  }
}
