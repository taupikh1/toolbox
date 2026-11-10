/**
 * Pure STFT / iSTFT for the UVR MDX path.
 * No ORT / DOM imports.
 *
 * Conventions matched to KUIELab MDX-Net / torch.stft (verified against
 * https://github.com/kuielab/mdx-net/blob/main/src/models/mdxnet.py
 * AbstractMDXNet.stft / istft):
 *   - periodic Hann window: 0.5 - 0.5*cos(2π i / n)
 *   - center=True, pad_mode='reflect' (torch default; not zero-pad)
 *   - unnormalized forward DFT, inverse scaled by 1/n
 *   - onesided model bins are dim_f (3072). Nyquist (n_fft/2) is freq_pad=0.
 *   - conjugate mirror is rebuilt on the way back; DC and Nyquist are not doubled
 *   - synthesis uses the same window; overlap-add divides by sum of window^2 (NOLA)
 *
 * FFT:
 *   - power-of-two lengths use in-place radix-2 (512, 1024, … still supported)
 *   - any other length, including 6144 = 3×2048, uses Bluestein's algorithm
 *     (chirp convolution via a power-of-two FFT). No zero-pad-to-8192 shortcut.
 */

const POW2_CACHE = new Map<number, { re: Float64Array; im: Float64Array }>();

interface BluesteinPlan {
  N: number;
  M: number;
  chirpRe: Float64Array;
  chirpIm: Float64Array;
  bRe: Float64Array;
  bIm: Float64Array;
  bufRe: Float64Array;
  bufIm: Float64Array;
}

const BLUESTEIN_CACHE = new Map<number, BluesteinPlan>();

function isPow2(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}

function pow2Scratch(n: number): { re: Float64Array; im: Float64Array } {
  let s = POW2_CACHE.get(n);
  if (!s) {
    s = { re: new Float64Array(n), im: new Float64Array(n) };
    POW2_CACHE.set(n, s);
  }
  return s;
}

/** In-place radix-2 DFT. Negative exponent (forward). Length must be 2^k. */
function fftRadix2(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nwRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nwRe;
      }
    }
  }
}

function ifftRadix2(re: Float64Array, im: Float64Array): void {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fftRadix2(re, im);
  const inv = 1 / re.length;
  for (let i = 0; i < re.length; i++) {
    re[i] *= inv;
    im[i] = -im[i] * inv;
  }
}

function getBluestein(N: number): BluesteinPlan {
  let plan = BLUESTEIN_CACHE.get(N);
  if (plan) return plan;
  let M = 1;
  while (M < 2 * N - 1) M <<= 1;
  const chirpRe = new Float64Array(N);
  const chirpIm = new Float64Array(N);
  const twoN = 2 * N;
  for (let n = 0; n < N; n++) {
    // angle = -π n² / N, reduced so the argument stays accurate in float64
    const n2 = (n * n) % twoN;
    const angle = (-Math.PI * n2) / N;
    chirpRe[n] = Math.cos(angle);
    chirpIm[n] = Math.sin(angle);
  }
  const bRe = new Float64Array(M);
  const bIm = new Float64Array(M);
  bRe[0] = chirpRe[0];
  bIm[0] = -chirpIm[0];
  for (let n = 1; n < N; n++) {
    bRe[n] = chirpRe[n];
    bIm[n] = -chirpIm[n];
    bRe[M - n] = bRe[n];
    bIm[M - n] = bIm[n];
  }
  fftRadix2(bRe, bIm);
  plan = {
    N,
    M,
    chirpRe,
    chirpIm,
    bRe,
    bIm,
    bufRe: new Float64Array(M),
    bufIm: new Float64Array(M),
  };
  BLUESTEIN_CACHE.set(N, plan);
  return plan;
}

function fftBluestein(re: Float32Array, im: Float32Array): void {
  const N = re.length;
  const plan = getBluestein(N);
  const { M, chirpRe, chirpIm, bRe, bIm, bufRe, bufIm } = plan;
  bufRe.fill(0);
  bufIm.fill(0);
  for (let n = 0; n < N; n++) {
    const xr = re[n];
    const xi = im[n];
    bufRe[n] = xr * chirpRe[n] - xi * chirpIm[n];
    bufIm[n] = xr * chirpIm[n] + xi * chirpRe[n];
  }
  fftRadix2(bufRe, bufIm);
  for (let i = 0; i < M; i++) {
    const ar = bufRe[i];
    const ai = bufIm[i];
    const br = bRe[i];
    const bi = bIm[i];
    bufRe[i] = ar * br - ai * bi;
    bufIm[i] = ar * bi + ai * br;
  }
  ifftRadix2(bufRe, bufIm);
  for (let k = 0; k < N; k++) {
    const cr = bufRe[k];
    const ci = bufIm[k];
    re[k] = cr * chirpRe[k] - ci * chirpIm[k];
    im[k] = cr * chirpIm[k] + ci * chirpRe[k];
  }
}

