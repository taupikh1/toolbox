import { useCallback, useEffect, useRef, useState } from 'react';
import { getSettings, setSettings } from '../../services/storage';

type Mode = 'focus' | 'short' | 'long';

const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15 };

function loadDurations() {
  const s = getSettings().pomodoro;
  return {
    focusMin: s?.focusMin ?? DEFAULTS.focusMin,
    shortMin: s?.shortMin ?? DEFAULTS.shortMin,
    longMin: s?.longMin ?? DEFAULTS.longMin,
  };
}

function modeLabel(m: Mode) {
  return m === 'focus' ? 'Fokus' : m === 'short' ? 'Istirahat pendek' : 'Istirahat panjang';
}

export default function Pomodoro() {
  const [durs, setDurs] = useState(loadDurations);
  const [mode, setMode] = useState<Mode>('focus');
  const [running, setRunning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(durs.focusMin * 60_000);
  const [sessions, setSessions] = useState(0);
  const endAtRef = useRef<number | null>(null);
  const remainingWhenPausedRef = useRef(durs.focusMin * 60_000);

  const totalMs = (mode === 'focus' ? durs.focusMin : mode === 'short' ? durs.shortMin : durs.longMin) * 60_000;

  const syncFromClock = useCallback(() => {
    if (!running || endAtRef.current == null) return;
    const left = Math.max(0, endAtRef.current - Date.now());
    setRemainingMs(left);
    if (left <= 0) {
      setRunning(false);
      endAtRef.current = null;
      remainingWhenPausedRef.current = 0;
      if (mode === 'focus') setSessions((n) => n + 1);
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Toolbox Pomodoro', { body: `${modeLabel(mode)} selesai.` });
        }
      } catch {
        /* ignore */
      }
    }
  }, [running, mode]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(syncFromClock, 250);
    const onVis = () => {
      if (document.visibilityState === 'visible') syncFromClock();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [running, syncFromClock]);

  const applyMode = (m: Mode, autoStart = false) => {
    setMode(m);
    const ms =
      (m === 'focus' ? durs.focusMin : m === 'short' ? durs.shortMin : durs.longMin) * 60_000;
    remainingWhenPausedRef.current = ms;
    setRemainingMs(ms);
    if (autoStart) {
      endAtRef.current = Date.now() + ms;
      setRunning(true);
    } else {
      endAtRef.current = null;
      setRunning(false);
    }
  };

  const start = () => {
    const base = remainingWhenPausedRef.current > 0 ? remainingWhenPausedRef.current : remainingMs || totalMs;
    endAtRef.current = Date.now() + base;
    setRunning(true);
  };

  const pause = () => {
    if (endAtRef.current != null) {
      remainingWhenPausedRef.current = Math.max(0, endAtRef.current - Date.now());
      setRemainingMs(remainingWhenPausedRef.current);
    }
    endAtRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    endAtRef.current = null;
    setRunning(false);
    const ms = totalMs;
    remainingWhenPausedRef.current = ms;
    setRemainingMs(ms);
  };

  const skip = () => {
    if (mode === 'focus') {
      setSessions((n) => n + 1);
      applyMode((sessions + 1) % 4 === 0 ? 'long' : 'short');
    } else {
      applyMode('focus');
    }
  };

  const saveDurs = (next: typeof durs) => {
    setDurs(next);
    setSettings({ pomodoro: next });
    if (!running) {
      const ms =
        (mode === 'focus' ? next.focusMin : mode === 'short' ? next.shortMin : next.longMin) * 60_000;
      remainingWhenPausedRef.current = ms;
      setRemainingMs(ms);
    }
  };

  const requestNotif = async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') return;
    await Notification.requestPermission();
  };

  const mins = Math.floor(remainingMs / 60_000);
  const secs = Math.floor((remainingMs % 60_000) / 1000);
  const progress = totalMs > 0 ? 1 - remainingMs / totalMs : 0;

  return (
    <div className="tool">
      <p className="muted">Timer berbasis timestamp agar tetap akurat saat tab di-background. Notifikasi opsional.</p>

      <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0' }}>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress sesi"
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: `conic-gradient(var(--ac) ${progress * 360}deg, var(--bd) 0)`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              background: 'var(--card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              {modeLabel(mode)}
            </span>
            <span style={{ fontSize: '2.2rem', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '0.75rem' }}>
        {!running ? (
          <button className="btn primary" onClick={start}>
            ▶ Mulai
          </button>
        ) : (
          <button className="btn" onClick={pause}>
            ⏸ Pause
          </button>
        )}
        <button className="btn" onClick={reset}>
          Reset
        </button>
        <button className="btn" onClick={skip}>
          Skip
        </button>
      </div>

      <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1rem' }}>
        {(['focus', 'short', 'long'] as Mode[]).map((m) => (
          <button key={m} className={'btn' + (mode === m ? ' primary' : '')} onClick={() => applyMode(m)} disabled={running}>
            {modeLabel(m)}
          </button>
        ))}
      </div>

      <p className="muted" style={{ textAlign: 'center' }}>
        Sesi fokus selesai: <b>{sessions}</b>
      </p>

      <div className="card" style={{ marginTop: '1rem' }}>
        <b>Durasi (menit)</b>
        <div className="row" style={{ gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <label style={{ flex: 1, minWidth: 100 }}>
            Fokus
            <input
              type="number"
              min={1}
              max={120}
              value={durs.focusMin}
              disabled={running}
              onChange={(e) => saveDurs({ ...durs, focusMin: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label style={{ flex: 1, minWidth: 100 }}>
            Pendek
            <input
              type="number"
              min={1}
              max={60}
              value={durs.shortMin}
              disabled={running}
              onChange={(e) => saveDurs({ ...durs, shortMin: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
          <label style={{ flex: 1, minWidth: 100 }}>
            Panjang
            <input
              type="number"
              min={1}
              max={60}
              value={durs.longMin}
              disabled={running}
              onChange={(e) => saveDurs({ ...durs, longMin: Math.max(1, Number(e.target.value) || 1) })}
            />
          </label>
        </div>
        <button className="btn" style={{ marginTop: '0.75rem' }} onClick={() => void requestNotif()}>
          Izinkan notifikasi (opsional)
        </button>
      </div>
    </div>
  );
}
