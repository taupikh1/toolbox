import { describe, expect, it } from 'vitest';

function applyContrast(v: number, contrast: number, brightness: number): number {
  return Math.max(0, Math.min(255, (v - 128) * contrast + 128 + brightness));
}

describe('Document Intelligence (Batch 15)', () => {
  it('kontras dan kecerahan membatasi ke 0-255', () => {
    expect(applyContrast(128, 2, 0)).toBe(128);
    expect(applyContrast(200, 2, 50)).toBe(255);
    expect(applyContrast(10, 0.5, -50)).toBeGreaterThanOrEqual(0);
  });
  it('grayscale formula menghasilkan nilai yang sama untuk RGB', () => {
    const y = 0.299 * 255 + 0.587 * 0 + 0.114 * 0;
    expect(y).toBeCloseTo(76.245, 1);
  });
});
