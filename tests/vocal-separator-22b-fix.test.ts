/**
 * Batch 22B-FIX — numeric FFT / STFT / overlap-add.
 * These tests do not run the ONNX model and are not evidence of vocal separation.
 */
import { describe, it, expect } from 'vitest';
import {
  fft,
  ifft,
  hannWindow,
  stftChannel,
  istftChannel,
  reconstructIdentity,
  windowNormEnvelope,
  sliceOneSided,
  expandConjugateMirror,
} from '../src/services/vocal-separator/pure/stft';
import {
  planChunks,
  chunkCrossfadeWeight,
  chunkOverlapSamples,
  accumulateChunk,
  normalizeOverlap,
} from '../src/services/vocal-separator/pure/chunkPlanner';
import {
  resolveTensorName,
  dimsCompatible,
  readMdxOutput,
  packMdxInput,
} from '../src/services/vocal-separator/pure/mdxTensor';

function maxAbs(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let m = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function naiveDftBin(x: Float64Array, k: number): { re: number; im: number } {
  const n = x.length;
  let sr = 0;
  let si = 0;
  for (let t = 0; t < n; t++) {
    const ang = (-2 * Math.PI * k * t) / n;
    sr += x[t] * Math.cos(ang);
    si += x[t] * Math.sin(ang);
  }
  return { re: sr, im: si };
}

function naiveDft(x: Float64Array): { re: Float64Array; im: Float64Array } {
  const n = x.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const b = naiveDftBin(x, k);
    re[k] = b.re;
    im[k] = b.im;
  }
  return { re, im };
}

function mulberry(seed: number, n: number, scale = 1): Float32Array {
  const y = new Float32Array(n);
  let s = seed >>> 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    y[i] = ((s / 4294967296) * 2 - 1) * scale;
  }
  return y;
}

function tone(n: number, freq: number, amp: number, sr = 44100): Float32Array {
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  return y;
}

function metrics(ref: Float32Array, got: Float32Array) {
  const n = Math.min(ref.length, got.length);
  let max = 0;
  let e2 = 0;
  let s2 = 0;
  let g2 = 0;
  let nan = 0;
  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(got[i]) || !Number.isFinite(ref[i])) nan++;
    const e = got[i] - ref[i];
    max = Math.max(max, Math.abs(e));
    e2 += e * e;
    s2 += ref[i] * ref[i];
    g2 += got[i] * got[i];
  }
  const rmsRef = Math.sqrt(s2 / n);
  const rmsGot = Math.sqrt(g2 / n);
  const snr = e2 === 0 ? Infinity : 10 * Math.log10(s2 / e2);
  return { n, max, mse: e2 / n, rmsRef, rmsGot, rmsRatio: rmsGot / (rmsRef || 1), snr, nan };
}

function bestLag(ref: Float32Array, got: Float32Array): number {
  let best = 0;
  let bestE = Infinity;
  for (let lag = -2; lag <= 2; lag++) {
    let e = 0;
    for (let i = 2; i < ref.length - 2; i++) {
      const j = i + lag;
      if (j < 0 || j >= got.length) continue;
      e += Math.abs(ref[i] - got[j]);
    }
    if (e < bestE) {
      bestE = e;
      best = lag;
    }
  }
  return best;
}

function expectReconstruction(ref: Float32Array, got: Float32Array, snrMin: number, maxAbsLimit: number) {
  const m = metrics(ref, got);
  expect(m.nan).toBe(0);
  expect(m.n).toBe(ref.length);
  expect(m.max).toBeLessThan(maxAbsLimit);
  expect(m.snr).toBeGreaterThan(snrMin);
  expect(m.rmsRatio).toBeGreaterThan(0.99);
  expect(m.rmsRatio).toBeLessThan(1.01);
  expect(bestLag(ref, got)).toBe(0);
  return m;
}

