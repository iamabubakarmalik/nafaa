/**
 * Instalment plans (web LayawayPage): a piece kept while the customer pays
 * in instalments. Plans show how much is paid and the next due date; swipe
 * to take an instalment, complete (bill) or cancel; a new plan sets total,
 * deposit, number of instalments and how often.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, CreditCard, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { layawayEach, paidPct } from '@nafaa/core/industries/garments';
import { apiErrorMessage } from '@/core/api/errors';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Button, ChipGroup, DatePicker, Input, ListRow, MoneyInput, ProgressBar, Row, Sheet, StatTile, StatusPill, SwipeRow, Text, TextArea, toast, useTheme, type StatusTone, type SwipeAction } from '@/design';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { useDeskOnline } from '../../_shared/deskKit';
import { layawayApi, type LayawayPlan, type LayawayView } from '../api';
import { JobList } from '../components/JobList';
import { CancelSheet, CustomerBox, TakeMoneySheet, emptyCustomer, type CustomerValue } from '../components/kit';
import { LAYAWAY_KEY, dateISO, opt, refreshGarments, whenText } from '../meta';

const VIEWS: Array<{ value: LayawayView; label: string }> = [
  { value: 'active', label: msg('Chal rahe') }, { value: 'overdue', label: msg('Qist late') }, { value: 'week', label: msg('Is hafte') },
  { value: 'completed', label: msg('Poore') }, { value: 'cancelled', label: msg('Cancel') }, { value: 'all', label: msg('Sab') },
];
const STATUS: Record<string, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: msg('Chal raha'), tone: 'info' }, COMPLETED: { label: msg('Poora'), tone: 'success' }, CANCELLED: { label: msg('Cancel'), tone: 'danger' },
  DEFAULTED: { label: msg('Qist ruki'), tone: 'warning' }, REFUNDED: { label: msg('Wapas'), tone: 'neutral' },
};
const FREQ: Record<string, string> = { WEEKLY: msg('Har hafte'), BIWEEKLY: msg('Har 2 hafte'), MONTHLY: msg('Har mahine') };

function NewPlanSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [picked, setPicked] = useState<PickedProduct | null>(null);
  const [picking, setPicking] = useState(false);
  const [label, setLabel] = useState('');
  const [total, setTotal] = useState<number | null>(null);
  const [deposit, setDeposit] = useState<number | null>(null);
  const [count, setCount] = useState('3');
  const [freq, setFreq] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'>('MONTHLY');
  const [start, setStart] = useState<Date | null>(new Date());
  const amount = total ?? (picked ? Number(picked.product.price ?? 0) : 0);
  const dep = deposit ?? 0;
  const n = Math.max(Number(count) || 0, 0);
  const each = layawayEach(amount, dep, n);
  const bad = amount <= 0 || n < 1 || dep >= amount || (!customer.customerId && !customer.name.trim());
  const save = useMutation({
    mutationFn: () => layawayApi.create({
      customerId: customer.customerId || undefined, customerName: customer.name.trim() || undefined, customerPhone: opt(customer.phone),
      productId: picked?.product.id, variantId: picked?.variantId ?? undefined, totalAmount: amount, depositAmount: dep, installmentCount: n, frequency: freq,
      startDate: dateISO(start), notes: opt(label), paymentMethod: dep > 0 ? 'CASH' : undefined,
    }),
    onSuccess: (p) => { toast.success(t('{{planNumber}} ban gaya', { planNumber: p.planNumber })); refreshGarments([LAYAWAY_KEY, 'garments-meta'], true); setCustomer(emptyCustomer); setPicked(null); setTotal(null); setDeposit(null); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Plan nahi bana'))),
  });
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Naya qist plan')} height={0.92}
        footer={<Button fullWidth size="lg" loading={save.isPending} disabled={bad} onPress={() => save.mutate()}>{t('Plan banayein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <CustomerBox value={customer} onChange={setCustomer} />
          <ListRow dense title={picked ? picked.product.name : t('Piece chunein (optional)')} subtitle={picked ? formatMoney(Number(picked.product.price ?? 0)) : undefined} chevron onPress={() => setPicking(true)} />
          {!picked && <Input label={t('Kya hai')} value={label} onChangeText={setLabel} />}
          <MoneyInput label={t('Kul amount')} value={total ?? (picked ? Number(picked.product.price ?? 0) : null)} onChangeValue={setTotal} />
          <MoneyInput label={t('Deposit')} value={deposit} onChangeValue={setDeposit} error={dep >= amount && amount > 0 ? t('Deposit kul se kam ho') : undefined} />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} label={t('Kitni qist')} value={count} onChangeText={(v) => setCount(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <View style={{ flex: 2 }}><DatePicker label={t('Pehli qist')} value={start} onChange={setStart} /></View>
          </Row>
          <ChipGroup wrap value={freq} onChange={setFreq} options={(['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const).map((f) => ({ value: f, label: t(FREQ[f]) }))} />
          {n > 0 && amount > dep && <Text size="sm" tone="secondary">{t('Har qist {{each}} (aakhri qist me baqi)', { each: formatMoney(each) })}</Text>}
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Piece chunein')} includeRaw={false} onPick={(p) => { setPicked(p); setTotal(null); setPicking(false); }} />
    </>
  );
}

export function LayawayScreen() {
  const can = usePermission();
  const manage = can(P.POS_USE);
  const { guard } = useDeskOnline('garmentsDesk');
  const [adding, setAdding] = useState(false);
  const [pay, setPay] = useState<LayawayPlan | null>(null);
  const [cancel, setCancel] = useState<LayawayPlan | null>(null);
  const sum = useQuery({ queryKey: [LAYAWAY_KEY, 'totals'], queryFn: () => layawayApi.page({ view: 'active', limit: 1 }), refetchInterval: 60_000 });
  const done = () => refreshGarments([LAYAWAY_KEY, 'garments-meta'], true);
  return (
    <>
      <JobList<LayawayPlan, LayawayView, Awaited<ReturnType<typeof layawayApi.page>>>
        title={t('Instalment plan')} queryKey={LAYAWAY_KEY} views={VIEWS.map((v) => ({ ...v, label: t(v.label) }))} defaultView="active"
        fetch={({ view, search, page }) => layawayApi.page({ view, search, page, limit: 30 })}
        searchPlaceholder={t('Customer, phone ya plan #')} emptyIcon={CreditCard} emptyTitle={t('Koi qist plan nahi')}
        onNew={manage ? () => guard(() => setAdding(true)) : undefined} newLabel={t('New')}
        tiles={() => (
          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone="info" label={t('Lena baqi')} loading={!sum.data} value={<Amount value={sum.data?.totals.remaining ?? 0} size="lg" weight="bold" compact />} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={CheckCircle2} tone="success" label={t('Mil chuka')} loading={!sum.data} value={<Amount value={sum.data?.totals.paid ?? 0} size="lg" weight="bold" compact />} />
          </Row>
        )}
        renderRow={(p) => {
          const st = STATUS[p.status] ?? STATUS.ACTIVE;
          const live = p.status === 'ACTIVE' || p.status === 'DEFAULTED';
          const end: SwipeAction[] = manage && live ? [
            ...(p.remainingAmount > 0.01 ? [{ icon: Wallet, label: t('Qist lein'), tone: 'brand' as const, onPress: () => guard(() => setPay(p)) }] : [{ icon: CheckCircle2, label: t('Poora'), tone: 'success' as const, onPress: () => guard(() => void layawayApi.complete(p.id).then(() => { toast.success(t('Plan poora')); done(); }).catch((e) => toast.error(apiErrorMessage(e, t('Nahi hua'))))) }]),
            { icon: XCircle, label: t('Cancel'), tone: 'danger' as const, onPress: () => guard(() => setCancel(p)) },
          ] : [];
          return (
            <SwipeRow end={end}>
              <ListRow divider icon={CreditCard} iconTone={st.tone} title={p.customerName || p.planNumber} overline={live && p.nextDueDate ? t('Agli qist {{when}}', { when: whenText(p.nextDueDate) }) : undefined}
                subtitle={`${p.planNumber} · ${p.productName ?? p.notes ?? t('Kapra')} · ${t('{{n}} qist', { n: p.installmentCount })}, ${t(FREQ[p.frequency] ?? p.frequency)}`}
                trailing={<View style={{ alignItems: 'flex-end', gap: 4, minWidth: 90 }}><StatusPill tone={st.tone}>{t(st.label)}</StatusPill><Amount value={live ? p.remainingAmount : p.paidAmount} size="sm" tone={live ? 'danger' : 'default'} /><ProgressBar value={paidPct(p.paidAmount, p.totalAmount) / 100} /></View>} />
            </SwipeRow>
          );
        }}
      />
      <NewPlanSheet open={adding} onClose={() => setAdding(false)} />
      <TakeMoneySheet open={!!pay} title={t('Qist lein')} name={`${pay?.customerName ?? ''} · ${pay?.planNumber ?? ''}`} amount={pay ? Math.min(pay.installmentAmount, pay.remainingAmount) : 0} max={pay?.remainingAmount ?? 0} cta={t('Qist darj karein')} onClose={() => setPay(null)}
        onConfirm={async (r) => { if (pay) { const x = await layawayApi.pay(pay.id, { amount: r.paidAmount, paymentMethod: r.paymentMethod }); toast.success(x.status === 'COMPLETED' ? t('{{planNumber}} poora', { planNumber: x.planNumber }) : t('{{planNumber}}: qist darj — baqi {{remainingAmount}}', { planNumber: x.planNumber, remainingAmount: formatMoney(x.remainingAmount) })); done(); } }} />
      <CancelSheet open={!!cancel} title={`${cancel?.customerName ?? ''} · ${cancel?.planNumber ?? ''}`} paid={cancel?.paidAmount ?? 0} onClose={() => setCancel(null)}
        onConfirm={async (reason) => { if (cancel) { await layawayApi.cancel(cancel.id, reason || undefined); done(); } }} />
    </>
  );
}
