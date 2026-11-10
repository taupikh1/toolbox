import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ACCEPT, saveBlob } from '../../utils';
import {
  imagesToPdf,
  textToPdf,
  htmlToPdf,
  type PaperSize,
  type Orientation,
  type ImageFit,
  type TextAlign,
} from './engine';

type Source = 'images' | 'text' | 'html';

interface ImageItem {
  id: number;
  file: File;
  url: string;
}

let uid = 0;

const PAPER: PaperSize[] = ['A4', 'A3', 'A5', 'Letter', 'Legal'];

export default function PdfWriter() {
  const [source, setSource] = useState<Source>('images');
  const [items, setItems] = useState<ImageItem[]>([]);
  const [text, setText] = useState('');
  const [html, setHtml] = useState('');
  const [size, setSize] = useState<PaperSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margin, setMargin] = useState(36);
  const [fit, setFit] = useState<ImageFit>('fit');
  const [fontSize, setFontSize] = useState(12);
  const [lineSpacing, setLineSpacing] = useState(1.4);
  const [align, setAlign] = useState<TextAlign>('left');
  const [title, setTitle] = useState('');
  const [fileName, setFileName] = useState('dokumen');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pages, setPages] = useState(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function addImages(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list);
    const ok = arr.filter((f) => ACCEPT.includes(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name));
    if (ok.length < arr.length) {
      setStatus(`${arr.length - ok.length} file dilewati. Hanya JPG, PNG, dan WebP.`);
    } else {
      setStatus('');
    }
    setItems((prev) => [
      ...prev,
      ...ok.map((f) => ({ id: ++uid, file: f, url: URL.createObjectURL(f) })),
    ]);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    addImages(e.dataTransfer.files);
  }

  function move(i: number, dir: number) {
    setItems((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function remove(id: number) {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((i) => i.id !== id);
    });
  }

  function resetImages() {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
  }

  async function generate() {
    setBusy(true);
    setStatus('Sedang membuat PDF…');
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      let result: { blob: Blob; fileName: string; pages: number };
      if (source === 'images') {
        if (!items.length) throw new Error('Tambahkan minimal satu gambar');
        result = await imagesToPdf(
          items.map((i) => i.file),
          { size, orientation, margin, fit, quality: 0.92 },
          title || fileName,
        );
      } else if (source === 'text') {
        result = await textToPdf(text, {
          size,
          orientation,
          margin,
          fontSize,
          lineSpacing,
          align,
          title: title || undefined,
        });
      } else {
        result = await htmlToPdf(html, {
          size,
          orientation,
          margin,
          fontSize,
          lineSpacing,
          align,
          title: title || undefined,
        });
      }
      const url = URL.createObjectURL(result.blob);
      setPreviewUrl(url);
      setPages(result.pages);
      setStatus(`PDF berhasil dibuat (${result.pages} halaman). Siap diunduh.`);
      // keep blob for download via the preview url
      (window as unknown as { __pdfWriterLast?: Blob }).__pdfWriterLast = result.blob;
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Gagal membuat PDF');
      setPreviewUrl(null);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = (window as unknown as { __pdfWriterLast?: Blob }).__pdfWriterLast;
    if (!blob) return;
    const name = (fileName.trim() || 'dokumen').replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
    saveBlob(blob, name);
  }

  const canGenerate =
    (source === 'images' && items.length > 0) ||
    (source === 'text' && text.trim().length > 0) ||
    (source === 'html' && html.trim().length > 0);

  return (
    <div className="stack">
      <div className="row">
        <label>
          Jenis sumber
          <select value={source} onChange={(e) => setSource(e.target.value as Source)}>
            <option value="images">Gambar (JPG / PNG / WebP)</option>
            <option value="text">Teks (TXT atau paste)</option>
            <option value="html">HTML sederhana</option>
          </select>
        </label>
      </div>

      {source === 'images' && (
        <>
          <label
            className="drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept={ACCEPT.join(',')}
              multiple
              hidden
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = '';
              }}
            />
            Ketuk atau seret gambar ke sini (bisa banyak)
          </label>
          {items.length > 0 && (
            <div className="stack" style={{ gap: '.5rem' }}>
              {items.map((it, i) => (
                <div className="thumb" key={it.id}>
                  <img src={it.url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                  <span className="mono" style={{ flex: 1 }}>
                    {i + 1}. {it.file.name}
                  </span>
                  <button className="btn sm" type="button" aria-label="Naikkan" disabled={i === 0} onClick={() => move(i, -1)}>
                    ↑
                  </button>
                  <button className="btn sm" type="button" aria-label="Turunkan" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                    ↓
                  </button>
                  <button className="btn sm" type="button" aria-label="Hapus" onClick={() => remove(it.id)}>
                    ✕
                  </button>
                </div>
              ))}
              <button className="btn sm" type="button" onClick={resetImages}>
                Reset daftar gambar
              </button>
            </div>
          )}
          <div className="row">
            <label>
              Penempatan gambar
              <select value={fit} onChange={(e) => setFit(e.target.value as ImageFit)}>
                <option value="fit">Fit to page (pertahankan rasio)</option>
                <option value="fill">Fill page</option>
                <option value="original">Ukuran asli (diperkecil jika perlu)</option>
              </select>
            </label>
          </div>
        </>
      )}

      {source === 'text' && (
        <label>
          Teks
          <textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste atau ketik teks di sini. Mendukung paragraf, baris kosong, dan karakter Unicode dasar."
          />
        </label>
      )}

      {source === 'html' && (
        <label>
          HTML
          <textarea
            rows={10}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<h1>Judul</h1><p>Paragraf...</p><ul><li>Item</li></ul>"
          />
          <span className="muted" style={{ fontSize: '.8rem' }}>
            Hanya teks, heading, paragraf, dan list sederhana. Script, event handler, dan resource eksternal diabaikan.
          </span>
        </label>
      )}

      <div className="row">
        <label>
          Ukuran kertas
          <select value={size} onChange={(e) => setSize(e.target.value as PaperSize)}>
            {PAPER.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Orientasi
          <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
        <label>
          Margin (pt)
          <input
            type="number"
            min={0}
            max={120}
            value={margin}
            onChange={(e) => setMargin(Math.min(120, Math.max(0, +e.target.value || 0)))}
          />
        </label>
      </div>

      {source !== 'images' && (
        <div className="row">
          <label>
            Ukuran font
            <input
              type="number"
              min={8}
              max={36}
              value={fontSize}
              onChange={(e) => setFontSize(Math.min(36, Math.max(8, +e.target.value || 12)))}
            />
          </label>
          <label>
            Line spacing
            <input
              type="number"
              min={1}
              max={2.5}
              step={0.1}
              value={lineSpacing}
              onChange={(e) => setLineSpacing(Math.min(2.5, Math.max(1, +e.target.value || 1.4)))}
            />
          </label>
          <label>
            Alignment
            <select value={align} onChange={(e) => setAlign(e.target.value as TextAlign)}>
              <option value="left">Kiri</option>
              <option value="center">Tengah</option>
              <option value="right">Kanan</option>
            </select>
          </label>
        </div>
      )}

      <div className="row">
        <label>
          Judul dokumen (opsional)
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul PDF" />
        </label>
        <label>
          Nama file unduhan
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
        </label>
      </div>

      <button className="btn primary" type="button" onClick={generate} disabled={busy || !canGenerate}>
        {busy ? 'Sedang membuat PDF…' : 'Buat PDF dan preview'}
      </button>

      {status && (
        <p className="muted" role="status">
          {status}
        </p>
      )}

      {previewUrl && (
        <div className="stack">
          <div className="row">
            <button className="btn primary" type="button" onClick={download}>
              Unduh PDF
            </button>
            <span className="muted">{pages} halaman</span>
          </div>
          <iframe
            title="Preview PDF"
            src={previewUrl}
            style={{ width: '100%', height: 480, border: '1px solid var(--bd)', borderRadius: 10, background: '#fff' }}
          />
          <p className="muted" style={{ fontSize: '.8rem' }}>
            Preview menampilkan PDF hasil proses aktual. Beberapa browser mungkin meminta izin atau menampilkan kontrol bawaan.
          </p>
        </div>
      )}

      <p className="muted" style={{ fontSize: '.85rem' }}>
        Semua pemrosesan dilakukan lokal di browser. File tidak dikirim ke server. Gambar besar diperkecil agar memori tetap aman.
        HTML tidak menjalankan script dan tidak memuat resource eksternal.
      </p>
    </div>
  );
}
