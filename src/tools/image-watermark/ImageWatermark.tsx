import { useEffect, useState } from 'react';
import { fmtSize, saveBlob } from '../../utils';
import { loadBitmap, exportCanvas, clearCanvas, extForMime, IMAGE_ACCEPT_STR } from '../../lib/image';

type Pos = 'tl' | 'tc' | 'tr' | 'c' | 'bl' | 'bc' | 'br';

const POSITIONS: { id: Pos; label: string }[] = [
  { id: 'tl', label: 'Kiri atas' },
  { id: 'tc', label: 'Tengah atas' },
  { id: 'tr', label: 'Kanan atas' },
  { id: 'c', label: 'Tengah' },
  { id: 'bl', label: 'Kiri bawah' },
  { id: 'bc', label: 'Tengah bawah' },
  { id: 'br', label: 'Kanan bawah' },
];

function anchor(pos: Pos, W: number, H: number, w: number, h: number, margin: number) {
  const xCenter = (W - w) / 2;
  const yCenter = (H - h) / 2;
  switch (pos) {
    case 'tl': return { x: margin, y: margin };
    case 'tc': return { x: xCenter, y: margin };
    case 'tr': return { x: W - w - margin, y: margin };
    case 'c': return { x: xCenter, y: yCenter };
    case 'bl': return { x: margin, y: H - h - margin };
    case 'bc': return { x: xCenter, y: H - h - margin };
    case 'br': return { x: W - w - margin, y: H - h - margin };
  }
}

export default function ImageWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('© Toolbox Offline');
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ffffff');
  const [opacity, setOpacity] = useState(60);
  const [pos, setPos] = useState<Pos>('br');
  const [margin, setMargin] = useState(24);
  const [rotation, setRotation] = useState(0);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBmp, setLogoBmp] = useState<ImageBitmap | null>(null);
  const [logoScale, setLogoScale] = useState(20);
  const [fmt, setFmt] = useState('image/png');
  const [q, setQ] = useState(92);
  const [out, setOut] = useState<{ blob: Blob; url: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { if (out) URL.revokeObjectURL(out.url); }, [out]);
  useEffect(() => () => { bmp?.close(); }, [bmp]);
  useEffect(() => () => { logoBmp?.close(); }, [logoBmp]);

  async function pickMain(f?: File) {
    if (!f) return;
    try {
      const b = await loadBitmap(f);
      bmp?.close();
      setFile(f); setBmp(b); setSrc(URL.createObjectURL(f)); setOut(null);
      setMsg(`${b.width}×${b.height} · ${fmtSize(f.size)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal');
    }
  }

  async function pickLogo(f?: File) {
    if (!f) return;
    try {
      const b = await loadBitmap(f);
      logoBmp?.close();
      setLogoFile(f); setLogoBmp(b);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Logo gagal dimuat');
    }
  }

  async function apply() {
    if (!bmp) return;
    setBusy(true); setMsg('');
    try {
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const ctx = c.getContext('2d')!;
      if (fmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(bmp, 0, 0);
      ctx.save();
      ctx.globalAlpha = opacity / 100;

      if (mode === 'text') {
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = color;
        const metrics = ctx.measureText(text);
        const tw = metrics.width;
        const th = fontSize;
        const { x, y } = anchor(pos, c.width, c.height, tw, th, margin);
        ctx.translate(x + tw / 2, y + th / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.fillText(text, -tw / 2, th / 3);
      } else if (logoBmp) {
        const lw = Math.round(bmp.width * (logoScale / 100));
        const lh = Math.round(logoBmp.height * (lw / logoBmp.width));
        const { x, y } = anchor(pos, c.width, c.height, lw, lh, margin);
        ctx.translate(x + lw / 2, y + lh / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(logoBmp, -lw / 2, -lh / 2, lw, lh);
      }

      ctx.restore();
      const blob = await exportCanvas(c, fmt, q / 100);
      clearCanvas(c);
      if (out) URL.revokeObjectURL(out.url);
      setOut({ blob, url: URL.createObjectURL(blob) });
      setMsg(`Watermark diterapkan · ${fmtSize(blob.size)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal');
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pickMain(e.dataTransfer.files[0]); }}>
        <input type="file" accept={IMAGE_ACCEPT_STR} hidden onChange={(e) => void pickMain(e.target.files?.[0])} />
        {file ? file.name : 'Gambar utama'}
      </label>
      {src && <img className="preview" src={src} alt="Sumber" />}

      <div className="row">
        <button className={'btn' + (mode === 'text' ? ' primary' : '')} onClick={() => setMode('text')}>Teks</button>
        <button className={'btn' + (mode === 'image' ? ' primary' : '')} onClick={() => setMode('image')}>Gambar/logo</button>
      </div>

      {mode === 'text' ? (
        <>
          <label>Teks watermark<input value={text} onChange={(e) => setText(e.target.value)} /></label>
          <div className="row">
            <label>Ukuran font<input type="number" min={8} max={400} value={fontSize} onChange={(e) => setFontSize(+e.target.value || 16)} /></label>
            <label>Warna<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
          </div>
        </>
      ) : (
        <>
          <label className="drop">
            <input type="file" accept={IMAGE_ACCEPT_STR} hidden onChange={(e) => void pickLogo(e.target.files?.[0])} />
            {logoFile ? logoFile.name : 'Unggah logo watermark'}
          </label>
          <label>Skala logo {logoScale}%
            <input type="range" min={5} max={80} value={logoScale} onChange={(e) => setLogoScale(+e.target.value)} />
          </label>
        </>
      )}

      <div className="row">
        <label>Opacity {opacity}%
          <input type="range" min={5} max={100} value={opacity} onChange={(e) => setOpacity(+e.target.value)} />
        </label>
        <label>Rotasi {rotation}°
          <input type="range" min={-180} max={180} value={rotation} onChange={(e) => setRotation(+e.target.value)} />
        </label>
        <label>Margin
          <input type="number" min={0} value={margin} onChange={(e) => setMargin(+e.target.value || 0)} />
        </label>
      </div>

      <div className="row">
        {POSITIONS.map((p) => (
          <button key={p.id} type="button" className={'btn sm' + (pos === p.id ? ' primary' : '')} onClick={() => setPos(p.id)}>{p.label}</button>
        ))}
      </div>

      <div className="row">
        <label>Format
          <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <label>Kualitas {q}%
          <input type="range" min={10} max={100} value={q} disabled={fmt === 'image/png'} onChange={(e) => setQ(+e.target.value)} />
        </label>
      </div>

      <button className="btn primary" disabled={!bmp || busy || (mode === 'image' && !logoBmp)} onClick={() => void apply()}>
        {busy ? 'Menerapkan…' : 'Terapkan watermark'}
      </button>

      {out && (
        <div className="result">
          <img className="preview" src={out.url} alt="Hasil" />
          <button className="btn primary" onClick={() => saveBlob(out.blob, `watermark.${extForMime(out.blob.type)}`)}>Unduh</button>
        </div>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
