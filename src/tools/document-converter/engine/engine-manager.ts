import { EngineError, type EngineDefinition, type EngineId, type EngineState } from '../types/engine';
import { ENGINE_DEFINITIONS } from '../registry/engine-registry';
import { DOCUMENT_LIMITS } from '../validation/file-limits';

/** Abstraksi penyimpanan agar manager bisa diuji tanpa browser. */
export interface EngineStorage {
  /** true hanya jika SEMUA aset engine benar-benar ada di cache lokal. */
  hasAll(def: EngineDefinition): Promise<boolean>;
  remove(def: EngineDefinition): Promise<void>;
}

/** Implementasi Cache Storage. Tanpa Cache API, engine dianggap tidak tersedia. */
export const cacheStorage: EngineStorage = {
  async hasAll(def) {
    if (typeof caches === 'undefined' || def.assets.length === 0) return false;
    const c = await caches.open(def.cacheName);
    for (const a of def.assets) if (!(await c.match(a.path))) return false;
    return true;
  },
  async remove(def) {
    if (typeof caches === 'undefined') throw new EngineError('STORAGE_UNAVAILABLE', 'Cache Storage tidak tersedia di peramban ini.');
    await caches.delete(def.cacheName);
  },
};

type Listener = () => void;

/**
 * Engine Manager (fondasi). Batch 1 hanya: memeriksa status dari cache nyata, menghapus cache,
 * dan menjaga satu pekerjaan berat pada satu waktu. Pengunduhan BELUM ada: tidak ada sumber aset
 * dan progres tidak boleh dikarang, jadi download() menolak dengan NO_SOURCE.
 */
export class EngineManager {
  private readonly defs = new Map<EngineId, EngineDefinition>();
  private readonly states = new Map<EngineId, EngineState>();
  private readonly listeners = new Set<Listener>();
  private active = 0;
  private activeController: AbortController | null = null;

  private readonly storage: EngineStorage;
  private readonly maxConcurrent: number;

  constructor(
    storage: EngineStorage = cacheStorage,
    defs: EngineDefinition[] = ENGINE_DEFINITIONS,
    maxConcurrent: number = DOCUMENT_LIMITS.maxConcurrentJobs,
  ) {
    this.storage = storage;
    this.maxConcurrent = maxConcurrent;
    for (const d of defs) {
      this.defs.set(d.id, d);
      this.states.set(d.id, { status: 'NOT_DOWNLOADED' });
    }
  }

  private def(id: EngineId): EngineDefinition {
    const d = this.defs.get(id);
    if (!d) throw new EngineError('UNKNOWN_ENGINE', `Engine tidak dikenal: ${id}`);
    return d;
  }

  private set(id: EngineId, s: EngineState) {
    this.states.set(id, s);
    this.listeners.forEach((l) => l());
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  list(): EngineDefinition[] {
    return [...this.defs.values()];
  }

  getState(id: EngineId): EngineState {
    this.def(id);
    return this.states.get(id)!;
  }

  /** Periksa kesiapan offline dari penyimpanan lokal. Tidak menyentuh jaringan. */
  async refresh(id: EngineId): Promise<EngineState> {
    const d = this.def(id);
    const cur = this.states.get(id)!;
    if (cur.status === 'PROCESSING' || cur.status === 'DOWNLOADING') return cur;
    try {
      const ready = await this.storage.hasAll(d);
      this.set(id, { status: ready ? 'READY_OFFLINE' : 'NOT_DOWNLOADED' });
    } catch (e) {
      this.set(id, { status: 'ERROR', error: e instanceof Error ? e.message : 'Gagal memeriksa penyimpanan.' });
    }
    return this.states.get(id)!;
  }

  async refreshAll(): Promise<void> {
    await Promise.all([...this.defs.keys()].map((id) => this.refresh(id)));
  }

  /** Belum diimplementasikan di Batch 1: tidak ada sumber aset yang terdaftar. */
  async download(id: EngineId): Promise<never> {
    const d = this.def(id);
    throw new EngineError('NO_SOURCE', `Pengunduhan ${d.name} belum tersedia: belum ada sumber aset lokal yang terdaftar.`);
  }

  async clearCache(id: EngineId): Promise<void> {
    const d = this.def(id);
    if (this.states.get(id)!.status === 'PROCESSING') throw new EngineError('BUSY', 'Engine sedang dipakai.');
    await this.storage.remove(d);
    this.set(id, { status: 'NOT_DOWNLOADED' });
  }

  /**
   * Jalankan pekerjaan berat secara eksklusif (batas: maxConcurrentJobs).
   * Engine hanya boleh diproses jika READY_OFFLINE. Pembatalan lewat AbortSignal.
   */
  async runExclusive<T>(id: EngineId, job: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.def(id);
    if (this.active >= this.maxConcurrent) throw new EngineError('BUSY', 'Masih ada proses berat yang berjalan. Tunggu sampai selesai.');
    const st = await this.refresh(id);
    if (st.status !== 'READY_OFFLINE') throw new EngineError('NO_SOURCE', 'Engine belum tersedia secara lokal.');
    this.active++;
    const ctrl = new AbortController();
    this.activeController = ctrl;
    this.set(id, { status: 'PROCESSING' });
    try {
      return await job(ctrl.signal);
    } finally {
      this.active--;
      this.activeController = null;
      this.set(id, { status: 'READY_OFFLINE' });
    }
  }

  /** Batalkan pekerjaan aktif jika pekerjaan tersebut menghormati AbortSignal. */
  cancelActive(): boolean {
    if (!this.activeController) return false;
    this.activeController.abort();
    return true;
  }

  get busy(): boolean {
    return this.active >= this.maxConcurrent;
  }
}

/** Instans bersama untuk seluruh Document Converter. */
export const engineManager = new EngineManager();
