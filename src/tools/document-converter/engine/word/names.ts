/** Nama unduhan yang aman. Tidak mengubah isi dokumen. */
export function outputName(inputName: string, ext: string, override?: string): string {
  const raw = (override?.trim() || inputName || 'dokumen').replace(/\\/g, '/');
  const baseOnly = raw.split('/').pop() || 'dokumen';
  const noExt = baseOnly.replace(/\.[^.]+$/, '');
  const clean = noExt
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  const safeExt = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${clean || 'dokumen'}.${safeExt}`;
}
