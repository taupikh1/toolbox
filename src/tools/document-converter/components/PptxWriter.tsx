import { useState } from 'react';
import { buildPptx, newSlide, type WriterSlide, type WriterState } from '../engine/powerpoint/writer';
import { PptxViewer } from './PptxViewer';

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function PptxWriter() {
  const [title, setTitle] = useState('Presentasi Baru');
  const [slides, setSlides] = useState<WriterSlide[]>([newSlide({ title: 'Judul Slide 1' })]);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(id: string, patch: Partial<WriterSlide>) {
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function add() {
    setSlides((prev) => [...prev, newSlide({ title: `Judul Slide ${prev.length + 1}` })]);
  }
  function remove(id: string) {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setSlides((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  async function onImage(id: string, file: File | null) {
    if (!file) {
      update(id, { imageDataUrl: null });
      return;
    }
    if (!/^image\/(png|jpeg|gif|webp)$/i.test(file.type) && !/\.(png|jpe?g|gif|webp)$/i.test(file.name)) {
      setError('Gambar harus PNG, JPG, GIF, atau WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => update(id, { imageDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function doPreview() {
    setError(null);
    setBusy(true);
    try {
      const state: WriterState = { title, slides };
      const blob = await buildPptx(state);
      const file = new File([blob], `${title || 'presentasi'}.pptx`, { type: blob.type });
      setPreviewFile(file);
      setMsg('Preview siap. File dapat dibuka kembali oleh Reader.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function doDownload() {
    setError(null);
    setBusy(true);
    try {
      const state: WriterState = { title, slides };
      const blob = await buildPptx(state);
      downloadBlob(blob, `${title || 'presentasi'}.pptx`);
      setMsg('PPTX diunduh. Buka kembali dengan Reader untuk memeriksa.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (previewFile) {
    return (
      <div>
        <div className="dc-queue-head">
          <h3 style={{ margin: 0 }}>Preview hasil Writer</h3>
          <button type="button" className="btn" onClick={() => setPreviewFile(null)}>Kembali ke editor</button>
        </div>
        <PptxViewer file={previewFile} onClose={() => setPreviewFile(null)} />
      </div>
    );
  }

  return (
    <div className="pptx-writer">
      <h3 style={{ margin: '0 0 .5rem' }}>Buat Presentasi PPTX</h3>
      <p className="muted" style={{ margin: '0 0 .6rem' }}>
        Buat slide sederhana (judul, teks, gambar). Diproses di perangkat. File hasil dapat dibuka kembali oleh Reader.
      </p>

      <label className="dc-field">
        Judul presentasi
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul presentasi" />
      </label>

      {slides.map((s, i) => (
        <div key={s.id} className="pptx-slide-edit">
          <div className="dc-queue-head">
            <strong>Slide {i + 1}</strong>
            <span style={{ display: 'flex', gap: '.3rem' }}>
              <button type="button" className="btn" onClick={() => move(s.id, -1)} disabled={i === 0} aria-label="Naik">↑</button>
              <button type="button" className="btn" onClick={() => move(s.id, 1)} disabled={i === slides.length - 1} aria-label="Turun">↓</button>
              <button type="button" className="btn" onClick={() => remove(s.id)} disabled={slides.length <= 1} aria-label="Hapus">Hapus</button>
            </span>
          </div>
          <label className="dc-field">
            Judul
            <input value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} placeholder="Judul slide" />
          </label>
          <label className="dc-field">
            Teks
            <textarea value={s.body} onChange={(e) => update(s.id, { body: e.target.value })} rows={3} placeholder="Isi teks" />
          </label>
          <label className="dc-field">
            Gambar (opsional)
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => onImage(s.id, e.target.files?.[0] ?? null)} />
            {s.imageDataUrl && <span className="muted"> Gambar terpasang</span>}
          </label>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
        <button type="button" className="btn" onClick={add}>Tambah slide</button>
        <button type="button" className="btn" onClick={doPreview} disabled={busy}>Lihat preview</button>
        <button type="button" className="btn primary" onClick={doDownload} disabled={busy}>Unduh PPTX</button>
      </div>

      {msg && <p className="ok" style={{ color: 'var(--ok, #0a7)' }}>{msg}</p>}
      {error && <p className="er" role="alert">{error}</p>}

      <p className="muted" style={{ margin: '.5rem 0 0' }}>
        Layout dasar saja. Animasi, tema kompleks, dan chart tidak didukung. PPTX→PDF dan PPTX→gambar belum tersedia karena tidak ada renderer slide yang akurat secara offline.
      </p>
    </div>
  );
}
