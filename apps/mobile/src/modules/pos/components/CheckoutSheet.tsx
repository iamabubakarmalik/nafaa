/**
 * Taking the money: full payment, part payment with the rest on khata, or
 * all on khata. The amount the customer hands over shows the change; extra
 * can be kept as an advance in the customer's khata. Split payment takes the
 * bill in several methods (cash + card …); change only comes from cash.
 * Same rules and words as the web checkout.
 */

import { BookOpen, Calculator, Check, Plus, Repeat, Split, Wallet, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  CASH_NOTES, keypad, mainMethod, nextSplitMethod, roundUpTo, splitParts, splitSummary, tenderSummary,
  type CheckoutResult, type PaymentMethod, type PosCheckoutMode, type SplitRow,
} from '@nafaa/core/pos';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Button, Checkbox, Icon, PressableScale, Row, Segmented, Sheet, Text, toast, useLayout, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { completeSale } from '../engine/checkout';
import { useBillTotals } from '../engine/totals';
import { closeSheet, usePos, usePosUi } from '../engine/usePos';
import type { PosTradeIn } from '../engine/industry';
import { Keypad, METHODS, MethodGrid, methodLabel } from './parts';

const MODES: Array<{ value: PosCheckoutMode; label: string }> = [
  { value: 'full', label: msg('Full payment') },
  { value: 'partial', label: msg('Part payment') },
  { value: 'credit', label: msg('All on khata') },
];

/** Everything the sale needs from the screen. */
export function useSaleContext() {
  const api = usePos();
  const totals = useBillTotals();
  const lang = useBillLanguage();
  const cashierName = useAuthStore((s) => s.user?.fullName);
  return { api, counter: api.counter, config: api.config, shopId: api.shopId, totals, lang, cashierName };
}

const noTradeIns = (): PosTradeIn[] | undefined => undefined;

