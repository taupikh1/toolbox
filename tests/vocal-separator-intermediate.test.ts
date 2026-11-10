/**
 * Regression: LOAD_MODEL / INIT_RUNTIME gagal dengan "Unexpected response"
 * karena pesan PROGRESS / MODEL_PROGRESS (requestId sama) dianggap jawaban akhir.
 */
import { describe, it, expect } from 'vitest';
import { isIntermediateResponse } from '../src/services/vocal-separator/workerMessages';

describe('isIntermediateResponse', () => {
  it('menganggap PROGRESS dan MODEL_PROGRESS sebagai perantara', () => {
    expect(isIntermediateResponse({ type: 'PROGRESS', requestId: 'a', phase: 'import' })).toBe(true);
    expect(isIntermediateResponse({ type: 'MODEL_PROGRESS', requestId: 'a', phase: 'cache' })).toBe(true);
  });
  it('jawaban akhir bukan perantara', () => {
    expect(isIntermediateResponse({ type: 'READY', requestId: 'a' })).toBe(false);
    expect(isIntermediateResponse({ type: 'MODEL_READY', requestId: 'a' })).toBe(false);
    expect(isIntermediateResponse({ type: 'ERROR', requestId: 'a', code: 'X', message: 'y' })).toBe(false);
  });
  it('aman untuk input aneh', () => {
    expect(isIntermediateResponse(null)).toBe(false);
    expect(isIntermediateResponse('PROGRESS')).toBe(false);
  });
});

import { findCachedModelIndex } from '../src/services/vocal-separator/workerMessages';

describe('findCachedModelIndex (regresi MODEL_NOT_CACHED)', () => {
  const id = 'uvr-mdx-net-inst-hq-3';
  it('menemukan model yang disimpan relatif ke URL halaman', () => {
    expect(findCachedModelIndex(['https://x.github.io/toolbox/' + id], id)).toBe(0);
  });
  it('menemukan model walau base-nya beda (halaman vs worker)', () => {
    expect(
      findCachedModelIndex(
        ['https://x.github.io/toolbox/other', 'https://x.github.io/toolbox/assets/' + id],
        id,
      ),
    ).toBe(1);
  });
  it('tidak cocok dengan nama yang hanya mirip di ujung', () => {
    expect(findCachedModelIndex(['https://x.github.io/toolbox/not-' + id], id)).toBe(-1);
  });
  it('aman untuk input kosong / URL rusak', () => {
    expect(findCachedModelIndex([], id)).toBe(-1);
    expect(findCachedModelIndex(['bukan url'], id)).toBe(-1);
    expect(findCachedModelIndex(['https://x/y/' + id], '')).toBe(-1);
  });
});
