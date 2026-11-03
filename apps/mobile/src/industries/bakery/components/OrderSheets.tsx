/**
 * Sheets shared by cake and bulk orders: money received (it goes on the
 * customer's khata as an advance), cancel with a reason, the cash refund of a
 * cancelled order's advance (manager PIN as on the web), and the bill at
 * hand-over. All need the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Ban, CheckCircle2, Link2, Link2Off, Receipt, Undo2, UserPlus, Wallet } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { heldMoney, netOfChange, orderBill, payChips, r2 } from '@nafaa/core/bakery';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText, useCustomerSearch, useOfflineManifest } from '@/core/offline';
import { PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import { Amount, Button, Card, Chip, ChipGroup, ListRow, MoneyInput, Row, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import type { OrderBill, OrderPayMethod } from '../api';
import { BULK_KEY, CAKE_KEY, PAY_METHODS, refreshBakery } from '../meta';

/** Shop the bill and stock belong to: the chosen branch, else the main one. */
export function useShopId(): string | null {
  const current = useAuthStore((s) => s.currentShopId);
  const manifest = useOfflineManifest();
  if (current && current !== 'all') return current;
  return manifest.data?.shops.find((s) => s.isMain)?.id ?? manifest.data?.shops[0]?.id ?? null;
}

function MethodChips({ value, onChange }: { value: OrderPayMethod; onChange: (m: OrderPayMethod) => void }) {
  return <ChipGroup wrap value={value} onChange={onChange} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />;
}

