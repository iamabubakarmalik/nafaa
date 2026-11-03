/** Sell, renew, take a due payment, freeze, unfreeze and cancel a membership (web MembershipModals). */

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { daysRemaining, planEndKey, renewalStartKey, freezeLeft } from '@nafaa/core/industries/gym';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, ChipGroup, DetailRow, Input, MoneyInput, Select, Sheet, Switch, Text, confirm, toast } from '@/design';
import { PaySheet, errorText, todayKey } from '../../_shared/deskKit';
import { gymApi, type Membership, type MembershipPlan } from '../api';
import { GYM_KEYS, dateOf, refreshGym } from '../meta';

export const usePlans = () => useQuery({ queryKey: [GYM_KEYS.plans, 'active'], queryFn: () => gymApi.plans.list({ active: true }) });
const planOption = (p: MembershipPlan) => ({ value: p.id, label: p.name, description: `${formatMoney(p.price)} · ${p.durationDays} ${t('din')}` });

/** A new membership for a member: plan, start day, fee and what is paid now. */
export function SellSheet({ memberId, name, open, onClose }: { memberId: string; name: string; open: boolean; onClose: () => void }) {
  const plans = usePlans();
  const [planId, setPlanId] = useState('');
  const [waive, setWaive] = useState(false);
  const [pay, setPay] = useState(false);
  useEffect(() => { if (open) { setPlanId(''); setWaive(false); setPay(false); } }, [open]);
  const plan = plans.data?.find((p) => p.id === (planId || plans.data?.[0]?.id));
  const total = plan ? plan.price + (waive ? 0 : plan.registrationFee) : 0;
  const start = todayKey();
  return (
    <>
      <Sheet open={open && !pay} onClose={onClose} title={t('Membership bechein')} description={name} footer={<Button fullWidth size="lg" disabled={!plan} onPress={() => setPay(true)}>{t('Aage')}</Button>}>
        <View style={{ gap: 12 }}>
          <Select label={t('Plan')} value={plan?.id ?? null} onChange={setPlanId} options={(plans.data ?? []).map(planOption)} />
          {plan && plan.registrationFee > 0 && <Switch label={t('Admission fee maaf ({{fee}})', { fee: formatMoney(plan.registrationFee) })} value={waive} onChange={setWaive} />}
          {plan && <DetailRow label={t('Muddat')} value={`${dateOf(start)} – ${dateOf(planEndKey(start, plan.durationDays))}`} />}
          <DetailRow label={t('Total')} value={<Text weight="bold" ltr>{formatMoney(total)}</Text>} last />
        </View>
      </Sheet>
      <PaySheet open={open && pay} onClose={() => setPay(false)} title={t('Fee lein')} name={name} due={total} cta={t('Bechein')}
        onConfirm={async (p) => { const m = await gymApi.memberships.subscribe({ memberId, planId: plan!.id, startDate: start, waiveAdmission: waive, totalPrice: plan!.price, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }); refreshGym(true); toast.success(t('Membership ban gayi'), { message: `${dateOf(m.startDate)} – ${dateOf(m.endDate)}` }); onClose(); }} />
    </>
  );
}

/** Renewal starts the day after the running period ends, so nobody loses days. */
export function RenewSheet({ m, onClose }: { m: Membership | null; onClose: () => void }) {
  const plans = usePlans();
  const [planId, setPlanId] = useState('');
  const [pay, setPay] = useState(false);
  useEffect(() => { if (m) { setPlanId(m.planId); setPay(false); } }, [m]);
  const plan = plans.data?.find((p) => p.id === planId) ?? m?.plan;
  const today = todayKey();
  const running = !!m && ['ACTIVE', 'FROZEN'].includes(m.status) && m.endDate.slice(0, 10) >= today;
  const start = m ? renewalStartKey(m.endDate.slice(0, 10), today, running) : today;
  const end = plan ? planEndKey(start, plan.durationDays) : start;
  const name = m?.member?.customer?.name ?? m?.membershipNumber ?? '';
  return (
    <>
      <Sheet open={!!m && !pay} onClose={onClose} title={t('Renew')} description={name} footer={<Button fullWidth size="lg" disabled={!plan} onPress={() => setPay(true)}>{t('Aage')}</Button>}>
        <View style={{ gap: 12 }}>
          <Select label={t('Plan')} value={plan?.id ?? null} onChange={setPlanId} options={(plans.data ?? []).map(planOption)} />
          <Text size="sm" tone="muted">{running ? t('Nayi membership {{date}} ke baad shuru hogi — koi din zaya nahi', { date: dateOf(m!.endDate) }) : t('Purani khatam ho chuki — nayi aaj se shuru')}</Text>
          <DetailRow label={t('Nayi muddat')} value={`${dateOf(start)} – ${dateOf(end)}`} />
          <DetailRow label={t('Fee')} value={<Text weight="bold" ltr>{formatMoney(plan?.price ?? 0)}</Text>} last />
        </View>
      </Sheet>
      <PaySheet open={!!m && pay} onClose={() => setPay(false)} title={t('Fee lein')} name={name} due={plan?.price ?? 0} cta={t('Renew karein')}
        onConfirm={async (p) => { const r = await gymApi.memberships.renew(m!.id, { planId: plan!.id, totalPrice: plan!.price, paidAmount: p.paidAmount, paymentMethod: p.paymentMethod }); refreshGym(true); toast.success(t('Renew ho gayi'), { message: `${dateOf(r.startDate)} – ${dateOf(r.endDate)}` }); onClose(); }} />
    </>
  );
}

