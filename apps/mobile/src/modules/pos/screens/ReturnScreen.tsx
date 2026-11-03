/**
 * Return from a bill: find the bill (number, customer, scan the receipt
 * barcode), pick how much of each line came back, whether it goes back on
 * the shelf, how the money goes back and why. The refund follows the server:
 * each line at what was actually paid (after line and bill discounts); on a
 * khata bill the refund clears what is still owed first.
 *
 * A return is not a cancel: a cancelled bill should never have existed; a
 * return is a real sale coming back and is kept as its own record.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { PackageCheck, PackageX, ReceiptText, RotateCcw, Search } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDateTime, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { enqueueReturn, OfflineRuleError, useApiQuery, useSale, useSalesHistory, type SaleRow } from '@/core/offline';
import { askManagerPin, PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import {
  alert, Amount, Badge, Button, Card, Chip, EmptyState, Input, ListGroup, ListRow, PressableScale, Row, Screen, SearchBar, Text, toast, useDebouncedValue, useTheme,
} from '@/design';
import { MethodGrid } from '../components/parts';
import { Scanner } from '@/core/hardware/scanner';
import type { PaymentMethod } from '@nafaa/core/pos';

/** Quick reasons, the same list as the web; saved as written and translated where shown. */
export const RETURN_REASONS: readonly string[] = [
  msg('Cheez kharab nikli'), msg('Ghalat cheez de di'), msg('Pasand nahi aayi'),
  msg('Naap/size theek nahi'), msg('Date guzar chuki thi'), msg('Zyada de di thi'),
];

interface Line { id: string; name: string; unit: string; sold: number; remaining: number; unitRefund: number; service: boolean }

interface BillLike {
  id: string; saleNumber: string; soldAt: string; total: number; discount: number; creditAmount: number; refundedAmount: number;
  paymentMethod: string; customerName: string | null; status: string;
  items: Array<{ id?: string; name: string; unit?: string | null; quantity: number; returnedQty?: number; price: number; total: number; productId?: string | null; usedPhoneId?: string | null }>;
}

function fromServer(s: Record<string, any>): BillLike {
  return {
    id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, total: Number(s.total) || 0, discount: Number(s.discount) || 0,
    creditAmount: Number(s.creditAmount) || 0, refundedAmount: Number(s.refundedAmount) || 0, paymentMethod: s.paymentMethod,
    customerName: s.customer?.name ?? null, status: s.status,
    items: (s.items ?? []).map((it: any) => ({
      id: it.id, name: it.product?.name ?? it.name ?? 'Item', unit: it.product?.unit ?? 'pcs', quantity: Number(it.quantity) || 0,
      returnedQty: Number(it.returnedQty) || 0, price: Number(it.price) || 0, total: Number(it.total) || 0, productId: it.productId, usedPhoneId: it.usedPhoneId,
    })),
  };
}

function fromRow(s: SaleRow): BillLike {
  return { ...s, refundedAmount: 0, items: s.items.map((it) => ({ ...it, unit: it.unit })) };
}

/** Lines that can come back, each at what was actually paid for one unit (same as the web return form). */
function readLines(b: BillLike): Line[] {
  const lineSum = b.items.reduce((s, it) => s + it.total, 0);
  const lineDisc = b.items.reduce((s, it) => s + Math.max(0, it.price * it.quantity - it.total), 0);
  const billDisc = Math.max(0, b.discount - lineDisc);
  const factor = lineSum > 0 ? Math.min(1, Math.max(0, (lineSum - billDisc) / lineSum)) : 1;
  return b.items.filter((it) => !it.usedPhoneId && it.id).map((it) => ({
    id: it.id!, name: it.name, unit: it.unit ?? 'pcs', sold: it.quantity,
    remaining: Math.max(it.quantity - (it.returnedQty ?? 0), 0),
    unitRefund: it.quantity > 0 ? (it.total / it.quantity) * factor : 0,
    service: !it.productId,
  }));
}

export function ReturnScreen() {
  const params = useLocalSearchParams<{ saleId?: string }>();
  const [saleId, setSaleId] = useState<string | null>(params.saleId ?? null);
  return saleId ? <ReturnForm saleId={saleId} onBack={() => setSaleId(null)} /> : <FindBill onPick={setSaleId} />;
}

