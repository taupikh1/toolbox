import JSZip from 'jszip';
import { checkZipEntries, type ZipEntryInfo } from '../../validation/ooxml-guard';
import type { PptxParseResult, PptxSlide, PptxMediaRef } from './types';

/** Baca metadata central directory ZIP (sama pola dengan Word). */
function u16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}
function u32(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

export function readZipEntries(data: Uint8Array): ZipEntryInfo[] {
  if (data.length < 22) throw new Error('File PPTX rusak: terlalu pendek untuk paket ZIP.');
  const EOCD = 0x06054b50;
  const min = Math.max(0, data.length - 22 - 65535);
  let eocd = -1;
  for (let i = data.length - 22; i >= min; i--) {
    if (u32(data, i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('File PPTX rusak: central directory tidak ditemukan.');
  const count = u16(data, eocd + 10);
  const cdSize = u32(data, eocd + 12);
  const cdOffset = u32(data, eocd + 16);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    throw new Error('Dokumen ZIP64 terlalu besar untuk diproses di peramban ini.');
  }
  if (cdOffset + cdSize > data.length) throw new Error('File PPTX rusak: central directory terpotong.');

  const entries: ZipEntryInfo[] = [];
  let p = cdOffset;
  const end = cdOffset + cdSize;
  for (let n = 0; n < count; n++) {
    if (p + 46 > end) throw new Error('File PPTX rusak: entri ZIP tidak lengkap.');
    if (u32(data, p) !== 0x02014b50) throw new Error('File PPTX rusak: signature central directory salah.');
    const comp = u32(data, p + 20);
    const uncomp = u32(data, p + 24);
    const nameLen = u16(data, p + 28);
    const extraLen = u16(data, p + 30);
    const commentLen = u16(data, p + 32);
    if (comp === 0xffffffff || uncomp === 0xffffffff) {
      throw new Error('Dokumen ZIP64 terlalu besar untuk diproses di peramban ini.');
    }
    const nameStart = p + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > data.length) throw new Error('File PPTX rusak: nama entri terpotong.');
    const name = new TextDecoder('utf-8', { fatal: false }).decode(data.subarray(nameStart, nameEnd));
    entries.push({ name, compressedSize: comp, uncompressedSize: uncomp });
    p = nameEnd + extraLen + commentLen;
  }
  return entries;
}

function assertPptxPackage(entries: ZipEntryInfo[]): string[] {
  const issues = checkZipEntries(entries);
  if (issues.length) {
    throw new Error('Dokumen ditolak demi keamanan: ' + issues.map((i) => i.detail).join(' '));
  }
  const warnings: string[] = [];
  if (entries.some((e) => /vbaProject\.bin/i.test(e.name))) {
    warnings.push('Presentasi berisi macro. Macro tidak dijalankan.');
  }
  if (!entries.some((e) => e.name.replace(/\\/g, '/') === 'ppt/presentation.xml')) {
    throw new Error('Paket ZIP ini bukan presentasi PPTX yang valid (ppt/presentation.xml tidak ada).');
  }
  return warnings;
}

function decodeXml(s: string): string {
  const cp = (n: number) => {
    if (!Number.isFinite(n) || n < 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) return '';
    return String.fromCodePoint(n);
  };
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => cp(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => cp(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Ekstrak semua teks DrawingML <a:t>...</a:t> sesuai urutan kemunculan. */
export function extractSlideTexts(xml: string): string[] {
  const texts: string[] = [];
  const re = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1].trim();
    if (raw) texts.push(decodeXml(raw));
  }
  return texts;
}

interface Rel { id: string; type: string; target: string; }

function parseRelationships(xml: string): Rel[] {
  const rels: Rel[] = [];
  // Attr order may vary; capture all three.
  const re = /<Relationship\b([^>]*?)\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1];
    const id = /Id="([^"]+)"/i.exec(attrs)?.[1];
    const type = /Type="([^"]+)"/i.exec(attrs)?.[1];
    const target = /Target="([^"]+)"/i.exec(attrs)?.[1];
    if (id && type && target) rels.push({ id, type, target });
  }
  return rels;
}

function resolvePath(baseDir: string, target: string): string {
  const parts = (baseDir + '/' + target).split('/').filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.') out.push(p);
  }
  return out.join('/');
}

/**
 * Parse file PPTX (ArrayBuffer / Uint8Array) menjadi struktur data untuk Batch 6B.
 * Semua pemrosesan lokal. Tidak menjalankan macro/script. Guard ZIP bomb & path dijalankan dulu.
 */
