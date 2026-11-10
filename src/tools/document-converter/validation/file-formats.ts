import type { FormatId, LimitCategory, SignatureKind } from '../types/file';

export interface FormatSpec {
  label: string;
  extensions: string[];
  mimes: string[];
  /** Signature yang WAJIB ada di awal file. 'text' = file teks (tanpa magic bytes). */
  signature: SignatureKind;
  limit: LimitCategory;
}

export const FORMAT_SPECS: Record<FormatId, FormatSpec> = {
  pdf:  { label: 'PDF',  extensions: ['pdf'], mimes: ['application/pdf'], signature: 'pdf', limit: 'pdf' },
  docx: { label: 'DOCX', extensions: ['docx'], mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'], signature: 'zip', limit: 'office' },
  xlsx: { label: 'XLSX', extensions: ['xlsx'], mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], signature: 'zip', limit: 'office' },
  pptx: { label: 'PPTX', extensions: ['pptx'], mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'], signature: 'zip', limit: 'office' },
  txt:  { label: 'TXT',  extensions: ['txt', 'text'], mimes: ['text/plain'], signature: 'text', limit: 'text' },
  csv:  { label: 'CSV',  extensions: ['csv'], mimes: ['text/csv', 'application/csv', 'application/vnd.ms-excel'], signature: 'text', limit: 'text' },
  json: { label: 'JSON', extensions: ['json'], mimes: ['application/json', 'text/json'], signature: 'text', limit: 'text' },
  html: { label: 'HTML', extensions: ['html', 'htm'], mimes: ['text/html'], signature: 'text', limit: 'text' },
  svg:  { label: 'SVG',  extensions: ['svg'], mimes: ['image/svg+xml'], signature: 'text', limit: 'text' },
  jpg:  { label: 'JPG',  extensions: ['jpg', 'jpeg'], mimes: ['image/jpeg'], signature: 'jpeg', limit: 'image' },
  png:  { label: 'PNG',  extensions: ['png'], mimes: ['image/png'], signature: 'png', limit: 'image' },
  webp: { label: 'WebP', extensions: ['webp'], mimes: ['image/webp'], signature: 'webp', limit: 'image' },
};

/** Ekstensi Office lama (OLE/binary). Sengaja ditolak dengan pesan khusus. */
export const LEGACY_OFFICE_EXTENSIONS = ['doc', 'xls', 'ppt'];

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

export function formatByExtension(ext: string): FormatId | undefined {
  return (Object.keys(FORMAT_SPECS) as FormatId[]).find((f) => FORMAT_SPECS[f].extensions.includes(ext));
}
