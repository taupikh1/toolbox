/** Pure loan calculation logic. No DOM. */

export type InterestMethod = 'flat' | 'effective' | 'annuity';

export interface LoanInput {
  principal: number;
  annualRatePercent: number;
  periods: number; // number of payment periods
  method: InterestMethod;
}

export interface ScheduleRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface LoanResult {
  monthlyPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPayment: number;
  schedule: ScheduleRow[];
  methodLabel: string;
  assumptions: string[];
}

const EPS = 1e-9;

function roundDisplay(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export function validateLoanInput(input: Partial<LoanInput>): string | null {
  if (input.principal == null || !Number.isFinite(input.principal)) return 'Jumlah pinjaman harus berupa angka.';
  if (input.principal <= 0) return 'Jumlah pinjaman harus lebih dari 0.';
  if (input.principal > 1e15) return 'Jumlah pinjaman terlalu besar.';
  if (input.annualRatePercent == null || !Number.isFinite(input.annualRatePercent)) return 'Suku bunga harus berupa angka.';
  if (input.annualRatePercent < 0) return 'Suku bunga tidak boleh negatif.';
  if (input.annualRatePercent > 1000) return 'Suku bunga terlalu tinggi.';
  if (input.periods == null || !Number.isFinite(input.periods)) return 'Periode harus berupa angka.';
  if (!Number.isInteger(input.periods) || input.periods < 1) return 'Periode harus bilangan bulat minimal 1.';
  if (input.periods > 600) return 'Periode maksimal 600 (50 tahun).';
  if (!input.method || !['flat', 'effective', 'annuity'].includes(input.method)) return 'Metode bunga tidak valid.';
  return null;
}

/** Flat interest: interest each month on original principal. */
function calcFlat(P: number, annualRate: number, n: number): LoanResult {
  const r = annualRate / 100;
  const monthlyInterest = P * (r / 12);
  const principalPerMonth = P / n;
  const payment = principalPerMonth + monthlyInterest;
  const totalInterest = monthlyInterest * n;
  const totalPayment = P + totalInterest;

  const schedule: ScheduleRow[] = [];
  let balance = P;
  for (let i = 1; i <= n; i++) {
    const prin = i === n ? balance : principalPerMonth;
    const interest = monthlyInterest;
    const pay = prin + interest;
    balance = Math.max(0, balance - prin);
    schedule.push({
      period: i,
      payment: pay,
      principal: prin,
      interest,
      balance,
    });
  }

  return {
    monthlyPayment: payment,
    totalPrincipal: P,
    totalInterest,
    totalPayment,
    schedule,
    methodLabel: 'Bunga Flat',
    assumptions: [
      'Bunga dihitung setiap bulan atas pokok awal (bukan sisa).',
      'Angsuran pokok sama setiap bulan; bunga tetap.',
      'Suku bunga tahunan dibagi 12 untuk bunga bulanan.',
    ],
  };
}

/** Effective (declining balance): interest on remaining balance each period. */
function calcEffective(P: number, annualRate: number, n: number): LoanResult {
  const i = annualRate / 100 / 12;
  // Approximate equal principal + interest on remaining; use annuity-like payment for consistency
  // For true effective with equal total payment we use annuity; here we use equal principal reduction.
  const principalPerMonth = P / n;
  const schedule: ScheduleRow[] = [];
  let balance = P;
  let totalInterest = 0;
  let totalPayment = 0;

  for (let k = 1; k <= n; k++) {
    const interest = balance * i;
    const prin = k === n ? balance : principalPerMonth;
    const pay = prin + interest;
    balance = Math.max(0, balance - prin);
    totalInterest += interest;
    totalPayment += pay;
    schedule.push({
      period: k,
      payment: pay,
      principal: prin,
      interest,
      balance,
    });
  }

  const monthlyPayment = schedule[0]?.payment ?? 0;

  return {
    monthlyPayment,
    totalPrincipal: P,
    totalInterest,
    totalPayment,
    schedule,
    methodLabel: 'Bunga Efektif (Saldo Menurun)',
    assumptions: [
      'Bunga dihitung atas sisa pokok setiap periode.',
      'Pokok dicicil rata setiap bulan; angsuran total menurun seiring waktu.',
      'Suku bunga per periode = suku bunga tahunan / 12.',
    ],
  };
}

/** Annuity (equal installment). */
function calcAnnuity(P: number, annualRate: number, n: number): LoanResult {
  const i = annualRate / 100 / 12;
  let A: number;
  if (Math.abs(i) < EPS) {
    A = P / n;
  } else {
    A = (P * i) / (1 - Math.pow(1 + i, -n));
  }

  const schedule: ScheduleRow[] = [];
  let balance = P;
  let totalInterest = 0;

  for (let k = 1; k <= n; k++) {
    const interest = balance * i;
    let prin = A - interest;
    if (k === n) {
      // Adjust last payment for rounding
      prin = balance;
    }
    const pay = prin + interest;
    balance = Math.max(0, balance - prin);
    totalInterest += interest;
    schedule.push({
      period: k,
      payment: pay,
      principal: prin,
      interest,
      balance,
    });
  }

  const totalPayment = schedule.reduce((s, r) => s + r.payment, 0);

  return {
    monthlyPayment: A,
    totalPrincipal: P,
    totalInterest,
    totalPayment,
    schedule,
    methodLabel: 'Anuitas (Cicilan Tetap)',
    assumptions: [
      'Angsuran total sama setiap periode.',
      'Komposisi bunga menurun, pokok meningkat seiring waktu.',
      'Suku bunga per periode = suku bunga tahunan / 12.',
      'Angsuran terakhir disesuaikan agar saldo tepat nol.',
    ],
  };
}

export function calculateLoan(input: LoanInput): LoanResult {
  const err = validateLoanInput(input);
  if (err) throw new Error(err);

  const { principal: P, annualRatePercent, periods: n, method } = input;

  switch (method) {
    case 'flat':
      return calcFlat(P, annualRatePercent, n);
    case 'effective':
      return calcEffective(P, annualRatePercent, n);
    case 'annuity':
      return calcAnnuity(P, annualRatePercent, n);
    default:
      throw new Error('Metode tidak dikenal.');
  }
}

/** Format number for Indonesian locale display. */
export function fmtMoney(n: number, digits = 2): string {
  return roundDisplay(n, digits).toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
