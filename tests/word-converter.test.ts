import { describe, expect, it } from 'vitest';
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { validateFile } from '../src/tools/document-converter/validation/file-validator';
import { blocksToPlainText, htmlToBlocks, sanitizeHtml } from '../src/tools/document-converter/engine/word/blocks';
import { docxToHtml, docxToPdf, docxToTxt, htmlToDocx, txtToDocx } from '../src/tools/document-converter/engine/word/converters';
import { outputName } from '../src/tools/document-converter/engine/word/names';
import { assertDocxPackage, readZipEntries } from '../src/tools/document-converter/engine/word/zip-meta';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function u16(n: number): number[] {
  return [n & 255, (n >> 8) & 255];
}
function u32(n: number): number[] {
  return [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >> 24) & 255];
}

/** ZIP method-store dengan ukuran central directory yang bisa dipalsukan (uji guard). */
function zipWithCentral(name: string, compressedSize: number, uncompressedSize: number, payload: Uint8Array): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const local = [
    ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(0), ...u32(payload.length), ...u32(payload.length), ...u16(nameBytes.length), ...u16(0),
    ...nameBytes, ...payload,
  ];
  const cd = [
    ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
    ...u32(0), ...u32(compressedSize), ...u32(uncompressedSize), ...u16(nameBytes.length), ...u16(0), ...u16(0),
    ...u16(0), ...u16(0), ...u32(0), ...u32(local.length),
    ...nameBytes,
  ];
  const eocd = [
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(1), ...u16(1),
    ...u32(cd.length), ...u32(local.length), ...u16(0),
  ];
  return new Uint8Array([...local, ...cd, ...eocd]);
}

async function fixtureDocx(): Promise<File> {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Judul Dokumen')] }),
        new Paragraph({ children: [new TextRun('Pengaturan dokumen di Jakarta, 9 November 2026.')] }),
        new Paragraph({
          children: [
            new TextRun({ text: 'tebal', bold: true }),
            new TextRun(' dan '),
            new TextRun({ text: 'miring', italics: true }),
          ],
        }),
        new Paragraph({ children: [new TextRun('Baris satu'), new TextRun({ break: 1 }), new TextRun('Baris dua')] }),
        new Table({
          rows: [new TableRow({
            children: [
              new TableCell({ children: [new Paragraph('Kolom A')] }),
              new TableCell({ children: [new Paragraph('Kolom B')] }),
            ],
          })],
        }),
      ],
    }],
  });
  const buf = await Packer.toBuffer(doc);
  return new File([buf], 'laporan akhir (final).docx', { type: DOCX });
}

describe('nama file', () => {
  it('membersihkan spasi dan karakter khusus', () => {
    expect(outputName('laporan akhir (final)?.docx', 'txt')).toBe('laporan akhir (final)_.txt');
    expect(outputName('a/b:c*.docx', 'pdf')).toBe('b_c_.pdf');
    expect(outputName('dokumen.txt', 'docx', 'catatan baru')).toBe('catatan baru.docx');
  });
});

describe('sanitasi HTML', () => {
  it('membuang script, event handler, dan javascript:', () => {
    const clean = sanitizeHtml('<p>Aman</p><script>alert(1)</script><p onclick="evil()">Teks</p><a href="javascript:alert(1)">klik</a>');
    expect(clean.toLowerCase()).not.toContain('<script');
    expect(clean).not.toContain('alert(1)');
    expect(clean).not.toContain('onclick');
    expect(clean.toLowerCase()).not.toContain('javascript:');
    expect(clean).toContain('Aman');
    expect(clean).toContain('Teks');
    const blocks = htmlToBlocks(clean);
    const text = blocksToPlainText(blocks);
    expect(text).toContain('Aman');
    expect(text).toContain('Teks');
    expect(text).not.toContain('alert');
  });
});

