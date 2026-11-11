/**
 * ONNX Runtime Web Worker — Batch 22B-1 Path B.
 * INIT / LOAD_MODEL / SEPARATE / CANCEL / DISPOSE.
 * Model bytes loaded from Cache Storage inside the Worker.
 * Real session.run quality is NOT VERIFIED without device evidence.
 */

import type {
  WorkerRequest,
  WorkerResponse,
  ExecutionProvider,
  DeviceCapabilities,
  SeparateOptionsPayload,
} from './workerMessages';
import {
  isWorkerRequest,
  validateSeparatePayload,
  findCachedModelIndex,
} from './workerMessages';
import { planChunks, chunkOverlapSamples, accumulateChunk, normalizeOverlap } from './pure/chunkPlanner';
import { validateModelMarker } from './pure/modelMarker';
import {
  hannWindow,
  stftChannel,
  istftChannel,
  sliceOneSided,
  expandConjugateMirror,
} from './pure/stft';
import {
  resolveTensorName,
  dimsCompatible,
  readMdxOutput,
  packMdxInput,
  zeroLowBins,
} from './pure/mdxTensor';
import type { Dim } from './pure/mdxTensor';

const MODEL_CACHE_NAME = 'vocal-separator-models-v1';
const DEFAULT_CACHE_KEY = 'inst-hq-3-dynt';

// Registry defaults (ASSUMPTION until session confirms)
const REG = {
  nFft: 6144,
  hopLength: 1024,
  dimF: 3072,
  dimT: 8, // 256 frames
  compensate: 1.022,
  primaryStem: 'instrumental' as const,
  sampleRate: 44100,
  sizeBytes: 66_759_214,
  sha256: '03ceedd8ce972685ae4b4905befa31637f25a90542562ce7367dd3555493c748',
};

let disposed = false;
let runtimeReady = false;
let activeProvider: ExecutionProvider = 'unknown';
let ortVersion: string | undefined;
let ortModule: typeof import('onnxruntime-web') | null = null;
let session: import('onnxruntime-web').InferenceSession | null = null;
let cancelJobId: string | null = null;
let activeJobId: string | null = null;

function post(msg: WorkerResponse): void {
  self.postMessage(msg);
}

/**
 * ORT does not expose the winning execution provider on the public session.
 * Probe known internal fields. If nothing conclusive is found, do not pretend
 * the first requested provider ran.
 */
