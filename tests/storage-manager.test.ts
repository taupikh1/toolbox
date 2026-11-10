import { describe, expect, it } from 'vitest';

function fmt(n?: number): string {
  if (n == null || !Number.isFinite(n)) return 'Tidak diketahui';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

describe('storage format (Batch 9)', () => {
  it('menampilkan Tidak diketahui jika tidak ada angka', () => {
    expect(fmt(undefined)).toBe('Tidak diketahui');
    expect(fmt(NaN)).toBe('Tidak diketahui');
  });
  it('format KB/MB', () => {
    expect(fmt(2048)).toContain('KB');
    expect(fmt(2 * 1048576)).toContain('MB');
  });
});
