import type { ReactNode } from 'react';
import type { ConversionDefinition } from '../types/conversion';
import { conversionRegistry } from '../registry/conversion-registry';
import { getMaxMB } from '../validation/file-limits';
import { FORMAT_SPECS } from '../validation/file-formats';
import { ConversionStatus } from './ConversionStatus';
import { UnsupportedFeatureNotice } from './UnsupportedFeatureNotice';

const WAIT_TEXT: Record<string, string> = {
  'in-development': 'Fitur ini masih dalam pengembangan. Konversi belum berjalan, jadi tombol Konversi dinonaktifkan.',
  'coming-soon': 'Fitur ini segera hadir dan bergantung pada hasil uji mesin konversi. Konversi belum berjalan, jadi tombol Konversi dinonaktifkan.',
  unsupported: 'Fitur ini tidak didukung.',
};

/** Detail konversi terpilih. Tombol Konversi aktif HANYA jika handler nyata ada. */
export function ConversionOptions({
  def,
  onClose,
  children,
  onConvert,
  converting,
  canConvert,
}: {
  def: ConversionDefinition;
  onClose: () => void;
  children?: ReactNode;
  onConvert?: () => void;
  converting?: boolean;
  canConvert?: boolean;
}) {
  const runnable = conversionRegistry.isRunnable(def);
  const inLabels = def.inputFormats.map((f) => FORMAT_SPECS[f].label).join(', ');
  const msgId = 'dc-wait-' + def.id;
  return (
    <section className="dc-detail" aria-label={`Detail ${def.name}`}>
      <div className="dc-detail-head">
        <h3>{def.name}</h3>
        <button className="btn sm" type="button" onClick={onClose}>
          Tutup detail
        </button>
      </div>
      <ConversionStatus availability={def.availability} tier={def.tier} />
      <p className="muted" style={{ margin: 0 }}>
        {def.description}
      </p>
      <dl className="dc-meta">
        <div>
          <dt>Format masukan</dt>
          <dd>{inLabels}</dd>
        </div>
        <div>
          <dt>Format keluaran</dt>
          <dd>{def.outputFormats.map((f) => f.toUpperCase()).join(', ')}</dd>
        </div>
        <div>
          <dt>Batas ukuran file</dt>
          <dd>{getMaxMB(def.limitCategory)} MB</dd>
        </div>
      </dl>
      <UnsupportedFeatureNotice title="Keterbatasan" items={def.limitations} />
      {def.existingToolId ? (
        <a className="btn primary" href={'#/tools/' + def.existingToolId}>
          Buka tool ini
        </a>
      ) : (
        <>
          <button
            className="btn primary"
            type="button"
            disabled={!runnable || converting || (canConvert === false)}
            aria-describedby={runnable ? undefined : msgId}
            onClick={onConvert}
          >
            {converting ? 'Sedang mengonversi…' : 'Konversi'}
          </button>
          {!runnable && (
            <p className="muted dc-wait" id={msgId}>
              {WAIT_TEXT[def.availability]}
            </p>
          )}
          {children}
        </>
      )}
    </section>
  );
}
