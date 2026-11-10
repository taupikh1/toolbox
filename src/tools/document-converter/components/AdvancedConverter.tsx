import { useState } from 'react';
import { pdfToDocx } from '../engine/advanced/pdf-to-docx';
import { pdfToPptx } from '../engine/advanced/pdf-to-pptx';
import { pptxToPdf } from '../engine/advanced/pptx-to-pdf';

function download(blob: Blob, name: string) {
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

export function AdvancedConverter() {
  const [msg, setMsg] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(files: FileList | null, kind: 'docx' | 'pptx' | 'pptxpdf') {
    const f = files?.[0];
    if (!f) return;
    setBusy(true);
    setMsg(null);
    setReport(null);
    try {
      if (kind === 'docx') {
        const r = await pdfToDocx(await f.arrayBuffer());
        download(r.blob, f.name.replace(/\.pdf$/i, '') + '.docx');
        setReport(`${r.label} · ${r.pageCount} halaman · kualitas: ${r.quality} · ${r.warnings.length} peringatan`);
      } else if (kind === 'pptx') {
        const r = await pdfToPptx(await f.arrayBuffer());
        download(r.blob, f.name.replace(/\.pdf$/i, '') + '.pptx');
        setReport(`${r.label} · ${r.slideCount} slide · kualitas: ${r.quality}`);
      } else {
        const r = await pptxToPdf(f);
        download(r.blob, f.name.replace(/\.pptx$/i, '') + '.pdf');
        setReport(`${r.label} · ${r.pageCount} halaman · kualitas: ${r.quality}`);
      }
      setMsg('File diunduh.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Konversi gagal.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="adv-converter">
      <h3>Advanced Converter</h3>
      <p className="muted">Konversi lokal. Hasil bukan jaminan identik dengan sumber. URL→PDF terbatas CORS browser.</p>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <label className="btn">PDF → DOCX (teks)<input type="file" accept=".pdf" hidden onChange={(e) => handle(e.target.files, 'docx')} /></label>
        <label className="btn">PDF → PPTX (gambar)<input type="file" accept=".pdf" hidden onChange={(e) => handle(e.target.files, 'pptx')} /></label>
        <label className="btn">PPTX → PDF (teks)<input type="file" accept=".pptx" hidden onChange={(e) => handle(e.target.files, 'pptxpdf')} /></label>
      </div>
      <p className="muted">DOCX→PDF dan XLSX→PDF sudah tersedia di halaman Word/Excel Converter.</p>
      <p className="er" role="status">URL → PDF: LIMITED BY BROWSER SECURITY (CORS). Tidak ada proxy. Gunakan Print/Save as PDF dari browser jika perlu.</p>
      {busy && <p className="muted">Memproses…</p>}
      {msg && <p className="muted">{msg}</p>}
      {report && <p className="muted">{report}</p>}
    </div>
  );
}
