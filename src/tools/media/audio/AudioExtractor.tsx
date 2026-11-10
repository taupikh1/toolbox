import { useState, useRef, useEffect } from 'react';
import { ffmpegManager } from '../../../services/ffmpeg/ffmpegManager';
import { fmtSize, saveBlob } from '../../../utils';

interface FileInfo { name: string; size: number; type: string; duration?: number; }

export default function AudioExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3');
  const [bitrate, setBitrate] = useState(128);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function pick(f?: File) {
    if (!f) return;
    setFile(f);
    setInfo({ name: f.name, size: f.size, type: f.type });
    setResult(null);
    setMsg('');
    // Try to read duration
    const url = URL.createObjectURL(f);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      setInfo((prev) => prev ? { ...prev, duration: v.duration } : null);
      URL.revokeObjectURL(url);
    };
    v.src = url;
  }

  async function extract() {
    if (!file || !ffmpegManager.isReady()) return;
    setBusy(true);
    setProgress(0);
    setMsg('Memproses...');
    const inputName = 'input' + (file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.mp4');
    const outputName = `output.${format}`;

    try {
      await ffmpegManager.writeFile(inputName, file);
      const args = ['-i', inputName];
      if (format === 'mp3') {
        args.push('-vn', '-acodec', 'libmp3lame', '-ab', `${bitrate}k`, outputName);
      } else if (format === 'm4a') {
        args.push('-vn', '-acodec', 'aac', '-ab', `${bitrate}k`, outputName);
      } else {
        args.push('-vn', '-acodec', 'pcm_s16le', outputName);
      }
      await ffmpegManager.exec(args, (p) => setProgress(Math.round(p * 100)));
      const data = await ffmpegManager.readFile(outputName);
      const blob = new Blob([data], { type: format === 'mp3' ? 'audio/mpeg' : format === 'm4a' ? 'audio/mp4' : 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setResult({ url, blob, name: file.name.replace(/\.[^.]+$/, '') + `.${format}` });
      setMsg('Selesai. Preview di bawah.');
      await ffmpegManager.deleteFile(inputName);
      await ffmpegManager.deleteFile(outputName);
    } catch (e: any) {
      setMsg('Gagal: ' + (e.message || 'tidak diketahui') + '. Pastikan video memiliki audio stream.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3>Audio Extractor</h3>
      <p className="muted">Ekstrak audio dari video (MP4, WebM, dll) ke MP3, M4A, atau WAV.</p>
      <input ref={inputRef} type="file" accept="video/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button className="btn" onClick={() => inputRef.current?.click()}>Pilih Video</button>
      {info && (
        <div className="file-info" style={{ margin: '12px 0' }}>
          <div><strong>{info.name}</strong> — {fmtSize(info.size)} — {info.type || 'unknown'}</div>
          {info.duration && <div>Durasi: {info.duration.toFixed(1)} detik</div>}
        </div>
      )}
      {file && (
        <>
          <div style={{ margin: '12px 0' }}>
            <label>Format: </label>
            <select value={format} onChange={(e) => setFormat(e.target.value as any)}>
              <option value="mp3">MP3</option>
              <option value="m4a">M4A (AAC)</option>
              <option value="wav">WAV</option>
            </select>
            {format !== 'wav' && (
              <>
                <label style={{ marginLeft: 12 }}>Bitrate (kbps): </label>
                <input type="number" min={32} max={320} value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))} style={{ width: 80 }} />
              </>
            )}
          </div>
          <button className="btn primary" disabled={busy} onClick={extract}>{busy ? `Memproses ${progress}%` : 'Ekstrak Audio'}</button>
          {busy && <progress value={progress} max={100} style={{ width: '100%', marginTop: 8 }} />}
        </>
      )}
      {msg && <p>{msg}</p>}
      {result && (
        <div style={{ marginTop: 16 }}>
          <audio controls src={result.url} style={{ width: '100%' }} />
          <button className="btn" onClick={() => saveBlob(result.blob, result.name)}>Download {result.name}</button>
        </div>
      )}
    </div>
  );
}
