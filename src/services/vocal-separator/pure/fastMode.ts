/**
 * Fast Mode (no AI) — center-channel cancellation + optional bass keep.
 * Pure DSP for Worker / Node tests. INITIAL ASSUMPTION: bassCutoffHz ≈ 120.
 */

export interface FastModeOptions {
  strength: number; // 0..1
  keepBass: boolean;
  bassCutoffHz?: number;
  sampleRate: number;
}

export interface FastModeResult {
  left: Float32Array;
  right: Float32Array;
  nearMono: boolean;
  warning?: string;
}

/** Biquad low-pass coefficients (RBJ cookbook), Q ≈ 0.707 */
export function lowpassCoeffs(
  cutoffHz: number,
  sampleRate: number,
  Q = 0.707,
): { b0: number; b1: number; b2: number; a1: number; a2: number } {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Q);
  const b0 = (1 - cos) / 2;
  const b1 = 1 - cos;
  const b2 = (1 - cos) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

export function applyBiquad(
  input: Float32Array,
  c: { b0: number; b1: number; b2: number; a1: number; a2: number },
): Float32Array {
  const out = new Float32Array(input.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x0 = input[i];
    const y0 =
      c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }
  return out;
}

/** Two cascaded low-pass stages */
export function lowpass2(
  input: Float32Array,
  cutoffHz: number,
  sampleRate: number,
): Float32Array {
  const c = lowpassCoeffs(cutoffHz, sampleRate);
  return applyBiquad(applyBiquad(input, c), c);
}

export function detectNearMono(
  left: Float32Array,
  right: Float32Array,
  threshold = 0.02,
): boolean {
  const n = Math.min(left.length, right.length);
  let sumDiff = 0;
  let sumSum = 0;
  const step = Math.max(1, Math.floor(n / 20000));
  for (let i = 0; i < n; i += step) {
    const d = left[i] - right[i];
    const s = left[i] + right[i];
    sumDiff += d * d;
    sumSum += s * s;
  }
  if (sumSum < 1e-12) return true;
  return Math.sqrt(sumDiff / sumSum) < threshold;
}

export function normalizePeak(
  left: Float32Array,
  right: Float32Array,
  peakLimit = 0.99,
): void {
  let peak = 0;
  for (let i = 0; i < left.length; i++) {
    const a = Math.abs(left[i]);
    const b = Math.abs(right[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
  }
  if (peak <= peakLimit || peak < 1e-12) return;
  const g = peakLimit / peak;
  for (let i = 0; i < left.length; i++) {
    left[i] *= g;
    right[i] *= g;
  }
}

export function runFastMode(
  leftIn: Float32Array,
  rightIn: Float32Array,
  opts: FastModeOptions,
): FastModeResult {
  const n = Math.min(leftIn.length, rightIn.length);
  const s = Math.max(0, Math.min(1, opts.strength));
  const cutoff = opts.bassCutoffHz ?? 120;
  const nearMono = detectNearMono(leftIn, rightIn);

  const left = new Float32Array(n);
  const right = new Float32Array(n);

  if (s === 0) {
    left.set(leftIn.subarray(0, n));
    right.set(rightIn.subarray(0, n));
    return {
      left,
      right,
      nearMono,
      warning: nearMono
        ? 'File hampir mono — Fast Mode kemungkinan tidak efektif'
        : undefined,
    };
  }

  const mid = new Float32Array(n);
  const side = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    mid[i] = (leftIn[i] + rightIn[i]) * 0.5;
    side[i] = (leftIn[i] - rightIn[i]) * 0.5;
  }

  let bass = mid;
  if (opts.keepBass) {
    bass = lowpass2(mid, cutoff, opts.sampleRate);
  }

  for (let i = 0; i < n; i++) {
    const effectL = side[i] + (opts.keepBass ? bass[i] * 0.5 : 0);
    const effectR = -side[i] + (opts.keepBass ? bass[i] * 0.5 : 0);
    left[i] = (1 - s) * leftIn[i] + s * effectL;
    right[i] = (1 - s) * rightIn[i] + s * effectR;
  }

  normalizePeak(left, right);

  return {
    left,
    right,
    nearMono,
    warning: nearMono
      ? 'File hampir mono — Fast Mode kemungkinan tidak efektif'
      : undefined,
  };
}
