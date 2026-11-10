import { describe, expect, it } from 'vitest';
import { ConversionRegistry, conversionRegistry } from '../src/tools/document-converter/registry/conversion-registry';
import { CONVERSION_DEFINITIONS } from '../src/tools/document-converter/registry/conversion-definitions';
import { ENGINE_DEFINITIONS } from '../src/tools/document-converter/registry/engine-registry';
import { EngineManager, cacheStorage, type EngineStorage } from '../src/tools/document-converter/engine/engine-manager';
import { EngineError, type EngineDefinition } from '../src/tools/document-converter/types/engine';
import { DOCUMENT_LIMITS, getMaxBytes, getMaxMB } from '../src/tools/document-converter/validation/file-limits';
import { detectSignature } from '../src/tools/document-converter/validation/file-signature';
import { validateFile } from '../src/tools/document-converter/validation/file-validator';
import { checkZipEntries } from '../src/tools/document-converter/validation/ooxml-guard';
import { formatFileSize } from '../src/tools/document-converter/utils/format-file-size';

const bytes = (...n: number[]) => Uint8Array.from(n);
const ascii = (s: string) => new TextEncoder().encode(s);
const PDF = ascii('%PDF-1.7\n%....');
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const OLE = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);

describe('file-limits', () => {
  it('konfigurasi awal sesuai spesifikasi', () => {
    expect(DOCUMENT_LIMITS.maxPdfSizeMB).toBe(50);
    expect(DOCUMENT_LIMITS.maxOfficeFileSizeMB).toBe(30);
    expect(DOCUMENT_LIMITS.maxImageSizeMB).toBe(20);
    expect(DOCUMENT_LIMITS.maxConcurrentJobs).toBe(1);
  });
  it('batas per kategori dalam byte', () => {
    expect(getMaxBytes('pdf')).toBe(50 * 1048576);
    expect(getMaxBytes('office')).toBe(30 * 1048576);
    expect(getMaxMB('image')).toBe(20);
  });
  it('override hanya diterima jika angka positif terhingga', () => {
    expect(getMaxMB('pdf', { pdf: 10 })).toBe(10);
    expect(getMaxMB('pdf', { pdf: -1 })).toBe(50);
    expect(getMaxMB('pdf', { pdf: NaN })).toBe(50);
    expect(getMaxMB('pdf', { pdf: Infinity })).toBe(50);
  });
});

describe('file-signature', () => {
  it('mengenali magic bytes', () => {
    expect(detectSignature(new Uint8Array(0))).toBe('empty');
    expect(detectSignature(PDF)).toBe('pdf');
    expect(detectSignature(ZIP)).toBe('zip');
    expect(detectSignature(PNG)).toBe('png');
    expect(detectSignature(JPG)).toBe('jpeg');
    expect(detectSignature(OLE)).toBe('ole');
    expect(detectSignature(ascii('halo dunia'))).toBe('text');
    expect(detectSignature(bytes(1, 2, 0, 3))).toBe('binary');
    expect(detectSignature(ascii('RIFF\0\0\0\0WEBPVP8 '))).toBe('webp');
  });
});

