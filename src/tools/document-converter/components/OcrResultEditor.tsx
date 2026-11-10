import { useState } from 'react';
import type { OcrResult } from '../engine/ocr/types';
import { ocrToTxt, ocrPagesToTxt } from '../engine/ocr/export';

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

export function OcrResultEditor({
  result,
  onReset,
}: {
  result: OcrResult;
  onReset?: () => void;
}) {
  const [text, setText] = useState(result.text);
  const [copied, setCopied] = useState(false);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="ocr-editor">
      <div className="dc-queue-head">
        <h3 style={{ margin: 0 }}>Hasil OCR</h3>
        <span className="muted">{result.status} · {result.language}</span>
      </div>

      {result.errors.length > 0 && (
        <p className="er" role="alert">{result.errors.join(' ')}</p>
      )}
      {result.warnings.length > 0 && (
        <p className="muted">{result.warnings.join(' ')}</p>
      )}

      <label className="dc-field">
        Teks (dapat diedit)
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} style={{ width: '100%', font: 'inherit' }} />
      </label>

      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn" onClick={copyAll}>{copied ? 'Tersalin' : 'Salin semua'}</button>
        <button type="button" className="btn" onClick={() => download(ocrToTxt(result, text), 'ocr.txt')}>Unduh TXT</button>
        <button type="button" className="btn" onClick={() => download(ocrPagesToTxt(result), 'ocr-per-halaman.txt')}>Unduh TXT per halaman</button>
        {onReset && <button type="button" className="btn" onClick={onReset}>Kembali ke hasil awal</button>}
      </div>

      <details>
        <summary>Detail per halaman</summary>
        {result.pages.map((p) => (
          <div key={p.page} className="ocr-page-detail">
            <strong>Halaman {p.page}</strong>
            <span className="muted"> · {p.source}{p.confidence != null ? ` · conf ${Math.round(p.confidence)}` : ''}</span>
            <pre className="dc-preview-pre" style={{ marginTop: '.3rem' }}>{p.text || '(kosong)'}</pre>
            <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(p.text)}>Salin halaman ini</button>
          </div>
        ))}
      </details>

      <p className="muted" style={{ margin: 0 }}>
        Confidence dan bounding box hanya ditampilkan jika engine menyediakannya. PDF hasil scan bukan searchable PDF (tidak ada text layer).
      </p>
    </div>
  );
}
