/**
 * AI Vocal Separator engine — Batch 22C.
 * Path B Worker + Fast Mode (no AI) + tier limits.
 */

import { PRIMARY_MODEL } from './modelRegistry';
import { vocalModelManager } from './modelManager';
import { decodeAudioFile, encodeWav, validateAudioFile } from './audioUtils';
import { ortRuntimeClient } from './runtimeClient';
import type { SeparateOptionsPayload } from './workerMessages';
import { runQualityGate } from './pure/qualityGate';
import {
  getDeviceTier,
  getLimitsForTier,
  getQualityConfig,
  estimateProcessingTime,
  shouldWarnDuration,
  trimToSeconds,
  TRIM_TEST_SEC,
  type DeviceTier,
  type QualityLevel,
} from './pure/deviceTier';
import { runFastMode } from './pure/fastMode';

export type SeparationProgress =
  | { phase: 'loading_model'; percent?: number }
  | { phase: 'loading_runtime' }
  | { phase: 'preparing_audio' }
  | { phase: 'stft' }
  | { phase: 'inference'; chunk: number; totalChunks: number; percent?: number }
  | { phase: 'istft' }
  | { phase: 'exporting' }
  | { phase: 'done' }
  | { phase: 'error'; message: string }
  | { phase: 'cancelled' };

export interface SeparationResult {
  vocals?: Blob;
  instrumental?: Blob;
  durationSec: number;
  sampleRate: number;
  mode: 'ai' | 'fast';
  warnings?: string[];
  metrics?: {
    rmsInput?: number;
    rmsVocals?: number;
    rmsInstrumental?: number;
    peakVocals?: number;
    peakInstrumental?: number;
  };
}

export interface SeparateOptions {
  onProgress?: (p: SeparationProgress) => void;
  signal?: AbortSignal;
  outputMode?: 'vocals' | 'instrumental' | 'both';
  quality?: QualityLevel;
  /** force Fast Mode (no AI) */
  fastMode?: boolean;
  fastStrength?: number;
  keepBass?: boolean;
  /** trim to first N seconds before process */
  trimToSec?: number;
}

export function detectTier(): DeviceTier {
  return getDeviceTier({
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    deviceMemory: (navigator as Navigator & { deviceMemory?: number })
      ?.deviceMemory,
    hardwareConcurrency: navigator?.hardwareConcurrency,
  });
}

export function getDurationWarning(
  durationSec: number,
  tier?: DeviceTier,
): { warn: boolean; maxSec: number; message: string } {
  const t = tier ?? detectTier();
  const maxSec = getLimitsForTier(t).maxDurationSec;
  const warn = shouldWarnDuration(durationSec, t);
  return {
    warn,
    maxSec,
    message: warn
      ? `Durasi ${durationSec.toFixed(0)}s melebihi batas aman tier ${t} (${maxSec}s). Pertimbangkan trim 60 dtk atau Fast Mode.`
      : '',
  };
}

export function getTimeEstimate(
  durationSec: number,
  quality: QualityLevel = 'balanced',
  tier?: DeviceTier,
) {
  const t = tier ?? detectTier();
  return estimateProcessingTime(durationSec, t, quality);
}

