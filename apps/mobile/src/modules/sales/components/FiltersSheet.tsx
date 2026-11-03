/** Sales history filters: payment, price, staff, sort and an own date range. */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useOfflineList } from '@/core/offline';
import { Button, ChipGroup, DatePicker, Row, Select, Sheet, Text, useTheme } from '@/design';
import { METHODS } from '@/modules/pos/components/parts';
import { keyOfDate } from '../lib/period';
import { SORTS, TIER_FILTERS } from '../lib/meta';
import type { BillTier, HistorySort } from '../api/history';
import type { useHistory } from '../lib/useHistory';

type H = ReturnType<typeof useHistory>;

export function FiltersSheet({ h, open, onClose }: { h: H; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const sellers = useOfflineList<{ userId: string; name: string }>('seller');
  const day = (k?: string) => (k ? new Date(`${k}T12:00:00+05:00`) : null);
  return (
    <Sheet open={open} onClose={onClose} title={t('Filters')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={() => { h.clear(); h.setPreset('today'); }}>{t('Filter hatayein')}</Button>
        <Button style={{ flex: 1 }} onPress={onClose}>{t('Theek hai')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Apni date')}</Text>
          <Row gap={2}>
            <View style={{ flex: 1 }}>
              <DatePicker label={t('Se')} value={day(h.custom.from)} maximumDate={new Date()}
                onChange={(d) => { h.setCustom({ ...h.custom, from: keyOfDate(d) }); h.setPreset('custom'); }} />
            </View>
            <View style={{ flex: 1 }}>
              <DatePicker label={t('Tak')} value={day(h.custom.to)} maximumDate={new Date()}
                onChange={(d) => { h.setCustom({ ...h.custom, to: keyOfDate(d) }); h.setPreset('custom'); }} />
            </View>
          </Row>
        </View>
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Payment')}</Text>
          <ChipGroup wrap value={h.method ?? 'all'} onChange={(v) => h.setMethod(v === 'all' ? undefined : v)}
            options={[{ value: 'all', label: t('Sab') }, ...METHODS.map((m) => ({ value: m.id, label: t(m.label) }))]} />
        </View>
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Price')}</Text>
          <ChipGroup wrap value={h.tier ?? 'all'} onChange={(v) => h.setTier(v === 'all' ? undefined : (v as BillTier))}
            options={TIER_FILTERS.map((x) => ({ value: x.value, label: t(x.label) }))} />
        </View>
        {(sellers.data?.length ?? 0) > 1 && (
          <Select label={t('Staff')} value={h.staffId ?? ''} onChange={(v) => h.setStaffId(v || undefined)} searchable
            options={[{ value: '', label: t('Sab') }, ...(sellers.data ?? []).map((s) => ({ value: s.userId, label: s.name }))]} />
        )}
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Sort')}</Text>
          <ChipGroup wrap value={h.sort} onChange={(v) => h.setSort(v as HistorySort)} options={SORTS.map((x) => ({ value: x.value, label: t(x.label) }))} />
        </View>
      </View>
    </Sheet>
  );
}
