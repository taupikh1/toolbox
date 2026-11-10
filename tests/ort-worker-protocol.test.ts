/**
 * Batch 22A — unit tests for worker message protocol (no real ORT load).
 */
import { describe, it, expect } from 'vitest';
import { isWorkerRequest } from '../src/services/vocal-separator/workerMessages';

describe('workerMessages protocol', () => {
  it('accepts valid INIT_RUNTIME', () => {
    expect(isWorkerRequest({ type: 'INIT_RUNTIME', requestId: 'a1' })).toBe(true);
  });
  it('accepts CHECK_CAPABILITIES / CANCEL / DISPOSE', () => {
    expect(isWorkerRequest({ type: 'CHECK_CAPABILITIES', requestId: 'b' })).toBe(true);
    expect(isWorkerRequest({ type: 'CANCEL', requestId: 'c' })).toBe(true);
    expect(isWorkerRequest({ type: 'DISPOSE', requestId: 'd' })).toBe(true);
  });
  it('rejects missing requestId', () => {
    expect(isWorkerRequest({ type: 'INIT_RUNTIME' })).toBe(false);
    expect(isWorkerRequest({ type: 'INIT_RUNTIME', requestId: '' })).toBe(false);
  });
  it('rejects unknown type', () => {
    expect(isWorkerRequest({ type: 'RUN_INFERENCE', requestId: 'x' })).toBe(false);
    expect(isWorkerRequest(null)).toBe(false);
    expect(isWorkerRequest('INIT_RUNTIME')).toBe(false);
  });
});