describe('FFT numeric', () => {
  it('round-trips powers of two used by older modules (512, 1024)', () => {
    for (const n of [512, 1024]) {
      const re = mulberry(7 + n, n);
      const im = new Float32Array(n);
      const orig = Float32Array.from(re);
      fft(re, im);
      ifft(re, im);
      expect(maxAbs(re, orig)).toBeLessThan(1e-5);
      expect(maxAbs(im, new Float32Array(n))).toBeLessThan(1e-5);
    }
  });

  it('matches a direct DFT for every bin at n=96 (non power of two)', () => {
    const n = 96;
    const x = Float64Array.from(mulberry(3, n));
    const re = Float32Array.from(x);
    const im = new Float32Array(n);
    fft(re, im);
    const ref = naiveDft(x);
    expect(maxAbs(re, ref.re)).toBeLessThan(1e-4);
    expect(maxAbs(im, ref.im)).toBeLessThan(1e-4);
  });

  it('FFT 6144 matches closed forms and an independent DFT on spread bins', () => {
    const n = 6144;

    const imp = new Float32Array(n);
    const im0 = new Float32Array(n);
    imp[0] = 1;
    fft(imp, im0);
    let impErr = 0;
    for (let k = 0; k < n; k++) impErr = Math.max(impErr, Math.abs(imp[k] - 1), Math.abs(im0[k]));
    expect(impErr).toBeLessThan(1e-5);

    const dc = new Float32Array(n).fill(1);
    const dci = new Float32Array(n);
    fft(dc, dci);
    expect(dc[0]).toBeCloseTo(n, 2);
    expect(Math.abs(dci[0])).toBeLessThan(1e-2);
    expect(Math.abs(dc[1])).toBeLessThan(1e-2);
    expect(Math.abs(dc[n / 2])).toBeLessThan(1e-2);

    const ny = new Float32Array(n);
    for (let i = 0; i < n; i++) ny[i] = i % 2 === 0 ? 1 : -1;
    const nyi = new Float32Array(n);
    fft(ny, nyi);
    expect(ny[n / 2]).toBeCloseTo(n, 2);
    expect(Math.abs(nyi[n / 2])).toBeLessThan(1e-2);
    expect(Math.abs(ny[0])).toBeLessThan(1e-2);

    const k0 = 5;
    const toneRe = new Float32Array(n);
    for (let i = 0; i < n; i++) toneRe[i] = Math.cos((2 * Math.PI * k0 * i) / n);
    const toneIm = new Float32Array(n);
    fft(toneRe, toneIm);
    expect(toneRe[k0]).toBeCloseTo(n / 2, 1);
    expect(toneRe[n - k0]).toBeCloseTo(n / 2, 1);
    expect(Math.abs(toneIm[k0])).toBeLessThan(1e-2);
    expect(Math.abs(toneRe[k0 + 3])).toBeLessThan(1e-2);

    const x = Float64Array.from(mulberry(99, n));
    const re = Float32Array.from(x);
    const im = new Float32Array(n);
    fft(re, im);
    const bins = [0, 1, 2, 17, 100, 1024, 2048, 3071, 3072, 3073, 4000, 5000, 6143];
    let binErr = 0;
    for (const k of bins) {
      const b = naiveDftBin(x, k);
      binErr = Math.max(binErr, Math.abs(re[k] - b.re), Math.abs(im[k] - b.im));
    }
    expect(binErr).toBeLessThan(5e-4);

    // conjugate symmetry of a real input
    let sym = 0;
    for (let k = 1; k < n / 2; k += 64) {
      sym = Math.max(sym, Math.abs(re[k] - re[n - k]), Math.abs(im[k] + im[n - k]));
    }
    expect(sym).toBeLessThan(5e-4);
    expect(Math.abs(im[0])).toBeLessThan(5e-4);
    expect(Math.abs(im[n / 2])).toBeLessThan(5e-4);

    const orig = Float32Array.from(x);
    ifft(re, im);
    expect(maxAbs(re, orig)).toBeLessThan(1e-4);
    expect(maxAbs(im, new Float32Array(n))).toBeLessThan(1e-4);
  });
});

