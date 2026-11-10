import { useEffect, useRef, useState } from 'react';
import Copy from '../Copy';
import {
  parseHex, toHex, rgbToHsl, hslToRgb, contrastRatio, complementary, analogous, triadic, monochromatic,
  type RGB,
} from '../../lib/color';
import { loadBitmap, IMAGE_ACCEPT_STR } from '../../lib/image';

type Mode = 'picker' | 'convert' | 'image' | 'palette';

export default function ColorPicker() {
  const [mode, setMode] = useState<Mode>('picker');
  const [hex, setHex] = useState('#7C8CFF');
  const [rgb, setRgb] = useState<RGB>({ r: 124, g: 140, b: 255 });
  const [hsl, setHsl] = useState(rgbToHsl(124, 140, 255));
  const [history, setHistory] = useState<string[]>([]);
  const [imgSrc, setImgSrc] = useState('');
  const [pixel, setPixel] = useState<string | null>(null);
  const [coord, setCoord] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bmpRef = useRef<ImageBitmap | null>(null);

  useEffect(() => () => { if (imgSrc) URL.revokeObjectURL(imgSrc); bmpRef.current?.close(); }, [imgSrc]);

  function applyRgb(r: number, g: number, b: number, a?: number) {
    const R = { r, g, b, a };
    setRgb(R);
    setHex(toHex(r, g, b, a));
    setHsl(rgbToHsl(r, g, b, a));
  }

  function fromHex(v: string) {
    setHex(v);
    const p = parseHex(v);
    if (p) {
      setRgb(p);
      setHsl(rgbToHsl(p.r, p.g, p.b, p.a));
    }
  }

  function pushHistory(h: string) {
    setHistory((prev) => [h, ...prev.filter((x) => x !== h)].slice(0, 12));
  }

  async function loadImg(f?: File) {
    if (!f) return;
    try {
      const bmp = await loadBitmap(f);
      bmpRef.current?.close();
      bmpRef.current = bmp;
      if (imgSrc) URL.revokeObjectURL(imgSrc);
      setImgSrc(URL.createObjectURL(f));
      const c = canvasRef.current;
      if (c) {
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext('2d')!.drawImage(bmp, 0, 0);
      }
    } catch {
      /* ignore */
    }
  }

  function pickPixel(e: React.MouseEvent<HTMLCanvasElement>) {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * c.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * c.height);
    const d = c.getContext('2d')!.getImageData(x, y, 1, 1).data;
    const h = toHex(d[0], d[1], d[2], d[3] / 255);
    setPixel(h);
    setCoord(`${x}, ${y}`);
    applyRgb(d[0], d[1], d[2], d[3] / 255);
    pushHistory(h);
  }

  const contrast = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const textOnBg = contrast >= 4.5 ? '#fff' : '#111';

  const palettes = {
    complementary: [hsl.h, complementary(hsl.h)].map((h) => toHex(...Object.values(hslToRgb(h, hsl.s, hsl.l)) as [number, number, number])),
    analogous: [hsl.h, ...analogous(hsl.h)].map((h) => toHex(...Object.values(hslToRgb(h, hsl.s, hsl.l)) as [number, number, number])),
    triadic: [hsl.h, ...triadic(hsl.h)].map((h) => toHex(...Object.values(hslToRgb(h, hsl.s, hsl.l)) as [number, number, number])),
    mono: monochromatic(hsl.h, hsl.s, hsl.l).map((c) => toHex(...Object.values(hslToRgb(c.h, c.s, c.l)) as [number, number, number])),
  };

  return (
    <div className="stack">
      <div className="row" role="tablist">
        {([['picker', 'Picker'], ['convert', 'Konversi'], ['image', 'Dari gambar'], ['palette', 'Palet']] as const).map(([id, label]) => (
          <button key={id} className={'btn' + (mode === id ? ' primary' : '')} onClick={() => setMode(id)}>{label}</button>
        ))}
      </div>

      <div className="row">
        <div style={{ width: 72, height: 72, borderRadius: 12, background: hex, border: '1px solid var(--bd)', flex: '0 0 auto' }} />
        <label>HEX<input value={hex} onChange={(e) => fromHex(e.target.value)} onBlur={() => pushHistory(hex)} /></label>
        <label>Color<input type="color" value={hex.slice(0, 7)} onChange={(e) => { fromHex(e.target.value); pushHistory(e.target.value); }} /></label>
      </div>

      {(mode === 'picker' || mode === 'convert') && (
        <>
          <div className="row">
            <label>R<input inputMode="numeric" value={rgb.r} onChange={(e) => applyRgb(+e.target.value || 0, rgb.g, rgb.b)} /></label>
            <label>G<input inputMode="numeric" value={rgb.g} onChange={(e) => applyRgb(rgb.r, +e.target.value || 0, rgb.b)} /></label>
            <label>B<input inputMode="numeric" value={rgb.b} onChange={(e) => applyRgb(rgb.r, rgb.g, +e.target.value || 0)} /></label>
          </div>
          <div className="row">
            <label>H<input inputMode="decimal" value={Math.round(hsl.h)} onChange={(e) => { const n = hslToRgb(+e.target.value || 0, hsl.s, hsl.l); applyRgb(n.r, n.g, n.b); }} /></label>
            <label>S<input inputMode="decimal" value={Math.round(hsl.s)} onChange={(e) => { const n = hslToRgb(hsl.h, +e.target.value || 0, hsl.l); applyRgb(n.r, n.g, n.b); }} /></label>
            <label>L<input inputMode="decimal" value={Math.round(hsl.l)} onChange={(e) => { const n = hslToRgb(hsl.h, hsl.s, +e.target.value || 0); applyRgb(n.r, n.g, n.b); }} /></label>
          </div>
          <p className="muted">
            RGB({rgb.r}, {rgb.g}, {rgb.b}) · HSL({Math.round(hsl.h)}, {Math.round(hsl.s)}%, {Math.round(hsl.l)}%)
            · Kontras vs putih: {contrast.toFixed(2)}:1
          </p>
          <div style={{ padding: '0.75rem', borderRadius: 10, background: hex, color: textOnBg }}>Contoh teks di atas warna ini</div>
          <div className="row">
            <Copy text={hex} label="Salin HEX" primary />
            <Copy text={`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`} label="Salin RGB" />
            <Copy text={`hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`} label="Salin HSL" />
          </div>
        </>
      )}

      {mode === 'image' && (
        <>
          <label className="drop">
            <input type="file" accept={IMAGE_ACCEPT_STR} hidden onChange={(e) => void loadImg(e.target.files?.[0])} />
            Ketuk untuk unggah gambar, lalu ketuk pixel
          </label>
          {imgSrc && (
            <canvas
              ref={canvasRef}
              className="preview"
              style={{ maxWidth: '100%', cursor: 'crosshair' }}
              onClick={pickPixel}
            />
          )}
          {pixel && <p>Pixel {coord}: <b>{pixel}</b> <Copy text={pixel} small /></p>}
        </>
      )}

      {mode === 'palette' && (
        <>
          {(['complementary', 'analogous', 'triadic', 'mono'] as const).map((key) => (
            <div key={key}>
              <p className="muted" style={{ textTransform: 'capitalize' }}>{key}</p>
              <div className="row">
                {palettes[key].map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    style={{ width: 48, height: 48, borderRadius: 8, background: c, border: '1px solid var(--bd)' }}
                    onClick={() => { fromHex(c); pushHistory(c); }}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {history.length > 0 && (
        <>
          <p className="muted">Riwayat sesi</p>
          <div className="row">
            {history.map((c) => (
              <button key={c} type="button" className="btn sm" style={{ background: c, color: contrastRatio(parseHex(c) || { r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) >= 4.5 ? '#fff' : '#111' }} onClick={() => fromHex(c)}>{c}</button>
            ))}
            <button className="btn sm" onClick={() => setHistory([])}>Hapus riwayat</button>
          </div>
        </>
      )}
    </div>
  );
}
