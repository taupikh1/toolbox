/** Pure percentage & discount calculation logic. */

export type PercentMode =
  | 'of'
  | 'change'
  | 'discount'
  | 'stacked'
  | 'tax'
  | 'markup'
  | 'margin';

export interface PercentOfResult {
  mode: 'of';
  value: number;
  percent: number;
  result: number;
  formula: string;
}

export interface PercentChangeResult {
  mode: 'change';
  start: number;
  end: number;
  percent: number;
  delta: number;
  direction: 'up' | 'down' | 'same';
  formula: string;
}

export interface DiscountResult {
  mode: 'discount';
  price: number;
  percent: number;
  discountAmount: number;
  finalPrice: number;
  formula: string;
}

export interface StackedDiscountResult {
  mode: 'stacked';
  price: number;
  discounts: number[];
  steps: { percent: number; after: number }[];
  finalPrice: number;
  totalDiscountPercent: number;
  formula: string;
}

export interface TaxResult {
  mode: 'tax';
  direction: 'add' | 'remove';
  amount: number;
  rate: number;
  taxAmount: number;
  result: number;
  formula: string;
}

export interface MarkupResult {
  mode: 'markup';
  cost: number;
  markupPercent: number;
  markupAmount: number;
  sellingPrice: number;
  formula: string;
}

export interface MarginResult {
  mode: 'margin';
  sellingPrice: number;
  cost: number;
  marginAmount: number;
  marginPercent: number;
  formula: string;
}

export type PercentResult =
  | PercentOfResult
  | PercentChangeResult
  | DiscountResult
  | StackedDiscountResult
  | TaxResult
  | MarkupResult
  | MarginResult;

function checkFinite(...nums: number[]): string | null {
  for (const n of nums) {
    if (!Number.isFinite(n)) return 'Nilai harus berupa angka yang valid.';
  }
  return null;
}

export function percentOf(value: number, percent: number): PercentOfResult {
  const e = checkFinite(value, percent);
  if (e) throw new Error(e);
  const result = (percent / 100) * value;
  return {
    mode: 'of',
    value,
    percent,
    result,
    formula: `(${percent} / 100) × ${value} = ${result}`,
  };
}

export function percentChange(start: number, end: number): PercentChangeResult {
  const e = checkFinite(start, end);
  if (e) throw new Error(e);
  if (start === 0) throw new Error('Nilai awal tidak boleh nol untuk menghitung persentase perubahan.');
  const delta = end - start;
  const percent = (delta / start) * 100;
  const direction: 'up' | 'down' | 'same' =
    percent > 0 ? 'up' : percent < 0 ? 'down' : 'same';
  return {
    mode: 'change',
    start,
    end,
    percent,
    delta,
    direction,
    formula: `((${end} - ${start}) / ${start}) × 100 = ${percent}%`,
  };
}

export function singleDiscount(price: number, percent: number): DiscountResult {
  const e = checkFinite(price, percent);
  if (e) throw new Error(e);
  if (price < 0) throw new Error('Harga tidak boleh negatif.');
  if (percent < 0 || percent > 100) throw new Error('Diskon harus antara 0 dan 100%.');
  const discountAmount = price * (percent / 100);
  const finalPrice = price - discountAmount;
  return {
    mode: 'discount',
    price,
    percent,
    discountAmount,
    finalPrice,
    formula: `${price} × (1 - ${percent}/100) = ${finalPrice}`,
  };
}

export function stackedDiscount(price: number, discounts: number[]): StackedDiscountResult {
  const e = checkFinite(price, ...discounts);
  if (e) throw new Error(e);
  if (price < 0) throw new Error('Harga tidak boleh negatif.');
  if (discounts.length === 0) throw new Error('Minimal satu diskon.');
  for (const d of discounts) {
    if (d < 0 || d > 100) throw new Error('Setiap diskon harus antara 0 dan 100%.');
  }
  let current = price;
  const steps: { percent: number; after: number }[] = [];
  for (const d of discounts) {
    current = current * (1 - d / 100);
    steps.push({ percent: d, after: current });
  }
  const totalDiscountPercent = price === 0 ? 0 : ((price - current) / price) * 100;
  const formulaParts = discounts.map((d) => `(1 - ${d}/100)`).join(' × ');
  return {
    mode: 'stacked',
    price,
    discounts,
    steps,
    finalPrice: current,
    totalDiscountPercent,
    formula: `${price} × ${formulaParts} = ${current}`,
  };
}

export function addTax(amount: number, rate: number): TaxResult {
  const e = checkFinite(amount, rate);
  if (e) throw new Error(e);
  if (amount < 0) throw new Error('Nilai tidak boleh negatif.');
  if (rate < 0) throw new Error('Tarif pajak tidak boleh negatif.');
  const taxAmount = amount * (rate / 100);
  const result = amount + taxAmount;
  return {
    mode: 'tax',
    direction: 'add',
    amount,
    rate,
    taxAmount,
    result,
    formula: `${amount} × (1 + ${rate}/100) = ${result}`,
  };
}

export function removeTax(amountInclusive: number, rate: number): TaxResult {
  const e = checkFinite(amountInclusive, rate);
  if (e) throw new Error(e);
  if (amountInclusive < 0) throw new Error('Nilai tidak boleh negatif.');
  if (rate < 0) throw new Error('Tarif pajak tidak boleh negatif.');
  if (rate >= 100) throw new Error('Tarif pajak harus di bawah 100% untuk menghitung harga sebelum pajak.');
  const result = amountInclusive / (1 + rate / 100);
  const taxAmount = amountInclusive - result;
  return {
    mode: 'tax',
    direction: 'remove',
    amount: amountInclusive,
    rate,
    taxAmount,
    result,
    formula: `${amountInclusive} / (1 + ${rate}/100) = ${result}`,
  };
}

/** Markup = (selling - cost) / cost × 100 */
export function markup(cost: number, markupPercent: number): MarkupResult {
  const e = checkFinite(cost, markupPercent);
  if (e) throw new Error(e);
  if (cost < 0) throw new Error('Modal tidak boleh negatif.');
  if (markupPercent < 0) throw new Error('Markup tidak boleh negatif.');
  const markupAmount = cost * (markupPercent / 100);
  const sellingPrice = cost + markupAmount;
  return {
    mode: 'markup',
    cost,
    markupPercent,
    markupAmount,
    sellingPrice,
    formula: `${cost} × (1 + ${markupPercent}/100) = ${sellingPrice}`,
  };
}

/** Margin = (selling - cost) / selling × 100 */
export function margin(sellingPrice: number, cost: number): MarginResult {
  const e = checkFinite(sellingPrice, cost);
  if (e) throw new Error(e);
  if (sellingPrice <= 0) throw new Error('Harga jual harus lebih dari 0.');
  if (cost < 0) throw new Error('Modal tidak boleh negatif.');
  const marginAmount = sellingPrice - cost;
  const marginPercent = (marginAmount / sellingPrice) * 100;
  return {
    mode: 'margin',
    sellingPrice,
    cost,
    marginAmount,
    marginPercent,
    formula: `((${sellingPrice} - ${cost}) / ${sellingPrice}) × 100 = ${marginPercent}%`,
  };
}

export function fmtNum(n: number, digits = 2): string {
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}
