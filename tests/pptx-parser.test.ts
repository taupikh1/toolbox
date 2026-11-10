import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { parsePptx, extractSlideTexts } from '../src/tools/document-converter/engine/powerpoint/parser';
import { pptxToTxt } from '../src/tools/document-converter/engine/powerpoint/converters';
import { validateFile } from '../src/tools/document-converter/validation/file-validator';

function makePptx(opts: {
  slides?: { texts?: string[]; images?: string[] }[];
  corrupt?: boolean;
}): Promise<Uint8Array> {
  const zip = new JSZip();
  const slides = opts.slides ?? [{ texts: ['Halo dunia'] }];
  // [Content_Types].xml minimal
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
  // presentation.xml
  const sldIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>${sldIds}</p:sldIdLst>
</p:presentation>`);
  // rels
  const rels = slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('');
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`);
  // slides
  slides.forEach((s, i) => {
    const texts = (s.texts ?? []).map((t) => `<a:t>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</a:t>`).join('');
    zip.file(`ppt/slides/slide${i + 1}.xml`, `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p>${texts}</a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
    if (s.images?.length) {
      const imgRels = s.images.map((img, j) => `<Relationship Id="rId${j + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${img}"/>`).join('');
      zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, `<?xml version="1.0"?><Relationships>${imgRels}</Relationships>`);
      s.images.forEach((img) => zip.file(`ppt/media/${img}`, new Uint8Array([0x89, 0x50, 0x4e, 0x47]))); // fake png
    }
  });
  if (opts.corrupt) {
    // remove presentation
    zip.remove('ppt/presentation.xml');
  }
  return zip.generateAsync({ type: 'uint8array' });
}

describe('PPTX parser (Batch 6A)', () => {
  it('ekstrak teks sederhana', () => {
    expect(extractSlideTexts('<a:t>Halo</a:t><a:t> dunia</a:t>')).toEqual(['Halo', 'dunia']);
  });

  it('parse PPTX valid dengan teks Indonesia', async () => {
    const data = await makePptx({
      slides: [
        { texts: ['Judul Presentasi'] },
        { texts: ['Pengaturan di Jakarta', 'tanggal 10 November 2026'] },
      ],
    });
    const r = await parsePptx(data, 'contoh.pptx', data.length);
    expect(r.status).toBe('success');
    expect(r.document.slideCount).toBe(2);
    expect(r.slides[0].plainText).toBe('Judul Presentasi');
    expect(r.slides[1].texts).toContain('Pengaturan di Jakarta');
    expect(r.slides[0].number).toBe(1);
    expect(r.slides[1].number).toBe(2);
  });

  it('urutan slide mengikuti sldIdLst bukan nama file', async () => {
    const data = await makePptx({
      slides: [
        { texts: ['Pertama'] },
        { texts: ['Kedua'] },
        { texts: ['Ketiga'] },
      ],
    });
    const r = await parsePptx(data);
    expect(r.slides.map((s) => s.plainText)).toEqual(['Pertama', 'Kedua', 'Ketiga']);
  });

  it('PPTX tanpa teks', async () => {
    const data = await makePptx({ slides: [{ texts: [] }, { texts: [] }] });
    const r = await parsePptx(data);
    expect(r.status).toBe('success');
    expect(r.slides[0].plainText).toBe('');
  });

  it('PPTX dengan gambar', async () => {
    const data = await makePptx({
      slides: [{ texts: ['Ada gambar'], images: ['image1.png'] }],
    });
    const r = await parsePptx(data);
    expect(r.slides[0].mediaRefs.length).toBe(1);
    expect(r.slides[0].mediaRefs[0].target).toContain('media/image1.png');
    expect(r.media).toContain('ppt/media/image1.png');
  });

  it('PPTX rusak / bukan PPTX', async () => {
    const bad = new Uint8Array([1, 2, 3, 4]);
    const r = await parsePptx(bad);
    expect(r.status).toBe('failed');
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('validasi file bukan PPTX ditolak', () => {
    const head = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const res = validateFile({ name: 'file.pptx', size: 100, type: '' }, head, ['pptx']);
    expect(res.ok).toBe(false);
  });

  it('pptxToTxt menghasilkan teks', async () => {
    const data = await makePptx({ slides: [{ texts: ['Tes'] }] });
    const file = new File([data], 'tes.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const out = await pptxToTxt(file);
    expect(out.previewText).toContain('Tes');
    expect(out.fileName).toBe('tes.txt');
  });
});
