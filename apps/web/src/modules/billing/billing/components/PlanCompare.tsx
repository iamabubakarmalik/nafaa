/**
 * Plan comparison: monthly / 3-month / yearly prices, one card per plan
 * with the right action (subscribe, renew, switch, continue payment), a full
 * side-by-side table, and the confirm window before a bill is made.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Clock, Crown, Minus, RefreshCw, Rocket, Sparkles, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Badge, Button, Card, Modal, Segmented, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { Plan } from '@modules/billing/plans/api/plans.api';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import type { BillingData } from '../hooks/useBilling';
import { INTERVAL, PLAN_FEATURES, PLAN_LIMITS, limitText, priceFor, savingFor } from './helpers';

const PLAN_ICON: Record<string, typeof Sparkles> = { 'free-trial': Sparkles, basic: Zap, pro: Rocket, enterprise: Crown };

interface Cta { label: string; disabled?: boolean; payInvoiceId?: string }

export function PlanCompare({ b, interval, setInterval }: { b: BillingData; interval: BillingInterval; setInterval: (i: BillingInterval) => void }) {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<Plan | null>(null);
  const { sub, pending, needsRenewal, plans } = b;

  /* Interval is part of a subscription: Basic monthly may move to Basic
     yearly, and the plan in use can always be renewed. */
  const ctaFor = (plan: Plan): Cta => {
    if (plan.priceMonthly === 0) {
      const onTrial = sub?.status === 'TRIAL' && sub.plan?.id === plan.id;
      return { label: onTrial ? 'Aap trial par hain' : 'Trial plan', disabled: true };
    }
    if (pending && pending.subscription.plan.id === plan.id && pending.subscription.interval === interval) {
      return { label: 'Payment jari rakhein', payInvoiceId: pending.invoice.id };
    }
    if (sub?.plan?.id === plan.id && ['ACTIVE', 'PAST_DUE', 'EXPIRED'].includes(sub.status)) {
      return sub.interval === interval ? { label: needsRenewal ? 'Renew karein' : `${INTERVAL[interval].label} aage barhayein` } : { label: `${INTERVAL[interval].label} par jayein` };
    }
    const currentMonthly = sub && sub.status !== 'TRIAL' ? sub.plan?.priceMonthly ?? 0 : 0;
    if (currentMonthly > 0 && plan.priceMonthly < currentMonthly) return { label: 'Chhota plan lein' };
    if (currentMonthly > 0 && plan.priceMonthly > currentMonthly) return { label: 'Upgrade karein' };
    return { label: 'Ye plan lein' };
  };

  const startPlan = () => {
    if (!confirm) return;
    b.start.mutate({ planId: confirm.id, interval }, {
      onSuccess: (data) => {
        if (data.repriced) toast.success('Bill update ho gaya', { description: `${data.invoice.invoiceNumber} ab ${formatPKR(data.invoice.amountDue)} ka hai — naya bill nahi bana` });
        else if (data.reused) toast.success('Aap ke khule bill par le ja rahe hain', { description: data.invoice.invoiceNumber });
        else toast.success('Plan chun liya — ab payment karein');
        setConfirm(null);
        navigate(`/billing/invoice/${data.invoice.id}/pay`);
      },
    });
  };

  if (b.loading.plans) return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>;

  const paid = plans.filter((p) => p.priceMonthly > 0);
  const best = paid.find((p) => p.slug === 'pro')?.id;

  return (
    <div className="space-y-4">
      {confirm && <ConfirmPlan plan={confirm} interval={interval} b={b} onConfirm={startPlan} onClose={() => setConfirm(null)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented value={interval} onChange={setInterval} label="Period"
          items={(['MONTHLY', 'QUARTERLY', 'YEARLY'] as const).map((i) => ({ value: i, label: INTERVAL[i].label }))} />
        <p className="text-[0.75rem] text-slate-500">Lambi period = kam qeemat. <b>M</b> / <b>Q</b> / <b>Y</b> se badlein.</p>
      </div>

      {!b.can.manage && <Alert tone="info">Plan lena ya badalna sirf malik (billing ki permission wala) kar sakta hai. Aap plans dekh sakte hain.</Alert>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const Icon = PLAN_ICON[plan.slug] ?? Sparkles;
          const price = priceFor(plan, interval);
          const saving = savingFor(plan, interval);
          const cta = ctaFor(plan);
          const current = sub?.plan?.id === plan.id;
          return (
            <section key={plan.id} className={cn('relative flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1', plan.id === best ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
              {plan.id === best && <span className="absolute -top-2.5 left-5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-brand-fg">Zyada log yehi lete hain</span>}
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                {current && <Badge variant="success" dot>Aap ka plan</Badge>}
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{plan.name}</h3>
              {plan.description && <p className="text-[0.8125rem] text-slate-500">{plan.description}</p>}
              <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                {plan.priceMonthly === 0 ? 'Free' : formatPKR(price)}
                {plan.priceMonthly > 0 && <span className="text-[0.8125rem] font-medium text-slate-500"> / {INTERVAL[interval].per}</span>}
              </p>
              <p className="h-5 text-[0.75rem] font-semibold text-success-700">{saving ? `${formatPKR(saving.amount)} bachat (${saving.percent}%)` : plan.trialDays ? `${plan.trialDays} din free` : ''}</p>

              <ul className="mt-3 space-y-1.5 text-[0.8125rem]">
                {PLAN_LIMITS.map((l) => (
                  <li key={l.key} className="flex items-center gap-2 text-slate-700"><l.icon className="h-3.5 w-3.5 text-slate-400" /><b>{limitText(plan[l.planKey], l.unlimitedAt)}</b> {l.label.toLowerCase()}</li>
                ))}
              </ul>
              <ul className="mt-3 flex-1 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
                {PLAN_FEATURES.filter((f) => plan[f.planKey]).slice(0, 8).map((f) => (
                  <li key={f.key} className="flex items-center gap-2 text-slate-700"><Check className="h-3.5 w-3.5 text-success-600" />{f.label}</li>
                ))}
                {PLAN_FEATURES.filter((f) => plan[f.planKey]).length > 8 && <li className="text-[0.75rem] text-slate-500">+{PLAN_FEATURES.filter((f) => plan[f.planKey]).length - 8} aur — neeche table dekhein</li>}
              </ul>

              <Button className="mt-4" fullWidth variant={plan.id === best || cta.payInvoiceId ? 'primary' : 'secondary'}
                disabled={cta.disabled || !b.can.manage}
                onClick={() => (cta.payInvoiceId ? navigate(`/billing/invoice/${cta.payInvoiceId}/pay`) : setConfirm(plan))}>
                {cta.label} {!cta.disabled && <ArrowRight className="h-4 w-4" />}
              </Button>
            </section>
          );
        })}
      </div>

      {plans.length > 0 && (
        <Card className="rounded-3xl" flush title="Saare plans aamne saamne" description="Har plan me kya milta hai">
          <Table minWidth="40rem" className="[&_table]:text-[0.8125rem]">
            <THead>
              <Tr>
                <Th className="px-4 py-2 font-semibold sm:px-5">Cheez</Th>
                {plans.map((p) => <Th key={p.id} className="px-3 py-2 text-center font-semibold text-slate-900">{p.name}</Th>)}
              </Tr>
            </THead>
            <TBody>
              <Tr>
                <Td className="px-4 py-2 text-slate-600 sm:px-5">Qeemat / {INTERVAL[interval].per}</Td>
                {plans.map((p) => <Td key={p.id} className="px-3 py-2 text-center font-semibold tabular-nums">{p.priceMonthly === 0 ? 'Free' : formatPKR(priceFor(p, interval))}</Td>)}
              </Tr>
              {PLAN_LIMITS.map((l) => (
                <Tr key={l.key}>
                  <Td className="px-4 py-2 text-slate-600 sm:px-5">{l.label}</Td>
                  {plans.map((p) => <Td key={p.id} className="px-3 py-2 text-center tabular-nums">{limitText(p[l.planKey], l.unlimitedAt)}</Td>)}
                </Tr>
              ))}
              {PLAN_FEATURES.map((f) => (
                <Tr key={f.key}>
                  <Td className="px-4 py-2 text-slate-600 sm:px-5">{f.label}</Td>
                  {plans.map((p) => (
                    <Td key={p.id} className="px-3 py-2 text-center">
                      {p[f.planKey] ? <Check className="mx-auto h-4 w-4 text-success-600" aria-label="Haan" /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Nahi" />}
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ConfirmPlan({ plan, interval, b, onConfirm, onClose }: { plan: Plan; interval: BillingInterval; b: BillingData; onConfirm: () => void; onClose: () => void }) {
  const price = priceFor(plan, interval);
  const pending = b.pending;
  const samePending = !!pending && pending.subscription.plan.id === plan.id && pending.subscription.interval === interval;
  const renewal = !pending && b.sub?.plan?.id === plan.id && ['ACTIVE', 'PAST_DUE', 'EXPIRED'].includes(b.sub.status);

  return (
    <Modal open onClose={onClose} size="sm" title={`${plan.name} · ${INTERVAL[interval].label}`} description={`${formatPKR(price)} / ${INTERVAL[interval].per}`}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={b.start.isPending}>Wapas</Button>
        <Button onClick={onConfirm} loading={b.start.isPending}>
          {samePending ? <><ArrowRight className="h-4 w-4" /> Payment par jayein</> : renewal ? <><RefreshCw className="h-4 w-4" /> Renew aur payment</> : <><Rocket className="h-4 w-4" /> Haan, payment karein</>}
        </Button>
      </>}>
      {samePending ? (
        <Alert tone="info" title="Bill pehle se bana hua hai" icon={<RefreshCw className="h-4 w-4" />}>Isi plan ka bill khula hai. Aap ko usi par le jayenge — naya bill nahi banega.</Alert>
      ) : pending ? (
        <Alert tone="warning" title="Wohi bill update hoga" icon={<RefreshCw className="h-4 w-4" />}>
          Khula bill {pending.invoice.invoiceNumber} ({pending.subscription.plan.name} — {formatPKR(pending.invoice.amountDue)}) ab <b>{plan.name}</b> ke hisaab se <b>{formatPKR(price)}</b> ka ho jayega. Naya bill nahi banega.
        </Alert>
      ) : renewal ? (
        <Alert tone="info" title="Renew" icon={<Clock className="h-4 w-4" />}>Payment approve hote hi naya period shuru hoga. Bache hue din waste nahi honge, naye period me jud jayenge.</Alert>
      ) : (
        <Alert tone="success" title="Bill banega" icon={<CheckCircle2 className="h-4 w-4" />}>Bill banega aur aap payment ke safhe par chale jayenge. Payment approve hone tak maujooda trial/plan chalta rahega.</Alert>
      )}
      <ul className="mt-3 space-y-1.5 text-[0.8125rem] text-slate-700">
        {PLAN_LIMITS.map((l) => <li key={l.key} className="flex items-center gap-2"><Check className="h-4 w-4 text-success-600" /><b>{limitText(plan[l.planKey], l.unlimitedAt)}</b> {l.label.toLowerCase()}</li>)}
      </ul>
    </Modal>
  );
}
