import type { EngineStatus } from '../types/engine';

export const ENGINE_STATUS_LABEL: Record<EngineStatus, string> = {
  NOT_DOWNLOADED: 'Belum diunduh',
  DOWNLOADING: 'Mengunduh',
  READY_OFFLINE: 'Siap offline',
  PROCESSING: 'Memproses',
  ERROR: 'Galat',
};