describe('file-validator', () => {
  const ok = (name: string, head: Uint8Array, expected: Parameters<typeof validateFile>[2], size = 1000, type?: string) =>
    validateFile({ name, size, type }, head, expected);

  it('menerima PDF, DOCX (zip), PNG, TXT yang valid', () => {
    expect(ok('a.pdf', PDF, ['pdf']).ok).toBe(true);
    expect(ok('a.DOCX', ZIP, ['docx']).ok).toBe(true);
    expect(ok('a.png', PNG, ['png', 'jpg']).ok).toBe(true);
    expect(ok('a.txt', ascii('halo'), ['txt']).ok).toBe(true);
    expect(ok('a.jpeg', JPG, ['jpg']).ok).toBe(true);
  });
  it('menolak file kosong', () => {
    const r = ok('a.pdf', new Uint8Array(0), ['pdf'], 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('EMPTY_FILE');
  });
  it('menolak ekstensi yang tidak diharapkan', () => {
    const r = ok('a.exe', PDF, ['pdf']);
    if (r.ok) throw new Error('harus gagal');
    expect(r.code).toBe('UNSUPPORTED_EXTENSION');
    const r2 = ok('a.docx', ZIP, ['pdf']);
    if (r2.ok) throw new Error('harus gagal');
    expect(r2.code).toBe('UNSUPPORTED_EXTENSION');
  });
  it('menolak file palsu: ekstensi pdf tetapi isi PNG', () => {
    const r = ok('palsu.pdf', PNG, ['pdf']);
    if (r.ok) throw new Error('harus gagal');
    expect(r.code).toBe('SIGNATURE_MISMATCH');
  });
  it('menolak .docx yang bukan zip', () => {
    const r = ok('a.docx', ascii('bukan zip'), ['docx']);
    if (r.ok) throw new Error('harus gagal');
    expect(r.code).toBe('SIGNATURE_MISMATCH');
  });
  it('menolak Office lama (.doc dan OLE bertopeng .docx)', () => {
    const a = ok('a.doc', OLE, ['docx']);
    if (a.ok) throw new Error('harus gagal');
    expect(a.code).toBe('LEGACY_OFFICE');
    const b = ok('a.docx', OLE, ['docx']);
    if (b.ok) throw new Error('harus gagal');
    expect(b.code).toBe('LEGACY_OFFICE');
  });
  it('menolak biner bertopeng teks dan isi yang tidak cocok', () => {
    const a = ok('a.txt', bytes(1, 0, 2, 0), ['txt']);
    if (a.ok) throw new Error('harus gagal');
    expect(a.code).toBe('BINARY_AS_TEXT');
    const b = ok('a.json', ascii('halo bukan json'), ['json']);
    if (b.ok) throw new Error('harus gagal');
    expect(b.code).toBe('CONTENT_MISMATCH');
    expect(ok('a.json', ascii('{"a":1}'), ['json']).ok).toBe(true);
    const c = ok('a.svg', ascii('<html></html>'), ['svg']);
    if (c.ok) throw new Error('harus gagal');
    expect(c.code).toBe('CONTENT_MISMATCH');
    expect(ok('a.svg', ascii('<?xml version="1.0"?><svg xmlns="x"></svg>'), ['svg']).ok).toBe(true);
  });
  it('menegakkan batas ukuran per kategori', () => {
    const big = ok('a.pdf', PDF, ['pdf'], getMaxBytes('pdf') + 1);
    if (big.ok) throw new Error('harus gagal');
    expect(big.code).toBe('TOO_LARGE');
    expect(ok('a.pdf', PDF, ['pdf'], getMaxBytes('pdf')).ok).toBe(true);
    const img = ok('a.png', PNG, ['png'], getMaxBytes('image') + 1);
    if (img.ok) throw new Error('harus gagal');
    expect(img.code).toBe('TOO_LARGE');
  });
  it('MIME janggal hanya peringatan, bukan penolakan', () => {
    const r = ok('a.csv', ascii('a,b\n1,2'), ['csv'], 100, 'application/x-unknown');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings.length).toBe(1);
    const r2 = ok('a.csv', ascii('a,b'), ['csv'], 100, 'application/octet-stream');
    if (r2.ok) expect(r2.warnings.length).toBe(0);
  });
  it('formatFileSize', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1048576)).toBe('1.00 MB');
  });
});

describe('ooxml-guard', () => {
  it('entri normal lolos', () => {
    expect(checkZipEntries([{ name: 'word/document.xml', compressedSize: 1000, uncompressedSize: 5000 }]).length).toBe(0);
  });
  it('mendeteksi path berbahaya, rasio mencurigakan, dan entri terlalu banyak', () => {
    const codes = (e: Parameters<typeof checkZipEntries>[0]) => checkZipEntries(e).map((i) => i.code);
    expect(codes([{ name: '../evil', compressedSize: 1, uncompressedSize: 1 }])).toContain('UNSAFE_PATH');
    expect(codes([{ name: 'a.xml', compressedSize: 100, uncompressedSize: 50 * 1048576 }])).toContain('SUSPICIOUS_RATIO');
    expect(codes([{ name: 'a.bin', compressedSize: 90 * 1048576, uncompressedSize: 150 * 1048576 }])).toContain('ENTRY_TOO_LARGE');
    const many = Array.from({ length: 5001 }, (_, i) => ({ name: `f${i}`, compressedSize: 1, uncompressedSize: 1 }));
    expect(codes(many)).toContain('TOO_MANY_ENTRIES');
  });
});

