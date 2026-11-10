import { useEffect, useState } from 'react';

interface Estimate {
  usage?: number;
  quota?: number;
}

function fmt(n?: number): string {
  if (n == null || !Number.isFinite(n)) return 'Tidak diketahui';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export default function StorageManager() {
  const [est, setEst] = useState<Estimate | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    try {
      if (navigator.storage?.estimate) {
        const e = await navigator.storage.estimate();
        setEst({ usage: e.usage, quota: e.quota });
      } else {
        setEst({});
      }
    } catch {
      setEst({});
    }
  }

  useEffect(() => {
    refresh();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  async function clearAppCache() {
    if (!confirm('Hapus cache aplikasi? Aset inti akan diunduh ulang saat online.')) return;
    try {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      setMsg('Cache aplikasi dihapus.');
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal menghapus cache.');
    }
  }

  return (
    <div className="storage-mgr">
      <h2>Penyimpanan & Offline</h2>
      <p className="muted">Status: {online ? 'Online' : 'Offline'}</p>
      <div className="dc-meta">
        <div>
          <dt>Terpakai</dt>
          <dd>{fmt(est?.usage)}</dd>
        </div>
        <div>
          <dt>Kuota</dt>
          <dd>{fmt(est?.quota)}</dd>
        </div>
      </div>
      <p className="muted">
        Angka berasal dari navigator.storage.estimate() jika tersedia. Jika tidak, ditampilkan “Tidak diketahui”.
      </p>
      <button type="button" className="btn" onClick={refresh}>Segarkan</button>
      <button type="button" className="btn" onClick={clearAppCache}>Hapus cache aplikasi</button>
      {msg && <p className="muted">{msg}</p>}
      <p className="muted" style={{ marginTop: '.5rem' }}>
        Penghapusan hanya memengaruhi Cache Storage aplikasi. Pengaturan dan riwayat di localStorage tidak dihapus.
      </p>
    </div>
  );
}
