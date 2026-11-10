import { useEffect, useRef, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ACCEPT, saveBlob, toBlob } from '../../utils';

interface Item { id: number; file: File; url: string }
let uid = 0;
const MAX = 2500; // sisi terpanjang, agar memori HP aman

// Digambar ulang lewat canvas supaya orientasi EXIF (foto iPhone) benar.
async function embed(pdf: PDFDocument, f: File) {
  const b = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const k = Math.min(1, MAX / Math.max(b.width, b.height));
  const c = document.createElement('canvas');
  c.width = Math.round(b.width * k);
  c.height = Math.round(b.height * k);
  c.getContext('2d')!.drawImage(b, 0, 0, c.width, c.height);
  b.close();
  const png = f.type !== 'image/jpeg';
  const blob = await toBlob(c, png ? 'image/png' : 'image/jpeg', 0.92);
  c.width = c.height = 0;
  if (!blob) throw new Error('encode');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return png ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
}

export default function ImageToPdf() {
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState('A4');
  const [land, setLand] = useState(false);
  const [margin, setMargin] = useState(20);
  const [name, setName] = useState('gambar');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const ref = useRef(items);
  ref.current = items;
  useEffect(() => () => ref.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  function add(files: FileList | null) {
    if (!files) return;
    const ok = [...files].filter((f) => ACCEPT.includes(f.type));
    setMsg(ok.length < files.length ? `${files.length - ok.length} file dilewati. Hanya JPG, PNG, dan WebP.` : '');
    setItems((p) => [...p, ...ok.map((f) => ({ id: ++uid, file: f, url: URL.createObjectURL(f) }))]);
  }
  const move = (i: number, d: number) => setItems((p) => {
    const a = [...p]; const j = i + d;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });
  const remove = (id: number) => setItems((p) => { p.filter((i) => i.id === id).forEach((i) => URL.revokeObjectURL(i.url)); return p.filter((i) => i.id !== id); });

  async function make() {
    if (!items.length) { setMsg('Tambahkan gambar dulu.'); return; }
    setBusy(true); setMsg('');
    try {
      const pdf = await PDFDocument.create();
      const [pw, ph] = size === 'A4' ? [595.28, 841.89] : [612, 792];
      const [W, H] = land ? [ph, pw] : [pw, ph];
      for (const it of items) {
        const img = await embed(pdf, it.file);
        const s = Math.min((W - 2 * margin) / img.width, (H - 2 * margin) / img.height);
        const dw = img.width * s, dh = img.height * s;
        pdf.addPage([W, H]).drawImage(img, { x: (W - dw) / 2, y: (H - dh) / 2, width: dw, height: dh });
      }
      const bytes = await pdf.save();
      saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), (name.trim() || 'gambar').replace(/[\\/:*?"<>|]/g, '_') + '.pdf');
      setMsg(`PDF dibuat dengan ${items.length} halaman.`);
    } catch { setMsg('Gagal membuat PDF. Ada gambar rusak atau terlalu besar.'); }
    setBusy(false);
  }

  return (
    <div className="stack">
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}>
        <input type="file" accept={ACCEPT.join(',')} multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
        Ketuk atau seret gambar ke sini (bisa banyak)
      </label>
      {items.map((it, i) => (
        <div className="thumb" key={it.id}>
          <img src={it.url} alt="" />
          <span>{i + 1}. {it.file.name}</span>
          <button className="btn" aria-label="Naikkan" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
          <button className="btn" aria-label="Turunkan" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
          <button className="btn" aria-label="Hapus" onClick={() => remove(it.id)}>✕</button>
        </div>
      ))}
      <div className="row">
        <label>Ukuran kertas<select value={size} onChange={(e) => setSize(e.target.value)}><option>A4</option><option>Letter</option></select></label>
        <label>Orientasi<select value={land ? 'l' : 'p'} onChange={(e) => setLand(e.target.value === 'l')}><option value="p">Portrait</option><option value="l">Landscape</option></select></label>
        <label>Margin (pt)<input type="number" min={0} max={100} value={margin} onChange={(e) => setMargin(Math.min(100, Math.max(0, +e.target.value)))} /></label>
      </div>
      <label>Nama file<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className="btn primary" onClick={make} disabled={busy || !items.length}>{busy ? 'Membuat PDF…' : 'Buat dan unduh PDF'}</button>
      {msg && <p className="muted" role="status">{msg}</p>}
      <p className="muted">Gambar tampil utuh tanpa terpotong. Sisi terpanjang di atas {MAX}px diperkecil agar memori HP aman.</p>
    </div>
  );
}
