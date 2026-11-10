import { useMemo, useState } from 'react';
import Copy from '../Copy';
import { b64ToBytes, b64dec, b64enc, bytesToB64 } from '../../lib/dev';
import { fmtSize, saveBlob } from '../../utils';

const MAX_FILE = 10 * 1048576;

function FileMode() {
  const [enc, setEnc] = useState(true);
  const [out, setOut] = useState('');
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [name, setName] = useState('hasil.bin');

  async function encode(f?: File) {
    if (!f) return;
    setErr(''); setOut('');
    if (f.size > MAX_FILE) { setErr('File di atas 10 MB. Batas ini menjaga memori HP.'); return; }
    try { setOut(bytesToB64(new Uint8Array(await f.arrayBuffer()))); setInfo(`${f.name} (${fmtSize(f.size)})`); }
    catch { setErr('Gagal membaca file.'); }
  }
  function decode() {
    setErr('');
    try { const b = b64ToBytes(text); saveBlob(new Blob([b as BlobPart]), name.trim() || 'hasil.bin'); setInfo(`File dibuat: ${fmtSize(b.length)}`); }
    catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="stack">
      <div className="row">
        <button className={'btn' + (enc ? ' primary' : '')} onClick={() => setEnc(true)}>File ke Base64</button>
        <button className={'btn' + (!enc ? ' primary' : '')} onClick={() => setEnc(false)}>Base64 ke File</button>
      </div>
      {enc ? (
        <>
          <label className="drop"><input type="file" hidden onChange={(e) => void encode(e.target.files?.[0])} />Ketuk untuk memilih file (maks 10 MB)</label>
          {out && <>
            <p className="ok" role="status">{info}: {out.length.toLocaleString('id-ID')} karakter Base64</p>
            <textarea className="mono" rows={4} readOnly value={out.length > 3000 ? out.slice(0, 3000) + '…' : out} aria-label="Pratinjau Base64" />
            {out.length > 3000 && <p className="muted">Pratinjau dipotong. Salin atau unduh untuk hasil lengkap.</p>}
            <div className="row"><Copy text={out} label="Salin semua" primary /><button className="btn" onClick={() => saveBlob(new Blob([out], { type: 'text/plain' }), 'base64.txt')}>Unduh .txt</button></div>
          </>}
        </>
      ) : (
        <>
          <label>Base64<textarea className="mono" rows={6} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} /></label>
          <label>Nama file hasil<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <button className="btn primary" disabled={!text.trim()} onClick={decode}>Decode dan unduh</button>
          {info && !err && <p className="ok" role="status">{info}</p>}
        </>
      )}
      {err && <p className="er" role="alert">{err}</p>}
      <p className="muted">Semua diproses di perangkatmu. Ekstensi nama file hasil menentukan cara file dibuka, jadi isi sesuai jenis aslinya.</p>
    </div>
  );
}

export default function Base64Tools() {
  const [file, setFile] = useState(false);
  const [enc, setEnc] = useState(true);
  const [text, setText] = useState('');
  const r = useMemo(() => {
    if (!text) return { out: '' };
    try { return { out: enc ? b64enc(text) : b64dec(text) }; } catch (e) { return { out: '', err: (e as Error).message }; }
  }, [text, enc]);
  return (
    <div className="stack">
      <div className="row">
        <button className={'btn' + (!file ? ' primary' : '')} onClick={() => setFile(false)}>Teks</button>
        <button className={'btn' + (file ? ' primary' : '')} onClick={() => setFile(true)}>File</button>
      </div>
      {file ? <FileMode /> : (
        <>
          <div className="row">
            <button className={'btn' + (enc ? ' primary' : '')} onClick={() => setEnc(true)}>Encode</button>
            <button className={'btn' + (!enc ? ' primary' : '')} onClick={() => setEnc(false)}>Decode</button>
            <button className="btn" disabled={!r.out} onClick={() => { setText(r.out); setEnc(!enc); }}>⇄ Tukar</button>
          </div>
          <label>Input<textarea className="mono" rows={6} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} /></label>
          {r.err && <p className="er" role="alert">{r.err}</p>}
          <label>Output<textarea className="mono" rows={6} readOnly value={r.out} /></label>
          <div className="row">
            <Copy text={r.out} label="Salin output" primary />
            <button className="btn" onClick={() => setText(enc ? 'Halo dunia 🌏 日本語' : 'SGFsbyBkdW5pYSDwn4yPIOaXpeacrOiqng==')}>Contoh</button>
            <button className="btn" disabled={!text} onClick={() => setText('')}>Hapus</button>
          </div>
          <p className="muted">Teks dikodekan sebagai UTF-8, jadi emoji dan aksara non-Latin aman. Decode juga menerima Base64URL.</p>
        </>
      )}
    </div>
  );
}
