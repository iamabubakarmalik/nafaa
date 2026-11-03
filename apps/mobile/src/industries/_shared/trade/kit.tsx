/**
 * Small pieces shared by the trade packs (carpet, furniture, auto parts):
 * stat tile rows, a bordered row card and the label / value line.
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Row, StatTile, Text, useTheme } from '@/design';

type Tile = Omit<Parameters<typeof StatTile>[0], 'style'>;

/** Stat tiles, two to a row. */
export function StatGrid({ items }: { items: Tile[] }) {
  const th = useTheme();
  const rows: Tile[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: th.space(2) }}>
      {rows.map((r, i) => (
        <Row key={i} gap={2}>
          {r.map((x, j) => <StatTile key={j} style={{ flex: 1, flexBasis: 0, minWidth: 0 }} {...x} />)}
          {r.length === 1 && <View style={{ flex: 1, flexBasis: 0 }} />}
        </Row>
      ))}
    </View>
  );
}

/** Card around one list row (a ListRow goes inside). */
export function RowCard({ children }: { children: ReactNode }) {
  const th = useTheme();
  return (
    <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
      {children}
    </View>
  );
}

/** One muted line made of the non-empty parts. */
export function Meta({ parts, size = 'xs' }: { parts: Array<string | null | undefined | false>; size?: 'xs' | 'sm' }) {
  const s = parts.filter(Boolean).join(' · ');
  return s ? <Text size={size} tone="muted" numberOfLines={1}>{s}</Text> : null;
}

/** Days left (negative: late) text for something due on a date. */
export function dueText(days: number | null, done = false): { text: string; tone: 'danger' | 'muted' | 'warning' } | null {
  if (days === null || done) return null;
  if (days < 0) return { text: t('{{value}} din late', { value: -days }), tone: 'danger' };
  return { text: days === 0 ? t('Aaj dena hai') : t('{{d}} din baqi', { d: days }), tone: days <= 1 ? 'warning' : 'muted' };
}
