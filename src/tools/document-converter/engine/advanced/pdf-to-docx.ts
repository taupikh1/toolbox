import { Document, Packer, Paragraph, TextRun } from 'docx';
import { importPdfJs } from '../../../../lib/pdfjs-runtime';

export interface PdfTextExtract {
  pages: string[];
  warnings: string[];
}

export interface PdfToDocxResult {
  blob: Blob;
  pageCount: number;
  textLength: number;
  quality: 'high' | 'medium' | 'low';
  label: string;
  warnings: string[];
}

interface PdfTextDoc {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }>;
}
interface PdfLoadTask {
  destroy: () => Promise<void>;
  promise: Promise<PdfTextDoc>;
}

export async function extractPdfPages(data: ArrayBuffer): Promise<PdfTextExtract> {
  let pdfjs: Awaited<ReturnType<typeof importPdfJs>>;
  try {
    pdfjs = await importPdfJs();
  } catch {
    return { pages: [], warnings: ['pdfjs tidak tersedia.'] };
  }
  const pages: string[] = [];
  const warnings: string[] = [];
  let task: PdfLoadTask | null = null;
  try {
    const params = {
      data: new Uint8Array(data),
      disableWorker: true,
      isEvalSupported: false,
    };
    task = pdfjs.getDocument(params as never) as unknown as PdfLoadTask;
    const doc = await task.promise;
    const max = Math.min(doc.numPages, 30);
    for (let i = 1; i <= max; i++) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map((it) => it.str ?? '').join(' ').trim();
        pages.push(text);
        if (!text) warnings.push(`Halaman ${i}: tidak ada text layer.`);
      } catch (e) {
        warnings.push(`Halaman ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } catch (e) {
    return { pages: [], warnings: [`PDF tidak dapat dibaca: ${e instanceof Error ? e.message : String(e)}`] };
  } finally {
    if (task) await task.destroy().catch(() => undefined);
  }
  return { pages, warnings };
}

export async function pdfToDocx(data: ArrayBuffer): Promise<PdfToDocxResult> {
  const { pages, warnings } = await extractPdfPages(data);
  const children: Paragraph[] = [];
  let textLength = 0;
  pages.forEach((p, i) => {
    if (i > 0) children.push(new Paragraph({ children: [new TextRun({ text: `--- Halaman ${i + 1} ---`, bold: true })] }));
    const paras = p.split(/\n+/).filter(Boolean);
    if (!paras.length) children.push(new Paragraph({ children: [new TextRun('(halaman kosong)')] }));
    else paras.forEach((t) => { children.push(new Paragraph({ children: [new TextRun(t)] })); textLength += t.length; });
  });
  if (!children.length) children.push(new Paragraph({ children: [new TextRun('(tidak ada teks)')] }));
  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  const quality = textLength > 100 && warnings.length === 0 ? 'medium' : 'low';
  return {
    blob,
    pageCount: pages.length,
    textLength,
    quality,
    label: 'Text-based reconstruction',
    warnings,
  };
}
