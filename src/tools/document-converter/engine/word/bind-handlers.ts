/**
 * Pasang handler Word Converter (Batch 5) ke definisi registry.
 * Library dimuat lewat import() di dalam handler, bukan saat halaman dibuka.
 */
import type { ConversionContext, ConversionDefinition, ConversionOutput } from '../../types/conversion';

type Handler = (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;

const HANDLERS: Record<string, Handler> = {
  'docx-to-txt': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca DOCX…' });
    const { docxToTxt } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Mengekstrak teks…' });
    const r = await docxToTxt(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewText: r.previewText };
  },
  'docx-to-html': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca DOCX…' });
    const { docxToHtml } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Menyusun HTML…' });
    const r = await docxToHtml(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewHtml: r.previewHtml };
  },
  'docx-to-pdf': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca DOCX…' });
    const { docxToPdf } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Menyusun PDF…' });
    const r = await docxToPdf(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'txt-to-docx': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca teks…' });
    const { txtToDocx } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Menulis DOCX…' });
    const r = await txtToDocx(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewText: r.previewText, previewHtml: r.previewHtml };
  },
  'html-to-docx': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca HTML…' });
    const { htmlToDocx } = await import('./converters');
    if (ctx.signal.aborted) throw new Error('Dibatalkan.');
    ctx.onProgress({ phase: 'convert', message: 'Menulis DOCX…' });
    const r = await htmlToDocx(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses, previewHtml: r.previewHtml };
  },
};

export const BATCH5_AVAILABLE_IDS = Object.keys(HANDLERS);

const LIMITS: Record<string, string[]> = {
  'docx-to-txt': [
    'Hanya DOCX. File .doc (Office lama) ditolak.',
    'Urutan paragraf dipertahankan. Tabel memakai pemisah tab. Gambar tidak ikut.',
    'Encoding keluaran UTF-8, termasuk karakter Indonesia.',
    'Header, footer, komentar, dan macro tidak dijalankan maupun disalin.',
    'Diproses sepenuhnya di peramban. File tidak diunggah.',
  ],
  'docx-to-html': [
    'Hanya DOCX. File .doc lama ditolak.',
    'Heading, paragraf, daftar, tabel, bold, dan italic dipertahankan sejauh didukung.',
    'Gaya kompleks dan gambar tidak ikut. HTML disanitasi: script tidak dijalankan.',
    'Bukan salinan visual Microsoft Word.',
    'Diproses sepenuhnya di peramban. File tidak diunggah.',
  ],
  'docx-to-pdf': [
    'Konversi otomatis di peramban. Bukan dialog cetak dan tidak meminta Save as PDF.',
    'Tata letak tidak identik dengan Word. Gambar, header/footer, dan gaya kompleks tidak ikut.',
    'Font PDF adalah Helvetica. Karakter di luar Latin dasar dapat diganti dan dicatat.',
    'Tabel sederhana digambar sebagai kisi.',
    'Hanya DOCX. File .doc lama ditolak. Macro tidak dijalankan.',
    'Diproses sepenuhnya di peramban. File tidak diunggah.',
  ],
  'txt-to-docx': [
    'Paragraf (dipisah baris kosong) dan baris di dalamnya dipertahankan.',
    'Tidak ada format kaya dari teks polos.',
    'Nama file hasil dapat diatur sebelum mengunduh.',
    'Diproses sepenuhnya di peramban. File tidak diunggah.',
  ],
  'html-to-docx': [
    'Hanya heading, paragraf, daftar, tabel, bold, italic, dan perataan dasar.',
    'CSS kompleks, gambar, dan desain halaman tidak dipertahankan.',
    'HTML disanitasi sebelum dikonversi. Script tidak dijalankan.',
    'Diproses sepenuhnya di peramban. File tidak diunggah.',
  ],
};

const ENGINES: Record<string, ConversionDefinition['engines']> = {
  'docx-to-txt': ['ooxml-reader'],
  'docx-to-html': ['ooxml-reader'],
  'docx-to-pdf': ['ooxml-reader', 'pdf-lib'],
  'txt-to-docx': ['docx-writer'],
  'html-to-docx': ['docx-writer'],
};

export function bindWordHandlers(defs: ConversionDefinition[]): void {
  for (const def of defs) {
    const handler = HANDLERS[def.id];
    if (!handler) continue;
    def.availability = 'available';
    def.status = 'READY';
    def.execute = handler;
    def.engines = ENGINES[def.id] ?? def.engines;
    def.limitations = LIMITS[def.id] ?? def.limitations;
  }
}
