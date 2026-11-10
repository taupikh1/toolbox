/**
 * Word Converter engine (Phase 7 Batch 5).
 * DOCX dibaca dengan Mammoth (lazy). DOCX ditulis dengan docx (lazy).
 * PDF memakai pdf-lib yang sudah ada. Semua lokal, tanpa jaringan.
 */
import { getMaxBytes } from '../../validation/file-limits';
import { blocksToDocumentHtml, blocksToPlainText, htmlToBlocks, textToBlocks, type Align, type Block } from './blocks';
import { outputName } from './names';
import { blocksToPdf } from './pdf-render';
import { assertDocxPackage } from './zip-meta';

export interface WordResult {
  blob: Blob;
  fileName: string;
  losses: string[];
  previewText?: string;
  previewHtml?: string;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function asBytes(file: Blob): Promise<Uint8Array> {
  return file.arrayBuffer().then((b) => new Uint8Array(b));
}

function sourceName(file: Blob, fallback: string): string {
  return typeof File !== 'undefined' && file instanceof File && file.name ? file.name : fallback;
}

function assertSize(bytes: number, category: 'office' | 'text', label: string) {
  if (bytes === 0) throw new Error(`${label} kosong (0 byte).`);
  const max = getMaxBytes(category);
  if (bytes > max) throw new Error(`${label} melebihi batas ${Math.round(max / 1048576)} MB.`);
}

async function loadMammoth() {
  const mod = await import('mammoth');
  return mod.default ?? mod;
}

async function readDocxBlocks(file: Blob): Promise<{ blocks: Block[]; losses: string[] }> {
  const bytes = await asBytes(file);
  assertSize(bytes.byteLength, 'office', 'File DOCX');
  const warnings = assertDocxPackage(bytes);
  const mammoth = await loadMammoth();
  let images = 0;
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  // Node build membaca `buffer`; build browser membaca `arrayBuffer`.
  const host = globalThis as { Buffer?: { from(data: Uint8Array): Uint8Array } };
  const input: { buffer?: Uint8Array; arrayBuffer: ArrayBuffer } = { arrayBuffer };
  if (host.Buffer) input.buffer = host.Buffer.from(bytes);
  const result = await mammoth.convertToHtml(input as never, {
      convertImage: mammoth.images.imgElement(async () => {
        images += 1;
        return { src: '' };
      }),
    },
  );
  const blocks = htmlToBlocks(result.value || '');
  const losses = [...warnings];
  if (images > 0) losses.push(`${images} gambar diabaikan. Gambar tidak disalin ke hasil.`);
  for (const msg of result.messages ?? []) {
    if (msg.message) losses.push(String(msg.message));
  }
  if (!blocks.length) throw new Error('Dokumen tidak berisi teks yang dapat diekstrak.');
  losses.push('Header, footer, komentar, dan catatan kaki tidak dijamin ikut.');
  losses.push('Tata letak tidak identik dengan Microsoft Word.');
  return { blocks, losses: unique(losses) };
}

function unique(items: string[]): string[] {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))];
}

export async function docxToTxt(file: Blob): Promise<WordResult> {
  const name = sourceName(file, 'dokumen.docx');
  const { blocks, losses } = await readDocxBlocks(file);
  const text = blocksToPlainText(blocks);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return {
    blob,
    fileName: outputName(name, 'txt'),
    losses: unique([...losses, 'Tabel ditulis dengan pemisah tab. Encoding UTF-8.']),
    previewText: text,
  };
}

export async function docxToHtml(file: Blob): Promise<WordResult> {
  const name = sourceName(file, 'dokumen.docx');
  const { blocks, losses } = await readDocxBlocks(file);
  const html = blocksToDocumentHtml(blocks, name.replace(/\.[^.]+$/, ''));
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return {
    blob,
    fileName: outputName(name, 'html'),
    losses: unique([
      ...losses,
      'HTML hasil sudah disanitasi. Script dan event handler tidak ikut dan tidak dijalankan.',
      'Gaya kompleks disederhanakan. Bold, italic, heading, daftar, dan tabel dasar dipertahankan.',
    ]),
    previewHtml: html,
  };
}

export async function docxToPdf(file: Blob): Promise<WordResult> {
  const name = sourceName(file, 'dokumen.docx');
  const { blocks, losses } = await readDocxBlocks(file);
  const title = name.replace(/\.[^.]+$/, '') || 'Dokumen';
  const pdf = await blocksToPdf(blocks, title);
  const blob = new Blob([pdf.bytes as BlobPart], { type: 'application/pdf' });
  const extra = [
    'PDF dibuat otomatis di peramban (pdf-lib). Bukan dialog cetak; tidak perlu memilih Save as PDF.',
    'Gambar, kotak teks, dan gaya kompleks tidak ikut. Font PDF adalah Helvetica.',
  ];
  if (pdf.replaced) extra.push('Beberapa karakter di luar Latin dasar diganti menjadi tanda tanya pada PDF.');
  if (pdf.justifyFallback) extra.push('Perataan justify dirender sebagai kiri pada PDF.');
  return {
    blob,
    fileName: outputName(name, 'pdf'),
    losses: unique([...losses, ...extra]),
  };
}

