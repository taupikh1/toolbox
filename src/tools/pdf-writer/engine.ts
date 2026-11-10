/**
 * PDF Writer engine — local, offline generation with pdf-lib.
 * Supports images → PDF, plain text → PDF, and limited safe HTML → PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import { toBlob } from '../../utils';

export type PaperSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Legal';
export type Orientation = 'portrait' | 'landscape';
export type ImageFit = 'fit' | 'fill' | 'original';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface PageSettings {
  size: PaperSize;
  orientation: Orientation;
  margin: number; // points
}

export interface ImageSettings extends PageSettings {
  fit: ImageFit;
  quality: number; // 0–1 for JPEG
}

export interface TextSettings extends PageSettings {
  fontSize: number;
  lineSpacing: number; // multiplier
  align: TextAlign;
  title?: string;
}

const PAGE_SIZES: Record<PaperSize, [number, number]> = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

export function pageDimensions(size: PaperSize, orientation: Orientation): [number, number] {
  const [w, h] = PAGE_SIZES[size];
  return orientation === 'landscape' ? [h, w] : [w, h];
}

const MAX_SIDE = 2500;

async function embedImage(pdf: PDFDocument, file: File, quality = 0.92): Promise<PDFImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas tidak tersedia');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const isPng = file.type === 'image/png' || file.type === 'image/webp';
  const mime = isPng ? 'image/png' : 'image/jpeg';
  const blob = await toBlob(canvas, mime, isPng ? undefined : quality);
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error('Gagal mengenkode gambar');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return isPng ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
}

export async function imagesToPdf(
  files: File[],
  settings: ImageSettings,
  title = 'Gambar',
): Promise<{ blob: Blob; fileName: string; pages: number }> {
  if (!files.length) throw new Error('Tidak ada gambar');
  const pdf = await PDFDocument.create();
  pdf.setTitle(title);
  pdf.setCreator('Toolbox Offline PDF Writer');
  const [W, H] = pageDimensions(settings.size, settings.orientation);
  const margin = Math.max(0, settings.margin);

  for (const file of files) {
    const img = await embedImage(pdf, file, settings.quality);
    const page = pdf.addPage([W, H]);
    const maxW = W - 2 * margin;
    const maxH = H - 2 * margin;
    let dw = img.width;
    let dh = img.height;
    if (settings.fit === 'fit') {
      const s = Math.min(maxW / img.width, maxH / img.height, 1);
      dw = img.width * s;
      dh = img.height * s;
    } else if (settings.fit === 'fill') {
      const s = Math.max(maxW / img.width, maxH / img.height);
      dw = img.width * s;
      dh = img.height * s;
    }
    // original: keep natural size but still center and clamp if larger
    if (settings.fit === 'original' && (dw > maxW || dh > maxH)) {
      const s = Math.min(maxW / dw, maxH / dh);
      dw *= s;
      dh *= s;
    }
    const x = (W - dw) / 2;
    const y = (H - dh) / 2;
    page.drawImage(img, { x, y, width: dw, height: dh });
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const safe = title.replace(/[\\/:*?"<>|]/g, '_') || 'gambar';
  return { blob, fileName: `${safe}.pdf`, pages: files.length };
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  for (const para of paragraphs) {
    if (para.trim() === '') {
      lines.push('');
      continue;
    }
    const words = para.split(/\s+/);
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

export async function textToPdf(
  text: string,
  settings: TextSettings,
): Promise<{ blob: Blob; fileName: string; pages: number }> {
  if (!text.trim()) throw new Error('Teks kosong');
  const pdf = await PDFDocument.create();
  const title = settings.title?.trim() || 'Dokumen';
  pdf.setTitle(title);
  pdf.setCreator('Toolbox Offline PDF Writer');
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const [W, H] = pageDimensions(settings.size, settings.orientation);
  const margin = Math.max(20, settings.margin);
  const maxWidth = W - 2 * margin;
  const lineHeight = settings.fontSize * settings.lineSpacing;
  const lines = wrapText(text, font, settings.fontSize, maxWidth);

  let page = pdf.addPage([W, H]);
  let y = H - margin;
  let pageCount = 1;

  if (settings.title) {
    const titleSize = Math.min(settings.fontSize + 4, 24);
    page.drawText(settings.title, {
      x: margin,
      y: y - titleSize,
      size: titleSize,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= titleSize + lineHeight * 0.8;
  }

  for (const line of lines) {
    if (y < margin + lineHeight) {
      page = pdf.addPage([W, H]);
      y = H - margin;
      pageCount += 1;
    }
    if (line === '') {
      y -= lineHeight * 0.6;
      continue;
    }
    let x = margin;
    if (settings.align === 'center') {
      const w = font.widthOfTextAtSize(line, settings.fontSize);
      x = (W - w) / 2;
    } else if (settings.align === 'right') {
      const w = font.widthOfTextAtSize(line, settings.fontSize);
      x = W - margin - w;
    }
    page.drawText(line, {
      x,
      y: y - settings.fontSize,
      size: settings.fontSize,
      font,
      color: rgb(0.05, 0.05, 0.05),
    });
    y -= lineHeight;
  }

  const bytes = await pdf.save();
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const safe = title.replace(/[\\/:*?"<>|]/g, '_') || 'teks';
  return { blob, fileName: `${safe}.pdf`, pages: pageCount };
}

/** Minimal safe HTML → structured text. No script, no external resources. */
export function sanitizeAndExtractText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Remove dangerous elements
  doc.querySelectorAll('script, style, iframe, object, embed, link, meta, noscript').forEach((el) => el.remove());
  // Remove event handlers and javascript: urls
  const all = doc.querySelectorAll('*');
  all.forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const val = attr.value.toLowerCase();
      if (name.startsWith('on') || val.startsWith('javascript:') || name === 'srcdoc') {
        el.removeAttribute(attr.name);
      }
    }
  });
  // Prefer body text; fall back to whole document
  const root = doc.body || doc.documentElement;
  return extractStructured(root).trim();
}

function extractStructured(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (['script', 'style', 'noscript'].includes(tag)) return '';
  const childText = [...el.childNodes].map(extractStructured).join('');
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) return '\n\n' + childText.trim() + '\n\n';
  if (tag === 'p' || tag === 'div' || tag === 'br') return childText.trim() + '\n\n';
  if (tag === 'li') return '• ' + childText.trim() + '\n';
  if (tag === 'tr') return childText.trim() + '\n';
  if (tag === 'td' || tag === 'th') return childText.trim() + '\t';
  return childText;
}

export async function htmlToPdf(
  html: string,
  settings: TextSettings,
): Promise<{ blob: Blob; fileName: string; pages: number }> {
  const text = sanitizeAndExtractText(html);
  if (!text.trim()) throw new Error('HTML tidak mengandung teks yang dapat diekstrak');
  return textToPdf(text, { ...settings, title: settings.title || 'Dokumen HTML' });
}
