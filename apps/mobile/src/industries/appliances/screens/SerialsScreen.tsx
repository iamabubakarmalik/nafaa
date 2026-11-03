/** Serial register (web ApplianceSerialsPage): units on the shelf, sold with customer and warranty, warranties ending soon, units waiting for installation. Needs the server. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Barcode, Boxes, CheckCircle2, HardHat, Plus, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, ChipGroup, EmptyState, ListRow, ListTemplate, Row, StatTile, StatusPill, Text, useTheme } from '@/design';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/trade/desk';
import { applianceSerialApi, asPages, type ApplianceSerial } from '../api';
import { AddSerialsSheet, WarrantyCheckSheet } from '../components/SerialSheets';
import { KEYS, SERIAL_STATUSES, dayOnly, installStatus, serialStatus } from '../meta';

type View_ = 'stock' | 'sold' | 'expiring' | 'install' | 'all';
const VIEWS: Array<{ value: View_; label: string }> = [
  { value: 'stock', label: t('Stock me') }, { value: 'sold', label: t('Bik gaye') }, { value: 'expiring', label: t('Warranty khatam hone wali') }, { value: 'install', label: t('Installation baqi') }, { value: 'all', label: t('Sab') },
];
const viewParams = (v: View_) => (v === 'stock' ? { status: 'IN_STOCK' } : v === 'sold' ? { status: 'SOLD' } : v === 'expiring' ? { warranty: 'expiring' as const } : v === 'install' ? { status: 'SOLD', installationStatus: 'PENDING' } : {});
const LIMIT = 30;

export function SerialsScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('appliancesDesk');
  const { cost } = useCostMask();
  const [view, setView] = useState<View_>('stock');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState(false);
  const q = search.trim();
  const params = { ...viewParams(view), ...(status && view === 'all' ? { status } : {}), search: q || undefined, limit: LIMIT };
  const list = usePaged([KEYS.serial, 'paged', params], (page) => applianceSerialApi.list({ ...params, page }).then(asPages));
  const sum = useQuery({ queryKey: [KEYS.serial, 'summary'], queryFn: () => applianceSerialApi.summary() });
  const s = sum.data;

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Boxes} tone="info" label={t('Stock me')} loading={sum.isLoading} value={String(s?.inStock.units ?? 0)} hint={s ? cost(s.inStock.value) : undefined} onPress={() => setView('stock')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Bik gaye')} loading={sum.isLoading} value={String(s?.sold.units ?? 0)} hint={s ? formatMoney(s.sold.revenue) : undefined} onPress={() => setView('sold')} />
      </Row>
      <Row gap={2}>
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={ShieldAlert} tone={s?.warrantyExpiringSoon ? 'warning' : 'neutral'} label={t('Warranty khatam hone wali')} loading={sum.isLoading} value={String(s?.warrantyExpiringSoon ?? 0)} onPress={() => setView('expiring')} />
        <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={HardHat} tone={s?.installation?.pending ? 'warning' : 'neutral'} label={t('Installation baqi')} loading={sum.isLoading} value={String(s?.installation?.pending ?? 0)} onPress={() => setView('install')} />
      </Row>
      <Button variant="soft" icon={ShieldCheck} onPress={() => setChecking(true)}>{t('Warranty check')}</Button>
      <ChipGroup value={view} onChange={(v) => setView(v as View_)} style={{ marginHorizontal: -th.space(4) }} options={VIEWS} />
      {view === 'all' && <ChipGroup value={status} onChange={setStatus} style={{ marginHorizontal: -th.space(4) }} options={[{ value: '', label: t('Sab halat') }, ...SERIAL_STATUSES.map((x) => ({ value: x, label: serialStatus(x).label }))]} />}
      <OfflineNote feature="appliancesDesk" />
      <CachedNote query={sum} />
    </View>
  );
  return (
    <>
      <ListTemplate<ApplianceSerial>
        title={t('Serial register')} grouped={false}
        search={{ value: search, onChange: setSearch, placeholder: t('Serial, model, customer ya bill…') }}
        summary={header} data={list.items} loading={list.loading} error={list.error} onRetry={list.refetch} refreshing={list.refreshing}
        onRefresh={() => { list.refetch(); void sum.refetch(); }} onEndReached={list.loadMore} keyExtractor={(u) => u.id}
        renderItem={({ item: u }) => {
          const st = serialStatus(u.status);
          const w = u.warranty;
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Barcode} iconTone="neutral" chevron onPress={() => router.push(`/appliances/serials/${u.id}` as never)}
                title={<Row gap={1.5} wrap><Text weight="semibold" ltr style={{ flexShrink: 1 }} numberOfLines={1}>{u.serialNumber}</Text><StatusPill tone={st.tone}>{st.label}</StatusPill></Row>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{[u.product?.name, u.modelNumber, u.shopName].filter(Boolean).join(' · ')}</Text>
                  <Text size="xs" tone="muted" numberOfLines={1}>{u.status === 'SOLD' ? t('{{value}} · bill {{value2}} · {{soldAt}}', { value: u.customerName ?? t('Customer'), value2: u.invoiceNumber ?? '—', soldAt: dayOnly(u.soldAt) }) : u.purchaseDate ? t('Aaya {{date}}', { date: dayOnly(u.purchaseDate) }) : ''}</Text>
                  <Row gap={1} wrap>
                    {u.status === 'SOLD' && w && <Badge tone={w.isUnderWarranty ? ((w.soonestDays ?? 99) <= 30 ? 'warning' : 'success') : 'danger'}>{w.isUnderWarranty ? t('Warranty: {{n}} din', { n: w.soonestDays ?? 0 }) : t('Warranty khatam')}</Badge>}
                    {u.status === 'SOLD' && u.installationRequired && u.installationStatus !== 'COMPLETED' && <Badge tone={installStatus(u.installationStatus).tone}>{installStatus(u.installationStatus).label}</Badge>}
                  </Row>
                </View>} />
            </View>
          );
        }}
        empty={<EmptyState icon={Barcode} title={q ? t('Koi serial nahi mila') : t('Abhi koi serial nahi')} message={t('Naya maal aaye to uske serial yahan jorein — bikne par warranty khud shuru ho jati hai.')} />}
        fab={can(P.ELECTRONICS_SERIALS_MANAGE) ? { icon: Plus, label: t('Serial jorein'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <AddSerialsSheet open={adding} onClose={() => setAdding(false)} />
      <WarrantyCheckSheet open={checking} onClose={() => setChecking(false)} onOpen={(id) => { setChecking(false); router.push(`/appliances/serials/${id}` as never); }} />
    </>
  );
}
