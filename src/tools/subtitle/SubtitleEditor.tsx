import { useState } from 'react';
import { parseSrt, parseVtt, toSrt, toVtt, validateCues, shiftCues, type Cue } from './parser';

function download(text: string, name: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
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

export default function SubtitleEditor() {
  const [cues, setCues] = useState<Cue[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);

  function onFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const parsed = /\.vtt$/i.test(f.name) ? parseVtt(raw) : parseSrt(raw);
      setCues(parsed);
      setIssues(validateCues(parsed));
    };
    reader.readAsText(f);
  }

  function update(i: number, patch: Partial<Cue>) {
    setCues((prev) => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function applyShift() {
    const next = shiftCues(cues, offset);
    setCues(next);
    setIssues(validateCues(next));
  }

  return (
    <div className="sub-editor">
      <h2>Subtitle Tools</h2>
      <p className="muted">Buka SRT atau VTT, edit, geser waktu, unduh. Semua lokal.</p>
      <input type="file" accept=".srt,.vtt,text/plain" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {cues.length > 0 && (
        <>
          <p className="muted">{cues.length} cue · {issues.length} peringatan</p>
          {issues.length > 0 && <ul>{issues.map((x, i) => <li key={i} className="er">{x}</li>)}</ul>}
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
            <label>Geser (ms) <input type="number" value={offset} onChange={(e) => setOffset(+e.target.value || 0)} style={{ width: 80 }} /></label>
            <button type="button" className="btn" onClick={applyShift}>Terapkan</button>
            <button type="button" className="btn" onClick={() => download(toSrt(cues), 'subtitle.srt')}>Unduh SRT</button>
            <button type="button" className="btn" onClick={() => download(toVtt(cues), 'subtitle.vtt')}>Unduh VTT</button>
          </div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            {cues.map((c, i) => (
              <div key={c.id} className="sub-cue">
                <span className="muted">{c.start} → {c.end}</span>
                <input value={c.text} onChange={(e) => update(i, { text: e.target.value })} style={{ width: '100%' }} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
