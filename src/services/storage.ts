/** Local preferences, favorites, and usage history. No server, no sensitive content. */

const FAV_KEY = 'tb_favorites';
const HIST_KEY = 'tb_history';
const SETTINGS_KEY = 'tb_settings';
const HIST_ENABLED_KEY = 'tb_history_enabled';
const MAX_HISTORY = 20;

export interface HistoryEntry {
  id: string;
  at: number;
}

export interface AppSettings {
  theme?: 'dark' | 'light';
  historyEnabled?: boolean;
  pomodoro?: {
    focusMin: number;
    shortMin: number;
    longMin: number;
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getFavorites(): string[] {
  const list = safeParse<string[]>(localStorage.getItem(FAV_KEY), []);
  return Array.from(new Set(list.filter((x) => typeof x === 'string')));
}

export function setFavorites(ids: string[]): void {
  const unique = Array.from(new Set(ids.filter((x) => typeof x === 'string')));
  localStorage.setItem(FAV_KEY, JSON.stringify(unique));
}

export function toggleFavorite(id: string): string[] {
  const cur = getFavorites();
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  setFavorites(next);
  return next;
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

export function isHistoryEnabled(): boolean {
  const v = localStorage.getItem(HIST_ENABLED_KEY);
  if (v === null) return true;
  return v === '1' || v === 'true';
}

export function setHistoryEnabled(on: boolean): void {
  localStorage.setItem(HIST_ENABLED_KEY, on ? '1' : '0');
}

export function getHistory(): HistoryEntry[] {
  const list = safeParse<HistoryEntry[]>(localStorage.getItem(HIST_KEY), []);
  return list
    .filter((e) => e && typeof e.id === 'string' && typeof e.at === 'number')
    .sort((a, b) => b.at - a.at)
    .slice(0, MAX_HISTORY);
}

export function recordToolOpen(id: string): void {
  if (!isHistoryEnabled()) return;
  const list = getHistory().filter((e) => e.id !== id);
  list.unshift({ id, at: Date.now() });
  localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

export function removeHistoryItem(id: string): void {
  const list = getHistory().filter((e) => e.id !== id);
  localStorage.setItem(HIST_KEY, JSON.stringify(list));
}

export function clearHistory(): void {
  localStorage.removeItem(HIST_KEY);
}

export function getSettings(): AppSettings {
  return safeParse<AppSettings>(localStorage.getItem(SETTINGS_KEY), {});
}

export function setSettings(partial: Partial<AppSettings>): void {
  const cur = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...cur, ...partial }));
}

export interface BackupPayload {
  app: string;
  backupVersion: number;
  exportedAt: string;
  settings: AppSettings;
  favorites: string[];
  history: HistoryEntry[];
  historyEnabled: boolean;
  theme?: string;
}

export function buildBackup(includeHistory: boolean): BackupPayload {
  const theme = document.documentElement.dataset.theme || localStorage.getItem('theme') || 'dark';
  return {
    app: 'Toolbox Offline',
    backupVersion: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    favorites: getFavorites(),
    history: includeHistory ? getHistory() : [],
    historyEnabled: isHistoryEnabled(),
    theme,
  };
}

export function validateBackup(data: unknown): { ok: true; payload: BackupPayload } | { ok: false; error: string } {
  if (!data || typeof data !== 'object') return { ok: false, error: 'File bukan objek JSON valid.' };
  const d = data as Record<string, unknown>;
  if (d.app !== 'Toolbox Offline') return { ok: false, error: 'Bukan backup Toolbox Offline.' };
  if (typeof d.backupVersion !== 'number' || d.backupVersion < 1) return { ok: false, error: 'Versi backup tidak didukung.' };
  if (!Array.isArray(d.favorites)) return { ok: false, error: 'Field favorites tidak valid.' };
  return {
    ok: true,
    payload: {
      app: 'Toolbox Offline',
      backupVersion: d.backupVersion as number,
      exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : '',
      settings: (d.settings && typeof d.settings === 'object' ? d.settings : {}) as AppSettings,
      favorites: (d.favorites as string[]).filter((x) => typeof x === 'string'),
      history: Array.isArray(d.history)
        ? (d.history as HistoryEntry[]).filter((e) => e && typeof e.id === 'string' && typeof e.at === 'number')
        : [],
      historyEnabled: d.historyEnabled !== false,
      theme: typeof d.theme === 'string' ? d.theme : undefined,
    },
  };
}

/** Atomic-ish restore: validate first, then write. */
export function applyBackup(payload: BackupPayload): void {
  setFavorites(payload.favorites);
  if (payload.history.length) {
    localStorage.setItem(HIST_KEY, JSON.stringify(payload.history.slice(0, MAX_HISTORY)));
  }
  setHistoryEnabled(payload.historyEnabled);
  if (payload.settings && Object.keys(payload.settings).length) {
    setSettings(payload.settings);
  }
  if (payload.theme === 'dark' || payload.theme === 'light') {
    document.documentElement.dataset.theme = payload.theme;
    try {
      localStorage.setItem('theme', payload.theme);
    } catch {
      /* ignore */
    }
  }
}
