/**
 * Items and money of an order: the lines with their product match and
 * stock, totals, how the customer pays (delivery charge choice, advances,
 * COD to collect), true profit with selling costs (and fixing them by
 * hand), online payment links, the bill and the order's journey.
 */

import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  Ban, Bike, CheckCircle2, Clock, Copy, CreditCard, Gift, Link2, MessageCircle, Package, Pencil, Plus, Printer, Receipt, Share2, Sparkles,
  Trash2, TrendingDown, TrendingUp, Truck, Wallet,
} from 'lucide-react-native';
import {
  COST_KINDS, canAddAdvance, deliveryChoice, isSavedCost, moneyOf, openLinks, orderNo, paidLinks, shownCosts, stockState, waNumber,
  type AdvanceMethod, type CostKind, type DeliveryMode, type OnlineOrderDetail,
} from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { formatDateTime, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import {
  Amount, Badge, Button, Card, ChipGroup, Divider, Icon, Input, MoneyInput, Segmented, Sheet, Text, confirm, toast, useTheme,
} from '@/design';
import { apiErrorMessage, moneyApi, ordersApi, paymentsApi } from '../../api/online';
import { ADVANCE_METHODS, COST_LABEL, COST_SOURCE, DELIVERY_MODES, PAYMENT_LABEL } from '../../lib/labels';
import { KEYS } from '../../lib/online';
import { copyText, openWhatsApp } from '../../lib/device';
import { payLinkText, useShopLanguage } from '../../lib/messages';
import { BrandLogo, brandForPayment } from '../BrandLogo';

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

function Line({ label, value, hint, strong, tone }: { label: string; value: React.ReactNode; hint?: string; strong?: boolean; tone?: 'success' | 'danger' | 'muted' }) {
  const th = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: th.space(3) }}>
      <View style={{ flex: 1 }}>
        <Text size="sm" weight={strong ? 'bold' : 'regular'} tone={strong ? 'default' : 'secondary'}>{label}</Text>
        {hint ? <Text size="2xs" tone="muted">{hint}</Text> : null}
      </View>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text size={strong ? 'base' : 'sm'} weight={strong ? 'bold' : 'semibold'} tone={tone === 'muted' ? 'muted' : tone ?? 'default'} ltr tabular>{value}</Text>
        : value}
    </View>
  );
}

