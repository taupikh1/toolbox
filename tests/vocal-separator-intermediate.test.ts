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