export function CheckoutSheet() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const ctx = useSaleContext();
  const { totals, counter } = ctx;
  const open = usePosUi((s) => s.sheet === 'checkout');
  const initMode = usePosUi((s) => s.mode);
  const initSplit = usePosUi((s) => s.split);
  const initMethod = usePosUi((s) => s.method);
  const customer = useBill((s) => s.customer);
  const total = totals.total;
  const tradeIns = (ctx.config.useTradeIns ?? noTradeIns)();

  const [mode, setMode] = useState<PosCheckoutMode>('full');
  const [method, setMethod] = useState<PaymentMethod>(counter.defaultMethod);
  const [tendered, setTendered] = useState('');
  const [deposit, setDeposit] = useState(false);
  const [split, setSplit] = useState(false);
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode(initMode);
    setMethod(initMethod ?? counter.defaultMethod);
    setTendered('');
    setDeposit(false);
    setBusy(false);
    if (initSplit && initMode !== 'credit') startSplit(0);
    else { setSplit(false); setRows([]); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const splitting = split && mode !== 'credit';
  const sum = splitSummary(rows, total);
  const entered = Number(tendered) || 0;
  const single = tenderSummary(mode, total, entered);
  const paid = splitting ? sum.paid : single.paid;
  const change = Math.max(paid - total, 0);
  const credit = Math.max(total - paid, 0);
  const isCredit = credit > 0.005;
  const short = splitting && mode === 'full' && credit > 0.005;
  const blocked = isCredit && !short && (!customer || !counter.rules.allowCredit);

  function startSplit(typed: number) {
    const second: PaymentMethod = method === 'CASH' ? 'CARD' : 'CASH';
    if (typed > 0 && typed < total) {
      setRows([{ method, amount: String(Number(typed.toFixed(2))) }, { method: second, amount: String(Number((total - typed).toFixed(2))) }]);
      setActive(1);
    } else {
      setRows([{ method, amount: '' }, { method: second, amount: '' }]);
      setActive(0);
    }
    setDeposit(false);
    setSplit(true);
  }

  /** Adds a trade-in part (starts split payment if needed), at the item's value like the web. */
  const addTradeIn = (item: PosTradeIn) => {
    const row: SplitRow = { method: 'TRADE_IN', amount: String(item.value), reference: item.code, note: item.label };
    if (mode === 'credit') setMode('full');
    if (!splitting) {
      const rest = Math.max(total - item.value, 0);
      setRows([row, { method, amount: rest > 0 ? String(Number(rest.toFixed(2))) : '' }]);
      setActive(1);
      setDeposit(false);
      setSplit(true);
      return;
    }
    const emptyAt = rows.findIndex((r) => !(Number(r.amount) > 0) && r.method !== 'TRADE_IN');
    if (emptyAt >= 0) { setRows(rows.map((r, i) => (i === emptyAt ? row : r))); return; }
    if (rows.length >= 5) return;
    setRows([...rows, row]);
  };

  const choose = (m: PosCheckoutMode) => {
    if (m !== 'full' && !counter.rules.allowCredit) { toast.error(t('Khata is turned off in this shop')); return; }
    if (m === 'credit' && !customer) { toast.error(t('Choose a customer for khata')); return; }
    setMode(m);
    setTendered('');
  };

  const press = (k: string) => {
    if (splitting) {
      const r = rows[active];
      if (!r || r.method === 'TRADE_IN') return;
      setRows(rows.map((x, i) => (i === active ? { ...x, amount: keypad(x.amount, k) } : x)));
      return;
    }
    if (mode === 'credit') setMode('full');
    setTendered((v) => keypad(v, k));
  };
  const addNote = (n: number) => {
    if (splitting) {
      setRows(rows.map((x, i) => (i === active ? { ...x, amount: String((Number(x.amount) || 0) + n) } : x)));
      return;
    }
    if (mode === 'credit') setMode('full');
    setTendered((v) => String((Number(v) || 0) + n));
  };

  const submit = async () => {
    if (busy) return;
    if (splitting) {
      if (sum.problem === 'change_not_cash') { toast.error(t('Change can only be given from cash. Do not enter more than the bill by card, wallet or trade-in.')); return; }
      if (mode === 'full' && sum.remaining > 0.005) { toast.error(t('{{amount}} still due. Add another payment or choose "Part payment".', { amount: formatMoney(sum.remaining) })); return; }
    }
    if (blocked) { toast.error(counter.rules.allowCredit ? t('Choose a customer for khata') : t('Khata is turned off in this shop. Take the full amount.')); return; }
    if (mode === 'partial' && paid <= 0) { toast.error(t('Enter how much was paid')); return; }
    let result: CheckoutResult;
    if (splitting) {
      const payments = splitParts(rows);
      result = { paymentMethod: mainMethod(payments), paidAmount: paid, isCredit, depositExtra: false, payments };
    } else {
      result = { paymentMethod: method, paidAmount: paid, isCredit, depositExtra: deposit && change > 0 && !!customer };
    }
    setBusy(true);
    try {
      await completeSale(ctx, result);
    } finally {
      setBusy(false);
    }
  };

  const action = busy ? t('Saving…')
    : short ? t('{{amount}} due — add a payment', { amount: formatMoney(credit) })
      : mode === 'credit' ? t('Put on khata · {{total}}', { total: formatMoney(total) })
        : isCredit ? t('{{paid}} paid · {{credit}} on khata', { paid: formatMoney(paid), credit: formatMoney(credit) })
          : change > 0 ? t('Done · give back {{change}}', { change: formatMoney(change) }) : t('Done · {{total}}', { total: formatMoney(total) });

  const modeOptions = useMemo(() => MODES.map((m) => ({ value: m.value, label: t(m.label) })), []);

  return (
    <Sheet
      open={open}
      onClose={closeSheet}
      height={isTablet ? undefined : 0.94}
      title={
        <View style={{ gap: 2 }}>
          <Text size="sm" tone="muted">{customer ? customer.name : t('Walk-in customer')}{customer && (customer.balance ?? 0) > 0 ? ` · ${t('previous khata {{amount}}', { amount: formatMoney(customer.balance) })}` : ''}</Text>
          <Amount value={total} size="3xl" weight="bold" />
        </View>
      }
      footer={
        <View style={{ gap: th.space(2) }}>
          {blocked && <Text size="sm" weight="medium" color={th.colors.danger.text}>{t('Choose a customer on the bill to put money on khata')}</Text>}
          <Button size="xl" fullWidth icon={Check} loading={busy} disabled={blocked} variant={isCredit ? 'critical' : 'primary'} onPress={() => void submit()}>{action}</Button>
        </View>
      }
    >
      <View style={{ gap: th.space(3) }}>
        <Segmented options={modeOptions} value={mode} onChange={choose} />

        {mode !== 'credit' && (
          <Row justify="between">
            <Text size="xs" weight="semibold" tone="muted" uppercase>{t('Payment')}</Text>
            <PressableScale onPress={() => (splitting ? setSplit(false) : startSplit(entered))} haptic="tap"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, backgroundColor: splitting ? th.colors.brand.solid : th.colors.surfaceMuted }}>
              <Icon icon={Split} size={16} color={splitting ? th.colors.brand.onSolid : th.colors.text} />
              <Text size="sm" weight="semibold" color={splitting ? th.colors.brand.onSolid : undefined}>{splitting ? t('One method') : t('Split payment')}</Text>
            </PressableScale>
          </Row>
        )}

        {mode !== 'credit' && !!tradeIns?.length && <TradeInPicker items={tradeIns} used={new Set(rows.filter((r) => r.method === 'TRADE_IN').map((r) => r.reference))} onPick={addTradeIn} />}

        {mode === 'credit' ? (
          <View style={{ alignItems: 'center', gap: th.space(2), padding: th.space(5), borderRadius: th.radius('xl'), backgroundColor: th.colors.warning.soft }}>
            <Icon icon={BookOpen} size={36} color={th.colors.warning.text} />
            <Text weight="bold" color={th.colors.warning.text}>{t('All on khata')}</Text>
            <Text size="sm" align="center" color={th.colors.warning.text}>{t('{{total}} goes to {{name}}\'s khata. The bill shows the old and new balance.', { total: formatMoney(total), name: customer?.name ?? '' })}</Text>
          </View>
        ) : splitting ? (
          <SplitRows rows={rows} setRows={setRows} active={active} setActive={setActive} total={total} />
        ) : (
          <MethodGrid value={method} onChange={setMethod} />
        )}

        {mode !== 'credit' && (
          <>
            {!splitting && (
              <View style={{ borderRadius: th.radius('xl'), padding: th.space(3), backgroundColor: th.colors.surfaceSunken, alignItems: 'flex-end' }}>
                <Text size="xs" tone="muted">{mode === 'partial' ? t('How much was paid') : t('Customer gave')}</Text>
                <Text size="4xl" weight="bold" ltr tabular tone={tendered ? 'default' : 'subtle'}>{tendered ? `Rs ${Number(tendered).toLocaleString('en-US')}` : `Rs ${total.toLocaleString('en-US')}`}</Text>
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
                <Button size="sm" variant="soft" style={{ flex: 1 }} onPress={() => setTendered(String(total))}>{t('Exact {{amount}}', { amount: formatMoney(total) })}</Button>
                <Button size="sm" variant="secondary" style={{ flex: 1 }} onPress={() => setTendered(String(roundUpTo(total)))}>{formatMoney(roundUpTo(total))}</Button>
              </Row>
            )}
            <Keypad onKey={press} keyHeight={isTablet ? 54 : 50} />
          </>
        )}

        <View style={{ borderRadius: th.radius('xl'), borderWidth: 1, borderColor: th.colors.border, overflow: 'hidden' }}>
          <Row justify="between" style={{ padding: th.space(3) }}><Text tone="secondary">{t('Bill')}</Text><Amount value={total} weight="semibold" /></Row>
          {mode !== 'credit' && <Row justify="between" style={{ padding: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider }}><Text tone="secondary">{t('Paid')}</Text><Amount value={paid} weight="semibold" /></Row>}
          {change > 0 && (
            <Row justify="between" style={{ padding: th.space(3), backgroundColor: th.colors.success.soft }}>
              <Text weight="semibold" color={th.colors.success.text}>{deposit && customer ? t('Advance to khata') : t('Give back')}</Text>
              <Amount value={change} size="2xl" weight="bold" color={th.colors.success.text} />
            </Row>
          )}
          {credit > 0 && (
            <Row justify="between" style={{ padding: th.space(3), backgroundColor: th.colors.warning.soft }}>
              <Text weight="semibold" color={th.colors.warning.text}>{short ? t('Still due') : t('On khata')}</Text>
              <Amount value={credit} size="2xl" weight="bold" color={th.colors.warning.text} />
            </Row>
          )}
          {change > 0 && customer && !splitting && (
            <View style={{ padding: th.space(3), borderTopWidth: 1, borderTopColor: th.colors.divider }}>
              <Checkbox value={deposit} onChange={setDeposit} label={t('Keep the change in {{name}}\'s khata', { name: customer.name })} />
            </View>
          )}
        </View>
      </View>
    </Sheet>
  );
}

