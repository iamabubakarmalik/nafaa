/**
 * Membership actions used on the members, memberships, member detail and
 * check-in screens: sell (join), renew, take a due payment, freeze and
 * cancel, plus the WhatsApp reminder link. Every sale posts a bill in
 * Sales; what is not paid now goes on the member's khata as udhaar.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageCircle, PauseCircle, Wallet, XCircle } from 'lucide-react';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { waLink } from '@core/lib/whatsapp/templates';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { membershipPlansApi, type MembershipPlan } from '../api/membership-plans.api';
import { membershipsApi, type Membership } from '../api/memberships.api';
import { GYM_KEYS, MONEY_KEYS, apiError, dateOf, num, opt, planTypeLabel, reminderText, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';
import { MemberPicker, type PickedMember } from './MemberPicker';
import { t, Trans } from '@core/i18n';

function useRefresh() {
  const qc = useQueryClient();
  return () => [...MONEY_KEYS, GYM_KEYS.plans, GYM_KEYS.attendance].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function usePlans() {
  return useQuery({ queryKey: [GYM_KEYS.plans, 'active'], queryFn: () => membershipPlansApi.list({ active: true }), staleTime: 60_000 });
}

const planOption = (p: MembershipPlan) => ({ value: p.id, label: t('{{name}} · {{price}} · {{durationDays}} din', { name: p.name, price: formatPKR(p.price), durationDays: p.durationDays }) });

/** Money taken now: amount, method, and what goes on khata. */
function PaidNow({ total, paid, setPaid, method, setMethod }: { total: number; paid: string; setPaid: (v: string) => void; method: PaymentMethod; setMethod: (m: PaymentMethod) => void }) {
  const amount = paid === '' ? total : Number(paid) || 0;
  return (
    <>
      <Input label={t('Abhi kitna mila')} inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))}
        hint={amount < total ? t('{{formatPKR}} member ke khate me udhaar', { formatPKR: formatPKR(total - amount) }) : t('Poora paisa — khali chhorein to poora')} className="text-end font-semibold tabular-nums" />
      {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
    </>
  );
}

