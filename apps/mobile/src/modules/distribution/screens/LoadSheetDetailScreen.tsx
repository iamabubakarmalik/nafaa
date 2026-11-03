/**
 * One load sheet: the pick list in cartons and pieces, scheme free goods
 * kept apart, the invoices in route order, the van details, and the cash
 * once settled. Open sheets can take or drop orders, be dispatched or
 * cancelled; the share sheet sends the pick list.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Gift, Pencil, Plus, Send, Share2, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { confirm, Amount, Button, DetailRow, DetailSection, DetailTemplate, IconButton, Input, ListRow, Row, Select, Sheet, StatTile, SwipeRow, Text, toast, useTheme } from '@/design';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { DIST_KEY, distError, distributionApi, type LoadSheetDetail } from '../api/distribution.api';
import { CachedNote, StatusChip, shareText, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { LoadSheetSheet } from '../components/LoadSheetSheet';
import { useDeliveryStaff } from '../hooks/useDistribution';
import { loadSheetText } from '../lib/share';
import { dayTime, dayYearLabel, ORDER_STATUS, OUTCOME, partyName, partySub, rs, SHEET_STATUS, trim } from '../lib/meta';
import { useQueryClient } from '@tanstack/react-query';

export function LoadSheetDetailScreen() {
  return <DistributionGate title={t('Load sheet')}><Detail /></DistributionGate>;
}

function Detail() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const refresh = useRefreshDistribution();
  const can = usePermission();
  const canLoad = can(P.DISTRIBUTION_LOADSHEETS_MANAGE);
  const canSettle = can(P.DISTRIBUTION_SETTLE);
  const q = useQuery({ queryKey: [DIST_KEY, 'sheet', id], queryFn: () => distributionApi.loadSheet(id), enabled: !!id });
  const s = q.data;
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);

  const done = (r: LoadSheetDetail, msg: string) => { toast.success(msg); qc.setQueryData([DIST_KEY, 'sheet', id], r); void refresh(); };
  const dispatch = useMutation({ mutationFn: () => distributionApi.dispatch(id), onSuccess: (r) => done(r, t('{{number}} — gaari nikal gayi', { number: r.number })), onError: (e) => toast.error(distError(e)) });
  const cancel = useMutation({ mutationFn: () => distributionApi.cancelSheet(id), onSuccess: (r) => done(r, t('{{number}} cancel — orders wapas Invoiced', { number: r.number })), onError: (e) => toast.error(distError(e)) });
  const remove = useMutation({ mutationFn: (orderId: string) => distributionApi.removeFromSheet(id, orderId), onSuccess: (r) => done(r, t('Order sheet se hat gaya')), onError: (e) => toast.error(distError(e)) });

  const share = async () => {
    try { await shareText(loadSheetText(await distributionApi.printLoadSheet(id, false))); } catch (e) { toast.error(distError(e, t('Print nahi hua'))); }
  };
  const askDispatch = async () => {
    if (!s) return;
    if (await confirm({ title: t('{{number}} dispatch karein?', { number: s.number }), message: t('Is ke baad orders na jor sakenge na hata sakenge. Wapsi par Settle karein.'), confirmLabel: t('Dispatch') })) dispatch.mutate();
  };
  const askCancel = async () => {
    if (await confirm({ title: t('{{number}} cancel karein?', { number: s?.number }), message: t('Sheet ke sab orders wapas Invoiced ho jayenge — Invoice nahi mitti.'), tone: 'danger', confirmLabel: t('Cancel sheet') })) cancel.mutate();
  };

  const open = s?.status === 'OPEN';
  const active = open || s?.status === 'DISPATCHED';

  return (
    <DetailTemplate
      title={s?.number ?? t('Load sheet')}
      subtitle={s ? `${dayYearLabel(s.date)} · ${s.routeName ?? t('Mili juli')}` : undefined}
      actions={s ? <IconButton icon={Share2} label={t('Share')} onPress={() => void share()} /> : undefined}
      loading={q.isLoading} error={q.isError && !s ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={s && ((canLoad && open) || (canSettle && active)) ? <>
        {canLoad && open && <Button style={{ flex: 1 }} size="lg" variant={canSettle ? 'secondary' : 'primary'} icon={Send} loading={dispatch.isPending} onPress={() => void askDispatch()}>{t('Dispatch')}</Button>}
        {canSettle && active && <Button style={{ flex: 1 }} size="lg" icon={Wallet} onPress={() => router.push(`/distribution/load-sheets/${id}/settle` as never)}>{t('Settle now')}</Button>}
      </> : undefined}
    >
      {s && <View style={{ gap: th.space(4) }}>
        <Row gap={2} wrap>
          <StatusChip meta={SHEET_STATUS[s.status]} />
          <Text size="sm" tone="muted">{[s.deliveryUserName, s.driverName, s.vehicleNo, s.shopName].filter(Boolean).join(' · ')}</Text>
        </Row>
        <CachedNote query={q} />
        <Row gap={2}>
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Invoices')} value={String(s.invoiceCount)} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Value')} value={<Amount value={s.totalValue} size="lg" weight="bold" />} />
          <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Maal')} value={`${s.goodsTotals.packs}`} hint={t('{{baseQty}} pcs kul', { baseQty: trim(s.goodsTotals.baseQty) })} />
        </Row>

        {s.status === 'SETTLED' && (
          <DetailSection title={t('Cash')}>
            <DetailRow label={t('Expected cash')} value={<Amount value={s.expectedCash} />} />
            <DetailRow label={t('Jama hua')} value={<Amount value={s.handedIn ?? 0} />} />
            <DetailRow label={s.shortAmount > 0 ? t('Kam') : s.shortAmount < 0 ? t('Zyada') : t('Farq')} value={<Amount value={Math.abs(s.shortAmount)} tone={s.shortAmount > 0 ? 'danger' : 'success'} />} />
            <DetailRow label={t('Wapas aaya')} value={<Amount value={s.returnsValue} />} last />
            {s.settledAt && <Text size="xs" tone="muted" style={{ padding: th.space(3) }}>{dayTime(s.settledAt)} · {s.settledByName ?? ''}</Text>}
          </DetailSection>
        )}

        <DetailSection title={t('Maal (pick list)')}>
          {s.goods.map((g) => (
            <ListRow key={`${g.productId}-${g.variantId}`} dense title={`${g.name}${g.variantName ? ` · ${g.variantName}` : ''}`}
              subtitle={g.packSize && g.packSize > 1 ? `1 ${g.packName} = ${trim(g.packSize)} ${g.baseUnit}` : undefined}
              trailing={<View style={{ alignItems: 'flex-end' }}><Text size="md" weight="bold" ltr>{g.text}</Text>{g.value != null && <Text size="xs" tone="muted" ltr>{rs(g.value)}</Text>}</View>} />
          ))}
        </DetailSection>

        {s.freeGoods.length > 0 && (
          <DetailSection title={t('Free maal (scheme)')}>
            {s.freeGoods.map((g) => <ListRow key={`${g.productId}-${g.variantId}`} dense icon={Gift} iconTone="accent" title={g.name ?? ''} trailing={<Text size="sm" weight="bold" ltr>{g.text}</Text>} />)}
          </DetailSection>
        )}

        <DetailSection title={t('Invoices')} action={canLoad && open ? <Button size="sm" variant="soft" icon={Plus} onPress={() => setAdding(true)}>{t('Order jorein')}</Button> : undefined}>
          {!s.orders.length ? <Text size="sm" tone="muted" style={{ padding: th.space(4) }}>{t('Is sheet par koi invoice nahi.')}</Text> : s.orders.map((o, i) => {
            const row = (
              <ListRow key={o.id} dense title={`${i + 1}. ${partyName(o.customer)}`} subtitle={`${o.saleNumber ?? ''} · ${o.orderNumber}${partySub(o.customer) ? ` · ${partySub(o.customer)}` : ''}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4 }}><Amount value={o.total} weight="semibold" />
                  <StatusChip meta={o.deliveryStatus ? OUTCOME[o.deliveryStatus] : ORDER_STATUS[o.status]} />
                  {o.returnsValue > 0 && <Text size="xs" tone="danger" ltr>−{rs(o.returnsValue)}</Text>}</View>}
                onPress={() => router.push(`/distribution/orders/${o.id}` as never)} />
            );
            return canLoad && open ? (
              <SwipeRow key={o.id} end={[{ icon: XCircle, label: t('Hatayein'), tone: 'danger', onPress: () => remove.mutate(o.id) }]}>{row}</SwipeRow>
            ) : row;
          })}
        </DetailSection>

        {s.note ? <Text size="sm" tone="muted">{s.note}</Text> : null}

        {active && (
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            {canLoad && <Button style={{ flex: 1 }} variant="secondary" icon={Pencil} onPress={() => setEditing(true)}>{t('Gaari ki details')}</Button>}
            {canLoad && <Button style={{ flex: 1 }} variant="secondary" icon={XCircle} loading={cancel.isPending} onPress={() => void askCancel()}>{t('Cancel')}</Button>}
          </View>
        )}
      </View>}

      {s && <VanSheet sheet={s} open={editing} onClose={() => setEditing(false)} onSaved={(r) => { setEditing(false); done(r, t('Gaari ki details save')); }} />}
      <LoadSheetSheet open={adding} addTo={id} onClose={() => setAdding(false)} />
    </DetailTemplate>
  );
}

function VanSheet({ sheet, open, onClose, onSaved }: { sheet: LoadSheetDetail; open: boolean; onClose: () => void; onSaved: (r: LoadSheetDetail) => void }) {
  const th = useTheme();
  const [deliveryUserId, setDeliveryUserId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    setDeliveryUserId(sheet.deliveryUserId ?? ''); setDriverName(sheet.driverName ?? ''); setVehicleNo(sheet.vehicleNo ?? ''); setNote(sheet.note ?? '');
  }, [open, sheet]);
  const staff = useDeliveryStaff([{ id: sheet.deliveryUserId, name: sheet.deliveryUserName }]).list;
  const save = useMutation({
    mutationFn: () => distributionApi.updateLoadSheet(sheet.id, { deliveryUserId: deliveryUserId || null, driverName: driverName.trim(), vehicleNo: vehicleNo.trim(), note: note.trim() }),
    onSuccess: onSaved,
    onError: (e) => toast.error(distError(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari ki details')} footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Delivery wala')} value={deliveryUserId} onChange={setDeliveryUserId} placeholder={t('Baad me')} options={[{ value: '', label: t('Baad me') }, ...staff.map((u) => ({ value: u.id, label: u.label }))]} />
        <Input label={t('Driver')} value={driverName} onChangeText={setDriverName} />
        <Input label={t('Gaari no.')} value={vehicleNo} onChangeText={(v) => setVehicleNo(v.toUpperCase())} autoCapitalize="characters" ltr />
        <Input label={t('Note')} value={note} onChangeText={setNote} />
      </View>
    </Sheet>
  );
}
