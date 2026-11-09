/**
 * The board's status tiles as one horizontal row: icon, name and count for
 * every status (custom stages last). Tapping a tile shows its orders.
 */

import { memo, useEffect, useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/i18n';
import { Icon, PressableScale, Skeleton, Text, useTheme } from '@/design';
import type { CustomStage } from '../../api/board';
import { TILES, boardEntry, type BoardEntry } from '../../lib/board';
import { entryLabel } from '../../hooks/useMoveOrder';

export const BoardTiles = memo(function BoardTiles({ value, counts, custom, onChange }: {
  value: string; counts?: Record<string, number>; custom: CustomStage[]; onChange: (key: string) => void;
}) {
  const th = useTheme();
  const ref = useRef<ScrollView>(null);
  const tiles: BoardEntry[] = [...TILES, ...custom.map((c) => boardEntry(`custom:${c.key}`, custom)!)];
  const index = tiles.findIndex((x) => x.key === value);
  // Keep the picked tile in view when it was chosen from elsewhere (home, Status sheet).
  useEffect(() => { if (index > 2) ref.current?.scrollTo({ x: Math.max(0, index * 112 - 60), animated: true }); }, [index]);

  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -th.space(4) }}
      contentContainerStyle={{ paddingHorizontal: th.space(4), gap: th.space(2) }}>
      {tiles.map((e) => {
        const on = e.key === value;
        const n = counts?.[e.key];
        const c = th.colors[e.tone];
        return (
          <PressableScale key={e.key} onPress={() => onChange(e.key)} haptic="select" accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={`${entryLabel(e, e.key)} ${n ?? ''}`}
            style={{
              width: 104, padding: th.space(2.5), gap: th.space(1), borderRadius: th.radius('lg'), borderWidth: on ? 2 : 1,
              borderColor: on ? c.solid : th.colors.border, backgroundColor: on ? c.soft : th.colors.surface,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ width: 26, height: 26, borderRadius: th.radius('sm'), alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft }}>
                <Icon icon={e.icon} size={14} color={c.text} />
              </View>
              {counts ? <Text size="lg" weight="bold" ltr style={{ opacity: n ? 1 : 0.45 }}>{e.key === 'ALL' && n === undefined ? '' : n ?? 0}</Text> : <Skeleton width={18} height={16} />}
            </View>
            <Text size="xs" weight="semibold" numberOfLines={1}>{entryLabel(e, e.key)}</Text>
            <Text size="2xs" tone="muted" numberOfLines={1}>{t(e.hint)}</Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
});
