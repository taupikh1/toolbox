/** Pure date calculation logic. Date-only, local timezone, no DST issues for calendar math. */

export interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

export interface DateDiffResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  totalMonthsApprox: number;
  inclusive: boolean;
  start: YMD;
  end: YMD;
  swapped: boolean;
}

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  totalWeeks: number;
  nextBirthday: YMD;
  daysToNextBirthday: number;
  isBirthdayToday: boolean;
  birth: YMD;
  ref: YMD;
}

export interface AddSubResult {
  result: YMD;
  weekday: string;
  weekdayIndex: number;
  iso: string;
  display: string;
}

const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  const dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && isLeap(y)) return 29;
  return dim[m - 1] ?? 0;
}

export function isValidYMD(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1 || y > 9999) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > daysInMonth(y, m)) return false;
  return true;
}

export function parseYMD(s: string): YMD | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (!isValidYMD(y, mo, d)) return null;
  return { y, m: mo, d };
}

export function toYMDString(ymd: YMD): string {
  return `${String(ymd.y).padStart(4, '0')}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`;
}

export function todayYMD(): YMD {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/** Compare two YMD: -1 if a<b, 0 if equal, 1 if a>b */
export function cmpYMD(a: YMD, b: YMD): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  return 0;
}

/** Day of week: 0=Sunday ... 6=Saturday (local). Uses Date constructor carefully. */
export function weekdayOf(ymd: YMD): number {
  // Create local date at noon to avoid DST edge issues
  const dt = new Date(ymd.y, ymd.m - 1, ymd.d, 12, 0, 0);
  return dt.getDay();
}

/** Absolute difference in whole days (exclusive of end by default). */
export function daysBetween(start: YMD, end: YMD): number {
  // Use UTC noon to avoid DST
  const a = Date.UTC(start.y, start.m - 1, start.d);
  const b = Date.UTC(end.y, end.m - 1, end.d);
  return Math.round((b - a) / 86400000);
}

/**
 * Calendar difference: years, months, days.
 * Policy: from start, add years then months then days to reach end.
 * Inclusive: if true, end day is counted (totalDays + 1).
 */
export function dateDiff(start: YMD, end: YMD, inclusive = false): DateDiffResult {
  let a = start;
  let b = end;
  let swapped = false;
  if (cmpYMD(a, b) > 0) {
    a = end;
    b = start;
    swapped = true;
  }

  let years = b.y - a.y;
  let months = b.m - a.m;
  let days = b.d - a.d;

  if (days < 0) {
    months -= 1;
    // days from previous month of b
    const prevM = b.m === 1 ? 12 : b.m - 1;
    const prevY = b.m === 1 ? b.y - 1 : b.y;
    days += daysInMonth(prevY, prevM);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  let totalDays = daysBetween(a, b);
  if (inclusive) totalDays += 1;

  const totalWeeks = Math.floor(totalDays / 7);
  const totalMonthsApprox = years * 12 + months;

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    totalMonthsApprox,
    inclusive,
    start: a,
    end: b,
    swapped,
  };
}

/**
 * Age calculation.
 * Policy for Feb 29 birth: on non-leap years, birthday is treated as March 1
 * (common civil convention in many jurisdictions). Documented in DECISIONS.
 */
export function calculateAge(birth: YMD, ref: YMD = todayYMD()): AgeResult {
  if (cmpYMD(birth, ref) > 0) throw new Error('Tanggal lahir tidak boleh setelah tanggal referensi.');

  const diff = dateDiff(birth, ref, false);
  const years = diff.years;
  const months = diff.months;
  const days = diff.days;
  const totalDays = daysBetween(birth, ref);
  const totalWeeks = Math.floor(totalDays / 7);

  // Next birthday
  let nextY = ref.y;
  let nextM = birth.m;
  let nextD = birth.d;

  // Feb 29 policy: non-leap → March 1
  if (birth.m === 2 && birth.d === 29 && !isLeap(nextY)) {
    nextM = 3;
    nextD = 1;
  }

  let next: YMD = { y: nextY, m: nextM, d: nextD };
  if (cmpYMD(next, ref) <= 0) {
    nextY += 1;
    if (birth.m === 2 && birth.d === 29 && !isLeap(nextY)) {
      next = { y: nextY, m: 3, d: 1 };
    } else {
      next = { y: nextY, m: birth.m, d: birth.d };
      // clamp if needed (shouldn't for normal birth dates)
      if (!isValidYMD(next.y, next.m, next.d)) {
        next.d = daysInMonth(next.y, next.m);
      }
    }
  }

  const daysToNext = daysBetween(ref, next);
  const isBirthdayToday = cmpYMD(
    { y: ref.y, m: birth.m === 2 && birth.d === 29 && !isLeap(ref.y) ? 3 : birth.m, d: birth.m === 2 && birth.d === 29 && !isLeap(ref.y) ? 1 : birth.d },
    ref,
  ) === 0;

  return {
    years,
    months,
    days,
    totalDays,
    totalWeeks,
    nextBirthday: next,
    daysToNextBirthday: daysToNext,
    isBirthdayToday,
    birth,
    ref,
  };
}

/**
 * Add or subtract years/months/days.
 * Policy for end-of-month: 31 Jan + 1 month → last day of Feb (28/29).
 * Same for any day that doesn't exist in target month → clamp to last day.
 */
export function addSubDate(
  base: YMD,
  years: number,
  months: number,
  days: number,
  op: 'add' | 'sub' = 'add',
): AddSubResult {
  const sign = op === 'add' ? 1 : -1;
  let y = base.y + sign * years;
  let m = base.m + sign * months;
  let d = base.d;

  // Normalize months
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }

  // Clamp day to valid in target month
  const maxD = daysInMonth(y, m);
  if (d > maxD) d = maxD;

  // Apply days via UTC to stay calendar-safe
  const utc = Date.UTC(y, m - 1, d) + sign * days * 86400000;
  const dt = new Date(utc);
  const result: YMD = {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };

  const wd = weekdayOf(result);
  return {
    result,
    weekday: WEEKDAYS[wd],
    weekdayIndex: wd,
    iso: toYMDString(result),
    display: `${WEEKDAYS[wd]}, ${result.d} ${monthName(result.m)} ${result.y}`,
  };
}

function monthName(m: number): string {
  const names = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  return names[m - 1] ?? '';
}

export function formatYMDLong(ymd: YMD): string {
  return `${WEEKDAYS[weekdayOf(ymd)]}, ${ymd.d} ${monthName(ymd.m)} ${ymd.y}`;
}
