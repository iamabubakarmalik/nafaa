/**
 * /plans — choose a plan and the add-ons to go with it, see the total, and
 * check out (one bill for the plan and add-ons, paid on the pay page).
 * The Free plan is offered too; the server explains when the shop's use is
 * over the Free limits. ?feature=<key> picks the cheapest plan with that
 * feature; ?add=<key> ticks that add-on.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, Check, ChevronDown, CreditCard, Gift, Layers, Minus, Sparkles, Star } from 'lucide-react';
import { Button, PageHero, PageShell, Skeleton, heroButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import { pricingApi, type CatalogAddOn, type CatalogPlan } from '../api/pricing.api';
import { errorText, useAddOnActions, useBillingOverview, useCanManageBilling, useEntitlements, usePricingCatalog, useRefreshBilling } from '../hooks/usePricing';
import {
  FEATURE_GROUPS, INTERVAL_MONTHS, LIMITS, SECTIONS, SERVICE_DETAILS, addOnAllowedOn, checkoutTotal, featureLabel, fmtDate, fmtDateTime, isService, limitText, planPrice, planSaving, rs, sectionOf, servicePrice, unitText,
} from '../lib/catalog-meta';
import { AddOnIcon, QuantityStepper } from '../components/AddOnParts';

const INTERVALS: Array<{ id: BillingInterval; label: string }> = [
  { id: 'MONTHLY', label: 'Mahana' },
  { id: 'QUARTERLY', label: '3 mahine' },
  { id: 'YEARLY', label: 'Saalana' },
];
const PER: Record<BillingInterval, string> = { MONTHLY: 'mahina', QUARTERLY: '3 mahine', YEARLY: 'saal' };
const RECOMMENDED = 'pro';

export default function PlanChooserPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const catalogQ = usePricingCatalog();
  const ent = useEntitlements().data;
  const overview = useBillingOverview().data;
  const canManage = useCanManageBilling();
  const refresh = useRefreshBilling();
  const { goFree } = useAddOnActions();
  const catalog = catalogQ.data;

  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [planId, setPlanId] = useState<string | null>(null);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [freeError, setFreeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLines, setShowLines] = useState(false);

  const paidPlans = useMemo(() => (catalog?.plans ?? []).filter((p) => !p.isFree), [catalog]);
  const freePlan = catalog?.plans.find((p) => p.isFree) ?? null;
  const currentPlanId = ent && (ent.state === 'active' || ent.state === 'grace' || ent.state === 'free') ? ent.plan?.id ?? null : null;

  // First choice: the plan with the asked feature, the current paid plan, else the recommended one.
  useEffect(() => {
    if (!catalog || planId) return;
    const feature = params.get('feature');
    const withFeature = feature ? paidPlans.filter((p) => p.features.includes(feature)).sort((a, b) => a.priceMonthly - b.priceMonthly)[0] : null;
    const current = paidPlans.find((p) => p.id === currentPlanId);
    setPlanId((withFeature ?? current ?? paidPlans.find((p) => p.slug === RECOMMENDED) ?? paidPlans[0])?.id ?? null);
    if (overview?.interval) setInterval(overview.interval);
  }, [catalog, paidPlans, planId, params, currentPlanId, overview]);

  // Add-ons start ticked for what the shop already uses.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || !catalog || !ent) return;
    const next: Record<string, number> = {};
    const rows = overview?.addOns ?? [];
    for (const a of catalog.addOns) {
      if (a.comingSoon || a.kind === 'ONE_TIME') continue;
      const row = rows.find((r) => r.key === a.key && r.status !== 'CANCELLED');
      if (row) next[a.key] = Math.max(1, row.quantity);
      else if (ent.apps.includes(a.key) || ent.addOns.some((r) => r.key === a.key && r.status !== 'CANCELLED')) next[a.key] = 1;
    }
    const ask = params.get('add');
    if (ask && catalog.addOns.some((a) => a.key === ask && !a.comingSoon)) next[ask] = Math.max(1, next[ask] ?? 1);
    setPicks(next);
    setSeeded(true);
  }, [seeded, catalog, ent, overview, params]);

  const plan = paidPlans.find((p) => p.id === planId) ?? null;
  // Monthly add-ons in the picker; one-time services have their own choice below.
  const addOns = useMemo(() => (catalog?.addOns ?? []).filter((a) => !a.comingSoon && !isService(a)), [catalog]);
  const services = useMemo(() => (catalog?.addOns ?? []).filter((a) => !a.comingSoon && isService(a)), [catalog]);
  const [service, setService] = useState<string>('');
  /** With a yearly plan Assisted setup comes free, so "none" is not offered. */
  const freeSetupKey = interval === 'YEARLY' && catalog?.offers?.yearlyFreeSetup ? catalog.offers.setupKey : null;
  const allPicks = useMemo(() => (service ? { ...picks, [service]: 1 } : picks), [picks, service]);
  const total = plan && catalog ? checkoutTotal(plan, interval, allPicks, catalog.addOns, catalog) : null;
  const pickedCount = total ? total.lines.filter((l) => l.key !== 'plan' && !services.some((x) => x.key === l.key)).length : 0;

  const toggle = (a: CatalogAddOn, on: boolean) => setPicks((p) => {
    const n = { ...p };
    if (on) n[a.key] = Math.max(1, p[a.key] ?? 1); else delete n[a.key];
    return n;
  });

  const checkout = async () => {
    if (!plan || !total) return;
    setBusy(true);
    try {
      const chosen = Object.entries(picks).filter(([k, q]) => q > 0 && addOns.some((a) => a.key === k && addOnAllowedOn(a, plan)) && !total.dropped.includes(k));
      // The yearly plan's free Assisted setup is added by the server.
      const freeSetup = interval === 'YEARLY' && catalog?.offers?.yearlyFreeSetup && service === catalog.offers.setupKey;
      if (service && !freeSetup) chosen.push([service, 1]);
      const r = await pricingApi.checkout(plan.id, interval, chosen.map(([key, quantity]) => ({ key, quantity })));
      refresh();
      toast.success(t('Bill tayyar: {{amount}}', { amount: rs(r.invoice.amountDue ?? r.invoice.total) }), { description: t('Payment karein — approve hote hi plan chalu.') });
      navigate(`/billing/invoice/${r.invoice.id}/pay`);
    } catch (e) {
      toast.error(errorText(e, t('Bill nahi bana. Dobara koshish karein.')));
    } finally {
      setBusy(false);
    }
  };

  const toFree = () => {
    setFreeError(null);
    goFree.mutate(undefined, {
      onSuccess: () => { toast.success(t('Ab aap Free plan par hain')); navigate('/billing'); },
      onError: (e) => setFreeError(errorText(e, t('Free plan par nahi ja sake'))),
    });
  };

  const months = INTERVAL_MONTHS[interval];
  const bestSaving = paidPlans.map((p) => planSaving(p, interval)?.percent ?? 0).reduce((a, b) => Math.max(a, b), 0);

  return (
    <PageShell>
      <PageHero
        title={t('Plan chunein')}
        back="/billing"
        chip={<><Sparkles />{ent?.state === 'trial' ? t('Trial chal raha hai') : ent?.plan?.name ?? t('Plans')}</>}
        meta={t('Sirf woh lein jo chahiye — kabhi bhi badal sakte hain')}
        loading={catalogQ.isLoading}
        actions={<button type="button" onClick={() => navigate('/apps')} className={heroButton}><Layers className="h-4 w-4" />{t('Apps & add-ons')}</button>}
        stats={[
          { label: t('Abhi ka plan'), value: ent?.plan?.name ?? '—', hint: ent?.state === 'trial' ? t('Trial {{date}} tak', { date: fmtDateTime(ent.trialEndsAt) }) : ent?.periodEnd && ent.state !== 'free' ? t('{{date}} tak', { date: fmtDateTime(ent.periodEnd) }) : undefined },
          { label: t('Chuna hua'), value: plan?.name ?? '—', hint: pickedCount ? t('+ {{count}} add-ons', { count: pickedCount }) : t('koi add-on nahi') },
          { label: t('Kul'), value: total ? rs(total.total) : '—', hint: t('har {{per}}', { per: t(PER[interval]) }) },
          { label: t('Bachat'), value: bestSaving ? `${bestSaving}%` : '—', hint: interval === 'MONTHLY' ? t('3 mahine ya saalana par') : t('mahana ke muqable') },
        ]}
      />

      {/* Interval */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label={t('Kitne waqt ke liye')} className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          {INTERVALS.map((i) => {
            const save = paidPlans.map((p) => planSaving(p, i.id)?.percent ?? 0).reduce((a, b) => Math.max(a, b), 0);
            const on = interval === i.id;
            return (
              <button key={i.id} type="button" role="radio" aria-checked={on} onClick={() => setInterval(i.id)}
                className={cn('inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-[0.875rem] font-semibold transition sm:gap-2 sm:px-4', on ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
                {t(i.label)}
                {save > 0 && <span className={cn('rounded-full px-1.5 py-0.5 text-[0.6875rem] font-bold', on ? 'bg-success-400 text-success-950' : 'bg-success-50 text-success-700')}>-{save}%</span>}
              </button>
            );
          })}
        </div>
        <p className="text-[0.8125rem] text-slate-500">{t('Lambi muddat par bachat — add-ons par bhi wahi bachat.')}</p>
      </div>

      {/* Plans */}
      {catalogQ.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {freePlan && (
            <PlanCard plan={freePlan} interval={interval} selected={false} current={currentPlanId === freePlan.id} previous={null}
              action={canManage && currentPlanId !== freePlan.id ? (
                <Button fullWidth variant="outline" onClick={toFree} loading={goFree.isPending} leftIcon={<Gift className="h-4 w-4" />}>{t('Free plan par jayein')}</Button>
              ) : null}
              footer={freeError ? <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800 ring-1 ring-rose-200">{freeError}</p> : null} />
          )}
          {paidPlans.map((p, i) => (
            <PlanCard key={p.id} plan={p} interval={interval} selected={p.id === planId} current={p.id === currentPlanId} previous={i > 0 ? paidPlans[i - 1] : freePlan}
              recommended={p.slug === RECOMMENDED}
              action={<Button fullWidth variant={p.id === planId ? 'primary' : 'secondary'} onClick={() => setPlanId(p.id)} leftIcon={p.id === planId ? <Check className="h-4 w-4" /> : undefined}>
                {p.id === planId ? t('Chuna hua') : p.id === currentPlanId ? t('Isi ko renew karein') : t('Ye chunein')}
              </Button>} />
          ))}
        </div>
      )}

      {/* Add-ons */}
      {plan && catalog && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80" aria-labelledby="plan-addons">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
            <div>
              <h2 id="plan-addons" className="text-[1rem] font-bold text-slate-900">{t('Add-ons saath lein')}</h2>
              <p className="text-[0.8125rem] text-slate-500">{t('Jo aap pehle se istemaal kar rahe hain woh chune hue hain. Har add-on ki qeemat {{per}} ke hisaab se.', { per: t(PER[interval]) })}</p>
            </div>
            <span className="text-[0.8125rem] font-semibold text-slate-600">{t('{{count}} chune', { count: pickedCount })}</span>
          </header>
          {SECTIONS.map((s) => {
            const list = addOns.filter((a) => sectionOf(a.category) === s.id);
            if (!list.length) return null;
            return (
              <div key={s.id} className="border-b border-slate-100 last:border-0">
                <p className="flex items-center gap-2 bg-slate-50/70 px-4 py-2 text-[0.75rem] font-bold uppercase tracking-wide text-slate-500 sm:px-5"><s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />{t(s.title)}</p>
                <ul className="divide-y divide-slate-100">
                  {list.map((a) => {
                    const allowed = addOnAllowedOn(a, plan);
                    const on = (picks[a.key] ?? 0) > 0;
                    const inBundle = total?.dropped.includes(a.key);
                    const line = total?.lines.find((l) => l.key === a.key);
                    const unit = a.kind === 'ONE_TIME' ? a.priceMonthly : checkoutTotal(plan, interval, { [a.key]: 1 }, [a]).lines[1]?.amount ?? 0;
                    return (
                      <li key={a.key} className={cn('flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5', !allowed && 'opacity-60')}>
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input type="checkbox" className="h-5 w-5 shrink-0 rounded-md border-slate-300 text-brand-600 focus:ring-brand-500" checked={on && allowed} disabled={!allowed}
                            onChange={(e) => toggle(a, e.target.checked)} />
                          <AddOnIcon addOnKey={a.key} size="sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{t(a.name)}</span>
                            <span className="block truncate text-[0.75rem] text-slate-500">
                              {!allowed ? t('{{plan}} plan par nahi milta', { plan: plan.name }) : inBundle ? t('Bundle me shamil') : a.description ? t(a.description) : ''}
                            </span>
                          </span>
                        </label>
                        {a.kind === 'PER_UNIT' && on && allowed && (
                          <QuantityStepper value={picks[a.key]} onChange={(n) => setPicks((p) => ({ ...p, [a.key]: n }))} label={t('Kitne {{unit}}?', { unit: unitText(a.unitLabel) })} />
                        )}
                        <span className="w-28 shrink-0 text-end text-[0.8125rem] tabular-nums">
                          <span className={cn('block font-bold', on && !inBundle ? 'text-slate-900' : 'text-slate-500')}>{on && line ? rs(line.amount) : rs(unit)}</span>
                          <span className="block text-[0.6875rem] text-slate-400">{a.kind === 'ONE_TIME' ? t('ek dafa') : a.kind === 'PER_UNIT' ? t('har {{unit}}/{{per}}', { unit: unitText(a.unitLabel), per: t(PER[interval]) }) : t('har {{per}}', { per: t(PER[interval]) })}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {/* Setup package */}
      {plan && catalog && services.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5" aria-labelledby="plan-setup">
          <h2 id="plan-setup" className="text-[1rem] font-bold text-slate-900">{t('Setup package')} <span className="text-[0.8125rem] font-medium text-slate-400">· {t('zaroori nahi')}</span></h2>
          <p className="text-[0.8125rem] text-slate-500">{t('Hamari team aap ki dukaan Nafaa par set kar de — ek dafa ka kharcha.')}</p>
          <div role="radiogroup" aria-labelledby="plan-setup" className="mt-3 grid gap-2 md:grid-cols-3">
            {[...(freeSetupKey ? [] : [{ key: '', name: t('Khud kar lunga'), how: t('Video guides aur WhatsApp support'), price: null as null | { amount: number; note: string | null } }]),
              ...services.map((a) => ({ key: a.key, name: t(a.name), how: SERVICE_DETAILS[a.key] ? t(SERVICE_DETAILS[a.key].how) : a.description ? t(a.description) : '', price: servicePrice(a, interval, catalog) }))].map((o) => {
              const freeWithYear = !!o.price && o.price.amount === 0;
              const on = (service || freeSetupKey || '') === o.key;
              return (
                <button key={o.key || 'none'} type="button" role="radio" aria-checked={on} onClick={() => setService(o.key)}
                  className={cn('flex items-start gap-3 rounded-2xl p-3.5 text-start ring-1 transition', on ? 'bg-brand-50/60 ring-2 ring-brand-500' : 'ring-slate-200 hover:bg-slate-50')}>
                  <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-brand-600 bg-brand-600' : 'border-slate-300')}>{on && <span className="h-1.5 w-1.5 rounded-full bg-white" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] font-semibold text-slate-900">{o.name}</span>
                    <span className="block text-[0.75rem] text-slate-500">{o.how}</span>
                    {o.price && (
                      <span className="mt-1 block text-[0.8125rem] font-bold tabular-nums text-slate-900">
                        {freeWithYear ? t('Muft') : rs(o.price.amount)}
                        {o.price.note && <span className="ms-1.5 rounded-full bg-success-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-success-700">{o.price.note}</span>}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Comparison */}
      {catalog && <Comparison plans={catalog.plans} features={catalog.features} />}

      {/* Total bar */}
      {plan && total && (
        <div className="sticky bottom-0 z-30 -mb-12 rounded-t-3xl bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 backdrop-blur print:hidden">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 pe-20 sm:px-5 sm:pe-24">
            <button type="button" onClick={() => setShowLines((v) => !v)} className="min-w-0 flex-1 text-start" aria-expanded={showLines}>
              <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-500">
                {pickedCount ? t('{{plan}} + {{count}} add-ons', { plan: plan.name, count: pickedCount }) : t('{{plan}} plan', { plan: plan.name })}
                <ChevronDown className={cn('h-3.5 w-3.5 transition', showLines && 'rotate-180')} />
              </span>
              <span className="block whitespace-nowrap text-[1.25rem] font-bold tabular-nums text-slate-900 sm:text-[1.375rem]">
                {rs(total.total)} <span className="text-[0.875rem] font-medium text-slate-500">/ {t(PER[interval])}</span>
              </span>
              {months > 1 && <span className="block text-[0.75rem] text-success-700">{t('Yani {{amount}} har mahina', { amount: rs(Math.round(total.total / months)) })}</span>}
            </button>
            {canManage ? (
              <Button size="lg" className="w-full sm:w-auto" onClick={checkout} loading={busy} rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />} leftIcon={<CreditCard className="h-4 w-4" />}>
                {t('Bill banayein aur pay karein')}
              </Button>
            ) : <p className="text-[0.8125rem] text-slate-500">{t('Plan sirf dukaan ka malik badal sakta hai')}</p>}
            {showLines && (
              <ul className="w-full space-y-1 border-t border-slate-100 pt-2 text-[0.8125rem]">
                {total.lines.map((l) => (
                  <li key={l.key} className="flex justify-between gap-3"><span className="truncate text-slate-600">{l.label}</span><span className="font-semibold tabular-nums text-slate-900">{rs(l.amount)}</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}

function PlanCard({ plan, interval, selected, current, previous, recommended, action, footer }: {
  plan: CatalogPlan; interval: BillingInterval; selected: boolean; current: boolean; previous: CatalogPlan | null; recommended?: boolean; action: ReactNode; footer?: ReactNode;
}) {
  const price = planPrice(plan, interval);
  const saving = planSaving(plan, interval);
  const months = INTERVAL_MONTHS[interval];
  const extra = previous ? plan.features.filter((f) => !previous.features.includes(f)) : plan.features;
  return (
    <article className={cn('relative flex flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 transition',
      selected ? 'ring-2 ring-brand-500 shadow-md' : 'ring-slate-200/80')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[1.125rem] font-bold text-slate-900">{plan.name}</h3>
        {current ? <span className="rounded-full bg-success-50 px-2 py-0.5 text-[0.6875rem] font-bold text-success-700 ring-1 ring-success-200">{t('Aap ka plan')}</span>
          : recommended ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-bold text-violet-700 ring-1 ring-violet-200"><Star className="h-3 w-3 fill-current" />{t('Sab se pasand')}</span> : null}
      </div>
      <p className="mt-1 min-h-[2.5rem] text-[0.8125rem] leading-snug text-slate-500">{plan.description ? t(plan.description) : ''}</p>
      <div className="mt-3">
        {plan.isFree ? (
          <p className="text-[1.75rem] font-bold tracking-tight text-slate-900">{t('Free')}</p>
        ) : (
          <>
            <p className="text-[1.75rem] font-bold tabular-nums tracking-tight text-slate-900">{rs(Math.round(price / months))}<span className="text-[0.875rem] font-medium text-slate-500"> /{t('mahina')}</span></p>
            <p className="text-[0.75rem] text-slate-500">
              {months > 1 ? t('{{total}} ek saath', { total: rs(price) }) : t('Har mahine')}
              {saving && <span className="ms-1.5 font-semibold text-success-700">{t('{{amount}} bachat', { amount: rs(saving.amount) })}</span>}
            </p>
          </>
        )}
      </div>
      <ul className="mt-4 space-y-1.5 text-[0.8125rem] text-slate-700">
        {LIMITS.filter((l) => l.key !== 'bookers').map((l) => (
          <li key={l.key} className="flex items-center gap-2"><l.icon className="h-3.5 w-3.5 shrink-0" style={{ color: l.color }} /><b className="tabular-nums">{limitText(plan.limits[l.key as keyof CatalogPlan['limits']])}</b> {t(l.label).toLowerCase()}</li>
        ))}
      </ul>
      <div className="mt-4 flex-1 border-t border-slate-100 pt-3">
        <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-slate-400">{previous ? t('{{plan}} ki sab cheezein, aur:', { plan: previous.name }) : t('Shamil hai:')}</p>
        <ul className="mt-2 space-y-1.5 text-[0.8125rem] text-slate-700">
          {extra.slice(0, 7).map((f) => <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600" />{featureLabel(f)}</li>)}
          {extra.length > 7 && <li className="ps-5 text-[0.75rem] text-slate-500">{t('+ {{count}} aur', { count: extra.length - 7 })}</li>}
          {!extra.length && <li className="text-[0.75rem] text-slate-400">—</li>}
        </ul>
      </div>
      <div className="mt-4">{action}</div>
      {footer}
    </article>
  );
}

function Comparison({ plans, features }: { plans: CatalogPlan[]; features: Array<{ key: string; label: string; group: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start sm:px-5">
        <span>
          <span className="block text-[1rem] font-bold text-slate-900">{t('Har plan me kya hai')}</span>
          <span className="block text-[0.8125rem] text-slate-500">{t('Poora muqabla — feature ba feature')}</span>
        </span>
        <ChevronDown className={cn('h-5 w-5 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full min-w-[40rem] text-[0.8125rem]">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="sticky start-0 bg-slate-50 px-4 py-2.5 text-start font-semibold sm:px-5">{t('Feature')}</th>
                {plans.map((p) => <th key={p.id} className="px-3 py-2.5 text-center font-bold text-slate-900">{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={plans.length + 1} className="bg-white px-4 pb-1 pt-3 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-400 sm:px-5">{t('Had')}</td></tr>
              {LIMITS.filter((l) => l.key !== 'bookers').map((l) => (
                <tr key={l.key} className="border-t border-slate-100">
                  <td className="sticky start-0 bg-white px-4 py-2 text-slate-700 sm:px-5">{t(l.label)}</td>
                  {plans.map((p) => <td key={p.id} className="px-3 py-2 text-center font-semibold tabular-nums text-slate-900">{limitText(p.limits[l.key as keyof CatalogPlan['limits']])}</td>)}
                </tr>
              ))}
              {FEATURE_GROUPS.map((g) => {
                const rows = features.filter((f) => f.group === g.id);
                if (!rows.length) return null;
                return [
                  <tr key={`g-${g.id}`}><td colSpan={plans.length + 1} className="bg-white px-4 pb-1 pt-4 text-[0.6875rem] font-bold uppercase tracking-wide text-slate-400 sm:px-5">{t(g.title)}</td></tr>,
                  ...rows.map((f) => (
                    <tr key={f.key} className="border-t border-slate-100">
                      <td className="sticky start-0 bg-white px-4 py-2 text-slate-700 sm:px-5">{featureLabel(f.key, f.label)}</td>
                      {plans.map((p) => (
                        <td key={p.id} className="px-3 py-2 text-center">
                          {p.features.includes(f.key) ? <Check className="mx-auto h-4 w-4 text-success-600" aria-label={t('Hai')} /> : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label={t('Nahi')} />}
                        </td>
                      ))}
                    </tr>
                  )),
                ];
              })}
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-4 py-3 text-[0.75rem] text-slate-500 sm:px-5">{t('Online selling, distribution, FBR aur accounting add-ons hain — kisi bhi paid plan ke saath jor sakte hain.')}</p>
        </div>
      )}
    </section>
  );
}
