import { describe, expect, it } from 'vitest';
import { categories, tools } from '../src/tools/registry';
import { normalize, scoreTool, searchTools, tokenizeQuery } from '../src/lib/search';

const ids = (q: string) => searchTools(tools, q).map((t) => t.id);
const DOC_IDS = ['doc-word-converter', 'doc-excel-converter', 'doc-powerpoint-converter', 'doc-ocr-scanner', 'document-intelligence'];

describe('registry Phase 7', () => {
  it('lima tool Dokumen terdaftar dengan id yang valid untuk route', () => {
    const docs = tools.filter((t) => t.category === 'Document Converter');
    expect(docs.map((t) => t.id)).toEqual(DOC_IDS);
    for (const t of docs) expect(/^[\w-]+$/.test(t.id)).toBe(true);
  });
  it('kategori Document Converter muncul tepat sekali dan PDF Converter tidak lagi di dalamnya', () => {
    expect(categories.filter((c) => c === 'Document Converter').length).toBe(1);
    expect(categories.filter((c) => /document|dokumen/i.test(c)).length).toBe(1);
    expect(tools.find((t) => t.id === 'doc-pdf-converter')?.category).toBe('PDF Tools');
  });
  it('id unik dan tool lama tetap terdaftar', () => {
    const all = tools.map((t) => t.id);
    expect(new Set(all).size).toBe(all.length);
    for (const id of ['qr-generator', 'image-compressor', 'pdf-merge', 'pdf-split', 'pdf-editor', 'image-to-pdf', 'media-module', 'audio-cutter', 'backup-restore', 'pomodoro']) {
      expect(all.includes(id)).toBe(true);
    }
    expect(tools.filter((t) => t.category !== 'Document Converter').length).toBe(tools.length - DOC_IDS.length);
  });
  it('kategori aktif sesuai pengelompokan Batch 19', () => {
    for (const c of ['Developer Tools', 'Calculators', 'Media Tools', 'Text Tools', 'Image Tools', 'PDF Tools', 'Document Converter', 'AI & Intelligence', 'System']) {
      expect(categories.includes(c)).toBe(true);
    }
    expect(categories.includes('Image & PDF')).toBe(false);
    expect(categories.includes('Calculator & Converter')).toBe(false);
  });
});

describe('pencarian', () => {
  it('tokenisasi membuang kata penghubung', () => {
    expect(tokenizeQuery('PDF ke Word')).toEqual(['pdf', 'word']);
    expect(tokenizeQuery('xlsx to csv')).toEqual(['xlsx', 'csv']);
    expect(tokenizeQuery('ke')).toEqual(['ke']);
    expect(normalize('PDF-ke_Word!')).toBe('pdf ke word');
  });
  it('query kosong mengembalikan urutan asli', () => {
    expect(searchTools(tools, '  ')).toBe(tools);
  });
  it('pdf ke word / pdf to word menemukan halaman PDF dan Word', () => {
    for (const q of ['pdf ke word', 'pdf to word']) {
      const r = ids(q);
      expect(r.includes('doc-pdf-converter')).toBe(true);
      expect(r.includes('doc-word-converter')).toBe(true);
    }
  });
  it('pdf ke excel / pdf to excel menemukan halaman PDF dan Excel', () => {
    for (const q of ['pdf ke excel', 'pdf to excel']) {
      const r = ids(q);
      expect(r.includes('doc-pdf-converter')).toBe(true);
      expect(r.includes('doc-excel-converter')).toBe(true);
    }
  });
  it('arah konversi memengaruhi urutan', () => {
    expect(ids('word ke pdf')[0]).toBe('doc-word-converter');
    expect(ids('docx to pdf')[0]).toBe('doc-word-converter');
    expect(ids('excel ke pdf')[0]).toBe('doc-excel-converter');
    expect(ids('xlsx to csv')[0]).toBe('doc-excel-converter');
    expect(ids('pptx ke pdf')[0]).toBe('doc-powerpoint-converter');
  });
  it('gambar/foto ke pdf menemukan PDF Converter dan Image to PDF', () => {
    for (const q of ['gambar ke pdf', 'foto ke pdf']) {
      const r = ids(q);
      expect(r.includes('doc-pdf-converter')).toBe(true);
      expect(r.includes('image-to-pdf')).toBe(true);
    }
  });
  it('scan dokumen dan OCR Indonesia menuju halaman OCR', () => {
    expect(ids('scan dokumen')[0]).toBe('doc-ocr-scanner');
    expect(ids('OCR Indonesia')[0]).toBe('doc-ocr-scanner');
    expect(ids('ocr')[0]).toBe('doc-ocr-scanner');
  });
  it('sinonim bekerja: spreadsheet, presentasi', () => {
    expect(ids('spreadsheet').includes('doc-excel-converter')).toBe(true);
    expect(ids('presentasi').includes('doc-powerpoint-converter')).toBe(true);
  });
  it('kata yang tidak terkait tidak menghasilkan apa pun', () => {
    expect(ids('zzzxyz').length).toBe(0);
  });
  it('REGRESI: semua yang cocok di pencarian lama tetap cocok (superset)', () => {
    const oldMatch = (t: (typeof tools)[number], q: string) => [t.name, t.description, ...t.keywords].join(' ').toLowerCase().includes(q.toLowerCase());
    const legacy = tools.filter((t) => t.category !== 'Document Converter');
    const queries = new Set<string>();
    for (const t of legacy) {
      queries.add(t.name);
      t.keywords.forEach((k) => queries.add(k));
      t.name.split(' ').forEach((w) => queries.add(w));
      queries.add(t.description.slice(0, 12));
    }
    let checked = 0;
    for (const q of queries) {
      const now = new Set(ids(q));
      for (const t of tools) {
        if (oldMatch(t, q)) {
          expect(now.has(t.id)).toBe(true);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
  it('REGRESI: query lama menemukan tool lama yang diharapkan', () => {
    expect(ids('compress').includes('image-compressor')).toBe(true);
    expect(ids('qr').includes('qr-generator')).toBe(true);
    expect(ids('cicilan').includes('loan-calculator')).toBe(true);
    expect(ids('uuid').includes('uuid-generator')).toBe(true);
    expect(ids('ffmpeg').includes('media-module')).toBe(true);
  });
  it('scoreTool: 0 berarti tidak cocok', () => {
    expect(scoreTool({ name: 'A', description: 'b', keywords: ['c'] }, 'zzz')).toBe(0);
    expect(scoreTool({ name: 'A', description: 'b', keywords: ['c'] }, 'c') > 0).toBe(true);
  });
});