/** Collapsible list of items taken in; each pick becomes a Trade-in payment part. */
function TradeInPicker({ items, used, onPick }: { items: PosTradeIn[]; used: Set<string | undefined>; onPick: (i: PosTradeIn) => void }) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const free = items.filter((i) => !used.has(i.code));
  return (
    <View style={{ gap: th.space(1.5) }}>
      <PressableScale onPress={() => setOpen((v) => !v)} haptic="tap" disabled={!free.length}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 44, borderRadius: th.radius('lg'), backgroundColor: th.colors.warning.soft, opacity: free.length ? 1 : 0.5 }}>
        <Icon icon={Repeat} size={18} color={th.colors.warning.text} />
        <Text size="sm" weight="semibold" color={th.colors.warning.text} style={{ flex: 1 }}>{free.length ? t('Add trade-in ({{count}} waiting)', { count: free.length }) : t('No trade-in waiting')}</Text>
      </PressableScale>
      {open && free.map((i) => (
        <PressableScale key={i.code} onPress={() => { onPick(i); setOpen(false); }} haptic="select"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: th.space(2), minHeight: 48, borderRadius: th.radius('md'), borderWidth: 1, borderColor: th.colors.border, backgroundColor: th.colors.surface }}>
          <Text size="sm" numberOfLines={2} style={{ flex: 1 }}>{i.label}</Text>
          <Amount value={i.value} size="sm" weight="bold" />
        </PressableScale>
      ))}
    </View>
  );
}

