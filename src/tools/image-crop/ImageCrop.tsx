import { useEffect, useRef, useState } from 'react';
import { fmtSize, saveBlob } from '../../utils';
import { loadBitmap, exportCanvas, clearCanvas, extForMime, IMAGE_ACCEPT_STR } from '../../lib/image';

const RATIOS: { id: string; label: string; r: number | null }[] = [
  { id: 'free', label: 'Bebas', r: null },
  { id: '1:1', label: '1:1', r: 1 },
  { id: '4:3', label: '4:3', r: 4 / 3 },
  { id: '3:2', label: '3:2', r: 3 / 2 },
  { id: '16:9', label: '16:9', r: 16 / 9 },
  { id: '9:16', label: '9:16', r: 9 / 16 },
  { id: '2:3', label: '2:3', r: 2 / 3 },
];

interface CropBox { x: number; y: number; w: number; h: number }

export default function ImageCrop() {
  const [file, setFile] = useState<File | null>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState('');
  const [ratio, setRatio] = useState('free');
  const [fmt, setFmt] = useState('image/png');
  const [q, setQ] = useState(92);
  const [crop, setCrop] = useState<CropBox>({ x: 0, y: 0, w: 100, h: 100 });
  const [outUrl, setOutUrl] = useState('');
  const [outBlob, setOutBlob] = useState<Blob | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ mode: string; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number } | null>(null);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { if (outUrl) URL.revokeObjectURL(outUrl); }, [outUrl]);
  useEffect(() => () => { bmp?.close(); }, [bmp]);

  async function pick(f?: File) {
    if (!f) return;
    setMsg(''); setOutBlob(null); setOutUrl('');
    try {
      const b = await loadBitmap(f);
      bmp?.close();
      setFile(f); setBmp(b); setSrc(URL.createObjectURL(f));
      const side = Math.min(b.width, b.height);
      setCrop({ x: Math.floor((b.width - side) / 2), y: Math.floor((b.height - side) / 2), w: side, h: side });
      setMsg(`${b.width}×${b.height}px · ${fmtSize(f.size)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal memuat.');
    }
  }

  function applyRatio(id: string) {
    setRatio(id);
    if (!bmp) return;
    const def = RATIOS.find((r) => r.id === id);
    if (!def || def.r == null) return;
    const r = def.r;
    let w = bmp.width, h = Math.round(w / r);
    if (h > bmp.height) { h = bmp.height; w = Math.round(h * r); }
    setCrop({ x: Math.floor((bmp.width - w) / 2), y: Math.floor((bmp.height - h) / 2), w, h });
  }

  function displayScale() {
    const el = imgRef.current;
    if (!el || !bmp) return 1;
    return el.clientWidth / bmp.width;
  }

  function onPointerDown(e: React.PointerEvent, mode: string) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, sx: e.clientX, sy: e.clientY, ox: crop.x, oy: crop.y, ow: crop.w, oh: crop.h };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !bmp) return;
    const s = displayScale();
    const dx = (e.clientX - drag.current.sx) / s;
    const dy = (e.clientY - drag.current.sy) / s;
    const { mode, ox, oy, ow, oh } = drag.current;
    let { x, y, w, h } = { x: ox, y: oy, w: ow, h: oh };
    const rDef = RATIOS.find((r) => r.id === ratio)?.r;

    if (mode === 'move') {
      x = Math.round(ox + dx);
      y = Math.round(oy + dy);
    } else if (mode === 'br') {
      w = Math.max(10, Math.round(ow + dx));
      h = rDef ? Math.round(w / rDef) : Math.max(10, Math.round(oh + dy));
    } else if (mode === 'bl') {
      const nw = Math.max(10, Math.round(ow - dx));
      x = ox + (ow - nw);
      w = nw;
      h = rDef ? Math.round(w / rDef) : Math.max(10, Math.round(oh + dy));
    }

    x = Math.max(0, Math.min(x, bmp.width - w));
    y = Math.max(0, Math.min(y, bmp.height - h));
    w = Math.min(w, bmp.width - x);
    h = Math.min(h, bmp.height - y);
    if (rDef && h > bmp.height - y) {
      h = bmp.height - y;
      w = Math.round(h * rDef);
    }
    setCrop({ x, y, w: Math.max(1, w), h: Math.max(1, h) });
  }

  function onPointerUp() { drag.current = null; }

  async function doCrop() {
    if (!bmp) return;
    setBusy(true); setMsg('');
    try {
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(crop.w));
      c.height = Math.max(1, Math.round(crop.h));
      const ctx = c.getContext('2d')!;
      if (fmt === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); }
      ctx.drawImage(bmp, crop.x, crop.y, crop.w, crop.h, 0, 0, c.width, c.height);
      const blob = await exportCanvas(c, fmt, q / 100);
      clearCanvas(c);
      if (outUrl) URL.revokeObjectURL(outUrl);
      setOutBlob(blob);
      setOutUrl(URL.createObjectURL(blob));
      setMsg(`Hasil: ${c.width}×${c.height} · ${fmtSize(blob.size)}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal crop.');
    }
    setBusy(false);
  }

  const scale = displayScale();

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
        <input type="file" accept={IMAGE_ACCEPT_STR} hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {file ? file.name : 'Ketuk atau seret gambar (JPG, PNG, WebP)'}
      </label>

      {src && bmp && (
        <>
          <div style={{ position: 'relative', maxWidth: '100%', touchAction: 'none', userSelect: 'none' }}>
            <img ref={imgRef} className="preview" src={src} alt="Sumber" draggable={false} style={{ display: 'block', maxWidth: '100%' }} />
            <div
              style={{
                position: 'absolute',
                left: crop.x * scale,
                top: crop.y * scale,
                width: crop.w * scale,
                height: crop.h * scale,
                border: '2px solid var(--ac)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,.45)',
                cursor: 'move',
              }}
              onPointerDown={(e) => onPointerDown(e, 'move')}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              <span
                style={{ position: 'absolute', right: -8, bottom: -8, width: 20, height: 20, background: 'var(--ac)', borderRadius: 4, cursor: 'nwse-resize' }}
                onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'br'); }}
              />
            </div>
          </div>

          <div className="row">
            {RATIOS.map((r) => (
              <button key={r.id} type="button" className={'btn sm' + (ratio === r.id ? ' primary' : '')} onClick={() => applyRatio(r.id)}>{r.label}</button>
            ))}
          </div>
          <p className="muted mono"><small>Crop: {Math.round(crop.x)},{Math.round(crop.y)} · {Math.round(crop.w)}×{Math.round(crop.h)} (koordinat gambar asli)</small></p>

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
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => void doCrop()}>{busy ? 'Memproses…' : 'Crop & pratinjau'}</button>
            <button className="btn" onClick={() => { if (bmp) { const s = Math.min(bmp.width, bmp.height); setCrop({ x: Math.floor((bmp.width - s) / 2), y: Math.floor((bmp.height - s) / 2), w: s, h: s }); setRatio('1:1'); } }}>Reset crop</button>
          </div>
        </>
      )}

      {outUrl && outBlob && (
        <div className="result">
          <img className="preview" src={outUrl} alt="Hasil crop" />
          <button className="btn primary" onClick={() => saveBlob(outBlob, `crop.${extForMime(outBlob.type)}`)}>Unduh hasil</button>
        </div>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
