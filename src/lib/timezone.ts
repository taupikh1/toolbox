/** Timezone conversion using Intl.DateTimeFormat. Offline, no external API. */

export interface TzParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
  offset: string;
  offsetMinutes: number;
  isoLike: string;
  display: string;
}

export interface TzConvertResult {
  source: TzParts;
  target: TzParts;
  sourceZone: string;
  targetZone: string;
  dayChanged: boolean;
  yearChanged: boolean;
  offsetDiffMinutes: number;
  offsetDiffLabel: string;
  ambiguousNote?: string;
}

export const POPULAR_ZONES = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
] as const;

let cachedZones: string[] | null = null;

export function listTimeZones(): string[] {
  if (cachedZones) return cachedZones;
  try {
    
    if (typeof Intl !== 'undefined' && typeof (Intl as any).supportedValuesOf === 'function') {
      
      const all: string[] = (Intl as any).supportedValuesOf('timeZone');
      cachedZones = all.sort((a, b) => a.localeCompare(b));
      return cachedZones;
    }
  } catch {
    /* fallback */
  }
  cachedZones = [...POPULAR_ZONES];
  return cachedZones;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

/** Parse offset string like "GMT+7", "GMT+05:30", "UTC" to minutes from UTC. */
function parseOffsetMinutes(offsetStr: string): number {
  if (!offsetStr || offsetStr === 'GMT' || offsetStr === 'UTC') return 0;
  const m = offsetStr.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const h = parseInt(m[2], 10);
  const min = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (h * 60 + min);
}

function getPartsInZone(date: Date, timeZone: string): TzParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'long',
    timeZoneName: 'shortOffset',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0;

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10);
  const day = parseInt(get('day'), 10);
  const minute = parseInt(get('minute'), 10);
  const second = parseInt(get('second'), 10);
  const weekday = get('weekday');
  const offset = get('timeZoneName') || 'GMT';
  const offsetMinutes = parseOffsetMinutes(offset);

  const isoLike = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  const display = `${weekday}, ${pad(day)}/${pad(month)}/${year} ${pad(hour)}:${pad(minute)}:${pad(second)} (${offset})`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
    offset,
    offsetMinutes,
    isoLike,
    display,
  };
}

/**
 * Find UTC instant whose wall-clock in `timeZone` matches the given components.
 * Handles DST ambiguity (multiple matches → earliest) and gaps (no match → nearest after).
 */
function findUtcInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): { utcMs: number; ambiguousNote?: string } {
  // Initial guess: treat components as UTC
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);

  // Probe offsets at a few points to narrow search window
  const probeOffsets = [-14, -7, 0, 7, 14].map((h) => {
    const p = getPartsInZone(new Date(guess + h * 3600000), timeZone);
    return p.offsetMinutes;
  });
  const minOff = Math.min(...probeOffsets) - 60;
  const maxOff = Math.max(...probeOffsets) + 60;

  // Search window: guess adjusted by possible offsets
  const start = guess - maxOff * 60000 - 2 * 3600000;
  const end = guess - minOff * 60000 + 2 * 3600000;

  const matches: number[] = [];

  // Scan in 15-minute steps, then refine seconds in matching minutes
  for (let t = start; t <= end; t += 15 * 60 * 1000) {
    const p = getPartsInZone(new Date(t), timeZone);
    if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute) {
      const minuteStart = t - (t % 60000);
      for (let s = 0; s < 60; s++) {
        const cand = minuteStart + s * 1000;
        const pp = getPartsInZone(new Date(cand), timeZone);
        if (
          pp.year === year &&
          pp.month === month &&
          pp.day === day &&
          pp.hour === hour &&
          pp.minute === minute &&
          pp.second === second
        ) {
          matches.push(cand);
        }
      }
    }
  }

  // Dedupe
  const unique = [...new Set(matches)].sort((a, b) => a - b);

  if (unique.length === 0) {
    // Gap (spring-forward): find nearest wall-time after the desired time
    let best = guess;
    let bestScore = Infinity;
    for (let t = start; t <= end; t += 60 * 1000) {
      const p = getPartsInZone(new Date(t), timeZone);
      const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      const target = Date.UTC(year, month - 1, day, hour, minute, second);
      const score = Math.abs(wall - target);
      if (score < bestScore) {
        bestScore = score;
        best = t;
      }
    }
    return {
      utcMs: best,
      ambiguousNote:
        'Waktu lokal ini kemungkinan tidak ada (lompatan DST). Dipakai waktu terdekat yang valid.',
    };
  }

  if (unique.length > 1) {
    return {
      utcMs: unique[0],
      ambiguousNote: 'Waktu lokal ini ambigu (overlap DST). Dipakai kemunculan lebih awal.',
    };
  }

  return { utcMs: unique[0] };
}

export function convertTimezone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  sourceZone: string,
  targetZone: string,
): TzConvertResult {
  if (!isValidTimeZone(sourceZone)) throw new Error(`Zona waktu asal tidak valid: ${sourceZone}`);
  if (!isValidTimeZone(targetZone)) throw new Error(`Zona waktu tujuan tidak valid: ${targetZone}`);
  if (!Number.isInteger(year) || year < 1 || year > 9999) throw new Error('Tahun tidak valid.');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('Bulan tidak valid.');
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Hari tidak valid.');
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('Jam harus 0–23.');
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('Menit harus 0–59.');
  if (!Number.isInteger(second) || second < 0 || second > 59) throw new Error('Detik harus 0–59.');

  const { utcMs, ambiguousNote } = findUtcInstant(year, month, day, hour, minute, second, sourceZone);

  const sourceParts = getPartsInZone(new Date(utcMs), sourceZone);
  const targetParts = getPartsInZone(new Date(utcMs), targetZone);

  const dayChanged =
    sourceParts.year !== targetParts.year ||
    sourceParts.month !== targetParts.month ||
    sourceParts.day !== targetParts.day;
  const yearChanged = sourceParts.year !== targetParts.year;
  const offsetDiffMinutes = targetParts.offsetMinutes - sourceParts.offsetMinutes;
  const absMin = Math.abs(offsetDiffMinutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const offsetDiffLabel =
    offsetDiffMinutes === 0
      ? 'Sama (0 jam)'
      : `${offsetDiffMinutes > 0 ? '+' : '-'}${h} jam${m ? ` ${m} menit` : ''}`;

  return {
    source: sourceParts,
    target: targetParts,
    sourceZone,
    targetZone,
    dayChanged,
    yearChanged,
    offsetDiffMinutes,
    offsetDiffLabel,
    ambiguousNote,
  };
}

export function nowInZone(timeZone: string): TzParts {
  return getPartsInZone(new Date(), timeZone);
}
