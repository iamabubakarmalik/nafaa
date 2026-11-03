/**
 * Bottom sheets around an order: a reason sheet (cancel, reject, RTO),
 * the row's action menu, and the bulk bar for picked orders.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ArrowRight, Ban, CheckCircle2, FileText, Package, PhoneCall, Tag, Truck, X } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkCounts, orderNo, orderOptions, type CourierAccount, type OnlineOrder } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Button, ChipGroup, IconButton, ListGroup, ListRow, Select, Sheet, Text, TextArea, toast, useTheme } from '@/design';
import { apiErrorMessage, couriersApi, ordersApi } from '../api/online';
import { CANCEL_REASONS, NEXT_ACTION, NEXT_FALLBACK } from '../lib/labels';
import { refreshOrders } from '../lib/online';

/** Asks the reason before cancel, reject or "parcel came back". */
export function ReasonSheet({ open, title, description, reasons, confirmLabel, loading, onClose, onConfirm }: {
  open: boolean; title: string; description?: string; reasons: string[]; confirmLabel: string; loading?: boolean;
  onClose: () => void; onConfirm: (reason: string) => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);
  const options = reasons.map((r) => ({ value: t(r), label: t(r) }));
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}
      footer={<Button variant="danger" fullWidth size="lg" loading={loading} disabled={!reason.trim()} onPress={() => onConfirm(reason.trim())}>{confirmLabel}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap options={options} value={reason} onChange={setReason} />
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} placeholder={t('Wajah likhein…')} maxLength={200} />
      </View>
    </Sheet>
  );
}

/** "…" on a row: every action the order allows right now. */
export function OrderMenuSheet({ order, couriers, canManage, onClose, onAction, onOpen, onCancel, onInvoice }: {
  order: OnlineOrder | null; couriers: CourierAccount[]; canManage: boolean; onClose: () => void;
  onAction: (o: OnlineOrder, a: { kind: 'accept' } | { kind: 'next' } | { kind: 'confirm' } | { kind: 'book'; courier: string } | { kind: 'label' }) => void;
  onOpen: (o: OnlineOrder) => void; onCancel: (o: OnlineOrder) => void; onInvoice: (o: OnlineOrder) => void;
}) {
  const o = order;
  const opt = o ? orderOptions(o) : null;
  const run = (fn: () => void) => () => { onClose(); setTimeout(fn, 250); };
  return (
    <Sheet open={!!o} onClose={onClose} title={o ? `#${orderNo(o)}` : undefined} description={o ? o.customerName : undefined}>
      {o && opt && (
        <ListGroup>
          {canManage && opt.accept && <ListRow icon={CheckCircle2} iconTone="success" title={t('Accept + bill')} onPress={run(() => onAction(o, { kind: 'accept' }))} />}
          {canManage && opt.next && <ListRow icon={ArrowRight} iconTone="brand" title={t(NEXT_ACTION[o.orderStatus] ?? NEXT_FALLBACK)} onPress={run(() => onAction(o, { kind: 'next' }))} />}
          {canManage && opt.confirm && <ListRow icon={PhoneCall} iconTone="success" title={t('Customer ne confirm kiya')} onPress={run(() => onAction(o, { kind: 'confirm' }))} />}
          {canManage && opt.book && couriers.map((c) => (
            <ListRow key={c.code} icon={Truck} iconTone="info" title={t('{{name}} par book', { name: c.name })} onPress={run(() => onAction(o, { kind: 'book', courier: c.code }))} />
          ))}
          {canManage && opt.book && !couriers.length && <ListRow icon={Truck} iconTone="info" title={t('Courier ko dein')} onPress={run(() => onOpen(o))} />}
          {opt.label && <ListRow icon={Tag} title={t('Courier label print')} onPress={run(() => onAction(o, { kind: 'label' }))} />}
          {opt.invoice && <ListRow icon={FileText} title={t('Invoice / packing slip')} onPress={run(() => onInvoice(o))} />}
          <ListRow icon={Package} title={t('Poori details')} chevron onPress={run(() => onOpen(o))} />
          {canManage && opt.cancel && <ListRow icon={Ban} destructive title={o.orderStatus === 'PENDING' ? t('Reject') : t('Cancel')} onPress={run(() => onCancel(o))} />}
        </ListGroup>
      )}
    </Sheet>
  );
}

/**
 * Bar at the bottom while orders are picked: accept, confirm, next step,
 * book on a courier, invoices, cancel. Failed ones stay picked with their reason.
 */
