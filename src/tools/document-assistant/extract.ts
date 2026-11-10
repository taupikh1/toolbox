export interface Chunk {
  id: string;
  text: string;
  page?: number;
}

export function chunkText(text: string, maxLen = 800): Chunk[] {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buf = '';
  let id = 1;
  for (const p of paras) {
    if ((buf + '\n' + p).length > maxLen && buf) {
      chunks.push({ id: `c${id++}`, text: buf });
      buf = p;
    } else {
      buf = buf ? buf + '\n' + p : p;
    }
  }
  if (buf) chunks.push({ id: `c${id++}`, text: buf });
  return chunks;
}

export function searchChunks(chunks: Chunk[], query: string): Chunk[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (!terms.length) return [];
  return chunks
    .map((c) => ({ c, score: terms.filter((t) => c.text.toLowerCase().includes(t)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.c);
}

export function extractFacts(text: string): { dates: string[]; amounts: string[]; emails: string[] } {
  const dates = [...text.matchAll(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g)].map((m) => m[0]);
  const amounts = [...text.matchAll(/(?:Rp|\$|€|£)\s?[\d.,]+/gi)].map((m) => m[0]);
  const emails = [...text.matchAll(/\b[\w.+-]+@[\w.-]+\.\w+\b/g)].map((m) => m[0]);
  return { dates: [...new Set(dates)], amounts: [...new Set(amounts)], emails: [...new Set(emails)] };
}

export function summarize(text: string): string {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 30);
  return sentences.slice(0, 4).join('. ') + (sentences.length ? '.' : '(teks terlalu pendek)');
}
