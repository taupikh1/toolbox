/**
 * Full quality gate for separation stems (22B-2).
 * Pure — no ORT / DOM.
 *
 * Note: vocals = mix − instrumental ⇒ vocals + instrumental ≈ input is a tautology;
 * it is only used as a logic unit-test identity, not as quality evidence.
 */

export interface StemStats {
  rms: number;
  peak: number;
  hasNaN: boolean;
  hasInf: boolean;
  clipPercent: number;
}

export interface QualityGateResult {
  ok: boolean;
  warnings: string[];
  errors: string[];
  stats: {
    input?: StemStats;
    vocals?: StemStats;
    instrumental?: StemStats;
  };
  /** Correlation instrumental vs input (0..1); high ⇒ little separation */
  instrumentalCorrelation?: number;
}

/** INITIAL ASSUMPTION thresholds — re-tune after device data */
export const SILENT_RMS = 1e-6;
export const NOT_SEPARATED_DB = -40;
export const TOO_AGGRESSIVE_DB = -40;
export const HIGH_CORRELATION = 0.98;
export const CLIP_WARN_PERCENT = 1;

export function computeStats(channels: Float32Array[]): StemStats {
  let sumSq = 0;
  let peak = 0;
  let n = 0;
  let clips = 0;
  let hasNaN = false;
  let hasInf = false;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      if (Number.isNaN(v)) hasNaN = true;
      else if (!Number.isFinite(v)) hasInf = true;
      else {
        const a = Math.abs(v);
        if (a > peak) peak = a;
        if (a >= 0.999) clips++;
        sumSq += v * v;
        n++;
      }
    }
  }
  const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
  const clipPercent = n > 0 ? (clips / n) * 100 : 0;
  return { rms, peak, hasNaN, hasInf, clipPercent };
}

function dbRatio(num: number, den: number): number {
  if (den <= 0 || num <= 0) return -Infinity;
  return 20 * Math.log10(num / den);
}

/** Pearson correlation on first channel, downsampled for speed */
export function correlation(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const step = Math.max(1, Math.floor(n / 20000));
  let count = 0;
  let sumA = 0;
  let sumB = 0;
  let sumAA = 0;
  let sumBB = 0;
  let sumAB = 0;
  for (let i = 0; i < n; i += step) {
    const x = a[i];
    const y = b[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    sumA += x;
    sumB += y;
    sumAA += x * x;
    sumBB += y * y;
    sumAB += x * y;
    count++;
  }
  if (count < 2) return 0;
  const meanA = sumA / count;
  const meanB = sumB / count;
  const cov = sumAB / count - meanA * meanB;
  const varA = sumAA / count - meanA * meanA;
  const varB = sumBB / count - meanB * meanB;
  const denom = Math.sqrt(Math.max(0, varA) * Math.max(0, varB));
  if (denom < 1e-12) return 0;
  return cov / denom;
}

export function runQualityGate(opts: {
  input: Float32Array[];
  vocals?: Float32Array[];
  instrumental?: Float32Array[];
}): QualityGateResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const stats: QualityGateResult['stats'] = {};

  stats.input = computeStats(opts.input);
  if (stats.input.hasNaN || stats.input.hasInf) {
    errors.push('Input mengandung NaN/Inf');
  }

  if (opts.vocals) {
    stats.vocals = computeStats(opts.vocals);
    if (stats.vocals.hasNaN || stats.vocals.hasInf) {
      errors.push('Stem vokal mengandung NaN/Inf');
    } else if (stats.vocals.rms < SILENT_RMS) {
      errors.push('Stem vokal sunyi (silent)');
    } else if (
      stats.input &&
      dbRatio(stats.vocals.rms, stats.input.rms) < NOT_SEPARATED_DB
    ) {
      warnings.push(
        'Model tampak tidak memisahkan (energi vokal sangat rendah vs input)',
      );
    }
    if (stats.vocals.clipPercent >= CLIP_WARN_PERCENT) {
      warnings.push(
        `Vokal clipping ~${stats.vocals.clipPercent.toFixed(1)}% sampel`,
      );
    }
  }

  if (opts.instrumental) {
    stats.instrumental = computeStats(opts.instrumental);
    if (stats.instrumental.hasNaN || stats.instrumental.hasInf) {
      errors.push('Stem instrumental mengandung NaN/Inf');
    } else if (stats.instrumental.rms < SILENT_RMS) {
      errors.push('Stem instrumental sunyi (silent)');
    } else if (
      stats.input &&
      dbRatio(stats.instrumental.rms, stats.input.rms) < TOO_AGGRESSIVE_DB
    ) {
      warnings.push(
        'Instrumental terlalu agresif (energi sangat rendah vs input)',
      );
    }
    if (stats.instrumental.clipPercent >= CLIP_WARN_PERCENT) {
      warnings.push(
        `Instrumental clipping ~${stats.instrumental.clipPercent.toFixed(1)}% sampel`,
      );
    }
  }

  let instrumentalCorrelation: number | undefined;
  if (opts.instrumental && opts.input?.[0] && opts.instrumental[0]) {
    instrumentalCorrelation = correlation(opts.input[0], opts.instrumental[0]);
    if (instrumentalCorrelation >= HIGH_CORRELATION) {
      warnings.push(
        'Model tampak tidak memisahkan (instrumental hampir identik dengan input)',
      );
    }
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    stats,
    instrumentalCorrelation,
  };
}
