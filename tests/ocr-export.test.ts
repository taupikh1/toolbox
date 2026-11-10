import { describe, expect, it } from 'vitest';
import { ocrToTxt, ocrPagesToTxt } from '../src/tools/document-converter/engine/ocr/export';
import type { OcrResult } from '../src/tools/document-converter/engine/ocr/types';

const sample: OcrResult = {
  text: 'Halo dunia',
  pages: [
    { page: 1, text: 'Halo', language: 'eng', source: 'ocr', confidence: 90 },
    { page: 2, text: 'dunia', language: 'eng', source: 'ocr' },
  ],
  language: 'eng',
  status: 'success',
  errors: [],
  warnings: [],
};

describe('OCR export (Batch 7C)', () => {
  it('ocrToTxt memakai teks yang diedit jika diberikan', async () => {
    const b = ocrToTxt(sample, 'teks baru');
    expect(await b.text()).toBe('teks baru');
  });
  it('ocrPagesToTxt memuat nomor halaman', async () => {
    const t = await ocrPagesToTxt(sample).text();
    expect(t).toContain('Halaman 1');
    expect(t).toContain('Halo');
    expect(t).toContain('Halaman 2');
  });
});
