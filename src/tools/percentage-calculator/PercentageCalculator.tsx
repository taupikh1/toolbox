import { useMemo, useState } from 'react';
import Copy from '../Copy';
import {
  percentOf,
  percentChange,
  singleDiscount,
  stackedDiscount,
  addTax,
  removeTax,
  markup,
  margin,
  fmtNum,
} from '../../lib/percentage';

type Mode = 'of' | 'change' | 'discount' | 'stacked' | 'tax' | 'markup' | 'margin';

const MODES: { id: Mode; label: string }[] = [
  { id: 'of', label: '% dari angka' },
  { id: 'change', label: 'Perubahan %' },
  { id: 'discount', label: 'Diskon' },
  { id: 'stacked', label: 'Diskon bertingkat' },
  { id: 'tax', label: 'Pajak' },
  { id: 'markup', label: 'Markup' },
  { id: 'margin', label: 'Margin' },
];

function parseNum(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

export default function PercentageCalculator() {
  const [mode, setMode] = useState<Mode>('of');
  // of
  const [val, setVal] = useState('500000');
  const [pct, setPct] = useState('20');
  // change
  const [start, setStart] = useState('100');
  const [end, setEnd] = useState('120');
  // discount
  const [price, setPrice] = useState('500000');
  const [disc, setDisc] = useState('20');
  // stacked
  const [sPrice, setSPrice] = useState('500000');
  const [stack, setStack] = useState('20, 10');
  // tax
  const [taxAmt, setTaxAmt] = useState('100000');
  const [taxRate, setTaxRate] = useState('11');
  const [taxDir, setTaxDir] = useState<'add' | 'remove'>('add');
  // markup
  const [cost, setCost] = useState('100000');
  const [mkPct, setMkPct] = useState('25');
  // margin
  const [sell, setSell] = useState('125000');
  const [mCost, setMCost] = useState('100000');

  const { text, formula, error } = useMemo(() => {
    try {
      if (mode === 'of') {
        const r = percentOf(parseNum(val), parseNum(pct));
        return {
          text: fmtNum(r.result),
          formula: r.formula,
          error: null as string | null,
        };
      }
      if (mode === 'change') {
        const r = percentChange(parseNum(start), parseNum(end));
        const dir =
          r.direction === 'up' ? 'Naik' : r.direction === 'down' ? 'Turun' : 'Tetap';
        return {
          text: `${fmtNum(r.percent)}% (${dir}) · Selisih ${fmtNum(r.delta)}`,
          formula: r.formula,
          error: null,
        };
      }
      if (mode === 'discount') {
        const r = singleDiscount(parseNum(price), parseNum(disc));
        return {
          text: `Diskon ${fmtNum(r.discountAmount)} · Harga akhir ${fmtNum(r.finalPrice)}`,
          formula: r.formula,
          error: null,
        };
      }
      if (mode === 'stacked') {
        const discs = stack
          .split(/[,;\s]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => parseNum(s));
        const r = stackedDiscount(parseNum(sPrice), discs);
        return {
          text: `Harga akhir ${fmtNum(r.finalPrice)} · Diskon efektif ${fmtNum(r.totalDiscountPercent)}%`,
          formula: r.formula,
          error: null,
        };
      }
      if (mode === 'tax') {
        const r =
          taxDir === 'add'
            ? addTax(parseNum(taxAmt), parseNum(taxRate))
            : removeTax(parseNum(taxAmt), parseNum(taxRate));
        return {
          text:
            taxDir === 'add'
              ? `Pajak ${fmtNum(r.taxAmount)} · Total ${fmtNum(r.result)}`
              : `Sebelum pajak ${fmtNum(r.result)} · Pajak ${fmtNum(r.taxAmount)}`,
          formula: r.formula,
          error: null,
        };
      }
      if (mode === 'markup') {
        const r = markup(parseNum(cost), parseNum(mkPct));
        return {
          text: `Markup ${fmtNum(r.markupAmount)} · Harga jual ${fmtNum(r.sellingPrice)}`,
          formula: r.formula,
          error: null,
        };
      }
      // margin
      const r = margin(parseNum(sell), parseNum(mCost));
      return {
        text: `Margin ${fmtNum(r.marginPercent)}% (${fmtNum(r.marginAmount)})`,
        formula: r.formula,
        error: null,
      };
    } catch (e) {
      return {
        text: '',
        formula: '',
        error: e instanceof Error ? e.message : 'Input tidak valid.',
      };
    }
  }, [mode, val, pct, start, end, price, disc, sPrice, stack, taxAmt, taxRate, taxDir, cost, mkPct, sell, mCost]);

  const reset = () => {
    setVal('500000');
    setPct('20');
    setStart('100');
    setEnd('120');
    setPrice('500000');
    setDisc('20');
    setSPrice('500000');
    setStack('20, 10');
    setTaxAmt('100000');
    setTaxRate('11');
    setTaxDir('add');
    setCost('100000');
    setMkPct('25');
    setSell('125000');
    setMCost('100000');
  };

  return (
    <div className="stack">
      <div className="row" role="tablist" aria-label="Mode kalkulator">
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

      {mode === 'of' && (
        <div className="row">
          <label>
            Persentase (%)
            <input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} />
          </label>
          <label>
            dari nilai
            <input inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
        </div>
      )}

      {mode === 'change' && (
        <div className="row">
          <label>
            Nilai awal
            <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label>
            Nilai akhir
            <input inputMode="decimal" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
      )}

      {mode === 'discount' && (
        <div className="row">
          <label>
            Harga awal
            <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Diskon (%)
            <input inputMode="decimal" value={disc} onChange={(e) => setDisc(e.target.value)} />
          </label>
        </div>
      )}

      {mode === 'stacked' && (
        <>
          <label>
            Harga awal
            <input inputMode="decimal" value={sPrice} onChange={(e) => setSPrice(e.target.value)} />
          </label>
          <label>
            Diskon berurutan (pisahkan koma, mis. 20, 10)
            <input value={stack} onChange={(e) => setStack(e.target.value)} />
          </label>
          <p className="muted">
            <small>Dihitung berurutan, bukan dijumlahkan. Contoh: 20% lalu 10% ≠ 30%.</small>
          </p>
        </>
      )}

      {mode === 'tax' && (
        <>
          <div className="row">
            <label>
              Nilai
              <input inputMode="decimal" value={taxAmt} onChange={(e) => setTaxAmt(e.target.value)} />
            </label>
            <label>
              Tarif pajak (%)
              <input inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
            </label>
          </div>
          <div className="row">
            <button
              className={'btn' + (taxDir === 'add' ? ' primary' : '')}
              onClick={() => setTaxDir('add')}
            >
              Tambah pajak
            </button>
            <button
              className={'btn' + (taxDir === 'remove' ? ' primary' : '')}
              onClick={() => setTaxDir('remove')}
            >
              Hitung sebelum pajak
            </button>
          </div>
        </>
      )}

      {mode === 'markup' && (
        <>
          <div className="row">
            <label>
              Harga modal
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>
            <label>
              Markup (%)
              <input inputMode="decimal" value={mkPct} onChange={(e) => setMkPct(e.target.value)} />
            </label>
          </div>
          <p className="muted">
            <small>Markup = (harga jual − modal) / modal × 100. Berbeda dari margin.</small>
          </p>
        </>
      )}

      {mode === 'margin' && (
        <>
          <div className="row">
            <label>
              Harga jual
              <input inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} />
            </label>
            <label>
              Harga modal
              <input inputMode="decimal" value={mCost} onChange={(e) => setMCost(e.target.value)} />
            </label>
          </div>
          <p className="muted">
            <small>Margin = (harga jual − modal) / harga jual × 100. Berbeda dari markup.</small>
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
          <p className="muted mono">
            <small>{formula}</small>
          </p>
          <div className="row">
            <Copy text={text} label="Salin hasil" primary />
            <button className="btn" onClick={reset}>
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
