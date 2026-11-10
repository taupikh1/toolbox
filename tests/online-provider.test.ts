import { describe, expect, it } from 'vitest';
import { GOTENBERG_DEMO, ONLINE_PROVIDERS } from '../src/tools/document-converter/engine/online/providers';
import { convertOnline, mapError } from '../src/tools/document-converter/engine/online/client';

describe('Online provider (Batch 7D)', () => {
  it('Gotenberg demo tidak mendukung CORS', () => {
    expect(GOTENBERG_DEMO.supportsBrowserCors).toBe(false);
    expect(GOTENBERG_DEMO.isAvailable).toBe(false);
    expect(GOTENBERG_DEMO.requiresApiKey).toBe(false);
  });

  it('convertOnline menolak provider yang tidak CORS', async () => {
    const f = new File([new Uint8Array([1])], 'a.pptx');
    await expect(convertOnline(GOTENBERG_DEMO, { file: f, conversionId: 'pptx-to-pdf' })).rejects.toThrow(/CORS|tidak dapat digunakan/);
  });

  it('mapError memberikan pesan ramah', () => {
    expect(mapError(new Error('CORS blocked'))).toMatch(/CORS|browser/);
    expect(mapError(new Error('429'))).toMatch(/batas/i);
  });

  it('daftar provider ada', () => {
    expect(ONLINE_PROVIDERS.length).toBeGreaterThan(0);
  });
});