function fftPow2(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  const scratch = pow2Scratch(n);
  const dr = scratch.re;
  const di = scratch.im;
  for (let i = 0; i < n; i++) {
    dr[i] = re[i];
    di[i] = im[i];
  }
  fftRadix2(dr, di);
  for (let i = 0; i < n; i++) {
    re[i] = dr[i];
    im[i] = di[i];
  }
}

/** Periodic Hann. Matches torch.hann_window(n, periodic=True). */
export function hannWindow(length: number): Float32Array {
  const w = new Float32Array(length);
  if (length <= 1) {
    if (length === 1) w[0] = 1;
    return w;
  }
  for (let i = 0; i < length; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / length);
  }
  return w;
}

/**
 * In-place forward DFT.
 * Power-of-two: radix-2. Otherwise Bluestein (exact length, including 6144).
 */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length) throw new Error(`FFT length mismatch ${n} vs ${im.length}`);
  if (n <= 1) return;
  if (isPow2(n)) fftPow2(re, im);
  else fftBluestein(re, im);
}

export function ifft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n !== im.length) throw new Error(`IFFT length mismatch ${n} vs ${im.length}`);
  if (n <= 1) return;
  for (let i = 0; i < n; i++) im[i] = -im[i];
  fft(re, im);
  const inv = 1 / n;
  for (let i = 0; i < n; i++) {
    re[i] *= inv;
    im[i] = -im[i] * inv;
  }
}

/** Reflect index, torch/numpy 'reflect' (edge sample is not repeated). */
export function reflectIndex(index: number, length: number): number {
  if (length <= 1) return 0;
  const period = 2 * (length - 1);
  let m = index % period;
  if (m < 0) m += period;
  if (m >= length) m = period - m;
  return m;
}

function sampleAt(samples: Float32Array, index: number): number {
  const n = samples.length;
  if (n === 0) return 0;
  if (index >= 0 && index < n) return samples[index];
  return samples[reflectIndex(index, n)];
}

/**
 * STFT of one channel. Spectrum is the full unnormalized DFT (length nFft),
 * frame-major: index = frame * nFft + bin.
 * Center padding is reflect, matching torch.stft(..., center=True).
 */
export function stftChannel(
  samples: Float32Array,
  nFft: number,
  hopLength: number,
  window: Float32Array,
): { re: Float32Array; im: Float32Array; frames: number } {
  if (window.length !== nFft) {
    throw new Error(`STFT window length ${window.length} != nFft ${nFft}`);
  }
  if (hopLength < 1 || nFft < 1) throw new Error('invalid STFT size');
  const pad = Math.floor(nFft / 2);
  const paddedLen = samples.length + 2 * pad;
  const frames = Math.max(1, Math.floor((paddedLen - nFft) / hopLength) + 1);
  const re = new Float32Array(frames * nFft);
  const im = new Float32Array(frames * nFft);
  const reFrame = new Float32Array(nFft);
  const imFrame = new Float32Array(nFft);

  for (let f = 0; f < frames; f++) {
    const start = f * hopLength;
    for (let i = 0; i < nFft; i++) {
      reFrame[i] = sampleAt(samples, start + i - pad) * window[i];
      imFrame[i] = 0;
    }
    fft(reFrame, imFrame);
    re.set(reFrame, f * nFft);
    im.set(imFrame, f * nFft);
  }
  return { re, im, frames };
}

/**
 * iSTFT. `re`/`im` are full spectra (nFft bins per frame), same layout as stftChannel.
 * Applies the synthesis window per frame at the local frame index, overlap-adds at
 * hop offsets, then divides by the accumulated window^2. Trims center padding.
 */
export function istftChannel(
  re: Float32Array,
  im: Float32Array,
  frames: number,
  nFft: number,
  hopLength: number,
  window: Float32Array,
  outLength: number,
): Float32Array {
  if (window.length !== nFft) {
    throw new Error(`iSTFT window length ${window.length} != nFft ${nFft}`);
  }
  const pad = Math.floor(nFft / 2);
  const timeline = Math.max(outLength + 2 * pad, frames > 0 ? (frames - 1) * hopLength + nFft : 0);
  const out = new Float32Array(timeline);
  const norm = new Float32Array(timeline);
  const reFrame = new Float32Array(nFft);
  const imFrame = new Float32Array(nFft);

  for (let f = 0; f < frames; f++) {
    const off = f * nFft;
    for (let i = 0; i < nFft; i++) {
      reFrame[i] = re[off + i] ?? 0;
      imFrame[i] = im[off + i] ?? 0;
    }
    ifft(reFrame, imFrame);
    const start = f * hopLength;
    for (let i = 0; i < nFft; i++) {
      const wi = window[i];
      out[start + i] += reFrame[i] * wi;
      norm[start + i] += wi * wi;
    }
  }
  for (let i = 0; i < timeline; i++) {
    if (norm[i] > 1e-8) out[i] /= norm[i];
  }
  const y = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) y[i] = out[pad + i] ?? 0;
  return y;
}

