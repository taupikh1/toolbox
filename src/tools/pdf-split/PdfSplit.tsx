import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { fmtSize, saveBlob } from '../../utils';

type Mode = 'all' | 'range' | 'each';

/** Parse "1-3,5,8-10" into sorted unique 0-based indices. */
export function parsePageSpec(spec: string, pageCount: number): number[] | string {
  const set = new Set<number>();
  const parts = spec.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return 'Masukkan nomor atau rentang halaman.';
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!m) return `Bagian tidak valid: "${part}"`;
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < 1) return 'Nomor halaman minimal 1.';
    if (a > pageCount || b > pageCount) return `Halaman di luar jangkauan (1–${pageCount}).`;
    if (a > b) return `Rentang terbalik: ${part}`;
    for (let i = a; i <= b; i++) set.add(i - 1);
  }
  return [...set].sort((x, y) => x - y);
}

export default function PdfSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<Mode>('range');
  const [spec, setSpec] = useState('1-1');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function pick(f?: File) {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setMsg('Hanya file PDF.');
      return;
    }
    try {
      const doc = await PDFDocument.load(await f.arrayBuffer(), { ignoreEncryption: true });
      const n = doc.getPageCount();
      setFile(f);
      setPageCount(n);
      setSpec(n > 1 ? `1-${n}` : '1');
      setMsg(`${n} halaman · ${fmtSize(f.size)}`);
    } catch {
      setMsg('PDF rusak atau terlindungi sandi (tidak didukung).');
      setFile(null);
      setPageCount(0);
    }
  }

  async function run() {
    if (!file || pageCount < 1) return;
    setBusy(true); setMsg('');
    try {
      const src = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, '') || 'split';

      if (mode === 'each') {
        for (let i = 0; i < pageCount; i++) {
          const out = await PDFDocument.create();
          const [p] = await out.copyPages(src, [i]);
          out.addPage(p);
          const bytes = await out.save();
          saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${base}-p${i + 1}.pdf`);
          await new Promise((r) => setTimeout(r, 150)); // give browser time between downloads
        }
        setMsg(`${pageCount} file diunduh (satu per halaman).`);
      } else {
        let indices: number[];
        if (mode === 'all') {
          indices = src.getPageIndices();
        } else {
          const parsed = parsePageSpec(spec, pageCount);
          if (typeof parsed === 'string') { setMsg(parsed); setBusy(false); return; }
          indices = parsed;
        }
        if (!indices.length) { setMsg('Tidak ada halaman dipilih.'); setBusy(false); return; }
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        const bytes = await out.save();
        saveBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${base}-extract.pdf`);
        setMsg(`Diekstrak ${indices.length} halaman.`);
      }
    } catch {
      setMsg('Gagal memproses PDF.');
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server. PDF bersandi tidak didukung. Split banyak halaman dapat memicu beberapa unduhan berurutan.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
        <input type="file" accept="application/pdf,.pdf" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {file ? file.name : 'Ketuk atau seret satu PDF'}
      </label>

      {pageCount > 0 && (
        <>
          <p className="muted">{pageCount} halaman</p>
          <div className="row">
            <button className={'btn' + (mode === 'all' ? ' primary' : '')} onClick={() => setMode('all')}>Semua halaman</button>
            <button className={'btn' + (mode === 'range' ? ' primary' : '')} onClick={() => setMode('range')}>Rentang / pilih</button>
            <button className={'btn' + (mode === 'each' ? ' primary' : '')} onClick={() => setMode('each')}>Tiap halaman terpisah</button>
          </div>
          {mode === 'range' && (
            <>
              <label>
                Halaman (contoh: 1-3,5,8-10)
                <input value={spec} onChange={(e) => setSpec(e.target.value)} />
              </label>
              <p className="muted"><small>Nomor dimulai dari 1. Duplikat diabaikan. Rentang terbalik ditolak.</small></p>
            </>
          )}
          <button className="btn primary" disabled={busy} onClick={() => void run()}>
            {busy ? 'Memproses…' : mode === 'each' ? 'Pisah & unduh semua' : 'Ekstrak & unduh'}
          </button>
        </>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
