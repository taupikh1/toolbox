import { PDFDocument } from 'pdf-lib';
import type { OcrResult } from './types';

/** TXT dari seluruh hasil OCR. */
export function ocrToTxt(result: OcrResult, editedText?: string): Blob {
  const text = editedText ?? result.text;
  return new Blob([text], { type: 'text/plain;charset=utf-8' });
}

/** TXT per halaman. */
export function ocrPagesToTxt(result: OcrResult): Blob {
  const lines = result.pages.map((p) => `--- Halaman ${p.page} (${p.source}) ---\n${p.text}\n`);
  return new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
}

/**
 * PDF dari halaman scan (gambar). Bukan searchable PDF — tidak ada text layer.
 * Hanya menyematkan gambar hasil pemrosesan.
 */
export async function pagesToPdf(blobs: Blob[]): Promise<Blob> {
  const pdf = await PDFDocument.create();
  for (const blob of blobs) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let img;
    try {
      img = await pdf.embedPng(bytes);
    } catch {
      img = await pdf.embedJpg(bytes);
    }
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  const out = await pdf.save();
  return new Blob([out], { type: 'application/pdf' });
}
