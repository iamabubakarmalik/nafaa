/** Installment (qist) sheets: new plan on a credit bill, the offer after a counter sale, taking money, and waive / default / cancel. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { QIST_COUNTS, qistPlan, qistProblem, settleInstallments } from '@nafaa/core/industries/mobile';
import { apiErrorMessage } from '@/core/api/errors';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, ChipGroup, DatePicker, EmptyState, ListRow, MoneyInput, Row, Sheet, SkeletonRows, Text, TextArea, toast, useTheme } from '@/design';
import { CustomerPickerSheet, type PickedCustomer } from '@/modules/customers/components/CustomerPickerSheet';
import { salesHistoryApi, type HistorySale } from '@/modules/sales/api/history';
import { dateToKey, keyToDate, todayKey } from '../../_shared/deskKit';
import { emiApi, imeiApi, type EmiInstallment, type EmiPlan } from '../api';
import { EMI_KEY, METHODS, addMonths, refreshMobile } from '../meta';

const Methods = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => <ChipGroup wrap value={value} onChange={onChange} options={METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />;

/** Count of installments, first date and the dates they fall on. */
function QistFields({ credit, total, billDay, count, setCount, start, setStart, notes, setNotes }: {
  credit: number; total: number; billDay?: string; count: number; setCount: (n: number) => void; start: string; setStart: (s: string) => void; notes: string; setNotes: (s: string) => void;
}) {
  const th = useTheme();
  const plan = qistPlan(total, credit, count, start);
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2} style={{ justifyContent: 'space-between' }}>
        <View><Text size="xs" tone="muted">{t('Bill')}</Text><Text weight="semibold" ltr>{formatMoney(total)}</Text></View>
        <View><Text size="xs" tone="muted">{t('Abhi mila')}</Text><Text weight="semibold" ltr>{formatMoney(plan.down)}</Text></View>
        <View><Text size="xs" tone="muted">{t('Qiston me')}</Text><Text weight="semibold" tone="warning" ltr>{formatMoney(credit)}</Text></View>
      </Row>
      <Text size="sm" weight="medium" tone="secondary">{t('Kitni qistein')}</Text>
      <ChipGroup wrap value={String(count)} onChange={(v) => setCount(Number(v))} options={QIST_COUNTS.map((c) => ({ value: String(c), label: t('{{c}} mahine', { c }) }))} />
      <DatePicker label={t('Pehli qist')} value={keyToDate(start)} onChange={(d) => setStart(dateToKey(d))} hint={t('Har mahine isi tareekh ko (chhote mahine me aakhri din)')} />
      <Card><Text weight="bold" size="lg" ltr>{count} × {formatMoney(plan.perInstallment)}</Text>
        <Row gap={1} wrap>{plan.dates.map((d, i) => <Badge key={d} tone="neutral">{i + 1}: {formatDate(`${d}T12:00:00`)}</Badge>)}</Row></Card>
      <TextArea label={t('Note')} value={notes} onChangeText={setNotes} placeholder={t('Zamin ka naam, cheque number…')} hint={t('Marzi hai')} />
      {qistProblem(start, { billDay }) === 'before_bill' && <Text size="xs" tone="danger">{t('Pehli qist bill ki date se pehle nahi ho sakti')}</Text>}
    </View>
  );
}

export interface QistSale { id: string; saleNumber: string; total: number; creditAmount: number; customer: { id: string; name: string; phone?: string | null } }

