/**
 * Device tier + quality/safe limits (22C).
 * Replaces MAX_DURATION_SEC from 22B-1 — single source of truth.
 * All numeric limits: INITIAL ASSUMPTION until device data exists.
 */

export type DeviceTier = 'low' | 'mid' | 'high';
export type QualityLevel = 'economy' | 'balanced' | 'good';

export interface TierInput {
  userAgent: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface QualityConfig {
  quality: QualityLevel;
  overlap: number;
  /** rough seconds of wall time per second of audio (INITIAL ASSUMPTION) */
  timeFactor: number;
  memoryNote: string;
}

export interface TierLimits {
  maxDurationSec: number;
  batchSize: number;
  /** Frame per potongan inferensi (kelipatan 32). Lebih kecil = jauh lebih hemat memori. */
  segmentFrames: number;
  /** Overlap minimum antar potongan agar sambungan tepi tidak terdengar. */
  minOverlap: number;
  /** Pengali estimasi waktu: potongan kecil + overlap besar = lebih lambat. */
  timeScale: number;
  qualities: Record<QualityLevel, QualityConfig>;
}

/** INITIAL ASSUMPTION — re-tune after manual device tables */
export const TIER_LIMITS: Record<DeviceTier, TierLimits> = {
  low: {
    maxDurationSec: 60,
    batchSize: 1,
    segmentFrames: 64,
    minOverlap: 0.5,
    timeScale: 1.8,
    qualities: {
      economy: {
        quality: 'economy',
        overlap: 0.05,
        timeFactor: 8,
        memoryNote: 'Hemat memori; kualitas pemisahan lebih rendah',
      },
      balanced: {
        quality: 'balanced',
        overlap: 0.15,
        timeFactor: 12,
        memoryNote: 'Seimbang; tetap berisiko OOM di iPhone lama',
      },
      good: {
        quality: 'good',
        overlap: 0.25,
        timeFactor: 18,
        memoryNote: 'Overlap besar; hindari lagu panjang di perangkat lemah',
      },
    },
  },
  mid: {
    maxDurationSec: 180,
    batchSize: 1,
    segmentFrames: 128,
    minOverlap: 0.35,
    timeScale: 1.3,
    qualities: {
      economy: {
        quality: 'economy',
        overlap: 0.1,
        timeFactor: 5,
        memoryNote: 'Cepat, memori lebih rendah',
      },
      balanced: {
        quality: 'balanced',
        overlap: 0.25,
        timeFactor: 8,
        memoryNote: 'Default yang disarankan',
      },
      good: {
        quality: 'good',
        overlap: 0.35,
        timeFactor: 12,
        memoryNote: 'Kualitas lebih halus di seam chunk',
      },
    },
  },
  high: {
    maxDurationSec: 360,
    batchSize: 1,
    segmentFrames: 256,
    minOverlap: 0,
    timeScale: 1,
    qualities: {
      economy: {
        quality: 'economy',
        overlap: 0.15,
        timeFactor: 3,
        memoryNote: 'Cepat',
      },
      balanced: {
        quality: 'balanced',
        overlap: 0.25,
        timeFactor: 5,
        memoryNote: 'Default',
      },
      good: {
        quality: 'good',
        overlap: 0.4,
        timeFactor: 8,
        memoryNote: 'Overlap maksimal',
      },
    },
  },
};

export function getDeviceTier(input: TierInput): DeviceTier {
  const ua = (input.userAgent || '').toLowerCase();
  const mem = input.deviceMemory;
  const cores = input.hardwareConcurrency ?? 2;

  const isIOS =
    /iphone|ipad|ipod/.test(ua) || (ua.includes('mac') && ua.includes('mobile'));
  if (isIOS) {
    if (/iphone\s*(1[2-9]|[2-9]\d)/.test(ua) || /ipad.*os 1[5-9]/.test(ua)) {
      return 'mid';
    }
    return 'low';
  }

  if (typeof mem === 'number') {
    if (mem <= 2) return 'low';
    if (mem <= 4) return 'mid';
    return 'high';
  }

  if (cores <= 2) return 'low';
  if (cores <= 4) return 'mid';
  return 'high';
}

export function getLimitsForTier(tier: DeviceTier): TierLimits {
  return TIER_LIMITS[tier];
}

export function getQualityConfig(
  tier: DeviceTier,
  quality: QualityLevel,
): QualityConfig {
  return TIER_LIMITS[tier].qualities[quality];
}

/** Frame per potongan dan overlap efektif untuk tier + kualitas. Pure. */
export function getSegmentConfig(
  tier: DeviceTier,
  quality: QualityLevel,
): { frames: number; overlap: number } {
  const lim = TIER_LIMITS[tier];
  const overlap = Math.min(0.5, Math.max(lim.qualities[quality].overlap, lim.minOverlap));
  return { frames: lim.segmentFrames, overlap };
}

/** Rough wall-time estimate in seconds (range). INITIAL ASSUMPTION factors. */
export function estimateProcessingTime(
  durationSec: number,
  tier: DeviceTier,
  quality: QualityLevel,
): { minSec: number; maxSec: number; label: string } {
  const factor = TIER_LIMITS[tier].qualities[quality].timeFactor * TIER_LIMITS[tier].timeScale;
  const mid = durationSec * factor;
  const minSec = Math.max(1, Math.round(mid * 0.7));
  const maxSec = Math.max(minSec + 1, Math.round(mid * 1.4));
  const label = `Perkiraan ${minSec}–${maxSec} dtk (perkiraan kasar, bukan jaminan)`;
  return { minSec, maxSec, label };
}

export function shouldWarnDuration(
  durationSec: number,
  tier: DeviceTier,
): boolean {
  return durationSec > TIER_LIMITS[tier].maxDurationSec;
}

/** Trim samples to first maxSec at sampleRate. Pure. */
export function trimToSeconds(
  channels: Float32Array[],
  sampleRate: number,
  maxSec: number,
): Float32Array[] {
  const maxSamples = Math.max(1, Math.floor(maxSec * sampleRate));
  return channels.map((ch) =>
    ch.length <= maxSamples ? ch.slice() : ch.slice(0, maxSamples),
  );
}

export const TRIM_TEST_SEC = 60;
