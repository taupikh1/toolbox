export interface Cue {
  id: string;
  start: number; // ms
  end: number;
  text: string;
}

function parseTime(s: string): number {
  const m = s.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  return (+m[1]) * 3600000 + (+m[2]) * 60000 + (+m[3]) * 1000 + (+m[4]);
}

export function parseSrt(raw: string): Cue[] {
  const blocks = raw.replace(/\r/g, '').split(/\n\n+/);
  const cues: Cue[] = [];
  for (const b of blocks) {
    const lines = b.split('\n').filter(Boolean);
    if (lines.length < 2) continue;
    const timeLine = lines.find((l) => l.includes('-->'));
    if (!timeLine) continue;
    const [a, c] = timeLine.split('-->');
    const text = lines.slice(lines.indexOf(timeLine) + 1).join('\n');
    cues.push({ id: `c${cues.length + 1}`, start: parseTime(a), end: parseTime(c), text });
  }
  return cues;
}

export function parseVtt(raw: string): Cue[] {
  const body = raw.replace(/^WEBVTT.*\n/, '');
  return parseSrt(body);
}

export function toSrt(cues: Cue[]): string {
  return cues.map((c, i) => {
    const fmt = (ms: number) => {
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      const f = ms % 1000;
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(f).padStart(3,'0')}`;
    };
    return `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n`;
  }).join('\n');
}

export function toVtt(cues: Cue[]): string {
  const body = toSrt(cues).replace(/,/g, '.');
  return `WEBVTT\n\n${body}`;
}

export function validateCues(cues: Cue[]): string[] {
  const issues: string[] = [];
  cues.forEach((c, i) => {
    if (c.start < 0 || c.end < 0) issues.push(`Cue ${i + 1}: timestamp negatif.`);
    if (c.end <= c.start) issues.push(`Cue ${i + 1}: end <= start.`);
    if (!c.text.trim()) issues.push(`Cue ${i + 1}: teks kosong.`);
  });
  for (let i = 1; i < cues.length; i++) {
    if (cues[i].start < cues[i - 1].end) issues.push(`Cue ${i} dan ${i + 1} overlap.`);
  }
  return issues;
}

export function shiftCues(cues: Cue[], deltaMs: number): Cue[] {
  return cues.map((c) => ({ ...c, start: Math.max(0, c.start + deltaMs), end: Math.max(0, c.end + deltaMs) }));
}