/** The plan offered right after a phone is sold on udhaar at the counter. */
export function QistPlanPrompt({ sale, onClose }: { sale: QistSale | null; onClose: () => void }) {
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(() => addMonths(todayKey(), 1));
  const [notes, setNotes] = useState('');
  useEffect(() => { if (sale) { setCount(6); setStart(addMonths(todayKey(), 1)); setNotes(''); } }, [sale?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const per = sale ? qistPlan(sale.total, sale.creditAmount, count, start).perInstallment : 0;
  const problem = qistProblem(start, { today: todayKey() });
  const save = useMutation({
    mutationFn: () => emiApi.create({ saleId: sale!.id, customerId: sale!.customer.id, customerName: sale!.customer.name, customerPhone: sale!.customer.phone ?? undefined, totalAmount: sale!.total, downPayment: Math.max(sale!.total - sale!.creditAmount, 0), installmentCount: count, startDate: start, notes: notes.trim() || undefined }),
    onSuccess: (p) => { toast.success(t('Qist plan {{planNumber}} ban gaya', { planNumber: p.planNumber })); refreshMobile([EMI_KEY, 'emi-stats']); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Plan nahi bana'))),
  });
  return (
    <Sheet open={!!sale} onClose={onClose} height={0.92} title={sale ? t('Qist plan — {{saleNumber}}', { saleNumber: sale.saleNumber }) : undefined} description={sale ? `${sale.customer.name} · ${t('udhaar {{credit}}', { credit: formatMoney(sale.creditAmount) })}` : undefined}
      footer={<View style={{ gap: 4 }}>{problem === 'past' ? <Text size="xs" tone="warning">{t('Pehli qist aaj se pehle nahi ho sakti')}</Text> : null}
        <Row gap={2}><Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Abhi nahi')}</Button>
          <Button style={{ flex: 2 }} icon={CalendarClock} loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('{{count}} qist × {{per}}', { count, per: formatMoney(per) })}</Button></Row></View>}>
      {sale && <QistFields credit={sale.creditAmount} total={sale.total} count={count} setCount={setCount} start={start} setStart={setStart} notes={notes} setNotes={setNotes} />}
    </Sheet>
  );
}

/** New plan on a credit bill: pick the customer, one of their credit bills without a plan, then the installments. */
export function CreateEmiPlanSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const th = useTheme();
  const [pick, setPick] = useState(false);
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [bill, setBill] = useState<HistorySale | null>(null);
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(() => addMonths(todayKey(), 1));
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) { setCustomer(null); setBill(null); setCount(6); setStart(addMonths(todayKey(), 1)); setNotes(''); } }, [open]);
  const bills = useQuery({
    queryKey: ['emi-credit-bills', customer?.id],
    queryFn: () => salesHistoryApi.list({ from: '2000-01-01', to: todayKey(), status: 'credit', customerId: customer!.id, sort: 'new' }, 1, 30),
    enabled: open && !!customer,
  });
  const ids = (bills.data?.items ?? []).map((s) => s.id);
  const taken = useQuery({ queryKey: ['emi-plan-bills', ids], queryFn: () => imeiApi.forSales(ids), enabled: ids.length > 0 });
  const withPlan = new Set((taken.data?.plans ?? []).map((p) => p.saleId));
  const avail = (bills.data?.items ?? []).filter((s) => s.status !== 'VOIDED' && Number(s.creditAmount) > 0 && !withPlan.has(s.id));
  const credit = Number(bill?.creditAmount ?? 0);
  const per = qistPlan(Number(bill?.total ?? 0), credit, count, start).perInstallment;
  const problem = !customer ? t('Customer chunein') : !bill ? t('Udhaar bill chunein') : qistProblem(start, { billDay: bill.soldAt.slice(0, 10) }) ? t('Pehli qist bill ki date se pehle nahi ho sakti') : null;
  const save = useMutation({
    mutationFn: () => emiApi.create({ saleId: bill!.id, customerId: customer!.id, customerName: customer!.name, customerPhone: customer!.phone ?? undefined, totalAmount: Number(bill!.total), downPayment: Math.max(Number(bill!.total) - credit, 0), installmentCount: count, startDate: start, notes: notes.trim() || undefined }),
    onSuccess: (p) => { toast.success(t('Plan {{planNumber}} ban gaya', { planNumber: p.planNumber })); refreshMobile([EMI_KEY, 'emi-stats'], true); onClose(); onCreated?.(p.id); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Plan nahi bana'))),
  });
  return (
    <>
      <Sheet open={open && !pick} onClose={onClose} height={0.94} title={t('Naya qist plan')} description={t('Pehle POS par udhaar bill banayein — phir yahan us ki qistein')}
        footer={<View style={{ gap: 4 }}>{problem && customer ? <Text size="xs" tone="warning">{problem}</Text> : null}<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('{{count}} qist × {{per}}', { count, per: formatMoney(per) })}</Button></View>}>
        <View style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('1. Customer')}</Text>
          {customer ? <ListRow title={customer.name} subtitle={customer.phone ?? undefined} trailing={<Text size="xs" tone="muted" onPress={() => { setCustomer(null); setBill(null); }}>{t('Badlein')}</Text>} /> : <Button variant="soft" onPress={() => setPick(true)}>{t('Customer chunein')}</Button>}
          {customer && (
            <>
              <Text size="sm" weight="semibold" tone="secondary">{t('2. Udhaar bill')}</Text>
              {bills.isLoading ? <SkeletonRows count={2} /> : avail.length === 0 ? <EmptyState compact title={t('Is customer ka koi udhaar bill nahi jis par plan na ho. POS par phone udhaar par bechein, phir plan banayein.')} /> : avail.map((s) => (
                <ListRow key={s.id} title={`${s.saleNumber} · ${formatDate(s.soldAt)}`} subtitle={s.items.slice(0, 2).map((i) => i.name).join(', ')} selected={bill?.id === s.id}
                  trailing={<View style={{ alignItems: 'flex-end' }}><Text weight="bold" ltr>{formatMoney(s.total)}</Text><Text size="2xs" tone="warning">{t('udhaar {{creditAmount}}', { creditAmount: formatMoney(s.creditAmount) })}</Text></View>} onPress={() => setBill(s)} />
              ))}
            </>
          )}
          {bill && (
            <>
              <Text size="sm" weight="semibold" tone="secondary">{t('3. Qistein')}</Text>
              <QistFields credit={credit} total={Number(bill.total)} billDay={bill.soldAt.slice(0, 10)} count={count} setCount={setCount} start={start} setStart={setStart} notes={notes} setNotes={setNotes} />
            </>
          )}
        </View>
      </Sheet>
      <CustomerPickerSheet open={open && pick} title={t('Customer')} onClose={() => setPick(false)} onPick={(c) => { setCustomer(c); setBill(null); setPick(false); }} />
    </>
  );
}

