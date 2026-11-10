import { useEffect, useState } from 'react';
import { fmtSize, saveBlob } from '../../utils';
import { loadBitmap, exportCanvas, clearCanvas, bitmapToCanvas, extForMime, IMAGE_ACCEPT_STR } from '../../lib/image';

/** Minimal JPEG EXIF/APP1 probe — returns readable tags only; unknown if not present. */
async function probeJpegMeta(file: File): Promise<Record<string, string>> {
  const info: Record<string, string> = {};
  if (!file.type.includes('jpeg') && !file.name.toLowerCase().match(/\.jpe?g$/)) {
    info['Catatan'] = 'Pembacaan EXIF detail hanya untuk JPEG. PNG/WebP biasanya punya sedikit metadata.';
    return info;
  }
  try {
    const buf = await file.arrayBuffer();
    const u8 = new Uint8Array(buf);
    if (u8[0] !== 0xff || u8[1] !== 0xd8) {
      info['Status'] = 'Bukan JPEG valid.';
      return info;
    }
    let i = 2;
    while (i < u8.length - 4) {
      if (u8[i] !== 0xff) break;
      const marker = u8[i + 1];
      const len = (u8[i + 2] << 8) | u8[i + 3];
      if (marker === 0xe1 && len > 8) {
        // APP1
        const head = String.fromCharCode(...u8.slice(i + 4, i + 10));
        if (head.startsWith('Exif')) {
          info['EXIF'] = 'Segmen EXIF terdeteksi';
          // GPS IFD presence heuristic
          const slice = u8.slice(i + 4, i + 4 + len - 2);
          const text = new TextDecoder('ascii', { fatal: false }).decode(slice);
          if (/GPS/i.test(text)) info['GPS'] = 'Indikasi data GPS ditemukan';
          if (/Make|Model/i.test(text)) info['Perangkat'] = 'Tag kamera/perangkat terdeteksi';
          if (/DateTime/i.test(text)) info['Tanggal'] = 'Tag tanggal terdeteksi';
        } else if (head.startsWith('http')) {
          info['XMP'] = 'Metadata XMP terdeteksi';
        }
      }
      if (marker === 0xda) break; // SOS
      i += 2 + len;
    }
    if (!info['EXIF'] && !info['XMP']) info['Metadata'] = 'Tidak ada segmen EXIF/XMP yang terdeteksi.';
  } catch {
    info['Status'] = 'Gagal membaca struktur file.';
  }
  return info;
}

export default function ExifRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [bmp, setBmp] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState('');
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [fmt, setFmt] = useState('image/jpeg');
  const [q, setQ] = useState(92);
  const [out, setOut] = useState<{ blob: Blob; url: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { if (out) URL.revokeObjectURL(out.url); }, [out]);
  useEffect(() => () => { bmp?.close(); }, [bmp]);

  async function pick(f?: File) {
    if (!f) return;
    setOut(null); setMsg('');
    try {
      const b = await loadBitmap(f);
      bmp?.close();
      setFile(f); setBmp(b); setSrc(URL.createObjectURL(f));
      const m = await probeJpegMeta(f);
      m['Format'] = f.type || 'unknown';
      m['Dimensi'] = `${b.width}×${b.height}`;
      m['Ukuran'] = fmtSize(f.size);
      setMeta(m);
      setFmt(f.type === 'image/png' ? 'image/png' : f.type === 'image/webp' ? 'image/webp' : 'image/jpeg');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal memuat.');
    }
  }

  async function strip() {
    if (!bmp || !file) return;
    setBusy(true); setMsg('');
    try {
      // Canvas re-encode strips EXIF/XMP/ICC that browsers do not re-attach.
      const c = bitmapToCanvas(bmp, fmt === 'image/jpeg' ? '#ffffff' : undefined);
      const blob = await exportCanvas(c, fmt, q / 100);
      clearCanvas(c);
      if (out) URL.revokeObjectURL(out.url);
      setOut({ blob, url: URL.createObjectURL(blob) });
      setMsg(
        'Gambar di-encode ulang lewat Canvas. Sebagian besar metadata EXIF/XMP/GPS tidak ikut tersimpan. ' +
        'Browser tidak menjamin penghapusan 100% semua jenis metadata (mis. beberapa chunk PNG). Verifikasi mandiri jika kritis.',
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Gagal memproses.');
    }
    setBusy(false);
  }

  return (
    <div className="stack">
      <p className="muted"><small>File diproses secara lokal di browser Anda dan tidak diunggah ke server.</small></p>
      <label className="drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void pick(e.dataTransfer.files[0]); }}>
        <input type="file" accept={IMAGE_ACCEPT_STR} hidden onChange={(e) => void pick(e.target.files?.[0])} />
        {file ? file.name : 'Ketuk atau seret gambar'}
      </label>

      {src && (
        <>
          <img className="preview" src={src} alt="Asli" />
          <div className="stats">
            {Object.entries(meta).map(([k, v]) => (
              <div key={k}><span>{k}</span><b style={{ fontSize: '0.85rem' }}>{v}</b></div>
            ))}
          </div>
          <div className="row">
            <label>Format keluaran
              <select value={fmt} onChange={(e) => setFmt(e.target.value)}>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WebP</option>
              </select>
            </label>
            <label>Kualitas {q}%
              <input type="range" min={50} max={100} value={q} disabled={fmt === 'image/png'} onChange={(e) => setQ(+e.target.value)} />
            </label>
          </div>
          <button className="btn primary" disabled={busy} onClick={() => void strip()}>
            {busy ? 'Memproses…' : 'Hapus metadata (re-encode)'}
          </button>
        </>
      )}

      {out && (
        <div className="result">
          <img className="preview" src={out.url} alt="Tanpa metadata" />
          <p className="muted">Hasil: {fmtSize(out.blob.size)} · {out.blob.type}</p>
          <button className="btn primary" onClick={() => saveBlob(out.blob, `cleaned.${extForMime(out.blob.type)}`)}>Unduh</button>
        </div>
      )}
      {msg && <p className="muted" role="status">{msg}</p>}
    </div>
  );
}