export function BulkBar({ orders, picked, couriers, onClear, onKeep, onInvoices }: {
  orders: OnlineOrder[]; picked: Set<string>; couriers: CourierAccount[];
  onClear: () => void; onKeep: (ids: string[]) => void; onInvoices: (ids: string[]) => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [courier, setCourier] = useState('');
  const sel = orders.filter((o) => picked.has(o.id));
  const n = bulkCounts(sel);
  type Action = 'accept' | 'next' | 'confirm' | 'cancel' | 'book';

  const run = useMutation({
    mutationFn: async ({ action, reason }: { action: Action; reason?: string }) => {
      if (action === 'book') {
        const code = courier || couriers[0]?.code;
        if (!code) throw new Error(t('Pehle Couriers se koi courier jorein'));
        const ids = sel.filter((o) => o.nafaaSaleId && !o.courierBooked && !o.dispatchedAt).map((o) => o.id);
        const r = await couriersApi.bulkBook(code, { orderIds: ids });
        return { done: r.booked, results: r.results.map((x) => ({ id: x.orderId, ok: x.ok, error: x.error })) };
      }
      return ordersApi.bulk(action, [...picked], action === 'cancel' ? reason : undefined);
    },
    onSuccess: (r, { action }) => {
      refreshOrders(qc);
      const label = { accept: t('accept — bill bane'), next: t('agle qadam par'), confirm: t('confirm'), cancel: t('cancel'), book: t('courier par book') }[action];
      if (r.done) { haptic('success'); toast.success(t('{{done}} order {{label}} ✓', { done: r.done, label })); }
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length) {
        const byId = new Map(orders.map((o) => [o.id, o]));
        toast.error(t('{{count}} order nahi hue', { count: failed.length }), {
          message: failed.slice(0, 3).map((f) => `#${byId.get(f.id) ? orderNo(byId.get(f.id)!) : ''}: ${f.error ?? ''}`).join('\n'),
          duration: 8000,
        });
        onKeep(failed.map((f) => f.id));
      } else onClear();
      setCancelOpen(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });

  if (!picked.size) return null;
  const busy = run.isPending;
  return (
    <View style={{
      position: 'absolute', start: th.space(3), end: th.space(3), bottom: th.space(6), borderRadius: th.radius('xl'),
      backgroundColor: th.isDark ? th.colors.surfaceRaised : '#0f172a', padding: th.space(3), gap: th.space(2),
      shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
        <Text size="base" weight="bold" color="#ffffff" style={{ flex: 1 }}>{t('{{size}} chune', { size: picked.size })}</Text>
        <IconButton icon={X} label={t('Chhoro')} onPress={onClear} color="#ffffff" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
        {n.accept > 0 && <Button size="sm" variant="success" icon={CheckCircle2} loading={busy && run.variables?.action === 'accept'} disabled={busy} onPress={() => run.mutate({ action: 'accept' })}>{t('{{accept}} accept', { accept: n.accept })}</Button>}
        {n.confirm > 0 && <Button size="sm" variant="inverse" icon={PhoneCall} disabled={busy} onPress={() => run.mutate({ action: 'confirm' })}>{t('{{confirm}} confirm', { confirm: n.confirm })}</Button>}
        {n.next > 0 && <Button size="sm" variant="inverse" iconEnd={ArrowRight} iconEndFlip disabled={busy} onPress={() => run.mutate({ action: 'next' })}>{t('{{next}} agla qadam', { next: n.next })}</Button>}
        {n.book > 0 && couriers.length > 0 && <Button size="sm" variant="inverse" icon={Truck} disabled={busy} loading={busy && run.variables?.action === 'book'} onPress={() => run.mutate({ action: 'book' })}>{t('{{book}} book{{value}}', { book: n.book, value: ` (${couriers.find((c) => c.code === (courier || couriers[0].code))?.name ?? ''})` })}</Button>}
        <Button size="sm" variant="inverse" icon={FileText} disabled={busy} onPress={() => onInvoices([...picked])}>{t('Invoice print')}</Button>
        {n.cancel > 0 && <Button size="sm" variant="danger" icon={Ban} disabled={busy} onPress={() => setCancelOpen(true)}>{t('Cancel')}</Button>}
      </View>
      {n.book > 0 && couriers.length > 1 && (
        <Select label={t('Courier')} value={courier || couriers[0].code} onChange={setCourier} options={couriers.map((c) => ({ value: c.code, label: c.name }))} />
      )}
      {!busy && n.accept + n.next + n.confirm + n.book + n.cancel === 0 && (
        <Text size="xs" color="rgba(255,255,255,0.7)">{t('In orders par abhi koi ek-saath kaam nahi')}</Text>
      )}
      <ReasonSheet open={cancelOpen} title={t('{{count}} order cancel karein?', { count: n.cancel })} reasons={CANCEL_REASONS}
        description={t('Jin ka bill bana hai woh void honge aur stock wapas aayega.')}
        confirmLabel={t('Haan, {{cancel}} cancel', { cancel: n.cancel })} loading={busy && run.variables?.action === 'cancel'}
        onClose={() => setCancelOpen(false)} onConfirm={(reason) => run.mutate({ action: 'cancel', reason })} />
    </View>
  );
}
