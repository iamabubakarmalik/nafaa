/**
 * Takes payment for a restaurant order (web useOrderPayment + the shared
 * checkout): full, part payment with the rest on khata, or all on khata;
 * one method or a split (cash + card …, or equal shares per guest). The
 * server turns the order into a bill (Sale), so the money reaches the day
 * book, cash drawer, khata and reports once. Shop rules (discount limit,
 * credit limit) ask for the owner's PIN through the shared PIN sheet.
 */

import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { BookOpen, Check, Split, Users, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { CASH_NOTES, keypad, roundUpTo, splitSummary, tenderSummary, type PaymentMethod, type PosCheckoutMode, type SplitRow } from '@nafaa/core/pos';
import { equalShares, r2 } from '@nafaa/core/restaurant';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useCustomerSearch } from '@/core/offline';
import { PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Icon, ListRow, PressableScale, Row, SearchBar, Segmented, Sheet, Text, toast, useDebouncedValue, useLayout, useTheme } from '@/design';
import { useCounter } from '@/modules/pos/engine/counter';
import { Keypad, METHODS, MethodGrid, methodLabel, Stepper } from '@/modules/pos/components/parts';
import { ordersApi, type CheckoutPart, type RestaurantOrder } from '../api';
import { apiError, orderTitle, refreshOrders } from '../meta';

const MODES: Array<{ value: PosCheckoutMode; label: string }> = [
  { value: 'full', label: msg('Full payment') },
  { value: 'partial', label: msg('Part payment') },
  { value: 'credit', label: msg('All on khata') },
];

export interface PayCustomer { id: string; name: string; balance?: number }

export function usePayOrder(onPaid?: (o: RestaurantOrder) => void) {
  const [target, setTarget] = useState<{ order: RestaurantOrder; customer?: PayCustomer | null; print: boolean } | null>(null);
  const open = (order: RestaurantOrder, customer?: PayCustomer | null, print = true) => {
    if (!order.items.some((it) => !it.isReturned)) { toast.error(t('Order me koi item nahi')); return; }
    setTarget({ order, customer, print });
  };
  const sheet = <PaySheet target={target} onClose={() => setTarget(null)} onPaid={(o) => { setTarget(null); onPaid?.(o); }} />;
  return { open, sheet };
}

