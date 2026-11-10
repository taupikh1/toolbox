import type { Availability, SupportTier } from '../types/conversion';
import { AVAILABILITY_LABEL } from '../registry/conversion-registry';

const TIER_HINT: Record<SupportTier, string> = {
  A: 'Tier A (target hasil teruji, sementara)',
  B: 'Tier B (ada keterbatasan)',
  C: 'Tier C (tidak didukung)',
};

export function ConversionStatus({ availability, tier }: { availability: Availability; tier?: SupportTier }) {
  return (
    <span className="dc-badges">
      <span className={'dc-badge dc-' + availability}>{AVAILABILITY_LABEL[availability]}</span>
      {tier && <span className="dc-badge dc-tier" title={TIER_HINT[tier]}>Tier {tier}</span>}
    </span>
  );
}
