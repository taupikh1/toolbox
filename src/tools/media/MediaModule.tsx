import { useEffect, useState } from 'react';
import { ffmpegManager, type ModuleStatus } from '../../services/ffmpeg/ffmpegManager';
import AudioExtractor from './audio/AudioExtractor';
import AudioConverter from './audio/AudioConverter';

type Tab = 'extractor' | 'converter' | 'about';

export default function MediaModule() {
  const [status, setStatus] = useState<ModuleStatus>(ffmpegManager.getStatus());
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState<{ loaded: number; total: number; asset: string } | null>(null);
  const [tab, setTab] = useState<Tab>('extractor');
  const [cached, setCached] = useState(false);

  useEffect(() => {
    const unsub = ffmpegManager.subscribe((s, m) => {
      setStatus(s);
      setMessage(m || '');
    });
    const unsubP = ffmpegManager.subscribeProgress((p) => setProgress(p));
    ffmpegManager.checkCached().then(setCached);
    return () => { unsub(); unsubP(); };
  }, []);

  const handleDownload = async () => {
    setProgress(null);
    await ffmpegManager.downloadAndInit();
    setCached(await ffmpegManager.checkCached());
  };

  const handleDelete = async () => {
    await ffmpegManager.deleteCache();
    setCached(false);
    setStatus('not-downloaded');
    setMessage('');
  };

  const pct = progress && progress.total ? Math.round((progress.loaded / progress.total) * 100) : 0;

  return (
    <div className="media-module">
      <h2>Media Processing Module</h2>
      <p className="muted">Modul pemrosesan audio dan video lokal berbasis WebAssembly. Download modul satu kali untuk mulai menggunakannya. Semua proses berlangsung di perangkat Anda.</p>

      <div className="status-box">
        <div><strong>Status:</strong> {status}</div>
        {message && <div>{message}</div>}
        {status === 'downloading' && progress && (
          <div>
            {progress.asset}: {pct}% ({(progress.loaded / 1024 / 1024).toFixed(1)} / {(progress.total / 1024 / 1024).toFixed(1)} MB)
            <progress value={progress.loaded} max={progress.total} style={{ width: '100%' }} />
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {status !== 'ready' && status !== 'downloading' && status !== 'initializing' && (
            <button className="btn primary" onClick={handleDownload}>Download Media Module (~31 MB)</button>
          )}
          {status === 'downloading' && <button className="btn" onClick={() => ffmpegManager.cancelDownload()}>Batalkan</button>}
          {status === 'error' && <button className="btn" onClick={handleDownload}>Retry</button>}
          {cached && status === 'ready' && <button className="btn" onClick={handleDelete}>Hapus Cache Modul</button>}
          <button className="btn" onClick={() => ffmpegManager.checkCached().then(setCached)}>Check Module</button>
        </div>
        <p className="small muted">Estimasi ukuran: ~31 MB (single-thread core). Setelah diunduh, modul tersimpan di cache browser dan dapat digunakan offline.</p>
      </div>

      {status === 'ready' ? (
        <>
          <div className="tabs" style={{ margin: '16px 0', display: 'flex', gap: 8 }}>
            <button className={tab === 'extractor' ? 'btn primary' : 'btn'} onClick={() => setTab('extractor')}>Audio Extractor</button>
            <button className={tab === 'converter' ? 'btn primary' : 'btn'} onClick={() => setTab('converter')}>Audio Converter</button>
            <button className={tab === 'about' ? 'btn primary' : 'btn'} onClick={() => setTab('about')}>Tentang</button>
          </div>
          {tab === 'extractor' && <AudioExtractor />}
          {tab === 'converter' && <AudioConverter />}
          {tab === 'about' && (
            <div>
              <h3>Tentang Modul</h3>
              <ul>
                <li>FFmpeg.wasm single-thread core v0.12.10</li>
                <li>Codec: MP3 (libmp3lame), AAC, WAV, dan lainnya sesuai build</li>
                <li>Privasi: semua file diproses lokal, tidak dikirim ke server</li>
                <li>Offline: setelah download, bisa digunakan tanpa internet</li>
                <li>Video tools (trim/compress/GIF/frame) : NOT IMPLEMENTED di Phase 5 ini (fokus stabilitas audio)</li>
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="muted">Unduh modul terlebih dahulu untuk menggunakan tools media.</p>
      )}
    </div>
  );
}
