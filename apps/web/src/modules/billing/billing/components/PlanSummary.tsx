/**
 * Current plan card: name, state, price, period and renewal, plus the open
 * upgrade bill, the renewal reminder and the owner actions (stop at period
 * end, resume, tidy up extra open bills).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, CalendarDays, CreditCard, Layers, RefreshCw, Sparkles, Wrench, XCircle } from 'lucide-react';
import { Alert, Badge, Button, Card, Modal, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import type { BillingData } from '../hooks/useBilling';
import { INTERVAL, SUBSCRIPTION_STATUS, daysText, formatDate } from './helpers';

export function PlanSummary({ b, onPlans }: { b: BillingData; onPlans: () => void }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { sub, pending, daysLeft, needsRenewal, totals } = b;

  if (b.loading.sub) return <Skeleton className="h-56 rounded-3xl" />;
  if (!sub?.plan) {
    return (
      <Card className="rounded-3xl">
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Sparkles className="h-6 w-6" /></span>
          <h3 className="mt-3 text-[0.9375rem] font-semibold text-slate-900">Abhi koi plan nahi</h3>
          <p className="mt-1 text-[0.8125rem] text-slate-500">Plan chunein — payment ke baad sab kuch khul jayega.</p>
          <Button className="mt-4" onClick={onPlans}>Plans dekhein <ArrowRight className="h-4 w-4" /></Button>
        </div>
      </Card>
    );
  }

  const st = SUBSCRIPTION_STATUS[sub.status];
  const trial = sub.status === 'TRIAL';
  const canStop = b.can.manage && (sub.status === 'ACTIVE' || trial);
  const cta = trial ? 'Plan lein' : needsRenewal ? 'Renew karein' : 'Plan badlein';

  return (
    <div className="space-y-3">
      {confirmCancel && (
        <Modal open onClose={() => setConfirmCancel(false)} title="Plan band karein?" size="sm"
          description="Plan isi muddat ke aakhir tak chalta rahega. Data mehfooz rahega, kabhi bhi wapas chalu kar sakte hain."
          footer={<>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Nahi</Button>
            <Button variant="danger" loading={b.cancel.isPending} onClick={() => b.cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })}>Haan, band karein</Button>
          </>}>
          <p className="text-[0.875rem] text-slate-700">Band hone ki tareekh: <b>{formatDate(sub.currentPeriodEnd)}</b></p>
        </Modal>
      )}

      <Card className="rounded-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}><Layers className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-[0.75rem] font-medium text-slate-500">Aap ka plan</p>
              <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900">
                {sub.plan.name}
                <Badge variant={st.badge} dot>{st.label}</Badge>
              </h2>
              <p className="mt-0.5 text-[0.8125rem] text-slate-500">
                {sub.amount > 0 ? <><b className="text-slate-800">{formatPKR(sub.amount)}</b> / {INTERVAL[sub.interval]?.per ?? sub.interval} · </> : null}{st.hint}
              </p>
            </div>
          </div>
          <Button variant={needsRenewal || trial ? 'primary' : 'secondary'} onClick={onPlans}>{cta} <ArrowRight className="h-4 w-4" /></Button>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <Tile icon={CalendarDays} label="Muddat shuru" value={formatDate(sub.currentPeriodStart)} />
          <Tile icon={CalendarClock} label={trial ? 'Trial khatam' : 'Plan khatam'} value={formatDate(b.endsAt)}
            hint={daysLeft != null ? daysText(daysLeft) : undefined} tone={daysLeft != null && daysLeft <= 7 ? 'warn' : undefined} />
          <Tile icon={RefreshCw} label="Renew" value={INTERVAL[sub.interval]?.label ?? sub.interval}
            hint={sub.cancelAtPeriodEnd ? 'Muddat ke aakhir par band hoga' : sub.autoRenew ? 'Khud renew hota hai' : 'Khud renew karna hoga'} />
        </dl>

        {canStop && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-[0.8125rem] text-slate-500">
              {sub.cancelAtPeriodEnd ? `Ye plan ${formatDate(sub.currentPeriodEnd)} ko band ho jayega — data mehfooz rahega.` : 'Kabhi bhi band kar sakte hain — muddat ke aakhir tak sab chalta rahega.'}
            </p>
            {sub.cancelAtPeriodEnd
              ? <Button size="sm" variant="secondary" loading={b.reactivate.isPending} onClick={() => b.reactivate.mutate()}><RefreshCw className="h-4 w-4" /> Wapas chalu karein</Button>
              : <Button size="sm" variant="critical" onClick={() => setConfirmCancel(true)}><XCircle className="h-4 w-4" /> Plan band karein</Button>}
          </div>
        )}
      </Card>

      {pending && (
        <Alert tone="warning" title={`${pending.subscription.plan.name} · ${INTERVAL[pending.subscription.interval]?.label ?? ''} — payment baqi`}
          action={<Link to={`/billing/invoice/${pending.invoice.id}/pay`}><Button size="sm"><CreditCard className="h-4 w-4" /> {formatPKR(pending.invoice.amountDue)} ada karein</Button></Link>}>
          Bill {pending.invoice.invoiceNumber}. Payment manzoor hote hi naya plan chalu ho jayega — tab tak {trial ? 'trial' : 'purana plan'} chalta rahega.
        </Alert>
      )}

      {needsRenewal && !trial && !pending && (
        <Alert tone="danger" title={sub.status === 'ACTIVE' ? `Renew ${daysLeft && daysLeft > 0 ? `${daysLeft} din me` : 'aaj'} karna hai` : 'Plan renew karna zaroori hai'}
          action={<Button size="sm" onClick={onPlans}><RefreshCw className="h-4 w-4" /> Renew</Button>}>
          Payment khud nahi kat-ti — renew aap ko karna hai. Bache hue din zaya nahi honge, naye period me jud jayenge.
        </Alert>
      )}

      {totals.open.length > 1 && b.can.manage && (
        <Alert tone="info" title={`${totals.open.length} bill khule hain`}
          action={<Button size="sm" variant="secondary" loading={b.cleanup.isPending} onClick={() => b.cleanup.mutate()}><Wrench className="h-4 w-4" /> Faltu band karein</Button>}>
          Ek bill rakha jayega, baqi faltu khule bill band ho jayenge. Jis bill ki payment check ho rahi ho, wo kabhi band nahi hota.
        </Alert>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, value, hint, tone }: { icon: typeof CalendarDays; label: string; value: string; hint?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
      <dt className="flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</dt>
      <dd className="mt-0.5 text-[0.9375rem] font-semibold text-slate-900">{value}</dd>
      {hint && <dd className={tone === 'warn' ? 'text-[0.75rem] font-semibold text-amber-700' : 'text-[0.75rem] text-slate-500'}>{hint}</dd>}
    </div>
  );
}
