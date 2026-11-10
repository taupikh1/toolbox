import { useState } from 'react';
import Copy from '../Copy';

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export default function TimestampConverter() {
  const [ts, setTs] = useState('');
  const [u, setU] = useState('auto');
  const [dt, setDt] = useState('');
  const n = Number(ts);
  const valid = ts.trim() !== '' && Number.isFinite(n);
  const unit = u === 'auto' ? (Math.abs(n) < 1e11 ? 's' : 'ms') : u;
  const d = new Date(unit === 's' ? n * 1000 : n);
  const ok = valid && !isNaN(d.getTime());
  const d2 = dt ? new Date(dt) : null;
  const ok2 = d2 !== null && !isNaN(d2.getTime());
  const rows: [string, string][] = ok ? [
    ['UTC', d.toUTCString()],
    [`Lokal (${tz})`, d.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' })],
    ['ISO 8601', d.toISOString()],
    ['Unix detik', String(Math.floor(d.getTime() / 1000))],
    ['Unix milidetik', String(d.getTime())],
  ] : [];
  return (
    <div className="stack">
      <div className="row">
        <button className="btn primary" onClick={() => { setTs(String(Math.floor(Date.now() / 1000))); setU('s'); }}>Sekarang</button>
        <button className="btn" onClick={() => { setTs('1700000000'); setU('auto'); }}>Contoh</button>
        <button className="btn" onClick={() => { setTs(''); setDt(''); }}>Hapus</button>
      </div>
      <div className="row">
        <label>Unix timestamp<input inputMode="numeric" value={ts} onChange={(e) => setTs(e.target.value)} aria-invalid={ts !== '' && !ok} /></label>
        <label>Satuan<select value={u} onChange={(e) => setU(e.target.value)}><option value="auto">Otomatis</option><option value="s">Detik</option><option value="ms">Milidetik</option></select></label>
      </div>
      {ts.trim() !== '' && !ok && <p className="er" role="alert">{valid ? 'Di luar batas tanggal JavaScript (±8,64e15 ms).' : 'Timestamp harus berupa angka.'}</p>}
      {ok && u === 'auto' && <p className="muted">Terdeteksi sebagai {unit === 's' ? 'detik' : 'milidetik'} (nilai {unit === 's' ? 'di bawah' : 'di atas'} 1e11). Ubah satuan jika tidak sesuai.</p>}
      {rows.map(([k, v]) => <div className="thumb" key={k}><span><small className="muted">{k}</small><br />{v}</span><Copy text={v} /></div>)}
      <hr />
      <label>Tanggal dan waktu (zona {tz})<input type="datetime-local" step={1} value={dt} onChange={(e) => setDt(e.target.value)} /></label>
      {ok2 && d2 && (
        <>
          {[['Unix detik', String(Math.floor(d2.getTime() / 1000))], ['Unix milidetik', String(d2.getTime())], ['ISO 8601 (UTC)', d2.toISOString()]].map(([k, v]) => (
            <div className="thumb" key={k}><span><small className="muted">{k}</small><br />{v}</span><Copy text={v} /></div>
          ))}
          <button className="btn" onClick={() => { setTs(String(Math.floor(d2.getTime() / 1000))); setU('s'); }}>Pakai di konverter atas</button>
        </>
      )}
      <button className="btn" onClick={() => setDt(toLocalInput(new Date()))}>Isi waktu sekarang</button>
    </div>
  );
}
