// Pencarian tool: pencocokan per kata + sinonim + ranking. Fungsi murni agar bisa diuji.
// Kompatibel mundur: query yang dulu cocok (substring utuh) tetap cocok.

export interface Searchable {
  name: string;
  description: string;
  keywords: string[];
  category?: string;
}

/** Kata penghubung yang diabaikan saat mencocokkan per kata ("pdf ke word" -> pdf, word). */
const CONNECTORS = new Set(['ke', 'to', 'into', 'jadi', 'menjadi', 'dari', 'from', 'dan', 'and']);

/** Kelompok sinonim. Istilah dalam satu kelompok dianggap sama. */
const SYNONYM_GROUPS: string[][] = [
  ['word', 'docx', 'msword'],
  ['excel', 'xlsx', 'spreadsheet', 'lembar kerja'],
  ['powerpoint', 'pptx', 'ppt', 'slide', 'presentasi'],
  ['gambar', 'image', 'foto', 'photo', 'picture'],
  ['teks', 'text', 'txt'],
  ['indonesia', 'indonesian', 'bahasa indonesia'],
  ['scan', 'pindai', 'pemindai', 'scanner'],
  ['dokumen', 'document'],
  ['kompres', 'compress', 'kompresi', 'compressor', 'perkecil'],
  ['gabung', 'gabungkan', 'penggabungan', 'merge', 'combine'],
  ['pisah', 'pisahkan', 'pemisahan', 'split'],
  ['jpg', 'jpeg'],
];

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function expand(term: string): string[] {
  const g = SYNONYM_GROUPS.find((grp) => grp.includes(term));
  return g ?? [term];
}

/** Cocok jika `term` diawali pada batas kata di haystack (haystack sudah dipad spasi). */
const hasTerm = (padded: string, term: string) => padded.includes(' ' + term);

export function tokenizeQuery(q: string): string[] {
  const all = normalize(q).split(' ').filter(Boolean);
  const kept = all.filter((t) => !CONNECTORS.has(t));
  return kept.length ? kept : all;
}

/** Skor 0 = tidak cocok. Makin besar makin relevan. */
export function scoreTool(tool: Searchable, query: string): number {
  const rawQ = query.trim().toLowerCase();
  if (!rawQ) return 1;

  const legacy = [tool.name, tool.description, ...tool.keywords].join(' ').toLowerCase();
  let score = 0;
  if (legacy.includes(rawQ)) score += 5; // perilaku lama dipertahankan

  const nq = normalize(query);
  const fields = [tool.name, ...tool.keywords].map(normalize);
  if (nq && fields.some((f) => f === nq)) score += 20;
  else if (nq && fields.some((f) => f.includes(nq))) score += 10;

  const tokens = tokenizeQuery(query);
  if (tokens.length) {
    const hay = ' ' + normalize([tool.name, tool.description, tool.category ?? '', ...tool.keywords].join(' ')) + ' ';
    const matched = tokens.filter((t) => expand(t).some((s) => hasTerm(hay, s)));
    if (matched.length === tokens.length) score += matched.length;
  }
  return score;
}

/** Saring dan urutkan. Query kosong mengembalikan urutan asli. */
export function searchTools<T extends Searchable>(tools: T[], query: string): T[] {
  if (!query.trim()) return tools;
  return tools
    .map((t, i) => ({ t, i, s: scoreTool(t, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.t);
}
