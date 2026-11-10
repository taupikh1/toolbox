/**
 * A/B player position sync — pure mapping when switching sources.
 */

export type AbSource = 'original' | 'vocals' | 'instrumental';

export interface AbState {
  source: AbSource;
  /** currentTime in seconds of the active element */
  currentTime: number;
  duration: number;
}

/**
 * When switching source, clamp position into the new duration.
 * If durations match, position is preserved 1:1.
 */
export function mapPositionOnSourceSwitch(
  fromTime: number,
  fromDuration: number,
  toDuration: number,
): number {
  if (!(toDuration > 0)) return 0;
  if (!(fromDuration > 0)) return Math.min(Math.max(0, fromTime), toDuration);
  const ratio = fromTime / fromDuration;
  const t = ratio * toDuration;
  return Math.min(Math.max(0, t), toDuration);
}

export function nextSource(
  current: AbSource,
  available: AbSource[],
  direction: 1 | -1,
): AbSource {
  if (!available.length) return current;
  const idx = available.indexOf(current);
  if (idx < 0) return available[0];
  const n = available.length;
  return available[(idx + direction + n) % n];
}
