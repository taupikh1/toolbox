import { describe, it, expect } from 'vitest';
import {
  runQualityGate,
  correlation,
  HIGH_CORRELATION,
} from '../src/services/vocal-separator/pure/qualityGate';
import {
  getStorageEstimate,
  requestPersistentStorage,
} from '../src/services/vocal-separator/storageHelpers';

describe('full quality gate 22B-2', () => {
  it('warns not separated when vocals very quiet', () => {
    const input = [new Float32Array(2000).map(() => 0.2)];
    const vocals = [new Float32Array(2000).map(() => 1e-8)];
    const inst = [new Float32Array(2000).map(() => 0.2)];
    const r = runQualityGate({ input, vocals, instrumental: inst });
    expect(r.ok).toBe(false); // silent vocals = error
  });

  it('warns high correlation instrumental ≈ input', () => {
    const input = [new Float32Array(5000).map((_, i) => Math.sin(i / 30) * 0.3)];
    const inst = [new Float32Array(input[0])]; // copy
    const vocals = [new Float32Array(5000).map(() => 0.05)];
    const r = runQualityGate({ input, vocals, instrumental: inst });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => /tidak memisahkan|identik/i.test(w))).toBe(true);
    expect((r.instrumentalCorrelation ?? 0) >= HIGH_CORRELATION).toBe(true);
  });

  it('warns too aggressive when instrumental energy tiny', () => {
    const input = [new Float32Array(2000).map(() => 0.25)];
    const vocals = [new Float32Array(2000).map(() => 0.2)];
    const inst = [new Float32Array(2000).map(() => 1e-8)];
    const r = runQualityGate({ input, vocals, instrumental: inst });
    expect(r.ok).toBe(false); // silent instrumental
  });

  it('computes clipPercent', () => {
    const ch = [new Float32Array(100).fill(1)];
    const r = runQualityGate({ input: ch, vocals: ch });
    expect(r.stats.vocals?.clipPercent).toBeGreaterThan(0);
  });

  it('correlation of identical signals ~1', () => {
    const a = new Float32Array(1000).map((_, i) => Math.sin(i / 10));
    expect(correlation(a, a)).toBeGreaterThan(0.99);
  });
});

describe('storage helpers', () => {
  it('handles missing storage API', async () => {
    const est = await getStorageEstimate(undefined);
    expect(est.persisted).toBeNull();
    expect(est.usageLabel).toBe('—');
    const p = await requestPersistentStorage(undefined);
    expect(p).toBe(false);
  });

  it('mock persist false', async () => {
    const mock = {
      estimate: async () => ({ usage: 1024, quota: 1024 * 1024 }),
      persisted: async () => false,
      persist: async () => false,
    } as unknown as StorageManager;
    const est = await getStorageEstimate(mock);
    expect(est.usage).toBe(1024);
    expect(est.persisted).toBe(false);
    expect(await requestPersistentStorage(mock)).toBe(false);
  });

  it('mock persist true', async () => {
    const mock = {
      estimate: async () => ({ usage: 0, quota: 1e9 }),
      persisted: async () => true,
      persist: async () => true,
    } as unknown as StorageManager;
    expect(await requestPersistentStorage(mock)).toBe(true);
    const est = await getStorageEstimate(mock);
    expect(est.persisted).toBe(true);
  });
});
