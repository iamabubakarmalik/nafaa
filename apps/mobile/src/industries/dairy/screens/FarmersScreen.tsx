/** Milk suppliers / gawale (web FarmersPage): who sells milk, the rate, what is owed to them and the last supply. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Milk, Plus, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { FarmerFormSheet } from '../components/FarmerSheets';
import { farmersApi } from '../api';
import { CYCLE, DAIRY_KEYS } from '../meta';

type Tab = 'active' | 'owing' | 'off' | 'all';

export function DairyFarmersScreen() {
  const th = useTheme();
  const canEdit = usePermission()(P.SUPPLIERS_EDIT);
  const { guard } = useDeskOnline('dairyDesk');
  const { cost } = useCostMask();
  const [tab, setTab] = useState<Tab>('active');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'all'], queryFn: () => farmersApi.all({}) });
  const sum = useQuery({ queryKey: [DAIRY_KEYS.farmers, 'summary'], queryFn: () => farmersApi.totals() });
  const all = q.data ?? [];
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((f) => (tab === 'all' ? true : tab === 'active' ? f.isActive : tab === 'off' ? !f.isActive : f.currentBalance > 0) && (!s || [f.name, f.farmerNumber, f.phone, f.village].join(' ').toLowerCase().includes(s)));
  }, [all, tab, search]);
  const x = sum.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Milk, tone: 'info', label: t('Chalu gawale'), loading: sum.isLoading, value: String(x?.activeFarmers ?? 0) },
        { icon: Wallet, tone: 'danger', label: t('Dena hai'), loading: sum.isLoading, value: cost(x?.totalPayable ?? 0) },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as Tab)} style={{ marginHorizontal: -th.space(4) }} options={[{ value: 'active', label: t('Chalu') }, { value: 'owing', label: t('Dena hai') }, { value: 'off', label: t('Band') }, { value: 'all', label: t('Sab') }]} />
      <OfflineNote feature="dairyDesk" />
      <CachedNote query={q} />
    </View>
  );

  return (
    <>
      <ListTemplate
        title={t('Milk suppliers')}
        grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Gawale ka naam, number ya gaon…') }}
        summary={header}
        data={rows}
        loading={q.isLoading}
        error={q.data ? null : q.error}
        onRetry={() => void q.refetch()}
        refreshing={q.isRefetching}
        onRefresh={() => { void q.refetch(); void sum.refetch(); }}
        keyExtractor={(f) => f.id}
        renderItem={({ item: f }) => (
          <RowCard dim={!f.isActive}>
            <ListRow icon={Milk} iconTone={f.isActive ? 'info' : 'neutral'}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{f.name}</Text>{!f.isActive && <Badge tone="neutral">{t('Band')}</Badge>}</Row>}
              subtitle={<View style={{ gap: 2 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[f.farmerNumber, f.village].filter(Boolean).join(' · ')}</Text>
                <Text size="xs" tone="secondary" numberOfLines={1}>{`${t('Rate')} ${f.ratePerLiter}/L · ${t(CYCLE[f.paymentCycle] ?? f.paymentCycle)}${f.lastSupplyDate ? ` · ${formatDate(f.lastSupplyDate)}` : ''}`}</Text>
              </View>}
              trailing={f.currentBalance > 0 ? <Amount value={f.currentBalance} weight="bold" tone="danger" /> : <Text size="xs" tone="muted">{t('Hisaab saaf')}</Text>}
              chevron onPress={() => router.push(`/dairy/farmers/${f.id}` as never)} />
          </RowCard>
        )}
        empty={<EmptyState icon={Milk} title={search ? t('Koi gawala nahi mila') : t('Abhi koi gawala nahi')} message={t('Jin se doodh lete hain unhe yahan jorein — rate, fat bonus aur hisaab ek jagah.')} />}
        fab={canEdit ? { icon: Plus, label: t('Naya gawala'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <FarmerFormSheet farmer={null} open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
