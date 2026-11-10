import { useState } from 'react';
import { preprocessCanvas, type PreprocessOptions } from './preprocess';

interface Block {
  type: 'paragraph';
  text: string;
  page: number;
}

export default function DocumentIntelligence() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [opts, setOpts] = useState<PreprocessOptions>({ grayscale: false, contrast: 1, brightness: 0 });

  async function onFile(f: File) {
    if (!/^image\//.test(f.type)) { setMsg('Hanya gambar. PDF OCR ada di halaman OCR yang sudah ada.'); return; }
    setMsg('Memuat gambar…');
    try {
      const bmp = await createImageBitmap(f);
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const processed = preprocessCanvas(c, opts);
      // OCR memerlukan model. Di sini hanya simpan struktur placeholder yang jujur.
      setBlocks([{ type: 'paragraph', text: '(Jalankan OCR di halaman OCR & Scanner setelah model tersedia)', page: 1 }]);
      setMsg(`Gambar diproses (${processed.width}×${processed.height}). OCR membutuhkan model bahasa di public/ocr/.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal memuat.');
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify({ blocks, note: 'heuristic-only' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'document.json'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  return (
    <div className="doc-intel">
      <h2>Document Intelligence</h2>
      <p className="muted">Preprocessing gambar (grayscale/kontras). OCR menggunakan engine yang sudah ada. Layout analysis bersifat heuristik, bukan AI. Model bahasa tidak di-bundle.</p>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label><input type="checkbox" checked={opts.grayscale} onChange={(e) => setOpts({ ...opts, grayscale: e.target.checked })} /> Grayscale</label>
        <label>Kontras <input type="range" min="0.5" max="2" step="0.1" value={opts.contrast} onChange={(e) => setOpts({ ...opts, contrast: +e.target.value })} /></label>
        <label>Kecerahan <input type="range" min="-50" max="50" step="5" value={opts.brightness} onChange={(e) => setOpts({ ...opts, brightness: +e.target.value })} /></label>
      </div>
      <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {msg && <p className="muted">{msg}</p>}
      {blocks.length > 0 && (
        <>
          <p>Blok: {blocks.length}</p>
          <button type="button" className="btn" onClick={exportJson}>Unduh JSON</button>
        </>
      )}
      <p className="er" role="status">Searchable PDF: PLANNED. Table extraction: gunakan PDF to Excel yang sudah ada. Confidence OCR: hanya jika engine menyediakannya.</p>
    </div>
  );
}
