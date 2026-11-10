import * as XLSX from 'xlsx';
import type { ExtractedTable } from './types';

export function tablesToXlsx(tables: ExtractedTable[]): Blob {
  const wb = XLSX.utils.book_new();
  tables.forEach((t, i) => {
    const ws = XLSX.utils.aoa_to_sheet(t.rows);
    XLSX.utils.book_append_sheet(wb, ws, `Tabel_${i + 1}`);
  });
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function tableToCsv(table: ExtractedTable): Blob {
  const lines = table.rows.map((r) =>
    r.map((c) => {
      const s = String(c ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','),
  );
  return new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
}

export function tableToJson(table: ExtractedTable): Blob {
  const [header, ...body] = table.rows;
  const keys = header?.length ? header : table.rows[0]?.map((_, i) => `col${i + 1}`) ?? [];
  const data = (header ? body : table.rows).map((r) => {
    const o: Record<string, string> = {};
    keys.forEach((k, i) => { o[k || `col${i + 1}`] = r[i] ?? ''; });
    return o;
  });
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

export function tableToHtml(table: ExtractedTable): string {
  const esc = (s: string) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const rows = table.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<table>${rows}</table>`;
}