describe('conversion-registry', () => {
  it('jumlah konversi per halaman', () => {
    expect(conversionRegistry.forPage('pdf').length).toBe(12);
    expect(conversionRegistry.forPage('word').length).toBe(6);
    expect(conversionRegistry.forPage('excel').length).toBe(8);
    expect(conversionRegistry.forPage('powerpoint').length).toBe(5);
    expect(conversionRegistry.forPage('ocr').length).toBe(5);
  });
  it('id unik; Batch 2 Excel dan Batch 5 Word punya handler, lainnya tidak (kecuali existingTool)', () => {
    const ids = CONVERSION_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    const runnableIds = new Set([
      'xlsx-to-csv', 'xlsx-to-json', 'xlsx-to-html', 'csv-to-xlsx', 'json-to-xlsx', 'html-table-to-xlsx', 'xlsx-to-pdf',
      'docx-to-txt', 'docx-to-html', 'docx-to-pdf', 'txt-to-docx', 'html-to-docx',
      'pptx-to-txt', 'pptx-media', 'image-to-pptx', 'pptx-to-pdf',
      'pdf-to-txt', 'pdf-to-docx', 'pdf-to-pptx', 'pdf-to-xlsx',
    ]);
    for (const d of CONVERSION_DEFINITIONS) {
      if (runnableIds.has(d.id)) {
        expect(typeof d.execute).toBe('function');
        expect(d.status).toBe('READY');
        expect(d.availability).toBe('available');
        expect(conversionRegistry.isRunnable(d)).toBe(true);
      } else if (!d.existingToolId && d.id !== 'ocr-image') {
        expect(d.execute).toBe(undefined);
        expect(d.validate).toBe(undefined);
        expect(conversionRegistry.isRunnable(d)).toBe(false);
      }
    }
  });
  it('tier C tidak pernah tampil aktif', () => {
    for (const d of CONVERSION_DEFINITIONS.filter((x) => x.tier === 'C')) expect(d.availability).toBe('unsupported');
    expect(() => new ConversionRegistry([{ ...CONVERSION_DEFINITIONS[0], id: 'x', tier: 'C', availability: 'available' }])).toThrow();
  });
  it('menolak id ganda', () => {
    expect(() => new ConversionRegistry([CONVERSION_DEFINITIONS[0], CONVERSION_DEFINITIONS[0]])).toThrow();
  });
  it('yang berstatus Tersedia: tool PDF yang sudah ada + Batch 2 Excel + Batch 5 Word + Batch 6A PPTX', () => {
    const avail = CONVERSION_DEFINITIONS.filter((d) => d.availability === 'available').map((d) => d.id).sort();
    expect(avail).toEqual([
      'csv-to-xlsx',
      'docx-to-html',
      'docx-to-pdf',
      'docx-to-txt',
      'html-table-to-xlsx',
      'html-to-docx',
      'html-to-pdf',
      'image-to-pdf',
      'image-to-pptx',
      'json-to-xlsx',
      'pdf-merge',
      'pdf-split',
      'pdf-to-docx',
      'pdf-to-pptx',
      'pdf-to-txt',
      'pdf-to-xlsx',
      'pptx-media',
      'pptx-to-pdf',
      'pptx-to-txt',
      'txt-to-docx',
      'txt-to-pdf',
      'xlsx-to-csv',
      'xlsx-to-html',
      'xlsx-to-json',
      'xlsx-to-pdf',
    ]);
  });
  it('PDF ke Excel ditandai berketerbatasan (tier B + catatan tabel)', () => {
    const d = conversionRegistry.get('pdf-to-xlsx')!;
    expect(d.tier).toBe('B');
    expect(d.limitations.join(' ').includes('sempurna')).toBe(true);
  });
  it('semua engine yang dirujuk terdaftar', () => {
    const known = new Set(ENGINE_DEFINITIONS.map((e) => e.id));
    for (const d of CONVERSION_DEFINITIONS) for (const e of d.engines) expect(known.has(e)).toBe(true);
  });
});

