import { describe, expect, it } from 'vitest';

function extractInsights(text: string) {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const terms = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);
  return { summary: sentences.slice(0, 2).join('. '), terms, count: sentences.length };
}

describe('Multimedia insights (Batch 13)', () => {
  it('rule-based mengekstrak kalimat dan istilah', () => {
    const t = 'Toolbox offline adalah aplikasi yang berjalan di browser. Pengguna dapat mengonversi dokumen secara lokal. Tidak ada upload ke server.';
    const r = extractInsights(t);
    expect(r.count).toBeGreaterThan(0);
    expect(r.terms.length).toBeGreaterThan(0);
    expect(r.summary.length).toBeGreaterThan(0);
  });
  it('teks kosong menghasilkan ringkasan kosong', () => {
    const r = extractInsights('');
    expect(r.count).toBe(0);
  });
});