export async function parsePptx(
  data: ArrayBuffer | Uint8Array,
  fileName = 'presentation.pptx',
  fileSize = 0,
): Promise<PptxParseResult> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const errors: string[] = [];
  const warnings: string[] = [];

  let entries: ZipEntryInfo[];
  try {
    entries = readZipEntries(bytes);
    warnings.push(...assertPptxPackage(entries));
  } catch (e) {
    return {
      document: { fileName, fileSize: fileSize || bytes.length, slideCount: 0 },
      slides: [],
      media: [],
      status: 'failed',
      errors: [e instanceof Error ? e.message : String(e)],
      warnings,
    };
  }

  const zip = await JSZip.loadAsync(bytes);
  const media = Object.keys(zip.files)
    .filter((n) => n.startsWith('ppt/media/') && !n.endsWith('/'))
    .sort();

  // presentation.xml + rels
  const presFile = zip.file('ppt/presentation.xml');
  const relsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (!presFile || !relsFile) {
    return {
      document: { fileName, fileSize: fileSize || bytes.length, slideCount: 0 },
      slides: [],
      media,
      status: 'failed',
      errors: ['Struktur presentasi tidak lengkap (presentation.xml atau rels hilang).'],
      warnings,
    };
  }

  const presXml = await presFile.async('string');
  const relsXml = await relsFile.async('string');
  const rels = parseRelationships(relsXml);
  const slideRels = rels.filter((r) => /\/slide$/i.test(r.type) || r.type.endsWith('/slide'));

  // Urutan dari sldIdLst
  const ordered: { id?: string; rId: string }[] = [];
  const sldRe = /<p:sldId\b([^>]*?)\/?>/gi;
  let sm: RegExpExecArray | null;
  while ((sm = sldRe.exec(presXml)) !== null) {
    const attrs = sm[1];
    const id = /id="([^"]+)"/i.exec(attrs)?.[1];
    const rId = /r:id="([^"]+)"/i.exec(attrs)?.[1];
    if (rId) ordered.push({ id, rId });
  }

  // Fallback: jika sldIdLst kosong, pakai urutan rels slide
  const order: { id?: string; rId: string }[] = ordered.length
    ? ordered as { id?: string; rId: string }[]
    : slideRels.map((r) => ({ rId: r.id }));

  const slides: PptxSlide[] = [];
  for (let i = 0; i < order.length; i++) {
    const { id, rId } = order[i];
    const rel = slideRels.find((r) => r.id === rId);
    const slide: PptxSlide = {
      number: i + 1,
      slideId: id,
      rId,
      path: '',
      texts: [],
      plainText: '',
      mediaRefs: [],
      parseOk: false,
    };
    if (!rel) {
      slide.error = `Relationship slide ${rId} tidak ditemukan.`;
      errors.push(slide.error);
      slides.push(slide);
      continue;
    }
    const slidePath = resolvePath('ppt', rel.target);
    slide.path = slidePath;
    const slideFile = zip.file(slidePath);
    if (!slideFile) {
      slide.error = `File slide tidak ada: ${slidePath}`;
      errors.push(slide.error);
      slides.push(slide);
      continue;
    }
    try {
      const xml = await slideFile.async('string');
      slide.texts = extractSlideTexts(xml);
      slide.plainText = slide.texts.join('\n');
      // media dari slide rels
      const slideRelsPath = slidePath.replace(/([^/]+)$/, '_rels/$1.rels');
      const sRelsFile = zip.file(slideRelsPath);
      if (sRelsFile) {
        const sRelsXml = await sRelsFile.async('string');
        const sRels = parseRelationships(sRelsXml);
        const mediaRefs: PptxMediaRef[] = [];
        for (const sr of sRels) {
          if (/image|media|video|audio/i.test(sr.type) || /\.(png|jpe?g|gif|svg|emf|wmf|mp4|webm)$/i.test(sr.target)) {
            mediaRefs.push({
              rId: sr.id,
              target: resolvePath(slidePath.replace(/\/[^/]+$/, ''), sr.target),
              relationshipType: sr.type,
            });
          }
        }
        slide.mediaRefs = mediaRefs;
      }
      slide.parseOk = true;
    } catch (e) {
      slide.error = e instanceof Error ? e.message : String(e);
      errors.push(`Slide ${slide.number}: ${slide.error}`);
    }
    slides.push(slide);
  }

  const slideCount = slides.length;
  const okCount = slides.filter((s) => s.parseOk).length;
  const status: PptxParseResult['status'] =
    errors.length === 0 && okCount === slideCount ? 'success' :
    okCount > 0 ? 'partial' : 'failed';

  return {
    document: { fileName, fileSize: fileSize || bytes.length, slideCount },
    slides,
    media,
    status,
    errors,
    warnings,
  };
}
