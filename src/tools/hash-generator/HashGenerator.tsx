import { useState } from 'react';
import Copy from '../Copy';
import { hashBytes } from '../../lib/dev';
import { fmtSize } from '../../utils';

const ALGS = ['SHA-256', 'SHA-384', 'SHA-512', 'MD5'];
const MAX = 100 * 1048576;

export default function HashGenerator() {
  const [file, setFile] = useState(false);
  const [text, setText] = useState('');
  const [f, setF] = useState<File | null>(null);
  const [alg, setAlg] = useState('SHA-256');
  const [res, setRes] = useState<{ alg: string; value: string; type: string; size: number } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function run() {
    setErr(''); setRes(null); setBusy(true);
    try {
      if (file) {
        if (!f) throw new Error('Pilih file dulu.');
        if (f.size > MAX) throw new Error('File lebih dari 100 MB. Batas ini menjaga memori HP.');
        const buf = new Uint8Array(await f.arrayBuffer());
        setRes({ alg, value: await hashBytes(alg, buf), type: 'File', size: f.size });
      } else {
        const b = new TextEncoder().encode(text);
        setRes({ alg, value: await hashBytes(alg, b), type: 'Teks (UTF-8)', size: b.length });
      }
    } catch (e) { setErr((e as Error).message || 'Gagal menghitung hash.'); }
    setBusy(false);
  }

  return (
    <div className="stack">
      <div className="row">
        <button className={'btn' + (!file ? ' primary' : '')} onClick={() => { setFile(false); setRes(null); }}>Teks</button>
        <button className={'btn' + (file ? ' primary' : '')} onClick={() => { setFile(true); setRes(null); }}>File</button>
      </div>
      {file
        ? <label className="drop"><input type="file" hidden onChange={(e) => { setF(e.target.files?.[0] ?? null); setRes(null); }} />{f ? `${f.name} (${fmtSize(f.size)})` : 'Ketuk untuk memilih file (maks 100 MB)'}</label>
        : <label>Teks<textarea className="mono" rows={5} value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} /></label>}
      <label>Algoritma<select value={alg} onChange={(e) => { setAlg(e.target.value); setRes(null); }}>{ALGS.map((a) => <option key={a}>{a}</option>)}</select></label>
      {alg === 'MD5' && <p className="er" role="note">MD5 tidak aman untuk kebutuhan keamanan kriptografis dan tidak boleh dipakai untuk hashing password atau verifikasi keamanan modern. Pakai hanya untuk checksum lama.</p>}
      <button className="btn primary" disabled={busy} onClick={run}>{busy ? 'Menghitung…' : 'Hitung hash'}</button>
      {err && <p className="er" role="alert">{err}</p>}
      {res && (
        <div className="result" role="status">
          <p className="muted">{res.alg} · {res.type} · {fmtSize(res.size)}</p>
          <p className="mono big" style={{ fontSize: '1rem' }}>{res.value}</p>
          <div className="row"><Copy text={res.value} label="Salin hash" primary /><button className="btn" onClick={() => { setRes(null); setText(''); setF(null); }}>Hapus</button></div>
        </div>
      )}
    </div>
  );
}
