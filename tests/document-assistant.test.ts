import { describe, expect, it } from 'vitest';
import { chunkText, searchChunks, extractFacts, summarize } from '../src/tools/document-assistant/extract';

describe('Document Assistant (Batch 16)', () => {
  it('chunk mempertahankan urutan', () => {
    const t = 'Paragraf pertama yang cukup panjang untuk diuji.\n\nParagraf kedua juga panjang.';
    const c = chunkText(t, 40);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].text).toContain('pertama');
  });

  it('search mengembalikan chunk yang cocok', () => {
    const c = chunkText('Total pembayaran adalah Rp5.000.000 pada tanggal 15/01/2025.');
    const hits = searchChunks(c, 'pembayaran');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('search kosong jika tidak ditemukan', () => {
    const c = chunkText('Halo dunia.');
    expect(searchChunks(c, 'xyzabc')).toHaveLength(0);
  });

  it('ekstraksi tanggal dan nominal', () => {
    const f = extractFacts('Bayar Rp1.500.000 pada 15/01/2025. Kontak a@b.co');
    expect(f.dates).toContain('15/01/2025');
    expect(f.amounts.some((a) => /Rp/.test(a))).toBe(true);
    expect(f.emails).toContain('a@b.co');
  });

  it('ringkasan dari kalimat', () => {
    const s = summarize('Ini adalah kalimat pertama yang cukup panjang. Ini adalah kalimat kedua yang juga panjang.');
    expect(s.length).toBeGreaterThan(20);
  });
});