describe('STFT / iSTFT round trip', () => {
  const cases: Array<{ name: string; x: Float32Array; snr: number; max: number }> = [
    { name: 'impulse', x: (() => { const a = new Float32Array(4096); a[100] = 0.8; return a; })(), snr: 80, max: 1e-3 },
    { name: 'sine', x: tone(12000, 440, 0.5), snr: 80, max: 1e-3 },
    { name: 'two tones', x: (() => {
      const a = tone(16000, 220, 0.3);
      const b = tone(16000, 3000, 0.2);
      for (let i = 0; i < a.length; i++) a[i] += b[i];
      return a;
    })(), snr: 80, max: 1e-3 },
    { name: 'noise', x: mulberry(11, 9000, 0.7), snr: 70, max: 2e-3 },
    { name: 'low amp', x: tone(8000, 880, 1e-4), snr: 70, max: 1e-7 },
    { name: 'high amp', x: tone(8000, 100, 0.95), snr: 80, max: 1e-3 },
    { name: 'shorter than frame', x: tone(100, 440, 0.4), snr: 60, max: 5e-3 },
    { name: 'exact one fft frame', x: tone(1024, 440, 0.4), snr: 80, max: 1e-3 },
    { name: 'not a hop multiple', x: tone(12345, 440, 0.35), snr: 80, max: 1e-3 },
    { name: 'hundreds of frames', x: tone(400 * 256, 440, 0.4), snr: 80, max: 1e-3 },
  ];

  for (const c of cases) {
    it(`full spectrum ${c.name}`, () => {
      const nFft = 1024;
      const hop = 256;
      const w = hannWindow(nFft);
      const spec = stftChannel(c.x, nFft, hop, w);
      const y = istftChannel(spec.re, spec.im, spec.frames, nFft, hop, w, c.x.length);
      const m = expectReconstruction(c.x, y, c.snr, c.max);
      const third = Math.floor(c.x.length / 3);
      if (third > 32) {
        for (const start of [0, third, c.x.length - third]) {
          let local = 0;
          for (let i = start; i < start + third; i++) local = Math.max(local, Math.abs(y[i] - c.x[i]));
          expect(local).toBeLessThan(c.max);
        }
      }
      expect(m.rmsRatio).toBeGreaterThan(0.99);
    });
  }

  it('MDX sizes 6144/1024 full spectrum keeps amplitude', () => {
    const x = tone(204800, 440, 0.45);
    const w = hannWindow(6144);
    const spec = stftChannel(x, 6144, 1024, w);
    expect(spec.frames).toBeGreaterThan(100);
    const y = istftChannel(spec.re, spec.im, spec.frames, 6144, 1024, w, x.length);
    expectReconstruction(x, y, 80, 1e-3);
  });
});

describe('MDX one-sided identity bypass', () => {
  it('restores conjugate mirror without doubling DC or Nyquist', () => {
    const frames = 2;
    const nFft = 8;
    const dimF = 4; // drops Nyquist bin 4
    const oneRe = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const oneIm = new Float32Array([0, 0.2, -0.3, 0.4, 0, -0.5, 0.6, -0.7]);
    const full = expandConjugateMirror(oneRe, oneIm, frames, nFft, dimF);
    // frame 0
    expect(full.re[0]).toBe(1);
    expect(full.im[0]).toBe(0);
    expect(full.re[1]).toBe(2);
    expect(full.im[1]).toBeCloseTo(0.2);
    expect(full.re[7]).toBe(2);
    expect(full.im[7]).toBeCloseTo(-0.2);
    expect(full.re[4]).toBe(0); // Nyquist padded, not copied
    expect(full.im[4]).toBe(0);
    // bin 4 of the one-sided slice must NOT have been written as a second DC
    expect(full.re[0]).toBe(1);
  });

  it('identity bypass at MDX 6144/1024/3072 keeps amplitude and alignment', () => {
    const signals = [
      tone(8000, 440, 0.5),
      tone(100, 440, 0.4),
      tone(6144, 1000, 0.3),
      tone(200 * 1024, 220, 0.25),
      mulberry(5, 12345, 0.6),
      tone(9000, 440, 1e-4),
      tone(9000, 80, 0.9),
    ];
    for (const x of signals) {
      const y = reconstructIdentity(x, 6144, 1024, 3072);
      const tonal = x !== signals[4];
      expectReconstruction(x, y, tonal ? 60 : 40, tonal ? 1e-3 : 0.02);
      // no near-silent hole where the source is loud
      let holes = 0;
      const win = 256;
      for (let i = 0; i + win < x.length; i += win) {
        let sr = 0;
        let sg = 0;
        for (let k = 0; k < win; k++) {
          sr += x[i + k] * x[i + k];
          sg += y[i + k] * y[i + k];
        }
        if (sr / win > 1e-4 && sg / win < (sr / win) * 0.25) holes++;
      }
      expect(holes).toBe(0);
    }
  });

  it('slice + expand is a no-op on bins below Nyquist for a real spectrum', () => {
    const x = tone(8192, 440, 0.4);
    const nFft = 6144;
    const hop = 1024;
    const w = hannWindow(nFft);
    const spec = stftChannel(x, nFft, hop, w);
    const oneRe = sliceOneSided(spec.re, spec.frames, nFft, 3072);
    const oneIm = sliceOneSided(spec.im, spec.frames, nFft, 3072);
    const full = expandConjugateMirror(oneRe, oneIm, spec.frames, nFft, 3072);
    // positive bins match; Nyquist may be zeroed
    let err = 0;
    for (let f = 0; f < spec.frames; f++) {
      for (let b = 0; b < 3072; b++) {
        err = Math.max(
          err,
          Math.abs(full.re[f * nFft + b] - spec.re[f * nFft + b]),
          Math.abs(full.im[f * nFft + b] - spec.im[f * nFft + b]),
        );
      }
    }
    expect(err).toBeLessThan(1e-6);
  });
});

