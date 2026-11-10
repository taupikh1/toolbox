import { useMemo, useState } from 'react';
import Copy from '../Copy';

const MODES: Record<string, [(s: string) => string, string]> = {
  'Encode Component': [encodeURIComponent, 'Untuk satu nilai (mis. isi parameter query). Spasi, &, =, ?, / ikut di-encode.'],
  'Decode Component': [decodeURIComponent, 'Kebalikan Encode Component. Semua %XX didecode.'],
  'Encode URI': [encodeURI, 'Untuk URL utuh. Karakter struktur seperti : / ? & = # dibiarkan.'],
  'Decode URI': [decodeURI, 'Kebalikan Encode URI. Karakter struktur yang ter-encode tidak didecode.'],
};

export default function UrlCodec() {
  const [mode, setMode] = useState('Encode Component');
  const [text, setText] = useState('');
  const r = useMemo(() => {
    try { return { out: text ? MODES[mode][0](text) : '' }; } catch { return { out: '', err: 'URI tidak valid: ada urutan % yang rusak atau tidak lengkap.' }; }
  }, [text, mode]);
  return (
    <div className="stack">
      <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{Object.keys(MODES).map((m) => <option key={m}>{m}</option>)}</select></label>
      <p className="muted">{MODES[mode][1]}</p>
      <label>Input<textarea className="mono" rows={5} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} /></label>
      {r.err && <p className="er" role="alert">{r.err}</p>}
      <label>Output<textarea className="mono" rows={5} readOnly value={r.out} /></label>
      <div className="row">
        <Copy text={r.out} label="Salin output" primary />
        <button className="btn" disabled={!r.out} onClick={() => { setText(r.out); setMode(mode.startsWith('Encode') ? mode.replace('Encode', 'Decode') : mode.replace('Decode', 'Encode')); }}>⇄ Tukar</button>
        <button className="btn" onClick={() => setText('https://contoh.id/cari?q=kopi susu & roti&lang=id')}>Contoh</button>
        <button className="btn" disabled={!text} onClick={() => setText('')}>Hapus</button>
      </div>
      <p className="muted">Tidak ada decode berulang otomatis. Teks asli tidak diubah sampai kamu menekan Tukar.</p>
    </div>
  );
}
