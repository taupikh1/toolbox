/**
 * Model Manager for AI Vocal Separator.
 * Download-on-demand, SHA256 at download time, size+marker on check.
 * Worker loads model bytes from Cache Storage directly (no main-thread buffer).
 * Batch 22B: fixed P11 (no permanent modelBuffer / no full hash on open).
 */

import {
  PRIMARY_MODEL,
  MODEL_CACHE_NAME,
  type ModelStatus,
  type VocalSeparatorModel,
} from './modelRegistry';

export type ProgressCallback = (loaded: number, total: number) => void;
export type StatusCallback = (status: ModelStatus, message?: string) => void;

const LEGACY_MODEL_IDS = ['uvr-mdx-net-inst-hq-3'];

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

class VocalSeparatorModelManager {
  private status: ModelStatus = 'NOT_DOWNLOADED';
  private statusListeners = new Set<StatusCallback>();
  private progressListeners = new Set<ProgressCallback>();
  private abortController: AbortController | null = null;
  private loadPromise: Promise<boolean> | null = null;

  getStatus(): ModelStatus {
    return this.status;
  }

  getModelInfo(): VocalSeparatorModel {
    return PRIMARY_MODEL;
  }

  subscribeStatus(fn: StatusCallback): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  subscribeProgress(fn: ProgressCallback): () => void {
    this.progressListeners.add(fn);
    return () => this.progressListeners.delete(fn);
  }

  private setStatus(s: ModelStatus, msg?: string) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s, msg));
  }

  private emitProgress(loaded: number, total: number) {
    this.progressListeners.forEach((fn) => fn(loaded, total));
  }

  /**
   * Cheap check: existence + size + X-SHA256 marker (set at successful download).
   * Does NOT read 66 MB or hash on the main thread (P11 fix).
   * Full re-hash only via VERIFY_MODEL in the Worker.
   */
  async checkCached(): Promise<boolean> {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      // Model lama (sumbu waktu tetap, SHA berbeda) tidak dipakai lagi: bebaskan ~67 MB.
      for (const legacy of LEGACY_MODEL_IDS) {
        try {
          await cache.delete(legacy);
        } catch {
          /* ignore */
        }
      }
      const res = await cache.match(PRIMARY_MODEL.id);
      if (!res) {
        this.setStatus('NOT_DOWNLOADED');
        return false;
      }
      const sizeHeader = res.headers.get('Content-Length');
      const size = sizeHeader ? Number(sizeHeader) : (await res.clone().arrayBuffer()).byteLength;
      const marker = res.headers.get('X-SHA256');
      if (size !== PRIMARY_MODEL.sizeBytes) {
        this.setStatus('CORRUPTED', 'Ukuran file tidak cocok');
        return false;
      }
      if (!marker || marker.toLowerCase() !== PRIMARY_MODEL.sha256.toLowerCase()) {
        // Legacy cache without marker: treat as needs re-verify, not READY
        this.setStatus('CORRUPTED', 'Marker SHA hilang — unduh ulang atau Re-verify');
        return false;
      }
      this.setStatus('READY');
      return true;
    } catch {
      return false;
    }
  }

  async deleteModel(): Promise<void> {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      await cache.delete(PRIMARY_MODEL.id);
    } catch {
      /* ignore */
    }
    this.setStatus('NOT_DOWNLOADED');
  }

  cancelDownload(): void {
    this.abortController?.abort();
    this.abortController = null;
    this.setStatus('NOT_DOWNLOADED', 'Unduhan dibatalkan');
  }

  /** Download model, verify SHA256, store in Cache Storage. */
  async downloadAndVerify(): Promise<boolean> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._downloadAndVerify();
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async _downloadAndVerify(): Promise<boolean> {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    this.setStatus('DOWNLOADING');

    const urls = [PRIMARY_MODEL.url, PRIMARY_MODEL.mirrorUrl];
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, { signal, mode: 'cors' });
        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status} dari ${url}`);
        }

        const total = Number(res.headers.get('content-length') || PRIMARY_MODEL.sizeBytes);
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          this.emitProgress(loaded, total);
        }

        const buffer = new Uint8Array(loaded);
        let offset = 0;
        for (const c of chunks) {
          buffer.set(c, offset);
          offset += c.length;
        }

        this.setStatus('VERIFYING', 'Memverifikasi SHA256…');
        const hash = await sha256Hex(buffer.buffer);

        if (hash !== PRIMARY_MODEL.sha256) {
          console.warn(`[VocalSeparator] SHA mismatch from ${url}: ${hash.slice(0, 16)}… — try next`);
          lastError = new Error(`SHA256 mismatch from ${url}`);
          continue; // P19: try next mirror
        }

        if (buffer.byteLength !== PRIMARY_MODEL.sizeBytes) {
          console.warn(
            `[VocalSeparator] size ${buffer.byteLength} vs expected ${PRIMARY_MODEL.sizeBytes}`,
          );
        }

        // Release chunk references before storing
        chunks.length = 0;

        const cache = await caches.open(MODEL_CACHE_NAME);
        await cache.put(
          PRIMARY_MODEL.id,
          new Response(buffer.buffer, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(buffer.byteLength),
              'X-SHA256': hash,
              'X-Model-Id': PRIMARY_MODEL.id,
            },
          }),
        );

        // Do not keep modelBuffer on main thread (P11)
        this.setStatus('READY', 'Model siap digunakan');
        return true;
      } catch (e: unknown) {
        if ((e as Error).name === 'AbortError') {
          this.setStatus('NOT_DOWNLOADED', 'Dibatalkan');
          return false;
        }
        lastError = e as Error;
        console.warn(`[VocalSeparator] gagal dari ${url}:`, e);
      }
    }

    this.setStatus(
      'DOWNLOAD_FAILED',
      lastError?.message || 'Semua sumber unduhan gagal',
    );
    return false;
  }

}

export const vocalModelManager = new VocalSeparatorModelManager();
