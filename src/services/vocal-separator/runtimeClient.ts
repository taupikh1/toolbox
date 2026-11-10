/**
 * Main-thread client for the ORT Worker (Batch 22B-1).
 * Routes JOB_* by jobId; rejects all pending on worker error/terminate.
 */

import type {
  WorkerRequest,
  WorkerResponse,
  DeviceCapabilities,
  ExecutionProvider,
  RuntimeStatus,
  SeparateOptionsPayload,
} from './workerMessages';
import { isIntermediateResponse } from './workerMessages';

export type { DeviceCapabilities, ExecutionProvider, RuntimeStatus };

type Pending = {
  resolve: (v: WorkerResponse) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type JobHandlers = {
  onProgress?: (p: {
    phase: string;
    chunk: number;
    totalChunks: number;
    percent: number;
  }) => void;
  resolve: (v: {
    vocals?: Float32Array[];
    instrumental?: Float32Array[];
  }) => void;
  reject: (e: Error) => void;
};

function newId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export class OrtRuntimeClient {
  private worker: Worker | null = null;
  private pending = new Map<string, Pending>();
  private jobs = new Map<string, JobHandlers>();
  private _status: RuntimeStatus = 'NOT_INITIALIZED';
  private _provider: ExecutionProvider = 'unknown';
  private _ortVersion: string | undefined;
  private _capabilities: DeviceCapabilities | null = null;
  private _lastError: string | null = null;
  private _modelReady = false;

  get status(): RuntimeStatus {
    return this._status;
  }
  get provider(): ExecutionProvider {
    return this._provider;
  }
  get ortVersion(): string | undefined {
    return this._ortVersion;
  }
  get capabilities(): DeviceCapabilities | null {
    return this._capabilities;
  }
  get lastError(): string | null {
    return this._lastError;
  }
  get modelReady(): boolean {
    return this._modelReady;
  }

  private rejectAll(reason: string): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(reason));
    }
    this.pending.clear();
    for (const [, j] of this.jobs) {
      j.reject(new Error(reason));
    }
    this.jobs.clear();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    // Vite worker import
    this.worker = new Worker(new URL('./ort.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (ev: MessageEvent) => {
      const msg = ev.data as WorkerResponse;
      if (!msg || typeof msg !== 'object') return;

      // Job-scoped messages
      if (
        msg.type === 'JOB_PROGRESS' ||
        msg.type === 'JOB_RESULT' ||
        msg.type === 'JOB_ERROR' ||
        msg.type === 'JOB_CANCELLED'
      ) {
        const jobId = (msg as { jobId: string }).jobId;
        const job = this.jobs.get(jobId);
        if (!job) return;
        if (msg.type === 'JOB_PROGRESS') {
          job.onProgress?.({
            phase: msg.phase,
            chunk: msg.chunk,
            totalChunks: msg.totalChunks,
            percent: msg.percent,
          });
          return;
        }
        this.jobs.delete(jobId);
        if (msg.type === 'JOB_RESULT') {
          job.resolve({
            vocals: (msg as { vocals?: Float32Array[] }).vocals,
            instrumental: (msg as { instrumental?: Float32Array[] }).instrumental,
          });
        } else if (msg.type === 'JOB_CANCELLED') {
          job.reject(new Error('CANCELLED'));
        } else {
          job.reject(
            new Error(
              `${(msg as { code: string }).code}: ${(msg as { message: string }).message}`,
            ),
          );
        }
        return;
      }

      // requestId-scoped
      const requestId = (msg as { requestId?: string }).requestId;
      if (!requestId) return;
      // PROGRESS / MODEL_PROGRESS hanyalah kabar perantara, bukan jawaban akhir.
      // Jangan resolve/hapus pending, tunggu READY / MODEL_READY / ERROR.
      if (isIntermediateResponse(msg)) return;
      const p = this.pending.get(requestId);
      if (!p) return;
      clearTimeout(p.timer);
      this.pending.delete(requestId);
      p.resolve(msg);
    };
    this.worker.onerror = (err) => {
      this._status = 'ERROR';
      this._lastError = err.message || 'Worker error';
      this.rejectAll(this._lastError);
      this.worker = null;
      this._modelReady = false;
    };
    return this.worker;
  }

  private send(req: WorkerRequest, timeoutMs = 60_000): Promise<WorkerResponse> {
    const w = this.ensureWorker();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(req.requestId);
        reject(new Error(`Worker timeout for ${req.type}`));
      }, timeoutMs);
      this.pending.set(req.requestId, { resolve, reject, timer });
      w.postMessage(req);
    });
  }

  async checkCapabilities(): Promise<DeviceCapabilities> {
    const res = await this.send({ type: 'CHECK_CAPABILITIES', requestId: newId() });
    if (res.type === 'CAPABILITIES') {
      this._capabilities = res.capabilities;
      return res.capabilities;
    }
    if (res.type === 'ERROR') throw new Error(`${res.code}: ${res.message}`);
    throw new Error('Unexpected response for CHECK_CAPABILITIES');
  }

  async initRuntime(): Promise<{ provider: ExecutionProvider; ortVersion?: string }> {
    this._status = 'INITIALIZING';
    this._lastError = null;
    try {
      const res = await this.send({ type: 'INIT_RUNTIME', requestId: newId() }, 90_000);
      if (res.type === 'READY') {
        this._status = 'READY';
        this._provider = res.provider;
        this._ortVersion = res.ortVersion;
        return { provider: res.provider, ortVersion: res.ortVersion };
      }
      if (res.type === 'ERROR') {
        this._status = 'ERROR';
        this._lastError = `${res.code}: ${res.message}`;
        throw new Error(this._lastError);
      }
      throw new Error('Unexpected response for INIT_RUNTIME');
    } catch (e) {
      this._status = 'ERROR';
      this._lastError = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async loadModel(cacheKey = 'uvr-mdx-net-inst-hq-3'): Promise<void> {
    const res = await this.send(
      { type: 'LOAD_MODEL', requestId: newId(), cacheKey },
      120_000,
    );
    if (res.type === 'MODEL_READY') {
      this._modelReady = true;
      this._provider = res.provider;
      return;
    }
    if (res.type === 'ERROR') {
      this._modelReady = false;
      throw new Error(`${res.code}: ${res.message}`);
    }
    throw new Error('Unexpected response for LOAD_MODEL');
  }

  separate(opts: {
    sampleRate: number;
    channels: Float32Array[];
    options: SeparateOptionsPayload;
    transfer?: ArrayBuffer[];
    onJobProgress?: JobHandlers['onProgress'];
    signal?: AbortSignal;
  }): Promise<{ vocals?: Float32Array[]; instrumental?: Float32Array[] }> {
    const jobId = newId();
    const requestId = newId();
    const w = this.ensureWorker();

    return new Promise((resolve, reject) => {
      if (opts.signal?.aborted) {
        reject(new Error('ABORTED'));
        return;
      }

      const onAbort = () => {
        w.postMessage({ type: 'CANCEL', requestId: newId(), jobId });
        // hard terminate if still running after 8s
        setTimeout(() => {
          if (this.jobs.has(jobId)) {
            this.terminateAndReset();
            reject(new Error('CANCELLED (terminated)'));
          }
        }, 8_000);
      };
      opts.signal?.addEventListener('abort', onAbort, { once: true });

      this.jobs.set(jobId, {
        onProgress: opts.onJobProgress,
        resolve: (v) => {
          opts.signal?.removeEventListener('abort', onAbort);
          resolve(v);
        },
        reject: (e) => {
          opts.signal?.removeEventListener('abort', onAbort);
          reject(e);
        },
      });

      const msg: WorkerRequest = {
        type: 'SEPARATE',
        requestId,
        jobId,
        sampleRate: opts.sampleRate,
        channels: opts.channels,
        options: opts.options,
      };
      if (opts.transfer && opts.transfer.length) {
        w.postMessage(msg, opts.transfer);
      } else {
        w.postMessage(msg);
      }
    });
  }

  cancelJob(jobId?: string): void {
    const w = this.worker;
    if (!w) return;
    w.postMessage({
      type: 'CANCEL',
      requestId: newId(),
      jobId,
    });
  }

  terminateAndReset(): void {
    this.rejectAll('Worker terminated');
    try {
      this.worker?.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this._status = 'NOT_INITIALIZED';
    this._modelReady = false;
    this._provider = 'unknown';
  }

  async dispose(): Promise<void> {
    if (!this.worker) {
      this._status = 'DISPOSED';
      return;
    }
    try {
      await this.send({ type: 'DISPOSE', requestId: newId() }, 5_000);
    } catch {
      /* ignore */
    }
    try {
      this.worker.terminate();
    } catch {
      /* ignore */
    }
    this.worker = null;
    this.pending.clear();
    this.jobs.clear();
    this._status = 'DISPOSED';
    this._provider = 'unknown';
    this._modelReady = false;
  }
}

export const ortRuntimeClient = new OrtRuntimeClient();
