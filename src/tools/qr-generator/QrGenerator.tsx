import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { saveBlob } from '../../utils';

type Ecl = 'L' | 'M' | 'Q' | 'H';

export default function QrGenerator() {
  const [kind, setKind] = useState('text');
  const [text, setText] = useState('https://');
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [ecl, setEcl] = useState<Ecl>('M');
  const [png, setPng] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');

  const data = kind === 'tel' ? 'tel:' + text : kind === 'mailto' ? 'mailto:' + text : text;
  const opts = { margin, errorCorrectionLevel: ecl, color: { dark: fg, light: bg } };

  useEffect(() => {
    if (!text.trim()) { setPng(''); setErr('Isi teks atau URL dulu.'); return; }
    if (text.length > 1000) { setPng(''); setErr('Teks terlalu panjang. Maksimal 1000 karakter.'); return; }
    let live = true;
    QRCode.toDataURL(data, { ...opts, width: size })
      .then((u) => { if (live) { setPng(u); setErr(''); } })
      .catch(() => { if (live) { setPng(''); setErr('QR gagal dibuat. Coba teks yang lebih pendek.'); } });
    return () => { live = false; };
  }, [data, size, margin, fg, bg, ecl]);

  const dlPng = async () => { saveBlob(await (await fetch(png)).blob(), 'qr.png'); setNote('PNG terunduh ✓'); };
  const dlSvg = async () => {
    const s = await QRCode.toString(data, { ...opts, type: 'svg' });
    saveBlob(new Blob([s], { type: 'image/svg+xml' }), 'qr.svg');
    setNote('SVG terunduh ✓');
  };

  return (
    <div className="stack">
      <label>Jenis
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="text">Teks atau URL</option><option value="tel">Nomor telepon</option><option value="mailto">Email</option>
        </select>
      </label>
      <label>Isi<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
      <div className="row">
        <label>Ukuran: {size}px<input type="range" min={128} max={1024} step={32} value={size} onChange={(e) => setSize(+e.target.value)} /></label>
        <label>Margin: {margin}<input type="range" min={0} max={8} value={margin} onChange={(e) => setMargin(+e.target.value)} /></label>
      </div>
      <div className="row">
        <label>Warna QR<input type="color" value={fg} onChange={(e) => setFg(e.target.value)} /></label>
        <label>Warna latar<input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></label>
        <label>Koreksi error
          <select value={ecl} onChange={(e) => setEcl(e.target.value as Ecl)}>
            <option value="L">L (7%)</option><option value="M">M (15%)</option><option value="Q">Q (25%)</option><option value="H">H (30%)</option>
          </select>
        </label>
      </div>
      {err ? <p className="er" role="alert">{err}</p> : png && <img className="qr" src={png} alt="QR Code" width={size} />}
      <div className="row">
        <button className="btn primary" disabled={!png} onClick={dlPng}>Unduh PNG</button>
        <button className="btn" disabled={!png} onClick={dlSvg}>Unduh SVG</button>
      </div>
      {note && <p className="ok" role="status">{note}</p>}
      <p className="muted">Pakai warna QR yang jauh lebih gelap dari latar, lalu coba pindai sebelum dipakai.</p>
    </div>
  );
}
