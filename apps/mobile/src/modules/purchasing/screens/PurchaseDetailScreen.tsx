/**
 * One purchase or order: what was ordered, received and sent back in the
 * unit it was bought in, money, landed cost, and the actions that fit its
 * state: receive an order (all or part), return goods, cancel, print or
 * share the bill / order, and send the order to the supplier on WhatsApp.
 * Readable offline from the last load; actions need internet.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, BookOpen, MessageCircle, PackageCheck, Phone, Printer, RotateCcw, Share2, Wheat } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatPKR } from '@/core/format';
import { t } from '@/core/i18n';
import { getReceiptSetup } from '@/core/receipt';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import {
  Badge, Button, Card, ChipGroup, DetailRow, DetailSection, DetailTemplate, IconButton, Input, ListRow, MoneyInput, Row, Sheet, Switch, Text, toast, useTheme,
} from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { PUR, qty as q3, useCostMask, useOnline, useRefreshInventory } from '@/modules/inventory/lib/shared';
import { purchasesApi, type Purchase, type PurchaseItem } from '../api/purchases';
import { LandedCostPanel } from '../components/Landed';
import { usePurchaseExtras } from '../industry/registry';
import { printDoc, purchaseDoc, shareDoc } from '../lib/docs';
import { callPhone, day, openWhatsApp, PAY_METHODS, STATUS } from '../lib/meta';
import type { PaymentMethod } from '@/core/offline';

const rate = (i: PurchaseItem) => i.conversionRate || 1;
const left = (i: PurchaseItem) => Math.max((i.baseQuantity ?? i.quantity) - (i.receivedQty ?? 0), 0);
const canReturn = (i: PurchaseItem) => Math.max((i.receivedQty ?? 0) - (i.returnedQty ?? 0), 0);
const nameOf = (i: PurchaseItem) => i.itemName || i.product?.name || i.ingredient?.name || t('Cheez');
const baseUnit = (i: PurchaseItem) => i.product?.unit ?? i.ingredient?.unit ?? 'pcs';

export function PurchaseDetailScreen() {
  const { ItemExtra } = usePurchaseExtras();
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const canEdit = can(P.PURCHASES_CREATE);
  const online = useOnline();
  const { cost: money } = useCostMask();
  const [modal, setModal] = useState<'receive' | 'return' | 'cancel' | 'print' | null>(null);
  const q = useQuery({ queryKey: [PUR, 'purchase', id], queryFn: () => purchasesApi.getOne(id!), enabled: !!id });
  const p = q.data;

  if (!p) {
    return <DetailTemplate title={t('Purchase')} loading={q.isLoading} error={q.error ?? (!q.isLoading ? new Error(t('Purchase nahi mili')) : undefined)} onRetry={q.refetch} />;
  }

  const st = STATUS[p.status];
  const open = p.status === 'PENDING' || p.status === 'PARTIAL';
  const received = p.receivedValue ?? (p.status === 'RECEIVED' ? p.total : 0);
  const credit = Math.max(received - p.paidAmount, 0);
  const isOrder = p.status === 'PENDING';

  const whatsapp = () => {
    const lines = [
      `*Order — ${p.purchaseNumber}*`, `${getReceiptSetup().shop.name}`, '',
      ...p.items.map((i, n) => `${n + 1}. ${nameOf(i)} — ${q3(i.quantity)} ${i.unitName ?? baseUnit(i)}`),
      // Sent in the shop's message language (Roman Urdu), like the web.
      '', p.expectedAt ? `Maal ${day(p.expectedAt)} tak bhej dein.` : 'Maal jaldi bhej dein.', 'Shukriya!',
    ];
    openWhatsApp(p.supplier.phone, lines.join('\n'));
  };

  return (
    <DetailTemplate
      title={p.purchaseNumber}
      subtitle={`${day(p.purchasedAt)}${p.shop?.name ? ` · ${p.shop.name}` : ''}${p.createdBy?.fullName ? ` · ${p.createdBy.fullName}` : ''}`}
      actions={<Row gap={1}>
        <IconButton icon={Printer} label={t('Print / invoice')} onPress={() => setModal('print')} />
        {open && p.supplier.phone && <IconButton icon={MessageCircle} label={t('Order bhejein')} onPress={whatsapp} />}
      </Row>}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      summary={(
        <Card tone={p.status === 'CANCELLED' ? 'muted' : 'default'}>
          <Row justify="between" align="start" gap={2}>
            <View style={{ flex: 1, gap: 4 }}>
              <Badge tone={st.tone}>{t(st.label)}</Badge>
              <Text size="xs" tone="muted">{isOrder ? t('Order') : t('Kul bill')}</Text>
              <Text size="2xl" weight="bold" ltr>{money(p.total)}</Text>
            </View>
            {!isOrder && (
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <Text size="xs" tone="muted">{t('Diye')}</Text>
                <Text weight="semibold" ltr>{money(p.paidAmount)}</Text>
                {credit > 0 && <Text size="sm" tone="danger">{t('Udhaar {{credit}}', { credit: money(credit) })}</Text>}
              </View>
            )}
          </Row>
          {p.status === 'CANCELLED' && <Text size="sm" style={{ marginTop: 8 }}>{t('Cancel {{cancelledAt}}{{value}}', { cancelledAt: day(p.cancelledAt), value: p.cancelReason ? ` — ${p.cancelReason}` : '' })}</Text>}
        </Card>
      )}
      bottomActions={canEdit && p.status !== 'CANCELLED' ? (
        <>
          {(p.status === 'RECEIVED' || p.status === 'PARTIAL') && <Button variant="secondary" icon={RotateCcw} style={{ flex: 1 }} disabled={!online} onPress={() => setModal('return')}>{t('Maal wapas')}</Button>}
          {open && <Button icon={PackageCheck} style={{ flex: 1 }} disabled={!online} onPress={() => setModal('receive')}>{t('Maal aaya')}</Button>}
        </>
      ) : undefined}
    >
      <DetailSection title={t('Supplier')}>
        <ListRow title={p.supplier.name} subtitle={[p.supplier.phone, p.supplierInvoiceNo ? t('Supplier ka bill # {{supplierInvoiceNo}}', { supplierInvoiceNo: p.supplierInvoiceNo }) : null].filter(Boolean).join(' · ') || undefined}
          icon={BookOpen} chevron onPress={() => router.push(`/suppliers/${p.supplier.id}` as never)}
          trailing={p.supplier.phone ? <IconButton icon={Phone} size="sm" label={t('Call')} onPress={() => callPhone(p.supplier.phone)} /> : undefined} />
      </DetailSection>

      <DetailSection title={t('Cheezein ({{count}})', { count: p.items.length })}>
        {p.items.map((i, n) => {
          const r = rate(i);
          const got = (i.receivedQty ?? 0) / r;
          const back = (i.returnedQty ?? 0) / r;
          return (
            <View key={i.id} style={{ paddingHorizontal: th.space(4), paddingVertical: th.space(2.5), gap: 3, borderBottomWidth: n < p.items.length - 1 ? 1 : 0, borderBottomColor: th.colors.divider }}>
              <Row justify="between" align="start" gap={2}>
                <Row gap={1} style={{ flex: 1 }}>
                  {i.ingredientId ? <Wheat size={14} color={th.colors.warning.text} /> : null}
                  <Text weight="medium" style={{ flex: 1 }}>{i.variant?.name ? `${nameOf(i)} (${i.variant.name})` : nameOf(i)}</Text>
                </Row>
                <Text weight="semibold" ltr>{money(i.total)}</Text>
              </Row>
              <Text size="xs" tone="muted" ltr>{`${q3(i.quantity)} ${i.unitName ?? ''} × ${money(i.costPrice)}${r !== 1 ? `  (= ${q3(i.baseQuantity ?? i.quantity * r)} ${baseUnit(i)})` : ''}`}</Text>
              {(i.batchNo || i.expiryDate) && <Text size="xs" tone="muted">{[i.batchNo ? `${t('Batch #')} ${i.batchNo}` : null, i.expiryDate ? `${t('Expiry')} ${day(i.expiryDate)}` : null].filter(Boolean).join(' · ')}</Text>}
              {(i.landedCost ?? 0) > 0 && <Text size="xs" tone="brand">{t('+ Landed cost {{value}} / {{baseUnit}}', { value: money((i.landedCost ?? 0) / (i.baseQuantity || i.quantity || 1)), baseUnit: baseUnit(i) })}</Text>}
              <Row gap={1.5} wrap>
                {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && <Badge tone="info">{t('Aaya {{got}} / {{quantity}}', { got: q3(got), quantity: q3(i.quantity) })}</Badge>}
                {back > 0 && <Badge tone="warning">{t('Wapas {{back}}', { back: q3(back) })}</Badge>}
                {p.status === 'RECEIVED' && !back && <Badge tone="success">{t('Poora aaya')}</Badge>}
              </Row>
              {ItemExtra ? <ItemExtra item={i} purchase={p} /> : null}
            </View>
          );
        })}
      </DetailSection>

      <DetailSection title={t('Hisaab')}>
        <DetailRow label={t('Cheezein')} value={money(p.subtotal)} />
        {p.discount > 0 && <DetailRow label={t('Discount')} value={`−${money(p.discount)}`} />}
        {(p.otherCharges ?? 0) > 0 && <DetailRow label={t('Kiraya / loading')} value={`+${money(p.otherCharges)}`} />}
        {(p.taxAmount ?? 0) > 0 && <DetailRow label={t('Tax')} value={`+${money(p.taxAmount)}`} />}
        <DetailRow label={isOrder ? t('Order') : t('Kul bill')} value={money(p.total)} />
        {p.status === 'PARTIAL' && <DetailRow label={t('Ab tak maal aaya')} value={money(received)} />}
        {!isOrder && <DetailRow label={t('Diye')} value={money(p.paidAmount)} />}
        {!isOrder && credit > 0 && <DetailRow label={t('Udhaar par')} value={money(credit)} />}
        {(p.returnedAmount ?? 0) > 0 && <DetailRow label={t('Maal wapas')} value={money(p.returnedAmount)} />}
        {p.dueDate && credit > 0 && <DetailRow label={t('Dena hai tak')} value={day(p.dueDate)} />}
        {p.expectedAt && open && <DetailRow label={t('Maal kab tak aayega')} value={day(p.expectedAt)} last={!p.notes} />}
        {p.notes ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{p.notes}</Text></View> : null}
      </DetailSection>

      <LandedCostPanel p={p} />

      {!!p.returns?.length && (
        <DetailSection title={t('Return')}>
          {p.returns.map((r, n) => (
            <DetailRow key={r.id} label={`${r.returnNumber} · ${day(r.createdAt)}${r.reason ? ` · ${r.reason}` : ''}`} value={money(r.total)} last={n === p.returns!.length - 1} />
          ))}
        </DetailSection>
      )}

      {canEdit && p.status !== 'CANCELLED' && !(p.returnedAmount ?? 0) && (
        <Button variant="ghost" icon={Ban} disabled={!online} onPress={() => setModal('cancel')}>{isOrder ? t('Order cancel') : t('Bill cancel')}</Button>
      )}

      <PrintSheet p={p} open={modal === 'print'} onClose={() => setModal(null)} />
      {modal === 'receive' && <ReceiveSheet p={p} onClose={() => setModal(null)} />}
      {modal === 'return' && <ReturnSheet p={p} onClose={() => setModal(null)} />}
      {modal === 'cancel' && <CancelSheet p={p} onClose={() => setModal(null)} />}
    </DetailTemplate>
  );
}

function PrintSheet({ p, open, onClose }: { p: Purchase; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [kind, setKind] = useState<'bill' | 'order'>(p.status === 'PENDING' ? 'order' : 'bill');
  const [hideRates, setHideRates] = useState(false);
  const doc = () => purchaseDoc(p, { kind, hideRates });
  return (
    <Sheet open={open} onClose={onClose} title={t('Print / invoice')}
      footer={<Row gap={2}>
        <Button variant="secondary" icon={Share2} style={{ flex: 1 }} onPress={() => void shareDoc(doc())}>{t('PDF')}</Button>
        <Button icon={Printer} style={{ flex: 1 }} onPress={() => void printDoc(doc())}>{t('Print')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={kind} onChange={(k) => setKind(k as 'bill' | 'order')} options={[{ value: 'bill', label: t('Purchase bill') }, { value: 'order', label: t('Order') }]} />
        {kind === 'order' && <Switch value={hideRates} onChange={setHideRates} label={t('Rates chhupayein')} />}
      </View>
    </Sheet>
  );
}

/** Quantity per line in its own unit, limited to `max`. */
function QtyLines({ p, max, qty, setQty }: { p: Purchase; max: (i: PurchaseItem) => number; qty: Record<string, number>; setQty: (v: Record<string, number>) => void }) {
  const th = useTheme();
  return (
    <View style={{ gap: th.space(2) }}>
      {p.items.filter((i) => max(i) > 0).map((i) => {
        const m = max(i) / rate(i);
        return (
          <Row key={i.id} gap={2} align="center">
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="medium" numberOfLines={1}>{nameOf(i)}</Text>
              <Text size="xs" tone="muted">{t('Zyada se zyada {{q3}} {{unitName}}', { q3: q3(m), unitName: i.unitName })}</Text>
            </View>
            <NumberInput containerStyle={{ width: 110 }} value={qty[i.id] ?? null} placeholder="0"
              onChangeValue={(v) => setQty({ ...qty, [i.id]: Math.min(Math.max(v ?? 0, 0), m) })} />
          </Row>
        );
      })}
    </View>
  );
}