/** Lines with the matched Nafaa product, stock (new orders) and totals. */
export function ItemsCard({ order: o }: { order: OnlineOrderDetail }) {
  const th = useTheme();
  const isPending = o.orderStatus === 'PENDING';
  return (
    <Card title={t('Items ({{count}})', { count: o.lines.length })} flush>
      {o.lines.map((l, i) => {
        const st = l.match ? stockState(l.match.stock) : null;
        const img = l.image ?? l.match?.image;
        return (
          <View key={l.index} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(3), borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
            <View style={{ width: 44, height: 44, borderRadius: th.radius('md'), backgroundColor: th.colors.surfaceMuted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {img ? <Image source={{ uri: img }} style={{ width: 44, height: 44 }} /> : <Icon icon={Package} size={20} tone="subtle" />}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text size="sm" weight="bold" numberOfLines={2}>{l.name}{l.variant ? <Text size="sm" tone="muted"> · {l.variant}</Text> : null}</Text>
              <Text size="xs" tone="muted" ltr>{l.quantity} × {formatMoney(l.price)}{l.sku ? ` · ${l.sku}` : ''}</Text>
              {l.match ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon icon={CheckCircle2} size={12} color={!isPending || l.match.enough ? th.colors.success.text : th.colors.danger.text} />
                  <Text size="2xs" weight="semibold" numberOfLines={1} style={{ flex: 1 }} color={!isPending || l.match.enough ? th.colors.success.text : th.colors.danger.text}>
                    {l.match.name}{isPending && st ? ` · ${st.kind === 'ok' ? t('stock {{n}}', { n: st.n }) : st.kind === 'out' ? t('stock khatam') : t('stock khatam ({{n}} zyada bik chuke)', { n: st.n })}` : ''}
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon icon={Link2} size={12} color={th.colors.warning.text} />
                  <Text size="2xs" weight="semibold" color={th.colors.warning.text}>{t('Nafaa product se jodna hai')}</Text>
                </View>
              )}
            </View>
            <Amount value={l.lineTotal} weight="bold" size="sm" />
          </View>
        );
      })}
      <View style={{ borderTopWidth: 1, borderTopColor: th.colors.divider, padding: th.space(4), gap: th.space(1.5) }}>
        <Line label={t('Items')} value={formatMoney(o.subtotal)} />
        {o.discount > 0 && <Line label={t('Discount')} value={`− ${formatMoney(o.discount)}`} />}
        <Line label={t('Delivery{{value}}', { value: o.metadata?.shippingMethod ? ` (${o.metadata.shippingMethod})` : '' })} value={o.deliveryFee > 0 ? formatMoney(o.deliveryFee) : t('Free')} />
        <Line strong label={t('Total')} value={formatMoney(o.total)} />
      </View>
    </Card>
  );
}

/** How the customer pays, the delivery charge, advances received and COD still to collect. */
export function MoneyCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const m = moneyOf(o);
  const pay = PAYMENT_LABEL[o.paymentStatus] ?? PAYMENT_LABEL.PENDING;
  const closed = CLOSED.includes(o.orderStatus);
  const links = paidLinks(o);
  const booked = (o.metadata as { courierBooking?: { cod?: number } } | null)?.courierBooking;
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const collectLabel = !o.courierCode ? t('Customer se lena (COD)') : t('{{value}} customer se lega (COD)', { value: o.courierCode === 'RIDER' ? t('Rider') : o.courierLabel ?? 'Courier' });

  const paid = useMutation({
    mutationFn: () => ordersApi.paymentReceived(o.id),
    onSuccess: () => { haptic('success'); onChanged(); toast.success(t('Paisa mil gaya — mark ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (ref: string) => ordersApi.removeAdvance(o.id, ref),
    onSuccess: () => { onChanged(); toast.success(t('Advance hata diya')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const delivery = m.deliveryMode === 'RIDER'
    ? { icon: Bike, label: t('Delivery — rider ki'), value: formatMoney(m.deliveryFee), hint: t('Rider khud leta hai — bill aur sale me shamil nahi') }
    : m.deliveryMode === 'FREE'
      ? { icon: Gift, label: t('Delivery — free'), value: formatMoney(0), hint: t('Customer se nahi li — kharcha dukaan ka') }
      : { icon: Truck, label: t('Delivery — customer se'), value: formatMoney(m.deliveryFee), hint: o.metadata?.shippingMethod ?? t('Total me shamil') };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <Icon icon={Wallet} size={20} tone="subtle" />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="bold">{o.metadata?.paymentTitle ?? o.paymentMethod ?? t('Cash on Delivery')}</Text>
          <Text size="xs" tone="muted">
            {o.paymentStatus === 'PAID'
              ? t('Paisa mil gaya{{value}}{{value2}}', { value: o.paymentReceivedAt ? ` · ${formatDateTime(o.paymentReceivedAt)}` : '', value2: o.codSettlementRef ? t(' · ref {{codSettlementRef}}', { codSettlementRef: o.codSettlementRef }) : '' })
              : o.paymentStatus === 'COLLECTED' ? t('{{value}} ne customer se le liya — settlement par aap ko milega', { value: o.courierLabel ?? 'Courier' })
                : o.paymentStatus === 'NOT_COLLECTED' ? t('Parcel wapas aaya — paisa nahi aayega')
                  : o.isCod ? t('Delivery par cash (COD)') : t('Payment baqi')}
          </Text>
        </View>
        <Badge tone={pay.tone}>{t(pay.label)}</Badge>
      </View>
      {canManage && o.paymentStatus !== 'PAID' && o.nafaaSaleId && !closed && (
        <Button size="sm" variant="secondary" icon={CheckCircle2} loading={paid.isPending} style={{ marginTop: th.space(2), alignSelf: 'flex-start' }}
          onPress={async () => { if (await confirm({ title: t('Paisa mil gaya?'), message: t('Order paid mark hoga — COD baqi list se nikal jayega.'), confirmLabel: t('Paisa mil gaya') })) paid.mutate(); }}>
          {t('Paisa mil gaya')}
        </Button>
      )}
      <Divider style={{ marginVertical: th.space(3) }} />
      <View style={{ gap: th.space(2) }}>
        <Line label={t('Order total')} value={formatMoney(o.total)} />
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          <Icon icon={delivery.icon} size={14} tone="subtle" />
          <View style={{ flex: 1 }}><Line label={delivery.label} value={delivery.value} hint={delivery.hint} /></View>
        </View>
        {canManage && <DeliveryChoice order={o} onChanged={onChanged} />}
        {links.map((l) => {
          const manual = l.provider === 'MANUAL';
          const meth = ADVANCE_METHODS.find((x) => x.value === l.method) ?? ADVANCE_METHODS[4];
          return (
            <View key={l.ref} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              <BrandLogo name={manual ? brandForPayment(l.method) : brandForPayment(l.provider)} size={18} />
              <View style={{ flex: 1 }}>
                <Line label={`${l.kind === 'FULL' ? t('Poori payment') : t('Advance')} — ${manual ? t(meth.label) : t('payment link')}`}
                  hint={[l.reference && `Ref ${l.reference}`, formatDateTime(l.paidAt ?? l.createdAt)].filter(Boolean).join(' · ')}
                  value={`− ${formatMoney(l.amount)}`} tone="success" />
              </View>
              {manual && canManage && o.paymentStatus !== 'PAID' && (
                <Button size="sm" variant="ghost" icon={Trash2} accessibilityLabel={t('Advance hatayein')} loading={remove.isPending && remove.variables === l.ref}
                  onPress={async () => { if (await confirm({ title: t('{{amount}} ka advance hatayein?', { amount: formatMoney(l.amount) }), message: t('COD phir utna barh jayega.'), tone: 'danger', confirmLabel: t('Hatayein') })) remove.mutate(l.ref); }} />
              )}
            </View>
          );
        })}
        <View style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(3) }}>
          <Line strong label={o.paymentStatus === 'PAID' ? t('Lena baqi') : collectLabel}
            hint={m.advance > 0 ? t('Total {{total}} − advance {{advance}}', { total: formatMoney(o.total), advance: formatMoney(m.advance) }) : undefined}
            value={m.codDue > 0 ? formatMoney(m.codDue) : t('Kuch nahi')} tone={m.codDue > 0 ? undefined : 'success'} />
        </View>
        {booked?.cod != null && o.courierBooked && Math.round(Number(booked.cod)) !== Math.round(m.codDue) && o.paymentStatus !== 'PAID' && (
          <Text size="2xs" weight="semibold" tone="warning">{t('Courier booking par COD {{rs}} likha gaya tha — farq ho to courier portal par COD theek karwayein.', { rs: formatMoney(Number(booked.cod)) })}</Text>
        )}
      </View>
      {canManage && canAddAdvance(o) && (
        <Button size="sm" variant="secondary" icon={Plus} style={{ marginTop: th.space(3), alignSelf: 'flex-start' }} onPress={() => setAdvanceOpen(true)}>{t('Advance likhein')}</Button>
      )}
      <AdvanceSheet open={advanceOpen} order={o} due={m.codDue} onClose={() => setAdvanceOpen(false)} onDone={() => { setAdvanceOpen(false); onChanged(); }} />
    </Card>
  );
}

/** Who pays the delivery: switchable before the bill; after it, shown with the reason. */
function DeliveryChoice({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const th = useTheme();
  const m = moneyOf(o);
  const fee = m.originalFee ?? m.deliveryFee;
  const { show, locked } = deliveryChoice(o);
  const set = useMutation({
    mutationFn: (mode: DeliveryMode) => moneyApi.setDelivery(o.id, mode),
    onSuccess: (_r, mode) => {
      onChanged();
      toast.success(mode === 'FREE' ? t('Delivery free — total {{fee}} kam', { fee: formatMoney(fee) }) : mode === 'RIDER' ? t('Delivery rider rakhega — bill me shamil nahi') : t('Delivery customer se — total me shamil'));
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!show) return null;
  return (
    <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: th.colors.border, borderRadius: th.radius('md'), padding: th.space(2.5), gap: th.space(2) }}>
      <Text size="2xs" weight="semibold" tone="muted">{t('Is order ki delivery ({{fee}})', { fee: formatMoney(fee) })}</Text>
      <ChipGroup wrap value={m.deliveryMode} onChange={(v) => { if (v !== m.deliveryMode && !locked && !set.isPending) set.mutate(v as DeliveryMode); }}
        options={DELIVERY_MODES.map((x) => ({ value: x.value, label: t(x.label), disabled: locked || set.isPending }))} />
      <Text size="2xs" tone="muted">{locked ? t('Bill ban chuka hai — delivery ab yahan se nahi badalti.') : t('Accept se pehle chunein — bill aur COD isi hisaab se banenge.')}</Text>
    </View>
  );
}

function AdvanceSheet({ open, order: o, due, onClose, onDone }: { open: boolean; order: OnlineOrderDetail; due: number; onClose: () => void; onDone: () => void }) {
  const th = useTheme();
  const start = () => (o.deliveryFee > 0 && o.deliveryFee < due ? Math.round(o.deliveryFee) : null);
  const [amount, setAmount] = useState<number | null>(start);
  const [method, setMethod] = useState<AdvanceMethod>('JAZZCASH');
  const [reference, setReference] = useState('');
  useEffect(() => { if (open) { setAmount(start()); setReference(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = amount ?? 0;
  const valid = n >= 1 && n <= due;
  const save = useMutation({
    mutationFn: () => ordersApi.addAdvance(o.id, { amount: n, method, reference: reference.trim() || undefined }),
    onSuccess: () => { haptic('success'); toast.success(t('{{rs}} advance likh diya — COD ab {{rs2}}', { rs: formatMoney(n), rs2: formatMoney(Math.max(0, due - n)) })); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Advance likhein')} description={t('Customer ne pehle paisa bhej diya? Likhein — courier sirf baqi COD lega.')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!valid} onPress={() => save.mutate()}>{t('Advance save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <ChipGroup wrap value={method} onChange={(v) => setMethod(v as AdvanceMethod)} options={ADVANCE_METHODS.map((x) => ({ value: x.value, label: t(x.label) }))} />
        <MoneyInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} hint={t('Baqi {{due}}', { due: formatMoney(due) })} error={amount != null && !valid ? t('1 se {{due}} tak', { due }) : undefined} />
        <View style={{ flexDirection: 'row', gap: th.space(2) }}>
          {o.deliveryFee > 0 && o.deliveryFee < due && <Button size="sm" variant="secondary" onPress={() => setAmount(Math.round(o.deliveryFee))}>{t('Sirf delivery {{deliveryFee}}', { deliveryFee: formatMoney(o.deliveryFee) })}</Button>}
          <Button size="sm" variant="secondary" onPress={() => setAmount(due)}>{t('Poora {{due}}', { due: formatMoney(due) })}</Button>
        </View>
        <Input label={t('Transaction / slip number (optional)')} value={reference} onChangeText={setReference} maxLength={80} placeholder={t('Jaise TID 1234567')} ltr />
      </View>
    </Sheet>
  );
}

/** True profit (for people who may see cost) and the selling costs with where each came from. */
export function ProfitCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const [editing, setEditing] = useState(false);
  const c = o.sellingCosts;
  const p = o.nafaaSaleId ? o.profit : undefined;
  if (!c) return null;
  if (['CANCELLED', 'REJECTED'].includes(o.orderStatus) && !o.dispatchedAt) return null;
  const done = ['DELIVERED', 'RETURNED'].includes(o.orderStatus);
  const shown = shownCosts(c);
  return (
    <Card title={p ? t('Asli profit') : t('Selling costs')}
      action={canManage ? <Button size="sm" variant="ghost" icon={Pencil} onPress={() => setEditing(true)}>{t('Cost theek karein')}</Button> : undefined}>
      {!done && <Badge tone="neutral" style={{ marginBottom: th.space(2) }}>{t('abhi andaza')}</Badge>}
      {p && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: th.space(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1.5) }}>
            <Icon icon={p.profit >= 0 ? TrendingUp : TrendingDown} size={20} color={p.profit >= 0 ? th.colors.success.text : th.colors.danger.text} />
            <Amount value={p.profit} size="2xl" weight="heavy" colorize signed />
          </View>
          {p.margin !== null && <Text size="xs" tone="muted">{t('Margin')} <Text size="xs" weight="bold" tone={p.margin >= 0 ? 'default' : 'danger'} ltr>{p.margin}%</Text></Text>}
        </View>
      )}
      <View style={{ gap: th.space(1.5) }}>
        {p && <>
          <Line label={t('Sale (maal)')} value={formatMoney(p.sale)} hint={o.orderStatus === 'RETURNED' ? t('Parcel wapas — bill void') : undefined} />
          <Line label={t('Product cost')} value={`− ${formatMoney(p.cost)}`} />
          {p.deliveryCollected > 0 && <Line label={t('Delivery customer se mili')} value={`+ ${formatMoney(p.deliveryCollected)}`} tone="success" />}
        </>}
        {shown.map((k) => (
          <Line key={k} label={t(COST_LABEL[k])} hint={COST_SOURCE[c[k].source] ? t(COST_SOURCE[c[k].source]) : undefined} value={`− ${formatMoney(c[k].value)}`} tone={c[k].source === 'ESTIMATE' ? 'muted' : undefined} />
        ))}
        {!shown.length && <Text size="xs" tone="muted">{t('Is order par abhi koi selling cost nahi.')}</Text>}
        <Divider />
        <Line strong label={t('Selling costs total')} value={`− ${formatMoney(c.total)}`} />
      </View>
      {c.courierMissing && (
        <View style={{ flexDirection: 'row', gap: th.space(2), backgroundColor: th.colors.warning.soft, borderRadius: th.radius('md'), padding: th.space(2.5), marginTop: th.space(2) }}>
          <Icon icon={Sparkles} size={14} color={th.colors.warning.text} />
          <Text size="xs" color={th.colors.warning.text} style={{ flex: 1 }} onPress={() => router.push('/online/costs' as never)}>
            {o.courierLabel ? t('{{courier}} ka rate likha nahi — Selling costs me rate likhein, profit khud ban jayega.', { courier: o.courierLabel }) : t('Is courier ka rate likha nahi — Selling costs me rate likhein, profit khud ban jayega.')}
          </Text>
        </View>
      )}
      {o.costPosting?.on && (
        <Text size="2xs" tone="muted" style={{ marginTop: th.space(2) }}>
          {o.costPosting.postedAt
            ? t('Expense {{value}} me likha gaya · {{postedAt}} — P&L me shamil', { value: o.costPosting.expenseNumber ?? '', postedAt: formatDateTime(o.costPosting.postedAt) })
            : done ? t('Ye order setting chalu hone se pehle band hua — is ke costs Expenses me nahi likhe gaye. Statement milane ya cost theek karne par likh diye jayenge.')
              : t('Deliver ya wapas hote hi ye costs Expenses me khud likhe jayenge (P&L).')}
        </Text>
      )}
      <EditCostsSheet open={editing} order={o} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onChanged(); }} />
    </Card>
  );
}

function EditCostsSheet({ open, order: o, onClose, onSaved }: { open: boolean; order: OnlineOrderDetail; onClose: () => void; onSaved: () => void }) {
  const th = useTheme();
  const c = o.sellingCosts!;
  const init = () => Object.fromEntries(COST_KINDS.map((k) => [k, isSavedCost(c[k].source) ? c[k].value : null])) as Record<CostKind, number | null>;
  const [vals, setVals] = useState(init);
  useEffect(() => { if (open) setVals(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => moneyApi.setCosts(o.id, vals),
    onSuccess: () => { toast.success(t('Costs save ho gayi')); onSaved(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Order #{{value}} — costs', { value: orderNo(o) })}
      description={t('Courier ki asli raseed ya statement se amount likhein. Khali chhorein to rate card wala andaza lagega.')}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {COST_KINDS.map((k) => (
          <MoneyInput key={k} label={t('{{value}} (Rs)', { value: t(COST_LABEL[k]) })} value={vals[k]} onChangeValue={(v) => setVals((s) => ({ ...s, [k]: v }))}
            placeholder={c[k].value ? t('Andaza {{value}}', { value: Math.round(c[k].value) }) : t('Khali')} />
        ))}
      </View>
    </Sheet>
  );
}

/** Online payment link: the full amount due or just an advance (like the delivery charge). */
export function PaymentLinkCard({ order: o, canManage, onChanged }: { order: OnlineOrderDetail; canManage: boolean; onChanged: () => void }) {
  const th = useTheme();
  const lang = useShopLanguage();
  const gws = useQuery({ queryKey: KEYS.payments, queryFn: paymentsApi.accounts, staleTime: 5 * 60_000 });
  const ready = (gws.data ?? []).filter((g) => g.connected && g.active);
  const open = openLinks(o);
  const advance = paidLinks(o).reduce((s, l) => s + l.amount, 0);
  const due = Math.max(0, Math.round(o.total - advance));
  const risky = o.risk?.level === 'HIGH' || o.risk?.level === 'WATCH';
  const [mode, setMode] = useState<'full' | 'delivery' | 'custom'>(risky ? 'delivery' : 'full');
  const [custom, setCustom] = useState<number | null>(null);
  const [gw, setGw] = useState('');
  const [last, setLast] = useState<{ url: string; amount: number; kind: string } | null>(null);
  const provider = ready.find((g) => g.code === gw) ?? ready[0];
  const amount = mode === 'full' ? due : mode === 'delivery' ? Math.min(due, Math.round(o.deliveryFee) || 0) : custom ?? 0;
  const make = useMutation({
    mutationFn: () => paymentsApi.createLink(o.id, { provider: provider!.code, amount }),
    onSuccess: (r) => { setLast(r); onChanged(); toast.success(t('Payment link ban gaya — customer ko bhejein')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (CLOSED.includes(o.orderStatus) || (o.paymentStatus === 'PAID' && !open.length)) return null;
  if (!ready.length && !open.length) return null;
  return (
    <Card title={t('Online payment')} action={advance > 0 ? <Text size="xs" weight="bold" tone="success">{t('{{advance}} mil chuka', { advance: formatMoney(advance) })}</Text> : undefined}>
      <View style={{ gap: th.space(3) }}>
        {open.map((l) => (
          <View key={l.ref} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
            <BrandLogo name={brandForPayment(l.provider)} size={20} />
            <Badge tone={l.status === 'PENDING' ? 'warning' : l.status === 'FAILED' ? 'danger' : 'neutral'}>
              {l.status === 'PENDING' ? t('Intezar') : l.status === 'FAILED' ? t('Nahi hua') : t('Khatam')}
            </Badge>
            <Text size="xs" weight="semibold" ltr>{formatMoney(l.amount)}</Text>
            <Text size="xs" tone="muted" style={{ flex: 1 }}>· {formatDateTime(l.createdAt)}</Text>
          </View>
        ))}
        {canManage && o.paymentStatus !== 'PAID' && due > 0 && provider && (
          <>
            <ChipGroup wrap value={mode} onChange={(v) => setMode(v as typeof mode)} options={[
              { value: 'full', label: t('Poori · {{due}}', { due: formatMoney(due) }) },
              ...(o.deliveryFee > 0 ? [{ value: 'delivery' as const, label: t('Delivery · {{rs}}', { rs: formatMoney(Math.min(due, o.deliveryFee)) }) }] : []),
              { value: 'custom', label: t('Apni amount') },
            ]} />
            {ready.length > 1 && <Segmented value={provider.code} onChange={setGw} options={ready.map((g) => ({ value: g.code, label: g.name }))} />}
            {mode === 'custom' && <MoneyInput label={t('Amount')} value={custom} onChangeValue={setCustom} placeholder={t('1 se {{due}} tak', { due })} />}
            <Button icon={CreditCard} loading={make.isPending} disabled={!(amount >= 1 && amount <= due)} onPress={() => make.mutate()}>
              {t('{{rs}} ka link banayein ({{name}})', { rs: formatMoney(amount || 0), name: provider.name })}
            </Button>
          </>
        )}
        {last && (
          <View style={{ flexDirection: 'row', gap: th.space(2) }}>
            {waNumber(o.customerPhone) && <Button size="sm" variant="success" icon={MessageCircle} style={{ flex: 1 }}
              onPress={() => openWhatsApp(o.customerPhone, payLinkText(lang, { customerName: o.customerName, number: orderNo(o), total: o.total }, last.amount, last.kind === 'ADVANCE', last.url))}>{t('WhatsApp par bhejein')}</Button>}
            <Button size="sm" variant="secondary" icon={Copy} onPress={() => copyText(last.url, t('Link copy ho gaya'))}>{t('Link copy')}</Button>
          </View>
        )}
      </View>
    </Card>
  );
}

/** The bill made on accept: invoice (print or share) and the sale receipt. */
export function BillCard({ order: o, onInvoice }: { order: OnlineOrderDetail; onInvoice: (mode: 'print' | 'share') => void }) {
  const th = useTheme();
  if (!o.sale) return null;
  const voided = o.sale.status === 'VOIDED';
  return (
    <Card tone={voided ? 'muted' : 'success'}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
        <Icon icon={Receipt} size={20} color={th.colors.success.text} />
        <View style={{ flex: 1 }}>
          <Text size="sm" weight="bold">{t('Bill {{saleNumber}}', { saleNumber: o.sale.saleNumber })}</Text>
          <Text size="xs" tone="muted">{voided ? t('Void ho gaya — stock wapas aa gaya') : `${formatMoney(o.sale.total)}${o.sale.shop ? ` · ${o.sale.shop.name}` : ''}`}</Text>
        </View>
      </View>
      {!voided && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2), marginTop: th.space(3) }}>
          <Button size="sm" variant="secondary" icon={Printer} onPress={() => onInvoice('print')}>{t('Invoice')}</Button>
          <Button size="sm" variant="secondary" icon={Share2} onPress={() => onInvoice('share')}>{t('Share')}</Button>
          <Button size="sm" variant="ghost" icon={Receipt} onPress={() => router.push(`/sales/${o.sale!.id}` as never)}>{t('Receipt')}</Button>
        </View>
      )}
    </Card>
  );
}

/** Order received → accepted → handed over → delivered / returned / cancelled. */
export function TimelineCard({ order: o }: { order: OnlineOrderDetail }) {
  const th = useTheme();
  const closed = CLOSED.includes(o.orderStatus);
  const steps: Array<{ done: boolean; bad?: boolean; at?: string | null; label: string; icon: typeof Clock }> = [
    { done: true, at: o.receivedAt, label: t('Order aaya'), icon: Clock },
    { done: !!o.acceptedAt, at: o.acceptedAt, label: t('Accept — bill bana, stock kam hua'), icon: CheckCircle2 },
    {
      done: !!o.dispatchedAt, at: o.dispatchedAt, icon: Truck,
      label: t('Rider/courier ko diya{{value}}{{value2}}', {
        value: o.courierLabel ?? o.courierName ? ` (${o.courierLabel ?? o.courierName})` : '',
        value2: o.trackingNumber ? t(' · CN {{trackingNumber}}', { trackingNumber: o.trackingNumber }) : '',
      }),
    },
    o.orderStatus === 'RETURNED'
      ? { done: true, bad: true, at: o.returnedAt, label: t('Parcel wapas aaya (RTO){{value}}', { value: o.returnReason ? ` — ${o.returnReason}` : '' }), icon: Ban }
      : closed
        ? { done: true, bad: true, at: o.cancelledAt, label: t('Cancel{{value}}', { value: o.cancelReason ? ` — ${o.cancelReason}` : '' }), icon: Ban }
        : { done: !!o.deliveredAt, at: o.deliveredAt, label: t('Customer ko mil gaya'), icon: Package },
  ];
  return (
    <Card title={t('Order ka safar')}>
      <View style={{ gap: th.space(3) }}>
        {steps.map((s, i) => {
          const c = s.bad ? th.colors.danger : s.done ? th.colors.success : th.colors.neutral;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3) }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Icon icon={s.icon} size={14} color={c.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text size="sm" weight="bold" tone={s.done ? 'default' : 'subtle'}>{s.label}</Text>
                {s.at ? <Text size="2xs" tone="muted">{formatDateTime(s.at)}</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
