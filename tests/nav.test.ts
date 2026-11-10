import { describe, expect, it } from 'vitest';
import { categories, tools } from '../src/tools/registry';
import { EXPANDED_CATEGORIES, SEARCH_SUGGESTIONS, SETTINGS_SHORTCUT_ID, categoryFromSlug, categorySlug, groupCategories, parseRoute } from '../src/nav';
import { searchTools } from '../src/lib/search';

describe('parseRoute', () => {
  it('alamat lama tetap bekerja', () => {
    expect(parseRoute('/')).toEqual({ kind: 'home' });
    expect(parseRoute('/tools/pdf-merge')).toEqual({ kind: 'tool', id: 'pdf-merge' });
  });
  it('rute baru', () => {
    expect(parseRoute('/search')).toEqual({ kind: 'search' });
    expect(parseRoute('/favorites')).toEqual({ kind: 'favorites' });
    expect(parseRoute('/recent')).toEqual({ kind: 'recent' });
    expect(parseRoute('/category/document-converter')).toEqual({ kind: 'category', slug: 'document-converter' });
  });
  it('slash akhir dan alamat tak dikenal', () => {
    expect(parseRoute('/favorites/')).toEqual({ kind: 'favorites' });
    expect(parseRoute('/tools/')).toEqual({ kind: 'notfound' });
    expect(parseRoute('/apa-saja')).toEqual({ kind: 'notfound' });
  });
});

describe('kelompok navigasi', () => {
  const real = categories.filter((c) => c !== 'All Tools');
  it('setiap kategori registry muncul tepat sekali', () => {
    const flat = groupCategories(categories).flatMap((g) => g.categories);
    expect([...flat].sort()).toEqual([...real].sort());
    expect(new Set(flat).size).toBe(flat.length);
  });
  it('kategori tak dikenal masuk Lainnya, bukan hilang', () => {
    const g = groupCategories([...categories, 'Kategori Baru']);
    expect(g[g.length - 1].label).toBe('Lainnya');
    expect(g[g.length - 1].categories).toContain('Kategori Baru');
  });
  it('PDF, Dokumen, dan AI punya submenu; kategori kosong tidak muncul', () => {
    const g = groupCategories(categories);
    expect(g[0].id).toBe('pdf');
    expect(g[0].categories).toEqual(['PDF Tools']);
    expect(g.map((x) => x.id)).toContain('dokumen');
    expect(EXPANDED_CATEGORIES).toEqual(['PDF Tools', 'Document Converter', 'AI & Intelligence']);
    for (const id of ['pdf-reader', 'pdf-editor', 'pdf-merge', 'pdf-split', 'image-to-pdf', 'doc-pdf-converter']) {
      expect(tools.find((t) => t.id === id)?.category).toBe('PDF Tools');
    }
    const doc = tools.filter((t) => t.category === 'Document Converter').map((t) => t.id);
    expect(doc).toEqual(['doc-word-converter', 'doc-excel-converter', 'doc-powerpoint-converter', 'doc-ocr-scanner', 'document-intelligence']);
    expect(tools.some((t) => t.category === 'Image & PDF' || t.category === 'Calculator & Converter')).toBe(false);
    for (const group of g) for (const c of group.categories) {
      expect(tools.some((t) => t.category === c)).toBe(true);
    }
  });
  it('slug lama Image & PDF dan Calculator & Converter tetap membuka kategori baru', () => {
    const real = categories.filter((c) => c !== 'All Tools');
    expect(categoryFromSlug(real, 'image-dan-pdf')).toBe('Image Tools');
    expect(categoryFromSlug(real, 'calculator-dan-converter')).toBe('Calculators');
    expect(categoryFromSlug(real, categorySlug('PDF Tools'))).toBe('PDF Tools');
  });
  it('shortcut pengaturan menunjuk tool yang ada', () => {
    expect(tools.some((t) => t.id === SETTINGS_SHORTCUT_ID)).toBe(true);
  });
  it('slug unik, valid untuk rute, dan bisa dibalik', () => {
    const slugs = real.map(categorySlug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const c of real) {
      expect(/^[\w-]+$/.test(categorySlug(c))).toBe(true);
      expect(categoryFromSlug(real, categorySlug(c))).toBe(c);
    }
  });
});

describe('pencarian Phase 7.1', () => {
  const top = (q: string) => searchTools(tools, q).map((t) => t.id);
  it('contoh pencarian dari spesifikasi menghasilkan sesuatu', () => {
    for (const q of ['word ke pdf', 'pdf ke excel', 'jpg ke pdf', 'gabung pdf', 'kompres gambar', 'resize foto', 'ocr indonesia', 'csv ke excel', 'image to pdf', 'pdf to powerpoint']) {
      expect(top(q).length).toBeGreaterThan(0);
    }
  });
  it('kompres gambar menemukan Image Compressor; resize foto juga', () => {
    expect(top('kompres gambar')).toContain('image-compressor');
    expect(top('compress image')).toContain('image-compressor');
    expect(top('resize foto')).toContain('image-compressor');
  });
  it('gabung pdf menemukan Gabung PDF dan PDF Merge', () => {
    expect(top('gabung pdf')).toContain('pdf-merge');
    expect(top('merge pdf')).toContain('pdf-merge');
  });
  it('jpg ke pdf dan csv ke excel menemukan halaman yang tepat', () => {
    expect(top('jpg ke pdf')).toContain('image-to-pdf');
    expect(top('csv ke excel')[0]).toBe('doc-excel-converter');
  });
  it('ocr indonesia menempatkan OCR di urutan pertama', () => {
    expect(top('ocr indonesia')[0]).toBe('doc-ocr-scanner');
  });
  it('kueri tak bermakna menghasilkan kosong (keadaan kosong informatif di UI)', () => {
    expect(top('zzzxqv')).toEqual([]);
  });
  it('semua contoh saran pencarian menghasilkan hasil', () => {
    for (const s of SEARCH_SUGGESTIONS) expect(top(s).length).toBeGreaterThan(0);
  });
});
