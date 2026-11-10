import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../../utils';

type ScanStatus = 'idle' | 'requesting' | 'streaming' | 'denied' | 'unsupported' | 'error';

export default function QrScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<string | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(() => void scanLoop());
      return;
    }
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0 && codes[0].rawValue) {
        setResult(codes[0].rawValue);
        setStatus('idle');
        stopCamera();
        return;
      }
    } catch {
      /* continue scanning */
    }
    rafRef.current = requestAnimationFrame(() => void scanLoop());
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setResult(null);
    setMsg('');
    setCopied(false);
    stopCamera();

    if (!window.isSecureContext) {
      setStatus('error');
      setMsg('Kamera memerlukan HTTPS (atau localhost).');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      setMsg('Browser tidak mendukung akses kamera.');
      return;
    }

    const hasDetector = typeof window.BarcodeDetector !== 'undefined';
    if (!hasDetector) {
      setStatus('unsupported');
      setMsg('BarcodeDetector tidak tersedia di browser ini. Coba Chrome/Edge terbaru, atau gunakan QR Generator untuk membuat kode.');
      return;
    }

    try {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch {
      setStatus('unsupported');
      setMsg('Gagal membuat detektor QR.');
      return;
    }

    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const track = stream.getVideoTracks()[0];
      const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
      setTorchSupported(!!caps?.torch);
      setStatus('streaming');
      rafRef.current = requestAnimationFrame(() => void scanLoop());
    } catch (e) {
      const err = e as DOMException;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatus('denied');
        setMsg('Izin kamera ditolak. Aktifkan di pengaturan browser.');
      } else if (err.name === 'NotFoundError') {
        setStatus('error');
        setMsg('Tidak ada kamera yang ditemukan.');
      } else {
        setStatus('error');
        setMsg(err.message || 'Gagal membuka kamera.');
      }
    }
  }, [facing, scanLoop, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      setMsg('Senter tidak didukung pada perangkat ini.');
    }
  };

  const isUrl = result && /^https?:\/\//i.test(result.trim());

  return (
    <div className="tool">
      <p className="muted">
        Pindai QR Code dengan kamera. Hasil ditampilkan sebagai teks — URL <strong>tidak</strong> dibuka otomatis.
      </p>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="btn primary" onClick={() => void startCamera()} disabled={status === 'requesting' || status === 'streaming'}>
          {status === 'streaming' ? 'Memindai…' : 'Mulai kamera'}
        </button>
        {status === 'streaming' && (
          <button className="btn" onClick={stopCamera}>
            Stop
          </button>
        )}
        <button
          className="btn"
          onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={status === 'streaming'}
        >
          {facing === 'environment' ? 'Kamera belakang' : 'Kamera depan'}
        </button>
        {torchSupported && status === 'streaming' && (
          <button className="btn" onClick={() => void toggleTorch()}>
            {torchOn ? '🔦 Senter ON' : '🔦 Senter'}
          </button>
        )}
      </div>

      {status === 'streaming' && (
        <div className="preview-wrap" style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: '0.75rem' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(124,140,255,.6)', pointerEvents: 'none', borderRadius: 12 }} />
        </div>
      )}

      {msg && <p className="er">{msg}</p>}
      {status === 'denied' && <p className="er">Izin kamera diperlukan untuk memindai.</p>}
      {status === 'unsupported' && <p className="muted">{msg || 'Fitur tidak didukung di browser ini.'}</p>}

      {result && (
        <div className="card" style={{ marginTop: '0.5rem' }}>
          <b>Hasil scan</b>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '0.5rem 0' }}>{result}</pre>
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn"
              onClick={async () => {
                if (await copyText(result)) {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
            >
              {copied ? 'Tersalin ✓' : 'Salin'}
            </button>
            {isUrl && (
              <a className="btn primary" href={result.trim()} target="_blank" rel="noopener noreferrer">
                Buka link (pilihanmu)
              </a>
            )}
            <button className="btn" onClick={() => void startCamera()}>
              Scan ulang
            </button>
          </div>
          {isUrl && <p className="muted" style={{ marginTop: '0.5rem' }}>Link tidak dibuka otomatis demi keamanan.</p>}
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    BarcodeDetector: new (opts?: { formats?: string[] }) => BarcodeDetector;
  }
  interface BarcodeDetector {
    detect(source: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  }
}
