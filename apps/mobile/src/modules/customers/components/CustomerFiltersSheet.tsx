/** Customer list filters: activity, city, status, sort, birthdays, branch scope. */

import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { Button, ChipGroup, Row, Select, Sheet, Switch, Text, useTheme } from '@/design';
import type { DirectoryActivity, DirectorySort } from '../api/customers';
import { ACTIVITY, SORTS, STATUS } from '../lib/meta';
import type { useDirectory } from '../lib/useDirectory';

type D = ReturnType<typeof useDirectory>;

export function CustomerFiltersSheet({ d, open, onClose, showSort = true }: { d: D; open: boolean; onClose: () => void; showSort?: boolean }) {
  const th = useTheme();
  const shopId = useAuthStore((s) => s.currentShopId);
  const hasShop = !!shopId && shopId !== 'all';
  const cities = d.data?.cities ?? [];
  return (
    <Sheet open={open} onClose={onClose} title={t('Filters')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={d.clear}>{t('Filter hatayein')}</Button>
        <Button style={{ flex: 1 }} onPress={onClose}>{t('Theek hai')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        {!d.offline && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold" tone="secondary">{t('Aamad')}</Text>
            <ChipGroup wrap value={d.f.activity} onChange={(v) => d.set('activity', v as DirectoryActivity)}
              options={ACTIVITY.map((a) => ({ value: a.value, label: t(a.label), count: d.data?.activity[a.value] }))} />
          </View>
        )}
        {cities.length > 0 && (
          <Select label={t('Sheher')} value={d.f.city ?? ''} onChange={(v) => d.set('city', v || undefined)} searchable
            options={[{ value: '', label: t('Har sheher') }, ...cities.map((c) => ({ value: c.name, label: c.name, description: String(c.count) }))]} />
        )}
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Halat')}</Text>
          <ChipGroup value={d.f.status} onChange={(v) => d.set('status', v as 'active' | 'inactive' | 'all')} options={STATUS.map((s) => ({ value: s.value, label: t(s.label) }))} />
        </View>
        {showSort && (
          <View style={{ gap: th.space(2) }}>
            <Text size="sm" weight="semibold" tone="secondary">{t('Sort')}</Text>
            <ChipGroup wrap value={d.f.sort} onChange={(v) => d.set('sort', v as DirectorySort)} options={SORTS.map((s) => ({ value: s.value, label: t(s.label) }))} />
          </View>
        )}
        {!d.offline && <Switch value={!!d.f.birthday} onChange={(on) => d.set('birthday', on ? 'month' : undefined)} label={t('Is mahine salgirah')} />}
        {hasShop && <Switch value={d.f.scope === 'all'} onChange={(on) => d.set('scope', on ? 'all' : undefined)} label={t('Saari branches ke customers')} />}
      </View>
    </Sheet>
  );
}
