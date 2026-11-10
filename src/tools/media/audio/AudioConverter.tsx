import { useState, useRef, useEffect } from 'react';
import { ffmpegManager } from '../../../services/ffmpeg/ffmpegManager';
import { fmtSize, saveBlob } from '../../../utils';

interface FileInfo { name: string; size: number; type: string; }

const PRESETS: Record<string, { format: string; bitrate?: number; sampleRate?: number; channels?: number; label: string }> = {
  small: { format: 'mp3', bitrate: 64, label: 'Small File (64 kbps MP3)' },
  balanced: { format: 'mp3', bitrate: 128, label: 'Balanced (128 kbps MP3)' },
  high: { format: 'mp3', bitrate: 256, label: 'High Quality (256 kbps MP3)' },
  wav: { format: 'wav', label: 'WAV Uncompressed' },
};

export default function AudioConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<FileInfo | null>(null);
  const [format, setFormat] = useState<'mp3' | 'm4a' | 'wav'>('mp3');
  const [bitrate, setBitrate] = useState(128);
  const [sampleRate, setSampleRate] = useState(44100);
  const [channels, setChannels] = useState(2);
  const [preset, setPreset] = useState('balanced');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; name: string } | null>(null);
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function pick(f?: File) {
    if (!f) return;
    setFile(f);
    setInfo({ name: f.name, size: f.size, type: f.type });
    setResult(null);
    setMsg('');
  }

  function applyPreset(key: string) {
    setPreset(key);
    const p = PRESETS[key];
    if (!p) return;
    setFormat(p.format as any);
    if (p.bitrate) setBitrate(p.bitrate);
  }

  async function convert() {
    if (!file || !ffmpegManager.isReady()) return;
    setBusy(true);
    setProgress(0);
    setMsg('Mengonversi...');
    const inputName = 'input' + (file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.mp3');
    const outputName = `output.${format}`;

    try {
      await ffmpegManager.writeFile(inputName, file);
      const args = ['-i', inputName];
      if (format === 'mp3') {
        args.push('-acodec', 'libmp3lame', '-ab', `${bitrate}k`, '-ar', String(sampleRate), '-ac', String(channels), outputName);
      } else if (format === 'm4a') {
        args.push('-acodec', 'aac', '-ab', `${bitrate}k`, '-ar', String(sampleRate), '-ac', String(channels), outputName);
      } else {
        args.push('-acodec', 'pcm_s16le', '-ar', String(sampleRate), '-ac', String(channels), outputName);
      }
      await ffmpegManager.exec(args, (p) => setProgress(Math.round(p * 100)));
      const data = await ffmpegManager.readFile(outputName);
      const blob = new Blob([data], { type: format === 'mp3' ? 'audio/mpeg' : format === 'm4a' ? 'audio/mp4' : 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setResult({ url, blob, name: file.name.replace(/\.[^.]+$/, '') + `.${format}` });
      setMsg('Konversi selesai.');
      await ffmpegManager.deleteFile(inputName);
      await ffmpegManager.deleteFile(outputName);
    } catch (e: any) {
      setMsg('Gagal: ' + (e.message || 'tidak diketahui'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3>Audio Converter</h3>
      <p className="muted">Konversi format audio (MP3, M4A, WAV, dll) dengan preset atau pengaturan kustom.</p>
      <input ref={inputRef} type="file" accept="audio/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      <button className="btn" onClick={() => inputRef.current?.click()}>Pilih Audio</button>
      {info && (
        <div className="file-info" style={{ margin: '12px 0' }}>
          <div><strong>{info.name}</strong> — {fmtSize(info.size)} — {info.type || 'unknown'}</div>
        </div>
      )}
      {file && (
        <>
          <div style={{ margin: '12px 0' }}>
            <label>Preset: </label>
            <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
              {Object.entries(PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              <option value="custom">Custom</option>
            </select>
          </div>
          <div style={{ margin: '12px 0' }}>
            <label>Format: </label>
            <select value={format} onChange={(e) => { setFormat(e.target.value as any); setPreset('custom'); }}>
              <option value="mp3">MP3</option>
              <option value="m4a">M4A (AAC)</option>
              <option value="wav">WAV</option>
            </select>
            {format !== 'wav' && (
              <>
                <label style={{ marginLeft: 12 }}>Bitrate (kbps): </label>
                <input type="number" min={32} max={320} value={bitrate} onChange={(e) => { setBitrate(Number(e.target.value)); setPreset('custom'); }} style={{ width: 80 }} />
              </>
            )}
            <label style={{ marginLeft: 12 }}>Sample Rate: </label>
            <select value={sampleRate} onChange={(e) => { setSampleRate(Number(e.target.value)); setPreset('custom'); }}>
              <option value={22050}>22050</option>
              <option value={44100}>44100</option>
              <option value={48000}>48000</option>
            </select>
            <label style={{ marginLeft: 12 }}>Channels: </label>
            <select value={channels} onChange={(e) => { setChannels(Number(e.target.value)); setPreset('custom'); }}>
              <option value={1}>Mono</option>
              <option value={2}>Stereo</option>
            </select>
          </div>
          <button className="btn primary" disabled={busy} onClick={convert}>{busy ? `Memproses ${progress}%` : 'Convert'}</button>
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
