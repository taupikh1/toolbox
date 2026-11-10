import { describe, expect, it } from 'vitest';
import { parseSrt, toSrt, validateCues, shiftCues, type Cue } from '../src/tools/subtitle/parser';

const sample = `1
00:00:01,000 --> 00:00:03,000
Halo dunia

2
00:00:04,000 --> 00:00:06,000
Baris kedua
`;

describe('Subtitle tools (Batch 14)', () => {
  it('parse dan export SRT', () => {
    const cues = parseSrt(sample);
    expect(cues.length).toBe(2);
    expect(cues[0].text).toBe('Halo dunia');
    expect(cues[0].start).toBe(1000);
    const out = toSrt(cues);
    expect(out).toContain('00:00:01,000');
    expect(out).toContain('Halo dunia');
  });

  it('validasi mendeteksi overlap dan timestamp buruk', () => {
    const bad: Cue[] = [
      { id: 'a', start: 0, end: 2000, text: 'A' },
      { id: 'b', start: 1000, end: 3000, text: 'B' },
    ];
    const issues = validateCues(bad);
    expect(issues.some((x) => /overlap/i.test(x))).toBe(true);
  });

  it('shift tidak menghasilkan negatif', () => {
    const cues: Cue[] = [{ id: 'a', start: 100, end: 200, text: 'x' }];
    const shifted = shiftCues(cues, -500);
    expect(shifted[0].start).toBe(0);
    expect(shifted[0].end).toBe(0);
  });
});
