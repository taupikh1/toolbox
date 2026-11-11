/**
 * Message protocol between UI thread and ONNX Runtime worker.
 * Batch 22B: extended for LOAD_MODEL / SEPARATE / real JOB_* progress.
 * Every request carries non-empty requestId. Job messages also carry jobId.
 */

export type RuntimeStatus =
  | 'NOT_INITIALIZED'
  | 'INITIALIZING'
  | 'READY'
  | 'ERROR'
  | 'DISPOSED';

export type ExecutionProvider = 'webgpu' | 'wasm' | 'unknown';

export interface DeviceCapabilities {
  webWorker: boolean;
  webAssembly: boolean;
  webGpu: boolean;
  sharedArrayBuffer: boolean;
  crossOriginIsolated: boolean;
  userAgent: string;
}

export interface ModelInputMeta {
  names: string[];
  dims: number[][];
}

export interface ModelOutputMeta {
  names: string[];
  dims: number[][];
}

export type SeparateOptionsPayload = {
  outputMode: 'vocals' | 'instrumental' | 'both';
  quality: 'economy' | 'balanced' | 'good';
  /** overlap fraction 0..0.5; derived from quality if omitted */
  overlap?: number;
  /** Frame per potongan (kelipatan 32, 32..256). Default 256. Lebih kecil = lebih hemat memori. */
  segmentFrames?: number;
};

/** Main → Worker */
export type WorkerRequest =
  | { type: 'INIT_RUNTIME'; requestId: string }
  | { type: 'CHECK_CAPABILITIES'; requestId: string }
  | { type: 'LOAD_MODEL'; requestId: string; cacheKey: string; provider?: ExecutionProvider }
  | { type: 'VERIFY_MODEL'; requestId: string; cacheKey: string }
  | {
      type: 'SEPARATE';
      requestId: string;
      jobId: string;
      sampleRate: number;
      channels: Float32Array[];
      options: SeparateOptionsPayload;
    }
  | { type: 'CANCEL'; requestId: string; jobId?: string }
  | { type: 'DISPOSE'; requestId: string };

/** Worker → Main */
export type WorkerResponse =
  | {
      type: 'READY';
      requestId: string;
      provider: ExecutionProvider;
      ortVersion?: string;
    }
  | {
      type: 'CAPABILITIES';
      requestId: string;
      capabilities: DeviceCapabilities;
      preferredProviders: ExecutionProvider[];
    }
  | {
      type: 'MODEL_PROGRESS';
      requestId: string;
      phase: string;
      percent?: number;
      message?: string;
    }
  | {
      type: 'MODEL_READY';
      requestId: string;
      inputMeta: ModelInputMeta;
      outputMeta: ModelOutputMeta;
      provider: ExecutionProvider;
    }
  | {
      type: 'JOB_PROGRESS';
      jobId: string;
      phase: string;
      chunk: number;
      totalChunks: number;
      percent: number;
    }
  | {
      type: 'JOB_RESULT';
      jobId: string;
      vocals?: Float32Array[];
      instrumental?: Float32Array[];
    }
  | {
      type: 'JOB_ERROR';
      jobId: string;
      code: string;
      message: string;
    }
  | {
      type: 'JOB_CANCELLED';
      jobId: string;
    }
  | {
      type: 'PROGRESS';
      requestId: string;
      phase: string;
      percent?: number;
      message?: string;
    }
  | {
      type: 'ERROR';
      requestId: string;
      code: string;
      message: string;
    }
  | {
      type: 'CANCELLED';
      requestId: string;
    }
  | {
      type: 'DISPOSED';
      requestId: string;
    };

const REQUEST_TYPES = new Set([
  'INIT_RUNTIME',
  'CHECK_CAPABILITIES',
  'LOAD_MODEL',
  'VERIFY_MODEL',
  'SEPARATE',
  'CANCEL',
  'DISPOSE',
]);

export function isWorkerRequest(data: unknown): data is WorkerRequest {
  if (!data || typeof data !== 'object') return false;
  const t = (data as { type?: string }).type;
  const id = (data as { requestId?: string }).requestId;
  if (typeof id !== 'string' || !id) return false;
  if (typeof t !== 'string' || !REQUEST_TYPES.has(t)) return false;
  return true;
}

/** Validate SEPARATE payload; returns error code or null if ok. */
export function validateSeparatePayload(msg: {
  sampleRate?: unknown;
  channels?: unknown;
  options?: unknown;
  jobId?: unknown;
}): string | null {
  if (typeof msg.jobId !== 'string' || !msg.jobId) return 'INVALID_JOB_ID';
  if (typeof msg.sampleRate !== 'number' || !(msg.sampleRate > 0)) return 'INVALID_SAMPLE_RATE';
  if (!Array.isArray(msg.channels) || msg.channels.length < 1 || msg.channels.length > 2) {
    return 'INVALID_CHANNELS';
  }
  const len0 = (msg.channels[0] as Float32Array)?.length;
  if (typeof len0 !== 'number' || len0 < 1) return 'INVALID_CHANNELS';
  for (const ch of msg.channels) {
    if (!(ch instanceof Float32Array) || ch.length !== len0) return 'INVALID_CHANNELS';
  }
  const opt = msg.options;
  if (!opt || typeof opt !== 'object') return 'INVALID_OPTIONS';
  const mode = (opt as SeparateOptionsPayload).outputMode;
  if (mode !== 'vocals' && mode !== 'instrumental' && mode !== 'both') return 'INVALID_OPTIONS';
  const sf = (opt as SeparateOptionsPayload).segmentFrames;
  if (sf !== undefined) {
    if (!Number.isInteger(sf) || sf < 32 || sf > 256 || sf % 32 !== 0) return 'INVALID_SEGMENT_FRAMES';
  }
  return null;
}

/**
 * Pesan perantara (progress) memakai requestId yang sama dengan request aslinya,
 * tetapi BUKAN jawaban akhir. Client tidak boleh menyelesaikan promise dengan pesan ini.
 */
export function isIntermediateResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const t = (data as { type?: string }).type;
  return t === 'PROGRESS' || t === 'MODEL_PROGRESS';
}

/**
 * Cache API: kunci string di-resolve relatif terhadap base URL konteks yang memanggil.
 * Halaman (modelManager) menyimpan model di "<base-halaman>/<id>", sedangkan Worker
 * mencari di "<base-script-worker>/<id>", sehingga cache.match(id) di worker meleset.
 * Fungsi murni ini memilih URL tersimpan yang path-nya berakhir dengan "/<id>".
 * Mengembalikan indeks, atau -1 bila tidak ada.
 */
export function findCachedModelIndex(urls: readonly string[], id: string): number {
  if (!id) return -1;
  const suffix = '/' + id;
  for (let i = 0; i < urls.length; i++) {
    try {
      const path = new URL(urls[i]).pathname;
      if (path.endsWith(suffix)) return i;
    } catch {
      /* URL tidak valid, lewati */
    }
  }
  return -1;
}
