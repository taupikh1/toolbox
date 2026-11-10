import { describe, expect, it } from 'vitest';
import { buildPptx, newSlide } from '../src/tools/document-converter/engine/powerpoint/writer';
import { parsePptx } from '../src/tools/document-converter/engine/powerpoint/parser';

describe('PPTX Writer + round-trip (Batch 6C)', () => {
  it('membuat PPTX kosong dan dibaca ulang', async () => {
    const blob = await buildPptx({ title: 'Kosong', slides: [] });
    expect(blob.size).toBeGreaterThan(100);
    const buf = await blob.arrayBuffer();
    const r = await parsePptx(buf, 'kosong.pptx', buf.byteLength);
    expect(r.status).not.toBe('failed');
    expect(r.document.slideCount).toBeGreaterThanOrEqual(1);
  });

  it('round-trip judul dan teks', async () => {
    const slides = [
      newSlide({ title: 'Judul Satu', body: 'Teks pertama di Jakarta' }),
      newSlide({ title: 'Judul Dua', body: 'Teks kedua' }),
    ];
    const blob = await buildPptx({ title: 'Tes', slides });
    const buf = await blob.arrayBuffer();
    const r = await parsePptx(buf, 'tes.pptx', buf.byteLength);
    expect(r.status).toBe('success');
    expect(r.document.slideCount).toBe(2);
    const allText = r.slides.map((s) => s.plainText).join(' ');
    expect(allText).toContain('Judul Satu');
    expect(allText).toContain('Teks pertama di Jakarta');
    expect(allText).toContain('Judul Dua');
  });

  it('gambar ikut tertanam', async () => {
    // tiny 1x1 png data url
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const slides = [newSlide({ title: 'Ada Gambar', imageDataUrl: png })];
    const blob = await buildPptx({ title: 'Img', slides });
    const buf = await blob.arrayBuffer();
    const r = await parsePptx(buf, 'img.pptx', buf.byteLength);
    expect(r.media.length).toBeGreaterThan(0);
    expect(r.slides[0].mediaRefs.length).toBeGreaterThan(0);
  });
});
