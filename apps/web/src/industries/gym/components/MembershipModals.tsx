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

function useRefresh() {
  const qc = useQueryClient();
  return () => [...MONEY_KEYS, GYM_KEYS.plans, GYM_KEYS.attendance].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function usePlans() {
  return useQuery({ queryKey: [GYM_KEYS.plans, 'active'], queryFn: () => membershipPlansApi.list({ active: true }), staleTime: 60_000 });
}

const planOption = (p: MembershipPlan) => ({ value: p.id, label: `${p.name} · ${formatPKR(p.price)} · ${p.durationDays} din` });

/** Money taken now: amount, method, and what goes on khata. */
function PaidNow({ total, paid, setPaid, method, setMethod }: { total: number; paid: string; setPaid: (v: string) => void; method: PaymentMethod; setMethod: (m: PaymentMethod) => void }) {
  const amount = paid === '' ? total : Number(paid) || 0;
  return (
    <>
      <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))}
        hint={amount < total ? `${formatPKR(total - amount)} member ke khate me udhaar` : 'Poora paisa — khali chhorein to poora'} className="text-right font-semibold tabular-nums" />
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
  const error = !member ? 'Member chunein' : !plan ? 'Plan chunein' : total > list ? `Poori qeemat ${formatPKR(list)} hai` : amount > total ? `Zyada se zyada ${formatPKR(total)}` : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.subscribe({
      memberId: member!.id, planId: plan!.id, startDate: start, waiveAdmission: waive,
      ...(agreed !== '' && { totalPrice: total }), paidAmount: amount, paymentMethod: method, notes: opt(notes),
    }),
    onSuccess: (m) => { toast.success(`${m.membershipNumber} ban gayi${m.sale ? ` · bill ${m.sale.saleNumber}` : ''}`); refresh(); onSold?.(m); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Membership nahi bani')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Membership bechein" description="Bill Sales me jata hai. Jo paisa abhi na mile woh khate me udhaar."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bechein {formatPKR(amount)}</Button></>}>
      <div className="space-y-3">
        <MemberPicker value={member} onChange={setMember} autoFocus={!preset} />
        {!plansQ.isLoading && !plans.length && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">Pehle Plans me koi plan banayein.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Plan" value={plan?.id ?? ''} onChange={(e) => { setPlanId(e.target.value); setAgreed(''); }} options={plans.map(planOption)}
            hint={plan ? `${planTypeLabel(plan.planType)}${plan.isUnlimited ? '' : ` · ${plan.visitLimit ?? 0} visits`}` : undefined} />
          <Input label="Kab se" type="date" value={start} onChange={(e) => setStart(e.target.value)} hint="Aaj ya aane wali date" />
        </div>
        {plan && (plan.registrationFee > 0 || plan.securityDeposit > 0) && (
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
            Plan {formatPKR(plan.price)}{plan.registrationFee > 0 && !waive ? ` + admission ${formatPKR(plan.registrationFee)}` : ''}{plan.securityDeposit > 0 ? ` + security ${formatPKR(plan.securityDeposit)}` : ''}
            <p className="text-[0.75rem] text-slate-500">Admission aur security sirf pehli membership par lagti hai</p>
          </div>
        )}
        {plan && plan.registrationFee > 0 && <Switch checked={waive} onChange={(e) => setWaive(e.target.checked)} label="Admission fee maaf" description="Purana member wapas aaya ya offer" />}
        {can.discount && <Input label="Tay shuda qeemat (Discount)" inputMode="decimal" value={agreed} placeholder={String(list)} onChange={(e) => setAgreed(num(e.target.value))} hint={total < list ? `${formatPKR(list - total)} Discount` : 'Khali chhorein to poori qeemat'} />}
        <PaidNow total={total} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} hint="Marzi hai" />
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
  const error = !plan ? 'Plan chunein' : total > list ? `Poori qeemat ${formatPKR(list)} hai` : amount > total ? `Zyada se zyada ${formatPKR(total)}` : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.renew(m.id, { planId, paidAmount: amount, paymentMethod: method, ...(agreed !== '' && { totalPrice: total }) }),
    onSuccess: (r) => { toast.success(`${r.membershipNumber} — ${dateOf(r.startDate)} se ${dateOf(r.endDate)}`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Renew nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={`Renew · ${m.member?.customer?.name ?? m.membershipNumber}`}
      description={running ? `Nayi membership ${dateOf(m.endDate)} ke baad shuru hogi — koi din zaya nahi` : 'Purani khatam ho chuki — nayi aaj se shuru'}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Renew {formatPKR(amount)}</Button></>}>
      <div className="space-y-3">
        <Select label="Plan" value={planId} onChange={(e) => { setPlanId(e.target.value); setAgreed(''); }}
          options={plans.some((p) => p.id === m.planId) ? plans.map(planOption) : [...(m.plan ? [planOption(m.plan)] : []), ...plans.map(planOption)]}
          hint="Mahane se 3 mahine par jana ho to yahan badlein. Admission dobara nahi lagti." />
        {can.discount && <Input label="Tay shuda qeemat (Discount)" inputMode="decimal" value={agreed} placeholder={String(list)} onChange={(e) => setAgreed(num(e.target.value))} hint={total < list ? `${formatPKR(list - total)} Discount` : 'Khali chhorein to poori qeemat'} />}
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
  const error = !(amount > 0) ? 'Amount likhein' : amount > due + 0.01 ? `Baqi sirf ${formatPKR(due)} hai` : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.payment(m.id, amount, method),
    onSuccess: () => { toast.success(`${formatPKR(amount)} mil gaye`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Payment save nahi hui')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Fee wasool · ${m.membershipNumber}`} description={`Baqi ${formatPKR(due)} — ye member ke khate se kam hoga`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{formatPKR(amount)} lein</Button></>}>
      <div className="space-y-3">
        <Input label="Kitna mila" inputMode="decimal" value={paid} onChange={(e) => setPaid(num(e.target.value))} autoFocus className="text-right font-semibold tabular-nums" error={paid ? error : undefined} />
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
  const error = !m.plan?.allowFreeze ? 'Is plan me freeze nahi' : !(d >= 1) ? 'Din likhein' : d > max ? `Sirf ${max} din baqi` : undefined;
  const save = useMutation({
    mutationFn: () => membershipsApi.freeze(m.id, { days: d, reason: opt(reason), ...(fee > 0 && { paidAmount: paid === '' ? fee : Number(paid) || 0, paymentMethod: method }) }),
    onSuccess: (r) => { toast.success(`Freeze ho gayi — ab ${dateOf(r.endDate)} tak`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Freeze nahi hui')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Freeze · ${m.member?.customer?.name ?? m.membershipNumber}`} description={`Safar, beemari: din rukte hain aur khatam hone ki date aage chali jati hai. ${max} din baqi.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<PauseCircle className="h-4 w-4" />}>Freeze karein</Button></>}>
      <div className="space-y-3">
        <Input label="Kitne din" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} hint={d > 0 ? `Nayi khatam date: ${dateOf(new Date(new Date(m.endDate).getTime() + d * 86_400_000).toISOString())}` : undefined} error={days ? error : undefined} />
        <Input label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Safar / beemari" maxLength={300} hint="Marzi hai" />
        {fee > 0 && <PaidNow total={fee} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />}
        {fee > 0 && <p className="text-[0.75rem] text-slate-500">Freeze fee {formatPKR(fee)} ka bill banta hai</p>}
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
    onSuccess: () => { toast.success('Membership cancel ho gayi'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hui')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Cancel · ${m.membershipNumber}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()} leftIcon={<XCircle className="h-4 w-4" />}>Cancel karein</Button></>}>
      <div className="space-y-3">
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          Cancel sirf membership band karta hai, paisa wapas nahi hota. Paisa wapas karna ho to Sales me bill <b>GYM-{m.membershipNumber}</b> ka Return karein — membership khud cancel ho jayegi.
        </p>
        <Textarea label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} placeholder="Shehar chhor diya" hint="Marzi hai" />
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
    <a href={href} target="_blank" rel="noreferrer" onClick={(e) => { e.stopPropagation(); void mark(); }} title="WhatsApp par yaad dilayein"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-medium text-success-700 ring-1 ring-success-200 hover:bg-success-50">
      <MessageCircle className="h-4 w-4" />{!compact && (m.renewalReminded ? 'Dobara yaad' : 'Yaad dilayein')}
    </a>
  );
}
