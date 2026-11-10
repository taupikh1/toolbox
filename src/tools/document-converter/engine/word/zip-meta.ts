import { checkZipEntries, type ZipEntryInfo } from '../../validation/ooxml-guard';

function u16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function u32(data: Uint8Array, offset: number): number {
  return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
}

/**
 * Baca metadata central directory ZIP tanpa mengekstrak isi.
 * Dipakai sebelum Mammoth menyentuh byte DOCX.
 */
export function readZipEntries(data: Uint8Array): ZipEntryInfo[] {
  if (data.length < 22) throw new Error('File DOCX rusak: terlalu pendek untuk paket ZIP.');
  const EOCD = 0x06054b50;
  const min = Math.max(0, data.length - 22 - 65535);
  let eocd = -1;
  for (let i = data.length - 22; i >= min; i--) {
    if (u32(data, i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File DOCX rusak: central directory tidak ditemukan.');
  const count = u16(data, eocd + 10);
  const cdSize = u32(data, eocd + 12);
  const cdOffset = u32(data, eocd + 16);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    throw new Error('Dokumen ZIP64 terlalu besar untuk diproses di peramban ini.');
  }
  if (cdOffset + cdSize > data.length) throw new Error('File DOCX rusak: central directory terpotong.');

  const entries: ZipEntryInfo[] = [];
  let p = cdOffset;
  const end = cdOffset + cdSize;
  for (let n = 0; n < count; n++) {
    if (p + 46 > end) throw new Error('File DOCX rusak: entri ZIP tidak lengkap.');
    if (u32(data, p) !== 0x02014b50) throw new Error('File DOCX rusak: signature central directory salah.');
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
    if (nameEnd > data.length) throw new Error('File DOCX rusak: nama entri terpotong.');
    const name = new TextDecoder('utf-8', { fatal: false }).decode(data.subarray(nameStart, nameEnd));
    entries.push({ name, compressedSize: comp, uncompressedSize: uncomp });
    p = nameEnd + extraLen + commentLen;
  }
  return entries;
}

/** Tolak ZIP bomb, path berbahaya, dan paket yang bukan DOCX. Macro tidak dijalankan. */
export function assertDocxPackage(data: Uint8Array): string[] {
  const entries = readZipEntries(data);
  const issues = checkZipEntries(entries);
  if (issues.length) {
    throw new Error('Dokumen ditolak demi keamanan: ' + issues.map((i) => i.detail).join(' '));
  }
  const warnings: string[] = [];
  if (entries.some((e) => /vbaProject\.bin/i.test(e.name))) {
    warnings.push('Dokumen berisi macro. Macro tidak dijalankan dan tidak disalin ke hasil.');
  }
  if (!entries.some((e) => e.name.replace(/\\/g, '/') === 'word/document.xml')) {
    throw new Error('Paket ZIP ini bukan dokumen DOCX yang valid (word/document.xml tidak ada).');
  }
  return warnings;
}
