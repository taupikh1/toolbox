import { describe, expect, it } from 'vitest';
import type { ScanPage } from '../src/tools/document-converter/engine/scanner/types';

describe('scanner types (Batch 7B)', () => {
  it('ScanPage shape', () => {
    const p: ScanPage = {
      id: 'p1',
      previewUrl: 'blob:test',
      blob: new Blob(),
      filter: 'original',
      rotation: 0,
      width: 100,
      height: 100,
    };
    expect(p.filter).toBe('original');
    expect(p.rotation).toBe(0);
  });
});
