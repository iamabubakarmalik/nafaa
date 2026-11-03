/**
 * A sideways-scrolling row of number tiles (StatTile) for list and report
 * headers with more key numbers than fit on one line.
 *
 *   <KpiStrip items={[{ key: 'due', label: t('Baqi'), value: <Amount value={x} weight="bold" /> }]} />
 */

import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { StatusTone } from '../theme/palette';
import { useTheme } from '../theme/ThemeProvider';
import { StatTile } from './StatTile';

export interface KpiItem {
  key: string;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: StatusTone;
  onPress?: () => void;
  loading?: boolean;
}

export function KpiStrip({ items, tileWidth = 156 }: { items: KpiItem[]; tileWidth?: number }) {
  const th = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }}
      contentContainerStyle={{ paddingHorizontal: th.space(4), gap: th.space(2) }}>
      {items.map((k) => (
        <StatTile key={k.key} label={k.label} value={k.value} hint={k.hint} icon={k.icon} tone={k.tone} onPress={k.onPress} loading={k.loading}
          style={{ width: tileWidth }} />
      ))}
    </ScrollView>
  );
}
