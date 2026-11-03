/**
 * Customer vehicles (web CustomerVehiclesPage): every vehicle that came to the
 * workshop with its owner, visits, money spent and paper dates. A vehicle opens
 * its full service history and reminders, and starts a new job in one tap.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Car, FileWarning, Plus, Star, UserX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { papersDue } from '@nafaa/core/industries/autoparts';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, ChipGroup, EmptyState, ListRow, ListTemplate, Row, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { RowCard, StatGrid } from '../../_shared/trade/kit';
import { customerVehiclesApi, type CustomerVehicle, type VehicleSort, type VehicleView } from '../api';
import { VEHICLE_KEY, dayOnly, vehicleName, vehicleTypeOf } from '../meta';

const LIMIT = 40;
export const PAPER_LABEL = { insurance: 'Insurance', token: 'Token', fitness: 'Fitness' } as const;

export function CustomerVehiclesScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const canEdit = can(P.CUSTOMERS_EDIT);
  const [view, setView] = useState<VehicleView>('all');
  const [sort, setSort] = useState<VehicleSort>('recent');
  const [search, setSearch] = useState('');
  const q = { view, sort, search: search.trim() || undefined, limit: LIMIT };
  const list = usePaged([VEHICLE_KEY, 'page', q], (page) => customerVehiclesApi.page({ ...q, page }).then((r) => ({ ...r, pages: r.totalPages })));
  const stats = useQuery({ queryKey: [VEHICLE_KEY, 'stats'], queryFn: () => customerVehiclesApi.stats() });
  const s = stats.data;

  const views: Array<{ value: VehicleView; label: string }> = [{ value: 'all', label: t('Sab gaariyan') }, { value: 'papers', label: t('Kaghzat khatam hone wale') }, { value: 'regular', label: t('Pakke customer (3+ dafa)') }, { value: 'away', label: t('4 mahine se nahi aaye') }, { value: 'inactive', label: t('Band ki hui') }];
  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Car, tone: 'info', label: t('Sab gaariyan'), loading: stats.isLoading, value: String(s?.total ?? 0), hint: t('Abhi workshop me {{n}}', { n: s?.inShop ?? 0 }), onPress: () => setView('all') },
        { icon: FileWarning, tone: s?.papers ? 'danger' : 'neutral', label: t('Kaghzat'), loading: stats.isLoading, value: String(s?.papers ?? 0), hint: t('30 din me khatam'), onPress: () => setView('papers') },
        { icon: Star, tone: 'warning', label: t('Pakke customer'), loading: stats.isLoading, value: String(s?.regular ?? 0), hint: t('3 ya zyada dafa'), onPress: () => setView('regular') },
        { icon: UserX, tone: 'accent', label: t('Door ho gaye'), loading: stats.isLoading, value: String(s?.away ?? 0), hint: t('4 mahine se nahi aaye — call karein'), onPress: () => setView('away') },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <CachedNote query={stats} />
      <ChipGroup value={view} onChange={(v) => setView(v as VehicleView)} style={{ marginHorizontal: -th.space(4) }} options={views} />
      <ChipGroup value={sort} onChange={(v) => setSort(v as VehicleSort)} style={{ marginHorizontal: -th.space(4) }}
        options={[{ value: 'recent', label: t('Haal me aayi') }, { value: 'visits', label: t('Zyada dafa aayi') }, { value: 'spent', label: t('Zyada kharcha') }, { value: 'name', label: t('Number se') }]} />
    </View>
  );

  return (
    <ListTemplate<CustomerVehicle & { openJobs: number }>
      title={t('Gaariyan')}
      subtitle={t('Har gaari ki service history, kaghzat aur malik — ek jagah')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Gaari number, malik, phone, model, chassis…') }}
      summary={summary}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(v) => v.id}
      renderItem={({ item: v }) => {
        const due = papersDue(v);
        return (
          <RowCard>
            <ListRow
              icon={Car} iconTone="info"
              title={<Row gap={1.5} wrap><Text weight="semibold" ltr>{v.registrationNumber}</Text><Text size="xs" tone="secondary" style={{ flexShrink: 1 }} numberOfLines={1}>{vehicleName(v) || vehicleTypeOf(v.vehicleType)}</Text></Row>}
              subtitle={<View style={{ gap: 3 }}>
                <Row gap={1} wrap>
                  {v.openJobs > 0 ? <Badge tone="accent">{t('Workshop me')}</Badge> : null}
                  {due.map((p) => <Badge key={p.kind} tone="danger">{`${t(PAPER_LABEL[p.kind])} ${p.left < 0 ? t('khatam') : t('{{left}} din', { left: p.left })}`}</Badge>)}
                  {!v.isActive ? <Badge tone="neutral">{t('Band')}</Badge> : null}
                </Row>
                <Text size="xs" tone="secondary" numberOfLines={1}>{[v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') || t('Malik nahi likha')}</Text>
                <Text size="2xs" tone="muted">{v.totalServices ? t('{{totalServices}} dafa aayi · aakhri {{lastServiceAt}}', { totalServices: v.totalServices, lastServiceAt: dayOnly(v.lastServiceAt) }) : t('Abhi tak koi service nahi')}</Text>
              </View>}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatMoney(v.totalSpent)}</Text><Text size="2xs" tone="muted">{t('kul kharcha')}</Text></View>}
              chevron onPress={() => router.push(`/autoparts/vehicles/${v.id}` as never)}
            />
          </RowCard>
        );
      }}
      empty={<EmptyState icon={Car} title={search || view !== 'all' ? t('Is filter me koi gaari nahi') : t('Abhi koi gaari darj nahi')} message={t('Naya job banate hi gaari khud darj ho jati hai. Yahan se bhi darj kar sakte hain.')} />}
      fab={canEdit ? { icon: Plus, label: t('Nayi gaari'), onPress: () => guard(() => router.push('/autoparts/vehicles/new' as never)) } : undefined}
    />
  );
}
