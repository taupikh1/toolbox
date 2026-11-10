import type { ConversionContext, ConversionDefinition, ConversionOutput } from '../../types/conversion';

type Handler = (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;

const HANDLERS: Record<string, Handler> = {
  'image-to-pptx': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca gambar…' });
    const { buildPptx, newSlide } = await import('./writer');
    const slides = [];
    for (const f of files) {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(new Error('Gagal membaca gambar'));
        r.readAsDataURL(f);
      });
      slides.push(newSlide({ title: f.name, imageDataUrl: dataUrl }));
    }
    ctx.onProgress({ phase: 'convert', message: 'Menulis PPTX…' });
    const blob = await buildPptx({ title: 'Gambar ke PPTX', slides });
    return { blob, fileName: 'gambar.pptx', losses: ['Setiap gambar menjadi satu slide.'] };
  },
  'pptx-to-txt': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca PPTX…' });
    const { pptxToTxt } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Mengekstrak teks slide…' });
    const r = await pptxToTxt(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewText: r.previewText };
  },
  'pptx-media': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca PPTX…' });
    const { pptxMediaList } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Mengumpulkan referensi media…' });
    const r = await pptxMediaList(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewText: r.previewText };
  },
};

export const BATCH6A_AVAILABLE_IDS = Object.keys(HANDLERS);

export function bindPptxHandlers(defs: ConversionDefinition[]): void {
  for (const def of defs) {
    const h = HANDLERS[def.id];
    if (h) {
      def.execute = h;
      def.status = 'READY';
      def.availability = 'available';
    }
    if (def.id === 'pptx-to-pdf') {
      def.availability = 'unsupported';
      def.limitations = [
        'Tidak tersedia: tidak ada renderer slide offline yang akurat.',
        'Mengubah teks ekstraksi atau media menjadi PDF akan menyesatkan.',
        'Akan ditinjau kembali jika ada engine render yang terbukti.',
      ];
    }
  }
}