/** Join or sell a plan to a member who has no running membership. */
export function SellModal({ member: preset, onClose, onSold }: { member?: PickedMember | null; onClose: () => void; onSold?: (m: Membership) => void }) {
  const can = useGymCan();
  const refresh = useRefresh();
  const plansQ = usePlans();
  const plans = plansQ.data ?? [];
  const [member, setMember] = useState<PickedMember | null>(preset ?? null);
  const [planId, setPlanId] = useState('');
  const plan = plans.find((p) => p.id === (planId || plans[0]?.id));
  const [start, setStart] = useState(todayInput());
  const [waive, setWaive] = useState(false);
  const [agreed, setAgreed] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  // Admission and deposit are taken on the first membership only; the API decides, the screen shows the full list price.
  const list = plan ? plan.price + (waive ? 0 : plan.registrationFee) + plan.securityDeposit : 0;
  const total = agreed === '' ? list : Number(agreed) || 0;
  const amount = paid === '' ? total : Number(paid) || 0;
  const error = !member ? t('Member chunein') : !plan ? t('Plan chunein') : total > list ? t('Poori qeemat {{list}} hai', { list: formatPKR(list) }) : amount > total ? t('Zyada se zyada {{total}}', { total: formatPKR(total) }) : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.subscribe({
      memberId: member!.id, planId: plan!.id, startDate: start, waiveAdmission: waive,
      ...(agreed !== '' && { totalPrice: total }), paidAmount: amount, paymentMethod: method, notes: opt(notes),
    }),
    onSuccess: (m) => { toast.success(t('{{membershipNumber}} ban gayi{{value}}', { membershipNumber: m.membershipNumber, value: m.sale ? t(' · bill {{saleNumber}}', { saleNumber: m.sale.saleNumber }) : '' })); refresh(); onSold?.(m); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Membership nahi bani'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={t('Membership bechein')} description={t('Bill Sales me jata hai. Jo paisa abhi na mile woh khate me udhaar.')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{t('Bechein {{amount}}', { amount: formatPKR(amount) })}</Button></>}>
      <div className="space-y-3">
        <MemberPicker value={member} onChange={setMember} autoFocus={!preset} />
        {!plansQ.isLoading && !plans.length && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">{t('Pehle Plans me koi plan banayein.')}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t('Plan')} value={plan?.id ?? ''} onChange={(e) => { setPlanId(e.target.value); setAgreed(''); }} options={plans.map(planOption)}
            hint={plan ? `${planTypeLabel(plan.planType)}${plan.isUnlimited ? '' : ` · ${plan.visitLimit ?? 0} visits`}` : undefined} />
          <Input label={t('Kab se')} type="date" value={start} onChange={(e) => setStart(e.target.value)} hint={t('Aaj ya aane wali date')} />
        </div>
        {plan && (plan.registrationFee > 0 || plan.securityDeposit > 0) && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
            {t('Plan {{price}}{{value}}{{value2}}', { price: formatPKR(plan.price), value: plan.registrationFee > 0 && !waive ? t(' + admission {{registrationFee}}', { registrationFee: formatPKR(plan.registrationFee) }) : '', value2: plan.securityDeposit > 0 ? t(' + security {{securityDeposit}}', { securityDeposit: formatPKR(plan.securityDeposit) }) : '' })}
            <p className="text-[0.75rem] text-slate-500">{t('Admission aur security sirf pehli membership par lagti hai')}</p>
          </div>
        )}
        {plan && plan.registrationFee > 0 && <Switch checked={waive} onChange={(e) => setWaive(e.target.checked)} label={t('Admission fee maaf')} description={t('Purana member wapas aaya ya offer')} />}
        {can.discount && <Input label={t('Tay shuda qeemat (Discount)')} inputMode="decimal" value={agreed} placeholder={String(list)} onChange={(e) => setAgreed(num(e.target.value))} hint={total < list ? t('{{formatPKR}} Discount', { formatPKR: formatPKR(list - total) }) : t('Khali chhorein to poori qeemat')} />}
        <PaidNow total={total} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
        <Textarea label={t('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} hint={t('Marzi hai')} />
        {error && member && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

/** Renew: starts the day after the current period ends, so nobody loses days. */
export function RenewModal({ membership: m, onClose }: { membership: Membership; onClose: () => void }) {
  const can = useGymCan();
  const refresh = useRefresh();
  const plansQ = usePlans();
  const plans = plansQ.data ?? [];
  const [planId, setPlanId] = useState(m.planId);
  const plan = plans.find((p) => p.id === planId) ?? m.plan;
  const list = plan?.price ?? 0;
  const [agreed, setAgreed] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const total = agreed === '' ? list : Number(agreed) || 0;
  const amount = paid === '' ? total : Number(paid) || 0;
  const running = ['ACTIVE', 'FROZEN'].includes(m.status) && new Date(m.endDate).getTime() > Date.now();
  const error = !plan ? t('Plan chunein') : total > list ? t('Poori qeemat {{list}} hai', { list: formatPKR(list) }) : amount > total ? t('Zyada se zyada {{total}}', { total: formatPKR(total) }) : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.renew(m.id, { planId, paidAmount: amount, paymentMethod: method, ...(agreed !== '' && { totalPrice: total }) }),
    onSuccess: (r) => { toast.success(t('{{membershipNumber}} — {{startDate}} se {{endDate}}', { membershipNumber: r.membershipNumber, startDate: dateOf(r.startDate), endDate: dateOf(r.endDate) })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Renew nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={t('Renew · {{value}}', { value: m.member?.customer?.name ?? m.membershipNumber })}
      description={running ? t('Nayi membership {{endDate}} ke baad shuru hogi — koi din zaya nahi', { endDate: dateOf(m.endDate) }) : t('Purani khatam ho chuki — nayi aaj se shuru')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{t('Renew {{amount}}', { amount: formatPKR(amount) })}</Button></>}>
      <div className="space-y-3">
        <Select label={t('Plan')} value={planId} onChange={(e) => { setPlanId(e.target.value); setAgreed(''); }}
          options={plans.some((p) => p.id === m.planId) ? plans.map(planOption) : [...(m.plan ? [planOption(m.plan)] : []), ...plans.map(planOption)]}
          hint={t('Mahane se 3 mahine par jana ho to yahan badlein. Admission dobara nahi lagti.')} />
        {can.discount && <Input label={t('Tay shuda qeemat (Discount)')} inputMode="decimal" value={agreed} placeholder={String(list)} onChange={(e) => setAgreed(num(e.target.value))} hint={total < list ? t('{{formatPKR}} Discount', { formatPKR: formatPKR(list - total) }) : t('Khali chhorein to poori qeemat')} />}
        <PaidNow total={total} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
        {error && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}

/** Fee due on a membership, paid now (cash goes to the drawer, the rest to its account). */
export function PayModal({ membership: m, onClose }: { membership: Membership; onClose: () => void }) {
  const refresh = useRefresh();
  const due = Math.max(m.totalPrice - m.paidAmount, 0);
  const [paid, setPaid] = useState(String(due));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const amount = Number(paid) || 0;
  const error = !(amount > 0) ? t('Amount likhein') : amount > due + 0.01 ? t('Baqi sirf {{due}} hai', { due: formatPKR(due) }) : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.payment(m.id, amount, method),
    onSuccess: () => { toast.success(t('{{amount}} mil gaye', { amount: formatPKR(amount) })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Payment save nahi hui'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Fee wasool · {{membershipNumber}}', { membershipNumber: m.membershipNumber })} description={t('Baqi {{due}} — ye member ke khate se kam hoga', { due: formatPKR(due) })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{t('{{amount}} lein', { amount: formatPKR(amount) })}</Button></>}>
      <div className="space-y-3">
        <Input label={t('Kitna mila')} inputMode="decimal" value={paid} onChange={(e) => setPaid(num(e.target.value))} autoFocus className="text-end font-semibold tabular-nums" error={paid ? error : undefined} />
        <PaymentMethodPicker value={method} onChange={setMethod} />
      </div>
    </Modal>
  );
}

/** Pause a running membership; the end date moves by the same days. */
export function FreezeModal({ membership: m, onClose }: { membership: Membership; onClose: () => void }) {
  const refresh = useRefresh();
  const max = Math.max((m.plan?.maxFreezeDays ?? 0) - m.totalFrozenDays, 0);
  const fee = m.plan?.freezeFee ?? 0;
  const [days, setDays] = useState(String(Math.min(7, max) || ''));
  const [reason, setReason] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const d = Number(days) || 0;
  const error = !m.plan?.allowFreeze ? t('Is plan me freeze nahi') : !(d >= 1) ? t('Din likhein') : d > max ? t('Sirf {{max}} din baqi', { max }) : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.freeze(m.id, { days: d, reason: opt(reason), ...(fee > 0 && { paidAmount: paid === '' ? fee : Number(paid) || 0, paymentMethod: method }) }),
    onSuccess: (r) => { toast.success(t('Freeze ho gayi — ab {{endDate}} tak', { endDate: dateOf(r.endDate) })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Freeze nahi hui'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Freeze · {{value}}', { value: m.member?.customer?.name ?? m.membershipNumber })} description={t('Safar, beemari: din rukte hain aur khatam hone ki date aage chali jati hai. {{max}} din baqi.', { max })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<PauseCircle className="h-4 w-4" />}>{t('Freeze karein')}</Button></>}>
      <div className="space-y-3">
        <Input label={t('Kitne din')} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} hint={d > 0 ? t('Nayi khatam date: {{dateOf}}', { dateOf: dateOf(new Date(new Date(m.endDate).getTime() + d * 86_400_000).toISOString()) }) : undefined} error={days ? error : undefined} />
        <Input label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('Safar / beemari')} maxLength={300} hint={t('Marzi hai')} />
        {fee > 0 && <PaidNow total={fee} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />}
        {fee > 0 && <p className="text-[0.75rem] text-slate-500">{t('Freeze fee {{fee}} ka bill banta hai', { fee: formatPKR(fee) })}</p>}
      </div>
    </Modal>
  );
}

/** Stop a membership. Money goes back only through a Return of its bill. */
export function CancelModal({ membership: m, onClose }: { membership: Membership; onClose: () => void }) {
  const refresh = useRefresh();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => membershipsApi.cancel(m.id, opt(reason)),
    onSuccess: () => { toast.success(t('Membership cancel ho gayi')); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Cancel nahi hui'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Cancel · {{membershipNumber}}', { membershipNumber: m.membershipNumber })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()} leftIcon={<XCircle className="h-4 w-4" />}>{t('Cancel karein')}</Button></>}>
      <div className="space-y-3">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          {/* i18n-ignore: bill number */}
          <Trans text="Cancel sirf membership band karta hai, paisa wapas nahi hota. Paisa wapas karna ho to Sales me bill {{bill}} ka Return karein — membership khud cancel ho jayegi." values={{ bill: <b>{`GYM-${m.membershipNumber}`}</b> }} />
        </p>
        <Textarea label={t('Wajah')} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder={t('Shehar chhor diya')} hint={t('Marzi hai')} />
      </div>
    </Modal>
  );
}

/** WhatsApp renewal/due reminder; marks the membership as reminded. */
export function ReminderLink({ membership: m, gym, compact }: { membership: Membership; gym?: string | null; compact?: boolean }) {
  const qc = useQueryClient();
  const href = useMemo(() => waLink(m.member?.customer?.phone, reminderText({
    name: m.member?.customer?.name, plan: m.plan?.name, endDate: m.endDate, due: Math.max(m.totalPrice - m.paidAmount, 0), gym,
  })), [m, gym]);
  if (!href) return null;
  const mark = () => membershipsApi.reminded(m.id).then(() => qc.invalidateQueries({ queryKey: [GYM_KEYS.memberships] })).catch(() => undefined);
  return (
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => { e.stopPropagation(); void mark(); }} title={t('WhatsApp par yaad dilayein')}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium text-success-700 ring-1 ring-success-200 hover:bg-success-50">
      <MessageCircle className="h-4 w-4" />{!compact && (m.renewalReminded ? t('Dobara yaad') : t('Yaad dilayein'))}
    </a>
  );
}
