/**
 * Farmers (web FarmersPage): every farmer's live udhaar from the customer
 * khata, split into what is due because the season's harvest has passed and
 * what is still within the season. Tabs, search, payments and the farmer's
 * own page. Needs the server; the last loaded list shows offline.
 */

import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Plus, Tractor, Users, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, ChipGroup, EmptyState, HBarList, ListRow, ListTemplate, Row, Segmented, SwipeRow, Text, Card, toast, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { PaySheet, OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatRow } from '../../_shared/farm/ui';
import { farmersApi, type Farmer, type FarmerTab } from '../api';
import { AGRI_KEYS, FARMER_STATUS, refreshAgri } from '../meta';

type View_ = FarmerTab | 'analytics';
const LIMIT = 25;
const SORTS = [{ value: 'name', label: t('Naam') }, { value: 'owed', label: t('Udhaar') }, { value: 'due', label: t('Late') }, { value: 'new', label: t('Naye') }, { value: 'land', label: t('Zameen') }];

export function FarmersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('agriDesk');
  const { cost } = useCostMask();
  const qc = useQueryClient();
  const [tab, setTab] = useState<View_>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [paying, setPaying] = useState<Farmer | null>(null);
  const params = { search: search.trim() || undefined, tab: tab === 'analytics' ? 'all' : tab, sort, limit: LIMIT };
  const list = usePaged([AGRI_KEYS.farmers, 'paged', params], (page) => farmersApi.page({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })));
  const first = list.first;
  const stats = first?.stats;
  const owedOf = (f: Farmer) => Number(f.currentBalance || 0);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <StatRow tiles={[
        { icon: Users, tone: 'info', label: t('Farmers'), loading: list.loading, value: String(stats?.farmers ?? 0), hint: stats?.acres ? t('{{count}} acre', { count: Math.round(stats.acres) }) : undefined },
        { icon: Wallet, tone: 'danger', label: t('Kul udhaar'), loading: list.loading, value: cost(stats?.owed ?? 0) },
      ]} />
      <StatRow tiles={[
        { icon: AlertTriangle, tone: (stats?.dueNow ?? 0) > 0 ? 'danger' : 'neutral', label: t('Katai guzar gayi'), loading: list.loading, value: cost(stats?.dueNow ?? 0), onPress: () => setTab('due') },
        { icon: Tractor, tone: 'success', label: t('Season ke andar'), loading: list.loading, value: cost(stats?.notDue ?? 0) },
      ]} />
      <ChipGroup value={tab} onChange={(v) => setTab(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={[
        { value: 'all', label: t('Sab') }, { value: 'owing', label: `${t('Udhaar')}${first?.counts.owing ? ` · ${first.counts.owing}` : ''}` },
        { value: 'due', label: `${t('Wasooli')}${first?.counts.due ? ` · ${first.counts.due}` : ''}` }, { value: 'over', label: `${t('Had se upar')}${first?.counts.over ? ` · ${first.counts.over}` : ''}` },
        { value: 'suspended', label: `${t('Roka')}${first?.counts.suspended ? ` · ${first.counts.suspended}` : ''}` }, { value: 'analytics', label: t('Analytics') },
      ]} />
      {tab !== 'analytics' && <Segmented value={sort} onChange={setSort} options={SORTS} />}
      <OfflineNote feature="agriDesk" />
      <CachedNote query={{ dataUpdatedAt: qc.getQueryState([AGRI_KEYS.farmers, 'paged', params])?.dataUpdatedAt ?? 0 }} />
      {tab === 'analytics' && first && (
        <View style={{ gap: th.space(3) }}>
          {first.analytics.crops.length > 0 && <Card title={t('Kaun si fasal')}><HBarList colorful rows={first.analytics.crops.slice(0, 8).map((c) => ({ key: c.name, label: c.name, value: c.count, display: <Text size="xs" tone="muted">{String(c.count)}</Text> }))} /></Card>}
          {first.analytics.districts.length > 0 && <Card title={t('Zila')}><HBarList colorful rows={first.analytics.districts.slice(0, 8).map((c) => ({ key: c.name, label: c.name, value: c.count, display: <Text size="xs" tone="muted">{String(c.count)}</Text> }))} /></Card>}
          {first.analytics.seasons.length > 0 && <Card title={t('Season ka khata')}><HBarList colorful rows={first.analytics.seasons.map((s) => ({ key: s.key, label: s.label, value: s.owed, display: <Text size="xs" tone={s.due ? 'danger' : 'muted'}>{formatMoney(s.owed)}</Text> }))} /></Card>}
        </View>
      )}
    </View>
  );

  return (
    <>
      <ListTemplate<Farmer>
        title={t('Farmers')}
        grouped={false}
        search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Naam, phone, CNIC ya gaon…') } : undefined}
        summary={header}
        data={tab === 'analytics' ? [] : list.items}
        loading={tab !== 'analytics' && list.loading}
        error={list.error}
        onRetry={list.refetch}
        refreshing={list.refreshing}
        onRefresh={list.refetch}
        onEndReached={list.loadMore}
        keyExtractor={(f) => f.id}
        renderItem={({ item: f }) => {
          const owed = owedOf(f);
          const st = FARMER_STATUS[f.status];
          const row = (
            <RowCard dim={!f.isActive}>
              <ListRow icon={Tractor} iconTone={f.overLimit || (f.dueNow ?? 0) > 0 ? 'danger' : 'success'}
                title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{f.fullName}</Text>{f.status !== 'ACTIVE' && st && <Badge tone={st.tone}>{t(st.label)}</Badge>}</Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[f.farmerNumber, f.village, f.district].filter(Boolean).join(' · ')}</Text>
                  <Text size="xs" tone="secondary" numberOfLines={1}>{[f.landAreaAcres ? t('{{count}} acre', { count: f.landAreaAcres }) : '', (f.primaryCrops ?? []).slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</Text>
                  {(f.dueNow ?? 0) > 0 && <Text size="xs" tone="danger">{t('{{due}} katai guzar gayi', { due: formatMoney(f.dueNow) })}</Text>}
                  {f.overLimit && <Text size="xs" tone="danger">{t('Had se upar')}</Text>}
                </View>}
                trailing={<View style={{ alignItems: 'flex-end' }}>{owed > 0 ? <Amount value={owed} weight="bold" tone="danger" /> : <Text size="xs" tone="muted">{t('Udhaar nahi')}</Text>}{(f.advance ?? 0) > 0 && <Text size="2xs" tone="success">{t('advance {{advance}}', { advance: formatMoney(f.advance) })}</Text>}</View>}
                chevron onPress={() => router.push(`/agri/farmers/${f.id}` as never)} />
            </RowCard>
          );
          return can(P.AGRI_FARMERS_MANAGE) && owed > 0 && f.khataLinked !== false
            ? <SwipeRow end={[{ icon: Wallet, label: t('Wasool'), tone: 'success', onPress: () => guard(() => setPaying(f)) }]}>{row}</SwipeRow>
            : row;
        }}
        empty={tab === 'analytics' ? undefined : <EmptyState icon={Tractor} title={search ? t('Koi farmer nahi mila') : t('Abhi koi farmer nahi')} message={t('Farmer jorein — gaon, zameen aur season ka udhaar ek jagah.')} />}
        fab={can(P.AGRI_FARMERS_MANAGE) ? { icon: Plus, label: t('Naya farmer'), onPress: () => guard(() => router.push('/agri/farmers/new' as never)) } : undefined}
      />
      <PaySheet open={!!paying} title={paying ? t('{{fullName}} se wasooli', { fullName: paying.fullName }) : ''} name={paying?.fullName ?? ''} due={paying ? owedOf(paying) : 0} advance cta={t('Wasool karein')}
        onConfirm={async ({ paymentMethod, paidAmount }) => {
          await farmersApi.payment(paying!.id, { amount: paidAmount, paymentMethod });
          refreshAgri([AGRI_KEYS.farmers, AGRI_KEYS.farmer], true);
          toast.success(t('{{amount}} wasool — khate me likh diya', { amount: formatMoney(paidAmount) }));
        }}
        onClose={() => setPaying(null)} />
    </>
  );
}
