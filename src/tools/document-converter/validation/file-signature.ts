import type { SignatureKind } from '../types/file';

/** Jumlah byte awal yang cukup untuk semua pemeriksaan di modul ini. */
export const HEAD_BYTES = 4096;

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  b.length >= offset + sig.length && sig.every((v, i) => b[offset + i] === v);

/** Deteksi jenis isi dari magic bytes. Tidak mempercayai ekstensi atau MIME. */
export function detectSignature(head: Uint8Array): SignatureKind {
  if (head.length === 0) return 'empty';
  // PDF boleh didahului sedikit sampah, tetapi spesifikasi mengizinkan %PDF- dalam 1024 byte pertama.
  const probe = head.subarray(0, Math.min(head.length, 1024));
  for (let i = 0; i + 5 <= probe.length; i++) {
    if (startsWith(probe, [0x25, 0x50, 0x44, 0x46, 0x2d], i)) return 'pdf';
  }
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return 'zip';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
  // BOM UTF-16 mengandung byte NUL tetapi tetap teks.
  if (startsWith(head, [0xff, 0xfe]) || startsWith(head, [0xfe, 0xff])) return 'text';
  if (head.includes(0)) return 'binary';
  return 'text';
}

/** Decode awal file teks (UTF-8, BOM dibuang). Dipakai untuk pemeriksaan isi ringan. */
export function decodeHead(head: Uint8Array): string {
  let b = head;
  if (b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) b = b.subarray(3);
  return new TextDecoder('utf-8', { fatal: false }).decode(b);
}
