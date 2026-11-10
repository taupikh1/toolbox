import { useState } from 'react';

function extractInsights(text: string): { summary: string; keyPoints: string[]; terms: string[] } {
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const terms = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
  const keyPoints = sentences.slice(0, 5);
  const summary = keyPoints.slice(0, 3).join('. ') + (keyPoints.length ? '.' : '');
  return { summary: summary || '(tidak cukup teks)', keyPoints, terms };
}

export default function InsightsPanel() {
  const [text, setText] = useState('');
  const [out, setOut] = useState<ReturnType<typeof extractInsights> | null>(null);

  return (
    <div className="mm-insights">
      <h2>Extract Insights</h2>
      <p className="muted">Rule-based insights dari teks yang Anda tempel. Bukan AI. Tidak mengirim data ke server.</p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Tempel transcript atau teks di sini…" style={{ width: '100%', font: 'inherit' }} />
      <button type="button" className="btn primary" onClick={() => setOut(extractInsights(text))} disabled={!text.trim()}>Ekstrak</button>
      {out && (
        <div>
          <h4>Ringkasan (rule-based)</h4>
          <p>{out.summary}</p>
          <h4>Poin utama</h4>
          <ul>{out.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
          <h4>Istilah sering muncul</h4>
          <p>{out.terms.join(', ') || '—'}</p>
        </div>
      )}
      <p className="er" role="status">Transkripsi audio/video: UNAVAILABLE. Tidak ada engine speech recognition lokal. OCR bukan speech recognition.</p>
    </div>
  );
}
