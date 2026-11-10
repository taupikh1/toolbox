import { parsePptx } from './parser';
import type { PptxParseResult } from './types';
import type { ConversionOutput } from '../../types/conversion';

function baseName(name: string): string {
  return name.replace(/\.pptx$/i, '') || 'presentation';
}

/** PPTX → TXT: gabungkan teks semua slide. */
export async function pptxToTxt(file: File): Promise<ConversionOutput & { parse: PptxParseResult }> {
  const buf = await file.arrayBuffer();
  const parse = await parsePptx(buf, file.name, file.size);
  if (parse.status === 'failed') {
    throw new Error(parse.errors[0] || 'Gagal membaca PPTX.');
  }
  const lines: string[] = [];
  for (const s of parse.slides) {
    lines.push(`--- Slide ${s.number} ---`);
    lines.push(s.plainText || '(tidak ada teks)');
    lines.push('');
  }
  const text = lines.join('\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return {
    blob,
    fileName: baseName(file.name) + '.txt',
    losses: parse.warnings.concat(parse.errors),
    previewText: text.slice(0, 2000),
    parse,
  };
}

/** PPTX → media: daftar path media (bukan ZIP penuh dulu; Batch 6B bisa kembangkan). */
export async function pptxMediaList(file: File): Promise<ConversionOutput & { parse: PptxParseResult }> {
  const buf = await file.arrayBuffer();
  const parse = await parsePptx(buf, file.name, file.size);
  if (parse.status === 'failed') {
    throw new Error(parse.errors[0] || 'Gagal membaca PPTX.');
  }
  const text = parse.media.length
    ? parse.media.join('\n')
    : '(tidak ada media tertanam)';
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return {
    blob,
    fileName: baseName(file.name) + '-media.txt',
    losses: parse.warnings,
    previewText: text,
    parse,
  };
}
