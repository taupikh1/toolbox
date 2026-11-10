import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { parsePptx } from '../powerpoint/parser';

export interface PptxToPdfResult {
  blob: Blob;
  pageCount: number;
  quality: 'high' | 'medium' | 'low';
  label: string;
  warnings: string[];
}

export async function pptxToPdf(file: File | ArrayBuffer): Promise<PptxToPdfResult> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const parsed = await parsePptx(data);
  const warnings = [...parsed.errors];
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const slide of parsed.slides) {
    const page = pdf.addPage([720, 540]);
    const text = slide.plainText || slide.texts.join('\n') || '(slide kosong)';
    const lines = text.split('\n').slice(0, 30);
    let y = 500;
    for (const line of lines) {
      const safe = line.replace(/[^\x20-\x7E]/g, '?').slice(0, 80);
      page.drawText(safe || ' ', { x: 40, y, size: 12, font, color: rgb(0, 0, 0) });
      y -= 16;
      if (y < 40) break;
    }
    if (slide.mediaRefs.length) warnings.push(`Slide ${slide.number}: ${slide.mediaRefs.length} media tidak dirender.`);
  }
  const bytes = await pdf.save();
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    pageCount: parsed.slides.length,
    quality: 'low',
    label: 'Text-only reconstruction (approximate)',
    warnings,
  };
}