export function DueSheet({ m, onClose }: { m: Membership | null; onClose: () => void }) {
  const due = m ? Math.max(m.totalPrice - m.paidAmount, 0) : 0;
  return (
    <PaySheet open={!!m} onClose={onClose} title={t('Baqi fee lein')} name={m?.member?.customer?.name ?? ''} due={due} advance cta={t('Fee lein')}
      onConfirm={async (p) => { await gymApi.memberships.payment(m!.id, p.paidAmount, p.paymentMethod); refreshGym(true); toast.success(t('Fee mil gayi')); }} />
  );
}

export function FreezeSheet({ m, onClose }: { m: Membership | null; onClose: () => void }) {
  const [days, setDays] = useState<number | null>(7);
  const [reason, setReason] = useState('');
  useEffect(() => { if (m) { setDays(7); setReason(''); } }, [m]);
  const max = m?.plan ? freezeLeft(m.plan.maxFreezeDays, m.totalFrozenDays) : 0;
  const fee = m?.plan?.freezeFee ?? 0;
  const run = useMutation({
    mutationFn: () => gymApi.memberships.freeze(m!.id, { days: days ?? 0, reason: reason.trim() || undefined, paidAmount: fee > 0 ? fee : undefined, paymentMethod: 'CASH' }),
    onSuccess: () => { refreshGym(true); toast.success(t('Freeze ho gayi')); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  return (
    <Sheet open={!!m} onClose={onClose} title={t('Freeze')} description={m?.member?.customer?.name} footer={<Button fullWidth size="lg" loading={run.isPending} disabled={!days || days < 1 || days > max} onPress={() => run.mutate()}>{t('Freeze karein')}</Button>}>
      <View style={{ gap: 12 }}>
        <Text size="sm" tone="muted">{t('Khatam hone ki tareekh utne hi din aage ho jati hai. {{n}} din baqi hain.', { n: max })}</Text>
        <ChipGroup options={[7, 14, 30].filter((d) => d <= max).map((d) => ({ value: String(d), label: t('{{n}} din', { n: d }) }))} value={String(days ?? '')} onChange={(v) => setDays(Number(v))} />
        <MoneyInput label={t('Din')} value={days} onChangeValue={setDays} decimals={false} />
        <Input label={t('Wajah')} value={reason} onChangeText={setReason} />
        {fee > 0 && <Text size="sm">{t('Freeze fee: {{fee}}', { fee: formatMoney(fee) })}</Text>}
      </View>
    </Sheet>
  );
}

/** Actions on a membership in one place. */
export async function cancelMembership(m: Membership) {
  if (!(await confirm({ title: t('Membership cancel karein?'), message: t('Baaqi din khatam ho jayenge.'), tone: 'danger', confirmLabel: t('Haan, cancel') }))) return false;
  try { await gymApi.memberships.cancel(m.id); refreshGym(true); toast.success(t('Cancel ho gayi')); return true; } catch (e) { toast.error(errorText(e, t('Nahi hua'))); return false; }
}
export async function unfreezeMembership(m: Membership) {
  try { await gymApi.memberships.unfreeze(m.id); refreshGym(); toast.success(t('Freeze khatam')); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
}
export { daysRemaining };
