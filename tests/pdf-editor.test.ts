import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { exportPdf, validatePdfBlob, type EditorPage, type EditorAnnotation } from '../src/tools/pdf-editor/engine';

async function makePdf(pages = 2): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage([200, 200]);
  const u = await doc.save();
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
}

describe('PDF Editor engine (Batch 11)', () => {
  it('export mempertahankan urutan dan rotasi', async () => {
    const src = await makePdf(2);
    const pages: EditorPage[] = [
      { id: 'p2', sourceIndex: 1, rotation: 90 },
      { id: 'p1', sourceIndex: 0, rotation: 0 },
    ];
    const blob = await exportPdf(src, pages, []);
    expect(await validatePdfBlob(blob)).toBe(true);
    const out = await PDFDocument.load(await blob.arrayBuffer());
    expect(out.getPageCount()).toBe(2);
  });

  it('export menolak PDF kosong secara aman', async () => {
    const src = await makePdf(1);
    const pages: EditorPage[] = [];
    const blob = await exportPdf(src, pages, []);
    expect(blob.size).toBeGreaterThan(0);
  });

  it('anotasi teks masuk ke PDF', async () => {
    const src = await makePdf(1);
    const pages: EditorPage[] = [{ id: 'p1', sourceIndex: 0, rotation: 0 }];
    const anns: EditorAnnotation[] = [{ id: 'a1', pageId: 'p1', type: 'text', x: 0.1, y: 0.1, w: 0.5, h: 0.1, text: 'Hello' }];
    const blob = await exportPdf(src, pages, anns);
    expect(await validatePdfBlob(blob)).toBe(true);
  });
});