/** Taking installment money: any amount, settling the oldest open installments first. */
export function CollectSheet({ plan, onClose }: { plan: EmiPlan | null; onClose: () => void }) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const open = useMemo(() => (plan?.installments ?? []).filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE'), [plan]);
  const total = open.reduce((s, i) => s + Number(i.amount) - Number(i.paidAmount), 0);
  useEffect(() => {
    if (plan) { const first = open[0] ? Number(open[0].amount) - Number(open[0].paidAmount) : 0; setAmount(plan.overdueAmount > 0 ? Number(plan.overdueAmount) : first || null); setMethod('CASH'); setNotes(''); }
  }, [plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = amount ?? 0;
  const problem = !(n > 0) ? t('Amount likhein') : n > total + 0.01 ? t('Kul baqi sirf {{total}} hai', { total: formatMoney(total) }) : null;
  const preview = settleInstallments(open, n);
  const save = useMutation({
    mutationFn: () => emiApi.collect(plan!.id, { amount: n, paymentMethod: method as never, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(t('{{amount}} qist mili — khata me jama', { amount: formatMoney(n) })); refreshMobile([EMI_KEY, 'emi-stats'], true); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Qist save nahi hui'))),
  });
  return (
    <Sheet open={!!plan} onClose={onClose} height={0.85} title={plan ? t('Qist lein — {{planNumber}}', { planNumber: plan.planNumber }) : undefined} description={plan ? t('{{customerName}} · kul baqi {{total}}', { customerName: plan.customerName, total: formatMoney(total) }) : undefined}
      footer={<Button fullWidth size="lg" variant="success" loading={save.isPending} disabled={!!problem} onPress={() => save.mutate()}>{t('{{amount}} lein', { amount: formatMoney(n) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitne mile')} value={amount} onChangeValue={setAmount} size="xl" error={n > 0 && problem ? problem : undefined} />
        <Methods value={method} onChange={setMethod} />
        {preview.length > 0 && <Card flush title={t('Ye qistein ada hongi')}>{preview.map((x, k) => <ListRow key={x.i.id as string} dense divider={k < preview.length - 1} title={`#${(x.i as unknown as EmiInstallment).installmentNumber}`} subtitle={formatDate((x.i as unknown as EmiInstallment).dueDate)} trailing={<Row gap={1}><Text ltr weight="semibold">{formatMoney(x.take)}</Text><Badge tone={x.full ? 'success' : 'warning'}>{x.full ? t('Poori') : t('Adhoori')}</Badge></Row>} />)}</Card>}
        <TextArea label={t('Note')} value={notes} onChangeText={setNotes} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

export type EmiPop = { kind: 'waive'; i: EmiInstallment } | { kind: 'default' } | { kind: 'cancel' } | null;

export function EmiReasonSheet({ plan, pop, onClose }: { plan: EmiPlan | null; pop: EmiPop; onClose: () => void }) {
  const th = useTheme();
  const [reason, setReason] = useState('');
  useEffect(() => { setReason(''); }, [pop]);
  const act = useMutation({
    mutationFn: () => {
      if (!pop || !plan) throw new Error('');
      if (pop.kind === 'waive') return emiApi.waive(plan.id, pop.i.id, reason.trim());
      if (pop.kind === 'default') return emiApi.markDefaulted(plan.id, reason.trim() || undefined);
      return emiApi.cancel(plan.id, reason.trim() || undefined);
    },
    onSuccess: () => { toast.success(pop?.kind === 'waive' ? t('Qist maaf — khata se bhi kam') : t('Plan band ho gaya')); refreshMobile([EMI_KEY, 'emi-stats'], true); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const title = pop?.kind === 'waive' ? t('Qist maaf karein?') : pop?.kind === 'default' ? t('Plan default karein?') : t('Plan cancel karein?');
  return (
    <Sheet open={!!pop && !!plan} onClose={onClose} title={title} description={plan ? `${plan.planNumber} · ${plan.customerName}` : undefined}
      footer={<Button fullWidth size="lg" variant="danger" loading={act.isPending} disabled={pop?.kind === 'waive' && !reason.trim()} onPress={() => act.mutate()}>{t('Pakka karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="secondary">{pop?.kind === 'waive' ? t('Ye qist maaf hogi aur customer ke khata se kam ho jayegi.') : t('Baqi qistein band ho jayengi. Customer ka khata waisa hi rahega.')}</Text>
        <TextArea label={pop?.kind === 'waive' ? t('Wajah (zaroori)') : t('Wajah (marzi)')} value={reason} onChangeText={setReason} />
      </View>
    </Sheet>
  );
}
