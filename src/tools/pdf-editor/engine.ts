import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';

export interface EditorPage {
  id: string;
  sourceIndex: number;
  rotation: number; // 0, 90, 180, 270
}

export interface EditorAnnotation {
  id: string;
  pageId: string;
  type: 'text' | 'rect' | 'image';
  x: number; // 0..1 relative
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  imageData?: Uint8Array;
}

let _id = 1;
function nid() { return `n${_id++}`; }

export async function loadPdf(data: ArrayBuffer): Promise<{ doc: PDFDocument; pages: EditorPage[] }> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: false });
  const pages: EditorPage[] = doc.getPageIndices().map((i) => ({
    id: nid(),
    sourceIndex: i,
    rotation: 0,
  }));
  return { doc, pages };
}

export async function exportPdf(
  source: ArrayBuffer,
  pages: EditorPage[],
  annotations: EditorAnnotation[],
): Promise<Blob> {
  const src = await PDFDocument.load(source);
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);

  for (const p of pages) {
    const [copied] = await out.copyPages(src, [p.sourceIndex]);
    if (p.rotation) copied.setRotation(degrees(p.rotation));
    out.addPage(copied);

    // Annotations on this page (relative coords)
    const anns = annotations.filter((a) => a.pageId === p.id);
    const { width, height } = copied.getSize();
    for (const a of anns) {
      const x = a.x * width;
      const y = (1 - a.y - a.h) * height;
      const w = a.w * width;
      const h = a.h * height;
      if (a.type === 'rect') {
        copied.drawRectangle({
          x, y, width: w, height: h,
          borderColor: rgb(0.9, 0.2, 0.2),
          borderWidth: 1.5,
          opacity: 0.6,
        });
      } else if (a.type === 'text' && a.text) {
        copied.drawText(a.text.slice(0, 200), {
          x, y: y + h - 12,
          size: 12,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
      } else if (a.type === 'image' && a.imageData) {
        try {
          let img;
          try { img = await out.embedPng(a.imageData); }
          catch { img = await out.embedJpg(a.imageData); }
          copied.drawImage(img, { x, y, width: w, height: h });
        } catch { /* skip bad image */ }
      }
    }
  }

  const bytes = await out.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export function validatePdfBlob(blob: Blob): Promise<boolean> {
  return blob.arrayBuffer().then((buf) => {
    const u = new Uint8Array(buf);
    const head = String.fromCharCode(...u.subarray(0, 8));
    return head.includes('%PDF');
  });
}
