/**
 * Held (parked) bills on this phone: resume one (the bill on the counter is
 * held in its place) or delete it. Held bills stay on the phone only.
 */

import { PauseCircle, PlayCircle, Trash2 } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, View } from 'react-native';
import { billTotals } from '@nafaa/core/pos';
import { formatRelative } from '@/core/format';
import { t } from '@/core/i18n';
import { offline, type HeldBill } from '@/core/offline';
import { Amount, EmptyState, IconButton, ListRow, Sheet, Text, confirm, useTheme } from '@/design';
import type { HeldBillData } from '../engine/bill';
import { closeSheet, usePos, usePosUi } from '../engine/usePos';

export const HELD_KEY = ['offline', 'pos', 'held'];

export function useHeldBills(shopId: string | null) {
  return useQuery({
    queryKey: [...HELD_KEY, shopId],
    queryFn: () => offline.heldBills.list<HeldBillData>(shopId),
    networkMode: 'always',
    staleTime: 0,
  });
}

const totalOf = (b: HeldBillData) => billTotals({ lines: b.lines, discountMode: b.discountMode, discountPct: b.discountPct, discountRs: b.discountRs }).total;

export function HeldSheet() {
  const th = useTheme();
  const api = usePos();
  const qc = useQueryClient();
  const open = usePosUi((s) => s.sheet === 'held');
  const { data = [] } = useHeldBills(api.shopId);
  const refresh = () => qc.invalidateQueries({ queryKey: HELD_KEY });

  const resume = async (h: HeldBill<HeldBillData>) => {
    await api.resume(h);
    refresh();
    closeSheet();
  };
  const remove = async (h: HeldBill<HeldBillData>) => {
    if (!(await confirm({ title: t('Delete this held bill?'), tone: 'danger', confirmLabel: t('Delete') }))) return;
    await offline.heldBills.remove(h.id);
    refresh();
  };

  return (
    <Sheet open={open} onClose={closeSheet} title={t('Held bills')} height={0.7} scrollable={false}>
      <FlatList
        data={data}
        keyExtractor={(h) => h.id}
        style={{ flex: 1 }}
        ListEmptyComponent={<EmptyState compact icon={PauseCircle} title={t('No held bills')} message={t('Tap Hold on a bill to park it and serve the next customer.')} />}
        renderItem={({ item: h }) => (
          <ListRow
            icon={PlayCircle}
            title={h.label || h.data.customer?.name || t('Walk-in customer')}
            subtitle={`${t('{{count}} items', { count: h.data.lines.length })} · ${formatRelative(h.createdAt)}`}
            trailing={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                <Amount value={totalOf(h.data)} weight="bold" />
                <IconButton icon={Trash2} label={t('Delete')} variant="ghost" color={th.colors.danger.text} onPress={() => void remove(h)} />
              </View>
            }
            onPress={() => void resume(h)}
          />
        )}
      />
      <Text size="xs" tone="muted" align="center" style={{ padding: th.space(3) }}>{t('Held bills stay on this phone.')}</Text>
    </Sheet>
  );
}
