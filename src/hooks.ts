import { useEffect, useState } from 'react';

export function useHashRoute() {
  const get = () => location.hash.replace(/^#/, '') || '/';
  const [route, set] = useState(get);
  useEffect(() => {
    const f = () => set(get());
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return route;
}

type Theme = 'dark' | 'light';
export function useTheme() {
  const [theme, set] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || 'dark');
  const toggle = () => {
    const n: Theme = theme === 'dark' ? 'light' : 'dark';
    set(n);
    document.documentElement.dataset.theme = n;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', n === 'dark' ? '#101114' : '#f5f6f8');
    try { localStorage.setItem('theme', n); } catch { /* tema tetap jalan tanpa penyimpanan */ }
  };
  return { theme, toggle };
}

// "ready" hanya true jika service worker sudah mengontrol halaman DAN precache berisi file.
export function useOffline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    addEventListener('online', on);
    addEventListener('offline', off);
    let stop = false;
    const check = async () => {
      try {
        const name = (await caches.keys()).find((n) => n.includes('precache'));
        if (name && navigator.serviceWorker.controller) {
          const keys = await (await caches.open(name)).keys();
          if (!stop && keys.length > 0) { setReady(true); return; }
        }
      } catch { /* cache API tidak tersedia */ }
      if (!stop) setTimeout(check, 1500);
    };
    void check();
    return () => { stop = true; removeEventListener('online', on); removeEventListener('offline', off); };
  }, []);
  return { online, ready };
}

/** Nilai media query yang selalu sinkron (mis. untuk membedakan drawer mobile dan sidebar desktop). */
export function useMediaQuery(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const f = () => setMatch(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, [query]);
  return match;
}
