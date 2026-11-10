/**
 * Hubungkan konversi yang sudah ada kodenya tetapi masih bertanda
 * coming-soon / unsupported di kartu utama (Batch 12 + tabel Batch 8).
 * Status available hanya untuk jalur yang benar-benar mengeksekusi,
 * dengan catatan kehilangan yang wajib ditampilkan.
 */
import type { ConversionContext, ConversionDefinition, ConversionOutput } from '../../types/conversion';

type Handler = (files: File[], ctx: ConversionContext) => Promise<ConversionOutput>;

function baseName(name: string, ext: string): string {
  const i = name.lastIndexOf('.');
  const stem = i > 0 ? name.slice(0, i) : name;
  return `${stem || 'dokumen'}.${ext}`;
}

const HANDLERS: Record<string, Handler> = {
  'pdf-to-txt': async (files, ctx) => {
    ctx.onProgress({ phase: 'read', message: 'Membaca text layer PDF…' });
    const { extractPdfPages } = await import('./pdf-to-docx');
    const r = await extractPdfPages(await files[0].arrayBuffer());
    const text = r.pages.map((p, i) => (r.pages.length > 1 ? `--- Halaman ${i + 1} ---\n${p}` : p)).join('\n\n');
    const body = text.trim() || '(tidak ada text layer)';
    return {
      blob: new Blob([body], { type: 'text/plain;charset=utf-8' }),
      fileName: baseName(files[0].name, 'txt'),
      losses: r.warnings.length ? r.warnings : ['Hanya text layer. PDF hasil pindai tanpa teks tidak berisi isi.'],
      previewText: body.slice(0, 4000),
    };
  },
  'pdf-to-docx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Menyusun DOCX dari teks PDF…' });
    const { pdfToDocx } = await import('./pdf-to-docx');
    const r = await pdfToDocx(await files[0].arrayBuffer());
    return {
      blob: r.blob,
      fileName: baseName(files[0].name, 'docx'),
      losses: [r.label, 'Bukan tata letak Microsoft Word. Gambar tidak ikut.', ...r.warnings],
      previewText: `${r.pageCount} halaman · ${r.textLength} karakter · kualitas ${r.quality}`,
    };
  },
  'pdf-to-pptx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Merender halaman menjadi gambar slide…' });
    const { pdfToPptx } = await import('./pdf-to-pptx');
    const r = await pdfToPptx(await files[0].arrayBuffer());
    return {
      blob: r.blob,
      fileName: baseName(files[0].name, 'pptx'),
      losses: [r.label, ...r.warnings],
    };
  },
  'pdf-to-xlsx': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Mendeteksi tabel dari text layer…' });
    const { extractTablesFromPdf } = await import('../pdf-table/extract');
    const { tablesToXlsx } = await import('../pdf-table/export');
    const r = await extractTablesFromPdf(await files[0].arrayBuffer());
    if (!r.tables.length) {
      throw new Error(r.warnings[0] || 'Tidak ada tabel terdeteksi. PDF hasil pindai perlu OCR, dan deteksi ini hanya heuristik.');
    }
    return {
      blob: tablesToXlsx(r.tables),
      fileName: baseName(files[0].name, 'xlsx'),
      losses: [
        'Deteksi tabel heuristik (pengelompokan Y/X), bukan garis tabel.',
        'Tidak menjanjikan hasil sempurna. Periksa dan rapikan.',
        ...r.warnings,
      ],
    };
  },
  'pptx-to-pdf': async (files, ctx) => {
    ctx.onProgress({ phase: 'convert', message: 'Menulis PDF dari teks slide…' });
    const { pptxToPdf } = await import('./pptx-to-pdf');
    const r = await pptxToPdf(files[0]);
    return {
      blob: r.blob,
      fileName: baseName(files[0].name, 'pdf'),
      losses: [r.label, 'Bukan render visual. Gambar, animasi, dan tata letak tidak ikut.', ...r.warnings],
    };
  },
};

export const BATCH18_PARTIAL_IDS = Object.keys(HANDLERS);

const NOTES: Record<string, { name?: string; description?: string; limitations: string[] }> = {
  'pdf-to-txt': {
    description: 'Ekstrak text layer PDF menjadi TXT. Halaman tanpa teks (hasil pindai) kosong.',
    limitations: [
      'Hanya text layer. Bukan OCR.',
      'Maksimal 30 halaman per proses agar memori tetap aman.',
      'PDF ber-sandi tidak didukung.',
    ],
  },
  'pdf-to-docx': {
    description: 'Rekonstruksi teks PDF menjadi DOCX. Bukan tata letak Word.',
    limitations: [
      'Text-based reconstruction. Gambar, kolom, dan gaya tidak dipertahankan.',
      'Tidak menjanjikan hasil identik dengan sumber.',
      'PDF hasil pindai tanpa text layer menghasilkan halaman kosong.',
    ],
  },
  'pdf-to-pptx': {
    description: 'Setiap halaman PDF menjadi satu gambar pada slide. Objek tidak dapat diedit.',
    limitations: [
      'Slide berbasis gambar, bukan objek yang dapat diedit.',
      'Maksimal 20 halaman. Canvas dibatasi 1600px agar memori aman.',
      'Hanya berjalan di browser (butuh canvas).',
    ],
  },
  'pdf-to-xlsx': {
    limitations: [
      'Deteksi tabel bersifat heuristik; hasil bisa salah kolom atau baris.',
      'Tidak menjanjikan hasil sempurna. Periksa dan rapikan hasilnya.',
      'Bukan OCR. PDF tanpa text layer gagal.',
    ],
  },
  'pptx-to-pdf': {
    name: 'PPTX ke PDF (teks)',
    description: 'Rekonstruksi teks slide menjadi PDF. Bukan render visual PowerPoint.',
    limitations: [
      'Hanya teks. Gambar, chart, SmartArt, dan animasi tidak dirender.',
      'Font Helvetica. Karakter di luar Latin dasar diganti.',
      'Bukan salinan tata letak slide.',
    ],
  },
};

export function bindAdvancedHandlers(defs: ConversionDefinition[]): void {
  for (const def of defs) {
    const handler = HANDLERS[def.id];
    if (!handler) continue;
    const note = NOTES[def.id];
    def.execute = handler;
    def.status = 'READY';
    def.availability = 'available';
    if (note?.name) def.name = note.name;
    if (note?.description) def.description = note.description;
    if (note) def.limitations = note.limitations;
  }
}
