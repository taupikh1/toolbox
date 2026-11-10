/**
 * Excel conversion implementations — Phase 7 Batch 2.
 * All processing is local (SheetJS + pdf-lib). No network, no backend.
 */
import { loadSheetJS } from './sheetjs-loader';
import {
  readWorkbook, getWorkbookMeta, resolveSheet, sheetToAoA,
  aoaToCsv, aoaToPreview, uniqueHeaders, cellToString,
} from './workbook';
import type {
  XlsxToCsvOptions, XlsxToJsonOptions, XlsxToHtmlOptions,
  CsvToXlsxOptions, JsonToXlsxOptions, HtmlTableToXlsxOptions,
  XlsxToPdfOptions, ConversionResult, WorkbookMeta, PreviewTable, CsvDelimiter,
} from './types';

async function ab(file: File) { return file.arrayBuffer(); }
function base(name: string) { const i = name.lastIndexOf('.'); return i > 0 ? name.slice(0, i) : name; }

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---- Preview helper ----
export async function previewXlsx(
  file: File,
  opts: { sheetName?: string; sheetIndex?: number; maxRows?: number } = {},
): Promise<{ meta: WorkbookMeta; preview: PreviewTable; sheetName: string }> {
  const XLSX = await loadSheetJS();
  const wb = readWorkbook(XLSX, await ab(file));
  const meta = getWorkbookMeta(XLSX, wb);
  const { name, sheet } = resolveSheet(wb, opts);
  return { meta, preview: aoaToPreview(sheetToAoA(XLSX, sheet), opts.maxRows ?? 25), sheetName: name };
}

// ---- XLSX → CSV ----
export async function convertXlsxToCsv(file: File, opts: XlsxToCsvOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const wb = readWorkbook(XLSX, await ab(file));
  const { name, sheet } = resolveSheet(wb, opts);
  const aoa = sheetToAoA(XLSX, sheet);
  const csv = aoaToCsv(aoa, {
    delimiter: opts.delimiter ?? ',',
    quote: opts.quote ?? '"',
    protectFormulas: opts.protectFormulas !== false,
    includeBom: !!opts.includeBom,
  });
  return {
    blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    fileName: `${base(file.name)}_${name}.csv`,
    losses: [
      'Hanya satu worksheet per file CSV.',
      'Rumus diekspor sebagai nilai tersimpan (cached value).',
      opts.protectFormulas !== false
        ? 'Nilai diawali = + - @ dilindungi (awalan kutip) agar tidak dieksekusi sebagai formula.'
        : 'Perlindungan formula injection DINONAKTIFKAN.',
    ],
    meta: { sheetName: name, rows: aoa.length },
  };
}

// ---- XLSX → JSON ----
export async function convertXlsxToJson(file: File, opts: XlsxToJsonOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const wb = readWorkbook(XLSX, await ab(file));
  const { name, sheet } = resolveSheet(wb, opts);
  const shape = opts.shape ?? 'array-of-objects';
  const pretty = opts.pretty !== false;
  let data: unknown;
  if (shape === 'array-of-arrays') {
    data = sheetToAoA(XLSX, sheet);
  } else {
    const aoa = sheetToAoA(XLSX, sheet);
    if (!aoa.length) data = [];
    else if (opts.headerRow === false) {
      data = aoa.map((row) => {
        const o: Record<string, unknown> = {};
        (row as unknown[]).forEach((c, i) => { o[`col_${i + 1}`] = c; });
        return o;
      });
    } else {
      const headers = uniqueHeaders((aoa[0] as unknown[]).map(cellToString));
      data = aoa.slice(1).map((row) => {
        const o: Record<string, unknown> = {};
        headers.forEach((h, i) => { o[h] = (row as unknown[])[i] ?? ''; });
        return o;
      });
    }
  }
  const text = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return {
    blob: new Blob([text], { type: 'application/json;charset=utf-8' }),
    fileName: `${base(file.name)}_${name}.json`,
    losses: [
      shape === 'array-of-objects'
        ? 'Baris pertama dipakai sebagai header. Header kosong/duplikat dinormalisasi.'
        : 'Array-of-arrays: baris pertama juga data.',
      'Tanggal diekspor sebagai string tampilan.',
    ],
    meta: { sheetName: name, shape },
  };
}