export async function separate(
  audioFile: File | Blob,
  opts: SeparateOptions = {},
): Promise<SeparationResult> {
  const onProgress = opts.onProgress ?? (() => {});
  const signal = opts.signal;
  const outputMode = opts.outputMode ?? 'both';
  const quality = opts.quality ?? 'balanced';
  const tier = detectTier();
  const useFast = opts.fastMode === true || tier === 'low' && opts.fastMode !== false && opts.fastMode !== undefined
    ? !!opts.fastMode
    : !!opts.fastMode;

  if (signal?.aborted) throw new Error('ABORTED');

  if (audioFile instanceof File) {
    const err = validateAudioFile(audioFile);
    if (err) throw new Error(err);
  }

  onProgress({ phase: 'preparing_audio' });
  const decoded = await decodeAudioFile(audioFile);
  let { left, right, sampleRate, durationSec } = decoded;
  let channels: Float32Array[] = [left, right];

  if (opts.trimToSec && opts.trimToSec > 0) {
    channels = trimToSeconds(channels, sampleRate, opts.trimToSec);
    left = channels[0];
    right = channels[1] ?? channels[0];
    durationSec = left.length / sampleRate;
  }

  const limits = getLimitsForTier(tier);
  if (!opts.trimToSec && durationSec > limits.maxDurationSec) {
    throw new Error(
      `DURATION_LIMIT: ${durationSec.toFixed(0)}s melebihi batas tier ${tier} (${limits.maxDurationSec}s). Gunakan opsi trim ${TRIM_TEST_SEC} dtk.`,
    );
  }

  if (signal?.aborted) throw new Error('ABORTED');

  // —— Fast Mode path (main thread pure DSP; short audio only) ——
  // For longer files, still OK — pure and cancellable via signal checks in chunks if needed.
  if (useFast) {
    onProgress({ phase: 'inference', chunk: 1, totalChunks: 1, percent: 10 });
    if (signal?.aborted) throw new Error('ABORTED');
    const fm = runFastMode(left, right, {
      strength: opts.fastStrength ?? 0.85,
      keepBass: opts.keepBass ?? true,
      sampleRate,
    });
    onProgress({ phase: 'exporting' });
    const warnings = fm.warning ? [fm.warning, 'Hasil Fast Mode (tanpa AI, kasar)'] : ['Hasil Fast Mode (tanpa AI, kasar)'];
    const out: SeparationResult = {
      durationSec,
      sampleRate,
      mode: 'fast',
      warnings,
    };
    // Fast mode produces a single "vocal-ish" side effect on both; expose as vocals + residual instrumental
    const instL = new Float32Array(left.length);
    const instR = new Float32Array(right.length);
    for (let i = 0; i < left.length; i++) {
      instL[i] = left[i] - fm.left[i];
      instR[i] = right[i] - fm.right[i];
    }
    if (outputMode === 'vocals' || outputMode === 'both') {
      out.vocals = encodeWav(fm.left, fm.right, sampleRate);
    }
    if (outputMode === 'instrumental' || outputMode === 'both') {
      out.instrumental = encodeWav(instL, instR, sampleRate);
    }
    onProgress({ phase: 'done' });
    return out;
  }

  // —— AI path ——
  if (vocalModelManager.getStatus() !== 'READY') {
    throw new Error('MODEL_NOT_READY: unduh model terlebih dahulu (atau gunakan Fast Mode)');
  }
  if (ortRuntimeClient.status !== 'READY') {
    throw new Error('RUNTIME_NOT_READY: Init Runtime terlebih dahulu (atau gunakan Fast Mode)');
  }

  if (!ortRuntimeClient.modelReady) {
    onProgress({ phase: 'loading_model' });
    await ortRuntimeClient.loadModel(PRIMARY_MODEL.id);
  }

  const qCfg = getQualityConfig(tier, quality);
  const jobOpts: SeparateOptionsPayload = {
    outputMode,
    quality,
    overlap: qCfg.overlap,
  };
  const transfer = channels.map((c) => c.buffer);

  onProgress({ phase: 'inference', chunk: 0, totalChunks: 1, percent: 0 });

  let result: { vocals?: Float32Array[]; instrumental?: Float32Array[] };
  try {
    result = await ortRuntimeClient.separate({
      sampleRate,
      channels,
      options: jobOpts,
      transfer,
      signal,
      onJobProgress: (p) => {
        onProgress({
          phase: 'inference',
          chunk: p.chunk,
          totalChunks: p.totalChunks,
          percent: p.percent,
        });
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes('CANCELLED')) {
      onProgress({ phase: 'cancelled' });
      throw new Error('ABORTED');
    }
    throw e;
  }

  if (signal?.aborted) throw new Error('ABORTED');
  onProgress({ phase: 'exporting' });

  const gate = runQualityGate({
    input: channels,
    vocals: result.vocals,
    instrumental: result.instrumental,
  });
  if (!gate.ok) {
    throw new Error(`QUALITY_GATE: ${gate.errors.join('; ')}`);
  }

  const out: SeparationResult = {
    durationSec,
    sampleRate,
    mode: 'ai',
    warnings: gate.warnings.length ? gate.warnings : undefined,
    metrics: {
      rmsInput: gate.stats.input?.rms,
      rmsVocals: gate.stats.vocals?.rms,
      rmsInstrumental: gate.stats.instrumental?.rms,
      peakVocals: gate.stats.vocals?.peak,
      peakInstrumental: gate.stats.instrumental?.peak,
    },
  };

  if (result.vocals && (outputMode === 'vocals' || outputMode === 'both')) {
    out.vocals = encodeWav(result.vocals[0], result.vocals[1] ?? null, sampleRate);
  }
  if (result.instrumental && (outputMode === 'instrumental' || outputMode === 'both')) {
    out.instrumental = encodeWav(
      result.instrumental[0],
      result.instrumental[1] ?? null,
      sampleRate,
    );
  }

  onProgress({ phase: 'done' });
  return out;
}

export { PRIMARY_MODEL, TRIM_TEST_SEC };
