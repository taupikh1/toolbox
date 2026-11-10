/**
 * Attach real execute handlers to Excel conversion definitions.
 * Called once at module load so ConversionRegistry.isRunnable becomes true.
 */
import type { ConversionDefinition, ConversionContext, ConversionOutput } from '../../types/conversion';
import {
  convertXlsxToCsv,
  convertXlsxToJson,
  convertXlsxToHtml,
  convertCsvToXlsx,
  convertJsonToXlsx,
  convertHtmlTableToXlsx,
  convertXlsxToPdf,
} from './converters';

type Handler = (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;

const HANDLERS: Record<string, Handler> = {
  'xlsx-to-csv': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi XLSX ke CSV…' });
    const r = await convertXlsxToCsv(files[0], { protectFormulas: true });
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'xlsx-to-json': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi XLSX ke JSON…' });
    const r = await convertXlsxToJson(files[0], { pretty: true });
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'xlsx-to-html': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi XLSX ke HTML…' });
    const r = await convertXlsxToHtml(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'csv-to-xlsx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi CSV ke XLSX…' });
    const r = await convertCsvToXlsx(files[0], { interpretation: 'preserve-text' });
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'json-to-xlsx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi JSON ke XLSX…' });
    const r = await convertJsonToXlsx(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'html-table-to-xlsx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi tabel HTML ke XLSX…' });
    const r = await convertHtmlTableToXlsx(files[0]);
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
  'xlsx-to-pdf': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mengonversi XLSX ke PDF…' });
    const r = await convertXlsxToPdf(files[0], { paperSize: 'A4', orientation: 'portrait' });
    return { blob: r.blob, fileName: r.fileName, losses: r.losses };
  },
};

/** IDs that Batch 2 makes available. */
export const BATCH2_AVAILABLE_IDS = Object.keys(HANDLERS);

/**
 * Mutate definitions in-place: set availability, status, and execute handler.
 * Safe to call multiple times.
 */
export function bindExcelHandlers(defs: ConversionDefinition[]): void {
  for (const def of defs) {
    const handler = HANDLERS[def.id];
    if (!handler) continue;
    def.availability = 'available';
    def.status = 'READY';
    def.execute = handler;
    // Keep existing limitations; append engine note if missing
    if (!def.limitations.some((l) => l.includes('SheetJS') || l.includes('lokal'))) {
      def.limitations = [
        ...def.limitations,
        'Diproses sepenuhnya di peramban (SheetJS / pdf-lib). File tidak diunggah ke server.',
      ];
    }
  }
}
