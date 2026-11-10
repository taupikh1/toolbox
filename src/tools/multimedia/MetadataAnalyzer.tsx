import { useState } from 'react';

interface Meta {
  name: string;
  size: number;
  type: string;
  extra: string[];
}

export default function MetadataAnalyzer() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(f: File) {
    const extra: string[] = [];
    if (f.type.startsWith('image/')) {
      try {
        const bmp = await createImageBitmap(f);
        extra.push(`Dimensi: ${bmp.width}×${bmp.height}`);
        bmp.close();
      } catch { extra.push('Gambar tidak dapat dibaca.'); }
    } else if (f.type.startsWith('audio/') || f.type.startsWith('video/')) {
      extra.push('Durasi/codec: tidak tersedia tanpa FFmpeg atau decoder browser.');
    } else if (/\.(srt|vtt)$/i.test(f.name)) {
      const text = await f.text();
      const cues = text.split(/\n\n+/).filter((b) => b.includes('-->')).length;
      extra.push(`Cue terdeteksi: ${cues}`);
    } else {
      extra.push('Format tidak dikenali untuk analisis mendalam.');
    }
    setMeta({ name: f.name, size: f.size, type: f.type || 'unknown', extra });
    setMsg(null);
  }

  function copy() {
    if (!meta) return;
    const t = `Nama: ${meta.name}\nUkuran: ${meta.size}\nTipe: ${meta.type}\n${meta.extra.join('\n')}`;
    navigator.clipboard.writeText(t).then(() => setMsg('Tersalin.')).catch(() => setMsg('Gagal menyalin.'));
  }

  return (
    <div className="meta-analyzer">
      <h2>Media Metadata Analyzer</h2>
      <p className="muted">Informasi dasar dari file. Codec/durasi video membutuhkan FFmpeg. Tidak ada data palsu.</p>
      <input type="file" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {meta && (
        <div>
          <p>Nama: {meta.name}</p>
          <p>Ukuran: {meta.size} byte</p>
          <p>Tipe: {meta.type}</p>
          {meta.extra.map((x, i) => <p key={i}>{x}</p>)}
          <button type="button" className="btn" onClick={copy}>Salin metadata</button>
        </div>
      )}
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}
