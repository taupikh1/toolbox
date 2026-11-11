/**
 * Mode hemat memori: model sumbu-waktu-bebas diproses per potongan kecil (iPhone).
 */
import { describe, it, expect } from 'vitest';
import { planChunks } from '../src/services/vocal-separator/pure/chunkPlanner';
import {
  getSegmentConfig,
  estimateProcessingTime,
  TIER_LIMITS,
} from '../src/services/vocal-separator/pure/deviceTier';
import { zeroLowBins } from '../src/services/vocal-separator/pure/mdxTensor';
import { validateSeparatePayload } from '../src/services/vocal-separator/workerMessages';
import { PRIMARY_MODEL } from '../src/services/vocal-separator/modelRegistry';

describe('planChunks dengan frames', () => {
  it('frames menggantikan 2^dimT', () => {
    const p = planChunks({ sampleCount: 44100 * 10, hopLength: 1024, dimT: 8, nFft: 6144, overlap: 0.5, frames: 64 });
    expect(p.segmentSamples).toBe(1024 * 63);
    expect(p.hopSamples).toBe(Math.floor(1024 * 63 * 0.5));
    expect(p.chunks[p.chunks.length - 1].end).toBe(44100 * 10);
  });
  it('tanpa frames tetap 256 (perilaku lama)', () => {
    const p = planChunks({ sampleCount: 44100 * 10, hopLength: 1024, dimT: 8, nFft: 6144, overlap: 0.25 });
    expect(p.segmentSamples).toBe(1024 * 255);
  });
});

describe('getSegmentConfig', () => {
  it('low memakai 64 frame dan overlap minimal 0.5', () => {
    const s = getSegmentConfig('low', 'economy');
    expect(s.frames).toBe(64);
    expect(s.overlap).toBe(0.5);
  });
  it('semua tier: kelipatan 32 dan overlap <= 0.5', () => {
    for (const t of ['low', 'mid', 'high'] as const) {
      for (const q of ['economy', 'balanced', 'good'] as const) {
        const s = getSegmentConfig(t, q);
        expect(s.frames % 32).toBe(0);
        expect(s.frames).toBeLessThanOrEqual(256);
        expect(s.overlap).toBeLessThanOrEqual(0.5);
        expect(s.overlap).toBeGreaterThanOrEqual(TIER_LIMITS[t].minOverlap);
      }
    }
  });
  it('estimasi waktu tier low lebih lama dari sebelum skala', () => {
    const e = estimateProcessingTime(10, 'low', 'balanced');
    expect(e.minSec).toBeGreaterThan(Math.round(10 * 12 * 0.7));
  });
});

describe('zeroLowBins', () => {
  it('menolkan 3 bin pertama tiap frame saja', () => {
    const frames = 4, dimF = 8;
    const a = new Float32Array(frames * dimF).fill(1);
    zeroLowBins(a, frames, dimF);
    for (let f = 0; f < frames; f++) {
      for (let b = 0; b < dimF; b++) expect(a[f * dimF + b]).toBe(b < 3 ? 0 : 1);
    }
  });
});

describe('validateSeparatePayload segmentFrames', () => {
  const base = (sf?: number) => ({
    jobId: 'j',
    sampleRate: 44100,
    channels: [new Float32Array(10)],
    options: { outputMode: 'both', quality: 'balanced', segmentFrames: sf },
  });
  it('menerima kelipatan 32 dalam 32..256 atau kosong', () => {
    expect(validateSeparatePayload(base(undefined))).toBeNull();
    expect(validateSeparatePayload(base(64))).toBeNull();
    expect(validateSeparatePayload(base(256))).toBeNull();
  });
  it('menolak nilai tidak valid', () => {
    expect(validateSeparatePayload(base(50))).toBe('INVALID_SEGMENT_FRAMES');
    expect(validateSeparatePayload(base(16))).toBe('INVALID_SEGMENT_FRAMES');
    expect(validateSeparatePayload(base(288))).toBe('INVALID_SEGMENT_FRAMES');
  });
});

describe('registry model baru', () => {
  it('ukuran dan SHA sesuai config.json sumber', () => {
    expect(PRIMARY_MODEL.sizeBytes).toBe(66_759_214);
    expect(PRIMARY_MODEL.sha256).toBe('03ceedd8ce972685ae4b4905befa31637f25a90542562ce7367dd3555493c748');
    expect(PRIMARY_MODEL.url).toContain('kamvox-voice-separator/resolve/main/inst-hq-3.onnx');
    expect(PRIMARY_MODEL.preprocessing.dimT).toBe(8);
  });
});
