import { useMemo, useRef, useState } from 'react';
import type { Availability, ConversionDefinition, ConverterPageId, ConversionProgress as Progress } from '../types/conversion';
import { conversionRegistry } from '../registry/conversion-registry';
import { OCR_LANGUAGES } from '../registry/conversion-definitions';
import { PAGE_LAYOUTS } from '../registry/page-layouts';
import { acceptFor, checkFiles, type CheckedFile } from '../services/file-service';
import { FORMAT_SPECS } from '../validation/file-formats';
import { getMaxMB } from '../validation/file-limits';
import { ConverterLayout } from './ConverterLayout';
import { ConversionStatus } from './ConversionStatus';
import { ConversionOptions } from './ConversionOptions';
import { FileDropzone } from './FileDropzone';
import { FileQueue } from './FileQueue';
import { UnsupportedFeatureNotice } from './UnsupportedFeatureNotice';
import { ConversionProgress } from './ConversionProgress';
import { WordResultPanel } from './WordResultPanel';
import { PptxViewer } from './PptxViewer';
import { PptxWriter } from './PptxWriter';
import { DocumentScanner } from './DocumentScanner';
import { OnlineConversionNotice } from './OnlineConversionNotice';
import { PdfTableEditor } from './PdfTableEditor';
import { AdvancedConverter } from './AdvancedConverter';
import { extractTablesFromPdf } from '../engine/pdf-table/extract';
import type { ExtractedTable } from '../engine/pdf-table/types';
import { outputName } from '../engine/word/names';

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Kerangka bersama kelima halaman. Susunan dari PAGE_LAYOUTS; status dari registry. */
export function ConverterPage({ page }: { page: ConverterPageId }) {
  const layout = PAGE_LAYOUTS[page];
  const defs = useMemo(() => conversionRegistry.forPage(page), [page]);
  const unsupported = defs.filter((d) => d.availability === 'unsupported');
  const counts = useMemo(() => {
    const c: Partial<Record<Availability, number>> = {};
    for (const d of defs) if (d.availability !== 'unsupported') c[d.availability] = (c[d.availability] ?? 0) + 1;
    return c;
  }, [defs]);
  const [selId, setSelId] = useState<string | null>(null);
  const [queue, setQueue] = useState<CheckedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [losses, setLosses] = useState<string[]>([]);
  const [paste, setPaste] = useState('');
  const [outName, setOutName] = useState('');
  const [viewerFile, setViewerFile] = useState<File | null>(null);
  const [showWriter, setShowWriter] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pdfTables, setPdfTables] = useState<ExtractedTable[] | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [result, setResult] = useState<{ blob: Blob; fileName: string; previewText?: string; previewHtml?: string; outputFormat: string } | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sel = defs.find((d) => d.id === selId) ?? null;
  const runnable = sel ? conversionRegistry.isRunnable(sel) : false;

  function select(d: ConversionDefinition) {
    if (abortRef.current) abortRef.current.abort();
    setSelId(d.id);
    setQueue([]);
    setError(null);
    setProgress(null);
    setResultMsg(null);
    setLosses([]);
    setPaste('');
    setOutName('');
    setResult(null);
    requestAnimationFrame(() => {
      const el = detailRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  async function onFiles(files: File[]) {
    if (!sel) return;
    setBusy(true);
    setError(null);
    setResultMsg(null);
    setLosses([]);
    setResult(null);
    try {
      const checked = await checkFiles(files, sel);
      setQueue((q) => [...q, ...checked]);
    } catch {
      setError('File tidak dapat dibaca. Coba pilih file lagi.');
    } finally {
      setBusy(false);
    }
  }

  async function runConvert() {
    if (!sel || !sel.execute || !runnable) return;
    const pasteIds = sel.id === 'txt-to-docx' || sel.id === 'html-to-docx';
    let okFiles = queue.filter((x) => x.result.ok).map((x) => x.file);
    if (okFiles.length === 0 && pasteIds && paste.trim()) {
      const ext = sel.id === 'html-to-docx' ? 'html' : 'txt';
      const mime = ext === 'html' ? 'text/html' : 'text/plain;charset=utf-8';
      const base = outName.trim() || 'dokumen';
      okFiles = [new File([paste], outputName(base, ext), { type: mime })];
    }
    if (okFiles.length === 0) {
      setError('Tidak ada file yang lolos pemeriksaan. Unggah file yang valid terlebih dahulu.');
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setConverting(true);
    setError(null);
    setResultMsg(null);
    setLosses([]);
    setProgress({ phase: 'start', message: 'Memulai konversi…' });
    try {
      const out = await sel.execute(okFiles, {
        signal: ac.signal,
        onProgress: (p) => setProgress(p),
      });
      if (ac.signal.aborted) return;
      const ext = out.fileName.split('.').pop() || sel.outputFormats[0] || 'bin';
      const fileName = outName.trim() ? outputName(outName, ext) : out.fileName;
      if (page === 'word') {
        setResult({
          blob: out.blob,
          fileName,
          previewText: out.previewText,
          previewHtml: out.previewHtml,
          outputFormat: sel.outputFormats[0] || ext,
        });
        setResultMsg(`Siap diunduh: ${fileName} (${Math.max(1, Math.round(out.blob.size / 1024))} KB).`);
      } else {
        downloadBlob(out.blob, fileName);
        setResultMsg(`Berhasil: ${fileName} (${Math.round(out.blob.size / 1024)} KB). File diunduh.`);
      }
      setLosses(out.losses ?? []);
      setProgress({ phase: 'done', message: 'Selesai', percent: 100 });
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg = e instanceof Error ? e.message : String(e);
      setError('Konversi gagal: ' + msg);
      setProgress(null);
    } finally {
      setConverting(false);
      abortRef.current = null;
    }
  }

  const okCount = queue.filter((x) => x.result.ok).length;
  const pasteReady = !!sel && (sel.id === 'txt-to-docx' || sel.id === 'html-to-docx') && paste.trim().length > 0;
  const canRun = runnable && (okCount > 0 || pasteReady) && !converting && !busy;
  const srStatus = converting
    ? (progress?.message ?? 'Sedang mengonversi…')
    : busy
      ? 'Memeriksa file…'
      : error ??
        resultMsg ??
        (queue.length
          ? `${queue.length} file diperiksa: ${okCount} sesuai, ${queue.length - okCount} ditolak.`
          : '');

  return (
    <ConverterLayout layout={layout} counts={counts}>
      {page === 'ocr' && (
        <section className="dc-explainer" aria-label="Bahasa OCR yang direncanakan">
          <h2>Bahasa OCR yang direncanakan</h2>
          <div className="chips">
            {OCR_LANGUAGES.map((l) => (
              <span key={l.code} className="dc-badge">{l.label}</span>
            ))}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Model bahasa tidak ikut paket aplikasi. OCR hanya berjalan setelah berkas bahasa tersedia di folder ocr. Tanpa model, ekstraksi gagal.
          </p>
        </section>
      )}
      {layout.groups.map((g, gi) => {
        const items = g.ids.map((id) => conversionRegistry.get(id)).filter((d): d is ConversionDefinition => !!d);
        const hasSel = !!sel && g.ids.includes(sel.id);
        const hid = `dc-g-${page}-${gi}`;
        return (
          <section key={g.title} className="dc-group" aria-labelledby={hid}>
            <h2 id={hid}>{g.title}</h2>
            <ul className="dc-grid">
              {items.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={'dc-item' + (d.id === selId ? ' on' : '')}
                    aria-pressed={d.id === selId}
                    onClick={() => select(d)}
                  >
                    <b>{d.name}</b>
                    <span className="dc-item-desc">{d.description}</span>
                    <ConversionStatus availability={d.availability} />
                  </button>
                </li>
              ))}
            </ul>
            {hasSel && sel && (
              <div ref={detailRef} tabIndex={-1} className="dc-detail-wrap">
                <ConversionOptions
                  def={sel}
                  onClose={() => {
                    if (abortRef.current) abortRef.current.abort();
                    setSelId(null);
                    setQueue([]);
                    setError(null);
                    setResultMsg(null);
                    setLosses([]);
                    setProgress(null);
                    setPaste('');
                    setOutName('');
                    setResult(null);
                  }}
                  onConvert={runnable ? runConvert : undefined}
                  converting={converting}
                  canConvert={canRun}
                >
                  <div className="dc-check">
                    <h4>{runnable ? 'Unggah file & konversi' : 'Periksa kelayakan file (bukan konversi)'}</h4>
                    <p className="muted" style={{ margin: 0 }}>
                      {runnable
                        ? 'File diproses sepenuhnya di peramban Anda. Tidak ada unggahan ke server.'
                        : 'Aplikasi hanya memeriksa ekstensi, isi file, dan ukuran. Tidak ada file yang dikonversi, dikirim, atau disimpan.'}
                    </p>
                    <FileDropzone
                      accept={acceptFor(sel)}
                      hint={`Format: ${sel.inputFormats.map((f) => FORMAT_SPECS[f].label).join(', ')} · maks ${getMaxMB(sel.limitCategory)} MB per file.`}
                      onFiles={onFiles}
                    />
                    <FileQueue
                      items={queue}
                      onRemove={(id) => setQueue((q) => q.filter((x) => x.id !== id))}
                      onClear={() => setQueue([])}
                    />
                    {page === 'word' && runnable && (sel.id === 'txt-to-docx' || sel.id === 'html-to-docx') && (
                      <label className="dc-field">
                        <span>{sel.id === 'html-to-docx' ? 'Atau tempel HTML' : 'Atau ketik / tempel teks'}</span>
                        <textarea
                          className="dc-textarea"
                          value={paste}
                          onChange={(e) => {
                            setPaste(e.target.value);
                            setResult(null);
                          }}
                          rows={6}
                          spellCheck={false}
                          placeholder={sel.id === 'html-to-docx' ? '<h1>Judul</h1><p>Paragraf</p>' : 'Paragraf pertama.\n\nParagraf kedua.'}
                        />
                      </label>
                    )}
                    {page === 'word' && runnable && (
                      <label className="dc-field">
                        <span>Nama file hasil (opsional)</span>
                        <input
                          className="dc-input"
                          value={outName}
                          onChange={(e) => setOutName(e.target.value)}
                          placeholder="mis. laporan akhir"
                          autoComplete="off"
                        />
                      </label>
                    )}
                    <ConversionProgress progress={progress} />
                    <p className="sr-only" role="status">
                      {srStatus}
                    </p>
                    {error && (
                      <p className="er" role="alert">
                        {error}
                      </p>
                    )}
                    {resultMsg && (
                      <p className="ok" role="status" style={{ color: 'var(--ok, #0a7)' }}>
                        {resultMsg}
                      </p>
                    )}
                    {losses.length > 0 && (
                      <UnsupportedFeatureNotice title="Catatan hasil konversi" items={losses} />
                    )}
                    {page === 'word' && result && (
                      <WordResultPanel
                        blob={result.blob}
                        fileName={result.fileName}
                        previewText={result.previewText}
                        previewHtml={result.previewHtml}
                        outputFormat={result.outputFormat}
                        onDownload={() => downloadBlob(result.blob, result.fileName)}
                      />
                    )}
                  </div>
                </ConversionOptions>
              </div>
            )}
          </section>
        );
      })}
      {!sel && <p className="muted">Pilih salah satu fitur di atas untuk melihat detail dan keterbatasannya.</p>}
      {unsupported.length > 0 && (
        <UnsupportedFeatureNotice
          title="Belum didukung"
          items={unsupported.map((d) => `${d.name}: ${d.limitations[0] ?? 'Tidak didukung.'}`)}
        />
      )}
      {page === 'pdf' && <AdvancedConverter />}
      {page === 'pdf' && !pdfTables && (
        <section className="dc-detail" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 .5rem' }}>PDF ke Excel (Table Extractor)</h3>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>
            Ekstrak tabel dari PDF (text layer). Hasil heuristik, dapat diedit lalu diekspor.
          </p>
          <FileDropzone
            accept=".pdf,application/pdf"
            hint="Hanya PDF. Diproses di perangkat."
            disabled={false}
            onFiles={async (files) => {
              const f = files[0];
              if (!f || !/\.pdf$/i.test(f.name)) return;
              const buf = await f.arrayBuffer();
              const r = await extractTablesFromPdf(buf);
              setPdfName(f.name.replace(/\.pdf$/i, ''));
              setPdfTables(r.tables);
            }}
          />
        </section>
      )}
      {page === 'pdf' && pdfTables && (
        <PdfTableEditor tables={pdfTables} fileName={pdfName} onClose={() => setPdfTables(null)} />
      )}
      {page === 'powerpoint' && <OnlineConversionNotice />}
      {page === 'ocr' && !showScanner && (
        <section className="dc-detail" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 .5rem' }}>Document Scanner</h3>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>Ambil foto dokumen atau unggah gambar, lalu rapikan dan kirim ke OCR.</p>
          <button type="button" className="btn primary" onClick={() => setShowScanner(true)}>Buka Scanner</button>
        </section>
      )}
      {page === 'ocr' && showScanner && <DocumentScanner onClose={() => setShowScanner(false)} />}
      {page === 'powerpoint' && !showWriter && !viewerFile && (
        <section className="dc-detail" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 .5rem' }}>Buat Presentasi</h3>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>Buat file PPTX baru dengan judul, teks, dan gambar.</p>
          <button type="button" className="btn primary" onClick={() => setShowWriter(true)}>Buka Editor PPTX</button>
        </section>
      )}
      {page === 'powerpoint' && showWriter && <PptxWriter />}
      {page === 'powerpoint' && !viewerFile && (
        <section className="dc-detail" style={{ marginTop: '1rem' }}>
          <h3 style={{ margin: '0 0 .5rem' }}>Lihat Slide (Preview)</h3>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>
            Buka file PPTX untuk melihat teks dan gambar slide. Bukan tampilan identik PowerPoint.
          </p>
          <FileDropzone
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            hint="Hanya file .pptx. Diproses di perangkat, tidak diunggah."
            disabled={false}
            onFiles={(files) => {
              const f = files[0];
              if (f && /\.pptx$/i.test(f.name)) setViewerFile(f);
            }}
          />
        </section>
      )}
      {page === 'powerpoint' && viewerFile && (
        <PptxViewer file={viewerFile} onClose={() => setViewerFile(null)} />
      )}
    </ConverterLayout>
  );
}