/**
 * Keep the first `dimF` bins of each full frame (MDX one-sided slice).
 * Layout becomes frame-major with stride dimF, not nFft.
 */
export function sliceOneSided(
  full: Float32Array,
  frames: number,
  nFft: number,
  dimF: number,
): Float32Array {
  const bins = Math.max(0, dimF);
  const out = new Float32Array(frames * bins);
  const copy = Math.min(bins, nFft);
  for (let f = 0; f < frames; f++) {
    const src = f * nFft;
    const dst = f * bins;
    for (let b = 0; b < copy; b++) out[dst + b] = full[src + b];
  }
  return out;
}

/**
 * Rebuild a full real-FFT spectrum from one-sided MDX bins.
 * - DC (bin 0) is copied once.
 * - Positive bins 1..nyquist-1 that were kept are mirrored as conjugates.
 * - Nyquist (bin nFft/2) is written only if the slice actually contains it
 *   (dimF >= nFft/2+1). UVR dim_f = n_fft/2 drops it and leaves freq_pad = 0.
 * - DC and Nyquist are never duplicated into a second bin.
 */
export function expandConjugateMirror(
  oneRe: Float32Array,
  oneIm: Float32Array,
  frames: number,
  nFft: number,
  dimF: number,
): { re: Float32Array; im: Float32Array } {
  const re = new Float32Array(frames * nFft);
  const im = new Float32Array(frames * nFft);
  const nyquist = nFft >> 1;
  const nBins = nyquist + 1;
  const copy = Math.min(Math.max(0, dimF), nBins);
  for (let f = 0; f < frames; f++) {
    const src = f * dimF;
    const dst = f * nFft;
    for (let b = 0; b < copy; b++) {
      const rv = oneRe[src + b] ?? 0;
      const iv = oneIm[src + b] ?? 0;
      re[dst + b] = rv;
      im[dst + b] = iv;
      if (b > 0 && b < nyquist) {
        re[dst + (nFft - b)] = rv;
        im[dst + (nFft - b)] = -iv;
      }
    }
  }
  return { re, im };
}

/**
 * Identity path used by tests: STFT → drop negative frequencies and Nyquist
 * the way MDX does (keep dimF bins) → restore conjugate symmetry → iSTFT.
 * This is a DSP bypass. It is not a vocal-separation result.
 */
export function reconstructIdentity(
  samples: Float32Array,
  nFft: number,
  hopLength: number,
  dimF: number,
): Float32Array {
  const window = hannWindow(nFft);
  const spec = stftChannel(samples, nFft, hopLength, window);
  const oneRe = sliceOneSided(spec.re, spec.frames, nFft, dimF);
  const oneIm = sliceOneSided(spec.im, spec.frames, nFft, dimF);
  const full = expandConjugateMirror(oneRe, oneIm, spec.frames, nFft, dimF);
  return istftChannel(full.re, full.im, spec.frames, nFft, hopLength, window, samples.length);
}

/** Sum of squared Hann windows along the STFT timeline (no center trim). */
export function windowNormEnvelope(
  nFft: number,
  hopLength: number,
  frames: number,
): Float32Array {
  const w = hannWindow(nFft);
  const len = frames > 0 ? (frames - 1) * hopLength + nFft : 0;
  const acc = new Float32Array(len);
  for (let f = 0; f < frames; f++) {
    const start = f * hopLength;
    for (let i = 0; i < nFft; i++) acc[start + i] += w[i] * w[i];
  }
  return acc;
}

/**
 * |sum(w^2) - 1| at the middle of the timeline.
 * Periodic Hann at hop = nFft/4 has a flat envelope of 1.5, so this returns ~0.5.
 * That is not a reconstruction error: iSTFT divides by the envelope.
 * Use windowNormEnvelope to check flatness / NOLA directly.
 */
export function overlapAddUnityError(
  nFft: number,
  hopLength: number,
  frames: number,
): number {
  const acc = windowNormEnvelope(nFft, hopLength, frames);
  if (acc.length === 0) return 1;
  const mid = Math.floor(acc.length / 2);
  return Math.abs(acc[mid] - 1);
}
