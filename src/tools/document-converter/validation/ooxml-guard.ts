import { OOXML_GUARD_LIMITS } from './file-limits';

/** Entri direktori ZIP (dibaca dari central directory pada batch berikutnya). */
export interface ZipEntryInfo {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
}

export type OoxmlGuardIssue =
  | { code: 'TOO_MANY_ENTRIES'; detail: string }
  | { code: 'ENTRY_TOO_LARGE'; detail: string }
  | { code: 'TOTAL_TOO_LARGE'; detail: string }
  | { code: 'SUSPICIOUS_RATIO'; detail: string }
  | { code: 'UNSAFE_PATH'; detail: string };

const MB = 1048576;

/**
 * Fondasi pemeriksaan ZIP bomb dan path berbahaya untuk DOCX/XLSX/PPTX.
 * Fungsi murni atas metadata entri; belum ada pembaca ZIP pada Batch 1.
 * Pembaca ZIP nanti WAJIB memanggil ini SEBELUM mengekstrak isi apa pun.
 */
export function checkZipEntries(entries: ZipEntryInfo[]): OoxmlGuardIssue[] {
  const L = OOXML_GUARD_LIMITS;
  const issues: OoxmlGuardIssue[] = [];
  if (entries.length > L.maxEntries) {
    issues.push({ code: 'TOO_MANY_ENTRIES', detail: `${entries.length} entri (maks ${L.maxEntries}).` });
  }
  let total = 0;
  for (const e of entries) {
    total += e.uncompressedSize;
    if (e.name.startsWith('/') || e.name.includes('..') || e.name.includes('\\') || /^[a-zA-Z]:/.test(e.name)) {
      issues.push({ code: 'UNSAFE_PATH', detail: 'Ada entri dengan path tidak aman.' });
    }
    if (e.uncompressedSize > L.maxEntryUncompressedMB * MB) {
      issues.push({ code: 'ENTRY_TOO_LARGE', detail: `Satu entri melebihi ${L.maxEntryUncompressedMB} MB setelah dekompresi.` });
    }
    const ratio = e.compressedSize > 0 ? e.uncompressedSize / e.compressedSize : (e.uncompressedSize > 0 ? Infinity : 0);
    if (ratio > L.maxCompressionRatio && e.uncompressedSize > MB) {
      issues.push({ code: 'SUSPICIOUS_RATIO', detail: 'Rasio kompresi tidak wajar (indikasi ZIP bomb).' });
    }
  }
  if (total > L.maxTotalUncompressedMB * MB) {
    issues.push({ code: 'TOTAL_TOO_LARGE', detail: `Total setelah dekompresi melebihi ${L.maxTotalUncompressedMB} MB.` });
  }
  // Satu laporan per jenis masalah agar pesan tidak berulang.
  return issues.filter((x, i) => issues.findIndex((y) => y.code === x.code) === i);
}
