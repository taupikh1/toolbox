import { useMemo, useState } from 'react';
import Copy from '../Copy';
import {
  convertTimezone,
  listTimeZones,
  nowInZone,
  POPULAR_ZONES,
  isValidTimeZone,
} from '../../lib/timezone';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function localNowParts() {
  const d = new Date();
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
  };
}

export default function TimezoneConverter() {
  const zones = useMemo(() => listTimeZones(), []);
  const popular = useMemo(
    () => POPULAR_ZONES.filter((z) => isValidTimeZone(z)),
    [],
  );

  const init = localNowParts();
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time.slice(0, 5)); // HH:MM
  const [source, setSource] = useState('Asia/Jakarta');
  const [target, setTarget] = useState('Asia/Tokyo');
  const [qSrc, setQSrc] = useState('');
  const [qTgt, setQTgt] = useState('');

  const filterZones = (q: string) => {
    const s = q.trim().toLowerCase();
    if (!s) return popular;
    return zones.filter((z) => z.toLowerCase().includes(s)).slice(0, 30);
  };

  const result = useMemo(() => {
    try {
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      const ss = 0;
      if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
        return { error: 'Tanggal atau jam tidak valid.', data: null };
      }
      const data = convertTimezone(y, m, d, hh, mm, ss, source, target);
      return { error: null as string | null, data };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : 'Konversi gagal.',
        data: null,
      };
    }
  }, [date, time, source, target]);

  const useNow = () => {
    const n = localNowParts();
    setDate(n.date);
    setTime(n.time.slice(0, 5));
    // keep current source zone; wall clock is local browser
  };

  const swap = () => {
    setSource(target);
    setTarget(source);
  };

  const copyText = result.data
    ? [
        `${result.data.sourceZone}: ${result.data.source.display}`,
        `${result.data.targetZone}: ${result.data.target.display}`,
        `Selisih offset: ${result.data.offsetDiffLabel}`,
        result.data.dayChanged ? 'Tanggal berbeda di zona tujuan.' : '',
        result.data.ambiguousNote ?? '',
      ]
        .filter(Boolean)
        .join('\n')
    : '';

  return (
    <div className="stack">
      <div className="row">
        <button className="btn primary" onClick={useNow}>
          Waktu sekarang
        </button>
        <button className="btn" onClick={swap}>
          ⇄ Tukar zona
        </button>
      </div>

      <div className="row">
        <label>
          Tanggal
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Jam
          <input type="time" step={60} value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>

      <div className="cols">
        <div className="stack" style={{ gap: '0.5rem' }}>
          <label>
            Zona asal
            <input
              list="tz-src"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onFocus={() => setQSrc('')}
              placeholder="Cari zona…"
            />
            <datalist id="tz-src">
              {filterZones(qSrc || source).map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
            {popular.slice(0, 6).map((z) => (
              <button
                key={z}
                type="button"
                className={'btn sm' + (source === z ? ' primary' : '')}
                onClick={() => setSource(z)}
              >
                {z.replace(/^Asia\/|^Europe\/|^America\/|^Australia\/|^Pacific\//, '')}
              </button>
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: '0.5rem' }}>
          <label>
            Zona tujuan
            <input
              list="tz-tgt"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onFocus={() => setQTgt('')}
              placeholder="Cari zona…"
            />
            <datalist id="tz-tgt">
              {filterZones(qTgt || target).map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          <div className="row" style={{ flexWrap: 'wrap', gap: '0.35rem' }}>
            {popular.slice(0, 6).map((z) => (
              <button
                key={z}
                type="button"
                className={'btn sm' + (target === z ? ' primary' : '')}
                onClick={() => setTarget(z)}
              >
                {z.replace(/^Asia\/|^Europe\/|^America\/|^Australia\/|^Pacific\//, '')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {result.error && (
        <p className="er" role="alert">
          {result.error}
        </p>
      )}

      {result.data && (
        <>
          <div className="stats">
            <div>
              <span>{result.data.sourceZone}</span>
              <b style={{ fontSize: '1.1rem' }}>{result.data.source.isoLike}</b>
              <small className="muted">{result.data.source.offset}</small>
            </div>
            <div>
              <span>{result.data.targetZone}</span>
              <b style={{ fontSize: '1.1rem' }}>{result.data.target.isoLike}</b>
              <small className="muted">{result.data.target.offset}</small>
            </div>
          </div>

          <p className="muted">
            Selisih offset: <strong>{result.data.offsetDiffLabel}</strong>
            {result.data.dayChanged && ' · Tanggal berbeda di zona tujuan'}
            {result.data.yearChanged && ' · Tahun berbeda'}
          </p>

          {result.data.ambiguousNote && (
            <p className="er" role="status">
              {result.data.ambiguousNote}
            </p>
          )}

          <div className="thumb">
            <span>
              <small className="muted">Asal</small>
              <br />
              {result.data.source.display}
            </span>
          </div>
          <div className="thumb">
            <span>
              <small className="muted">Tujuan</small>
              <br />
              {result.data.target.display}
            </span>
          </div>

          <Copy text={copyText} label="Salin hasil" primary />
        </>
      )}

      <p className="muted">
        <small>
          Konversi memakai Intl browser (offline). Offset dapat berubah karena DST. Waktu ambigu atau
          tidak ada pada transisi DST ditandai secara transparan.
        </small>
      </p>
    </div>
  );
}
