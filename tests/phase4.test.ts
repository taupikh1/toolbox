import { describe, it, expect } from 'vitest';
import { parseHex, toHex, rgbToHsl, hslToRgb, complementary, clamp } from '../src/lib/color';
import { parsePageSpec } from '../src/tools/pdf-split/PdfSplit';

describe('color', () => {
  it('hex roundtrip', () => {
    const p = parseHex('#7c8cff');
    expect(p).toEqual({ r: 124, g: 140, b: 255 });
    expect(toHex(124, 140, 255)).toBe('#7C8CFF');
    expect(parseHex('#abc')).toEqual({ r: 170, g: 187, b: 204 });
    expect(parseHex('zz')).toBeNull();
  });

  it('rgb hsl roundtrip approx', () => {
    const hsl = rgbToHsl(255, 0, 0);
    expect(hsl.h).toBeCloseTo(0, 0);
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('complementary', () => {
    expect(complementary(10)).toBe(190);
    expect(clamp(120, 0, 100)).toBe(100);
  });
});

describe('pdf page spec', () => {
  it('parses ranges', () => {
    expect(parsePageSpec('1-3,5', 10)).toEqual([0, 1, 2, 4]);
    expect(parsePageSpec('2-5,8,10-12', 12)).toEqual([1, 2, 3, 4, 7, 9, 10, 11]);
  });
  it('rejects invalid', () => {
    expect(typeof parsePageSpec('0-1', 5)).toBe('string');
    expect(typeof parsePageSpec('3-1', 5)).toBe('string');
    expect(typeof parsePageSpec('1-99', 5)).toBe('string');
  });
});
