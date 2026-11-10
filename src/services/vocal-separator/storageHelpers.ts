/**
 * Storage helpers for Vocal Separator (22B-2).
 * persist() + estimate(); safe when API missing.
 */

export interface StorageEstimate {
  usage: number;
  quota: number;
  usageLabel: string;
  quotaLabel: string;
  persisted: boolean | null; // null = API missing
}

function fmtBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getStorageEstimate(
  storage: StorageManager | undefined = typeof navigator !== 'undefined'
    ? navigator.storage
    : undefined,
): Promise<StorageEstimate> {
  const empty: StorageEstimate = {
    usage: 0,
    quota: 0,
    usageLabel: '—',
    quotaLabel: '—',
    persisted: null,
  };
  if (!storage) return empty;

  let usage = 0;
  let quota = 0;
  try {
    if (typeof storage.estimate === 'function') {
      const est = await storage.estimate();
      usage = est.usage ?? 0;
      quota = est.quota ?? 0;
    }
  } catch {
    /* ignore */
  }

  let persisted: boolean | null = null;
  try {
    if (typeof storage.persisted === 'function') {
      persisted = await storage.persisted();
    }
  } catch {
    persisted = null;
  }

  return {
    usage,
    quota,
    usageLabel: fmtBytes(usage),
    quotaLabel: fmtBytes(quota),
    persisted,
  };
}

/**
 * Request persistent storage before large model download.
 * Returns false if denied/unsupported — caller must not treat as error.
 */
export async function requestPersistentStorage(
  storage: StorageManager | undefined = typeof navigator !== 'undefined'
    ? navigator.storage
    : undefined,
): Promise<boolean> {
  if (!storage || typeof storage.persist !== 'function') return false;
  try {
    return await storage.persist();
  } catch {
    return false;
  }
}