function FindBill({ onPick }: { onPick: (id: string) => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [q, setQ] = useState('');
  const [scan, setScan] = useState(false);
  const query = useDebouncedValue(q.trim(), 200);
  const local = useSalesHistory({ query: query || undefined, limit: 30 });
  const remote = useApiQuery<Array<{ id: string; saleNumber: string; soldAt: string; total: number; customer?: { name: string } | null; returnableQty: number }>>(
    '/returns/find-bill', { q: query }, { enabled: online && query.length >= 2 });
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<{ id: string; saleNumber: string; soldAt: string; total: number; customer: string | null; pending?: boolean; status?: string }> = [];
    for (const s of local.data ?? []) { seen.add(s.id); out.push({ id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, total: s.total, customer: s.customerName, pending: s.pending, status: s.status }); }
    for (const s of remote.data ?? []) if (!seen.has(s.id)) out.push({ id: s.id, saleNumber: s.saleNumber, soldAt: s.soldAt, total: Number(s.total), customer: s.customer?.name ?? null });
    return out.filter((s) => s.status !== 'VOIDED');
  }, [local.data, remote.data]);

  return (
    <Screen title={t('Return items')} padding={0}>
      <View style={{ paddingHorizontal: th.space(4), gap: th.space(3) }}>
        <Text size="sm" tone="muted">{t('Find the bill: its number, the customer, or scan the barcode on the receipt.')}</Text>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Bill number or customer')} autoFocus onScan={() => setScan(true)} />
      </View>
      <View style={{ padding: th.space(4) }}>
        {rows.length === 0 ? (
          <EmptyState compact icon={Search} title={q ? t('No bill found') : t('Recent bills show here')} />
        ) : (
          <ListGroup>
            {rows.map((s) => (
              <ListRow key={s.id} icon={ReceiptText} title={s.saleNumber} subtitle={[s.customer ?? t('Walk-in customer'), formatDateTime(s.soldAt)].join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={s.total} weight="bold" />{s.pending && <Badge tone="warning" size="sm">{t('Not synced')}</Badge>}</View>}
                disabled={s.pending} chevron onPress={() => onPick(s.id)} />
            ))}
          </ListGroup>
        )}
      </View>
      {scan && <BillScanner onCode={(code) => { setScan(false); setQ(code); }} onClose={() => setScan(false)} />}
    </Screen>
  );
}

/** Scanning a receipt barcode fills the search (the bill number). */
function BillScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  return <Scanner onCode={onCode} onClose={onClose} title={t('Scan the bill barcode')} />;
}

