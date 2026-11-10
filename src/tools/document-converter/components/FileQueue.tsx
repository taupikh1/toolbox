import type { CheckedFile } from '../services/file-service';
import { formatFileSize } from '../utils/format-file-size';
import { VALIDATION_TITLES } from '../utils/format-error';

export function FileQueue({ items, onRemove, onClear }: { items: CheckedFile[]; onRemove: (id: number) => void; onClear: () => void }) {
  if (items.length === 0) return null;
  return (
    <div className="dc-queue-wrap">
      <div className="dc-queue-head">
        <b>Hasil pemeriksaan file</b>
        <button className="btn sm" type="button" onClick={onClear}>Kosongkan daftar</button>
      </div>
      <ul className="dc-queue" aria-label="Hasil pemeriksaan file">
        {items.map(({ id, file, result }) => (
          <li key={id} className="dc-file">
            <div className="thumb">
              <span title={file.name}>{file.name}</span>
              <small className="muted">{formatFileSize(file.size)}</small>
              {result.ok ? (
                <small className="ok">✓ Sesuai format {result.format.toUpperCase()}</small>
              ) : (
                <small className="er" title={result.message}>✕ {VALIDATION_TITLES[result.code]}</small>
              )}
              <button className="btn sm" type="button" onClick={() => onRemove(id)} aria-label={`Hapus ${file.name} dari daftar`}>✕</button>
            </div>
            {!result.ok ? (
              <p className="er dc-msg">{result.message}</p>
            ) : result.warnings.length ? (
              <p className="muted dc-msg">{result.warnings.join(' ')}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
