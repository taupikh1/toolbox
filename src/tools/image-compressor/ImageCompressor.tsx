import { useEffect, useState } from 'react';
import { ACCEPT, fmtSize, saveBlob, toBlob } from '../../utils';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
interface Out { blob: Blob; url: string; w: number; h: number }

export default function ImageCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState('');
  const [w, setW] = useState(0);
  const [h, setH] = useState(0);
  const [lock, setLock] = useState(true);
  const [type, setType] = useState('image/jpeg');
  const [q, setQ] = useState(80);
  const [out, setOut] = useState<Out | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { if (out) URL.revokeObjectURL(out.url); }, [out]);

  async function pick(f?: File) {
    if (!f) return;
    if (!ACCEPT.includes(f.type)) { setMsg('Format tidak didukung. Pakai JPG, PNG, atau WebP.'); return; }
    if (f.size > 30 * 1048576) { setMsg('File di atas 30 MB terlalu besar untuk diproses di HP.'); return; }
    try {
      const b = await createImageBitmap(f, { imageOrientation: 'from-image' });
      bmp?.close();
      setFile(f); setBmp(b); setSrc(URL.createObjectURL(f)); setW(b.width); setH(b.height); setOut(null);
      setMsg(`Dimuat: ${b.width}×${b.height}px, ${fmtSize(f.size)}`);
    } catch { setMsg('Gambar rusak atau tidak bisa dibaca.'); }
  }

  const ratio = bmp ? bmp.height / bmp.width : 1;
  const changeW = (v: number) => { setW(v); if (lock) setH(Math.max(1, Math.round(v * ratio))); };
  const changeH = (v: number) => { setH(v); if (lock) setW(Math.max(1, Math.round(v / ratio))); };

  async function run() {
    if (!bmp) return;
    if (w * h > 16_000_000) { setMsg('Dimensi terlalu besar untuk HP. Kecilkan lebar atau tinggi.'); return; }
    setBusy(true); setMsg('');
    await new Promise((r) => setTimeout(r, 30));
    try {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d')!;
      if (type === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(bmp, 0, 0, w, h);
      const blob = await toBlob(c, type, q / 100);
      c.width = c.height = 0;
      if (!blob) throw new Error('gagal');
      setOut({ blob, url: URL.createObjectURL(blob), w, h });
      if (blob.type !== type) setMsg(`Browser ini tidak bisa menyimpan ${EXT[type].toUpperCase()}. Hasilnya ${blob.type}.`);
    } catch { setMsg('Gagal memproses gambar. Coba ukuran lebih kecil.'); }
    setBusy(false);
  }

  const gain = out && file ? Math.round((1 - out.blob.size / file.size) * 100) : 0;
  return (
    <div className="stack">
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
        <input type="file" accept={ACCEPT.join(',')} hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {file ? file.name : 'Ketuk atau seret gambar ke sini (JPG, PNG, WebP)'}
      </label>
      {src && <img className="preview" src={src} alt="Pratinjau gambar asli" />}
      {bmp && (
        <>
          <div className="row">
            <label>Format
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option><option value="image/png">PNG</option>
              </select>
            </label>
            <label>Kualitas: {q}%<input type="range" min={10} max={100} value={q} disabled={type === 'image/png'} onChange={(e) => setQ(+e.target.value)} /></label>
          </div>
          <div className="row">
            <label>Lebar (px)<input type="number" min={1} value={w} onChange={(e) => changeW(Math.max(1, +e.target.value))} /></label>
            <label>Tinggi (px)<input type="number" min={1} value={h} onChange={(e) => changeH(Math.max(1, +e.target.value))} /></label>
          </div>
          <label className="chk"><input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} />&nbsp;Kunci rasio</label>
          <button className="btn primary" onClick={run} disabled={busy}>{busy ? 'Memproses…' : 'Kompres'}</button>
        </>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
      {out && file && (
        <div className="result">
          <img className="preview" src={out.url} alt="Hasil kompresi" />
          <p>Asli: {fmtSize(file.size)} ({bmp?.width}×{bmp?.height}). Hasil: {fmtSize(out.blob.size)} ({out.w}×{out.h}), {out.blob.type.split('/')[1].toUpperCase()}.</p>
          <p className={gain >= 0 ? 'ok' : 'er'}>{gain >= 0 ? `Lebih kecil ${gain}%` : `Hasil ${-gain}% lebih besar dari asli. Turunkan kualitas atau ukuran.`}</p>
          <div className="row">
            <button className="btn primary" onClick={() => saveBlob(out.blob, `${file.name.replace(/\.[^.]+$/, '')}-min.${EXT[out.blob.type] ?? 'bin'}`)}>Unduh</button>
            <button className="btn" onClick={() => { setFile(null); setBmp(null); setSrc(''); setOut(null); setMsg(''); }}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