function ReturnForm({ saleId, onBack }: { saleId: string; onBack: () => void }) {
  const th = useTheme();
  const online = useOnlineStatus();
  const local = useSale(saleId);
  const server = useApiQuery<Record<string, any>>(`/sales/${saleId}`, undefined, { enabled: online && !saleId.startsWith('tmp_') });
  const bill: BillLike | null = server.data ? fromServer(server.data) : local.data ? fromRow(local.data) : null;
  const lines = useMemo(() => (bill ? readLines(bill) : []), [bill]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [damaged, setDamaged] = useState<Record<string, boolean>>({});
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  if (!bill) {
    return (
      <Screen title={t('Return items')}>
        {local.isLoading || server.isLoading ? <Text tone="muted">{t('Loading…')}</Text>
          : <EmptyState title={t('Bill not found on this phone')} message={online ? undefined : t('Connect to the internet to open older bills.')} action={<Button onPress={onBack}>{t('Back')}</Button>} />}
      </Screen>
    );
  }

  const selected = lines.filter((l) => (qty[l.id] ?? 0) > 0);
  const refund = Math.round(selected.reduce((s, l) => s + (qty[l.id] ?? 0) * l.unitRefund, 0) * 100) / 100;
  const owed = Math.max(0, bill.creditAmount - bill.refundedAmount);
  const khata = bill.customerName ? Math.min(refund, owed) : 0;
  const handBack = Math.max(0, refund - khata);
  const returnable = lines.filter((l) => l.remaining > 0);
  const allPicked = returnable.length > 0 && returnable.every((l) => (qty[l.id] ?? 0) === l.remaining);
  const setLine = (l: Line, v: number) => setQty((q) => ({ ...q, [l.id]: Math.max(0, Math.min(Number(v.toFixed(3)), l.remaining)) }));

  const submit = async () => {
    if (!selected.length || busy) return;
    const items = selected.map((l) => ({ saleItemId: l.id, quantity: qty[l.id], ...(damaged[l.id] && !l.service ? { restock: false, isDamaged: true } : {}) }));
    const body = { saleId: bill.id, items, refundMethod: method, reason: reason.trim() || undefined, notes: notes.trim() || undefined };
    setBusy(true);
    try {
      if (local.data && !local.data.pending) {
        try {
          await enqueueReturn(body);
        } catch (e) {
          if (!(e instanceof OfflineRuleError) || e.code !== 'pin_needed') throw e;
          const pin = await askManagerPin(t('Return'), 'refund');
          if (!pin) return;
          await enqueueReturn({ ...body, managerPin: pin });
        }
      } else {
        await withManagerPin(t('Return'), (pin) => apiClient.post('/returns', { ...body, ...(pin && { managerPin: pin }) }), 'refund');
      }
      toast.success(t('Return saved'), { message: [khata > 0 ? t('{{amount}} off the khata', { amount: formatMoney(khata) }) : '', handBack > 0 ? t('Give back {{amount}}', { amount: formatMoney(handBack) }) : ''].filter(Boolean).join(' · ') });
      router.back();
    } catch (e) {
      if (e instanceof PinCancelled) return;
      if (e instanceof OfflineRuleError && e.code === 'online_needed') await alert({ title: t('Internet needed'), message: e.message });
      else toast.error(e instanceof OfflineRuleError ? e.message : apiErrorMessage(e, t('The return was not saved')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('Return items')} subtitle={`${bill.saleNumber} · ${bill.customerName ?? t('Walk-in customer')}`} keyboard
      footer={
        <View style={{ gap: th.space(2) }}>
          {refund > 0 && (
            <Row justify="between">
              <Text weight="semibold">{khata > 0 ? t('Off khata {{k}} · give back', { k: formatMoney(khata) }) : t('Give back')}</Text>
              <Amount value={handBack} size="xl" weight="bold" color={th.colors.warning.text} />
            </Row>
          )}
          <Button size="xl" fullWidth icon={RotateCcw} loading={busy} disabled={!selected.length} onPress={() => void submit()}>
            {selected.length ? t('Return {{amount}}', { amount: formatMoney(refund) }) : t('Pick what came back')}
          </Button>
        </View>
      }>
      <View style={{ gap: th.space(4) }}>
        <Row justify="between">
          <Text size="sm" tone="muted">{formatDateTime(bill.soldAt)} · {formatMoney(bill.total)}</Text>
          {returnable.length > 0 && <Chip label={allPicked ? t('Clear') : t('Return all')} selected={allPicked} onPress={() => setQty(allPicked ? {} : Object.fromEntries(returnable.map((l) => [l.id, l.remaining])))} />}
        </Row>
        <Card flush>
          {lines.map((l, i) => {
            const n = qty[l.id] ?? 0;
            return (
              <View key={l.id} style={{ padding: th.space(3), gap: th.space(2), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider, opacity: l.remaining > 0 ? 1 : 0.5 }}>
                <Row justify="between" align="start">
                  <View style={{ flex: 1 }}>
                    <Text weight="semibold">{l.name}</Text>
                    <Text size="xs" tone="muted">{t('Sold {{sold}} · can return {{left}} · {{amount}} each', { sold: l.sold, left: l.remaining, amount: formatMoney(l.unitRefund) })}</Text>
                  </View>
                  <Row gap={1} style={{ direction: 'ltr' }}>
                    <Button size="sm" variant="secondary" disabled={n <= 0} onPress={() => setLine(l, n - 1)}>−</Button>
                    <Text weight="bold" ltr style={{ minWidth: 36, textAlign: 'center' }}>{n}</Text>
                    <Button size="sm" variant="soft" disabled={n >= l.remaining} onPress={() => setLine(l, n + 1)}>+</Button>
                  </Row>
                </Row>
                {n > 0 && !l.service && (
                  <Row gap={2}>
                    <PressableScale onPress={() => setDamaged((d) => ({ ...d, [l.id]: false }))} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: th.radius('md'), backgroundColor: !damaged[l.id] ? th.colors.success.soft : th.colors.surfaceMuted }}>
                      <PackageCheck size={16} color={th.colors.success.text} /><Text size="sm" weight="semibold">{t('Back on shelf')}</Text>
                    </PressableScale>
                    <PressableScale onPress={() => setDamaged((d) => ({ ...d, [l.id]: true }))} style={{ flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: th.radius('md'), backgroundColor: damaged[l.id] ? th.colors.danger.soft : th.colors.surfaceMuted }}>
                      <PackageX size={16} color={th.colors.danger.text} /><Text size="sm" weight="semibold">{t('Damaged')}</Text>
                    </PressableScale>
                  </Row>
                )}
              </View>
            );
          })}
        </Card>
        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="semibold" tone="muted" uppercase>{t('Money back by')}</Text>
          <MethodGrid value={method} onChange={setMethod} />
          {owed > 0 && <Text size="xs" tone="muted">{t('This bill still has {{amount}} on khata; the refund clears that first.', { amount: formatMoney(owed) })}</Text>}
        </View>
        <View style={{ gap: th.space(2) }}>
          <Text size="xs" weight="semibold" tone="muted" uppercase>{t('Reason')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {RETURN_REASONS.map((r) => <Chip key={r} label={t(r)} selected={reason === r} onPress={() => setReason(reason === r ? '' : r)} />)}
          </View>
          <Input value={RETURN_REASONS.includes(reason) ? '' : reason} onChangeText={setReason} placeholder={t('Or write the reason')} />
          <Input value={notes} onChangeText={setNotes} placeholder={t('Note (optional)')} />
        </View>
      </View>
    </Screen>
  );
}

