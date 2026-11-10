import { useRef, useState } from 'react';

interface Props {
  accept: string;
  hint: string;
  disabled?: boolean;
  disabledReason?: string;
  onFiles: (files: File[]) => void;
}

export function FileDropzone({ accept, hint, disabled, disabledReason, onFiles }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const take = (list: FileList | null) => {
    if (list?.length) onFiles([...list]);
    if (ref.current) ref.current.value = '';
  };
  return (
    <div
      className={'drop' + (disabled ? ' dc-disabled' : '') + (over ? ' over' : '')}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled) take(e.dataTransfer.files);
      }}
    >
      <button type="button" className="btn" disabled={disabled} aria-describedby="dc-drop-hint" onClick={() => ref.current?.click()}>
        Pilih file untuk diperiksa
      </button>
      <input ref={ref} type="file" multiple accept={accept} hidden tabIndex={-1} aria-hidden="true" onChange={(e) => take(e.target.files)} />
      <p className="muted" id="dc-drop-hint" style={{ margin: '.5rem 0 0' }}>
        {disabled ? disabledReason : `atau seret file ke sini. ${hint}`}
      </p>
    </div>
  );
}