describe('overlap-add', () => {
  it('NOLA envelope is positive and flat for MDX hop', () => {
    const env = windowNormEnvelope(6144, 1024, 40);
    let min = Infinity;
    let max = 0;
    for (let i = 6144; i < env.length - 6144; i++) {
      min = Math.min(min, env[i]);
      max = Math.max(max, env[i]);
    }
    expect(min).toBeGreaterThan(1);
    expect(max - min).toBeLessThan(1e-3);
  });

  it('legacy window[min(i, nFft-1)] kills a long chunk; local crossfade does not', () => {
    const nFft = 6144;
    const w = hannWindow(nFft);
    const copyLen = 50000;
    let legacy = 0;
    let next = 0;
    for (let i = 0; i < copyLen; i++) {
      const wi = w[Math.min(i, nFft - 1)] ?? 1;
      legacy += wi * wi;
      next += chunkCrossfadeWeight(i, copyLen, 1000, false, false);
    }
    expect(legacy).toBeLessThan(nFft);
    expect(next).toBeCloseTo(copyLen, 0);
  });

  it('adjacent chunk weights sum to 1', () => {
    const segment = 1000;
    const hop = 750;
    const ov = segment - hop;
    let worst = 0;
    for (let j = 0; j < ov; j++) {
      const a = chunkCrossfadeWeight(segment - ov + j, segment, ov, false, true);
      const b = chunkCrossfadeWeight(j, segment, ov, true, false);
      worst = Math.max(worst, Math.abs(a + b - 1));
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('chunk mixer has no holes or level jumps on short, exact, and long audio', () => {
    const lengths = [100, 1000, 261120, 261120 + 12345, 800000];
    for (const n of lengths) {
      const plan = planChunks({
        sampleCount: n,
        hopLength: 1024,
        dimT: 8,
        nFft: 6144,
        overlap: 0.25,
      });
      const x = mulberry(n, n, 0.5);
      const out = new Float32Array(n);
      const weight = new Float32Array(n);
      const ov = chunkOverlapSamples(plan.segmentSamples, plan.hopSamples);
      for (const spec of plan.chunks) {
        const copy = spec.end - spec.start;
        const seg = x.subarray(spec.start, spec.end);
        accumulateChunk(out, weight, seg, spec.start, copy, ov, spec.start > 0, spec.end < n);
      }
      const holes = normalizeOverlap(out, weight);
      expect(holes).toBe(0);
      expect(maxAbs(out, x)).toBeLessThan(1e-5);
      // start / middle / end
      for (const i of [0, Math.floor(n / 2), n - 1]) {
        expect(Math.abs(out[i] - x[i])).toBeLessThan(1e-5);
      }
    }
  });
});

describe('MDX tensor metadata guards', () => {
  it('does not take the first name when several exist', () => {
    const bad = resolveTensorName(['spec', 'other'], ['input']);
    expect(bad.ok).toBe(false);
    const good = resolveTensorName(['other', 'input'], ['input']);
    expect(good.ok && good.name).toBe('input');
    const sole = resolveTensorName(['spec'], ['input']);
    expect(sole.ok && sole.name).toBe('spec');
  });

  it('rejects a fixed dim that does not match dimF', () => {
    expect(dimsCompatible([1, 4, 2048, 256], [1, 4, 3072, 256])).toMatch(/dim\[2\]/);
    expect(dimsCompatible([1, 4, 'dim_f', 256], [1, 4, 3072, 256])).toBeNull();
    expect(dimsCompatible(undefined, [1, 4, 3072, 256])).toBeNull();
  });

  it('refuses a wrong output rank before indexing', () => {
    const data = new Float32Array(4 * 4 * 2);
    const bad = readMdxOutput(data, [1, 2, 4, 2], 4, 2);
    expect(bad.ok).toBe(false);
    const ok = readMdxOutput(data, [1, 4, 4, 2], 4, 2);
    expect(ok.ok).toBe(true);
  });

  it('pack/read keeps channel order Lr Li Rr Ri', () => {
    const frames = 3;
    const dimF = 2;
    const lRe = Float32Array.from([1, 2, 3, 4, 5, 6]);
    const lIm = Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
    const rRe = lRe.map((v) => -v);
    const rIm = lIm.map((v) => -v);
    const packed = packMdxInput(lRe, lIm, rRe, rIm, frames, dimF);
    expect(packed.length).toBe(1 * 4 * dimF * frames);
    const back = readMdxOutput(packed, [1, 4, dimF, frames], dimF, frames);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(maxAbs(back.channels.lRe, lRe)).toBe(0);
      expect(maxAbs(back.channels.rIm, rIm)).toBe(0);
    }
  });
});
