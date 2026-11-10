import { FFmpeg } from '@ffmpeg/ffmpeg';

const CACHE_NAME = 'ffmpeg-core-v0.12.10';
const CORE_VERSION = '0.12.10';
const BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

export type ModuleStatus = 'not-downloaded' | 'downloading' | 'initializing' | 'ready' | 'error';

export interface DownloadProgress {
  loaded: number;
  total: number;
  asset: string;
}

type StatusListener = (status: ModuleStatus, message?: string) => void;
type ProgressListener = (p: DownloadProgress) => void;

class FFmpegManager {
  private ffmpeg: FFmpeg | null = null;
  private status: ModuleStatus = 'not-downloaded';
  private listeners = new Set<StatusListener>();
  private progressListeners = new Set<ProgressListener>();
  private loadPromise: Promise<boolean> | null = null;
  private abortController: AbortController | null = null;

  getStatus() { return this.status; }

  subscribe(fn: StatusListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  subscribeProgress(fn: ProgressListener) {
    this.progressListeners.add(fn);
    return () => this.progressListeners.delete(fn);
  }

  private setStatus(s: ModuleStatus, msg?: string) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s, msg));
  }

  private emitProgress(p: DownloadProgress) {
    this.progressListeners.forEach((fn) => fn(p));
  }

  async checkCached(): Promise<boolean> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      return keys.some((k) => k.url.includes('ffmpeg-core.js')) && keys.some((k) => k.url.includes('ffmpeg-core.wasm'));
    } catch {
      return false;
    }
  }

  async deleteCache(): Promise<void> {
    try {
      await caches.delete(CACHE_NAME);
      this.ffmpeg = null;
      this.setStatus('not-downloaded');
    } catch {
      /* ignore */
    }
  }

  async downloadAndInit(): Promise<boolean> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this._downloadAndInit();
    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async fetchWithProgress(url: string, asset: string, signal: AbortSignal): Promise<Blob> {
    const res = await fetch(url, { signal });
    if (!res.ok || !res.body) throw new Error(`Gagal unduh ${asset}`);
    const total = Number(res.headers.get('content-length') || 0);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total) this.emitProgress({ loaded, total, asset });
    }
    return new Blob(chunks, { type: res.headers.get('content-type') || 'application/octet-stream' });
  }

  private async _downloadAndInit(): Promise<boolean> {
    this.abortController = new AbortController();
    this.setStatus('downloading', 'Mengunduh modul FFmpeg...');

    try {
      const cache = await caches.open(CACHE_NAME);
      const assets = [
        { name: 'ffmpeg-core.js', url: `${BASE_URL}/ffmpeg-core.js` },
        { name: 'ffmpeg-core.wasm', url: `${BASE_URL}/ffmpeg-core.wasm` },
      ];

      const urls: Record<string, string> = {};

      for (const asset of assets) {
        let response = await cache.match(asset.url);
        let blob: Blob;
        if (response) {
          blob = await response.blob();
        } else {
          blob = await this.fetchWithProgress(asset.url, asset.name, this.abortController.signal);
          await cache.put(asset.url, new Response(blob));
        }
        urls[asset.name] = URL.createObjectURL(blob);
      }

      this.setStatus('initializing', 'Menginisialisasi FFmpeg...');

      this.ffmpeg = new FFmpeg();
      await this.ffmpeg.load({
        coreURL: urls['ffmpeg-core.js'],
        wasmURL: urls['ffmpeg-core.wasm'],
      });

      this.setStatus('ready', 'Modul siap digunakan');
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.setStatus('not-downloaded', 'Download dibatalkan');
      } else {
        this.setStatus('error', e.message || 'Gagal memuat modul');
      }
      return false;
    }
  }

  cancelDownload() {
    this.abortController?.abort();
  }

  isReady() {
    return this.status === 'ready' && this.ffmpeg !== null;
  }

  async exec(args: string[], onProgress?: (ratio: number) => void): Promise<void> {
    if (!this.ffmpeg || !this.isReady()) throw new Error('FFmpeg belum siap');
    if (onProgress) {
      const handler = ({ progress }: { progress: number }) => onProgress(Math.min(1, Math.max(0, progress)));
      this.ffmpeg.on('progress', handler);
      try {
        await this.ffmpeg.exec(args);
      } finally {
        this.ffmpeg.off('progress', handler);
      }
    } else {
      await this.ffmpeg.exec(args);
    }
  }

  async writeFile(name: string, data: Uint8Array | Blob) {
    if (!this.ffmpeg) throw new Error('FFmpeg not ready');
    const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    await this.ffmpeg.writeFile(name, bytes);
  }

  async readFile(name: string): Promise<Uint8Array> {
    if (!this.ffmpeg) throw new Error('FFmpeg not ready');
    const data = await this.ffmpeg.readFile(name);
    return data as Uint8Array;
  }

  async deleteFile(name: string) {
    try {
      await this.ffmpeg?.deleteFile(name);
    } catch { /* ignore */ }
  }

  getInstance() {
    return this.ffmpeg;
  }
}

export const ffmpegManager = new FFmpegManager();
