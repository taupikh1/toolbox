import { useEffect, useState } from 'react';
import { fmtSize, saveBlob } from '../../utils';
import { loadBitmap, exportCanvas, clearCanvas, bitmapToCanvas, extForMime, IMAGE_ACCEPT_STR } from '../../lib/image';

interface Item {
  id: number;
  file: File;
  src: string;
  bmp: ImageBitmap;
  out?: { blob: Blob; url: string };
  err?: string;
}

let uid = 0;

export default function ImageFormat() {
  const [items, setItems] = useState<Item[]>([]);
  const [fmt, setFmt] = useState('image/png');
  const [q, setQ] = useState(90);
  const [bg, setBg] = useState('#ffffff');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => () => {
    items.forEach((it) => { URL.revokeObjectURL(it.src); if (it.out) URL.revokeObjectURL(it.out.url); it.bmp.close(); });
  }, []); // eslint-disable-line

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const next: Item[] = [];
    for (const f of [...files]) {
      try {
        const bmp = await loadBitmap(f);
        next.push({ id: ++uid, file: f, src: URL.createObjectURL(f), bmp });
      } catch (e) {
        setMsg(e instanceof Error ? e.message : 'Gagal memuat sebagian file.');
      }
    }
    setItems((p) => [...p, ...next]);
  }

  function remove(id: number) {
    setItems((p) => {
      const it = p.find((x) => x.id === id);
      if (it) { URL.revokeObjectURL(it.src); if (it.out) URL.revokeObjectURL(it.out.url); it.bmp.close(); }
      return p.filter((x) => x.id !== id);
    });
  }

  async function convertAll() {
    if (!items.length) return;
    setBusy(true); setMsg('');
    const updated: Item[] = [];
    for (const it of items) {
      try {
        const needsBg = fmt === 'image/jpeg';
        const c = bitmapToCanvas(it.bmp, needsBg ? bg : undefined);
        const blob = await exportCanvas(c, fmt, q / 100);
        clearCanvas(c);
        if (it.out) URL.revokeObjectURL(it.out.url);
        updated.push({ ...it, out: { blob, url: URL.createObjectURL(blob) }, err: undefined });
      } catch (e) {
        updated.push({ ...it, err: e instanceof Error ? e.message : 'Gagal' });
      }
    }
    setItems(updated);
    setBusy(false);
    setMsg(`Selesai: ${updated.filter((x) => x.out).length}/${updated.length} dikonversi.`);
  }

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }}>
        <input type="file" accept={IMAGE_ACCEPT_STR} multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        Ketuk atau seret gambar (bisa banyak)
      </label>

      <div className="row">
        <label>Format keluaran
          <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <label>Kualitas {q}%
          <input type="range" min={10} max={100} value={q} disabled={fmt === 'image/png'} onChange={(e) => setQ(+e.target.value)} />
        </label>
        {fmt === 'image/jpeg' && (
          <label>Latar (untuk transparan)
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
          </label>
        )}
      </div>

      {items.map((it) => (
        <div className="thumb" key={it.id}>
          <img src={it.src} alt="" />
          <span>
            <small className="muted">{it.file.name}</small><br />
            {it.bmp.width}×{it.bmp.height} · {fmtSize(it.file.size)}
            {it.out && <> → {fmtSize(it.out.blob.size)} ({Math.round((it.out.blob.size / it.file.size) * 100)}%)</>}
            {it.err && <span className="er"> · {it.err}</span>}
          </span>
          {it.out && <button className="btn sm" onClick={() => saveBlob(it.out!.blob, `${it.file.name.replace(/\.[^.]+$/, '')}.${extForMime(it.out!.blob.type)}`)}>Unduh</button>}
          <button className="btn sm" onClick={() => remove(it.id)}>Hapus</button>
        </div>
      ))}

      <div className="row">
        <button className="btn primary" disabled={!items.length || busy} onClick={() => void convertAll()}>
          {busy ? 'Mengonversi…' : 'Konversi semua'}
        </button>
        <button className="btn" disabled={!items.length} onClick={() => { items.forEach((it) => { URL.revokeObjectURL(it.src); if (it.out) URL.revokeObjectURL(it.out.url); it.bmp.close(); }); setItems([]); }}>
          Hapus semua
        </button>
      </div>
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
