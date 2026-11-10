// Model navigasi (data murni, bisa diuji).
// Sumber tool, id, kategori, deskripsi, dan status kartu tetap src/tools/registry.ts.
// File ini hanya mengelompokkan kategori yang sudah ada dan memberi label tampilan.

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  categories: string[];
}

/** Pemetaan kategori registry -> kelompok sidebar. Kategori baru yang belum terdaftar masuk "Lainnya". */
const GROUP_MAP: { id: string; label: string; icon: string; categories: string[] }[] = [
  { id: 'pdf', label: 'PDF', icon: '📄', categories: ['PDF Tools'] },
  { id: 'dokumen', label: 'Dokumen', icon: '📑', categories: ['Document Converter'] },
  { id: 'gambar', label: 'Gambar', icon: '🖼️', categories: ['Image Tools'] },
  { id: 'media', label: 'Audio & Video', icon: '🎵', categories: ['Media Tools'] },
  { id: 'ai', label: 'AI & Ringkasan', icon: '💡', categories: ['AI & Intelligence'] },
  { id: 'developer-teks', label: 'Teks & Developer', icon: '💻', categories: ['Text Tools', 'Developer Tools'] },
  { id: 'kalkulator', label: 'Kalkulator', icon: '🧮', categories: ['Calculators'] },
  { id: 'sistem', label: 'Sistem', icon: '⚙️', categories: ['System'] },
];

/** Label tampilan (Bahasa Indonesia) untuk kategori registry. Tidak ada label = pakai nama asli. */
export const CATEGORY_LABELS: Record<string, string> = {
  'PDF Tools': 'PDF',
  'Document Converter': 'Dokumen',
  'Image Tools': 'Gambar',
  'Media Tools': 'Audio & Video',
  'AI & Intelligence': 'AI & Ringkasan',
  'Developer Tools': 'Developer',
  'Text Tools': 'Teks',
  Calculators: 'Kalkulator',
  System: 'Sistem',
};

export const CATEGORY_ICONS: Record<string, string> = {
  'PDF Tools': '📄',
  'Document Converter': '📑',
  'Image Tools': '🖼️',
  'Media Tools': '🎵',
  'AI & Intelligence': '💡',
  'Developer Tools': '💻',
  'Text Tools': '🔤',
  Calculators: '🧮',
  System: '⚙️',
};

/** Satu kalimat jujur di halaman kategori. Bukan janji bahwa semua kartu sudah selesai. */
export const CATEGORY_INTRO: Record<string, string> = {
  'PDF Tools': 'Baca, susun, gabung, pisah, dan konversi PDF. Sebagian arah hanya teks atau gambar, bukan tata letak yang identik.',
  'Document Converter': 'Word, Excel, PowerPoint, OCR, dan praproses dokumen. Status tiap kartu mengikuti mesin yang benar-benar terpasang.',
  'Image Tools': 'Kompres, potong, ubah format, warna, watermark, dan hapus metadata. Diproses di perangkat.',
  'Media Tools': 'Audio, video, subtitle, dan metadata. Konversi FFmpeg butuh unduhan runtime sekali; tanpa itu konversi tidak berjalan.',
  'AI & Intelligence': 'Ringkasan rule-based dan halaman status model. Tidak ada inference model lokal.',
  'Text Tools': 'Hitung, ubah huruf, dan bandingkan teks. Lokal.',
  'Developer Tools': 'JSON, encoding, hash, sandi, UUID, QR, dan regex. Lokal.',
  Calculators: 'Cicilan, persentase, tanggal, zona waktu, satuan, dan timer fokus.',
  System: 'Penyimpanan, cache offline, serta cadangan pengaturan di perangkat ini.',
};

/** Kategori yang daftar tool-nya langsung terlihat di sidebar. */
export const EXPANDED_CATEGORIES = ['PDF Tools', 'Document Converter', 'AI & Intelligence'];

/** Jalan pintas footer. Tool yang sama tetap punya satu entri kategori (System). */
export const SETTINGS_SHORTCUT_ID = 'backup-restore';

/**
 * Bookmark kategori Batch 18 yang namanya digabung atau dipecah.
 * Slug lama tetap membuka kategori utama yang paling dekat.
 */
export const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'image-dan-pdf': 'Image Tools',
  'calculator-dan-converter': 'Calculators',
};

export const categoryLabel = (c: string) => CATEGORY_LABELS[c] ?? c;
export const categoryIcon = (c: string) => CATEGORY_ICONS[c] ?? '🧰';
export const categoryIntro = (c: string) => CATEGORY_INTRO[c] ?? '';

export function categorySlug(name: string): string {
  return name.toLowerCase().replace(/&/g, ' dan ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function categoryFromSlug(cats: string[], slug: string): string | undefined {
  const direct = cats.find((c) => categorySlug(c) === slug);
  if (direct) return direct;
  const alias = CATEGORY_SLUG_ALIASES[slug];
  if (alias && cats.includes(alias)) return alias;
  return undefined;
}

/** Kelompokkan kategori yang benar-benar ada. Urutan kelompok tetap; kategori tak dikenal ke "Lainnya". */
export function groupCategories(cats: string[]): NavGroup[] {
  const real = cats.filter((c) => c !== 'All Tools');
  const used = new Set<string>();
  const groups: NavGroup[] = [];
  for (const g of GROUP_MAP) {
    const list = g.categories.filter((c) => real.includes(c));
    list.forEach((c) => used.add(c));
    if (list.length) groups.push({ id: g.id, label: g.label, icon: g.icon, categories: list });
  }
  const rest = real.filter((c) => !used.has(c));
  if (rest.length) groups.push({ id: 'lainnya', label: 'Lainnya', icon: '🧰', categories: rest });
  return groups;
}

export type Route =
  | { kind: 'home' }
  | { kind: 'search' }
  | { kind: 'favorites' }
  | { kind: 'recent' }
  | { kind: 'category'; slug: string }
  | { kind: 'tool'; id: string }
  | { kind: 'notfound' };

/** Parse hash route (tanpa '#'). Alamat lama (#/ dan #/tools/<id>) tetap bekerja. */
export function parseRoute(route: string): Route {
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';
  if (path === '/') return { kind: 'home' };
  if (path === '/search') return { kind: 'search' };
  if (path === '/favorites') return { kind: 'favorites' };
  if (path === '/recent') return { kind: 'recent' };
  let m = path.match(/^\/tools\/([\w-]+)$/);
  if (m) return { kind: 'tool', id: m[1] };
  m = path.match(/^\/category\/([\w-]+)$/);
  if (m) return { kind: 'category', slug: m[1] };
  return { kind: 'notfound' };
}

/** Contoh pencarian yang ditampilkan pada keadaan kosong. */
export const SEARCH_SUGGESTIONS = ['word ke pdf', 'pdf ke excel', 'gabung pdf', 'kompres gambar', 'resize foto', 'ocr indonesia', 'csv ke excel', 'qr code'];
