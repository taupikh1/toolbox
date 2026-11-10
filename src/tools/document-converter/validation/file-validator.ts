import type { FileMeta, FormatId, ValidationResult } from '../types/file';
import { decodeHead, detectSignature, HEAD_BYTES } from './file-signature';
import { FORMAT_SPECS, LEGACY_OFFICE_EXTENSIONS, extensionOf, formatByExtension } from './file-formats';
import { getMaxBytes, getMaxMB, type LimitOverrides } from './file-limits';
import { formatFileSize } from '../utils/format-file-size';

const fail = (code: Extract<ValidationResult, { ok: false }>['code'], message: string, detected?: Extract<ValidationResult, { ok: false }>['detected']): ValidationResult =>
  ({ ok: false, code, message, detected });

const labels = (fs: FormatId[]) => fs.map((f) => FORMAT_SPECS[f].label).join(', ');

/** Pemeriksaan isi ringan untuk format teks. Bukan parser. */
function textContentMismatch(format: FormatId, head: Uint8Array): string | null {
  const s = decodeHead(head).trimStart();
  if (format === 'json' && s.length > 0 && s[0] !== '{' && s[0] !== '[' && s[0] !== '"' && !/^(-?\d|true|false|null)/.test(s)) {
    return 'Isi file tidak terlihat seperti JSON.';
  }
  if (format === 'svg' && !/<svg[\s>]/i.test(s)) return 'Isi file tidak memuat elemen <svg>.';
  if (format === 'html' && !/</.test(s)) return 'Isi file tidak terlihat seperti HTML.';
  return null;
}

/**
 * Validasi murni (tanpa I/O): nama, ukuran, MIME, dan magic bytes dari `head`.
 * Ekstensi hanya penentu awal; magic bytes yang menentukan.
 * MIME hanya menghasilkan peringatan karena browser sering melaporkannya salah.
 */
export function validateFile(
  meta: FileMeta,
  head: Uint8Array,
  expected: FormatId[],
  overrides?: LimitOverrides,
): ValidationResult {
  if (meta.size === 0 || head.length === 0) {
    return fail('EMPTY_FILE', 'File kosong (0 byte).', 'empty');
  }

  const ext = extensionOf(meta.name);
  if (LEGACY_OFFICE_EXTENSIONS.includes(ext)) {
    return fail('LEGACY_OFFICE', `Format .${ext} (Office lama) belum didukung. Simpan ulang sebagai .${ext}x lalu coba lagi.`);
  }

  const byExt = formatByExtension(ext);
  const format = byExt && expected.includes(byExt) ? byExt : undefined;
  if (!format) {
    return fail('UNSUPPORTED_EXTENSION', `Ekstensi ${ext ? '.' + ext : 'file'} tidak sesuai. Format yang diterima: ${labels(expected)}.`);
  }

  const spec = FORMAT_SPECS[format];
  const max = getMaxBytes(spec.limit, overrides);
  if (meta.size > max) {
    return fail('TOO_LARGE', `Ukuran ${formatFileSize(meta.size)} melebihi batas ${getMaxMB(spec.limit, overrides)} MB untuk ${spec.label}.`);
  }

  const detected = detectSignature(head);
  if (spec.signature === 'text') {
    if (detected !== 'text') {
      return fail(detected === 'binary' ? 'BINARY_AS_TEXT' : 'SIGNATURE_MISMATCH',
        `File berekstensi .${ext} tetapi isinya bukan teks (terdeteksi: ${detected}).`, detected);
    }
    const bad = textContentMismatch(format, head);
    if (bad) return fail('CONTENT_MISMATCH', bad, detected);
  } else if (detected !== spec.signature) {
    if (detected === 'ole') {
      return fail('LEGACY_OFFICE', 'File ini berformat Office lama (OLE) meski berekstensi baru. Simpan ulang dari aplikasi Office.', detected);
    }
    return fail('SIGNATURE_MISMATCH', `File berekstensi .${ext} tetapi isinya bukan ${spec.label} (terdeteksi: ${detected}).`, detected);
  }

  const warnings: string[] = [];
  if (meta.type && !spec.mimes.includes(meta.type) && meta.type !== 'application/octet-stream') {
    warnings.push(`Tipe MIME dari browser (${meta.type}) tidak umum untuk ${spec.label}. Pemeriksaan isi file tetap lolos.`);
  }
  return { ok: true, format, detected, warnings };
}

/** Versi untuk File browser: hanya membaca HEAD_BYTES pertama, tidak memuat seluruh file. */
export async function validateBlob(file: File, expected: FormatId[], overrides?: LimitOverrides): Promise<ValidationResult> {
  const head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer());
  return validateFile({ name: file.name, size: file.size, type: file.type }, head, expected, overrides);
}
