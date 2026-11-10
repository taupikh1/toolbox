import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { pdfToDocx } from '../src/tools/document-converter/engine/advanced/pdf-to-docx';

describe('Advanced converter (Batch 12)', () => {
  it('pdfToDocx menghasilkan blob', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const u = await doc.save();
    const buf = u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength);
    const r = await pdfToDocx(buf);
    expect(r.blob.size).toBeGreaterThan(0);
    expect(r.label).toContain('Text-based');
  });
});
