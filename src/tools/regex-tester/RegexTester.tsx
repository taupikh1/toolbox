import { useEffect, useRef, useState } from 'react';
import Copy from '../Copy';

interface M { i: number; s: string; g: (string | undefined)[]; n: Record<string, string> | null }
const SRC = `onmessage=e=>{const{p,f,t,max}=e.data;try{const r=new RegExp(p,f),out=[];let m;do{m=r.exec(t);if(!m)break;out.push({i:m.index,s:m[0],g:m.slice(1),n:m.groups?{...m.groups}:null});if(m[0]==='')r.lastIndex++}while(r.global&&out.length<max);postMessage({out})}catch(x){postMessage({error:String(x.message)})}}`;
const FLAGS = 'gimsuy';
const PRESETS: [string, string, string][] = [
  ['Email (dasar)', '[\\w.+-]+@[\\w-]+\\.[\\w.-]+', 'g'], ['URL (dasar)', 'https?:\\/\\/[^\\s/$.?#][^\\s]*', 'g'],
  ['Angka', '\\d+', 'g'], ['Huruf', '\\p{L}+', 'gu'], ['Spasi', '\\s+', 'g'], ['Telepon ID (dasar)', '(?:\\+62|0)8\\d{8,11}', 'g'],
];

function run(p: string, f: string, t: string): Promise<{ out?: M[]; error?: string; timeout?: boolean }> {
  return new Promise((res) => {
    const url = URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }));
    const w = new Worker(url);
    const done = (v: { out?: M[]; error?: string; timeout?: boolean }) => { clearTimeout(tm); w.terminate(); URL.revokeObjectURL(url); res(v); };
    const tm = setTimeout(() => done({ timeout: true }), 2000);
    w.onmessage = (e) => done(e.data);
    w.onerror = () => done({ error: 'Worker gagal berjalan.' });
    w.postMessage({ p, f, t, max: 1000 });
  });
}

export default function RegexTester() {
  const [p, setP] = useState('');
  const [f, setF] = useState('g');
  const [t, setT] = useState('');
  const [r, setR] = useState<{ out?: M[]; error?: string; timeout?: boolean } | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!p) { setR(null); return; }
    if (p.length > 500 || t.length > 100_000) { setR({ error: 'Batas: pola 500 karakter, teks 100.000 karakter.' }); return; }
    const id = ++seq.current;
    const h = setTimeout(async () => { const v = await run(p, f, t); if (id === seq.current) setR(v); }, 300);
    return () => clearTimeout(h);
  }, [p, f, t]);

  const toggle = (c: string) => setF(f.includes(c) ? f.replace(c, '') : f + c);
  const ms = r?.out ?? [];
  const parts: React.ReactNode[] = [];
  if (ms.length && t.length <= 20_000) {
    let pos = 0;
    ms.forEach((m, k) => { if (m.i < pos) return; parts.push(t.slice(pos, m.i)); if (m.s) parts.push(<mark key={k}>{m.s}</mark>); pos = m.i + m.s.length; });
    parts.push(t.slice(pos));
  }
  return (
    <div className="stack">
      <label>Pola regex<input className="mono" value={p} onChange={(e) => setP(e.target.value)} spellCheck={false} placeholder="mis. (\w+)@(\w+)\.com" /></label>
      <div className="row">{[...FLAGS].map((c) => <label key={c} className="chk"><input type="checkbox" checked={f.includes(c)} onChange={() => toggle(c)} />&nbsp;{c}</label>)}</div>
      <label>Teks uji<textarea className="mono" rows={6} value={t} onChange={(e) => setT(e.target.value)} spellCheck={false} /></label>
      {r?.error && <p className="er" role="alert">{r.error}</p>}
      {r?.timeout && <p className="er" role="alert">Dihentikan setelah 2 detik. Pola ini mungkin terlalu berat (backtracking).</p>}
      {r?.out && (
        <div role="status">
          <p><b>{ms.length ? `${ms.length} match${ms.length >= 1000 ? ' (dibatasi 1000)' : ''}` : 'Tidak ada match'}</b></p>
          {parts.length > 0 && <pre className="out">{parts}</pre>}
          {ms.slice(0, 100).map((m, k) => (
            <div className="thumb" key={k}><span className="mono">#{k + 1} @{m.i}: {m.s === '' ? '(kosong)' : m.s}{m.g.length ? ` | grup: ${m.g.map((x) => x ?? '∅').join(', ')}` : ''}{m.n ? ` | nama: ${JSON.stringify(m.n)}` : ''}</span></div>
          ))}
        </div>
      )}
      <div className="row"><Copy text={p ? `/${p}/${f}` : ''} label="Salin regex" /><button className="btn" onClick={() => { setP(''); setT(''); setR(null); }}>Hapus</button></div>
      <p className="muted">Contoh pola:</p>
      <div className="row">{PRESETS.map(([n, pp, ff]) => <button key={n} className="btn" onClick={() => { setP(pp); setF(ff); }}>{n}</button>)}</div>
      <p className="muted">Preset hanyalah contoh, bukan validator universal. Regex berjalan di Web Worker dan dihentikan setelah 2 detik, tapi itu bukan jaminan bebas ReDoS.</p>
    </div>
  );
}