export function PaySheet({ open, name, due, advanceLeft = 0, onPay, onClose, onDone }: {
  open: boolean; name: string; due: number; advanceLeft?: number;
  onPay: (amount: number, method: OrderPayMethod) => Promise<unknown>;
  onClose: () => void; onDone: () => void;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState<OrderPayMethod>('CASH');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setAmount(advanceLeft > 0 ? Math.min(advanceLeft, due) : due); setMethod('CASH'); } }, [open, due, advanceLeft]);
  const n = amount ?? 0;
  const bad = n <= 0 || n > due + 0.005;
  const run = async () => {
    if (!online) { toast.warning(onlineNeededText('bakeryOrders')); return; }
    setBusy(true);
    try { await onPay(n, method); toast.success(t('{{formatPKR}} darj ho gaya', { formatPKR: formatMoney(n) })); onDone(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Darj nahi hua'))); } finally { setBusy(false); }
  };
  const chipLabel = { full: t('Poora'), advance: t('Advance'), half: t('Aadha') };
  return (
    <Sheet open={open} onClose={onClose} title={t('Paisa mila')} description={t('{{name}} · {{due}} baqi', { name, due: formatMoney(due) })}
      footer={<Button fullWidth size="lg" variant="success" icon={CheckCircle2} loading={busy} disabled={bad} onPress={() => void run()}>{t('Darj karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={amount} onChangeValue={setAmount} size="xl" error={n > due + 0.005 ? t('Baqi sirf {{due}} hai', { due: formatMoney(due) }) : undefined} />
        <Row gap={2} wrap>{payChips(due, advanceLeft).map((c) => <Chip key={c.kind} label={`${chipLabel[c.kind]} · ${formatMoney(c.value)}`} selected={n === c.value} onPress={() => setAmount(c.value)} />)}</Row>
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
        <Text size="xs" tone="muted">{t('Yeh paisa aaj ke drawer aur customer ke khate me advance ban kar jata hai. Dete waqt bill me khate se kat jata hai.')}</Text>
      </View>
    </Sheet>
  );
}

export function CancelSheet({ open, title, paid, askReason = true, onConfirm, onClose }: {
  open: boolean; title: string; paid: number; askReason?: boolean;
  onConfirm: (reason: string) => Promise<unknown>; onClose: () => void;
}) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(reason.trim()); toast.success(t('Order cancel ho gaya')); onClose(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Cancel nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Order cancel karein?')} description={title}
      footer={<Button fullWidth size="lg" variant="danger" icon={Ban} loading={busy} onPress={() => void run()}>{t('Haan, cancel')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {paid > 0 && (
          <Card tone="warning"><Row gap={2} align="start"><AlertTriangle size={18} color={th.colors.warning.text} />
            <Text size="sm" style={{ flex: 1 }}>{t('Customer {{paid}} de chuka hai. Yeh advance customer ke khate me jama rehta hai — agle bill me kat jayega, ya cancel ke baad "Advance wapas" se cash me wapas karein. Cancel se paisa khud wapas nahi hota.', { paid: formatMoney(paid) })}</Text>
          </Row></Card>
        )}
        {askReason && <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} maxLength={300} placeholder={t('Customer ne mana kar diya, date badal gayi…')} hint={t('Marzi hai — baad me yaad rehta hai')} />}
      </View>
    </Sheet>
  );
}

/** Cash refund of a cancelled order's advance; only the part held on khata goes back. */
export function RefundSheet({ open, title, loadMoney, onRefund, onClose, onDone }: {
  open: boolean; title: string;
  loadMoney: () => Promise<{ khataPaid?: number; legacyPaid?: number }>;
  onRefund: (managerPin?: string) => Promise<unknown>;
  onClose: () => void; onDone: () => void;
}) {
  const th = useTheme();
  const money = useQuery({ queryKey: ['bakery-order-refund', title], queryFn: loadMoney, staleTime: 0, enabled: open });
  const held = Number(money.data?.khataPaid) || 0;
  const older = Number(money.data?.legacyPaid) || 0;
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await withManagerPin(t('Advance wapsi'), (pin) => onRefund(pin), 'refund');
      toast.success(t('{{held}} advance wapas — drawer se cash nikla', { held: formatMoney(held) }));
      onDone();
    } catch (e) { if (!(e instanceof PinCancelled)) toast.error(apiErrorMessage(e, t('Advance wapas nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Advance wapas karein?')} description={title}
      footer={<Button fullWidth size="lg" variant="danger" icon={Undo2} disabled={!(held > 0)} loading={busy || money.isLoading} onPress={() => void run()}>
        {held > 0 ? t('{{held}} cash wapas', { held: formatMoney(held) }) : t('Wapas karne ko kuch nahi')}
      </Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="secondary">{t('Customer ke khate se advance hat jayega aur utna cash is branch ke khule drawer se nikalega. Day book me "Advance wapas" likha jayega.')}</Text>
        {older > 0.5 && <Card tone="warning"><Text size="sm">{t('{{older}} purane tareeqe se liya gaya tha aur khate me nahi — woh yahan se wapas nahi hota.', { older: formatMoney(older) })}</Text></Card>}
      </View>
    </Sheet>
  );
}

/* ───────────────────────── bill at hand-over ───────────────────────── */

interface BillLine { productId?: string; name: string; qty: number; rate: number; unit?: string }

export interface OrderForBill {
  kind: 'cake' | 'bulk';
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  paid: number;
  customerId?: string | null;
  lines: BillLine[];
}

const digits = (s?: string | null) => String(s ?? '').replace(/\D/g, '').slice(-10);

/**
 * Hand-over as a real bill (same order of work as the web): money taken now
 * is noted on the order, the bill is made with lines noted "Order <number>",
 * then the order is marked delivered. A bill already made for the order
 * stops it, so the same order is never billed twice from two devices.
 */
export function DeliverSheet({ open, order, onClose, onDone, loadMoney, recordPayment, markDelivered, findBill }: {
  open: boolean;
  order: OrderForBill;
  onClose: () => void;
  onDone: () => void;
  loadMoney: () => Promise<{ paidAmount: number; khataPaid?: number; customerId?: string | null }>;
  recordPayment: (amount: number, expectedPaid: number, method: OrderPayMethod) => Promise<unknown>;
  markDelivered: () => Promise<unknown>;
  findBill: () => Promise<OrderBill | null>;
}) {
  const th = useTheme();
  const online = useOnlineStatus();
  const shopId = useShopId();
  const key = order.kind === 'cake' ? CAKE_KEY : BULK_KEY;
  const [lines, setLines] = useState<BillLine[]>(order.lines);
  const [linking, setLinking] = useState<number | null>(null);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [pickCustomer, setPickCustomer] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState<OrderPayMethod>('CASH');
  const [print, setPrint] = useState(true);
  const [step, setStep] = useState('');
  useEffect(() => { if (open) { setLines(order.lines); setCustomer(null); setAmount(null); setStep(''); } }, [open, order]);

  const moneyQ = useQuery({ queryKey: [key, 'money', order.id], queryFn: loadMoney, staleTime: 0, enabled: open });
  const billQ = useQuery({ queryKey: [key, 'bill', order.id], queryFn: findBill, staleTime: 0, enabled: open });
  const phone = digits(order.customerPhone);
  const byPhone = useCustomerSearch({ query: phone, limit: 3 }, { enabled: open && phone.length >= 7 && !order.customerId });
  const paid0 = Number(moneyQ.data?.paidAmount ?? order.paid) || 0;
  const held = heldMoney(paid0, moneyQ.data?.khataPaid);
  const heldFor = held.khata > 0 ? moneyQ.data?.customerId ?? order.customerId ?? null : null;
  const due0 = Math.max(r2(order.total - paid0), 0);
  const now = Math.min(Math.max(amount ?? due0, 0), due0);
  const auto = byPhone.data?.find((c) => digits(c.phone) === phone);
  const chosenId = heldFor ?? customer?.id ?? order.customerId ?? auto?.id ?? null;
  const chosenName = customer?.name ?? auto?.name ?? order.customerName ?? '';
  const bill = useMemo(() => orderBill(lines, order.total), [lines, order.total]);
  const owing = r2(due0 - now);

  const problems: string[] = [];
  if (moneyQ.isLoading || billQ.isLoading) problems.push(t('Order ka hisaab dekh rahe hain…'));
  if (billQ.data) problems.push(t('Is order ka bill pehle hi ban chuka hai'));
  if (!shopId) problems.push(t('Upar se branch chunein'));
  if (!bill.linked.length) problems.push(t('Kam se kam ek cheez apne maal se jorein — warna bill me koi cheez nahi hogi'));
  if (owing > 0.5 && !chosenId) problems.push(t('Baqi khate me jayega — customer chunein'));

  const addCustomer = async () => {
    try {
      const c = (await apiClient.post<{ id: string; name: string; phone?: string | null }>('/customers', { name: order.customerName || t('Order customer'), phone: order.customerPhone || undefined })).data;
      setCustomer({ id: c.id, name: c.name, phone: c.phone ?? null, balance: 0, creditLimit: 0 });
      toast.success(t('{{name}} customer ban gaya', { name: c.name }));
    } catch (e) { toast.error(apiErrorMessage(e, t('Customer nahi bana'))); }
  };

  const run = async () => {
    if (!online) { toast.warning(onlineNeededText('bakeryOrders')); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    try {
      setStep(t('Pehle ka bill dekh rahe hain…'));
      if (await findBill()) throw new Error(t('Is order ka bill pehle hi ban chuka hai'));
      if (now > 0) { setStep(t('Paisa order par darj ho raha hai…')); await recordPayment(now, paid0, method); }
      setStep(t('Bill ban raha hai…'));
      const parts = netOfChange(now > 0 ? [{ method, amount: now }] : [], now);
      if (held.legacy > 0) parts.push({ method: 'CASH', amount: held.legacy });
      const paidOnBill = r2(parts.reduce((s, p) => s + p.amount, 0));
      const note = t('Order {{orderNumber}}', { orderNumber: order.orderNumber });
      const sale = await withManagerPin(t('Udhaar ke liye malik ka PIN'), (managerPin) => apiClient.post<{ id: string; saleNumber: string }>('/sales', {
        ...(managerPin && { managerPin }),
        shopId,
        customerId: chosenId || undefined,
        paymentMethod: parts.length === 1 ? parts[0].method : method,
        paidAmount: paidOnBill,
        ...(parts.length > 1 && { payments: parts }),
        discount: bill.discount,
        serviceCharges: bill.extra > 0 ? [{ type: 'OTHER', label: t('Order ke izafi charges'), amount: bill.extra }] : undefined,
        items: bill.linked.map((l) => ({ productId: l.productId!, quantity: l.qty, priceOverride: l.rate, note })),
      }).then((r) => r.data), 'credit');
      setStep(t('Order "De diya" ho raha hai…'));
      try { await markDelivered(); } catch { toast.warning(t('Bill ban gaya magar order ki halat nahi badli — order khol kar "De diya" dobara dabayein')); }
      setStep('');
      refreshBakery([CAKE_KEY, BULK_KEY], true);
      const dueAfter = Math.max(r2(order.total - paid0 - now), 0);
      toast.success(t('Bill ban gaya — {{orderNumber}} de diya', { orderNumber: order.orderNumber }), {
        message: dueAfter > 0.5 ? t('{{dueAfter}} {{value}} ke khate me', { dueAfter: formatMoney(dueAfter), value: chosenName }) : t('Poora paisa mil gaya'),
      });
      onDone();
      if (print && sale?.id) router.push(`/pos/receipt/${sale.id}` as never);
    } catch (e) {
      setStep('');
      void moneyQ.refetch();
      if (!(e instanceof PinCancelled)) toast.error(apiErrorMessage(e, t('Bill nahi bana — order jaisa tha waisa hai')));
    }
  };

  return (
    <>
      <Sheet open={open && linking === null && !pickCustomer} onClose={onClose}
        title={t('De diya — bill banayein · {{orderNumber}}', { orderNumber: order.orderNumber })}
        description={t('{{value}} · kul {{total}} · mila {{paid}} · baqi {{due0}}', { value: order.customerName || t('Customer'), total: formatMoney(order.total), paid: formatMoney(paid0), due0: formatMoney(due0) })}
        footer={<View style={{ gap: th.space(2) }}>
          {!!step && <Text size="xs" tone="muted" align="center">{step}</Text>}
          {!step && problems.length > 0 && <Text size="xs" tone="warning" align="center">{problems[0]}</Text>}
          <Button fullWidth size="lg" variant="success" icon={Receipt} loading={!!step} disabled={problems.length > 0} onPress={() => void run()}>
            {now > 0 ? t('{{amount}} lein aur bill banayein', { amount: formatMoney(now) }) : t('Bill banayein')}
          </Button>
        </View>}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Bill ki cheezein')}</Text>
          <Card flush>
            {lines.map((l, i) => (
              <ListRow key={`${l.name}-${i}`} divider={i < lines.length - 1} icon={l.productId ? Link2 : Link2Off} iconTone={l.productId ? 'success' : 'warning'}
                title={l.name} subtitle={l.productId ? `${l.qty} × ${formatMoney(l.rate)}` : t('Maal se jorein — stock isi se ghatega')}
                trailing={<Amount value={l.qty * l.rate} weight="semibold" />} onPress={() => setLinking(i)} />
            ))}
          </Card>
          {bill.discount > 0 && <Text size="xs" tone="muted">{t('Cheezon ka jor kul se {{amount}} zyada — bill me discount ban jayega', { amount: formatMoney(bill.discount) })}</Text>}
          {bill.extra > 0 && <Text size="xs" tone="muted">{t('{{amount}} izafi charges ban kar bill me jayega', { amount: formatMoney(bill.extra) })}</Text>}

          <Text size="sm" weight="semibold" tone="secondary">{t('Customer')}</Text>
          {heldFor ? (
            <ListRow icon={Wallet} iconTone="info" title={chosenName || t('Advance wala customer')} subtitle={t('Advance isi ke khate me hai — bill bhi isi par')} />
          ) : chosenId ? (
            <ListRow icon={CheckCircle2} iconTone="success" title={chosenName} subtitle={t('Baqi paisa isi ke khate me jayega')} chevron onPress={() => setPickCustomer(true)} />
          ) : (
            <Row gap={2}>
              <Button style={{ flex: 1 }} variant="secondary" onPress={() => setPickCustomer(true)}>{t('Customer chunein')}</Button>
              {!!order.customerName && <Button style={{ flex: 1 }} variant="soft" icon={UserPlus} onPress={() => void addCustomer()}>{t('Naya customer')}</Button>}
            </Row>
          )}

          {due0 > 0 && (
            <>
              <MoneyInput label={t('Abhi kitna mila')} value={amount ?? due0} onChangeValue={setAmount} size="lg"
                hint={owing > 0.5 ? t('{{amount}} khate me jayega', { amount: formatMoney(owing) }) : t('Poora paisa mil gaya')} />
              <MethodChips value={method} onChange={setMethod} />
            </>
          )}
          <Switch value={print} onChange={setPrint} label={t('Bill print / share karein')} />
        </View>
      </Sheet>
      <ProductPicker open={linking !== null} onClose={() => setLinking(null)} title={t('Maal se jorein')} includeRaw={false} variants={false}
        onPick={(p) => {
          setLines((xs) => xs.map((x, i) => (i === linking ? { ...x, productId: p.product.id, name: p.product.name, unit: p.product.unit } : x)));
          setLinking(null);
        }} />
      <CustomerPickerSheet open={pickCustomer} title={t('Customer chunein')} onClose={() => setPickCustomer(false)} onPick={(c) => { setCustomer(c); setPickCustomer(false); }} />
    </>
  );
}

