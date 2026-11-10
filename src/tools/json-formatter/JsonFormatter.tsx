import { useMemo, useState } from 'react';
import Copy from '../Copy';
import { jsonError } from '../../lib/dev';
import { fmtSize, saveBlob } from '../../utils';

const SAMPLE = '{"nama":"Toolbox","versi":2,"aktif":true,"tag":["json","offline"],"catatan":null,"pengaturan":{"tema":"gelap","batas":10.5}}';
const MAX = 2_000_000;

function Node({ k, v, d }: { k?: string; v: unknown; d: number }) {
  const label = k !== undefined ? <b>{k}: </b> : null;
  if (v === null || typeof v !== 'object')
    return <div className="mono">{label}<span>{JSON.stringify(v)}</span> <small className="muted">{v === null ? 'null' : typeof v}</small> <Copy small label="Salin" text={typeof v === 'string' ? v : JSON.stringify(v)} /></div>;
  const ent: [string, unknown][] = Array.isArray(v) ? v.map((x, i) => [String(i), x]) : Object.entries(v);
  return (
    <details open={d < 1}>
      <summary className="mono">{label}{Array.isArray(v) ? `Array(${ent.length})` : `Object(${ent.length})`}</summary>
      <div className="kids">
        <Copy small label="Salin objek" text={JSON.stringify(v, null, 2)} />
        {ent.slice(0, 200).map(([kk, x]) => <Node key={kk} k={kk} v={x} d={d + 1} />)}
        {ent.length > 200 && <p className="muted">…{ent.length - 200} item lain tidak ditampilkan</p>}
      </div>
    </details>
  );
}

export default function JsonFormatter() {
  const [text, setText] = useState('');
  const [indent, setIndent] = useState('2');
  const [out, setOut] = useState('');
  const [tree, setTree] = useState(false);
  const res = useMemo(() => {
    if (!text.trim()) return { empty: true as const };
    if (text.length > MAX) return { error: 'Input terlalu besar (maks 2 juta karakter).' };
    try { return { value: JSON.parse(text) as unknown }; } catch (e) { return { error: jsonError(text, e) }; }
  }, [text]);
  const value = 'value' in res ? res.value : undefined;
  const run = (min: boolean) => { if ('value' in res) setOut(JSON.stringify(res.value, null, min ? 0 : indent === 'tab' ? '\t' : +indent)); };

  return (
    <div className="stack">
      <div className="cols">
        <label>Input JSON
          <textarea className="mono" rows={12} value={text} onChange={(e) => { setText(e.target.value); setOut(''); }} spellCheck={false} placeholder="Tempel JSON di sini" />
          <small>{text.length.toLocaleString('id-ID')} karakter, {fmtSize(new Blob([text]).size)}</small>
        </label>
        <label>Output
          <textarea className="mono" rows={12} value={out} readOnly />
          <small>{out.length.toLocaleString('id-ID')} karakter</small>
        </label>
      </div>
      {'error' in res && <p className="er" role="alert">JSON tidak valid: {res.error}</p>}
      {'value' in res && <p className="ok" role="status">JSON valid ✓</p>}
      <div className="row">
        <label>Indentasi<select value={indent} onChange={(e) => setIndent(e.target.value)}><option value="2">2 spasi</option><option value="4">4 spasi</option><option value="tab">Tab</option></select></label>
        <button className="btn primary" disabled={!('value' in res)} onClick={() => run(false)}>Format</button>
        <button className="btn" disabled={!('value' in res)} onClick={() => run(true)}>Minify</button>
      </div>
      <div className="row">
        <button className="btn" onClick={() => { setText(SAMPLE); setOut(''); }}>Contoh</button>
        <button className="btn" onClick={() => { setText(''); setOut(''); }} disabled={!text}>Hapus</button>
        <Copy text={out} label="Salin output" />
        <button className="btn" disabled={!out} onClick={() => saveBlob(new Blob([out], { type: 'application/json' }), 'data.json')}>Unduh .json</button>
        <button className="btn" disabled={!('value' in res) || text.length > 200_000} onClick={() => setTree(!tree)}>{tree ? 'Tutup tree' : 'Tree view'}</button>
      </div>
      {tree && value !== undefined && <div className="treebox"><Node v={value} d={0} /></div>}
      <p className="muted">Di tree view, tiap nilai bisa disalin. Validasi hanya sintaks JSON (bukan JSON Schema). Angka di luar presisi JavaScript bisa berubah, dan 1.0 ditulis ulang menjadi 1.</p>
    </div>
  );
}
