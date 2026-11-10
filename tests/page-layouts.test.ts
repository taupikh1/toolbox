import { describe, expect, it } from 'vitest';
import { conversionRegistry } from '../src/tools/document-converter/registry/conversion-registry';
import { PAGE_LAYOUTS } from '../src/tools/document-converter/registry/page-layouts';
import type { ConverterPageId } from '../src/tools/document-converter/types/conversion';
import { BATCH2_AVAILABLE_IDS } from '../src/tools/document-converter/engine/excel/bind-handlers';
import { BATCH5_AVAILABLE_IDS } from '../src/tools/document-converter/engine/word/bind-handlers';
import { BATCH6A_AVAILABLE_IDS } from '../src/tools/document-converter/engine/powerpoint/bind-handlers';
import { BATCH18_PARTIAL_IDS } from '../src/tools/document-converter/engine/advanced/bind-handlers';

const PAGES: ConverterPageId[] = ['pdf', 'word', 'excel', 'powerpoint', 'ocr'];

describe('page-layouts', () => {
  it('lima halaman punya layout dan semua id grup ada di registry', () => {
    for (const p of PAGES) {
      expect(PAGE_LAYOUTS[p].groups.length).toBeGreaterThan(0);
      for (const g of PAGE_LAYOUTS[p].groups) for (const id of g.ids) expect(conversionRegistry.get(id)).toBeTruthy();
    }
  });
  it('grup memuat setiap fitur halaman tepat sekali (kecuali yang tidak didukung)', () => {
    for (const p of PAGES) {
      const shown = PAGE_LAYOUTS[p].groups.flatMap((g) => g.ids);
      const expected = conversionRegistry.forPage(p).filter((d) => d.availability !== 'unsupported').map((d) => d.id);
      expect([...shown].sort()).toEqual([...expected].sort());
    }
  });
  it('fitur tidak didukung tidak pernah tampil sebagai kartu aktif', () => {
    for (const p of PAGES) for (const g of PAGE_LAYOUTS[p].groups) for (const id of g.ids) expect(conversionRegistry.get(id)?.availability).not.toBe('unsupported');
  });
  it('setiap fitur yang tampil dengan grup yang ditentukan spesifikasi', () => {
    const titles = (p: ConverterPageId) => PAGE_LAYOUTS[p].groups.map((g) => g.title);
    expect(titles('pdf')).toEqual(['PDF ke format lain', 'Format lain ke PDF', 'Pengolahan PDF']);
    expect(titles('word')).toEqual(['Word ke format lain', 'Format lain ke Word']);
    expect(titles('excel')).toEqual(['Excel ke format lain', 'Format lain ke Excel']);
    expect(titles('powerpoint')).toEqual(['PowerPoint ke format lain', 'Format lain ke PowerPoint']);
  });
  it('halaman PowerPoint menjelaskan slide gambar vs dapat diedit; Excel mencatat Batch 2', () => {
    expect(PAGE_LAYOUTS.powerpoint.explainer?.items.length).toBe(2);
    expect(PAGE_LAYOUTS.excel.notes.join(' ')).toMatch(/Batch 2|XLSX/);
    expect(PAGE_LAYOUTS.word.notes.join(' ')).toMatch(/Batch 5/);
  });
  it('Batch 2 Excel dan Batch 5 Word dapat dijalankan; sisanya tidak (kecuali tool yang sudah ada)', () => {
    const live = new Set([...BATCH2_AVAILABLE_IDS, ...BATCH5_AVAILABLE_IDS, ...BATCH6A_AVAILABLE_IDS, ...BATCH18_PARTIAL_IDS]);
    for (const d of conversionRegistry.all()) {
      if (live.has(d.id)) {
        expect(conversionRegistry.isRunnable(d)).toBe(true);
      } else if (!d.existingToolId) {
        expect(conversionRegistry.isRunnable(d)).toBe(false);
      }
    }
  });
});
