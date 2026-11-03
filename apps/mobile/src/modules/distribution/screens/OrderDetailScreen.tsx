/**
 * One order: lines in packs and pieces, free goods and the scheme behind
 * them, the credit warning from booking, where and when it was booked, and
 * the linked bill and load sheet. Actions follow the status.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertTriangle, BadgeCheck, Gift, Pencil, Receipt, Share2, Truck, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Amount, Button, DetailRow, DetailSection, DetailTemplate, IconButton, Input, ListRow, Sheet, Text, toast, useTheme,
} from '@/design';
import { DIST_KEY, distError, distributionApi, type OrderDetail } from '../api/distribution.api';
import { CachedNote, ReasonSheet, StatusChip, shareText, useRefreshDistribution } from '../components/parts';
import { DistributionGate } from '../components/DistributionGate';
import { LoadSheetSheet } from '../components/LoadSheetSheet';
import { approveOrInvoice } from '../lib/actions';
import { invoiceText } from '../lib/share';
import { dayTime, ORDER_STATUS, OUTCOME, packText, partyName, rs, trim } from '../lib/meta';

export function OrderDetailScreen() {
  return <DistributionGate title={t('Order ki details')}><Detail /></DistributionGate>;
}

function Detail() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const refresh = useRefreshDistribution();
  const can = usePermission();
  const canManage = can(P.DISTRIBUTION_ORDERS_MANAGE);
  const canBook = can(P.DISTRIBUTION_ORDERS_BOOK);
  const canLoad = can(P.DISTRIBUTION_LOADSHEETS_MANAGE);
  const q = useQuery({ queryKey: [DIST_KEY, 'order', id], queryFn: () => distributionApi.order(id), enabled: !!id });
  const o = q.data;
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const run = useMutation({
    mutationFn: (kind: 'approve' | 'invoice') => approveOrInvoice(kind, [id]),
    onSuccess: (r) => {
      const bad = r.results.filter((x) => !x.ok);
      if (r.invoiced) toast.success(t('{{invoiced}} Invoice ban gaye', { invoiced: r.invoiced }));
      bad.forEach((b) => toast.error(b.error ?? t('Kaam nahi hua, dobara koshish karein')));
      if (r.pinSkipped) toast.info(t('PIN ke bagair credit wale orders Approved par ruk gaye'));
      void refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });
  const cancel = useMutation({
    mutationFn: (reason: string) => distributionApi.cancel([id], reason || undefined),
    onSuccess: (r) => {
      const bad = r.results.find((x) => !x.ok);
      if (bad) toast.error(bad.error ?? '');
      else toast.success(t('{{ok}} order cancel', { ok: 1 }));
      setCancelling(false);
      void refresh();
    },
    onError: (e) => toast.error(distError(e)),
  });
  const share = async () => {
    try { await shareText(invoiceText(await distributionApi.printInvoices([id]))); } catch (e) { toast.error(distError(e, t('Print nahi hua'))); }
  };

  const s = o?.status;
  const c = o?.customer;
  const map = o && o.latitude != null && o.longitude != null ? `https://www.google.com/maps?q=${o.latitude},${o.longitude}` : null;
  const free = o?.items.filter((i) => i.freeBaseQty > 0) ?? [];

  return (
    <DetailTemplate
      title={o?.orderNumber ?? t('Order')}
      subtitle={o ? partyName(c) : undefined}
      actions={o?.saleId ? <IconButton icon={Share2} label={t('Invoice print')} onPress={() => void share()} /> : undefined}
      loading={q.isLoading} error={q.isError && !o ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      bottomActions={o && ((s === 'BOOKED' && canManage) || (s === 'APPROVED' && canManage) || (s === 'INVOICED' && canLoad && !o.loadSheetId)) ? <>
        {s === 'BOOKED' && <Button style={{ flex: 1 }} size="lg" icon={BadgeCheck} loading={run.isPending} onPress={() => run.mutate('approve')}>{t('Approve + Invoice')}</Button>}
        {s === 'APPROVED' && <Button style={{ flex: 1 }} size="lg" icon={Receipt} loading={run.isPending} onPress={() => run.mutate('invoice')}>{t('Invoice banayein')}</Button>}
        {s === 'INVOICED' && <Button style={{ flex: 1 }} size="lg" icon={Truck} onPress={() => setLoading(true)}>{t('Load sheet')}</Button>}
      </> : undefined}
    >
      {o && <View style={{ gap: th.space(4) }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <StatusChip meta={ORDER_STATUS[o.status]} />
          {o.deliveryStatus && o.deliveryStatus !== o.status && <StatusChip meta={OUTCOME[o.deliveryStatus]} />}
          <Text size="sm" tone="muted">{[c?.businessName ? c.name : null, c?.phone].filter(Boolean).join(' · ')}</Text>
        </View>
        <CachedNote query={q} />

        {o.creditWarning && <Callout tone="warning" text={o.creditWarning} />}
        {o.invoiceError && <Callout tone="danger" text={t('Invoice nahi bana: {{invoiceError}}', { invoiceError: o.invoiceError })} />}
        {o.cancelReason && o.status === 'CANCELLED' && <Callout tone="info" text={t('Cancel ki wajah: {{cancelReason}}', { cancelReason: o.cancelReason })} />}

        <DetailSection title={t('Details')}>
          <DetailRow label={t('Booked')} value={`${dayTime(o.bookedAt)} · ${o.bookedByName ?? '—'}`} />
          <DetailRow label={t('Jagah')} value={map ? <Text size="sm" tone="brand" weight="semibold" onPress={() => void Linking.openURL(map)}>{t('Map par dekhein')}</Text> : '—'} />
          <DetailRow label={t('Route')} value={o.routeName ?? '—'} />
          <DetailRow label={t('Godown')} value={o.shopName ?? '—'} />
          {o.deliveryDate && <DetailRow label={t('Delivery date')} value={dayTime(o.deliveryDate).split(',')[0]} />}
          {o.approvedAt && <DetailRow label={t('Approved')} value={`${dayTime(o.approvedAt)} · ${o.approvedByName ?? ''}`} />}
          <DetailRow label={t('Invoice')} value={o.saleId ? <Text size="sm" tone="brand" weight="semibold" onPress={() => router.push(`/sales/${o.saleId}` as never)}>{o.saleNumber}</Text> : t('Abhi nahi bana')} />
          <DetailRow label={t('Load sheet')} value={o.loadSheetId ? <Text size="sm" tone="brand" weight="semibold" onPress={() => router.push(`/distribution/load-sheets/${o.loadSheetId}` as never)}>{o.loadSheetNumber}</Text> : '—'} />
          {c && <DetailRow label={t('Khata')} value={<Amount value={c.balance} />} last />}
        </DetailSection>

        <DetailSection title={t('Maal')}>
          {o.items.map((i) => (
            <ListRow key={i.id} dense title={`${i.productName}${i.variantName ? ` · ${i.variantName}` : ''}`}
              subtitle={[`${trim(i.qty)} ${i.unitName ?? i.baseUnit} × ${rs(i.price)}`, i.conversionRate > 1 ? `${trim(i.baseQty)} ${i.baseUnit}` : null, i.schemeNote,
                i.deliveredBaseQty != null && i.deliveredBaseQty < i.baseQty ? t('Wapas: {{trim}} {{baseUnit}}', { trim: trim(i.baseQty - i.deliveredBaseQty), baseUnit: i.baseUnit }) : null].filter(Boolean).join(' · ')}
              trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={i.total} weight="semibold" />
                {i.schemeDiscount + i.discount > 0 && <Text size="xs" tone="success" ltr>−{rs(i.schemeDiscount + i.discount)}</Text>}</View>} />
          ))}
          {free.map((i) => (
            <ListRow key={`f-${i.id}`} dense icon={Gift} iconTone="accent" title={i.freeProductName ?? i.productName ?? ''}
              subtitle={t('Free · {{schemeNote}}', { schemeNote: i.schemeNote })} trailing={<Text size="sm" weight="semibold">{packText(i.freeBaseQty, i.freeProductId ? null : i.conversionRate, i.unitName, i.baseUnit)}</Text>} />
          ))}
        </DetailSection>

        <DetailSection title={t('Total')}>
          <DetailRow label={t('Gross')} value={<Amount value={o.subtotal} />} />
          {o.schemeDiscount > 0 && <DetailRow label={t('Scheme discount')} value={<Amount value={-o.schemeDiscount} />} />}
          {o.discount > 0 && <DetailRow label={t('Discount')} value={<Amount value={-o.discount} />} />}
          <DetailRow label={t('Total')} value={<Amount value={o.total} weight="bold" size="lg" />} last={!o.returnsValue && !o.cashCollected} />
          {o.returnsValue > 0 && <DetailRow label={t('Wapas aaya')} value={<Amount value={-o.returnsValue} />} last={!o.cashCollected} />}
          {o.cashCollected > 0 && <DetailRow label={t('Delivery par cash')} value={<Amount value={o.cashCollected} />} last />}
        </DetailSection>
        {o.note ? <Text size="sm" tone="muted">{o.note}</Text> : null}

        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {s === 'BOOKED' && (canManage || canBook) && <Button style={{ flex: 1 }} variant="secondary" icon={Pencil} onPress={() => setEditing(true)}>{t('Badlein')}</Button>}
          {(s === 'BOOKED' || s === 'APPROVED') && canManage && <Button style={{ flex: 1 }} variant="secondary" icon={XCircle} onPress={() => setCancelling(true)}>{t('Cancel')}</Button>}
        </View>
      </View>}

      {o && <EditSheet o={o} open={editing} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void refresh(); }} />}
      <LoadSheetSheet open={loading} orderIds={[id]} onClose={() => setLoading(false)} />
      <ReasonSheet open={cancelling} title={t('{{count}} order cancel karein?', { count: 1 })} description={t('Cancel order wapas nahi aata. Booker ko naya order book karna hoga.')}
        confirmLabel={t('Cancel order')} busy={cancel.isPending} onClose={() => setCancelling(false)} onSubmit={(r) => cancel.mutate(r)} />
    </DetailTemplate>
  );
}

function Callout({ tone, text }: { tone: 'warning' | 'danger' | 'info'; text: string }) {
  const th = useTheme();
  const c = th.colors[tone];
  return (
    <View style={{ flexDirection: 'row', gap: 8, backgroundColor: c.soft, borderRadius: th.radius('lg'), padding: th.space(3), alignItems: 'flex-start' }}>
      <AlertTriangle size={16} color={c.text} />
      <Text size="sm" style={{ flex: 1, color: c.text }}>{text}</Text>
    </View>
  );
}

/** Change quantities or drop lines of a booked order; the server prices it again. */
function EditSheet({ o, open, onClose, onSaved }: { o: OrderDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  useEffect(() => {
    if (!open) return;
    setQty(Object.fromEntries(o.items.map((i) => [i.id, String(i.qty)])));
    setNote(o.note ?? '');
  }, [open, o]);
  const save = useMutation({
    mutationFn: () => {
      const items = o.items.filter((i) => Number(qty[i.id]) > 0)
        .map((i) => ({ productId: i.productId, variantId: i.variantId, unitId: i.unitId, qty: Number(qty[i.id]) }));
      if (!items.length) throw new Error(t('Kam se kam ek item rakhein'));
      return distributionApi.updateOrder(o.id, { items, note: note.trim() });
    },
    onSuccess: (r) => { toast.success(t('Order badal gaya')); r.warnings.forEach((w) => toast.warning(w)); onSaved(); },
    onError: (e) => toast.error(distError(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Order badlein')} description={t('Quantity badlein ya line hata dein (0 likhein). Qeemat dobara lagti hai.')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {o.items.filter((i) => i.id in qty).map((i) => (
          <Input key={i.id} label={`${i.productName ?? ''}${i.variantName ? ` · ${i.variantName}` : ''}`} labelHint={i.unitName ?? i.baseUnit} keyboardType="decimal-pad" ltr
            value={qty[i.id]} onChangeText={(v) => setQty((p) => ({ ...p, [i.id]: v.replace(/[^\d.]/g, '') }))} />
        ))}
        <Input label={t('Note')} value={note} onChangeText={setNote} placeholder={t('Zaroori nahi')} />
      </View>
    </Sheet>
  );
}
