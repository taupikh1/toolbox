import { useState } from 'react';
import Copy from '../Copy';
import { buildPools, entropyBits, genPassword, strength, type PoolOpts } from '../../lib/dev';

const PRESETS: Record<string, [number, PoolOpts]> = {
  Basic: [12, { lower: true, upper: true, digit: true, symbol: false, noAmbig: false }],
  Strong: [16, { lower: true, upper: true, digit: true, symbol: true, noAmbig: false }],
  'Very Strong': [24, { lower: true, upper: true, digit: true, symbol: true, noAmbig: false }],
};
const NAMES: Record<string, string> = { lower: 'Huruf kecil', upper: 'Huruf besar', digit: 'Angka', symbol: 'Simbol', noAmbig: 'Hindari karakter mirip (I l 1 O 0 o |)' };
const secure = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';

export default function PasswordGenerator() {
  const [len, setLen] = useState(16);
  const [o, setO] = useState<PoolOpts>(PRESETS.Strong[1]);
  const [cnt, setCnt] = useState(1);
  const [list, setList] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const pools = buildPools(o), size = pools.join('').length;
  const bits = entropyBits(len, size);
  const gen = () => {
    try { setList(Array.from({ length: cnt }, () => genPassword(len, pools))); setErr(''); }
    catch (e) { setList([]); setErr((e as Error).message); }
  };
  if (!secure) return <p className="er" role="alert">Peramban ini tidak punya sumber acak yang aman (crypto.getRandomValues). Generator dinonaktifkan.</p>;

  return (
    <div className="stack">
      <div className="row">
        {Object.entries(PRESETS).map(([k, [l, p]]) => <button key={k} className="btn" onClick={() => { setLen(l); setO(p); }}>{k}</button>)}
      </div>
      <p className="muted">Basic: 12 karakter, huruf dan angka. Strong: 16 karakter, plus simbol. Very Strong: 24 karakter, plus simbol.</p>
      <label>Panjang: {len}<input type="range" min={4} max={128} value={len} onChange={(e) => setLen(+e.target.value)} /></label>
      {(Object.keys(NAMES) as (keyof PoolOpts)[]).map((k) => (
        <label key={k} className="chk"><input type="checkbox" checked={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.checked })} />&nbsp;{NAMES[k]}</label>
      ))}
      <label>Jumlah password (1 sampai 10)<input type="number" min={1} max={10} value={cnt} onChange={(e) => setCnt(Math.min(10, Math.max(1, +e.target.value)))} /></label>
      <p>Perkiraan kekuatan: <b>{size ? strength(bits) : '-'}</b> ({size ? bits.toFixed(0) : 0} bit)</p>
      <p className="muted">Entropi = panjang × log2(jumlah karakter), dengan asumsi pilihan acak seragam. Jaminan satu karakter per jenis menguranginya sedikit. Ini estimasi, bukan jaminan keamanan akun.</p>
      <button className="btn primary" onClick={gen}>{list.length ? 'Generate ulang' : 'Generate'}</button>
      {err && <p className="er" role="alert">{err}</p>}
      {list.map((p, i) => <div className="thumb" key={i}><span className="mono">{show ? p : '•'.repeat(p.length)}</span><Copy text={p} /></div>)}
      {list.length > 0 && (
        <div className="row">
          <button className="btn" onClick={() => setShow(!show)}>{show ? 'Sembunyikan' : 'Tampilkan'}</button>
          <button className="btn" onClick={() => setList([])}>Hapus hasil</button>
        </div>
      )}
      <p className="muted">Password tidak disimpan dan tidak dikirim ke mana pun. Hilang saat kamu menghapus hasil atau menutup halaman.</p>
    </div>
  );
}
