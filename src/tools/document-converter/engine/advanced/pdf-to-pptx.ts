import PptxGenJS from 'pptxgenjs';
import { importPdfJs } from '../../../../lib/pdfjs-runtime';

export interface PdfToPptxResult {
  blob: Blob;
  slideCount: number;
  quality: 'high' | 'medium' | 'low';
  label: string;
  warnings: string[];
}

export async function pdfToPptx(data: ArrayBuffer): Promise<PdfToPptxResult> {
  if (typeof document === 'undefined') {
    throw new Error('PDF ke PPTX membutuhkan canvas di browser. Tidak dijalankan di lingkungan tanpa DOM.');
  }
  const pdfjs = await importPdfJs();
  const task = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableWorker: true,
    isEvalSupported: false,
  } as never);
  const doc = await task.promise;
  const pptx = new PptxGenJS();
  const warnings: string[] = ['Setiap halaman menjadi gambar. Teks dan objek tidak dapat diedit.'];
  const max = Math.min(doc.numPages, 20);
  try {
    for (let i = 1; i <= max; i++) {
      try {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.25 });
        const canvas = document.createElement('canvas');
        const w = Math.min(1600, Math.floor(viewport.width));
        const h = Math.min(1600, Math.floor(viewport.height));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const slide = pptx.addSlide();
        slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
      } catch (e) {
        warnings.push(`Halaman ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    await task.destroy();
  }
  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  return {
    blob,
    slideCount: max,
    quality: warnings.length <= 1 ? 'medium' : 'low',
    label: 'Image-based slides',
    warnings,
  };
}