function probeActualProvider(sess: object, requested: readonly string[]): ExecutionProvider {
  const bag = sess as {
    handler?: { backendHint?: string; name?: string; constructor?: { name?: string } };
    backendHint?: string;
  };
  const hint = [
    bag.handler?.backendHint,
    bag.handler?.name,
    bag.handler?.constructor?.name,
    bag.backendHint,
  ]
    .filter((v) => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
  if (hint.includes('webgpu')) return 'webgpu';
  if (hint.includes('wasm') || hint.includes('webassembly')) return 'wasm';
  if (requested.length === 1 && requested[0] === 'wasm') return 'wasm';
  return 'unknown';
}

function tensorShapes(
  meta: ReadonlyArray<{ name: string; isTensor: boolean; shape?: ReadonlyArray<number | string> }>,
): number[][] {
  return meta.map((m) => {
    if (!m.isTensor || !m.shape) return [];
    return m.shape.map((d) => (typeof d === 'number' ? d : -1));
  });
}

function detectCapabilities(): DeviceCapabilities {
  return {
    webWorker: true,
    webAssembly: typeof WebAssembly !== 'undefined',
    webGpu: typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    crossOriginIsolated:
      typeof crossOriginIsolated !== 'undefined' ? crossOriginIsolated : false,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'worker',
  };
}

async function initRuntime(requestId: string): Promise<void> {
  if (disposed) {
    post({ type: 'ERROR', requestId, code: 'DISPOSED', message: 'Worker already disposed' });
    return;
  }
  if (runtimeReady && ortModule) {
    post({ type: 'READY', requestId, provider: activeProvider, ortVersion });
    return;
  }

  post({ type: 'PROGRESS', requestId, phase: 'import', message: 'Importing onnxruntime-web…' });

  try {
    const ort = await import('onnxruntime-web');
    ortModule = ort;
    ortVersion =
      (ort as { version?: string }).version ??
      (ort as { env?: { versions?: { common?: string } } }).env?.versions?.common ??
      'unknown';

    if (ort.env?.wasm) {
      // One thread: iOS Safari has no SharedArrayBuffer on GitHub Pages (no COOP/COEP).
      ort.env.wasm.numThreads = 1;
      // Do NOT set wasmPaths to BASE_URL. onnxruntime-web resolves ort-wasm-*.wasm
      // relative to its own bundled module URL. Pointing wasmPaths at the site root
      // makes the runtime request /ort-wasm-simd.wasm, which is not where Vite emits it.
    }

    // navigator.gpu is only a capability. The provider that actually runs the
    // graph is known after InferenceSession.create, and may fall back to WASM.
    activeProvider = 'unknown';
    runtimeReady = true;
    post({ type: 'READY', requestId, provider: activeProvider, ortVersion });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    post({ type: 'ERROR', requestId, code: 'INIT_FAILED', message: msg });
  }
}

/**
 * Cari model di Cache Storage. cache.match(id) di Worker di-resolve relatif ke URL
 * script worker (/assets/...), sedangkan halaman menyimpannya relatif ke URL halaman,
 * jadi harus dicocokkan lewat akhiran path, bukan URL penuh.
 */
async function matchModel(cache: Cache, id: string): Promise<Response | undefined> {
  const direct = await cache.match(id);
  if (direct) return direct;
  const reqs = await cache.keys();
  const idx = findCachedModelIndex(
    reqs.map((r) => r.url),
    id,
  );
  return idx >= 0 ? cache.match(reqs[idx]) : undefined;
}

async function loadModel(
  requestId: string,
  cacheKey: string,
  preferred?: ExecutionProvider,
): Promise<void> {
  if (!ortModule || !runtimeReady) {
    post({ type: 'ERROR', requestId, code: 'NOT_READY', message: 'Init Runtime first' });
    return;
  }
  if (session) {
    post({
      type: 'MODEL_READY',
      requestId,
      inputMeta: {
        names: session.inputNames.slice(),
        dims: tensorShapes(session.inputMetadata),
      },
      outputMeta: {
        names: session.outputNames.slice(),
        dims: tensorShapes(session.outputMetadata),
      },
      provider: activeProvider,
    });
    return;
  }

  post({ type: 'MODEL_PROGRESS', requestId, phase: 'cache', message: 'Reading model from cache…' });

  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const res = await matchModel(cache, cacheKey || DEFAULT_CACHE_KEY);
    if (!res) {
      post({
        type: 'ERROR',
        requestId,
        code: 'MODEL_NOT_CACHED',
        message: 'Model belum diunduh',
      });
      return;
    }

    const sizeHeader = res.headers.get('Content-Length');
    const marker = res.headers.get('X-SHA256');
    const buf = await res.arrayBuffer();
    const actualSize = buf.byteLength;
    const expectedSize = sizeHeader ? Number(sizeHeader) : REG.sizeBytes;

    const markerResult = validateModelMarker({
      expectedSize: REG.sizeBytes,
      actualSize,
      expectedSha256: REG.sha256,
      headerSha256: marker,
    });
    // Allow missing marker on first loads from older caches: still check size
    if (actualSize !== REG.sizeBytes && actualSize !== expectedSize) {
      post({
        type: 'ERROR',
        requestId,
        code: 'CORRUPTED',
        message: `Size mismatch: ${actualSize} vs ${REG.sizeBytes}`,
      });
      return;
    }
    if (markerResult.ok === false && markerResult.reason === 'SHA_MISMATCH') {
      post({
        type: 'ERROR',
        requestId,
        code: 'CORRUPTED',
        message: 'SHA marker mismatch',
      });
      return;
    }

    post({ type: 'MODEL_PROGRESS', requestId, phase: 'session', percent: 50, message: 'Creating InferenceSession…' });

    const providers: string[] = [];
    if (preferred === 'webgpu') providers.push('webgpu');
    providers.push('wasm');

    const ort = ortModule;
    const modelData = new Uint8Array(buf);
    session = await ort.InferenceSession.create(modelData, {
      executionProviders: providers,
      // Percobaan hemat memori untuk iPhone: optimasi 'basic' dan tanpa arena/pola memori.
      // NOT VERIFIED di perangkat; kalau session gagal dibuat, kembalikan ke 'all'.
      graphOptimizationLevel: 'basic',
      enableCpuMemArena: false,
      enableMemPattern: false,
    });

    // Requested list is not the provider that ran. Probe, otherwise unknown
    // when WebGPU was in the list (ORT can fall back without throwing).
    activeProvider = probeActualProvider(session, providers);

    post({
      type: 'MODEL_READY',
      requestId,
      inputMeta: {
        names: session.inputNames.slice(),
        dims: tensorShapes(session.inputMetadata),
      },
      outputMeta: {
        names: session.outputNames.slice(),
        dims: tensorShapes(session.outputMetadata),
      },
      provider: activeProvider,
    });
  } catch (e) {
    session = null;
    const msg = e instanceof Error ? e.message : String(e);
    post({ type: 'ERROR', requestId, code: 'LOAD_MODEL_FAILED', message: msg });
  }
}

