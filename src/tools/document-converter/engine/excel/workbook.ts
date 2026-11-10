/** Workbook helpers on top of SheetJS. */
import type { SheetJSModule } from './sheetjs-loader';
import type { SheetInfo, WorkbookMeta, PreviewTable } from './types';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

export function readWorkbook(XLSX: SheetJSModule, data: ArrayBuffer | Uint8Array) {
  return XLSX.read(data, { type: 'array', cellDates: true, cellNF: false, cellText: false });
}

export function getWorkbookMeta(XLSX: SheetJSModule, wb: ReturnType<SheetJSModule['read']>): WorkbookMeta {
  const sheets: SheetInfo[] = wb.SheetNames.map((name, index) => {
    const ws = wb.Sheets[name];
    const ref = ws?.['!ref'];
    let rowCount = 0, colCount = 0;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      rowCount = Math.max(0, range.e.r - range.s.r + 1);
      colCount = Math.max(0, range.e.c - range.s.c + 1);
    }
    return { name, index, rowCount, colCount };
  });
  return { sheetNames: wb.SheetNames.slice(), sheets };
}

export function resolveSheet(
  wb: ReturnType<SheetJSModule['read']>,
  opts: { sheetName?: string; sheetIndex?: number },
) {
  let name = opts.sheetName;
  if (name == null && typeof opts.sheetIndex === 'number') name = wb.SheetNames[opts.sheetIndex];
  if (name == null) name = wb.SheetNames[0];
  if (!name || !wb.Sheets[name]) throw new Error(`Worksheet tidak ditemukan: ${opts.sheetName ?? opts.sheetIndex ?? 0}`);
  return { name, sheet: wb.Sheets[name] };
}

export function sheetToAoA(XLSX: SheetJSModule, sheet: import('xlsx').WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: true }) as unknown[][];
}

export function cellToString(v: unknown): string {
  if (v == null || v === '') return '';
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    const hh = v.getHours(), mm = v.getMinutes(), ss = v.getSeconds();
    if (hh === 0 && mm === 0 && ss === 0) return `${y}-${m}-${d}`;
    return `${y}-${m}-${d} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
    return String(v);
  }
  return String(v);
}

export function protectCsvCell(value: string, enabled: boolean): string {
  if (!enabled || value === '') return value;
  if (FORMULA_PREFIXES.includes(value.charAt(0))) return "'" + value;
  return value;
}

export function escapeCsvField(value: string, delimiter: string, quote: string): string {
  const needs =
    value.includes(delimiter) || value.includes('"') || value.includes("'") ||
    value.includes('\n') || value.includes('\r') || value.startsWith(' ') || value.endsWith(' ');
  if (!quote) return value.replace(/[\r\n]+/g, ' ');
  if (!needs && !value.includes(quote)) return value;
  return quote + value.replace(new RegExp(quote, 'g'), quote + quote) + quote;
}

export function aoaToCsv(
  aoa: unknown[][],
  opts: { delimiter?: string; quote?: string; protectFormulas?: boolean; includeBom?: boolean } = {},
): string {
  const delimiter = opts.delimiter ?? ',';
  const quote = opts.quote ?? '"';
  const protect = opts.protectFormulas !== false;
  const lines = aoa.map((row) =>
    (Array.isArray(row) ? row : []).map((c) => {
      let s = cellToString(c);
      s = protectCsvCell(s, protect);
      return escapeCsvField(s, delimiter, quote);
    }).join(delimiter),
  );
  let out = lines.join('\r\n');
  if (opts.includeBom) out = '\uFEFF' + out;
  return out;
}

export function aoaToPreview(aoa: unknown[][], maxRows = 20): PreviewTable {
  if (!aoa.length) return { headers: [], rows: [], totalRows: 0, truncated: false };
  const headers = (aoa[0] ?? []).map((c, i) => {
    const s = cellToString(c);
    return s === '' ? `Kolom ${i + 1}` : s;
  });
  const dataRows = aoa.slice(1);
  const totalRows = dataRows.length;
  const truncated = totalRows > maxRows;
  const rows = dataRows.slice(0, maxRows).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    return headers.map((_, i) => cellToString(arr[i]));
  });
  return { headers, rows, totalRows, truncated };
}

export function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = h.trim() === '' ? `Kolom_${i + 1}` : h.trim();
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count + 1}`;
  });
}