// ---- XLSX → HTML ----
export async function convertXlsxToHtml(file: File, opts: XlsxToHtmlOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const wb = readWorkbook(XLSX, await ab(file));
  const { name, sheet } = resolveSheet(wb, opts);
  const aoa = sheetToAoA(XLSX, sheet);
  const includeHeader = opts.includeHeader !== false;
  const lines: string[] = [
    '<!DOCTYPE html>', '<html lang="id">', '<head>',
    '<meta charset="utf-8"/>', `<title>${escapeHtml(name)}</title>`,
    '<style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 8px;text-align:left}th{background:#f5f5f5}</style>',
    '</head>', '<body>', `<h1>${escapeHtml(name)}</h1>`, '<table>',
  ];
  aoa.forEach((row, ri) => {
    const cells = (Array.isArray(row) ? row : []).map(cellToString);
    const tag = includeHeader && ri === 0 ? 'th' : 'td';
    if (ri === 0 && includeHeader) lines.push('<thead>');
    if (ri === 1 && includeHeader) lines.push('</thead><tbody>');
    if (ri === 0 && !includeHeader) lines.push('<tbody>');
    lines.push('<tr>' + cells.map((c) => `<${tag}>${escapeHtml(c)}</${tag}>`).join('') + '</tr>');
  });
  if (aoa.length) {
    if (includeHeader && aoa.length === 1) lines.push('</thead>');
    else lines.push('</tbody>');
  }
  lines.push('</table>', '</body></html>');
  return {
    blob: new Blob([lines.join('\n')], { type: 'text/html;charset=utf-8' }),
    fileName: `${base(file.name)}_${name}.html`,
    losses: [
      'Hanya data sel; pemformatan, merge, grafik, gambar tidak disertakan.',
      'Semua isi sel di-escape (aman dari XSS).',
    ],
    meta: { sheetName: name, rows: aoa.length },
  };
}

// ---- CSV helpers ----
function detectDelimiter(sample: string): CsvDelimiter {
  const cands: CsvDelimiter[] = [',', ';', '\t', '|'];
  const first = sample.split(/\r?\n/)[0] ?? '';
  let best: CsvDelimiter = ',', bestCount = -1;
  for (const d of cands) {
    let count = 0, inQ = false;
    for (let i = 0; i < first.length; i++) {
      const ch = first[i];
      if (ch === '"') inQ = !inQ;
      else if (!inQ && ch === d) count++;
    }
    if (count > bestCount) { bestCount = count; best = d; }
  }
  return best;
}

function parseCsvText(text: string, delimiter: string, quote: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [], field = '', i = 0, inQ = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === quote) {
        if (text[i + 1] === quote) { field += quote; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === quote) { inQ = true; i++; continue; }
    if (ch === delimiter) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += ch; i++;
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '' || rows.length === 0) rows.push(row);
  return rows;
}

// ---- CSV → XLSX ----
export async function convertCsvToXlsx(file: File, opts: CsvToXlsxOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const text = await file.text();
  const delimiter = opts.delimiter && opts.delimiter !== 'auto' ? opts.delimiter : detectDelimiter(text.slice(0, 4096));
  const quote = opts.quote ?? '"';
  const rows = parseCsvText(text, delimiter, quote);
  const interpretation = opts.interpretation ?? 'preserve-text';
  const sheetName = (opts.sheetName?.trim() || 'Sheet1').slice(0, 31);
  const aoa: unknown[][] = rows.map((r) =>
    r.map((cell) => {
      if (interpretation === 'preserve-text') return cell;
      if (cell === '') return '';
      if (/^-?\d+(\.\d+)?$/.test(cell) && !/^0\d+/.test(cell)) {
        const n = Number(cell);
        if (Number.isFinite(n)) return n;
      }
      return cell;
    }),
  );
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (interpretation === 'preserve-text' && ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= Math.min(range.e.c, 199); C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'string') { cell.t = 's'; cell.z = '@'; }
      }
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return {
    blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName: `${base(file.name)}.xlsx`,
    losses: [
      `Delimiter: ${delimiter === '\t' ? 'Tab' : delimiter}`,
      interpretation === 'preserve-text'
        ? 'Semua nilai disimpan sebagai teks (leading zero, NIK, telepon tetap utuh).'
        : 'Angka tanpa leading zero dideteksi sebagai number.',
    ],
    meta: { sheetName, rows: aoa.length, delimiter },
  };
}

