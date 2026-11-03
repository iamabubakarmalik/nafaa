/**
 * Serial / IMEI register (web SerialTrackingPage). Every costly unit (TV,
 * laptop, camera) has its own row: when it came, at what cost, who bought it,
 * and how long its warranty runs. A second tab answers "is this unit under
 * warranty?" for the customer at the counter.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Barcode, Plus, Recycle, ScanLine, Search, Shield, Trash2, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { warrantyVerdict, daysLeft } from '@nafaa/core/industries/electronics';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, ChipGroup, DetailRow, EmptyState, IconButton, Input, ListRow, ListTemplate, Row, Screen, Segmented, Sheet, StatTile, SwipeRow, Text, confirm, toast, useDebouncedValue, useTheme } from '@/design';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { MetaPill } from '../../mobile/components/kit';
import { serialTrackingApi, type SerialPage, type SerialSort, type SerialView, type WarrantyCheck } from '../api';
import { AddUnitsSheet, EditUnitSheet, TradeInSheet } from '../components/UnitSheets';
import { SERIAL_KEYS, metaText, refreshElectronics, serialStatusOf, warrantyStatusOf } from '../meta';

type Row2 = SerialPage['items'][number];
const VIEWS: Array<{ value: SerialView; label: string }> = [
  { value: 'all', label: t('Sab units') }, { value: 'stock', label: t('Stock mein') }, { value: 'sold', label: t('Bik gaye') }, { value: 'warranty', label: t('Warranty chal rahi') },
  { value: 'expiring', label: t('30 din mein khatam') }, { value: 'problem', label: t('Kharab / gum') }, { value: 'tradein', label: t('Trade-in') },
];
const SORTS: Array<{ value: SerialSort; label: string }> = [{ value: 'new', label: t('Taaza pehle') }, { value: 'old', label: t('Purane pehle') }, { value: 'warranty', label: t('Warranty pehle khatam') }, { value: 'cost', label: t('Mehnge pehle') }];

export function SerialsScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ product?: string; q?: string }>();
  const can = usePermission();
  const canManage = can(P.ELECTRONICS_SERIALS_MANAGE);
  const canTradeIn = can(P.PURCHASES_CREATE) && canManage;
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('electronicsDesk');
  const [tab, setTab] = useState<'register' | 'check'>('register');
  const [view, setView] = useState<SerialView>('all');
  const [sort, setSort] = useState<SerialSort>('new');
  const [search, setSearch] = useState(params.q ?? '');
  const query = useDebouncedValue(search.trim(), 250);
  const [adding, setAdding] = useState(false);
  const [trade, setTrade] = useState(false);
  const [edit, setEdit] = useState<Row2 | null>(null);
  const [open, setOpen] = useState<Row2 | null>(null);
  const q = { view, sort, search: query || undefined, productId: params.product, page: 1, limit: 60 };
  const list = useQuery({ queryKey: ['electronics-serials', 'page', q], queryFn: () => serialTrackingApi.page(q), placeholderData: (p) => p, enabled: tab === 'register' });
  const c = list.data?.counts;
  const remove = async (s: Row2) => {
    if (!(await confirm({ title: t('{{serialNumber}} hata dein?', { serialNumber: s.serialNumber }), message: t('Sirf ghalti se darj unit hatayein.'), tone: 'danger', confirmLabel: t('Hatayein') }))) return;
    try { await serialTrackingApi.remove(s.id); toast.success(t('Unit hata diya')); refreshElectronics(SERIAL_KEYS); setOpen(null); } catch (e) { toast.error(apiErrorMessage(e, t('Hataya nahi ja saka'))); }
  };
  const removable = (s: Row2) => canManage && s.status === 'IN_STOCK' && !s.saleId && !s.soldAt && !s.claims.length && !s.supplierRef?.startsWith('TI-');

  if (tab === 'check') return (
    <Screen title={t('Serial / IMEI')}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={tab} onChange={setTab} options={[{ value: 'register', label: t('Register') }, { value: 'check', label: t('Warranty check') }]} />
        <WarrantyChecker />
      </View>
    </Screen>
  );

  const header = (
    <View style={{ gap: th.space(3) }}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'register', label: t('Register') }, { value: 'check', label: t('Warranty check') }]} />
      <Row gap={2}>
        <StatTile style={{ flex: 1 }} icon={Barcode} tone="success" label={t('Stock mein')} loading={list.isLoading} value={String(c?.stock ?? 0)} onPress={() => setView('stock')} />
        <StatTile style={{ flex: 1 }} icon={Shield} tone="warning" label={t('30 din mein khatam')} loading={list.isLoading} value={String(c?.expiring ?? 0)} onPress={() => setView('expiring')} />
      </Row>
      <ChipGroup value={view} onChange={setView} options={VIEWS.map((v) => ({ value: v.value, label: `${v.label}${c?.[v.value] != null ? ` ${c[v.value]}` : ''}` }))} />
      <ChipGroup value={sort} onChange={setSort} options={SORTS} />
      <OfflineNote feature="electronicsDesk" />
      <CachedNote query={list} />
    </View>
  );

  return (
    <>
      <ListTemplate<Row2>
        title={t('Serial / IMEI')}
        grouped={false}
        actions={canTradeIn ? <IconButton icon={Recycle} label={t('Purani cheez khareedein')} onPress={() => guard(() => setTrade(true))} /> : undefined}
        search={{ value: search, onChange: setSearch, placeholder: t('Serial, IMEI ya product…') }}
        summary={header}
        data={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.data ? null : list.error}
        onRetry={() => void list.refetch()}
        refreshing={list.isRefetching}
        onRefresh={() => void list.refetch()}
        keyExtractor={(s) => s.id}
        renderItem={({ item: s }) => {
          const left = s.status === 'SOLD' ? daysLeft(s.warrantyEndDate) : null;
          const openClaim = s.claims.find((x) => !x.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(x.status));
          return (
            <View style={{ marginHorizontal: th.space(4), marginBottom: th.space(2), borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.surface, borderWidth: th.isDark ? 1 : 0.5, borderColor: th.colors.border }}>
              <ListRow icon={Barcode} iconTone={serialStatusOf(s.status).tone}
                title={<Text weight="semibold" ltr numberOfLines={1}>{s.serialNumber}</Text>}
                subtitle={<View style={{ gap: 2 }}>
                  <Text size="xs" tone="muted" numberOfLines={1}>{s.product?.name ?? t('Product hata diya gaya')}{s.imei ? ` · IMEI ${s.imei}` : ''}</Text>
                  <Row gap={1} wrap>
                    <MetaPill m={serialStatusOf(s.status)} />
                    {s.supplierRef?.startsWith('TI-') ? <Badge tone="accent">{t('Trade-in')}</Badge> : null}
                    {openClaim ? <Badge tone="warning" icon={Wrench}>{t('Claim')}</Badge> : null}
                  </Row>
                </View>}
                trailing={<View style={{ alignItems: 'flex-end' }}>
                  {left != null ? <Text size="sm" weight="semibold" tone={left < 0 ? 'muted' : left <= 30 ? 'warning' : 'success'}>{left < 0 ? t('Warranty khatam') : t('{{left}} din warranty', { left })}</Text> : <Text size="sm" weight="semibold" ltr>{s.purchasePrice != null ? cost(s.purchasePrice) : '—'}</Text>}
                  <Text size="2xs" tone="muted">{s.status === 'SOLD' ? t('Bika {{soldAt}}', { soldAt: formatDate(s.soldAt ?? '') }) : t('Aaya {{d}}', { d: formatDate(s.purchaseDate ?? s.createdAt) })}</Text>
                </View>}
                onPress={() => setOpen(s)} />
            </View>
          );
        }}
        empty={<EmptyState icon={Barcode} title={t('Koi unit nahi mila')} message={t('Serial daalne ke liye + dabayein.')} />}
        fab={canManage ? { icon: Plus, label: t('Serial daalein'), onPress: () => guard(() => setAdding(true)) } : undefined}
      />
      <AddUnitsSheet open={adding} onClose={() => setAdding(false)} />
      <TradeInSheet open={trade} onClose={() => setTrade(false)} />
      <EditUnitSheet unit={edit} onClose={() => setEdit(null)} />
      <UnitSheet unit={open} money={cost} canManage={canManage} removable={open ? removable(open) : false} onEdit={(s) => { setOpen(null); setEdit(s); }} onRemove={(s) => void remove(s)} onClose={() => setOpen(null)} />
    </>
  );
}

function UnitSheet({ unit: s, money, canManage, removable, onEdit, onRemove, onClose }: { unit: Row2 | null; money: (n: number) => string; canManage: boolean; removable: boolean; onEdit: (s: Row2) => void; onRemove: (s: Row2) => void; onClose: () => void }) {
  const th = useTheme();
  const openClaim = s?.claims.find((x) => !x.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(x.status));
  return (
    <Sheet open={!!s} onClose={onClose} height={0.85} title={s?.serialNumber} description={s?.product?.name}
      footer={s ? (
        <Row gap={2}>
          {s.status === 'SOLD' && !openClaim && canManage ? <Button style={{ flex: 1 }} variant="soft" icon={Wrench} onPress={() => { onClose(); router.push({ pathname: '/electronics/warranty-claims', params: { serial: s.serialNumber } } as never); }}>{t('Warranty claim')}</Button> : null}
          {canManage ? <Button style={{ flex: 1 }} variant="secondary" onPress={() => onEdit(s)}>{t('Badlein')}</Button> : null}
          {removable ? <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" size="lg" onPress={() => onRemove(s)} /> : null}
        </Row>
      ) : undefined}>
      {s && (
        <View style={{ gap: th.space(2) }}>
          <Card flush>
            <DetailRow label={t('Halat')} value={<MetaPill m={serialStatusOf(s.status)} />} />
            <DetailRow label={t('Cost')} value={s.purchasePrice != null ? money(s.purchasePrice) : '—'} />
            <DetailRow label={t('Khareed')} value={`${formatDate(s.purchaseDate ?? s.createdAt)}${s.supplierRef ? ` · ${s.supplierRef}` : ''}`} />
            {s.soldPrice != null ? <DetailRow label={t('Bika')} value={`${formatMoney(s.soldPrice)} · ${formatDate(s.soldAt ?? '')}`} /> : null}
            {s.warrantyEndDate ? <DetailRow label={t('Warranty')} value={`${formatDate(s.warrantyStartDate ?? '')} — ${formatDate(s.warrantyEndDate)}`} /> : null}
            <DetailRow label={t('Warranty haal')} value={t(warrantyStatusOf(s.warrantyStatus).label)} />
            {s.imei ? <DetailRow label="IMEI" value={s.imei} /> : null}
            {s.imei2 ? <DetailRow label={t('IMEI 2')} value={s.imei2} /> : null}
            {s.macAddress ? <DetailRow label={t('MAC')} value={s.macAddress} /> : null}
            {s.invoiceNumber ? <DetailRow label={t('Bill')} value={s.invoiceNumber} /> : null}
            <DetailRow label={t('Dikhne mein')} value={s.physicalCondition || '—'} last />
          </Card>
          {s.claims.map((x) => <Badge key={x.id} tone={warrantyStatusOf(x.status).tone}>{x.claimNumber} · {metaText(warrantyStatusOf(x.status))}</Badge>)}
          {s.notes ? <Text size="sm" tone="secondary">{s.notes}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}

/** "Is this unit under warranty?" for the customer at the counter. */
function WarrantyChecker() {
  const th = useTheme();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<WarrantyCheck | null>(null);
  const [scan, setScan] = useState(false);
  const check = async (c = code) => {
    const v = c.trim();
    if (!v) return;
    setBusy(true);
    try { setRes(await serialTrackingApi.warrantyCheck(v)); } catch (e) { toast.error(apiErrorMessage(e, t('Check nahi hua'))); } finally { setBusy(false); }
  };
  const s = res?.serial;
  const w = res?.warranty;
  const v = res ? warrantyVerdict(res) : null;
  const tone = v === 'valid' ? 'success' : v === 'expired' || v === 'none' ? 'danger' : 'default';
  const title = v === 'unknown' ? t('Ye serial / IMEI hamare record mein nahi') : v === 'not_sold' ? t('Ye unit abhi {{value}} hai', { value: s ? t(serialStatusOf(s.status).label).toLowerCase() : '' })
    : v === 'valid' ? t('Warranty chal rahi — {{daysRemaining}} din baqi', { daysRemaining: w?.daysRemaining ?? 0 }) : v === 'expired' ? t('Warranty {{endDate}} ko khatam ho gayi', { endDate: formatDate(w?.endDate ?? '') }) : t('Is unit par warranty nahi');
  return (
    <View style={{ gap: th.space(3) }}>
      <Input label={t('Serial / IMEI')} value={code} onChangeText={setCode} ltr returnKeyType="search" onSubmitEditing={() => void check()} trailing={<IconButton icon={ScanLine} label={t('Scan')} size="sm" onPress={() => setScan(true)} />} />
      <Button icon={Search} loading={busy} disabled={!code.trim()} onPress={() => void check()}>{t('Check')}</Button>
      {v && (
        <Card tone={tone as never}>
          <Text weight="bold">{title}</Text>
          {s ? <>
            <Text size="sm">{s.product?.name} · <Text ltr size="sm">{s.serialNumber}</Text></Text>
            {s.soldAt ? <Text size="xs" tone="muted">{t('Bika {{soldAt}}', { soldAt: formatDate(s.soldAt) })}{s.customer ? ` · ${s.customer.name}` : ''}</Text> : null}
            {w?.endDate ? <Text size="xs" tone="muted">{t('Warranty tak')}: {formatDate(w.endDate)}</Text> : null}
          </> : null}
        </Card>
      )}
      {scan && <CameraScan title={t('Serial scan karein')} onClose={() => setScan(false)} onCode={(c) => { setScan(false); setCode(c); void check(c); return true; }} />}
    </View>
  );
}
