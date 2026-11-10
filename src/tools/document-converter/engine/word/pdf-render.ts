import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { Align, Block, Run } from './blocks';
import { runsToText } from './blocks';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;

const encCache = new Map<string, boolean>();

function encodable(font: PDFFont, ch: string): boolean {
  const hit = encCache.get(ch);
  if (hit !== undefined) return hit;
  let ok = true;
  try {
    font.widthOfTextAtSize(ch, 10);
  } catch {
    ok = false;
  }
  encCache.set(ch, ok);
  return ok;
}

export function toPdfSafe(font: PDFFont, text: string): { text: string; replaced: boolean } {
  let replaced = false;
  let out = '';
  for (const ch of text) {
    if (ch === '\n' || ch === '\t' || encodable(font, ch)) out += ch;
    else {
      out += '?';
      replaced = true;
    }
  }
  return { text: out, replaced };
}

function wrap(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
  const safe = toPdfSafe(font, text).text;
  const lines: string[] = [];
  for (const para of safe.split('\n')) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else current = test;
    }
    if (current) lines.push(current);
  }
  return lines;
}

function fontFor(run: Run, regular: PDFFont, bold: PDFFont, italic: PDFFont, boldItalic: PDFFont): PDFFont {
  if (run.bold && run.italic) return boldItalic;
  if (run.bold) return bold;
  if (run.italic) return italic;
  return regular;
}

export async function blocksToPdf(blocks: Block[], title: string): Promise<{ bytes: Uint8Array; pages: number; replaced: boolean; justifyFallback: boolean }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(title.slice(0, 200) || 'Dokumen');
  pdf.setCreator('Toolbox Offline Word Converter');
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await pdf.embedFont(StandardFonts.HelveticaBoldOblique);
  let replaced = false;
  let justifyFallback = false;
  const mark = (text: string) => {
    const r = toPdfSafe(regular, text);
    if (r.replaced) replaced = true;
    return r.text;
  };

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let pages = 1;
  let y = PAGE_H - MARGIN;
  const maxW = PAGE_W - MARGIN * 2;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    pages += 1;
    y = PAGE_H - MARGIN;
  };
  const ensure = (need: number) => {
    if (y - need < MARGIN) newPage();
  };

  const drawLines = (lines: string[], size: number, font: PDFFont, align: Align | undefined, color = rgb(0.08, 0.08, 0.08)) => {
    const leading = size * 1.35;
    if (align === 'justify') justifyFallback = true;
    for (const line of lines) {
      ensure(leading);
      let x = MARGIN;
      if (line) {
        const w = font.widthOfTextAtSize(line, size);
        if (align === 'center') x = MARGIN + Math.max(0, (maxW - w) / 2);
        else if (align === 'right') x = MARGIN + Math.max(0, maxW - w);
        page.drawText(line, { x, y: y - size, size, font, color });
      }
      y -= line ? leading : leading * 0.55;
    }
  };

  const drawRuns = (runs: Run[], size: number, align?: Align, forceBold = false) => {
    const chunks: { text: string; font: PDFFont }[] = [];
    for (const run of runs) {
      const font = forceBold ? bold : fontFor(run, regular, bold, italic, boldItalic);
      const safe = toPdfSafe(font, run.text);
      if (safe.replaced) replaced = true;
      chunks.push({ text: safe.text, font });
    }
    const flat = chunks.map((c) => c.text).join('');
    const font0 = forceBold ? bold : chunks[0]?.font ?? regular;
    drawLines(wrap(font0, flat, size, maxW), size, forceBold ? bold : font0, align);
  };

  for (const block of blocks) {
    if (block.kind === 'heading') {
      const size = block.level === 1 ? 18 : block.level === 2 ? 15 : 13;
      ensure(size * 1.6);
      y -= 6;
      drawRuns(block.runs, size, block.align, true);
      y -= 4;
    } else if (block.kind === 'paragraph') {
      drawRuns(block.runs, 11, block.align);
      y -= 6;
    } else if (block.kind === 'list') {
      block.items.forEach((item, i) => {
        const prefix = block.ordered ? `${i + 1}. ` : '• ';
        const text = prefix + runsToText(item).replace(/\s+/g, ' ').trim();
        const safe = mark(text);
        if (toPdfSafe(regular, text).replaced) replaced = true;
        drawLines(wrap(regular, safe, 11, maxW), 11, regular, 'left');
      });
      y -= 6;
    } else if (block.kind === 'table') {
      const cols = Math.max(1, ...block.rows.map((r) => r.length));
      const colW = maxW / cols;
      const size = 9;
      for (const row of block.rows) {
        const cellLines = row.map((cell) => wrap(regular, runsToText(cell).replace(/\s+/g, ' ').trim(), size, colW - 8));
        while (cellLines.length < cols) cellLines.push(['']);
        const rowH = Math.max(16, ...cellLines.map((ls) => Math.max(1, ls.length) * size * 1.3 + 6));
        ensure(rowH);
        const top = y;
        for (let c = 0; c < cols; c++) {
          const x = MARGIN + c * colW;
          page.drawRectangle({
            x,
            y: top - rowH,
            width: colW,
            height: rowH,
            borderWidth: 0.6,
            borderColor: rgb(0.65, 0.65, 0.65),
          });
          let ty = top - 4;
          for (const line of cellLines[c] || ['']) {
            const shown = mark(line);
            if (shown) page.drawText(shown, { x: x + 3, y: ty - size, size, font: regular, color: rgb(0.08, 0.08, 0.08) });
            ty -= size * 1.3;
          }
        }
        y = top - rowH;
      }
      y -= 8;
    }
  }

  const bytes = await pdf.save();
  return { bytes, pages, replaced, justifyFallback };
}