function SplitRows({ rows, setRows, active, setActive, total }: { rows: SplitRow[]; setRows: (r: SplitRow[]) => void; active: number; setActive: (i: number) => void; total: number }) {
  const th = useTheme();
  const sum = splitSummary(rows, total);
  const add = () => {
    if (rows.length >= 5) return;
    setRows([...rows, { method: nextSplitMethod(rows), amount: sum.remaining > 0 ? String(Number(sum.remaining.toFixed(2))) : '' }]);
    setActive(rows.length);
  };
  const remove = (i: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, j) => j !== i));
    setActive(Math.max(0, Math.min(active, rows.length - 2)));
  };
  const fillRest = () => {
    const r = rows[active];
    if (!r || r.method === 'TRADE_IN') return;
    const rest = total - (sum.paid - (Number(r.amount) || 0));
    setRows(rows.map((x, i) => (i === active ? { ...x, amount: rest > 0 ? String(Number(rest.toFixed(2))) : '' } : x)));
  };
  return (
    <View style={{ gap: th.space(2) }}>
      {rows.map((r, i) => {
        const on = i === active;
        const tone = th.colors[r.method === 'TRADE_IN' ? 'warning' : METHODS.find((m) => m.id === r.method)?.tone ?? 'neutral'];
        return (
          <PressableScale key={i} onPress={() => setActive(i)} scaleTo={0.99}
            style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2), padding: th.space(2), borderRadius: th.radius('lg'), borderWidth: on ? 2 : 1, borderColor: on ? th.colors.brand.solid : th.colors.border, backgroundColor: th.colors.surface }}>
            <PressableScale disabled={r.method === 'TRADE_IN'} onPress={() => {
              const idx = METHODS.findIndex((m) => m.id === r.method);
              const next = METHODS[(idx + 1) % METHODS.length].id;
              setRows(rows.map((x, j) => (j === i ? { ...x, method: next } : x)));
              setActive(i);
            }} haptic="select" style={{ paddingHorizontal: th.space(3), minHeight: 44, justifyContent: 'center', borderRadius: th.radius('md'), backgroundColor: tone.soft }}>
              <Text size="sm" weight="bold" color={tone.text}>{methodLabel(r.method)}</Text>
            </PressableScale>
            {r.method === 'TRADE_IN' && <Text size="xs" tone="muted" numberOfLines={2} style={{ flexShrink: 1, maxWidth: '38%' }}>{r.note ?? ''}</Text>}
            <Text size="xl" weight="bold" ltr tabular style={{ flex: 1, textAlign: 'right' }} tone={r.amount ? 'default' : 'subtle'}>{r.amount ? `Rs ${Number(r.amount).toLocaleString('en-US')}` : 'Rs 0'}</Text>
            <PressableScale onPress={() => remove(i)} disabled={rows.length <= 1} accessibilityLabel={t('Remove')} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: rows.length <= 1 ? 0.3 : 1 }}>
              <Icon icon={X} size={18} tone="muted" />
            </PressableScale>
          </PressableScale>
        );
      })}
      <Row gap={2}>
        <Button size="sm" variant="secondary" icon={Plus} onPress={add} disabled={rows.length >= 5} style={{ flex: 1 }}>{t('Add method')}</Button>
        <Button size="sm" variant="soft" icon={Calculator} onPress={fillRest} style={{ flex: 1 }}>{t('Rest in this line')}</Button>
      </Row>
      <Row gap={2}>
        {[{ k: t('Paid'), v: sum.paid, tone: 'neutral' as const }, { k: t('Due'), v: sum.remaining, tone: sum.remaining > 0 ? 'warning' as const : 'neutral' as const }, { k: t('Change (cash)'), v: sum.change, tone: sum.change > 0 ? 'success' as const : 'neutral' as const }].map((x) => (
          <View key={x.k} style={{ flex: 1, padding: th.space(2), borderRadius: th.radius('md'), alignItems: 'center', backgroundColor: th.colors[x.tone].soft }}>
            <Text size="2xs" tone="muted">{x.k}</Text>
            <Amount value={x.v} size="sm" weight="bold" color={th.colors[x.tone].text} />
          </View>
        ))}
      </Row>
      {sum.problem === 'change_not_cash' && <Text size="xs" weight="medium" color={th.colors.danger.text}>{t('Change can only be given from cash. Do not enter more than the bill by card, wallet or trade-in.')}</Text>}
    </View>
  );
}

export { Wallet };
