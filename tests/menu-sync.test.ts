import { describe, expect, it } from 'vitest';
import { categories, tools } from '../src/tools/registry';
import { EXPANDED_CATEGORIES, SETTINGS_SHORTCUT_ID, categoryFromSlug, categorySlug, groupCategories, parseRoute } from '../src/nav';
import { searchTools } from '../src/lib/search';
import { conversionRegistry } from '../src/tools/document-converter/registry/conversion-registry';

describe('sinkronisasi menu Batch 19', () => {
  const real = categories.filter((c) => c !== 'All Tools');
  const groups = groupCategories(categories);
  const grouped = groups.flatMap((g) => g.categories);

  it('setiap tool punya id, nama, kategori, dan komponen', () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of tools) {
      expect(t.id).toMatch(/^[\w-]+$/);
      expect(t.name.trim().length).toBeGreaterThan(0);
      expect(t.category.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(real).toContain(t.category);
      expect(typeof t.component).toBe('object');
    }
  });

  it('setiap kategori registry muncul tepat sekali di navigasi dan tidak kosong', () => {
    expect([...grouped].sort()).toEqual([...real].sort());
    expect(new Set(grouped).size).toBe(grouped.length);
    for (const c of grouped) expect(tools.some((t) => t.category === c)).toBe(true);
  });

  it('setiap tautan menu tool mengarah ke route yang valid', () => {
    for (const t of tools) {
      const route = parseRoute('/tools/' + t.id);
      expect(route).toEqual({ kind: 'tool', id: t.id });
      expect(categoryFromSlug(real, categorySlug(t.category))).toBe(t.category);
    }
    for (const c of EXPANDED_CATEGORIES) expect(real).toContain(c);
    const shortcut = tools.find((t) => t.id === SETTINGS_SHORTCUT_ID);
    expect(shortcut?.category).toBe('System');
  });

  it('shortcut konversi menunjuk tool yang ada, dan kartu tidak didukung tidak di menu utama', () => {
    for (const d of conversionRegistry.all()) {
      if (d.existingToolId) expect(tools.some((t) => t.id === d.existingToolId)).toBe(true);
    }
    expect(conversionRegistry.get('image-to-pdf')?.existingToolId).toBe('image-to-pdf');
    expect(conversionRegistry.get('txt-to-pdf')?.existingToolId).toBe('pdf-writer');
    expect(conversionRegistry.get('pdf-merge')?.existingToolId).toBe('pdf-merge');
    expect(conversionRegistry.get('searchable-pdf')?.availability).toBe('unsupported');
  });

  it('nama tool ditemukan oleh pencarian', () => {
    for (const t of tools) {
      const hit = searchTools(tools, t.name).map((x) => x.id);
      expect(hit).toContain(t.id);
    }
  });

  it('xlsx ke csv dan image to pdf tidak hanya tersembunyi di dalam satu halaman', () => {
    expect(searchTools(tools, 'xlsx ke csv')[0]?.id).toBe('doc-excel-converter');
    expect(searchTools(tools, 'image to pdf').some((t) => t.id === 'image-to-pdf')).toBe(true);
    expect(tools.find((t) => t.id === 'image-to-pdf')?.category).toBe('PDF Tools');
    expect(tools.find((t) => t.id === 'doc-excel-converter')?.category).toBe('Document Converter');
  });
});
