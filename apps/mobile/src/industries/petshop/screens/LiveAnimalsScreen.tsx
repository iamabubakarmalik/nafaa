/**
 * Live animals (web LiveAnimalsPage): every puppy, kitten, bird or fish for
 * sale with its health, cage and price; on sale, sold, all, and analytics.
 * Animals are sold at the counter (their card is on the POS). Needs the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, HeartPulse, PawPrint, Plus, Skull, Tag, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import { daysInShop, LONG_STAY_DAYS } from '@nafaa/core/industries/petshop';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Card, ChipGroup, EmptyState, HBarList, ListRow, ListTemplate, Row, Segmented, Skeleton, StatTile, Text, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { PERIOD_PRESETS, usePeriod } from '@/modules/sales/lib/period';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { liveAnimalsApi, type LiveAnimal } from '../api';
import { ANIMAL_STATUS, PET_KEYS, ageText, speciesEmoji, speciesLabel, speciesOptions } from '../meta';

type Tab = 'ON_SALE' | 'SOLD' | 'all' | 'analytics';
const LIMIT = 24;

export function AnimalThumb({ a, size = 56 }: { a: Pick<LiveAnimal, 'imageUrls' | 'species'>; size?: number }) {
  const th = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: th.radius('lg'), overflow: 'hidden', backgroundColor: th.colors.warning.soft, alignItems: 'center', justifyContent: 'center' }}>
      {a.imageUrls?.[0] ? <Image source={{ uri: a.imageUrls[0] }} style={{ width: size, height: size }} /> : <Text style={{ fontSize: size * 0.5 }}>{speciesEmoji(a.species)}</Text>}
    </View>
  );
}

export function LiveAnimalsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('petshopAnimals');
  const { cost, costHidden } = useCostMask();
  const [tab, setTab] = useState<Tab>('ON_SALE');
  const { q: openWith } = useLocalSearchParams<{ q?: string }>();
  const [search, setSearch] = useState(openWith ?? '');
  const [species, setSpecies] = useState('');
  const [vacc, setVacc] = useState('');
  const per = usePeriod('month');

  const params = { search: search.trim() || undefined, species: species || undefined, limit: LIMIT, status: tab === 'ON_SALE' || tab === 'SOLD' ? tab : undefined, vaccinated: vacc === '' ? undefined : vacc === 'true' };
  const list = usePaged([PET_KEYS.animals, 'paged', params], (page) => liveAnimalsApi.paged({ ...params, page }).then((r) => ({ ...r, pages: Math.max(Math.ceil(r.total / LIMIT), 1) })), tab !== 'analytics');
  const sum = useQuery({ queryKey: [PET_KEYS.animals, 'summary'], queryFn: () => liveAnimalsApi.summary() });
  const noVacc = useQuery({ queryKey: [PET_KEYS.animals, 'no-vaccine'], queryFn: () => liveAnimalsApi.paged({ status: 'ON_SALE', vaccinated: false, limit: 1 }) });
  const ana = useQuery({ queryKey: [PET_KEYS.animals, 'analytics', per.period], queryFn: () => liveAnimalsApi.analytics(per.period), enabled: tab === 'analytics' });
  const s = sum.data;
  const today = useMemo(() => todayKey(), []);

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={PawPrint} tone="success" label={t('Bikne ke liye')} loading={sum.isLoading} value={String((s?.available ?? 0) + (s?.reserved ?? 0))} hint={s?.reserved ? t('{{count}} rok liye', { count: s.reserved }) : undefined} onPress={() => setTab('ON_SALE')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HeartPulse} tone={noVacc.data?.total ? 'danger' : 'neutral'} label={t('Vaccine baqi')} loading={noVacc.isLoading} value={String(noVacc.data?.total ?? 0)} onPress={() => { setTab('ON_SALE'); setVacc('false'); }} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="info" label={t('Is mahine bike')} loading={sum.isLoading} value={String(s?.monthly.count ?? 0)} hint={formatMoney(s?.monthly.revenue ?? 0)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="accent" label={t('Stock ka rate')} loading={sum.isLoading} value={formatMoney(s?.inventoryValue ?? 0)} hint={costHidden ? undefined : t('Cost {{cost}}', { cost: cost(s?.inventoryCost) })} />
      </Row>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'ON_SALE', label: t('Bikne ke liye') }, { value: 'SOLD', label: t('Bik gaye') }, { value: 'all', label: t('Sab') }, { value: 'analytics', label: t('Analytics') }]} />
      {tab !== 'analytics' && (
        <>
          <ChipGroup value={species} onChange={setSpecies} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab janwar') }, ...speciesOptions().map((o) => ({ ...o, label: o.label }))]} />
          <ChipGroup value={vacc} onChange={setVacc} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab') }, { value: 'true', label: t('Vaccine lagi') }, { value: 'false', label: t('Vaccine baqi') }]} />
        </>
      )}
      {tab === 'analytics' && <ChipGroup value={per.preset} onChange={(v) => per.setPreset(v as typeof per.preset)} style={{ marginHorizontal: -th.space(4) }} options={PERIOD_PRESETS.filter((p) => p.value !== 'all').map((p) => ({ value: p.value, label: t(p.label) }))} />}
      <OfflineNote feature="petshopAnimals" />
      <CachedNote query={sum} />
      {tab === 'analytics' && <Analytics data={ana.data} loading={ana.isLoading} />}
    </View>
  );

  return (
    <ListTemplate<LiveAnimal>
      title={t('Live animals')}
      grouped={false}
      search={tab !== 'analytics' ? { value: search, onChange: setSearch, placeholder: t('Number, naam, nasal, rang ya cage…') } : undefined}
      summary={header}
      data={tab === 'analytics' ? [] : list.items}
      loading={tab !== 'analytics' && list.loading}
      error={tab !== 'analytics' ? list.error : undefined}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void sum.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(a) => a.id}
      renderItem={({ item: a }) => {
        const days = daysInShop(a.acquiredDate, today);
        const st = ANIMAL_STATUS[a.status];
        return (
          <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
            <ListRow
              leading={<AnimalThumb a={a} />}
              title={<Row gap={1.5} wrap><Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>{a.name || a.breed || speciesLabel(a.species)}</Text><Badge tone={st.tone}>{t(st.label)}</Badge></Row>}
              subtitle={<View style={{ gap: 4 }}>
                <Text size="xs" tone="muted" numberOfLines={1}>{[a.animalNumber, a.breed, a.gender, ageText(a.ageMonths)].filter(Boolean).join(' · ')}</Text>
                <Row gap={1} wrap>
                  <Badge tone={a.isVaccinated ? 'success' : 'danger'}>{a.isVaccinated ? t('Vaccine') : t('Vaccine nahi')}</Badge>
                  {a.isDewormed && <Badge tone="success">{t('Deworm')}</Badge>}
                  {!!a.currentCage && <Badge tone="neutral">{t('Cage {{currentCage}}', { currentCage: a.currentCage })}</Badge>}
                  {days !== null && days > LONG_STAY_DAYS && a.status === 'AVAILABLE' && <Badge tone="warning">{t('{{days}} din se', { days })}</Badge>}
                </Row>
              </View>}
              trailing={<Amount value={a.status === 'SOLD' ? a.soldPrice ?? a.askingPrice : a.askingPrice} weight="bold" />}
              chevron
              onPress={() => router.push(`/petshop/live-animals/${a.id}` as never)}
            />
          </View>
        );
      }}
      empty={tab === 'analytics' ? undefined : <EmptyState icon={PawPrint} title={search || species || vacc ? t('Is filter me koi janwar nahi') : t('Abhi koi janwar darj nahi')} message={t('Puppy, kitten, tota ya machhli — har janwar ka record banayein, counter par uska card aa jayega.')} />}
      fab={can(P.PRODUCTS_CREATE) ? { icon: Plus, label: t('Naya janwar'), onPress: () => guard(() => router.push('/petshop/live-animals/new' as never)) } : undefined}
    />
  );
}

function Analytics({ data, loading }: { data?: import('../api').AnimalAnalytics; loading: boolean }) {
  const th = useTheme();
  const { cost, costHidden } = useCostMask();
  if (loading || !data) return <Skeleton height={200} />;
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Bike')} value={String(data.sold)} hint={data.avgDaysToSell !== null ? t('Aam taur par {{avgDaysToSell}} din me', { avgDaysToSell: data.avgDaysToSell }) : undefined} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="info" label={t('Sale')} value={formatMoney(data.revenue)} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Tag} tone="accent" label={t('Profit (cost ke baad)')} value={cost(data.profit)} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Skull} tone="danger" label={t('Mare / loss')} value={String(data.deaths)} hint={costHidden ? undefined : cost(data.deathLoss)} />
      </Row>
      {data.bySpecies.length > 0 && <Card title={t('Kaun se janwar bike')}><HBarList colorful rows={data.bySpecies.map((r) => ({ key: r.species, label: speciesLabel(r.species), value: r.revenue, display: <Text size="xs" tone="muted">{`${r.sold} · ${formatMoney(r.revenue)}`}</Text> }))} /></Card>}
      {data.inStock.length > 0 && <Card title={t('Abhi stock me (rate)')}><HBarList colorful rows={data.inStock.map((r) => ({ key: r.species, label: speciesLabel(r.species), value: r.value, display: <Text size="xs" tone="muted">{`${r.count} · ${formatMoney(r.value)}`}</Text> }))} /></Card>}
    </View>
  );
}
