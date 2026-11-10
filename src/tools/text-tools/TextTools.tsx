import { useMemo, useState } from 'react';
import { copyText } from '../../utils';

const CASES: Record<string, (s: string) => string> = {
  'HURUF BESAR': (s) => s.toUpperCase(),
  'huruf kecil': (s) => s.toLowerCase(),
  'Title Case': (s) => s.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()),
  'Sentence case': (s) => s.toLowerCase().replace(/(^\s*|[.!?]\s+)(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()),
  'iNVERT cASE': (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join(''),
};

function stats(t: string) {
  const seg = typeof Intl.Segmenter === 'function';
  return {
    Karakter: seg ? [...new Intl.Segmenter().segment(t)].length : [...t].length,
    'Tanpa spasi': [...t.replace(/\s/g, '')].length,
    Kata: seg
      ? [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(t)].filter((s) => s.isWordLike).length
      : (t.match(/\S+/g) ?? []).length,
    Kalimat: t.split(/[.!?…]+/).filter((s) => s.trim()).length,
    Paragraf: t.split(/\n\s*\n/).filter((s) => s.trim()).length,
    Baris: t ? t.split(/\r?\n/).length : 0,
  };
}

export default function TextTools() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState(Object.keys(CASES)[0]);
  const [note, setNote] = useState('');
  const s = useMemo(() => stats(text), [text]);
  const result = CASES[mode](text);
  const copy = async (v: string) => { setNote((await copyText(v)) ? 'Tersalin ✓' : 'Gagal menyalin'); setTimeout(() => setNote(''), 1500); };

  return (
    <div className="stack">
      <label>Teks<textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tempel atau ketik teks di sini" /></label>
      <div className="stats">{Object.entries(s).map(([k, v]) => <div key={k}><b>{v}</b><span>{k}</span></div>)}</div>
      <div className="row">
        <button className="btn" disabled={!text} onClick={() => copy(text)}>Salin teks</button>
        <button className="btn" disabled={!text} onClick={() => setText('')}>Hapus teks</button>
      </div>
      <label>Ubah huruf
        <select value={mode} onChange={(e) => setMode(e.target.value)}>{Object.keys(CASES).map((k) => <option key={k}>{k}</option>)}</select>
      </label>
      <label>Hasil<textarea rows={4} readOnly value={result} /></label>
      <div className="row">
        <button className="btn primary" disabled={!text} onClick={() => copy(result)}>Salin hasil</button>
        <button className="btn" disabled={!text} onClick={() => setText(result)}>Ganti teks asli</button>
      </div>
      {note && <p className="ok" role="status">{note}</p>}
    </div>
  );
}
