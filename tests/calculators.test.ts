import { describe, it, expect } from 'vitest';
import { calculateLoan, validateLoanInput } from '../src/lib/loan';
import {
  percentOf,
  percentChange,
  singleDiscount,
  stackedDiscount,
  addTax,
  removeTax,
  markup,
  margin,
} from '../src/lib/percentage';
import {
  isLeap,
  daysInMonth,
  isValidYMD,
  parseYMD,
  dateDiff,
  calculateAge,
  addSubDate,
  daysBetween,
} from '../src/lib/date';
import { convertTimezone, isValidTimeZone } from '../src/lib/timezone';

describe('loan', () => {
  it('rejects invalid input', () => {
    expect(validateLoanInput({ principal: 0, annualRatePercent: 10, periods: 12, method: 'annuity' })).toBeTruthy();
    expect(validateLoanInput({ principal: -1, annualRatePercent: 10, periods: 12, method: 'annuity' })).toBeTruthy();
    expect(validateLoanInput({ principal: 1000, annualRatePercent: -1, periods: 12, method: 'annuity' })).toBeTruthy();
    expect(validateLoanInput({ principal: 1000, annualRatePercent: 10, periods: 0, method: 'annuity' })).toBeTruthy();
  });

  it('zero interest annuity = principal / n', () => {
    const r = calculateLoan({ principal: 12000, annualRatePercent: 0, periods: 12, method: 'annuity' });
    expect(r.monthlyPayment).toBeCloseTo(1000, 6);
    expect(r.totalInterest).toBeCloseTo(0, 6);
    expect(r.totalPayment).toBeCloseTo(12000, 6);
  });

  it('flat interest', () => {
    // P=12_000_000, r=12%/yr, n=12 → monthly interest = 120000, principal/mo = 1_000_000
    const r = calculateLoan({ principal: 12_000_000, annualRatePercent: 12, periods: 12, method: 'flat' });
    expect(r.monthlyPayment).toBeCloseTo(1_120_000, 2);
    expect(r.totalInterest).toBeCloseTo(1_440_000, 2);
    expect(r.totalPayment).toBeCloseTo(13_440_000, 2);
    expect(r.schedule).toHaveLength(12);
  });

  it('annuity known formula', () => {
    // P=100000, i=1%/mo, n=12 → A = 100000 * 0.01 / (1 - 1.01^-12) ≈ 8884.88
    const r = calculateLoan({ principal: 100_000, annualRatePercent: 12, periods: 12, method: 'annuity' });
    expect(r.monthlyPayment).toBeCloseTo(8884.88, 1);
    expect(r.schedule).toHaveLength(12);
    const last = r.schedule[11];
    expect(last.balance).toBeCloseTo(0, 1);
  });

  it('effective declining balance', () => {
    const r = calculateLoan({ principal: 12_000, annualRatePercent: 12, periods: 12, method: 'effective' });
    expect(r.schedule).toHaveLength(12);
    expect(r.totalInterest).toBeGreaterThan(0);
    expect(r.schedule[0].payment).toBeGreaterThan(r.schedule[11].payment);
  });
});

describe('percentage', () => {
  it('percent of', () => {
    const r = percentOf(500_000, 20);
    expect(r.result).toBe(100_000);
  });

  it('percent change up/down/zero start', () => {
    const up = percentChange(100, 120);
    expect(up.percent).toBeCloseTo(20);
    expect(up.direction).toBe('up');
    const down = percentChange(100, 80);
    expect(down.percent).toBeCloseTo(-20);
    expect(down.direction).toBe('down');
    expect(() => percentChange(0, 50)).toThrow();
  });

  it('single discount', () => {
    const r = singleDiscount(500_000, 20);
    expect(r.finalPrice).toBe(400_000);
    expect(r.discountAmount).toBe(100_000);
  });

  it('stacked discount sequential', () => {
    const r = stackedDiscount(500_000, [20, 10]);
    expect(r.finalPrice).toBeCloseTo(360_000);
  });

  it('tax add/remove', () => {
    const add = addTax(100_000, 11);
    expect(add.result).toBeCloseTo(111_000);
    const rem = removeTax(111_000, 11);
    expect(rem.result).toBeCloseTo(100_000);
  });

  it('markup vs margin', () => {
    const mk = markup(100, 25);
    expect(mk.sellingPrice).toBe(125);
    const mg = margin(125, 100);
    expect(mg.marginPercent).toBeCloseTo(20);
  });
});

describe('date', () => {
  it('leap year', () => {
    expect(isLeap(2024)).toBe(true);
    expect(isLeap(1900)).toBe(false);
    expect(isLeap(2000)).toBe(true);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
  });

  it('valid / invalid YMD', () => {
    expect(isValidYMD(2024, 2, 29)).toBe(true);
    expect(isValidYMD(2023, 2, 29)).toBe(false);
    expect(isValidYMD(2024, 13, 1)).toBe(false);
    expect(parseYMD('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 });
    expect(parseYMD('2023-02-29')).toBeNull();
  });

  it('same day diff', () => {
    const a = { y: 2024, m: 1, d: 1 };
    const r = dateDiff(a, a, false);
    expect(r.totalDays).toBe(0);
    expect(dateDiff(a, a, true).totalDays).toBe(1);
  });

  it('cross month/year', () => {
    const r = dateDiff({ y: 2023, m: 12, d: 31 }, { y: 2024, m: 1, d: 1 }, false);
    expect(r.totalDays).toBe(1);
  });

  it('29 Feb age policy', () => {
    const age = calculateAge({ y: 2000, m: 2, d: 29 }, { y: 2023, m: 3, d: 1 });
    expect(age.years).toBeGreaterThanOrEqual(23);
    // next birthday on non-leap should be Mar 1
    expect(age.nextBirthday.m === 3 || age.nextBirthday.d === 29).toBe(true);
  });

  it('add month from Jan 31 clamps', () => {
    const r = addSubDate({ y: 2024, m: 1, d: 31 }, 0, 1, 0, 'add');
    expect(r.result.m).toBe(2);
    expect(r.result.d).toBe(29); // 2024 leap
  });

  it('daysBetween', () => {
    expect(daysBetween({ y: 2024, m: 1, d: 1 }, { y: 2024, m: 1, d: 2 })).toBe(1);
  });
});

describe('timezone', () => {
  it('valid zones', () => {
    expect(isValidTimeZone('Asia/Jakarta')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
  });

  it('Jakarta to Tokyo', () => {
    // Jakarta UTC+7, Tokyo UTC+9 → +2h
    const r = convertTimezone(2024, 6, 15, 10, 0, 0, 'Asia/Jakarta', 'Asia/Tokyo');
    expect(r.target.hour).toBe(12);
    expect(r.dayChanged).toBe(false);
  });

  it('day change', () => {
    const r = convertTimezone(2024, 6, 15, 23, 0, 0, 'Asia/Jakarta', 'Asia/Tokyo');
    expect(r.target.hour).toBe(1);
    expect(r.dayChanged).toBe(true);
  });
});
