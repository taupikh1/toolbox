import { useCallback, useEffect, useRef, useState } from 'react';

type RecState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped' | 'error';

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/ogg'];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export default function AudioRecorder() {
  const [state, setState] = useState<RecState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [mime, setMime] = useState('');
  const [msg, setMsg] = useState('');
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef(0);
  const pausedTotalRef = useRef(0);
  const pauseStartRef = useRef(0);
  const timerRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);

  const cleanupStream = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = 0;
  };

  const tick = useCallback(() => {
    if (state !== 'recording') return;
    const now = performance.now();
    setElapsed(now - startTsRef.current - pausedTotalRef.current);
  }, [state]);

  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = window.setInterval(tick, 200);
      return () => stopTimer();
    }
    stopTimer();
  }, [state, tick]);

  useEffect(() => () => {
    stopTimer();
    cleanupStream();
    if (url) URL.revokeObjectURL(url);
  }, [cleanupStream, url]);

  const meterLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    setLevel(Math.min(1, rms * 4));
    rafRef.current = requestAnimationFrame(meterLoop);
  }, []);

  const start = async () => {
    setMsg('');
    setBlob(null);
    if (url) {
      URL.revokeObjectURL(url);
      setUrl(null);
    }
    chunksRef.current = [];
    setElapsed(0);
    pausedTotalRef.current = 0;

    if (!window.isSecureContext) {
      setState('error');
      setMsg('Mikrofon memerlukan HTTPS (atau localhost).');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setState('error');
      setMsg('Browser tidak mendukung MediaRecorder / getUserMedia.');
      return;
    }

    const chosen = pickMime();
    if (!chosen) {
      setState('error');
      setMsg('Tidak ada format audio yang didukung MediaRecorder di browser ini.');
      return;
    }
    setMime(chosen);

    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyserRef.current = analyser;
        rafRef.current = requestAnimationFrame(meterLoop);
      } catch {
        /* meter optional */
      }

      const rec = new MediaRecorder(stream, { mimeType: chosen });
      recRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: chosen });
        setBlob(b);
        const u = URL.createObjectURL(b);
        setUrl(u);
        cleanupStream();
        setState('stopped');
        setLevel(0);
      };
      rec.onerror = () => {
        setMsg('Kesalahan saat merekam.');
        setState('error');
        cleanupStream();
      };

      startTsRef.current = performance.now();
      rec.start(250);
      setState('recording');
    } catch (e) {
      const err = e as DOMException;
      setState('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMsg('Izin mikrofon ditolak.');
      } else {
        setMsg(err.message || 'Gagal mengakses mikrofon.');
      }
      cleanupStream();
    }
  };

  const pause = () => {
    const rec = recRef.current;
    if (!rec || rec.state !== 'recording') return;
    rec.pause();
    pauseStartRef.current = performance.now();
    setState('paused');
  };

  const resume = () => {
    const rec = recRef.current;
    if (!rec || rec.state !== 'paused') return;
    pausedTotalRef.current += performance.now() - pauseStartRef.current;
    rec.resume();
    setState('recording');
  };

  const stop = () => {
    const rec = recRef.current;
    if (!rec || (rec.state !== 'recording' && rec.state !== 'paused')) return;
    rec.stop();
  };

  const download = () => {
    if (!blob || !url) return;
    const a = document.createElement('a');
    a.href = url;
    const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
    a.download = `recording-${Date.now()}.${ext}`;
    a.click();
  };

  const canPause = typeof MediaRecorder !== 'undefined' && 'pause' in MediaRecorder.prototype;

  return (
    <div className="tool">
      <p className="muted">Rekam audio dari mikrofon perangkat. File tetap di perangkatmu.</p>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {(state === 'idle' || state === 'stopped' || state === 'error') && (
          <button className="btn primary" onClick={() => void start()}>
            ● Rekam
          </button>
        )}
        {state === 'recording' && (
          <>
            {canPause && (
              <button className="btn" onClick={pause}>
                ⏸ Pause
              </button>
            )}
            <button className="btn" onClick={stop}>
              ■ Stop
            </button>
          </>
        )}
        {state === 'paused' && (
          <>
            <button className="btn primary" onClick={resume}>
              ▶ Lanjut
            </button>
            <button className="btn" onClick={stop}>
              ■ Stop
            </button>
          </>
        )}
      </div>

      {(state === 'recording' || state === 'paused') && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {formatMs(elapsed)}
            {state === 'recording' && <span className="er" style={{ marginLeft: 8, fontSize: '0.9rem' }}>● REC</span>}
            {state === 'paused' && <span className="muted" style={{ marginLeft: 8, fontSize: '0.9rem' }}>PAUSED</span>}
          </div>
          <div
            role="meter"
            aria-label="Level audio"
            aria-valuenow={Math.round(level * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{ height: 8, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden', marginTop: 8 }}
          >
            <div style={{ width: `${level * 100}%`, height: '100%', background: 'var(--ac)', transition: 'width 80ms linear' }} />
          </div>
        </div>
      )}

      {msg && <p className="er">{msg}</p>}

      {blob && url && (
        <div className="card">
          <b>Hasil rekaman</b>
          <p className="muted">
            {(blob.size / 1024).toFixed(1)} KB · {mime || 'audio'}
          </p>
          <audio controls src={url} style={{ width: '100%', margin: '0.5rem 0' }} />
          <button className="btn primary" onClick={download}>
            Unduh
          </button>
        </div>
      )}
    </div>
  );
}
