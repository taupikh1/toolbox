import { useCallback, useEffect, useRef, useState } from 'react';
import { ffmpegManager } from '../../services/ffmpeg/ffmpegManager';

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
}

export default function AudioCutter() {
  const [file, setFile] = useState<File | null>(null);
  const [srcUrl, setSrcUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outUrl, setOutUrl] = useState<string | null>(null);
  const [outSize, setOutSize] = useState(0);
  const [outFormat, setOutFormat] = useState<'mp3' | 'wav' | 'm4a'>('mp3');
  const [msg, setMsg] = useState('');
  const [modReady, setModReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const unsub = ffmpegManager.subscribe((s) => setModReady(s === 'ready'));
    void ffmpegManager.checkCached().then(async (ok) => {
      if (ok) {
        await ffmpegManager.downloadAndInit();
      }
    });
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (srcUrl) URL.revokeObjectURL(srcUrl);
      if (outUrl) URL.revokeObjectURL(outUrl);
    };
  }, [srcUrl, outUrl]);

  const onFile = (f: File | null) => {
    if (srcUrl) URL.revokeObjectURL(srcUrl);
    if (outUrl) URL.revokeObjectURL(outUrl);
    setOutUrl(null);
    setFile(f);
    setMsg('');
    if (!f) {
      setSrcUrl(null);
      setDuration(0);
      setStart(0);
      setEnd(0);
      return;
    }
    const u = URL.createObjectURL(f);
    setSrcUrl(u);
  };

  const onLoadedMeta = () => {
    const a = audioRef.current;
    if (!a) return;
    const d = a.duration;
    if (Number.isFinite(d)) {
      setDuration(d);
      setStart(0);
      setEnd(d);
    }
  };

  const setStartFromPlay = () => {
    const a = audioRef.current;
    if (!a) return;
    const t = a.currentTime;
    setStart(Math.min(t, end - 0.05));
  };

  const setEndFromPlay = () => {
    const a = audioRef.current;
    if (!a) return;
    const t = a.currentTime;
    setEnd(Math.max(t, start + 0.05));
  };

  const cut = useCallback(async () => {
    if (!file || !modReady) {
      setMsg(modReady ? 'Pilih file audio dulu.' : 'Modul FFmpeg belum siap. Buka Media Tools dan unduh modul.');
      return;
    }
    if (start < 0 || end <= start || end > duration + 0.1) {
      setMsg('Rentang waktu tidak valid.');
      return;
    }
    setBusy(true);
    setProgress(0);
    setMsg('');
    if (outUrl) {
      URL.revokeObjectURL(outUrl);
      setOutUrl(null);
    }

    try {
      const inName = 'input' + (file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.bin');
      const outExt = outFormat === 'mp3' ? 'mp3' : outFormat === 'm4a' ? 'm4a' : 'wav';
      const outName = `cut.${outExt}`;

      await ffmpegManager.writeFile(inName, new Uint8Array(await file.arrayBuffer()));

      const args =
        outFormat === 'wav'
          ? ['-ss', String(start), '-to', String(end), '-i', inName, '-c:a', 'pcm_s16le', outName]
          : outFormat === 'm4a'
            ? ['-ss', String(start), '-to', String(end), '-i', inName, '-c:a', 'aac', '-b:a', '192k', outName]
            : ['-ss', String(start), '-to', String(end), '-i', inName, '-c:a', 'libmp3lame', '-b:a', '192k', outName];

      // Re-encode for accurate cut boundaries (not stream-copy).
      await ffmpegManager.exec(args, (p) => setProgress(Math.round(p * 100)));
      const data = await ffmpegManager.readFile(outName);
      const mime = outFormat === 'wav' ? 'audio/wav' : outFormat === 'm4a' ? 'audio/mp4' : 'audio/mpeg';
      const blob = new Blob([data], { type: mime });
      setOutSize(blob.size);
      setOutUrl(URL.createObjectURL(blob));

      await ffmpegManager.deleteFile(inName);
      await ffmpegManager.deleteFile(outName);
    } catch (e) {
      setMsg((e as Error).message || 'Gagal memotong audio.');
    } finally {
      setBusy(false);
    }
  }, [file, modReady, start, end, duration, outFormat, outUrl]);

  const download = () => {
    if (!outUrl) return;
    const a = document.createElement('a');
    a.href = outUrl;
    a.download = `cut-${Date.now()}.${outFormat === 'm4a' ? 'm4a' : outFormat}`;
    a.click();
  };

  return (
    <div className="tool">
      <p className="muted">
        Potong audio secara lokal. Memerlukan modul FFmpeg (unduh sekali di Media Tools). Pemotongan memakai re-encode agar batas waktu akurat.
      </p>

      {!modReady && (
        <p className="er">
          Modul FFmpeg belum siap. Buka <a href="#/tools/media-module">Media Tools</a> lalu unduh modul.
        </p>
      )}

      <label>
        File audio
        <input
          type="file"
          accept="audio/*,video/*"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {srcUrl && (
        <>
          <audio ref={audioRef} src={srcUrl} controls onLoadedMetadata={onLoadedMeta} style={{ width: '100%', margin: '0.75rem 0' }} />
          <p className="muted">Durasi: {formatTime(duration)}</p>

          <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 120 }}>
              Start (detik)
              <input
                type="number"
                min={0}
                max={duration}
                step={0.01}
                value={start}
                onChange={(e) => setStart(Math.max(0, Math.min(Number(e.target.value) || 0, end - 0.05)))}
              />
            </label>
            <label style={{ flex: 1, minWidth: 120 }}>
              End (detik)
              <input
                type="number"
                min={0}
                max={duration}
                step={0.01}
                value={end}
                onChange={(e) => setEnd(Math.min(duration, Math.max(Number(e.target.value) || 0, start + 0.05)))}
              />
            </label>
          </div>

          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
            <button className="btn" type="button" onClick={setStartFromPlay}>
              Set start dari posisi
            </button>
            <button className="btn" type="button" onClick={setEndFromPlay}>
              Set end dari posisi
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setStart(0);
                setEnd(duration);
              }}
            >
              Reset
            </button>
          </div>

          <label>
            Format output
            <select value={outFormat} onChange={(e) => setOutFormat(e.target.value as typeof outFormat)}>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="m4a">M4A (AAC)</option>
            </select>
          </label>

          <button className="btn primary" disabled={busy || !modReady} onClick={() => void cut()} style={{ marginTop: '0.75rem' }}>
            {busy ? `Memotong… ${progress}%` : 'Potong audio'}
          </button>
        </>
      )}

      {msg && <p className="er">{msg}</p>}

      {outUrl && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <b>Hasil</b>
          <p className="muted">
            {(outSize / 1024).toFixed(1)} KB · {formatTime(end - start)}
          </p>
          <audio controls src={outUrl} style={{ width: '100%', margin: '0.5rem 0' }} />
          <button className="btn primary" onClick={download}>
            Unduh
          </button>
        </div>
      )}
    </div>
  );
}