// ---- JSON → XLSX ----
export async function convertJsonToXlsx(file: File, opts: JsonToXlsxOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  let parsed: unknown;
  try { parsed = JSON.parse(await file.text()); }
  catch (e) { throw new Error('JSON tidak valid: ' + (e instanceof Error ? e.message : String(e))); }
  const sheetName = (opts.sheetName?.trim() || 'Sheet1').slice(0, 31);
  let aoa: unknown[][] = [];
  const losses: string[] = [];
  if (Array.isArray(parsed)) {
    if (!parsed.length) aoa = [];
    else if (Array.isArray(parsed[0])) aoa = parsed as unknown[][];
    else if (typeof parsed[0] === 'object' && parsed[0] !== null) {
      const keys = new Set<string>();
      for (const item of parsed) {
        if (item && typeof item === 'object' && !Array.isArray(item))
          Object.keys(item as object).forEach((k) => keys.add(k));
      }
      const headers = Array.from(keys);
      aoa.push(headers);
      for (const item of parsed) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) { aoa.push(headers.map(() => '')); continue; }
        const obj = item as Record<string, unknown>;
        aoa.push(headers.map((h) => {
          const v = obj[h];
          if (v == null) return '';
          if (typeof v === 'object') { losses.push('Nested object/array diubah menjadi string JSON.'); return JSON.stringify(v); }
          return v;
        }));
      }
    } else {
      aoa = [['value'], ...parsed.map((v) => [v])];
    }
  } else if (parsed && typeof parsed === 'object') {
    const headers = Object.keys(parsed as object);
    aoa.push(headers);
    aoa.push(headers.map((h) => (parsed as Record<string, unknown>)[h] ?? ''));
    losses.push('JSON objek tunggal diubah menjadi satu baris.');
  } else {
    throw new Error('Struktur JSON tidak didukung. Gunakan array of objects atau array of arrays.');
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return {
    blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName: `${base(file.name)}.xlsx`,
    losses: losses.length ? [...new Set(losses)] : undefined,
    meta: { sheetName, rows: aoa.length },
  };
}

// ---- HTML Table → XLSX ----
function extractTables(html: string): { html: string; index: number }[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(cleaned, 'text/html');
    return Array.from(doc.querySelectorAll('table')).map((t, index) => ({ html: t.outerHTML, index }));
  }
  const re = /<table[\s\S]*?<\/table>/gi;
  const matches: { html: string; index: number }[] = [];
  let m: RegExpExecArray | null, idx = 0;
  while ((m = re.exec(cleaned)) !== null) matches.push({ html: m[0], index: idx++ });
  return matches;
}

function tableHtmlToAoa(tableHtml: string): string[][] {
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(tableHtml, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return [];
    const rows: string[][] = [];
    table.querySelectorAll('tr').forEach((tr) => {
      const cells: string[] = [];
      tr.querySelectorAll('th,td').forEach((cell) => cells.push((cell.textContent ?? '').trim()));
      if (cells.length) rows.push(cells);
    });
    return rows;
  }
  const rows: string[][] = [];
  const trRe = /<tr[\s\S]*?<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tableHtml)) !== null) {
    const cells: string[] = [];
    const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(tr[0])) !== null) cells.push(c[2].replace(/<[^>]+>/g, '').trim());
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export async function convertHtmlTableToXlsx(file: File, opts: HtmlTableToXlsxOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const tables = extractTables(await file.text());
  if (!tables.length) throw new Error('Tidak ditemukan elemen <table> pada file HTML.');
  const index = opts.tableIndex ?? 0;
  if (index < 0 || index >= tables.length)
    throw new Error(`Indeks tabel tidak valid. Tersedia ${tables.length} tabel (0–${tables.length - 1}).`);
  const aoa = tableHtmlToAoa(tables[index].html);
  const sheetName = (opts.sheetName?.trim() || 'Sheet1').slice(0, 31);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return {
    blob: new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    fileName: `${base(file.name)}.xlsx`,
    losses: [
      `Menggunakan tabel ke-${index + 1} dari ${tables.length} tabel.`,
      'Script, event handler, dan resource eksternal diabaikan.',
      'Sel gabungan (colspan/rowspan) disederhanakan.',
    ],
    meta: { sheetName, tableIndex: index, tableCount: tables.length, rows: aoa.length },
  };
}

