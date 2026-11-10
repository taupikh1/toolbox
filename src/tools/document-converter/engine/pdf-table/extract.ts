import type { TextItem, ExtractedTable, ExtractionResult } from './types';

/**
 * Ekstraksi tabel heuristik dari item teks berkoordinat (PDF.js getTextContent).
 * Mengelompokkan berdasarkan Y (baris) lalu X (kolom).
 * Bukan deteksi garis. Hasil perlu ditinjau pengguna.
 */
export function itemsToTables(items: TextItem[], page: number): ExtractedTable[] {
  if (!items.length) return [];
  // Group by approximate Y (tolerance 4px)
  const rowsMap = new Map<number, TextItem[]>();
  for (const it of items) {
    const yKey = Math.round(it.y / 4) * 4;
    if (!rowsMap.has(yKey)) rowsMap.set(yKey, []);
    rowsMap.get(yKey)!.push(it);
  }
  const sortedYs = [...rowsMap.keys()].sort((a, b) => b - a); // top to bottom
  const rawRows: string[][] = [];
  for (const y of sortedYs) {
    const cells = rowsMap.get(y)!.sort((a, b) => a.x - b.x);
    rawRows.push(cells.map((c) => c.str.trim()).filter(Boolean));
  }
  // Filter empty
  const rows = rawRows.filter((r) => r.length > 0);
  if (rows.length < 2) return [];
  // Normalize column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    const out = [...r];
    while (out.length < maxCols) out.push('');
    return out;
  });
  const confidence: ExtractedTable['confidence'] =
    maxCols >= 2 && rows.length >= 3 ? 'medium' : 'low';
  return [{
    id: `t${page}-1`,
    pageStart: page,
    pageEnd: page,
    rows: normalized,
    confidence,
    warnings: confidence === 'low' ? ['Struktur kolom mungkin tidak konsisten.'] : [],
    method: 'y-x-grouping',
  }];
}

export async function extractTablesFromPdf(data: ArrayBuffer): Promise<ExtractionResult> {
  let pdfjs: any;
  try {
    pdfjs = await import('../../../../lib/pdfjs-runtime').then((m) => m.importPdfJs());
  } catch {
    return { tables: [], textItems: [], warnings: ['pdfjs-dist tidak tersedia.'], status: 'failed' };
  }
  let doc: any;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(data), disableWorker: true, isEvalSupported: false }).promise;
  } catch (e) {
    return { tables: [], textItems: [], warnings: [`PDF tidak dapat dibaca: ${e instanceof Error ? e.message : String(e)}`], status: 'failed' };
  }
  const allItems: TextItem[] = [];
  const tables: ExtractedTable[] = [];
  const warnings: string[] = [];
  const maxPages = Math.min(doc.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const items: TextItem[] = content.items
        .filter((it: any) => it.str && it.str.trim())
        .map((it: any) => ({
          str: it.str,
          x: it.transform?.[4] ?? 0,
          y: it.transform?.[5] ?? 0,
          width: it.width ?? 0,
          height: it.height ?? 0,
          page: i,
        }));
      allItems.push(...items);
      if (items.length === 0) {
        warnings.push(`Halaman ${i}: tidak ada text layer (mungkin scan).`);
      } else {
        tables.push(...itemsToTables(items, i));
      }
    } catch (e) {
      warnings.push(`Halaman ${i}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  const status = tables.length > 0 ? 'success' : allItems.length > 0 ? 'partial' : 'failed';
  return { tables, textItems: allItems, warnings, status };
}
