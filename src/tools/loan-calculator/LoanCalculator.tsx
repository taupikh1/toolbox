import { useMemo, useState } from 'react';
import Copy from '../Copy';
import {
  calculateLoan,
  fmtMoney,
  validateLoanInput,
  type InterestMethod,
  type LoanResult,
} from '../../lib/loan';

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState('100000000');
  const [rate, setRate] = useState('10');
  const [tenor, setTenor] = useState('12');
  const [unit, setUnit] = useState<'bulan' | 'tahun'>('bulan');
  const [method, setMethod] = useState<InterestMethod>('annuity');
  const [showSchedule, setShowSchedule] = useState(false);

  const periods = useMemo(() => {
    const n = Number(tenor.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return NaN;
    return unit === 'tahun' ? Math.round(n * 12) : Math.round(n);
  }, [tenor, unit]);

  const P = Number(principal.replace(/\./g, '').replace(',', '.'));
  const R = Number(rate.replace(',', '.'));

  const error = validateLoanInput({
    principal: P,
    annualRatePercent: R,
    periods,
    method,
  });

  const result: LoanResult | null = useMemo(() => {
    if (error) return null;
    try {
      return calculateLoan({
        principal: P,
        annualRatePercent: R,
        periods,
        method,
      });
    } catch {
      return null;
    }
  }, [P, R, periods, method, error]);

  const reset = () => {
    setPrincipal('100000000');
    setRate('10');
    setTenor('12');
    setUnit('bulan');
    setMethod('annuity');
    setShowSchedule(false);
  };

  const summaryText = result
    ? [
        `Metode: ${result.methodLabel}`,
        `Cicilan/bulan: Rp ${fmtMoney(result.monthlyPayment)}`,
        `Total pokok: Rp ${fmtMoney(result.totalPrincipal)}`,
        `Total bunga: Rp ${fmtMoney(result.totalInterest)}`,
        `Total bayar: Rp ${fmtMoney(result.totalPayment)}`,
        `Tenor: ${periods} bulan`,
      ].join('\n')
    : '';

  return (
    <div className="stack">
      <div className="row">
        <label>
          Jumlah pinjaman (Rp)
          <input
            inputMode="decimal"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            aria-invalid={!!error && error.includes('pinjaman')}
          />
        </label>
        <label>
          Suku bunga tahunan (%)
          <input
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            aria-invalid={!!error && error.includes('bunga')}
          />
        </label>
      </div>
      <div className="row">
        <label>
          Tenor
          <input
            inputMode="numeric"
            value={tenor}
            onChange={(e) => setTenor(e.target.value)}
            aria-invalid={!!error && error.includes('Periode')}
          />
        </label>
        <label>
          Satuan
          <select value={unit} onChange={(e) => setUnit(e.target.value as 'bulan' | 'tahun')}>
            <option value="bulan">Bulan</option>
            <option value="tahun">Tahun</option>
          </select>
        </label>
        <label>
          Metode bunga
          <select value={method} onChange={(e) => setMethod(e.target.value as InterestMethod)}>
            <option value="annuity">Anuitas (cicilan tetap)</option>
            <option value="flat">Flat</option>
            <option value="effective">Efektif (saldo menurun)</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="er" role="alert">
          {error}
        </p>
      )}

      {result && (
        <>
          <div className="stats">
            <div>
              <span>Cicilan / bulan</span>
              <b>Rp {fmtMoney(result.monthlyPayment)}</b>
            </div>
            <div>
              <span>Total pokok</span>
              <b>Rp {fmtMoney(result.totalPrincipal)}</b>
            </div>
            <div>
              <span>Total bunga</span>
              <b>Rp {fmtMoney(result.totalInterest)}</b>
            </div>
            <div>
              <span>Total bayar</span>
              <b>Rp {fmtMoney(result.totalPayment)}</b>
            </div>
          </div>

          <p className="muted">
            <small>
              Metode: <strong>{result.methodLabel}</strong> · Tenor {periods} bulan
            </small>
          </p>

          <details>
            <summary>Asumsi & rumus</summary>
            <ul className="muted" style={{ margin: '0.5rem 0', paddingLeft: '1.2rem' }}>
              {result.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </details>

          <div className="row">
            <Copy text={summaryText} label="Salin ringkasan" primary />
            <button className="btn" onClick={() => setShowSchedule((v) => !v)}>
              {showSchedule ? 'Sembunyikan' : 'Tampilkan'} jadwal angsuran
            </button>
            <button className="btn" onClick={reset}>
              Reset
            </button>
          </div>

          {showSchedule && (
            <div style={{ overflowX: 'auto' }}>
              <table
                className="mono"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem',
                  marginTop: '0.5rem',
                }}
              >
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bd)', textAlign: 'right' }}>
                    <th style={{ textAlign: 'left', padding: '0.4rem' }}>#</th>
                    <th style={{ padding: '0.4rem' }}>Angsuran</th>
                    <th style={{ padding: '0.4rem' }}>Pokok</th>
                    <th style={{ padding: '0.4rem' }}>Bunga</th>
                    <th style={{ padding: '0.4rem' }}>Sisa</th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.map((row) => (
                    <tr key={row.period} style={{ borderBottom: '1px solid var(--bd)' }}>
                      <td style={{ textAlign: 'left', padding: '0.35rem' }}>{row.period}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem' }}>{fmtMoney(row.payment)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem' }}>{fmtMoney(row.principal)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem' }}>{fmtMoney(row.interest)}</td>
                      <td style={{ textAlign: 'right', padding: '0.35rem' }}>{fmtMoney(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <p className="muted">
        <small>
          Hasil ini adalah simulasi matematis, bukan penawaran resmi lembaga keuangan. Biaya admin,
          asuransi, pajak, penalti, dan ketentuan pemberi pinjaman tidak termasuk.
        </small>
      </p>
    </div>
  );
}
