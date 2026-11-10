/**
 * AI Vocal Separator UI — Batch 22B-2
 * Path B Worker inference + offline/runtime cache notes + quality warnings.
 * Device/offline proof: NOT VERIFIED until user fills the manual table.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  vocalModelManager,
} from '../../services/vocal-separator/modelManager';
import {
  PRIMARY_MODEL,
  type ModelStatus,
} from '../../services/vocal-separator/modelRegistry';
import { getStorageEstimate, requestPersistentStorage } from '../../services/vocal-separator/storageHelpers';
import {
  separate,
  detectTier,
  getDurationWarning,
  getTimeEstimate,
  TRIM_TEST_SEC,
  type SeparationProgress,
} from '../../services/vocal-separator/engine';
import type { QualityLevel } from '../../services/vocal-separator/pure/deviceTier';
import { mapPositionOnSourceSwitch, type AbSource } from '../../services/vocal-separator/pure/abPlayer';
import {
  ortRuntimeClient,
  type RuntimeStatus,
  type ExecutionProvider,
  type DeviceCapabilities,
} from '../../services/vocal-separator/runtimeClient';

type OutputMode = 'vocals' | 'instrumental' | 'both';

export default function VocalSeparator() {
  const [modelStatus, setModelStatus] = useState<ModelStatus>(vocalModelManager.getStatus());
  const [modelMsg, setModelMsg] = useState<string>('');
  const [dlProgress, setDlProgress] = useState<{ loaded: number; total: number } | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const [outputMode, setOutputMode] = useState<OutputMode>('both');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<SeparationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageInfo, setStorageInfo] = useState<string | null>(null);
  const [gateWarnings, setGateWarnings] = useState<string[]>([]);
  const [quality, setQuality] = useState<QualityLevel>('balanced');
  const [fastMode, setFastMode] = useState(false);
  const [fastStrength, setFastStrength] = useState(0.85);
  const [keepBass, setKeepBass] = useState(true);
  const [trim60, setTrim60] = useState(false);
  const [resultMode, setResultMode] = useState<'ai' | 'fast' | null>(null);
  const [abSource, setAbSource] = useState<AbSource>('original');
  const [suggestFast, setSuggestFast] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const tier = detectTier();

  const [vocalsUrl, setVocalsUrl] = useState<string | null>(null);
  const [instUrl, setInstUrl] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const [rtStatus, setRtStatus] = useState<RuntimeStatus>(ortRuntimeClient.status);
  const [rtProvider, setRtProvider] = useState<ExecutionProvider>(ortRuntimeClient.provider);
  const [rtVersion, setRtVersion] = useState<string | undefined>(ortRuntimeClient.ortVersion);
  const [rtCaps, setRtCaps] = useState<DeviceCapabilities | null>(ortRuntimeClient.capabilities);
  const [rtBusy, setRtBusy] = useState(false);
  const [rtError, setRtError] = useState<string | null>(null);

  useEffect(() => {
    const unsubS = vocalModelManager.subscribeStatus((s, msg) => {
      setModelStatus(s);
      setModelMsg(msg || '');
    });
    const unsubP = vocalModelManager.subscribeProgress((loaded, total) => {
      setDlProgress({ loaded, total });
    });
    vocalModelManager.checkCached();
    return () => {
      unsubS();
      unsubP();
    };
  }, []);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (vocalsUrl) URL.revokeObjectURL(vocalsUrl);
      if (instUrl) URL.revokeObjectURL(instUrl);
    };
  }, [fileUrl, vocalsUrl, instUrl]);

  const onFile = useCallback((f: File | null) => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFile(f);
    setFileUrl(f ? URL.createObjectURL(f) : null);
    setDuration(null);
    setVocalsUrl(null);
    setInstUrl(null);
    setError(null);
    setProgress(null);
    if (f) {
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.src = URL.createObjectURL(f);
      audio.onloadedmetadata = () => {
        setDuration(audio.duration);
        URL.revokeObjectURL(audio.src);
      };
    }
  }, [fileUrl]);

  const handleDownloadModel = async () => {
    setError(null);
    try {
      const persisted = await requestPersistentStorage();
      const est = await getStorageEstimate();
      setStorageInfo(
        `Penyimpanan: ${est.usageLabel} / ${est.quotaLabel}` +
          (est.persisted === true
            ? ' · persistent: ya'
            : est.persisted === false
              ? ' · persistent: tidak (Safari mungkin menghapus data lama)'
              : '') +
          (persisted ? ' · permintaan persist: OK' : ' · permintaan persist: ditolak/tidak didukung'),
      );
    } catch {
      /* ignore */
    }
    await vocalModelManager.downloadAndVerify();
  };

  const handleDeleteModel = async () => {
    if (!confirm('Hapus model AI dari penyimpanan lokal?')) return;
    await vocalModelManager.deleteModel();
    setDlProgress(null);
  };

  const handleStart = async () => {
    if (!file) {
      setError('Pilih file audio terlebih dahulu.');
      return;
    }
    if (!fastMode && modelStatus !== 'READY') {
      setError('Model belum siap. Unduh model, atau aktifkan Fast Mode (tanpa AI).');
      setSuggestFast(true);
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(null);
    setGateWarnings([]);
    setSuggestFast(false);
    setResultMode(null);
    if (vocalsUrl) URL.revokeObjectURL(vocalsUrl);
    if (instUrl) URL.revokeObjectURL(instUrl);
    setVocalsUrl(null);
    setInstUrl(null);
    abortRef.current = new AbortController();

    // Wake Lock (best-effort)
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> };
      };
      if (nav.wakeLock?.request) {
        wakeLockRef.current = await nav.wakeLock.request('screen');
      }
    } catch {
      /* unsupported */
    }

    try {
      const result = await separate(file, {
        signal: abortRef.current.signal,
        onProgress: setProgress,
        outputMode,
        quality,
        fastMode,
        fastStrength,
        keepBass,
        trimToSec: trim60 ? TRIM_TEST_SEC : undefined,
      });

      setGateWarnings(result.warnings ?? []);
      setResultMode(result.mode);
      if (result.vocals) setVocalsUrl(URL.createObjectURL(result.vocals));
      if (result.instrumental) setInstUrl(URL.createObjectURL(result.instrumental));
      setAbSource(result.vocals ? 'vocals' : result.instrumental ? 'instrumental' : 'original');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setProgress({ phase: 'error', message: msg });
      if (!fastMode) setSuggestFast(true);
    } finally {
      try {
        await wakeLockRef.current?.release();
      } catch {
        /* ignore */
      }
      wakeLockRef.current = null;
      setBusy(false);
      abortRef.current = null;
    }
  };

  const statusLabel: Record<ModelStatus, string> = {
    NOT_DOWNLOADED: 'Belum diunduh',
    DOWNLOADING: 'Mengunduh…',
    VERIFYING: 'Memverifikasi SHA256…',
    READY: 'Siap',
    CORRUPTED: 'Rusak / checksum gagal',
    DOWNLOAD_FAILED: 'Unduhan gagal',
    STORAGE_FULL: 'Penyimpanan penuh',
  };

  const progressText = (() => {
    if (!progress) return null;
    switch (progress.phase) {
      case 'loading_model': return 'Memuat model…';
      case 'preparing_audio': return 'Menyiapkan audio…';
      case 'stft': return 'STFT…';
      case 'inference': return `Inference chunk ${progress.chunk}/${progress.totalChunks}`;
      case 'istft': return 'iSTFT + overlap-add…';
      case 'exporting': return 'Mengekspor WAV…';
      case 'done': return 'Selesai';
      case 'error': return progress.message;
      default: return null;
    }
  })();

  const initRuntime = useCallback(async () => {
    setRtBusy(true);
    setRtError(null);
    try {
      const caps = await ortRuntimeClient.checkCapabilities();
      setRtCaps(caps);
      const r = await ortRuntimeClient.initRuntime();
      setRtStatus(ortRuntimeClient.status);
      setRtProvider(r.provider);
      setRtVersion(r.ortVersion);
    } catch (e: unknown) {
      setRtStatus('ERROR');
      setRtError(e instanceof Error ? e.message : String(e));
    } finally {
      setRtBusy(false);
      setRtStatus(ortRuntimeClient.status);
    }
  }, []);

  const disposeRuntime = useCallback(async () => {
    setRtBusy(true);
    try {
      await ortRuntimeClient.dispose();
      setRtStatus('DISPOSED');
      setRtProvider('unknown');
      setRtVersion(undefined);
    } catch (e: unknown) {
      setRtError(e instanceof Error ? e.message : String(e));
    } finally {
      setRtBusy(false);
    }
  }, []);


  return (
    <div className="tool-page">
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>AI Vocal Separator</h2>
        <p className="muted small" style={{ marginTop: 4 }}>
          Pemisahan vokal &amp; instrumental lokal di browser (2-stem). Model:{' '}
          <strong>{PRIMARY_MODEL.name}</strong> ({PRIMARY_MODEL.sizeLabel}).
        </p>
        <p className="small" style={{ color: 'var(--muted, #888)', marginTop: 6 }}>
          Status: <strong>Experimental</strong> — pipeline Worker (Path B) ada;
          kualitas stem pada perangkat nyata belum diverifikasi. Batas durasi sementara 180 dtk.
        </p>
      </header>

      {/* Model status card */}
      <section className="card" style={{ marginBottom: 16, padding: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Status Model</h3>
        <p className="small" style={{ color: 'var(--warning, #c90)', marginTop: 8 }}>
          Peringatan: tool <strong>Storage Manager</strong> menghapus <em>semua</em> cache
          (termasuk model AI dan runtime ORT). Setelah itu status model kembali ke
          &quot;Belum diunduh&quot;. Safari juga dapat menghapus data situs yang lama tidak dibuka.
        </p>
        {storageInfo && (
          <p className="small muted" style={{ marginTop: 6 }}>{storageInfo}</p>
        )}

        <p style={{ margin: '4px 0' }}>
          <strong>{statusLabel[modelStatus]}</strong>
          {modelMsg ? ` — ${modelMsg}` : ''}
        </p>
        <p className="small muted">
          SHA256: <code style={{ fontSize: 11 }}>{PRIMARY_MODEL.sha256.slice(0, 24)}…</code>
          <br />
          Lisensi: {PRIMARY_MODEL.license}
          <br />
          Atribusi wajib: {PRIMARY_MODEL.attribution}
        </p>


        {/* Batch 22A — Runtime / Worker foundation */}
        <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--border, #333)', borderRadius: 8 }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>ONNX Runtime (Worker)</div>
          <div className="small">Status: <strong>{rtStatus}</strong></div>
          <div className="small">Provider: <strong>{rtProvider.toUpperCase()}</strong>
            {rtVersion ? ` · ort ${rtVersion}` : ''}
          </div>
          {rtCaps && (
            <div className="small" style={{ marginTop: 4, opacity: 0.85 }}>
              Worker: {rtCaps.webWorker ? 'yes' : 'no'} · WASM: {rtCaps.webAssembly ? 'yes' : 'no'} ·
              WebGPU: {rtCaps.webGpu ? 'yes' : 'no'} · SAB: {rtCaps.sharedArrayBuffer ? 'yes' : 'no'} ·
              COI: {rtCaps.crossOriginIsolated ? 'yes' : 'no'}
            </div>
          )}
          {rtError && <div className="small" style={{ color: 'var(--danger, #e55)', marginTop: 4 }}>{rtError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn" disabled={rtBusy || rtStatus === 'READY'} onClick={() => void initRuntime()}>
              {rtBusy && rtStatus === 'INITIALIZING' ? 'Initializing…' : 'Init Runtime'}
            </button>
            <button type="button" className="btn secondary" disabled={rtBusy || rtStatus === 'NOT_INITIALIZED'} onClick={() => void disposeRuntime()}>
              Dispose
            </button>
          </div>
        </div>

        {modelStatus === 'DOWNLOADING' && dlProgress && (
          <div style={{ marginTop: 8 }}>
            <progress
              value={dlProgress.loaded}
              max={dlProgress.total}
              style={{ width: '100%' }}
            />
            <span className="small muted">
              {(dlProgress.loaded / 1024 / 1024).toFixed(1)} /{' '}
              {(dlProgress.total / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {modelStatus !== 'READY' &&
            modelStatus !== 'DOWNLOADING' &&
            modelStatus !== 'VERIFYING' && (
              <button className="btn primary" onClick={handleDownloadModel}>
                Download Model ({PRIMARY_MODEL.sizeLabel})
              </button>
            )}
          {modelStatus === 'DOWNLOADING' && (
            <button className="btn" onClick={() => vocalModelManager.cancelDownload()}>
              Batalkan
            </button>
          )}
          {(modelStatus === 'READY' || modelStatus === 'CORRUPTED') && (
            <button className="btn" onClick={handleDeleteModel}>
              Hapus Model
            </button>
          )}
          <button
            className="btn"
            onClick={() => vocalModelManager.checkCached()}
          >
            Check Model
          </button>
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          Model hanya diunduh saat tombol ditekan. Setelah terunduh + SHA256 valid,
          dapat dipakai offline. Jangan unduh di jaringan berbayar tanpa persetujuan.
        </p>
      </section>

      {/* File input */}
      <section className="card" style={{ marginBottom: 16, padding: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Audio Input</h3>
        <input
          type="file"
          accept="audio/mpeg,audio/wav,audio/mp4,audio/x-m4a,audio/flac,audio/ogg,.mp3,.wav,.m4a,.flac,.ogg"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        {file && (
          <div style={{ marginTop: 8 }}>
            <p className="small">
              {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
              {duration != null && ` — ${duration.toFixed(1)} s`}
            </p>
            {fileUrl && (
              <audio controls src={fileUrl} style={{ width: '100%', marginTop: 6 }} />
            )}
            <button
              className="btn"
              style={{ marginTop: 6 }}
              onClick={() => onFile(null)}
              disabled={busy}
            >
              Hapus file
            </button>
          </div>
        )}
      </section>

      {/* Output choice + start */}
      <section className="card" style={{ marginBottom: 16, padding: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Output</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <label>
            <input
              type="radio"
              name="out"
              checked={outputMode === 'vocals'}
              onChange={() => setOutputMode('vocals')}
              disabled={busy}
            />{' '}
            Vocal Only
          </label>
          <label>
            <input
              type="radio"
              name="out"
              checked={outputMode === 'instrumental'}
              onChange={() => setOutputMode('instrumental')}
              disabled={busy}
            />{' '}
            Instrumental Only
          </label>
          <label>
            <input
              type="radio"
              name="out"
              checked={outputMode === 'both'}
              onChange={() => setOutputMode('both')}
              disabled={busy}
            />{' '}
            Keduanya
          </label>
        </div>

        <div style={{ marginBottom: 10, fontSize: 13 }}>
          <div style={{ marginBottom: 6 }}>
            <strong>Tier perangkat:</strong> {tier}
            {duration != null && (
              <span className="muted"> · {getTimeEstimate(duration, quality, tier).label}</span>
            )}
          </div>
          {duration != null && getDurationWarning(duration, tier).warn && (
            <p className="small" style={{ color: 'var(--warning, #c90)' }}>
              {getDurationWarning(duration, tier).message}
            </p>
          )}
          <label style={{ marginRight: 12 }}>
            Kualitas:{' '}
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as QualityLevel)}
              disabled={busy || fastMode}
            >
              <option value="economy">Economy</option>
              <option value="balanced">Balanced</option>
              <option value="good">Good</option>
            </select>
          </label>
          <label style={{ marginRight: 12 }}>
            <input type="checkbox" checked={trim60} onChange={(e) => setTrim60(e.target.checked)} disabled={busy} />{' '}
            Trim {TRIM_TEST_SEC}s pertama
          </label>
          <label style={{ marginRight: 12 }}>
            <input type="checkbox" checked={fastMode} onChange={(e) => setFastMode(e.target.checked)} disabled={busy} />{' '}
            Fast Mode (tanpa AI)
          </label>
          {fastMode && (
            <span>
              <label style={{ marginRight: 8 }}>
                Strength {fastStrength.toFixed(2)}{' '}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={fastStrength}
                  onChange={(e) => setFastStrength(Number(e.target.value))}
                  disabled={busy}
                />
              </label>
              <label>
                <input type="checkbox" checked={keepBass} onChange={(e) => setKeepBass(e.target.checked)} disabled={busy} />{' '}
                Keep bass
              </label>
            </span>
          )}
          {suggestFast && !fastMode && (
            <p className="small" style={{ color: 'var(--warning, #c90)' }}>
              AI gagal/model belum siap. Coba <strong>Fast Mode (tanpa AI)</strong>.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn primary"
            onClick={handleStart}
            disabled={busy || !file || (!fastMode && modelStatus !== 'READY')}
          >
            {busy ? 'Memproses…' : 'Start Separation'}
          </button>
          {busy && (
            <button
              className="btn"
              type="button"
              onClick={() => abortRef.current?.abort()}
            >
              Batalkan
            </button>
          )}
        </div>

        {progressText && (
          <p className="small" style={{ marginTop: 8 }}>
            {progressText}
          </p>
        )}

        {gateWarnings.length > 0 && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: 'var(--warning-bg, #3a3015)',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            <strong>Peringatan kualitas:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {gateWarnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p className="small muted" style={{ marginTop: 6 }}>
              Hasil tetap dapat diunduh; nilai kualitas akustik dinilai manual.
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: 10,
              background: 'var(--error-bg, #3a1515)',
              borderRadius: 6,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong>Error / Status:</strong>
            <br />
            {error}
          </div>
        )}
      </section>

      {/* Results (will stay empty until real inference exists) */}
      {(vocalsUrl || instUrl) && (
        <section className="card" style={{ padding: 12 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Hasil</h3>
          {vocalsUrl && (
            <div style={{ marginBottom: 10 }}>
              <p>Vocal Only</p>
              <audio controls src={vocalsUrl} style={{ width: '100%' }} />
              <a className="btn" href={vocalsUrl} download="vocals.wav" style={{ marginTop: 4 }}>
                Download Vocal WAV
              </a>
            </div>
          )}
          {instUrl && (
            <div>
              <p>Instrumental Only</p>
              <audio controls src={instUrl} style={{ width: '100%' }} />
              <a className="btn" href={instUrl} download="instrumental.wav" style={{ marginTop: 4 }}>
                Download Instrumental WAV
              </a>
            </div>
          )}
        </section>
      )}

      <section className="card" style={{ marginTop: 16, padding: 12 }}>
        <h3 style={{ marginTop: 0, fontSize: 15 }}>Catatan Teknis &amp; Batasan</h3>

      {(vocalsUrl || instUrl || fileUrl) && (
        <section className="card" style={{ marginBottom: 16, padding: 12 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>Pemutar A/B</h3>
          {resultMode === 'fast' && (
            <p className="small" style={{ color: 'var(--warning, #c90)' }}>
              Hasil <strong>Fast Mode (tanpa AI, kasar)</strong> — bukan keluaran model.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {([
              ['original', fileUrl, 'Original'],
              ['vocals', vocalsUrl, 'Vokal'],
              ['instrumental', instUrl, 'Instrumental'],
            ] as const)
              .filter(([, url]) => !!url)
              .map(([src, , label]) => (
                <button
                  key={src}
                  type="button"
                  className={'btn' + (abSource === src ? ' primary' : '')}
                  onClick={() => {
                    const el = audioRef.current;
                    const prev = el?.currentTime ?? 0;
                    const prevDur = el?.duration || duration || 1;
                    setAbSource(src as AbSource);
                    requestAnimationFrame(() => {
                      const a = audioRef.current;
                      if (!a) return;
                      const mapped = mapPositionOnSourceSwitch(prev, prevDur, a.duration || prevDur);
                      a.currentTime = mapped;
                      a.play().catch(() => {});
                    });
                  }}
                >
                  {label}
                </button>
              ))}
          </div>
          <audio
            ref={audioRef}
            controls
            style={{ width: '100%' }}
            src={
              abSource === 'vocals'
                ? vocalsUrl ?? undefined
                : abSource === 'instrumental'
                  ? instUrl ?? undefined
                  : fileUrl ?? undefined
            }
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {vocalsUrl && (
              <a className="btn" href={vocalsUrl} download="vocals.wav">
                Unduh Vokal
              </a>
            )}
            {instUrl && (
              <a className="btn" href={instUrl} download="instrumental.wav">
                Unduh Instrumental
              </a>
            )}
            {(vocalsUrl || instUrl) && (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  const url = abSource === 'instrumental' ? instUrl : vocalsUrl || instUrl;
                  if (!url) return;
                  try {
                    const blob = await fetch(url).then((r) => r.blob());
                    const nav = navigator as Navigator & {
                      share?: (d: { files?: File[]; title?: string }) => Promise<void>;
                      canShare?: (d: { files?: File[] }) => boolean;
                    };
                    const fileOut = new File([blob], abSource === 'instrumental' ? 'instrumental.wav' : 'vocals.wav', {
                      type: 'audio/wav',
                    });
                    if (nav.share && nav.canShare?.({ files: [fileOut] })) {
                      await nav.share({ files: [fileOut], title: 'Stem' });
                    } else {
                      window.open(url, '_blank');
                    }
                  } catch {
                    window.open(url, '_blank');
                  }
                }}
              >
                Bagikan / Buka tab
              </button>
            )}
          </div>
        </section>
      )}

        <ul className="small muted" style={{ paddingLeft: 18, margin: 0 }}>
          <li>
            Model: {PRIMARY_MODEL.name} · {PRIMARY_MODEL.sizeLabel} · SHA256 verified on download.
          </li>
          <li>
            Preprocessing yang diharapkan: n_fft={PRIMARY_MODEL.preprocessing.nFft}, hop=
            {PRIMARY_MODEL.preprocessing.hopLength}, dim_f={PRIMARY_MODEL.preprocessing.dimF},
            dim_t=2^{PRIMARY_MODEL.preprocessing.dimT}.
          </li>
          <li>
            Runtime target: onnxruntime-web WASM (Safari iOS) / WebGPU (Chrome).
          </li>
          <li>
            Pipeline: STFT → ONNX session.run → iSTFT + overlap-add di Web Worker (Path B).
            Kualitas akustik stem: NOT VERIFIED sampai uji perangkat.
          </li>
          <li>
            iPhone Safari: model 66 MB + spectrogram berisiko OOM. Batas durasi sementara 180 dtk.
          </li>
          <li>
            Video path (FFmpeg extract → separate → remux) ditunda sampai audio separation lulus
            quality gate.
          </li>
        </ul>
      </section>
    </div>
  );
}
