import { describe, it, expect } from 'vitest';
import {
  getDeviceTier,
  getLimitsForTier,
  estimateProcessingTime,
  shouldWarnDuration,
  trimToSeconds,
  TIER_LIMITS,
} from '../src/services/vocal-separator/pure/deviceTier';
import {
  runFastMode,
  detectNearMono,
  lowpass2,
} from '../src/services/vocal-separator/pure/fastMode';
import { mapPositionOnSourceSwitch, nextSource } from '../src/services/vocal-separator/pure/abPlayer';

describe('getDeviceTier', () => {
  it('iphone old -> low', () => {
    expect(getDeviceTier({ userAgent: 'iPhone OS 14', hardwareConcurrency: 2 })).toBe('low');
  });
  it('desktop high cores -> high', () => {
    expect(
      getDeviceTier({ userAgent: 'Mozilla/5.0', hardwareConcurrency: 8, deviceMemory: 8 }),
    ).toBe('high');
  });
  it('android low memory -> low', () => {
    expect(
      getDeviceTier({ userAgent: 'Android', deviceMemory: 2, hardwareConcurrency: 4 }),
    ).toBe('low');
  });
});

describe('tier limits single source', () => {
  it('batchSize always 1', () => {
    for (const t of ['low', 'mid', 'high'] as const) {
      expect(getLimitsForTier(t).batchSize).toBe(1);
    }
  });
  it('warn when over limit', () => {
    expect(shouldWarnDuration(999, 'low')).toBe(true);
    expect(shouldWarnDuration(10, 'high')).toBe(false);
  });
  it('estimate positive range', () => {
    const e = estimateProcessingTime(30, 'mid', 'balanced');
    expect(e.maxSec).toBeGreaterThanOrEqual(e.minSec);
    expect(e.label).toMatch(/Perkiraan/);
  });
});

describe('trimToSeconds', () => {
  it('trims length', () => {
    const ch = [new Float32Array(44100 * 10)];
    const out = trimToSeconds(ch, 44100, 60);
    // 10s file shorter than 60 → same length
    expect(out[0].length).toBe(44100 * 10);
    const long = [new Float32Array(44100 * 120)];
    const t = trimToSeconds(long, 44100, 60);
    expect(t[0].length).toBe(44100 * 60);
  });
});

describe('ab player', () => {
  it('maps position proportionally', () => {
    expect(mapPositionOnSourceSwitch(10, 100, 50)).toBeCloseTo(5);
  });
  it('nextSource cycles', () => {
    expect(nextSource('original', ['original', 'vocals'], 1)).toBe('vocals');
  });
});

describe('fastMode', () => {
  it('s=0 returns original', () => {
    const L = new Float32Array([0.1, -0.2, 0.3]);
    const R = new Float32Array([0.1, -0.2, 0.3]);
    const r = runFastMode(L, R, { strength: 0, keepBass: false, sampleRate: 44100 });
    expect([...r.left]).toEqual([...L]);
  });
  it('s=1 produces side effect', () => {
    const L = new Float32Array(1000).map((_, i) => Math.sin(i / 10));
    const R = new Float32Array(1000).map((_, i) => Math.cos(i / 10));
    const r = runFastMode(L, R, { strength: 1, keepBass: false, sampleRate: 44100 });
    expect(r.left.some((v, i) => Math.abs(v - L[i]) > 1e-6)).toBe(true);
  });
  it('near mono warning', () => {
    const L = new Float32Array(500).fill(0.2);
    const R = new Float32Array(500).fill(0.2);
    expect(detectNearMono(L, R)).toBe(true);
    const r = runFastMode(L, R, { strength: 0.5, keepBass: true, sampleRate: 44100 });
    expect(r.warning).toMatch(/mono/i);
  });
  it('lowpass attenuates high freq roughly', () => {
    const n = 4096;
    const sr = 44100;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 5000 * i) / sr);
    const y = lowpass2(x, 120, sr);
    const rms = (a: Float32Array) =>
      Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
    expect(rms(y)).toBeLessThan(rms(x) * 0.5);
  });
});

describe('no dual duration constant conflict', () => {
  it('TIER_LIMITS defined for all tiers', () => {
    expect(TIER_LIMITS.low.maxDurationSec).toBeLessThan(TIER_LIMITS.high.maxDurationSec);
  });
});