describe('validasi file Word', () => {
  it('menolak file kosong', () => {
    const r = validateFile({ name: 'kosong.docx', size: 0, type: DOCX }, new Uint8Array(), ['docx']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('EMPTY_FILE');
  });
  it('menolak ekstensi palsu', () => {
    const head = new TextEncoder().encode('%PDF-1.7 contoh');
    const r = validateFile({ name: 'palsu.docx', size: head.length, type: DOCX }, head, ['docx']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code === 'SIGNATURE_MISMATCH' || r.code === 'BINARY_AS_TEXT').toBe(true);
  });
  it('menolak .doc lama', () => {
    const r = validateFile({ name: 'lama.doc', size: 10, type: '' }, new Uint8Array([0xd0, 0xcf, 0x11, 0xe0]), ['docx']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('LEGACY_OFFICE');
  });
  it('menolak file terlalu besar', () => {
    const head = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]);
    const r = validateFile({ name: 'besar.docx', size: 31 * 1048576, type: DOCX }, head, ['docx']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('TOO_LARGE');
  });
});

describe('penjaga ZIP', () => {
  it('menolak rasio mencurigakan sebelum isi diekstrak', () => {
    const bytes = zipWithCentral('word/document.xml', 100, 50 * 1048576, new Uint8Array([1, 2, 3]));
    const entries = readZipEntries(bytes);
    expect(entries[0].name).toBe('word/document.xml');
    expect(() => assertDocxPackage(bytes)).toThrow(/keamanan|kompresi|besar/i);
  });
  it('menolak ZIP yang bukan DOCX', () => {
    const bytes = zipWithCentral('hello.txt', 3, 3, new TextEncoder().encode('abc'));
    expect(() => assertDocxPackage(bytes)).toThrow(/bukan dokumen DOCX/i);
  });
  it('menolak byte rusak', () => {
    expect(() => readZipEntries(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(/rusak/i);
  });
});

describe('Word Converter', () => {
  it('DOCX ke TXT mempertahankan paragraf, baris, tabel, dan karakter Indonesia', async () => {
    const file = await fixtureDocx();
    const out = await docxToTxt(file);
    expect(out.fileName).toBe('laporan akhir (final).txt');
    expect(out.blob.type).toContain('text/plain');
    const text = await out.blob.text();
    expect(text).toContain('Judul Dokumen');
    expect(text).toContain('Pengaturan dokumen di Jakarta, 9 November 2026.');
    expect(text).toContain('tebal');
    expect(text).toContain('miring');
    expect(text).toContain('Kolom A\tKolom B');
    expect(text).toContain('Baris satu');
    expect(text).toContain('Baris dua');
  });

  it('DOCX ke HTML mempertahankan heading, bold, italic, dan tabel, tanpa script', async () => {
    const file = await fixtureDocx();
    const out = await docxToHtml(file);
    const html = await out.blob.text();
    expect(html).toContain('<h1>');
    expect(html.toLowerCase()).toContain('<strong>');
    expect(html.toLowerCase()).toContain('<em>');
    expect(html).toContain('<table>');
    expect(html).toContain('Jakarta');
    expect(html.toLowerCase()).not.toContain('<script');
    expect(out.blob.type).toContain('text/html');
  });

  it('DOCX ke PDF menghasilkan PDF otomatis', async () => {
    const file = await fixtureDocx();
    const out = await docxToPdf(file);
    expect(out.fileName.endsWith('.pdf')).toBe(true);
    expect(out.blob.type).toBe('application/pdf');
    const bytes = new Uint8Array(await out.blob.arrayBuffer());
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-');
    expect(out.losses.join(' ')).toMatch(/otomatis|bukan dialog/i);
    expect(bytes.byteLength).toBeGreaterThan(500);
  });

  it('TXT ke DOCX lalu kembali ke teks', async () => {
    const src = new File(['Pengaturan baris satu\nbaris dua\n\nParagraf kedua.'], 'catatan.txt', { type: 'text/plain' });
    const out = await txtToDocx(src, 'hasil khusus');
    expect(out.fileName).toBe('hasil khusus.docx');
    expect(out.blob.size).toBeGreaterThan(100);
    const round = await docxToTxt(new File([await out.blob.arrayBuffer()], out.fileName, { type: DOCX }));
    const text = await round.blob.text();
    expect(text).toContain('Pengaturan baris satu');
    expect(text).toContain('baris dua');
    expect(text).toContain('Paragraf kedua.');
  });

  it('HTML ke DOCX membuang script dan mempertahankan tabel', async () => {
    const html = '<h1>Judul</h1><p>Aman <strong>tebal</strong></p><script>alert(1)</script><p onclick="x()">Teks</p><table><tr><td>Satu</td><td>Dua</td></tr></table>';
    const file = new File([html], 'halaman.html', { type: 'text/html' });
    const out = await htmlToDocx(file);
    expect(out.fileName).toBe('halaman.docx');
    const raw = new TextDecoder('latin1').decode(new Uint8Array(await out.blob.arrayBuffer()));
    expect(raw.includes('alert(1)')).toBe(false);
    const back = await docxToTxt(new File([await out.blob.arrayBuffer()], out.fileName, { type: DOCX }));
    const text = await back.blob.text();
    expect(text).toContain('Judul');
    expect(text).toContain('Aman');
    expect(text).toContain('tebal');
    expect(text).toContain('Teks');
    expect(text).not.toContain('alert');
    expect(text).toContain('Satu\tDua');
  });

  it('menolak DOCX rusak dan file kosong di engine', async () => {
    const bad = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])], 'rusak.docx', { type: DOCX });
    await expect(docxToTxt(bad)).rejects.toThrow(/rusak|kosong|bukan/i);
    const empty = new File([], 'kosong.docx', { type: DOCX });
    await expect(docxToHtml(empty)).rejects.toThrow(/kosong/i);
    await expect(txtToDocx(new File(['   \n'], 'k.txt', { type: 'text/plain' }))).rejects.toThrow(/kosong/i);
  });
});
