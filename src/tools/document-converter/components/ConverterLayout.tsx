import type { ReactNode } from 'react';
import type { Availability } from '../types/conversion';
import type { PageLayout } from '../registry/page-layouts';
import { AVAILABILITY_LABEL } from '../registry/conversion-registry';
import { UnsupportedFeatureNotice } from './UnsupportedFeatureNotice';

interface Props {
  layout: PageLayout;
  counts: Partial<Record<Availability, number>>;
  children: ReactNode;
}

const ORDER: Availability[] = ['available', 'in-development', 'coming-soon'];

/** Kepala halaman converter: pengantar, ringkasan status nyata (dihitung dari registry), catatan, dan penjelasan khusus halaman. */
export function ConverterLayout({ layout, counts, children }: Props) {
  return (
    <div className="stack dc-page">
      <p className="muted" style={{ margin: 0 }}>{layout.intro}</p>
      <ul className="dc-summary" aria-label="Ringkasan status fitur">
        {ORDER.filter((a) => counts[a]).map((a) => (
          <li key={a} className={'dc-badge dc-' + a}>{counts[a]} {AVAILABILITY_LABEL[a].toLowerCase()}</li>
        ))}
      </ul>
      <p className="dc-trust" role="note">
        File diproses di perangkatmu dan tidak dikirim ke server. Kartu “Tersedia” bisa dijalankan; baca keterbatasan di detail sebelum menganggap hasilnya identik dengan aplikasi desktop. Kartu lain belum bisa dikonversi.
      </p>
      <UnsupportedFeatureNotice title="Catatan halaman ini" items={layout.notes} />
      {layout.explainer && (
        <section className="dc-explainer" aria-label={layout.explainer.title}>
          <h2>{layout.explainer.title}</h2>
          <dl>
            {layout.explainer.items.map((i) => (
              <div key={i.label}>
                <dt>{i.label}</dt>
                <dd>{i.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {children}
    </div>
  );
}
