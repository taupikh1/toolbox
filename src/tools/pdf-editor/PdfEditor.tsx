import { useRef, useState } from 'react';
import { loadPdf, exportPdf, validatePdfBlob, type EditorPage, type EditorAnnotation } from './engine';

let _aid = 1;
function aid() { return `a${_aid++}`; }

export default function PdfEditor() {
  const [source, setSource] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [anns, setAnns] = useState<EditorAnnotation[]>([]);
  const [sel, setSel] = useState(0);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<{ pages: EditorPage[]; anns: EditorAnnotation[] }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function pushHistory() {
    setHistory((h) => [...h.slice(-19), { pages: JSON.parse(JSON.stringify(pages)), anns: JSON.parse(JSON.stringify(anns)) }]);
  }

  async function onFile(f: File) {
    if (!f || !/\.pdf$/i.test(f.name)) { setMsg('Hanya file PDF.'); return; }
    if (f.size > 50 * 1048576) { setMsg('File melebihi 50 MB.'); return; }
    setBusy(true);
    setMsg(null);
    try {
      const buf = await f.arrayBuffer();
      const head = new Uint8Array(buf).subarray(0, 5);
      if (String.fromCharCode(...head) !== '%PDF-') { setMsg('Bukan PDF valid.'); setBusy(false); return; }
      const { pages: ps } = await loadPdf(buf);
      setSource(buf);
      setPages(ps);
      setAnns([]);
      setSel(0);
      setName(f.name.replace(/\.pdf$/i, ''));
      setHistory([]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'PDF tidak dapat dibuka (mungkin terenkripsi).');
    } finally {
      setBusy(false);
    }
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= pages.length) return;
    pushHistory();
    setPages((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setSel(j);
  }

  function del(i: number) {
    if (pages.length <= 1) { setMsg('Minimal satu halaman harus tersisa.'); return; }
    if (!confirm('Hapus halaman ini?')) return;
    pushHistory();
    const id = pages[i].id;
    setPages((prev) => prev.filter((_, idx) => idx !== i));
    setAnns((prev) => prev.filter((a) => a.pageId !== id));
    setSel((s) => Math.max(0, s >= i ? s - 1 : s));
  }

  function dup(i: number) {
    pushHistory();
    const p = pages[i];
    const copy: EditorPage = { ...p, id: `p${Date.now()}` };
    setPages((prev) => [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)]);
  }

  function rotate(i: number) {
    pushHistory();
    setPages((prev) => prev.map((p, idx) => idx === i ? { ...p, rotation: (p.rotation + 90) % 360 } : p));
  }

  function addText() {
    if (!pages[sel]) return;
    pushHistory();
    setAnns((prev) => [...prev, { id: aid(), pageId: pages[sel].id, type: 'text', x: 0.1, y: 0.1, w: 0.4, h: 0.08, text: 'Catatan' }]);
  }

  function addRect() {
    if (!pages[sel]) return;
    pushHistory();
    setAnns((prev) => [...prev, { id: aid(), pageId: pages[sel].id, type: 'rect', x: 0.15, y: 0.2, w: 0.3, h: 0.1 }]);
  }

  async function addImage(f: File) {
    if (!pages[sel] || !/^image\/(png|jpeg)/.test(f.type)) { setMsg('Hanya PNG/JPEG.'); return; }
    pushHistory();
    const buf = new Uint8Array(await f.arrayBuffer());
    setAnns((prev) => [...prev, { id: aid(), pageId: pages[sel].id, type: 'image', x: 0.2, y: 0.3, w: 0.25, h: 0.15, imageData: buf }]);
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setPages(last.pages);
    setAnns(last.anns);
  }

  async function doExport() {
    if (!source) return;
    setBusy(true);
    setMsg(null);
    try {
      const blob = await exportPdf(source, pages, anns);
      if (!(await validatePdfBlob(blob))) { setMsg('Hasil bukan PDF valid.'); setBusy(false); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}-edited.pdf`;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMsg('PDF diunduh.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Ekspor gagal.');
    } finally {
      setBusy(false);
    }
  }

  const current = pages[sel];
  const pageAnns = anns.filter((a) => a.pageId === current?.id);

  return (
    <div className="pdf-editor">
      <h2>PDF Editor</h2>
      <p className="muted">Kelola halaman, tambah catatan/gambar, unduh PDF baru. Semua lokal. Bukan pengedit teks asli PDF. Tanda tangan adalah gambar, bukan sertifikat digital.</p>

      {!source && (
        <label className="btn primary">
          Buka PDF
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      )}

      {source && (
        <>
          <div className="dc-queue-head">
            <strong>{name}.pdf</strong>
            <span className="muted">{pages.length} halaman</span>
            <button type="button" className="btn" onClick={undo} disabled={!history.length}>Undo</button>
            <button type="button" className="btn primary" onClick={doExport} disabled={busy}>Unduh PDF</button>
          </div>

          <div className="pdf-editor-pages">
            {pages.map((p, i) => (
              <div key={p.id} className={i === sel ? 'pdf-page-thumb on' : 'pdf-page-thumb'}>
                <button type="button" onClick={() => setSel(i)}>{i + 1}</button>
                <div className="pdf-page-actions">
                  <button type="button" className="btn" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                  <button type="button" className="btn" onClick={() => move(i, 1)} disabled={i === pages.length - 1}>↓</button>
                  <button type="button" className="btn" onClick={() => rotate(i)}>↻</button>
                  <button type="button" className="btn" onClick={() => dup(i)}>Dup</button>
                  <button type="button" className="btn" onClick={() => del(i)}>−</button>
                </div>
                {p.rotation ? <span className="muted">{p.rotation}°</span> : null}
              </div>
            ))}
          </div>

          {current && (
            <div className="pdf-editor-tools">
              <button type="button" className="btn" onClick={addText}>Tambah catatan teks</button>
              <button type="button" className="btn" onClick={addRect}>Tambah kotak</button>
              <label className="btn">
                Tambah gambar / tanda tangan
                <input type="file" accept="image/png,image/jpeg" hidden onChange={(e) => e.target.files?.[0] && addImage(e.target.files[0])} />
              </label>
              <p className="muted">Anotasi di halaman {sel + 1}: {pageAnns.length}</p>
              {pageAnns.map((a) => (
                <div key={a.id} className="pdf-ann">
                  {a.type === 'text' && (
                    <input value={a.text ?? ''} onChange={(e) => setAnns((prev) => prev.map((x) => x.id === a.id ? { ...x, text: e.target.value } : x))} />
                  )}
                  <span className="muted">{a.type}</span>
                  <button type="button" className="btn" onClick={() => { pushHistory(); setAnns((prev) => prev.filter((x) => x.id !== a.id)); }}>Hapus</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {busy && <p className="muted">Memproses…</p>}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
