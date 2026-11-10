import { useMemo, useState } from 'react';
import Copy from '../Copy';
import {
  parseYMD,
  todayYMD,
  toYMDString,
  dateDiff,
  calculateAge,
  addSubDate,
  formatYMDLong,
} from '../../lib/date';

type Mode = 'diff' | 'age' | 'addsub';

const MODES: { id: Mode; label: string }[] = [
  { id: 'diff', label: 'Selisih tanggal' },
  { id: 'age', label: 'Usia' },
  { id: 'addsub', label: 'Tambah / Kurang' },
];

function todayStr() {
  return toYMDString(todayYMD());
}

export default function DateCalculator() {
  const [mode, setMode] = useState<Mode>('diff');
  // diff
  const [start, setStart] = useState('2024-01-01');
  const [end, setEnd] = useState(todayStr());
  const [inclusive, setInclusive] = useState(false);
  // age
  const [birth, setBirth] = useState('1990-06-15');
  const [ref, setRef] = useState(todayStr());
  // addsub
  const [base, setBase] = useState(todayStr());
  const [years, setYears] = useState('0');
  const [months, setMonths] = useState('0');
  const [days, setDays] = useState('30');
  const [op, setOp] = useState<'add' | 'sub'>('add');

  const { text, detail, error, copyText } = useMemo(() => {
    try {
      if (mode === 'diff') {
        const a = parseYMD(start);
        const b = parseYMD(end);
        if (!a) return { text: '', detail: '', error: 'Tanggal mulai tidak valid.', copyText: '' };
        if (!b) return { text: '', detail: '', error: 'Tanggal akhir tidak valid.', copyText: '' };
        const r = dateDiff(a, b, inclusive);
        const lines = [
          `${r.years} tahun, ${r.months} bulan, ${r.days} hari`,
          `Total hari: ${r.totalDays}${inclusive ? ' (inklusif)' : ''}`,
          `Total minggu: ${r.totalWeeks}`,
          `Perkiraan total bulan: ${r.totalMonthsApprox}`,
        ];
        if (r.swapped) lines.push('(Tanggal ditukar karena akhir lebih awal dari mulai)');
        return {
          text: lines[0],
          detail: lines.slice(1).join('\n'),
          error: null as string | null,
          copyText: lines.join('\n'),
        };
      }
      if (mode === 'age') {
        const b = parseYMD(birth);
        const r = parseYMD(ref);
        if (!b) return { text: '', detail: '', error: 'Tanggal lahir tidak valid.', copyText: '' };
        if (!r) return { text: '', detail: '', error: 'Tanggal referensi tidak valid.', copyText: '' };
        const age = calculateAge(b, r);
        const lines = [
          `${age.years} tahun, ${age.months} bulan, ${age.days} hari`,
          `Total hari hidup: ${age.totalDays}`,
          `Total minggu: ${age.totalWeeks}`,
          `Ulang tahun berikutnya: ${formatYMDLong(age.nextBirthday)} (${age.daysToNextBirthday} hari lagi)`,
        ];
        if (age.isBirthdayToday) lines.push('🎉 Hari ini ulang tahun!');
        return {
          text: lines[0],
          detail: lines.slice(1).join('\n'),
          error: null,
          copyText: lines.join('\n'),
        };
      }
      // addsub
      const b = parseYMD(base);
      if (!b) return { text: '', detail: '', error: 'Tanggal dasar tidak valid.', copyText: '' };
      const y = Number(years);
      const m = Number(months);
      const d = Number(days);
      if (![y, m, d].every((n) => Number.isFinite(n) && Number.isInteger(n))) {
        return { text: '', detail: '', error: 'Tahun/bulan/hari harus bilangan bulat.', copyText: '' };
      }
      const res = addSubDate(b, y, m, d, op);
      return {
        text: res.display,
        detail: `ISO: ${res.iso}`,
        error: null,
        copyText: `${res.display}\n${res.iso}`,
      };
    } catch (e) {
      return {
        text: '',
        detail: '',
        error: e instanceof Error ? e.message : 'Perhitungan gagal.',
        copyText: '',
      };
    }
  }, [mode, start, end, inclusive, birth, ref, base, years, months, days, op]);

  const reset = () => {
    setStart('2024-01-01');
    setEnd(todayStr());
    setInclusive(false);
    setBirth('1990-06-15');
    setRef(todayStr());
    setBase(todayStr());
    setYears('0');
    setMonths('0');
    setDays('30');
    setOp('add');
  };

  return (
    <div className="stack">
      <div className="row" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            className={'btn' + (mode === m.id ? ' primary' : '')}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'diff' && (
        <>
          <div className="row">
            <label>
              Tanggal mulai
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              Tanggal akhir
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="chk">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(e) => setInclusive(e.target.checked)}
            />
            Hitung inklusif (termasuk hari akhir)
          </label>
          <p className="muted">
            <small>
              Eksklusif: selisih hari antara dua tanggal. Inklusif: +1 hari (berguna untuk menghitung
              lama menginap atau masa berlaku).
            </small>
          </p>
        </>
      )}

      {mode === 'age' && (
        <>
          <div className="row">
            <label>
              Tanggal lahir
              <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
            </label>
            <label>
              Tanggal referensi
              <input type="date" value={ref} onChange={(e) => setRef(e.target.value)} />
            </label>
          </div>
          <button className="btn" onClick={() => setRef(todayStr())}>
            Pakai hari ini
          </button>
          <p className="muted">
            <small>
              Lahir 29 Februari: pada tahun non-kabisat, ulang tahun dihitung sebagai 1 Maret.
            </small>
          </p>
        </>
      )}

      {mode === 'addsub' && (
        <>
          <label>
            Tanggal dasar
            <input type="date" value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <div className="row">
            <label>
              Tahun
              <input inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
            </label>
            <label>
              Bulan
              <input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
            </label>
            <label>
              Hari
              <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button className={'btn' + (op === 'add' ? ' primary' : '')} onClick={() => setOp('add')}>
              Tambah
            </button>
            <button className={'btn' + (op === 'sub' ? ' primary' : '')} onClick={() => setOp('sub')}>
              Kurang
            </button>
          </div>
          <p className="muted">
            <small>
              Jika hari tidak ada di bulan tujuan (mis. 31 Jan + 1 bulan), dipakai hari terakhir bulan
              tersebut.
            </small>
          </p>
        </>
      )}

      {error && (
        <p className="er" role="alert">
          {error}
        </p>
      )}

      {!error && text && (
        <>
          <p className="big" aria-live="polite">
            {text}
          </p>
          {detail && (
            <pre className="out" style={{ maxHeight: 'none' }}>
              {detail}
            </pre>
          )}
          <div className="row">
            <Copy text={copyText} label="Salin hasil" primary />
            <button className="btn" onClick={reset}>
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
