import { useState } from 'react';
import {
  applyBackup,
  buildBackup,
  getFavorites,
  getHistory,
  isHistoryEnabled,
  validateBackup,
  type BackupPayload,
} from '../../services/storage';

export default function BackupRestore() {
  const [includeHistory, setIncludeHistory] = useState(true);
  const [summary, setSummary] = useState<BackupPayload | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const exportJson = () => {
    setErr('');
    const payload = buildBackup(includeHistory);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `toolbox-offline-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('Backup diunduh.');
  };

  const onImportFile = async (file: File | null) => {
    setErr('');
    setMsg('');
    setSummary(null);
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateBackup(data);
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      setSummary(result.payload);
    } catch {
      setErr('File JSON tidak valid atau rusak.');
    }
  };

  const confirmRestore = () => {
    if (!summary) return;
    applyBackup(summary);
    setMsg('Pengaturan berhasil dipulihkan. Muat ulang jika tema belum berubah.');
    setSummary(null);
  };

  return (
    <div className="tool">
      <p className="muted">
        Ekspor dan impor preferensi lokal (tema, favorit, riwayat, pengaturan Pomodoro). Tidak menyertakan file atau password yang dihasilkan.
      </p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <b>Export</b>
        <label className="chk" style={{ margin: '0.5rem 0' }}>
          <input type="checkbox" checked={includeHistory} onChange={(e) => setIncludeHistory(e.target.checked)} />
          Sertakan usage history
        </label>
        <p className="muted" style={{ fontSize: '0.85rem' }}>
          Favorit saat ini: {getFavorites().length} · Riwayat: {getHistory().length} · History aktif:{' '}
          {isHistoryEnabled() ? 'ya' : 'tidak'}
        </p>
        <button className="btn primary" onClick={exportJson}>
          Unduh backup JSON
        </button>
      </div>

      <div className="card">
        <b>Import</b>
        <label style={{ marginTop: '0.5rem' }}>
          Pilih file backup
          <input type="file" accept="application/json,.json" onChange={(e) => void onImportFile(e.target.files?.[0] ?? null)} />
        </label>

        {summary && (
          <div style={{ marginTop: '0.75rem' }}>
            <p>
              <b>Ringkasan backup</b>
            </p>
            <ul className="muted" style={{ margin: '0.25rem 0 0.75rem', paddingLeft: '1.2rem' }}>
              <li>Versi: {summary.backupVersion}</li>
              <li>Diekspor: {summary.exportedAt || '—'}</li>
              <li>Favorit: {summary.favorites.length}</li>
              <li>Riwayat: {summary.history.length}</li>
              <li>Tema: {summary.theme || '—'}</li>
            </ul>
            <p className="er">Restore akan menimpa favorit dan pengaturan saat ini.</p>
            <div className="row" style={{ gap: '0.5rem' }}>
              <button className="btn primary" onClick={confirmRestore}>
                Ya, restore
              </button>
              <button className="btn" onClick={() => setSummary(null)}>
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && <p className="ok">{msg}</p>}
      {err && <p className="er">{err}</p>}
    </div>
  );
}
