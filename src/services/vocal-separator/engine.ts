/**
 * AI Vocal Separator engine — Batch 22C.
 * Path B Worker + Fast Mode (no AI) + tier limits.
 */

import { PRIMARY_MODEL } from './modelRegistry';
import { vocalModelManager } from './modelManager';
import { decodeAudioFile, encodeWav, validateAudioFile } from './audioUtils';
import { ortRuntimeClient } from './runtimeClient';
import type { SeparateOptionsPayload, SeparationTiming } from './workerMessages';
import { runQualityGate, snapshotInput } from './pure/qualityGate';
import {
  getDeviceTier,
  getLimitsForTier,
  getSegmentConfig,
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
  /** Rincian waktu nyata (hanya jalur AI): berapa lama DSP vs model. */
  timing?: SeparationTiming & { wallMs: number; usedGpuRequest: boolean };
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
  /** Minta WebGPU (jauh lebih cepat bila didukung); otomatis jatuh ke CPU bila gagal. */
  useGpu?: boolean;
  /** Timpa overlap bawaan tier/kualitas (0..0.5). Lebih kecil = lebih cepat. */
  overlapOverride?: number;
  /** Timpa ukuran potongan (kelipatan 32, 32..256). Lebih besar = lebih cepat/hemat DSP, lebih boros memori. */
  segmentFramesOverride?: number;
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

  // Cuplikan input untuk quality gate: harus diambil sebelum buffer di-transfer ke worker.
  const gateSnapshot = snapshotInput(channels);
  const wantGpu = opts.useGpu === true;
  onProgress({ phase: 'loading_model' });
  await ortRuntimeClient.ensureModel(PRIMARY_MODEL.id, wantGpu ? 'webgpu' : 'wasm');

  const seg = getSegmentConfig(tier, quality);
  const overlap =
    typeof opts.overlapOverride === 'number' && opts.overlapOverride >= 0
      ? Math.min(0.5, opts.overlapOverride)
      : seg.overlap;
  const sf = opts.segmentFramesOverride;
  const segmentFrames =
    typeof sf === 'number' && Number.isInteger(sf) && sf >= 32 && sf <= 256 && sf % 32 === 0
      ? sf
      : seg.frames;
  const jobOpts: SeparateOptionsPayload = {
    outputMode,
    quality,
    overlap,
    segmentFrames,
  };
  // Dengan GPU, kirim salinan (bukan transfer) supaya audio asli masih utuh
  // bila GPU gagal di tengah jalan dan kita harus mengulang di CPU.
  const buildTransfer = (chs: Float32Array[]) => chs.map((c) => c.buffer as ArrayBuffer);

  onProgress({ phase: 'inference', chunk: 0, totalChunks: 1, percent: 0 });

  let result: {
    vocals?: Float32Array[];
    instrumental?: Float32Array[];
    timing?: SeparationTiming;
  };
  const extraWarnings: string[] = [];
  const wallStart = Date.now();
  // Breadcrumb: kalau iOS mematikan halaman saat inferensi (OOM), UI membacanya setelah reload.
  try {
    localStorage.setItem(
      INFERENCE_BREADCRUMB_KEY,
      JSON.stringify({ t: Date.now(), durationSec: Math.round(durationSec), tier, quality }),
    );
  } catch {
    /* ignore */
  }
  const runJob = (chs: Float32Array[], transferBuffers: boolean) =>
    ortRuntimeClient.separate({
      sampleRate,
      channels: chs,
      options: jobOpts,
      transfer: transferBuffers ? buildTransfer(chs) : undefined,
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
  try {
    try {
      // GPU: kirim dengan salinan agar bisa diulang di CPU. CPU: transfer (hemat memori).
      result = await runJob(channels, !wantGpu);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('CANCELLED') || msg === 'ABORTED' || !wantGpu) throw e;
      // WebGPU gagal saat inferensi: ulangi sekali di CPU (WASM).
      extraWarnings.push(`WebGPU gagal (${msg.slice(0, 120)}); diulang memakai CPU.`);
      onProgress({ phase: 'loading_model' });
      await ortRuntimeClient.ensureModel(PRIMARY_MODEL.id, 'wasm');
      result = await runJob(channels, false);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('CANCELLED')) {
      onProgress({ phase: 'cancelled' });
      throw new Error('ABORTED');
    }
    throw e;
  } finally {
    clearInferenceBreadcrumb();
  }

  if (signal?.aborted) throw new Error('ABORTED');
  onProgress({ phase: 'exporting' });

  const gate = runQualityGate({
    input: channels,
    inputSnapshot: gateSnapshot,
    vocals: result.vocals,
    instrumental: result.instrumental,
  });
  if (!gate.ok) {
    throw new Error(`QUALITY_GATE: ${gate.errors.join('; ')}`);
  }

  const allWarnings = [...extraWarnings, ...gate.warnings];
  const out: SeparationResult = {
    durationSec,
    sampleRate,
    mode: 'ai',
    warnings: allWarnings.length ? allWarnings : undefined,
    timing: result.timing
      ? { ...result.timing, wallMs: Date.now() - wallStart, usedGpuRequest: wantGpu }
      : undefined,
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

export const INFERENCE_BREADCRUMB_KEY = 'vocalSep.inferenceRunning';

export function clearInferenceBreadcrumb(): void {
  try {
    localStorage.removeItem(INFERENCE_BREADCRUMB_KEY);
  } catch {
    /* ignore */
  }
}

/** Dipanggil saat UI dibuka: true bila proses AI sebelumnya mati mendadak (tanpa selesai/error). */
export function consumeInferenceCrash(): { durationSec?: number; quality?: string } | null {
  try {
    const raw = localStorage.getItem(INFERENCE_BREADCRUMB_KEY);
    if (!raw) return null;
    localStorage.removeItem(INFERENCE_BREADCRUMB_KEY);
    const v = JSON.parse(raw) as { durationSec?: number; quality?: string };
    return v ?? {};
  } catch {
    return null;
  }
}

export { PRIMARY_MODEL, TRIM_TEST_SEC };
