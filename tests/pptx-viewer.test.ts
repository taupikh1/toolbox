import { describe, expect, it } from 'vitest';
import { parsePptx } from '../src/tools/document-converter/engine/powerpoint/parser';
import { extractMediaUrls, revokeMedia } from '../src/tools/document-converter/engine/powerpoint/media';
import JSZip from 'jszip';

async function makePptxWithImage() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types></Types>');
  zip.file('ppt/presentation.xml', `<?xml version="1.0"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>
</p:presentation>`);
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  </Relationships>`);
  zip.file('ppt/slides/slide1.xml', `<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:t>Slide dengan gambar</a:t></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`);
  zip.file('ppt/slides/_rels/slide1.xml.rels', `<?xml version="1.0"?><Relationships>
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
  </Relationships>`);
  zip.file('ppt/media/image1.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return zip.generateAsync({ type: 'uint8array' });
}

describe('PPTX viewer media (Batch 6B)', () => {
  it('extractMediaUrls menghasilkan URL untuk gambar', async () => {
    const data = await makePptxWithImage();
    const result = await parsePptx(data, 'gambar.pptx', data.length);
    expect(result.status).toBe('success');
    expect(result.slides[0].mediaRefs.length).toBe(1);
    const map = await extractMediaUrls(data, result);
    expect(map.size).toBe(1);
    const m = [...map.values()][0];
    expect(m.mime).toBe('image/png');
    expect(m.url).toMatch(/^blob:/);
    revokeMedia(map);
    expect(map.size).toBe(0);
  });
});