function useDone(onClose: () => void) {
  const qc = useQueryClient();
  const refresh = useRefreshInventory();
  return () => { void qc.invalidateQueries({ queryKey: [PUR] }); void refresh({ purchasing: true }); onClose(); };
}

function ReceiveSheet({ p, onClose }: { p: Purchase; onClose: () => void }) {
  const th = useTheme();
  const done = useDone(onClose);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(p.items.map((i) => [i.id, left(i) / rate(i)])));
  const [paid, setPaid] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>(p.paymentMethod ?? 'CASH');
  const [close, setClose] = useState(false);
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.receive(p.id, {
      items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })),
      paidAmount: paid ?? 0, paymentMethod: method, close,
    }),
    onSuccess: (r) => { toast.success(r.status === 'RECEIVED' ? t('Maal aa gaya — order mukammal') : t('Itna maal aa gaya — baqi baad me')); done(); },
  });
  return (
    <Sheet open onClose={onClose} title={t('Maal aaya')} description={t('Jitna aaya utna likhein; baqi order khula rahega')}
      footer={<Button fullWidth loading={mut.isPending} disabled={value <= 0 && !close} onPress={() => mut.mutate()}>{t('Stock me daalein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <QtyLines p={p} max={left} qty={qty} setQty={setQty} />
        <Card tone="muted"><Text size="xs" tone="muted">{t('Is maal ki qeemat')}</Text><Text size="xl" weight="bold" ltr>{formatPKR(value)}</Text></Card>
        <MoneyInput label={t('Abhi kitne diye (is maal ke)')} value={paid} onChangeValue={setPaid} placeholder={t('0 = sab udhaar')} />
        <ChipGroup wrap value={method} onChange={(m) => setMethod(m as PaymentMethod)} options={PAY_METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />
        <Switch value={close} onChange={setClose} label={t('Baqi maal nahi aayega — order band karein')} />
      </View>
    </Sheet>
  );
}

function ReturnSheet({ p, onClose }: { p: Purchase; onClose: () => void }) {
  const th = useTheme();
  const done = useDone(onClose);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.returnGoods(p.id, { items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })), reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(t('{{value}} ka maal wapas — supplier ka khata kam ho gaya', { value: formatPKR(value) })); done(); },
  });
  const REASONS = [t('Kharab maal'), t('Ghalat maal aaya'), t('Expiry qareeb'), t('Zyada aa gaya')];
  return (
    <Sheet open onClose={onClose} title={t('Supplier ko maal wapas')} description={t('Stock kam hoga aur supplier ko dena (khata) utna ghat jayega')}
      footer={<Button fullWidth icon={RotateCcw} loading={mut.isPending} disabled={value <= 0} onPress={() => mut.mutate()}>{t('Wapas karein · {{value}}', { value: formatPKR(value) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <QtyLines p={p} max={canReturn} qty={qty} setQty={setQty} />
        <ChipGroup wrap value={reason} onChange={setReason} options={REASONS.map((r) => ({ value: r, label: r }))} />
        <Input value={reason} onChangeText={setReason} placeholder={t('Wajah — misaal: 5 packet phate hue the')} maxLength={200} />
      </View>
    </Sheet>
  );
}

function CancelSheet({ p, onClose }: { p: Purchase; onClose: () => void }) {
  const th = useTheme();
  const done = useDone(onClose);
  const [reason, setReason] = useState('');
  const isOrder = p.status === 'PENDING';
  const mut = useMutation({
    mutationFn: () => purchasesApi.cancel(p.id, reason.trim()),
    onSuccess: () => { toast.success(isOrder ? t('Order cancel') : t('Bill cancel — stock aur khata wapas')); done(); },
  });
  return (
    <Sheet open onClose={onClose} title={isOrder ? t('Order cancel karein?') : t('Bill cancel karein?')}
      description={isOrder ? t('Stock par koi asar nahi.') : t('Aaya hua maal stock se nikal jayega aur supplier ka khata ulat jayega.{{value}}', { value: p.paidAmount > 0 ? t(' Diye hue {{paidAmount}} supplier se wapas lene honge.', { paidAmount: formatPKR(p.paidAmount) }) : '' })}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button variant="danger" style={{ flex: 1 }} loading={mut.isPending} disabled={!reason.trim()} onPress={() => mut.mutate()}>{t('Cancel karein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(3) }}>
        <Input value={reason} onChangeText={setReason} placeholder={t('Wajah — misaal: ghalat supplier chuna tha')} maxLength={200} autoFocus />
      </View>
    </Sheet>
  );
}
