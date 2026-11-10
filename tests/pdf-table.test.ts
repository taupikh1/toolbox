import { describe, expect, it } from 'vitest';
import { itemsToTables } from '../src/tools/document-converter/engine/pdf-table/extract';
import { tableToCsv, tableToJson } from '../src/tools/document-converter/engine/pdf-table/export';
import type { TextItem } from '../src/tools/document-converter/engine/pdf-table/types';

function item(str: string, x: number, y: number, page = 1): TextItem {
  return { str, x, y, width: 20, height: 10, page };
}

describe('PDF table extraction (Batch 8)', () => {
  it('mengelompokkan teks menjadi baris dan kolom', () => {
    const items = [
      item('Nama', 10, 100), item('Usia', 80, 100),
      item('Budi', 10, 80), item('25', 80, 80),
      item('Ani', 10, 60), item('30', 80, 60),
    ];
    const tables = itemsToTables(items, 1);
    expect(tables.length).toBe(1);
    expect(tables[0].rows.length).toBe(3);
    expect(tables[0].rows[0]).toEqual(['Nama', 'Usia']);
    expect(tables[0].rows[1]).toEqual(['Budi', '25']);
    expect(tables[0].confidence).toBe('medium');
  });

  it('CSV escape benar', async () => {
    const t = { id: 't', pageStart: 1, pageEnd: 1, rows: [['a,b', 'c"d'], ['e', 'f']], confidence: 'low' as const, warnings: [], method: 'test' };
    const csv = await tableToCsv(t).text();
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"c""d"');
  });

  it('JSON memakai header sebagai key', async () => {
    const t = { id: 't', pageStart: 1, pageEnd: 1, rows: [['Nama', 'Usia'], ['Budi', '25']], confidence: 'low' as const, warnings: [], method: 'test' };
    const j = JSON.parse(await tableToJson(t).text());
    expect(j[0].Nama).toBe('Budi');
    expect(j[0].Usia).toBe('25');
  });
});
