import { useEffect, useRef, useState } from 'react';
import { processImage, cropImage, type FilterId } from '../engine/scanner/process';
import type { ScanPage } from '../engine/scanner/types';
import { runOcr } from '../engine/ocr/engine';
import { pagesToPdf } from '../engine/ocr/export';
import { OcrResultEditor } from './OcrResultEditor';
import type { OcrResult } from '../engine/ocr/types';

let _pid = 1;
function nextId() { return `p${_pid++}`; }

export function DocumentScanner({ onClose }: { onClose?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [active, setActive] = useState(0);
  const [cameraOn, setCameraOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterId>('original');
  const [busy, setBusy] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [lang, setLang] = useState<'eng' | 'ind'>('eng');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => () => {
    stopCamera();
    pages.forEach((p) => URL.revokeObjectURL(p.previewUrl));
  }, []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCamError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('Kamera tidak tersedia di peramban ini. Gunakan unggah gambar.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Izin kamera ditolak atau tidak tersedia.');
    }
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
    if (!blob) return;
    await addPage(blob);
  }

  async function onUpload(files: FileList | null) {
    if (!files) return;
    for (const f of [...files]) {
      if (!/^image\//.test(f.type) && !/\.(png|jpe?g|webp|gif)$/i.test(f.name)) continue;
      if (f.size > 20 * 1048576) {
        setMsg('Gambar melebihi 20 MB dilewati.');
        continue;
      }
      await addPage(f);
    }
  }

  async function addPage(blob: Blob) {
    setBusy(true);
    try {
      const processed = await processImage(blob, { filter: 'original' });
      const page: ScanPage = {
        id: nextId(),
        previewUrl: processed.url,
        blob: processed.blob,
        filter: 'original',
        rotation: 0,
        width: processed.width,
        height: processed.height,
      };
      setPages((prev) => [...prev, page]);
      setActive(pages.length);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal memproses gambar.');
    } finally {
      setBusy(false);
    }
  }

  async function applyFilter(f: FilterId) {
    const p = pages[active];
    if (!p) return;
    setBusy(true);
    try {
      const processed = await processImage(p.blob, { filter: f, rotation: p.rotation });
      URL.revokeObjectURL(p.previewUrl);
      const updated: ScanPage = { ...p, previewUrl: processed.url, blob: processed.blob, filter: f, width: processed.width, height: processed.height };
      setPages((prev) => prev.map((x, i) => (i === active ? updated : x)));
      setFilter(f);
    } finally {
      setBusy(false);
    }
  }

  async function rotate() {
    const p = pages[active];
    if (!p) return;
    setBusy(true);
    try {
      const nextRot = (p.rotation + 90) % 360;
      const processed = await processImage(p.blob, { filter: p.filter, rotation: 90 });
      URL.revokeObjectURL(p.previewUrl);
      const updated: ScanPage = { ...p, previewUrl: processed.url, blob: processed.blob, rotation: nextRot, width: processed.width, height: processed.height };
      setPages((prev) => prev.map((x, i) => (i === active ? updated : x)));
    } finally {
      setBusy(false);
    }
  }

  function removePage(i: number) {
    const p = pages[i];
    if (p) URL.revokeObjectURL(p.previewUrl);
    setPages((prev) => prev.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, a >= i && a > 0 ? a - 1 : a));
  }

  function move(i: number, dir: -1 | 1) {
    setPages((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setActive(i + dir);
  }

  async function doOcr() {
    const p = pages[active];
    if (!p) return;
    setBusy(true);
    setOcrText(null);
    setOcrResult(null);
    try {
      const file = new File([p.blob], `scan-${active + 1}.png`, { type: 'image/png' });
      const r = await runOcr(file, { language: lang });
      setOcrResult(r);
      setOcrText(r.text || r.errors[0] || '(tidak ada teks)');
    } catch (e) {
      setOcrText(e instanceof Error ? e.message : 'OCR gagal.');
    } finally {
      setBusy(false);
    }
  }

  async function doOcrAll() {
    if (!pages.length) return;
    setBusy(true);
    setOcrResult(null);
    try {
      const allPages = [];
      const errors = [];
      for (let i = 0; i < pages.length; i++) {
        const file = new File([pages[i].blob], `scan-${i + 1}.png`, { type: 'image/png' });
        const r = await runOcr(file, { language: lang });
        if (r.pages[0]) allPages.push({ ...r.pages[0], page: i + 1 });
        else errors.push(...r.errors);
      }
      const text = allPages.map((p) => p.text).join('\n\n');
      const result: OcrResult = { text, pages: allPages, language: lang, status: errors.length ? 'partial' : 'success', errors, warnings: [] };
      setOcrResult(result);
      setOcrText(text);
    } finally {
      setBusy(false);
    }
  }

  async function doPdf() {
    if (!pages.length) return;
    setBusy(true);
    try {
      const blob = await pagesToPdf(pages.map((p) => p.blob));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scan.pdf';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMsg('PDF diunduh (gambar saja, bukan searchable PDF).');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal membuat PDF.');
    } finally {
      setBusy(false);
    }
  }

  const current = pages[active];

  return (
    <div className="doc-scanner">
      <div className="dc-queue-head">
        <h3 style={{ margin: 0 }}>Document Scanner</h3>
        {onClose && <button type="button" className="btn" onClick={onClose}>Tutup</button>}
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Ambil foto atau unggah gambar. Semua diproses di perangkat. Izin kamera hanya untuk mengambil gambar.
      </p>

      {!cameraOn && (
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn primary" onClick={startCamera}>Buka Kamera</button>
          <label className="btn">
            Unggah gambar
            <input type="file" accept="image/*" multiple hidden onChange={(e) => onUpload(e.target.files)} />
          </label>
        </div>
      )}
      {camError && <p className="er" role="alert">{camError}</p>}

      {cameraOn && (
        <div className="scanner-cam">
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 360, background: '#000' }} />
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.4rem' }}>
            <button type="button" className="btn primary" onClick={capture} disabled={busy}>Ambil Foto</button>
            <button type="button" className="btn" onClick={stopCamera}>Tutup Kamera</button>
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <>
          <div className="scanner-pages">
            {pages.map((p, i) => (
              <button key={p.id} type="button" className={i === active ? 'scanner-thumb on' : 'scanner-thumb'} onClick={() => setActive(i)}>
                <img src={p.previewUrl} alt="" />
                <span>{i + 1}</span>
              </button>
            ))}
          </div>

          {current && (
            <div className="scanner-preview">
              <img src={current.previewUrl} alt={`Halaman ${active + 1}`} style={{ maxWidth: '100%', height: 'auto' }} />
              <div className="scanner-controls">
                <button type="button" className="btn" onClick={rotate} disabled={busy}>Putar 90°</button>
                <select value={filter} onChange={(e) => applyFilter(e.target.value as FilterId)} disabled={busy}>
                  <option value="original">Original</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="bw">Hitam-Putih</option>
                  <option value="contrast">Kontras</option>
                  <option value="bright">Terang</option>
                </select>
                <button type="button" className="btn" onClick={() => move(active, -1)} disabled={active === 0}>↑</button>
                <button type="button" className="btn" onClick={() => move(active, 1)} disabled={active === pages.length - 1}>↓</button>
                <button type="button" className="btn" onClick={() => removePage(active)}>Hapus</button>
                <select value={lang} onChange={(e) => setLang(e.target.value as 'eng' | 'ind')} disabled={busy}>
                  <option value="eng">English</option>
                  <option value="ind">Indonesia (butuh model lokal)</option>
                </select>
                <button type="button" className="btn primary" onClick={doOcr} disabled={busy}>OCR halaman ini</button>
                <button type="button" className="btn" onClick={doOcrAll} disabled={busy}>OCR semua halaman</button>
                <button type="button" className="btn" onClick={doPdf} disabled={busy}>Unduh PDF gambar</button>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Halaman {active + 1}/{pages.length} · {current.width}×{current.height} · filter: {current.filter}
              </p>
            </div>
          )}

          {ocrResult && <OcrResultEditor result={ocrResult} onReset={() => setOcrResult(null)} />}
          {ocrText != null && (
            <details open>
              <summary>Hasil OCR (halaman {active + 1})</summary>
              <pre className="dc-preview-pre">{ocrText}</pre>
              <p className="muted">Ini hasil dari OCR Engine Batch 7A. Model bahasa harus tersedia di public/ocr/.</p>
            </details>
          )}
        </>
      )}

      {busy && <p className="muted">Memproses…</p>}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