// ---- XLSX → PDF (pdf-lib table renderer) ----
export async function convertXlsxToPdf(file: File, opts: XlsxToPdfOptions = {}): Promise<ConversionResult> {
  const XLSX = await loadSheetJS();
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const wb = readWorkbook(XLSX, await ab(file));
  const { name, sheet } = resolveSheet(wb, opts);
  const aoa = sheetToAoA(XLSX, sheet);
  const maxRows = opts.maxRows ?? 500;
  const data = aoa.slice(0, maxRows + 1);
  const paper = opts.paperSize ?? 'A4';
  const orientation = opts.orientation ?? 'portrait';
  const marginMm = opts.marginMm ?? 12;
  const showGrid = opts.showGrid !== false;
  const showHeader = opts.showHeader !== false;
  const sizes: Record<string, [number, number]> = {
    A4: [595.28, 841.89], Letter: [612, 792], Legal: [612, 1008],
  };
  let [pageW, pageH] = sizes[paper] ?? sizes.A4;
  if (orientation === 'landscape') [pageW, pageH] = [pageH, pageW];
  const margin = (marginMm / 25.4) * 72;
  const usableW = pageW - margin * 2;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 8, rowH = fontSize + 6;
  const colCount = Math.max(1, ...data.map((r) => (Array.isArray(r) ? r.length : 0)));
  const colW = usableW / colCount;
  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - margin, pageNum = 1;
  const drawHdr = () => {
    if (!showHeader) return;
    page.drawText(`${name} — halaman ${pageNum}`, {
      x: margin, y: pageH - margin + 4, size: 7, font, color: rgb(0.4, 0.4, 0.4),
    });
  };
  drawHdr();
  y = pageH - margin - 14;
  const ensure = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([pageW, pageH]);
      pageNum++;
      drawHdr();
      y = pageH - margin - 14;
    }
  };
  for (let ri = 0; ri < data.length; ri++) {
    ensure(rowH);
    const row = (Array.isArray(data[ri]) ? data[ri] : []) as unknown[];
    const f = ri === 0 ? fontBold : font;
    for (let ci = 0; ci < colCount; ci++) {
      const x = margin + ci * colW;
      let text = cellToString(row[ci]);
      const maxChars = Math.max(4, Math.floor(colW / (fontSize * 0.5)));
      if (text.length > maxChars) text = text.slice(0, maxChars - 1) + '…';
      if (showGrid) {
        page.drawRectangle({
          x, y: y - rowH + 2, width: colW, height: rowH,
          borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 0.5,
        });
      }
      page.drawText(text, {
        x: x + 2, y: y - fontSize, size: fontSize, font: f,
        color: rgb(0.1, 0.1, 0.1), maxWidth: colW - 4,
      });
    }
    y -= rowH;
  }
  if (aoa.length > maxRows + 1) {
    ensure(rowH * 2);
    page.drawText(`… dipotong pada ${maxRows} baris data (total ${aoa.length - 1}).`, {
      x: margin, y: y - fontSize, size: 7, font, color: rgb(0.5, 0.2, 0.2),
    });
  }
  const pdfBytes = await pdf.save();
  return {
    blob: new Blob([pdfBytes], { type: 'application/pdf' }),
    fileName: `${base(file.name)}_${name}.pdf`,
    losses: [
      'Renderer tabel sederhana: tidak mereplikasi layout Excel, merge, grafik, conditional formatting.',
      `Maksimal ${maxRows} baris data; sisanya dipotong.`,
      'Teks panjang dipotong dengan elipsis.',
      'Font Helvetica (Latin); karakter non-Latin mungkin tidak sempurna.',
    ],
    meta: { sheetName: name, pages: pageNum, rowsRendered: Math.min(data.length, maxRows + 1) },
  };
}
