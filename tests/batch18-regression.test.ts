import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { escapeHtml } from '../src/tools/document-converter/engine/word/blocks';
import { extractSlideTexts } from '../src/tools/document-converter/engine/powerpoint/parser';
import { tableToHtml } from '../src/tools/document-converter/engine/pdf-table/export';
import { pdfToDocx } from '../src/tools/document-converter/engine/advanced/pdf-to-docx';
import { pptxToPdf } from '../src/tools/document-converter/engine/advanced/pptx-to-pdf';
import { conversionRegistry } from '../src/tools/document-converter/registry/conversion-registry';
import { tools } from '../src/tools/registry';
import { ensurePromiseTry } from '../src/lib/pdfjs-runtime';
import { MODEL_REGISTRY } from '../src/tools/local-ai/models';

describe('Batch 18 regression', () => {
  it('escapeHtml benar-benar meng-escape markup', () => {
    const out = escapeHtml('a <b> & "c"');
    expect(out).not.toContain('<');
    expect(out).toContain('&lt;');
    expect(out).toContain('&amp;');
    expect(out).toContain('&quot;');
  });

  it('HTML tabel PDF meng-escape sel', () => {
    const html = tableToHtml({
      id: 't', pageStart: 1, pageEnd: 1, confidence: 'low', warnings: [], method: 'y-x-grouping',
      rows: [['<script>alert(1)</script>', 'A & B']],
    });
    expect(html.toLowerCase()).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B');
  });

  it('teks PPTX mendekode entitas XML', () => {
    const texts = extractSlideTexts('<a:t>A &amp; B &lt;C&gt;</a:t>');
    expect(texts).toEqual(['A & B <C>']);
  });

  it('PDF editor terdaftar di navigasi', () => {
    expect(tools.some((t) => t.id === 'pdf-editor')).toBe(true);
  });

  it('kartu konversi parsial bisa dijalankan dan jujur', () => {
    for (const id of ['pdf-to-txt', 'pdf-to-docx', 'pdf-to-xlsx', 'pptx-to-pdf']) {
      const d = conversionRegistry.get(id)!;
      expect(conversionRegistry.isRunnable(d)).toBe(true);
      expect(d.limitations.join(' ').length).toBeGreaterThan(10);
    }
    const ppt = conversionRegistry.get('pptx-to-pdf')!;
    expect(ppt.name.toLowerCase()).toContain('teks');
    expect(ppt.limitations.join(' ').toLowerCase()).toContain('tidak dirender');
    const img = conversionRegistry.get('pdf-to-pptx')!;
    expect(img.limitations.join(' ').toLowerCase()).toContain('gambar');
  });

  it('Local AI tidak mengklaim inference', () => {
    expect(MODEL_REGISTRY.every((m) => m.status !== 'available')).toBe(true);
  });

  it('pdfToDocx menghasilkan DOCX berisi teks PDF, bukan hanya header %PDF', async () => {
    ensurePromiseTry();
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 200]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText('Halo Batch 18', { x: 40, y: 100, size: 16, font });
    const bytes = await doc.save();
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const r = await pdfToDocx(buf);
    expect(r.pageCount).toBe(1);
    expect(r.textLength).toBeGreaterThan(0);
    expect(r.label).toContain('Text-based');
    const zip = await JSZip.loadAsync(await r.blob.arrayBuffer());
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Halo Batch 18');
  }, 20000);

  it('PDF rusak tidak menggantung pdfToDocx', async () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    const r = await pdfToDocx(junk);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.blob.size).toBeGreaterThan(0);
  }, 15000);

  it('pptxToPdf menandai hasil sebagai teks', async () => {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>');
    zip.file('ppt/presentation.xml', '<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst></p:presentation>');
    zip.file('ppt/_rels/presentation.xml.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
    zip.file('ppt/slides/slide1.xml', '<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:t>Judul &amp; isi</a:t></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
    const data = await zip.generateAsync({ type: 'uint8array' });
    const file = new File([data], 'deck.pptx', { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const r = await pptxToPdf(file);
    expect(r.label.toLowerCase()).toContain('text');
    expect(r.pageCount).toBe(1);
    const head = new Uint8Array(await r.blob.arrayBuffer()).slice(0, 5);
    expect(String.fromCharCode(...head)).toBe('%PDF-');
    expect(r.pageCount).toBe(1);
  });
});