function PaySheet({ target, onClose, onPaid }: {
  target: { order: RestaurantOrder; customer?: PayCustomer | null; print: boolean } | null;
  onClose: () => void;
  onPaid: (o: RestaurantOrder) => void;
}) {
  const th = useTheme();
  const { isTablet } = useLayout();
  const counter = useCounter();
  const order = target?.order;
  const due = order ? r2(Math.max(order.total - order.paidAmount, 0)) : 0;
  const [customer, setCustomer] = useState<PayCustomer | null>(null);
  const [mode, setMode] = useState<PosCheckoutMode>('full');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tendered, setTendered] = useState('');
  const [split, setSplit] = useState(false);
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [active, setActive] = useState(0);
  const [people, setPeople] = useState(2);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q.trim(), 200);
  const found = useCustomerSearch({ query, limit: 20 }, { enabled: pickCustomer });

  useEffect(() => {
    if (!target) return;
    setCustomer(target.customer ?? (target.order.customerId ? { id: target.order.customerId, name: target.order.customerName ?? t('Customer') } : null));
    setMode('full'); setMethod(counter.defaultMethod); setTendered(''); setSplit(false); setRows([]); setActive(0);
    setPeople(Math.max(2, target.order.numberOfGuests ?? 2)); setPickCustomer(false); setQ('');
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const splitting = split && mode !== 'credit';
  const sum = splitSummary(rows, due);
  const single = tenderSummary(mode, due, Number(tendered) || 0);
  const paid = splitting ? sum.paid : single.paid;
  const change = Math.max(paid - due, 0);
  const credit = Math.max(due - paid, 0);
  const isCredit = credit > 0.005;
  const short = splitting && mode === 'full' && isCredit;
  const needCustomer = isCredit && !short && !customer;
  const blocked = isCredit && !short && (!customer || !counter.rules.allowCredit);

  const pay = useMutation({
    mutationFn: async () => {
      const o = order!;
      let payments: CheckoutPart[];
      if (splitting) {
        payments = (rows as Array<SplitRow & { note?: string }>).map((r) => ({ method: r.method, amount: r2(Number(r.amount) || 0), ...(r.note ? { paidBy: r.note } : {}) }))
          .filter((p) => p.method !== 'TRADE_IN' && p.amount > 0);
      } else {
        const amount = isCredit ? Math.min(paid, due) : paid;
        payments = amount > 0 ? [{ method, amount: r2(amount) }] : [];
      }
      return withManagerPin(t('Bill ke liye malik ka PIN'), (managerPin) => ordersApi.checkout(o.id, {
        payments,
        ...(isCredit && { closeOnCredit: true }),
        ...(customer?.id && { customerId: customer.id }),
        ...(managerPin && { managerPin }),
      }), isCredit ? 'credit' : 'discount');
    },
    onSuccess: (o) => {
      refreshOrders(true);
      toast.success(t('Bill ban gaya{{value}}', { value: o.sale?.saleNumber ? ` — ${o.sale.saleNumber}` : '' }));
      if (target?.print && o.saleId) router.push(`/pos/receipt/${o.saleId}` as never);
      onPaid(o);
    },
    onError: (e) => { if (!(e instanceof PinCancelled)) toast.error(apiError(e, t('Payment nahi hui'))); },
  });

  const choose = (m: PosCheckoutMode) => {
    if (m !== 'full' && !counter.rules.allowCredit) { toast.error(t('Khata is turned off in this shop')); return; }
    setMode(m);
    setTendered('');
    if (m !== 'full' && !customer) setPickCustomer(true);
  };
  const press = (k: string) => {
    if (splitting) { setRows(rows.map((x, i) => (i === active ? { ...x, amount: keypad(x.amount, k) } : x))); return; }
    if (mode === 'credit') setMode('full');
    setTendered((v) => keypad(v, k));
  };
  const addNote = (n: number) => {
    if (splitting) { setRows(rows.map((x, i) => (i === active ? { ...x, amount: String((Number(x.amount) || 0) + n) } : x))); return; }
    setTendered((v) => String((Number(v) || 0) + n));
  };
  const startSplit = () => { setRows([{ method, amount: '' }, { method: method === 'CASH' ? 'CARD' : 'CASH', amount: '' }]); setActive(0); setSplit(true); };
  const equal = (n: number) => {
    setPeople(n);
    setRows(equalShares(due, n).map((a, i) => ({ method: 'CASH', amount: String(a), note: t('Mehman {{n}}', { n: i + 1 }) } as SplitRow)));
    setActive(0);
    setSplit(true);
  };
  const submit = () => {
    if (pay.isPending) return;
    if (splitting && sum.problem === 'change_not_cash') { toast.error(t('Change can only be given from cash. Do not enter more than the bill by card, wallet or trade-in.')); return; }
    if (short) { toast.error(t('{{amount}} still due. Add another payment or choose "Part payment".', { amount: formatMoney(credit) })); return; }
    if (needCustomer) { setPickCustomer(true); return; }
    if (blocked) { toast.error(t('Khata is turned off in this shop. Take the full amount.')); return; }
    if (mode === 'partial' && paid <= 0) { toast.error(t('Enter how much was paid')); return; }
    pay.mutate();
  };

  const action = pay.isPending ? t('Saving…')
    : short ? t('{{amount}} due — add a payment', { amount: formatMoney(credit) })
      : mode === 'credit' ? t('Put on khata · {{total}}', { total: formatMoney(due) })
        : isCredit ? t('{{paid}} paid · {{credit}} on khata', { paid: formatMoney(paid), credit: formatMoney(credit) })
          : change > 0 ? t('Done · give back {{change}}', { change: formatMoney(change) }) : t('Done · {{total}}', { total: formatMoney(due) });

  return (
    <Sheet open={!!target} onClose={() => { if (!pay.isPending) onClose(); }} height={isTablet ? undefined : 0.94}
      title={order ? (
        <View style={{ gap: 2 }}>
          <Text size="sm" tone="muted" numberOfLines={1}>{orderTitle(order)} · {customer ? customer.name : t('Walk-in customer')}</Text>
          <Amount value={due} size="3xl" weight="bold" />
        </View>
      ) : undefined}
      footer={
        <View style={{ gap: th.space(2) }}>
          {needCustomer && <Text size="sm" weight="medium" color={th.colors.danger.text}>{t('Choose a customer on the bill to put money on khata')}</Text>}
          <Button size="xl" fullWidth icon={Check} loading={pay.isPending} variant={isCredit ? 'critical' : 'primary'} onPress={submit}>{action}</Button>
        </View>
      }>
      {pickCustomer ? (
        <View style={{ gap: th.space(2) }}>
          <Row justify="between"><Text weight="semibold">{t('Customer chunein')}</Text><Button size="sm" variant="ghost" icon={X} onPress={() => setPickCustomer(false)}>{t('Close')}</Button></Row>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam ya phone')} />
          {(found.data ?? []).map((c) => (
            <ListRow key={c.id} title={c.name} subtitle={c.phone ?? undefined} trailing={c.balance ? <Amount value={c.balance} size="sm" tone="warning" /> : undefined}
              onPress={() => { setCustomer({ id: c.id, name: c.name, balance: c.balance ?? 0 }); setPickCustomer(false); }} />
          ))}
        </View>
      ) : (
        <View style={{ gap: th.space(3) }}>
          <Segmented options={MODES.map((m) => ({ value: m.value, label: t(m.label) }))} value={mode} onChange={choose} />
          <ListRow icon={Users} title={customer ? customer.name : t('Customer (khata ke liye)')} subtitle={customer?.balance ? t('previous khata {{amount}}', { amount: formatMoney(customer.balance) }) : undefined}
            chevron onPress={() => setPickCustomer(true)} dense />
          {mode !== 'credit' && (
            <Row justify="between">
              <Text size="xs" weight="semibold" tone="muted" uppercase>{t('Payment')}</Text>
              <PressableScale onPress={() => (splitting ? setSplit(false) : startSplit())} haptic="tap"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: splitting ? th.colors.brand.solid : th.colors.surfaceMuted }}>
                <Icon icon={Split} size={16} color={splitting ? th.colors.brand.onSolid : th.colors.text} />
                <Text size="sm" weight="semibold" color={splitting ? th.colors.brand.onSolid : undefined}>{splitting ? t('One method') : t('Split payment')}</Text>
              </PressableScale>
            </Row>
          )}
          {mode === 'credit' ? (
            <View style={{ alignItems: 'center', gap: th.space(2), padding: th.space(5), borderRadius: th.radius('xl'), backgroundColor: th.colors.warning.soft }}>
              <Icon icon={BookOpen} size={36} color={th.colors.warning.text} />
              <Text weight="bold" color={th.colors.warning.text}>{t('All on khata')}</Text>
            </View>
          ) : splitting ? (
            <View style={{ gap: th.space(2) }}>
              <Row justify="between">
                <Text size="sm" tone="secondary">{t('Barabar baantein')}</Text>
                <Stepper compact value={people} onMinus={() => equal(Math.max(2, people - 1))} onPlus={() => equal(Math.min(20, people + 1))} unit={t('mehman')} onPressValue={() => equal(people)} />
              </Row>
              {rows.map((r, i) => {
                const on = i === active;
                const tone = th.colors[METHODS.find((m) => m.id === r.method)?.tone ?? 'neutral'];
                return (
                  <PressableScale key={i} onPress={() => setActive(i)} scaleTo={0.99}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(2), borderRadius: th.radius('lg'), borderWidth: on ? 2 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: th.colors.surface }}>
                    <PressableScale onPress={() => {
                      const idx = METHODS.findIndex((m) => m.id === r.method);
                      setRows(rows.map((x, j) => (j === i ? { ...x, method: METHODS[(idx + 1) % METHODS.length].id } : x)));
                      setActive(i);
                    }} haptic="select" style={{ paddingHorizontal: th.space(3), minHeight: 44, justifyContent: 'center', borderRadius: th.radius('md'), backgroundColor: tone.soft }}>
                      <Text size="sm" weight="bold" color={tone.text}>{methodLabel(r.method)}</Text>
                    </PressableScale>
                    {!!(r as SplitRow & { note?: string }).note && <Text size="xs" tone="muted">{(r as SplitRow & { note?: string }).note}</Text>}
                    <Text size="xl" weight="bold" ltr tabular style={{ flex: 1, textAlign: 'right' }} tone={r.amount ? 'default' : 'subtle'}>{`Rs ${Number(r.amount || 0).toLocaleString('en-US')}`}</Text>
                  </PressableScale>
                );
              })}
              <Row gap={2}>
                <Button size="sm" variant="secondary" style={{ flex: 1 }} disabled={rows.length >= 20} onPress={() => { setRows([...rows, { method: 'CASH', amount: sum.remaining > 0 ? String(sum.remaining) : '' }]); setActive(rows.length); }}>{t('Add method')}</Button>
                <Button size="sm" variant="soft" style={{ flex: 1 }} disabled={rows.length <= 1} onPress={() => { setRows(rows.filter((_, j) => j !== active)); setActive(0); }}>{t('Remove')}</Button>
              </Row>
            </View>
          ) : (
            <MethodGrid value={method} onChange={setMethod} />
          )}
          {mode !== 'credit' && (
            <>
              {!splitting && (
                <View style={{ borderRadius: th.radius('xl'), padding: th.space(3), backgroundColor: th.colors.surfaceSunken, alignItems: 'flex-end' }}>
                  <Text size="xs" tone="muted">{mode === 'partial' ? t('How much was paid') : t('Customer gave')}</Text>
                  <Text size="4xl" weight="bold" ltr tabular tone={tendered ? 'default' : 'subtle'}>{`Rs ${Number(tendered || due).toLocaleString('en-US')}`}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: th.space(1.5), direction: 'ltr' }}>
                {CASH_NOTES.map((n) => (
                  <PressableScale key={n} onPress={() => addNote(n)} haptic="tap" style={{ flex: 1, minHeight: 44, borderRadius: th.radius('lg'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors.success.soft, borderWidth: 1, borderColor: th.colors.success.border }}>
                    <Text size="sm" weight="bold" ltr color={th.colors.success.text}>{`+${n.toLocaleString('en-US')}`}</Text>
                  </PressableScale>
                ))}
              </View>
              {!splitting && (
                <Row gap={1.5}>
                  <Button size="sm" variant="soft" style={{ flex: 1 }} onPress={() => setTendered(String(due))}>{t('Exact {{amount}}', { amount: formatMoney(due) })}</Button>
                  <Button size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setTendered(String(roundUpTo(due)))}>{formatMoney(roundUpTo(due))}</Button>
                </Row>
              )}
              <Keypad onKey={press} keyHeight={isTablet ? 54 : 48} />
            </>
          )}
          <View style={{ borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
            <Row justify="between" style={{ padding: th.space(3) }}><Text tone="secondary">{t('Bill')}</Text><Amount value={due} weight="semibold" /></Row>
            {mode !== 'credit' && <Row justify="between" style={{ padding: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider }}><Text tone="secondary">{t('Paid')}</Text><Amount value={paid} weight="semibold" /></Row>}
            {change > 0 && <Row justify="between" style={{ padding: th.space(3), backgroundColor: th.colors.success.soft }}><Text weight="semibold" color={th.colors.success.text}>{t('Give back')}</Text><Amount value={change} size="2xl" weight="bold" color={th.colors.success.text} /></Row>}
            {credit > 0 && <Row justify="between" style={{ padding: th.space(3), backgroundColor: th.colors.warning.soft }}><Text weight="semibold" color={th.colors.warning.text}>{short ? t('Still due') : t('On khata')}</Text><Amount value={credit} size="2xl" weight="bold" color={th.colors.warning.text} /></Row>}
          </View>
        </View>
      )}
    </Sheet>
  );
}

