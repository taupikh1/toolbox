import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react';
import {
  openPdfDocument,
  formatBytes,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from './pdfjs-loader';

type ViewMode = 'single' | 'continuous';
type FitMode = 'custom' | 'width' | 'page';

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const SCALE_STEP = 0.15;
const MAX_FILE_BYTES = 80 * 1024 * 1024;

interface DocMeta {
  name: string;
  size: number;
  pages: number;
}

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return true;
  return file.type === 'application/pdf' || file.type === 'application/x-pdf';
}

export default function PdfReader() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [meta, setMeta] = useState<DocMeta | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState<FitMode>('width');
  const [mode, setMode] = useState<ViewMode>('single');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<{ page: number; index: number }[]>([]);
  const [searchIdx, setSearchIdx] = useState(-1);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchSupported, setSearchSupported] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const textLayerRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const renderTasks = useRef<Map<number, { cancel: () => void }>>(new Map());
  const pageCache = useRef<Map<number, PDFPageProxy>>(new Map());
  const abortRef = useRef(0);

  const closeDocument = useCallback(() => {
    abortRef.current += 1;
    renderTasks.current.forEach((t) => {
      try { t.cancel(); } catch { /* ignore */ }
    });
    renderTasks.current.clear();
    pageCache.current.forEach((p) => {
      try { p.cleanup(); } catch { /* ignore */ }
    });
    pageCache.current.clear();
    canvasRefs.current.clear();
    textLayerRefs.current.clear();
    if (doc) {
      try { doc.cleanup(); } catch { /* ignore */ }
    }
    setDoc(null);
    setMeta(null);
    setPage(1);
    setScale(1);
    setFit('width');
    setError(null);
    setProgress(null);
    setSearchQuery('');
    setSearchMatches([]);
    setSearchIdx(-1);
  }, [doc]);

  useEffect(() => () => { abortRef.current += 1; }, []);

  async function loadFile(file: File) {
    if (!isPdfFile(file)) {
      setError('File bukan PDF. Pilih file dengan ekstensi .pdf.');
      return;
    }
    if (file.size === 0) {
      setError('File kosong.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`File terlalu besar (${formatBytes(file.size)}). Batas pembaca: ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }

    closeDocument();
    const token = ++abortRef.current;
    setBusy(true);
    setError(null);
    setProgress('Membaca file…');

    try {
      const buf = await file.arrayBuffer();
      if (token !== abortRef.current) return;

      const head = new Uint8Array(buf.slice(0, 5));
      const sig = String.fromCharCode(...head);
      if (!sig.startsWith('%PDF')) {
        setError('File tidak valid: bukan PDF (signature hilang).');
        setBusy(false);
        setProgress(null);
        return;
      }

      setProgress('Memuat dokumen…');
      const pdf = await openPdfDocument(buf, (loaded, total) => {
        if (token !== abortRef.current) return;
        if (total > 0) setProgress(`Memuat… ${Math.round((loaded / total) * 100)}%`);
      });
      if (token !== abortRef.current) {
        pdf.cleanup();
        return;
      }

      setDoc(pdf);
      setMeta({ name: file.name, size: file.size, pages: pdf.numPages });
      setPage(1);
      setFit('width');
      setProgress(null);
    } catch (e: unknown) {
      if (token !== abortRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (/password/i.test(msg)) {
        setError('PDF dilindungi kata sandi. Fitur buka PDF berpassword belum tersedia di batch ini.');
      } else if (/Invalid PDF|corrupted|format error/i.test(msg)) {
        setError('PDF rusak atau tidak didukung.');
      } else {
        setError(`Gagal membuka PDF: ${msg}`);
      }
    } finally {
      if (token === abortRef.current) {
        setBusy(false);
        setProgress(null);
      }
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) void loadFile(f);
    e.target.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void loadFile(f);
  }

  const recomputeFit = useCallback(
    async (pdf: PDFDocumentProxy, pageNum: number, fitMode: FitMode) => {
      if (fitMode === 'custom') return;
      const container = viewerRef.current;
      if (!container) return;
      try {
        let p = pageCache.current.get(pageNum);
        if (!p) {
          p = await pdf.getPage(pageNum);
          pageCache.current.set(pageNum, p);
        }
        const vp = p.getViewport({ scale: 1 });
        const pad = 32;
        const availW = Math.max(120, container.clientWidth - pad);
        const availH = Math.max(120, container.clientHeight - pad);
        let s: number;
        if (fitMode === 'width') s = availW / vp.width;
        else s = Math.min(availW / vp.width, availH / vp.height);
        s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
        setScale(s);
      } catch { /* ignore */ }
    },
    [],
  );

  useEffect(() => {
    if (!doc || !meta) return;
    void recomputeFit(doc, page, fit);
  }, [doc, meta, page, fit, recomputeFit]);

  const renderPage = useCallback(
    async (pdf: PDFDocumentProxy, pageNum: number, targetScale: number) => {
      const canvas = canvasRefs.current.get(pageNum);
      if (!canvas) return;
      const token = abortRef.current;

      const prev = renderTasks.current.get(pageNum);
      if (prev) {
        try { prev.cancel(); } catch { /* ignore */ }
        renderTasks.current.delete(pageNum);
      }

      try {
        let p = pageCache.current.get(pageNum);
        if (!p) {
          p = await pdf.getPage(pageNum);
          if (token !== abortRef.current) return;
          pageCache.current.set(pageNum, p);
        }

        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale: targetScale });
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const task = p.render({
          canvasContext: ctx,
          viewport,
          transform,
          canvas,
        });
        renderTasks.current.set(pageNum, task);
        await task.promise;
        renderTasks.current.delete(pageNum);

        const textDiv = textLayerRefs.current.get(pageNum);
        if (textDiv && searchSupported) {
          try {
            const { importPdfJs } = await import('../../lib/pdfjs-runtime');
            const pdfjs = await importPdfJs();
            textDiv.innerHTML = '';
            textDiv.style.width = `${Math.floor(viewport.width)}px`;
            textDiv.style.height = `${Math.floor(viewport.height)}px`;
            const textContent = await p.getTextContent();
            if (token !== abortRef.current) return;
            const textLayer = new pdfjs.TextLayer({
              textContentSource: textContent,
              container: textDiv,
              viewport,
            });
            await textLayer.render();
          } catch {
            setSearchSupported(false);
          }
        }
      } catch (e: unknown) {
        const name = e instanceof Error ? e.name : '';
        if (name === 'RenderingCancelledException' || name === 'AbortException') return;
      }
    },
    [searchSupported],
  );

  useEffect(() => {
    if (!doc || mode !== 'single') return;
    void renderPage(doc, page, scale);
  }, [doc, page, scale, mode, renderPage]);

  useEffect(() => {
    if (!doc || mode !== 'continuous' || !meta) return;
    const start = Math.max(1, page - 1);
    const end = Math.min(meta.pages, page + 2);
    for (let i = start; i <= end; i++) void renderPage(doc, i, scale);
  }, [doc, page, scale, mode, meta, renderPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!doc || !meta) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        setPage((p) => Math.min(meta.pages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setPage(meta.pages);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        setFit('custom');
        setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setFit('custom');
        setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setFit('width');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, meta]);

  useEffect(() => {
    if (mode !== 'continuous') return;
    const el = document.getElementById(`pdf-page-${page}`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [page, mode]);

  async function runSearch() {
    if (!doc || !meta || !searchQuery.trim()) {
      setSearchMatches([]);
      setSearchIdx(-1);
      return;
    }
    setSearchBusy(true);
    const q = searchQuery.trim().toLowerCase();
    const matches: { page: number; index: number }[] = [];
    try {
      for (let i = 1; i <= meta.pages; i++) {
        let p = pageCache.current.get(i);
        if (!p) {
          p = await doc.getPage(i);
          pageCache.current.set(i, p);
        }
        const tc = await p.getTextContent();
        const text = tc.items
          .map((it) => ('str' in it ? (it as { str: string }).str : ''))
          .join(' ')
          .toLowerCase();
        let from = 0;
        let idx = 0;
        while ((from = text.indexOf(q, from)) !== -1) {
          matches.push({ page: i, index: idx++ });
          from += q.length;
        }
      }
      setSearchMatches(matches);
      setSearchIdx(matches.length ? 0 : -1);
      if (matches.length) setPage(matches[0].page);
    } catch {
      setSearchSupported(false);
      setSearchMatches([]);
      setSearchIdx(-1);
    } finally {
      setSearchBusy(false);
    }
  }

  function goSearch(delta: number) {
    if (!searchMatches.length) return;
    const next = (searchIdx + delta + searchMatches.length) % searchMatches.length;
    setSearchIdx(next);
    setPage(searchMatches[next].page);
  }

  function zoomBy(delta: number) {
    setFit('custom');
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(s + delta).toFixed(2))));
  }

  function goPage(n: number) {
    if (!meta) return;
    setPage(Math.max(1, Math.min(meta.pages, n)));
  }

  function toggleFullscreen() {
    const el = viewerRef.current?.closest('.pdf-reader') ?? viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) void el.requestFullscreen?.();
    else void document.exitFullscreen?.();
  }

  if (!doc || !meta) {
    return (
      <div className="stack pdf-reader">
        <div className="tool-head">
          <h1>PDF Reader</h1>
        </div>
        <p className="muted">
          Buka dan baca PDF sepenuhnya di perangkat Anda. File tidak diunggah ke server.
        </p>
        <div
          className={'drop' + (over ? ' over' : '')}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? 'Memuat…' : 'Pilih file PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={onPick}
          />
          <p className="muted" style={{ margin: '.5rem 0 0' }}>
            atau seret file PDF ke sini. Maks. {formatBytes(MAX_FILE_BYTES)}.
          </p>
        </div>
        {progress && <p className="muted">{progress}</p>}
        {error && <p className="er" role="alert">{error}</p>}
      </div>
    );
  }

  const pagesToShow =
    mode === 'single' ? [page] : Array.from({ length: meta.pages }, (_, i) => i + 1);

  return (
    <div className="pdf-reader stack">
      <div className="tool-head">
        <h1>PDF Reader</h1>
        <span className="muted" style={{ fontSize: '.85rem' }} title={meta.name}>
          {meta.name} · {formatBytes(meta.size)} · {meta.pages} hlm
        </span>
      </div>

      <div className="pdf-toolbar" role="toolbar" aria-label="Kontrol PDF">
        <button type="button" className="btn sm" onClick={() => fileInputRef.current?.click()} title="Buka file lain">
          Buka
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />

        <span className="pdf-sep" aria-hidden="true" />

        <button type="button" className="btn sm" disabled={page <= 1} onClick={() => goPage(page - 1)} title="Halaman sebelumnya" aria-label="Halaman sebelumnya">
          ←
        </button>
        <label className="pdf-page-input">
          <span className="sr-only">Nomor halaman</span>
          <input
            type="number"
            min={1}
            max={meta.pages}
            value={page}
            onChange={(e) => goPage(Number(e.target.value) || 1)}
            aria-label="Nomor halaman"
          />
          <span className="muted">/ {meta.pages}</span>
        </label>
        <button type="button" className="btn sm" disabled={page >= meta.pages} onClick={() => goPage(page + 1)} title="Halaman berikutnya" aria-label="Halaman berikutnya">
          →
        </button>

        <span className="pdf-sep" aria-hidden="true" />

        <button type="button" className="btn sm" onClick={() => zoomBy(-SCALE_STEP)} title="Perkecil">−</button>
        <span className="muted" style={{ minWidth: '3.5rem', textAlign: 'center', fontSize: '.85rem' }}>
          {Math.round(scale * 100)}%
        </span>
        <button type="button" className="btn sm" onClick={() => zoomBy(SCALE_STEP)} title="Perbesar">+</button>
        <button type="button" className={'btn sm' + (fit === 'width' ? ' primary' : '')} onClick={() => setFit('width')} title="Sesuaikan lebar">Lebar</button>
        <button type="button" className={'btn sm' + (fit === 'page' ? ' primary' : '')} onClick={() => setFit('page')} title="Sesuaikan halaman">Halaman</button>
        <button type="button" className="btn sm" onClick={() => { setFit('custom'); setScale(1); }} title="Reset zoom">100%</button>

        <span className="pdf-sep" aria-hidden="true" />

        <button type="button" className={'btn sm' + (mode === 'single' ? ' primary' : '')} onClick={() => setMode('single')} title="Mode satu halaman">Satu</button>
        <button type="button" className={'btn sm' + (mode === 'continuous' ? ' primary' : '')} onClick={() => setMode('continuous')} title="Mode gulir kontinu">Gulir</button>

        <span className="pdf-sep" aria-hidden="true" />

        <button type="button" className="btn sm" onClick={toggleFullscreen} title="Layar penuh">⛶</button>
        <button type="button" className="btn sm" onClick={closeDocument} title="Tutup dokumen">Tutup</button>
      </div>

      {searchSupported && (
        <div className="pdf-search">
          <input
            type="search"
            placeholder="Cari teks dalam PDF…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
            aria-label="Cari teks"
          />
          <button type="button" className="btn sm" disabled={searchBusy || !searchQuery.trim()} onClick={() => void runSearch()}>
            {searchBusy ? '…' : 'Cari'}
          </button>
          {searchMatches.length > 0 && (
            <>
              <span className="muted" style={{ fontSize: '.85rem' }}>{searchIdx + 1}/{searchMatches.length}</span>
              <button type="button" className="btn sm" onClick={() => goSearch(-1)} aria-label="Hasil sebelumnya">↑</button>
              <button type="button" className="btn sm" onClick={() => goSearch(1)} aria-label="Hasil berikutnya">↓</button>
            </>
          )}
          {searchQuery && searchMatches.length === 0 && !searchBusy && (
            <span className="muted" style={{ fontSize: '.85rem' }}>Tidak ditemukan</span>
          )}
        </div>
      )}

      {error && <p className="er" role="alert">{error}</p>}

      <div
        className={'pdf-viewer' + (mode === 'continuous' ? ' continuous' : '')}
        ref={viewerRef}
        tabIndex={0}
        aria-label="Area tampilan PDF"
      >
        {pagesToShow.map((n) => (
          <div key={n} id={`pdf-page-${n}`} className={'pdf-page' + (n === page ? ' current' : '')} data-page={n}>
            <div className="pdf-page-inner">
              <canvas
                ref={(el) => {
                  if (el) canvasRefs.current.set(n, el);
                  else canvasRefs.current.delete(n);
                }}
              />
              <div
                className="pdf-text-layer"
                ref={(el) => {
                  if (el) textLayerRefs.current.set(n, el);
                  else textLayerRefs.current.delete(n);
                }}
              />
            </div>
            {mode === 'continuous' && <div className="pdf-page-label muted">Halaman {n}</div>}
          </div>
        ))}
      </div>

      <p className="muted" style={{ fontSize: '.8rem' }}>
        Teks dapat dipilih dan disalin jika PDF mengandung lapisan teks. PDF berbasis gambar memerlukan OCR (Batch 8).
        Semua pemrosesan lokal di browser.
      </p>
    </div>
  );
}
