import { useState } from 'react';
import Copy from '../Copy';
import { diff, mergeOps, type Op } from '../../lib/dev';

const SPLIT: Record<string, (s: string) => string[]> = {
  Baris: (s) => s.match(/[^\n]*\n|[^\n]+/g) ?? [],
  Kata: (s) => s.split(/(\s+)/).filter(Boolean),
  Karakter: (s) => [...s],
};
const SYM = { '+': '+ ', '-': '− ', '=': '  ' };

export default function TextDiff() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [mode, setMode] = useState('Baris');
  const [ops, setOps] = useState<Op[] | null>(null);
  const [err, setErr] = useState('');

  function go() {
    const r = diff(SPLIT[mode](a), SPLIT[mode](b));
    if (!r) { setOps(null); setErr('Teks terlalu besar untuk mode ini. Coba mode Baris atau perkecil teks.'); return; }
    setErr(''); setOps(r);
  }
  const added = ops?.filter((o) => o.t === '+').length ?? 0, removed = ops?.filter((o) => o.t === '-').length ?? 0;
  return (
    <div className="stack">
      <div className="cols">
        <label>Teks asli<textarea className="mono" rows={8} value={a} onChange={(e) => { setA(e.target.value); setOps(null); }} /></label>
        <label>Teks baru<textarea className="mono" rows={8} value={b} onChange={(e) => { setB(e.target.value); setOps(null); }} /></label>
      </div>
      <div className="row">
        <label>Mode<select value={mode} onChange={(e) => { setMode(e.target.value); setOps(null); }}>{Object.keys(SPLIT).map((m) => <option key={m}>{m}</option>)}</select></label>
        <button className="btn primary" onClick={go}>Bandingkan</button>
        <button className="btn" onClick={() => { setA(b); setB(a); setOps(null); }}>⇄ Tukar</button>
        <button className="btn" disabled={!a && !b} onClick={() => { setA(''); setB(''); setOps(null); }}>Hapus</button>
      </div>
      <div className="row"><Copy text={a} label="Salin asli" /><Copy text={b} label="Salin baru" /></div>
      {err && <p className="er" role="alert">{err}</p>}
      {ops && (
        <div role="status">
          <p>{added || removed ? `${added} ditambah (+), ${removed} dihapus (−), tingkat ${mode.toLowerCase()}.` : 'Kedua teks identik.'}</p>
          {mode === 'Baris'
            ? <pre className="out">{ops.map((o, i) => <div key={i} className={'d' + o.t}>{SYM[o.t]}{o.s.replace(/\n$/, '')}</div>)}</pre>
            : <pre className="out">{mergeOps(ops).map((o, i) => o.t === '+' ? <ins key={i} title="ditambah">{o.s}</ins> : o.t === '-' ? <del key={i} title="dihapus">{o.s}</del> : <span key={i}>{o.s}</span>)}</pre>}
          <p className="muted">Tambahan ditandai hijau dengan garis bawah (+), penghapusan merah dengan coretan (−).</p>
        </div>
      )}
    </div>
  );
}
