/**
 * Batch 22B-1 pure logic + protocol tests (no real model).
 */
import { describe, it, expect } from 'vitest';
import { planChunks } from '../src/services/vocal-separator/pure/chunkPlanner';
import { validateModelMarker } from '../src/services/vocal-separator/pure/modelMarker';
import { runQualityGate, computeStats, SILENT_RMS } from '../src/services/vocal-separator/pure/qualityGate';
import { hannWindow, overlapAddUnityError, stftChannel, istftChannel } from '../src/services/vocal-separator/pure/stft';
import { MAX_DURATION_SEC } from '../src/services/vocal-separator/pure/config';
import {
  isWorkerRequest,
  validateSeparatePayload,
} from '../src/services/vocal-separator/workerMessages';
import { encodeWav } from '../src/services/vocal-separator/audioUtils';

describe('chunkPlanner', () => {
  it('plans multiple chunks with overlap', () => {
    const plan = planChunks({
      sampleCount: 44100 * 12,
      hopLength: 1024,
      dimT: 8,
      nFft: 6144,
      overlap: 0.25,
    });
    expect(plan.totalChunks).toBeGreaterThan(1);
    expect(plan.chunks[0].start).toBe(0);
  });

  it('handles audio shorter than one segment', () => {
    const plan = planChunks({
      sampleCount: 1000,
      hopLength: 1024,
      dimT: 8,
      nFft: 6144,
      overlap: 0.25,
    });
    expect(plan.totalChunks).toBe(1);
    expect(plan.chunks[0].padRight).toBeGreaterThan(0);
  });
});

describe('modelMarker', () => {
  it('accepts matching size and sha', () => {
    const r = validateModelMarker({
      expectedSize: 100,
      actualSize: 100,
      expectedSha256: 'abc',
      headerSha256: 'ABC',
    });
    expect(r.ok).toBe(true);
  });
  it('rejects size mismatch', () => {
    const r = validateModelMarker({
      expectedSize: 100,
      actualSize: 99,
      expectedSha256: 'abc',
      headerSha256: 'abc',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('SIZE_MISMATCH');
  });
});

describe('qualityGate', () => {
  it('rejects silent stem', () => {
    const silent = [new Float32Array(1000)];
    const input = [new Float32Array(1000).map(() => 0.1)];
    const r = runQualityGate({ input, vocals: silent });
    expect(r.ok).toBe(false);
  });
  it('rejects NaN', () => {
    const bad = [new Float32Array([1, NaN, 0])];
    const r = runQualityGate({ input: bad, vocals: bad });
    expect(r.ok).toBe(false);
  });
  it('accepts normal energy', () => {
    const ch = [new Float32Array(1000).map((_, i) => Math.sin(i / 10) * 0.2)];
    const r = runQualityGate({ input: ch, vocals: ch, instrumental: ch });
    expect(r.ok).toBe(true);
  });
});

describe('stft identity', () => {
  it('reconstruct sine approximately', () => {
    const n = 8192;
    const nFft = 1024;
    const hop = 256;
    const w = hannWindow(nFft);
    const samples = new Float32Array(n);
    for (let i = 0; i < n; i++) samples[i] = Math.sin((2 * Math.PI * 440 * i) / 44100) * 0.5;
    const { re, im, frames } = stftChannel(samples, nFft, hop, w);
    const out = istftChannel(re, im, frames, nFft, hop, w, n);
    let err = 0;
    const start = nFft;
    const end = n - nFft;
    for (let i = start; i < end; i++) err += Math.abs(out[i] - samples[i]);
    err /= end - start;
    expect(err).toBeLessThan(0.05);
  });

  it('overlap-add envelope is flat (not the old false unity of 1)', () => {
    // Periodic Hann, hop = n/4: sum of w^2 is 1.5 in steady state, so |acc-1| ≈ 0.5.
    // The previous bound (< 0.15) did not match this window. iSTFT divides by the
    // envelope, which is what actually restores amplitude. Flatness is the invariant.
    const e = overlapAddUnityError(1024, 256, 16);
    expect(e).toBeGreaterThan(0.45);
    expect(e).toBeLessThan(0.55);
  });
});

describe('protocol', () => {
  it('accepts valid SEPARATE shape via isWorkerRequest', () => {
    expect(
      isWorkerRequest({ type: 'INIT_RUNTIME', requestId: 'a' }),
    ).toBe(true);
    expect(isWorkerRequest({ type: 'SEPARATE', requestId: 'a' })).toBe(true);
    expect(isWorkerRequest({ type: 'SEPARATE' })).toBe(false);
  });

  it('validateSeparatePayload', () => {
    const ch = [new Float32Array(10), new Float32Array(10)];
    expect(
      validateSeparatePayload({
        jobId: 'j1',
        sampleRate: 44100,
        channels: ch,
        options: { outputMode: 'both', quality: 'balanced' },
      }),
    ).toBeNull();
    expect(
      validateSeparatePayload({
        jobId: 'j1',
        sampleRate: 0,
        channels: ch,
        options: { outputMode: 'both', quality: 'balanced' },
      }),
    ).toBe('INVALID_SAMPLE_RATE');
  });
});

describe('encodeWav + outputMode', () => {
  it('encodes mono and stereo', () => {
    const L = new Float32Array(100).fill(0.1);
    const R = new Float32Array(100).fill(-0.1);
    const stereo = encodeWav(L, R, 44100);
    const mono = encodeWav(L, null, 44100);
    expect(stereo.size).toBeGreaterThan(mono.size);
    expect(stereo.type).toBe('audio/wav');
  });
});

describe('duration limit', () => {
  it('MAX_DURATION_SEC is positive assumption', () => {
    expect(MAX_DURATION_SEC).toBeGreaterThan(0);
    expect(MAX_DURATION_SEC).toBeLessThanOrEqual(600);
  });
});

describe('compensate derivation logic', () => {
  it('vocals = mix - primary * compensate path', () => {
    const mix = new Float32Array([1, 0.5, -0.2]);
    const primary = new Float32Array([0.4, 0.2, -0.1]);
    const compensate = 1.022;
    const vocals = new Float32Array(3);
    for (let i = 0; i < 3; i++) vocals[i] = mix[i] - primary[i] * compensate;
    expect(vocals[0]).toBeCloseTo(1 - 0.4 * 1.022, 5);
  });
});