function fakeStorage(ready: boolean): EngineStorage & { removed: string[]; ready: boolean } {
  const s = {
    ready,
    removed: [] as string[],
    async hasAll() { return s.ready; },
    async remove(def: EngineDefinition) { s.removed.push(def.id); s.ready = false; },
  };
  return s;
}
async function rejects(p: Promise<unknown>): Promise<unknown> {
  try { await p; } catch (e) { return e; }
  throw new Error('seharusnya ditolak');
}

describe('engine-manager', () => {
  it('semua engine awalnya NOT_DOWNLOADED dan tidak ada aset terdaftar', () => {
    const m = new EngineManager(fakeStorage(false));
    for (const d of m.list()) {
      expect(m.getState(d.id).status).toBe('NOT_DOWNLOADED');
      expect(d.assets.length).toBe(0);
    }
  });
  it('refresh membaca penyimpanan nyata, bukan mengarang', async () => {
    const st = fakeStorage(true);
    const m = new EngineManager(st);
    expect((await m.refresh('tesseract')).status).toBe('READY_OFFLINE');
    st.ready = false;
    expect((await m.refresh('tesseract')).status).toBe('NOT_DOWNLOADED');
  });
  it('tanpa Cache API, engine dianggap tidak tersedia', async () => {
    const d = ENGINE_DEFINITIONS[0];
    expect(await cacheStorage.hasAll(d)).toBe(false);
  });
  it('download ditolak NO_SOURCE (belum ada sumber aset)', async () => {
    const m = new EngineManager(fakeStorage(false));
    const e = await rejects(m.download('ream'));
    expect(e instanceof EngineError && e.code === 'NO_SOURCE').toBe(true);
  });
  it('engine tidak dikenal ditolak', async () => {
    const m = new EngineManager(fakeStorage(false));
    const e = await rejects(m.refresh('nope' as never));
    expect(e instanceof EngineError && e.code === 'UNKNOWN_ENGINE').toBe(true);
  });
  it('runExclusive menolak jika engine belum siap offline', async () => {
    const m = new EngineManager(fakeStorage(false));
    const e = await rejects(m.runExclusive('pdfjs', async () => 1));
    expect(e instanceof EngineError && e.code === 'NO_SOURCE').toBe(true);
  });
  it('hanya satu proses berat pada satu waktu', async () => {
    const m = new EngineManager(fakeStorage(true));
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const first = m.runExclusive('pdfjs', async () => { await gate; return 'a'; });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(m.busy).toBe(true);
    expect(m.getState('pdfjs').status).toBe('PROCESSING');
    const e = await rejects(m.runExclusive('tesseract', async () => 'b'));
    expect(e instanceof EngineError && e.code === 'BUSY').toBe(true);
    release();
    expect(await first).toBe('a');
    expect(m.busy).toBe(false);
    expect(m.getState('pdfjs').status).toBe('READY_OFFLINE');
  });
  it('cancelActive meneruskan abort ke pekerjaan', async () => {
    const m = new EngineManager(fakeStorage(true));
    let sig: AbortSignal | undefined;
    const p = m.runExclusive('pdfjs', (s) => { sig = s; return new Promise<string>((res) => s.addEventListener('abort', () => res('aborted'))); });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(m.cancelActive()).toBe(true);
    expect(await p).toBe('aborted');
    expect(sig?.aborted).toBe(true);
    expect(m.cancelActive()).toBe(false);
  });
  it('clearCache menghapus penyimpanan dan mengembalikan status', async () => {
    const st = fakeStorage(true);
    const m = new EngineManager(st);
    await m.refresh('sheetjs');
    await m.clearCache('sheetjs');
    expect(st.removed).toEqual(['sheetjs']);
    expect(m.getState('sheetjs').status).toBe('NOT_DOWNLOADED');
  });
  it('subscribe dipanggil saat status berubah', async () => {
    const m = new EngineManager(fakeStorage(true));
    let n = 0;
    const off = m.subscribe(() => n++);
    await m.refresh('pdfjs');
    off();
    await m.refresh('pdfjs');
    expect(n).toBe(1);
  });
});
