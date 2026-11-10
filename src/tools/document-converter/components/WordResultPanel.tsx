import { useEffect, useState } from 'react';

/** Pratinjau hasil Word Converter. HTML hanya lewat iframe sandbox (tanpa skrip). */
export function WordResultPanel({
  blob,
  fileName,
  previewText,
  previewHtml,
  outputFormat,
  onDownload,
}: {
  blob: Blob;
  fileName: string;
  previewText?: string;
  previewHtml?: string;
  outputFormat: string;
  onDownload: () => void;
}) {
  const [text, setText] = useState<string | null>(previewText ?? null);
  const [html, setHtml] = useState<string | null>(previewHtml ?? null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let dead = false;
    setText(previewText ?? null);
    setHtml(previewHtml ?? null);
    setPdfUrl(null);
    (async () => {
      if (outputFormat === 'txt' && previewText == null) {
        const t = await blob.text();
        if (!dead) setText(t);
      } else if (outputFormat === 'html' && previewHtml == null) {
        const t = await blob.text();
        if (!dead) setHtml(t);
      } else if (outputFormat === 'pdf') {
        url = URL.createObjectURL(blob);
        if (!dead) setPdfUrl(url);
      }
    })();
    return () => {
      dead = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [blob, outputFormat, previewText, previewHtml]);

  const docxNote = outputFormat === 'docx'
    ? 'Pratinjau menampilkan isi yang ditulis ke DOCX, bukan tata letak Microsoft Word. Unduh berkas untuk membuka di aplikasi pengolah kata.'
    : outputFormat === 'pdf'
      ? 'PDF ini dibuat otomatis di perangkat. Anda tidak perlu memilih Save as PDF.'
      : null;

  return (
    <div className="dc-preview">
      <div className="dc-queue-head">
        <h4>Pratinjau hasil</h4>
        <button type="button" className="btn primary" onClick={onDownload}>
          Unduh
        </button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        {fileName} · {Math.max(1, Math.round(blob.size / 1024))} KB
      </p>
      {docxNote && <p className="muted" style={{ margin: 0 }}>{docxNote}</p>}
      {outputFormat === 'txt' && text != null && <pre className="dc-preview-pre">{text}</pre>}
      {(outputFormat === 'html' || outputFormat === 'docx') && html != null && (
        <iframe className="dc-preview-frame" title="Pratinjau hasil" sandbox="" srcDoc={html} />
      )}
      {pdfUrl && <iframe className="dc-preview-frame dc-preview-pdf" title="Pratinjau PDF" src={pdfUrl} />}
    </div>
  );
}
