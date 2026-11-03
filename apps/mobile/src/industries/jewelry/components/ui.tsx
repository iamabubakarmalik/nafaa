/** Small pieces the jewelry screens share: karat chips and badge, status pill, a "load more" footer. */

import { COMMON_PURITIES, type Purity } from '@nafaa/core/industries/jewelry';
import { t } from '@/core/i18n';
import { View } from 'react-native';
import { Badge, ChipGroup, StatusPill, Text, useTheme } from '@/design';
import { orderStatus, purityLabel } from '../meta';

export function PurityPicker({ value, onChange, label, purities = COMMON_PURITIES }: { value: string; onChange: (p: Purity) => void; label?: string; purities?: Purity[] }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(1.5) }}>
      {label && <Text size="sm" weight="medium" tone="secondary">{label}</Text>}
      <ChipGroup wrap value={value} onChange={(v) => onChange(v as Purity)} options={purities.map((p) => ({ value: p, label: purityLabel(p) }))} />
    </View>
  );
}

/** Karat badge: gold karats in amber, silver in grey. */
export function KaratBadge({ purity }: { purity?: string | null }) {
  const silver = !!purity && (purity.startsWith('SILVER') || purity.startsWith('STERLING'));
  return <Badge tone={silver ? 'neutral' : 'warning'}>{purityLabel(purity)}</Badge>;
}

export function OrderStatusPill({ status }: { status: string }) {
  const s = orderStatus(status);
  return <StatusPill tone={s.tone}>{t(s.label)}</StatusPill>;
}
