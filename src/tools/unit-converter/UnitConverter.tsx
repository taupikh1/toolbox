import { useState } from 'react';
import { TEMPS, UNITS, convert } from './convert';
import { copyText } from '../../utils';

const CATS = [...Object.keys(UNITS), 'Suhu'];
const unitsOf = (c: string) => (c === 'Suhu' ? TEMPS : Object.keys(UNITS[c]));

export default function UnitConverter() {
  const [cat, setCat] = useState(CATS[0]);
  const [val, setVal] = useState('1');
  const [from, setFrom] = useState(unitsOf(CATS[0])[0]);
  const [to, setTo] = useState(unitsOf(CATS[0])[1]);
  const [note, setNote] = useState('');

  const onCat = (c: string) => { setCat(c); const u = unitsOf(c); setFrom(u[0]); setTo(u[1]); };
  const n = Number(val.replace(',', '.'));
  const valid = val.trim() !== '' && Number.isFinite(n);
  const text = valid
    ? Number(convert(cat, n, from, to).toPrecision(12)).toLocaleString('id-ID', { maximumFractionDigits: 10 })
    : '';
  const copy = async () => { setNote((await copyText(text)) ? 'Tersalin ✓' : 'Gagal menyalin'); setTimeout(() => setNote(''), 1500); };
  const opts = (u: string[]) => u.map((x) => <option key={x}>{x}</option>);

  return (
    <div className="stack">
      <label>Kategori<select value={cat} onChange={(e) => onCat(e.target.value)}>{opts(CATS)}</select></label>
      <label>Nilai<input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} aria-invalid={!valid} /></label>
      {!valid && <p className="er" role="alert">Masukkan angka yang valid.</p>}
      <div className="row">
        <label>Dari<select value={from} onChange={(e) => setFrom(e.target.value)}>{opts(unitsOf(cat))}</select></label>
        <button className="btn" aria-label="Tukar satuan" onClick={() => { setFrom(to); setTo(from); }}>⇄ Tukar</button>
        <label>Ke<select value={to} onChange={(e) => setTo(e.target.value)}>{opts(unitsOf(cat))}</select></label>
      </div>
      {valid && <p className="big" aria-live="polite">{text} {to}</p>}
      <button className="btn primary" disabled={!valid} onClick={copy}>Salin hasil</button>
      {note && <p className="ok" role="status">{note}</p>}
    </div>
  );
}