async function verifyModel(requestId: string, cacheKey: string): Promise<void> {
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const res = await matchModel(cache, cacheKey || DEFAULT_CACHE_KEY);
    if (!res) {
      post({ type: 'ERROR', requestId, code: 'MODEL_NOT_CACHED', message: 'Not in cache' });
      return;
    }
    const buf = await res.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    if (hash !== REG.sha256) {
      post({
        type: 'ERROR',
        requestId,
        code: 'CORRUPTED',
        message: `SHA256 mismatch: ${hash.slice(0, 16)}…`,
      });
      return;
    }
    post({
      type: 'PROGRESS',
      requestId,
      phase: 'verified',
      message: 'SHA256 OK',
    });
  } catch (e) {
    post({
      type: 'ERROR',
      requestId,
      code: 'VERIFY_FAILED',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

/**
 * Core separation loop. Uses STFT → session.run → iSTFT when session exists.
 * If session is null, returns JOB_ERROR (never fake audio).
 */
async function runSeparate(
  requestId: string,
  jobId: string,
  sampleRate: number,
  channels: Float32Array[],
  options: SeparateOptionsPayload,
): Promise<void> {
  activeJobId = jobId;
  cancelJobId = null;

  if (!session || !ortModule) {
    post({
      type: 'JOB_ERROR',
      jobId,
      code: 'NO_SESSION',
      message: 'Model belum dimuat (LOAD_MODEL)',
    });
    return;
  }

  const nFft = REG.nFft;
  const hop = REG.hopLength;
  const dimT = REG.dimT;
  const dimF = REG.dimF;
  const framesPerSeg = options.segmentFrames ?? 2 ** dimT;
  const overlap =
    options.overlap ??
    (options.quality === 'economy' ? 0.1 : options.quality === 'good' ? 0.35 : 0.25);

  const left = channels[0];
  const right = channels[1] ?? channels[0];
  const sampleCount = left.length;

  const plan = planChunks({
    sampleCount,
    hopLength: hop,
    dimT,
    nFft,
    overlap,
    frames: framesPerSeg,
  });

  const window = hannWindow(nFft);
  const outL = new Float32Array(sampleCount);
  const outR = new Float32Array(sampleCount);
  const weightL = new Float32Array(sampleCount);
  const weightR = new Float32Array(sampleCount);
  const overlapSamples = chunkOverlapSamples(plan.segmentSamples, plan.hopSamples);

  const inPick = resolveTensorName(session.inputNames, ['input']);
  const outPick = resolveTensorName(session.outputNames, ['output']);
  if (!inPick.ok) {
    post({
      type: 'JOB_ERROR',
      jobId,
      code: 'BAD_MODEL_IO',
      message: inPick.message,
    });
    return;
  }
  if (!outPick.ok) {
    post({
      type: 'JOB_ERROR',
      jobId,
      code: 'BAD_MODEL_IO',
      message: outPick.message,
    });
    return;
  }
  const inputName = inPick.name;
  const outputName = outPick.name;

  const inMeta = session.inputMetadata.find((m) => m.name === inputName);
  const inShape: readonly Dim[] | undefined =
    inMeta && inMeta.isTensor ? inMeta.shape : undefined;
  const inErr = dimsCompatible(inShape, [1, 4, dimF, framesPerSeg]);
  if (inErr) {
    post({
      type: 'JOB_ERROR',
      jobId,
      code: 'BAD_MODEL_IO',
      message: `Input "${inputName}" ${inErr}`,
    });
    return;
  }
  if (dimF <= 0 || dimF > nFft / 2 + 1) {
    post({
      type: 'JOB_ERROR',
      jobId,
      code: 'BAD_MODEL_IO',
      message: `dimF ${dimF} is not a one-sided bin count for nFft ${nFft}`,
    });
    return;
  }

  try {
    for (let ci = 0; ci < plan.totalChunks; ci++) {
      if (cancelJobId === jobId) {
        post({ type: 'JOB_CANCELLED', jobId });
        activeJobId = null;
        return;
      }

      const spec = plan.chunks[ci];
      const segLen = plan.segmentSamples;
      const segL = new Float32Array(segLen);
      const segR = new Float32Array(segLen);
      const copyLen = spec.end - spec.start;
      segL.set(left.subarray(spec.start, spec.end));
      segR.set(right.subarray(spec.start, spec.end));

      const stftL = stftChannel(segL, nFft, hop, window);
      const stftR = stftChannel(segR, nFft, hop, window);
      if (stftL.frames !== framesPerSeg || stftR.frames !== framesPerSeg) {
        post({
          type: 'JOB_ERROR',
          jobId,
          code: 'STFT_FRAMES',
          message: `STFT produced ${stftL.frames} frames, model expects ${framesPerSeg}`,
        });
        return;
      }
      const frames = framesPerSeg;

      // One-sided bins only (DC .. dimF-1). Negative frequencies are not fed to MDX.
      const lRe = sliceOneSided(stftL.re, frames, nFft, dimF);
      const lIm = sliceOneSided(stftL.im, frames, nFft, dimF);
      const rRe = sliceOneSided(stftR.re, frames, nFft, dimF);
      const rIm = sliceOneSided(stftR.im, frames, nFft, dimF);
      for (const a of [lRe, lIm, rRe, rIm]) zeroLowBins(a, frames, dimF);
      const inputData = packMdxInput(lRe, lIm, rRe, rIm, frames, dimF);

      const tensor = new ortModule.Tensor('float32', inputData, [1, 4, dimF, frames]);
      const feeds: Record<string, import('onnxruntime-web').Tensor> = {
        [inputName]: tensor,
      };

      const results = await session.run(feeds);
      const outTensor = results[outputName];
      if (!outTensor || outTensor.data == null) {
        post({
          type: 'JOB_ERROR',
          jobId,
          code: 'EMPTY_OUTPUT',
          message: `session.run missing output "${outputName}"`,
        });
        return;
      }

      const outData = outTensor.data as ArrayLike<number>;
      const parsed = readMdxOutput(outData, outTensor.dims, dimF, frames);
      if (!parsed.ok) {
        post({
          type: 'JOB_ERROR',
          jobId,
          code: 'BAD_OUTPUT_SHAPE',
          message: parsed.message,
        });
        return;
      }

      // Restore conjugate symmetry. Nyquist stays 0 (freq_pad). Do not double DC.
      const fullL = expandConjugateMirror(parsed.channels.lRe, parsed.channels.lIm, frames, nFft, dimF);
      const fullR = expandConjugateMirror(parsed.channels.rRe, parsed.channels.rIm, frames, nFft, dimF);
      const waveL = istftChannel(fullL.re, fullL.im, frames, nFft, hop, window, segLen);
      const waveR = istftChannel(fullR.re, fullR.im, frames, nFft, hop, window, segLen);

      const fadeIn = spec.start > 0;
      const fadeOut = spec.end < sampleCount;
      accumulateChunk(outL, weightL, waveL, spec.start, copyLen, overlapSamples, fadeIn, fadeOut);
      accumulateChunk(outR, weightR, waveR, spec.start, copyLen, overlapSamples, fadeIn, fadeOut);

      try {
        (tensor as { dispose?: () => void }).dispose?.();
        (outTensor as { dispose?: () => void }).dispose?.();
      } catch {
        /* ignore */
      }

      const percent = Math.round(((ci + 1) / plan.totalChunks) * 100);
      post({
        type: 'JOB_PROGRESS',
        jobId,
        phase: 'inference',
        chunk: ci + 1,
        totalChunks: plan.totalChunks,
        percent,
      });

      // yield for cancel + GC
      await new Promise((r) => setTimeout(r, 0));
    }

    const holesL = normalizeOverlap(outL, weightL);
    const holesR = normalizeOverlap(outR, weightR);
    if (holesL > 0 || holesR > 0) {
      post({
        type: 'JOB_ERROR',
        jobId,
        code: 'OLA_HOLE',
        message: `Overlap-add left ${holesL}/${holesR} samples with zero weight`,
      });
      return;
    }
    // UVR compensate scales the primary stem (instrumental) after reconstruction.
    const compensate = REG.compensate;
    for (let i = 0; i < sampleCount; i++) {
      outL[i] *= compensate;
      outR[i] *= compensate;
    }

    // primary = instrumental; vocals = mix - primary
    const instL = outL;
    const instR = outR;
    const vocL = new Float32Array(sampleCount);
    const vocR = new Float32Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
      vocL[i] = left[i] - instL[i];
      vocR[i] = right[i] - instR[i];
    }

    const result: WorkerResponse = {
      type: 'JOB_RESULT',
      jobId,
    };
    if (options.outputMode === 'vocals' || options.outputMode === 'both') {
      (result as { vocals?: Float32Array[] }).vocals = [vocL, vocR];
    }
    if (options.outputMode === 'instrumental' || options.outputMode === 'both') {
      (result as { instrumental?: Float32Array[] }).instrumental = [instL, instR];
    }

    // Transfer stems
    const transfer: ArrayBuffer[] = [];
    const r = result as {
      vocals?: Float32Array[];
      instrumental?: Float32Array[];
    };
    if (r.vocals) r.vocals.forEach((c) => transfer.push(c.buffer));
    if (r.instrumental) r.instrumental.forEach((c) => transfer.push(c.buffer));
    (self as DedicatedWorkerGlobalScope).postMessage(result, transfer);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const code =
      /memory|allocation|oom/i.test(msg) ? 'OOM' : /range/i.test(msg) ? 'RANGE' : 'INFERENCE_FAILED';
    post({ type: 'JOB_ERROR', jobId, code, message: msg });
  } finally {
    activeJobId = null;
  }
}

self.onmessage = async (ev: MessageEvent) => {
  const data = ev.data;
  if (!isWorkerRequest(data)) {
    post({
      type: 'ERROR',
      requestId: (data as { requestId?: string })?.requestId || 'unknown',
      code: 'INVALID_MESSAGE',
      message: 'Invalid worker request',
    });
    return;
  }

  const req = data as WorkerRequest;

  switch (req.type) {
    case 'INIT_RUNTIME':
      await initRuntime(req.requestId);
      break;
    case 'CHECK_CAPABILITIES': {
      const caps = detectCapabilities();
      post({
        type: 'CAPABILITIES',
        requestId: req.requestId,
        capabilities: caps,
        preferredProviders: caps.webGpu ? ['webgpu', 'wasm'] : ['wasm'],
      });
      break;
    }
    case 'LOAD_MODEL':
      await loadModel(req.requestId, req.cacheKey, req.provider);
      break;
    case 'VERIFY_MODEL':
      await verifyModel(req.requestId, req.cacheKey);
      break;
    case 'SEPARATE': {
      const err = validateSeparatePayload(req);
      if (err) {
        post({
          type: 'JOB_ERROR',
          jobId: req.jobId || 'unknown',
          code: err,
          message: `Invalid SEPARATE payload: ${err}`,
        });
        break;
      }
      await runSeparate(
        req.requestId,
        req.jobId,
        req.sampleRate,
        req.channels,
        req.options,
      );
      break;
    }
    case 'CANCEL':
      if (req.jobId) cancelJobId = req.jobId;
      else if (activeJobId) cancelJobId = activeJobId;
      post({ type: 'CANCELLED', requestId: req.requestId });
      break;
    case 'DISPOSE':
      disposed = true;
      runtimeReady = false;
      try {
        session = null;
      } catch {
        /* ignore */
      }
      ortModule = null;
      post({ type: 'DISPOSED', requestId: req.requestId });
      break;
    default: {
      const fallback = data as { requestId?: string };
      post({
        type: 'ERROR',
        requestId: fallback.requestId || 'unknown',
        code: 'UNKNOWN_TYPE',
        message: 'Unknown type',
      });
    }
  }
};
