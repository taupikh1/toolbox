import type { ConversionProgress as Progress } from '../types/conversion';

/** Hanya menampilkan progres yang dikirim pekerjaan nyata. percent kosong = tidak terukur. */
export function ConversionProgress({ progress }: { progress: Progress | null }) {
  if (!progress) return null;
  const measurable = typeof progress.percent === 'number';
  return (
    <div className="dc-progress" role="status" aria-live="polite">
      <span>{progress.message ?? progress.phase}</span>
      {measurable ? (
        <progress max={100} value={Math.max(0, Math.min(100, progress.percent as number))} />
      ) : (
        <small className="muted">Progres tidak terukur.</small>
      )}
    </div>
  );
}
