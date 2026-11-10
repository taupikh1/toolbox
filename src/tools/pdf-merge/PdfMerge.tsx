import { useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { fmtSize, saveBlob } from '../../utils';

interface Item {
  id: number;
  file: File;
  pages: number;
  err?: string;
}

let uid = 0;

export default function PdfMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState('merged');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => () => {}, []);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const next: Item[] = [];
    for (const f of [...files]) {
      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
        setMsg('Hanya file PDF yang diterima.');
        continue;
      }
      if (f.size > 80 * 1048576) {
        setMsg('Salah satu PDF terlalu besar (>80 MB).');
        continue;
      }
      try {
        const bytes = await f.arrayBuffer();
        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        next.push({ id: ++uid, file: f, pages: doc.getPageCount() });
      } catch {
        next.push({ id: ++uid, file: f, pages: 0, err: 'PDF rusak atau terlindungi sandi (tidak didukung).' });
      }
    }
    setItems((p) => [...p, ...next]);
  }

  const move = (i: number, d: number) => setItems((p) => {
    const a = [...p];
    const j = i + d;
    if (j < 0 || j >= a.length) return a;
    [a[i], a[j]] = [a[j], a[i]];
    return a;
  });

  async function merge() {
    const ok = items.filter((i) => !i.err && i.pages > 0);
    if (!ok.length) { setMsg('Tidak ada PDF valid.'); return; }
    setBusy(true); setMsg('');
    try {
      const out = await PDFDocument.create();
      for (const it of ok) {
        const src = await PDFDocument.load(await it.file.arrayBuffer(), { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${(name || 'merged').replace(/[\\/:*?"<>|]/g, '_')}.pdf`);
      setMsg(`Digabung: ${ok.length} file, ${out.getPageCount()} halaman.`);
    } catch {
      setMsg('Gagal menggabungkan. Ada PDF rusak atau terenkripsi.');
    }
    setBusy(false);
  }

  const totalPages = items.reduce((s, i) => s + (i.err ? 0 : i.pages), 0);

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server. PDF terlindungi sandi tidak didukung.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }}>
        <input type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        Ketuk atau seret PDF (bisa banyak)
      </label>

      {items.map((it, i) => (
        <div className="thumb" key={it.id}>
          <span>
            <small className="muted">{it.file.name}</small><br />
            {it.err ? <span className="er">{it.err}</span> : `${it.pages} halaman · ${fmtSize(it.file.size)}`}
          </span>
          <button className="btn sm" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
          <button className="btn sm" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
          <button className="btn sm" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>Hapus</button>
        </div>
      ))}

      {items.length > 0 && (
        <>
          <p className="muted">Total halaman valid: {totalPages}</p>
          <label>Nama file hasil<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <div className="row">
            <button className="btn primary" disabled={busy} onClick={() => void merge()}>{busy ? 'Menggabungkan…' : 'Gabungkan & unduh'}</button>
            <button className="btn" onClick={() => setItems([])}>Hapus semua</button>
          </div>
        </>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