async function packDocx(blocks: Block[], title: string): Promise<Blob> {
  const docx = await import('docx');
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    LevelFormat,
    Packer,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
  } = docx;

  const alignOf = (a?: Align) => {
    if (a === 'center') return AlignmentType.CENTER;
    if (a === 'right') return AlignmentType.RIGHT;
    if (a === 'justify') return AlignmentType.BOTH;
    return AlignmentType.LEFT;
  };

  const toRuns = (runs: { text: string; bold?: boolean; italic?: boolean }[]) => {
    const out: InstanceType<typeof TextRun>[] = [];
    for (const r of runs) {
      const parts = r.text.split('\n');
      parts.forEach((part, i) => {
        if (part) out.push(new TextRun({ text: part, bold: !!r.bold, italics: !!r.italic }));
        if (i < parts.length - 1) out.push(new TextRun({ break: 1 }));
      });
    }
    return out.length ? out : [new TextRun('')];
  };

  const headings = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ];

  let listSeq = 0;
  const numberingConfigs: { reference: string; levels: { level: number; format: (typeof LevelFormat)['DECIMAL']; text: string; alignment: (typeof AlignmentType)['LEFT'] }[] }[] = [];
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [];

  for (const block of blocks) {
    if (block.kind === 'heading') {
      children.push(new Paragraph({
        heading: headings[block.level - 1],
        alignment: alignOf(block.align),
        children: toRuns(block.runs),
      }));
    } else if (block.kind === 'paragraph') {
      children.push(new Paragraph({ alignment: alignOf(block.align), children: toRuns(block.runs) }));
    } else if (block.kind === 'list') {
      if (block.ordered) {
        listSeq += 1;
        const reference = `ol-${listSeq}`;
        numberingConfigs.push({
          reference,
          levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT }],
        });
        for (const item of block.items) {
          children.push(new Paragraph({ numbering: { reference, level: 0 }, children: toRuns(item) }));
        }
      } else {
        for (const item of block.items) {
          children.push(new Paragraph({ bullet: { level: 0 }, children: toRuns(item) }));
        }
      }
    } else if (block.kind === 'table') {
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: block.rows.map((row) => new TableRow({
          children: row.map((cell) => new TableCell({
            children: [new Paragraph({ children: toRuns(cell) })],
          })),
        })),
      }));
    }
  }

  if (!children.length) throw new Error('Tidak ada isi yang dapat ditulis ke DOCX.');

  const doc = new Document({
    title,
    creator: 'Toolbox Offline Word Converter',
    numbering: numberingConfigs.length ? { config: numberingConfigs } : undefined,
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Blob([buf], { type: DOCX_MIME });
}

export async function txtToDocx(file: Blob, overrideName?: string): Promise<WordResult> {
  const name = sourceName(file, 'dokumen.txt');
  const text = await file.text();
  assertSize(new TextEncoder().encode(text).byteLength, 'text', 'Teks');
  if (!text.trim()) throw new Error('Teks kosong.');
  const blocks = textToBlocks(text);
  const title = (overrideName || name).replace(/\.[^.]+$/, '') || 'Dokumen';
  const blob = await packDocx(blocks, title);
  const html = blocksToDocumentHtml(blocks, title);
  return {
    blob,
    fileName: outputName(name, 'docx', overrideName),
    losses: ['Hanya paragraf dan baris. Teks polos tidak punya bold, heading, atau tabel.'],
    previewText: text,
    previewHtml: html,
  };
}

export async function htmlToDocx(file: Blob, overrideName?: string): Promise<WordResult> {
  const name = sourceName(file, 'dokumen.html');
  const html = await file.text();
  assertSize(new TextEncoder().encode(html).byteLength, 'text', 'HTML');
  if (!html.trim()) throw new Error('HTML kosong.');
  const blocks = htmlToBlocks(html);
  if (!blocks.length) throw new Error('HTML tidak berisi teks yang dapat dikonversi setelah sanitasi.');
  const title = (overrideName || name).replace(/\.[^.]+$/, '') || 'Dokumen';
  const blob = await packDocx(blocks, title);
  const previewHtml = blocksToDocumentHtml(blocks, title);
  return {
    blob,
    fileName: outputName(name, 'docx', overrideName),
    losses: unique([
      'Hanya heading, paragraf, daftar, tabel, bold, italic, dan perataan dasar.',
      'CSS kompleks, gambar, dan script tidak dipertahankan. Script tidak dijalankan.',
      'Hasil bukan salinan visual halaman HTML.',
    ]),
    previewHtml,
  };
}

export async function previewDocxAsHtml(file: Blob): Promise<string> {
  const { blocks } = await readDocxBlocks(file);
  return blocksToDocumentHtml(blocks, 'Pratinjau');
}
