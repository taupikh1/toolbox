import { describe, expect, it } from 'vitest';
import { runOcr } from '../src/tools/document-converter/engine/ocr/engine';

describe('OCR engine foundation (Batch 7A)', () => {
  it('menolak file kosong', async () => {
    const f = new File([], 'kosong.png', { type: 'image/png' });
    const r = await runOcr(f);
    expect(r.status).toBe('failed');
    expect(r.errors[0]).toMatch(/kosong/i);
  });

  it('menolak format tidak didukung', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'file.txt', { type: 'text/plain' });
    const r = await runOcr(f);
    expect(r.status).toBe('failed');
    expect(r.errors[0]).toMatch(/tidak didukung/i);
  });

  it('menolak gambar terlalu besar', async () => {
    const big = new Uint8Array(21 * 1048576);
    const f = new File([big], 'besar.png', { type: 'image/png' });
    const r = await runOcr(f);
    expect(r.status).toBe('failed');
    expect(r.errors[0]).toMatch(/melebihi/i);
  });

  it('status cancelled saat signal abort', async () => {
    const c = new AbortController();
    c.abort();
    const f = new File([new Uint8Array([1])], 'a.png', { type: 'image/png' });
    const r = await runOcr(f, { signal: c.signal });
    expect(r.status).toBe('cancelled');
  });
});
