/**
 * Choose a table for a dine-in order, section by section (web
 * TablePickerModal). A free or reserved table can be taken; a busy one
 * offers to add to its running order instead of opening a second bill.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { ChipGroup, EmptyState, Sheet, Skeleton, useLayout, useTheme } from '@/design';
import { tablesApi, type FloorTable } from '../api';
import { FLOOR_KEY } from '../meta';
import { TableTile } from './TableTile';

export function TablePickerSheet({ open, value, onPick, onOpenOrder, onClose }: {
  open: boolean;
  value?: string | null;
  onPick: (t: FloorTable) => void;
  /** A busy table was chosen: add to the order already on it. */
  onOpenOrder?: (orderId: string) => void;
  onClose: () => void;
}) {
  const th = useTheme();
  const { isTablet } = useLayout();
  const { data, isLoading } = useQuery({ queryKey: [FLOOR_KEY], queryFn: () => tablesApi.floor(), refetchInterval: 20_000, enabled: open });
  const [section, setSection] = useState('all');
  const tables = useMemo(() => (data?.tables ?? []).filter((x) => section === 'all' || (x.section || 'Main') === section), [data, section]);
  const width = isTablet ? '23.5%' : '31.5%';

  return (
    <Sheet open={open} onClose={onClose} height={0.85} title={t('Table chunein')} description={t('Hari table khaali hai · laal par order chal raha hai')}>
      <View style={{ gap: th.space(3) }}>
        {(data?.sections.length ?? 0) > 1 && (
          <ChipGroup value={section} onChange={setSection} style={{ marginHorizontal: -th.space(4) }}
            options={[{ value: 'all', label: t('Sab') }, ...(data?.sections ?? []).map((s) => ({ value: s, label: s }))]} />
        )}
        {isLoading ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>{Array.from({ length: 9 }, (_, i) => <Skeleton key={i} width={width} height={104} radius={th.radius('xl')} />)}</View>
        ) : !tables.length ? (
          <EmptyState title={t('Abhi koi table nahi. Tables ke safhe par "Floor setup" se banayein.')} />
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {tables.map((tb) => {
              const busy = tb.liveStatus === 'OCCUPIED' && !!tb.currentOrder;
              return (
                <TableTile key={tb.id} table={tb} compact width={width} selected={value === tb.id}
                  onPress={() => {
                    if (tb.liveStatus === 'OUT_OF_SERVICE') return;
                    if (busy && tb.currentOrder && onOpenOrder) onOpenOrder(tb.currentOrder.id);
                    else onPick(tb);
                  }} />
              );
            })}
          </View>
        )}
      </View>
    </Sheet>
  );
}
