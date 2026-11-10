import { useState } from 'react';
import { chunkText, searchChunks, extractFacts, summarize, type Chunk } from './extract';

export default function DocumentAssistant() {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<{ text: string; sources: Chunk[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(f: File) {
    if (f.size > 10 * 1048576) { setMsg('File melebihi 10 MB.'); return; }
    setName(f.name);
    setMsg('Membaca…');
    try {
      let raw = '';
      if (/\.txt$/i.test(f.name) || f.type.startsWith('text/')) {
        raw = await f.text();
      } else if (/\.pdf$/i.test(f.name)) {
        raw = '(PDF: gunakan PDF Reader atau OCR yang sudah ada untuk mengekstrak teks, lalu tempel di sini. Ekstraksi otomatis PDF belum diintegrasikan di panel ini.)';
      } else {
        raw = await f.text();
      }
      setText(raw);
      setChunks(chunkText(raw));
      setAnswer(null);
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal membaca.');
    }
  }

  function ask() {
    if (!q.trim() || !chunks.length) return;
    const hits = searchChunks(chunks, q);
    if (!hits.length) {
      setAnswer({ text: 'Informasi tersebut tidak ditemukan dalam teks dokumen yang tersedia.', sources: [] });
      return;
    }
    setAnswer({ text: hits[0].text.slice(0, 400), sources: hits });
  }

  function exportJson() {
    const facts = extractFacts(text);
    const blob = new Blob([JSON.stringify({ name, summary: summarize(text), facts, note: 'rule-based' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'assistant.json'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  const facts = text ? extractFacts(text) : null;

  return (
    <div className="doc-assistant">
      <h2>Document Assistant</h2>
      <p className="muted">Rule-based search dan ekstraksi. Bukan AI generatif. Tidak mengirim dokumen ke server. Local AI: UNAVAILABLE.</p>
      <input type="file" accept=".txt,.pdf,.html,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {name && <p className="muted">{name} · {chunks.length} chunk</p>}
      {msg && <p className="muted">{msg}</p>}
      {text && (
        <>
          <h4>Ringkasan (rule-based)</h4>
          <p>{summarize(text)}</p>
          {facts && (
            <div>
              <p>Tanggal: {facts.dates.join(', ') || '—'}</p>
              <p>Nominal: {facts.amounts.join(', ') || '—'}</p>
              <p>Email: {facts.emails.join(', ') || '—'}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '.4rem', marginTop: '.5rem' }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tanya tentang dokumen…" style={{ flex: 1 }} onKeyDown={(e) => e.key === 'Enter' && ask()} />
            <button type="button" className="btn primary" onClick={ask}>Tanya</button>
          </div>
          {answer && (
            <div>
              <p>{answer.text}</p>
              {answer.sources.length > 0 && <p className="muted">Sumber: {answer.sources.map((s) => s.id).join(', ')}</p>}
            </div>
          )}
          <button type="button" className="btn" onClick={exportJson}>Unduh JSON</button>
          <button type="button" className="btn" onClick={() => { setText(''); setChunks([]); setAnswer(null); setName(''); }}>Hapus dokumen</button>
        </>
      )}
      <p className="er" role="status">Local AI model: UNAVAILABLE. Tidak ada model yang diunduh. Jawaban berasal dari pencarian teks, bukan inference AI.</p>
    </div>
  );
}
