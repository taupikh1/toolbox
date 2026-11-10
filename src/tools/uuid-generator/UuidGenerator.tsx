import { useState } from 'react';
import Copy from '../Copy';
import { uuid4, uuid7 } from '../../lib/dev';
import { saveBlob } from '../../utils';

export default function UuidGenerator() {
  const [n, setN] = useState(5);
  const [list, setList] = useState<string[]>([]);
  const [v, setV] = useState('4');
  const gen = () => setList(Array.from({ length: Math.min(500, Math.max(1, n)) }, v === '7' ? () => uuid7() : uuid4));
  return (
    <div className="stack">
      <label>Versi<select value={v} onChange={(e) => { setV(e.target.value); setList([]); }}><option value="4">v4 (acak)</option><option value="7">v7 (berurutan waktu)</option></select></label>
      <label>Jumlah (1 sampai 500)<input type="number" min={1} max={500} value={n} onChange={(e) => setN(+e.target.value)} /></label>
      <button className="btn primary" onClick={gen}>Generate UUID v{v}</button>
      {list.length > 0 && (
        <>
          {list.map((u, i) => <div className="thumb" key={i}><span className="mono">{u}</span><Copy text={u} /></div>)}
          <div className="row">
            <Copy text={list.join('\n')} label="Salin semua" primary />
            <button className="btn" onClick={() => saveBlob(new Blob([list.join('\n')], { type: 'text/plain' }), 'uuid.txt')}>Unduh TXT</button>
            <button className="btn" onClick={() => setList([])}>Hapus hasil</button>
          </div>
        </>
      )}
      <p className="muted">v4 acak penuh. v7 diawali timestamp milidetik sehingga bisa diurutkan, sisanya acak (urutan dalam milidetik yang sama tidak dijamin). Keduanya memakai sumber acak aman peramban.</p>
    </div>
  );
}
