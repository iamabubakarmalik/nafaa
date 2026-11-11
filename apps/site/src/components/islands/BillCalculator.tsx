'use client';

/**
 * "Make your own bill" calculator (island). Pick a plan, a billing period and
 * add-ons (with a quantity for per-unit ones) and see the live total.
 *
 * All prices come in as props from the public catalog; nothing is hard-coded.
 * Add-ons are priced monthly in the catalog, so for a longer period they use
 * the same discount the chosen plan gets for that period (a yearly plan that
 * costs 10 months also costs 10 months for each add-on). Selecting a bundle
 * makes the add-ons it contains free, so they are never counted twice. The
 * add-on part of a period is rounded to the nearest Rs 10, as checkout does.
 */
import { useMemo, useState } from 'react';
import { cx } from '@/components/ui/cx';
import { formatCount } from '@/components/blocks/lib/format';
import { track } from '@/lib/analytics/track';
import type { CatalogAddOn, CatalogPlan } from '@/lib/pricing/catalog';
import { fill, type PricingV2Strings } from '@/templates/pricing/pricingV2Strings';

type Period = 'monthly' | 'quarterly' | 'yearly';
const MONTHS: Record<Period, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const MAX_UNITS = 500;

function planPrice(plan: CatalogPlan, period: Period): number {
  return period === 'monthly' ? plan.priceMonthly : period === 'quarterly' ? plan.priceQuarterly : plan.priceYearly;
}

const rs = (n: number) => `Rs ${formatCount(Math.round(n))}`;

export interface BillCalculatorProps {
  plans: CatalogPlan[];
  addOns: CatalogAddOn[];
  t: PricingV2Strings;
  signupUrl: string;
  trialDays: number;
  defaultPlan?: string;
}

export function BillCalculator({ plans, addOns, t, signupUrl, trialDays, defaultPlan }: BillCalculatorProps) {
  const [planSlug, setPlanSlug] = useState(defaultPlan ?? plans.find((p) => !p.isFree)?.slug ?? plans[0]?.slug ?? '');
  const [period, setPeriod] = useState<Period>('monthly');
  const [selected, setSelected] = useState<Record<string, number>>({});

  const plan = plans.find((p) => p.slug === planSlug) ?? plans[0];
  const paid = plan ? !plan.isFree && plan.priceMonthly > 0 : false;
  const availablePeriods = plan ? (['monthly', 'quarterly', 'yearly'] as Period[]).filter((p) => p === 'monthly' || planPrice(plan, p) > 0) : [];
  const activePeriod: Period = availablePeriods.includes(period) ? period : 'monthly';

  const bill = useMemo(() => {
    if (!plan) return null;
    const months = MONTHS[activePeriod];
    const planTotal = paid ? planPrice(plan, activePeriod) : 0;
    const ratio = paid && plan.priceMonthly > 0 ? planTotal / (plan.priceMonthly * months) : 1;
    const chosen = paid ? addOns.filter((a) => selected[a.key] && !a.comingSoon && (!a.availableOnPlans.length || a.availableOnPlans.includes(plan.slug))) : [];
    const covered = new Set(chosen.flatMap((a) => a.bundleKeys));
    const lines = chosen.map((a) => {
      const qty = a.kind === 'PER_UNIT' ? Math.min(MAX_UNITS, Math.max(1, selected[a.key] ?? 1)) : 1;
      const inBundle = covered.has(a.key);
      const monthly = a.kind === 'ONE_TIME' || inBundle ? 0 : a.priceMonthly * qty;
      const oneTime = a.kind === 'ONE_TIME' && !inBundle ? a.priceMonthly : 0;
      return { addOn: a, qty, inBundle, monthly, oneTime };
    });
    const addOnMonthly = lines.reduce((sum, l) => sum + l.monthly, 0);
    const oneTime = lines.reduce((sum, l) => sum + l.oneTime, 0);
    const periodTotal = planTotal + Math.round((addOnMonthly * months * ratio) / 10) * 10;
    return { months, planTotal, lines, periodTotal, perMonth: periodTotal / months, oneTime };
  }, [plan, paid, activePeriod, addOns, selected]);

  if (!plan || !bill) return null;

  function toggle(addOn: CatalogAddOn, on: boolean) {
    setSelected((cur) => {
      const next = { ...cur };
      if (on) next[addOn.key] = 1;
      else delete next[addOn.key];
      return next;
    });
    track('pricing_toggle', { period: addOn.key, label: on ? 'addon_on' : 'addon_off' });
  }

  const visibleAddOns = addOns.filter((a) => !a.comingSoon);
  const periodLabel: Record<Period, string> = { monthly: t.monthly, quarterly: t.quarterly, yearly: t.yearly };
  const saving = (p: Period) => {
    if (p === 'monthly' || plan.priceMonthly <= 0) return null;
    const full = plan.priceMonthly * MONTHS[p];
    const price = planPrice(plan, p);
    const pct = price > 0 && price < full ? Math.floor(((full - price) / full) * 100) : 0;
    return pct >= 1 ? pct : null;
  };

  const chip = (active: boolean) =>
    cx(
      'min-h-11 rounded-lg border px-4 py-2 text-small font-medium transition-colors',
      active ? 'border-brand-600 bg-brand-50 text-fg-strong ink:border-brand-400 ink:bg-brand-400/10' : 'border-line bg-surface text-fg-muted hover:border-brand-400',
    );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-7 rounded-xl border border-line bg-surface p-5 shadow-e1 ink:shadow-none sm:p-7">
        <fieldset>
          <legend className="mb-3 text-small font-semibold text-fg-strong">{t.stepPlan}</legend>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <button key={p.slug} type="button" aria-pressed={p.slug === plan.slug} className={chip(p.slug === plan.slug)} onClick={() => setPlanSlug(p.slug)}>
                {p.name}
              </button>
            ))}
          </div>
        </fieldset>

        {paid ? (
          <fieldset>
            <legend className="mb-3 text-small font-semibold text-fg-strong">{t.stepPeriod}</legend>
            <div className="flex flex-wrap gap-2">
              {availablePeriods.map((p) => {
                const pct = saving(p);
                return (
                  <button key={p} type="button" aria-pressed={p === activePeriod} className={chip(p === activePeriod)} onClick={() => setPeriod(p)}>
                    {periodLabel[p]}
                    {pct ? <span className="ms-2 text-xs text-link">{fill(t.save, { pct })}</span> : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        <fieldset disabled={!paid}>
          <legend className="mb-3 text-small font-semibold text-fg-strong">{t.stepAddOns}</legend>
          {!paid ? <p className="text-small text-fg-muted">{t.addOnsNeedPaid}</p> : null}
          <ul className="grid gap-2 sm:grid-cols-2">
            {visibleAddOns.map((a) => {
              const allowed = !a.availableOnPlans.length || a.availableOnPlans.includes(plan.slug);
              const on = Boolean(selected[a.key]);
              const price = a.kind === 'ONE_TIME' ? fill(t.oneTime, { price: formatCount(a.priceMonthly) }) : fill(t.perMonth, { price: formatCount(a.priceMonthly) });
              return (
                <li key={a.key} className={cx('rounded-lg border p-3', on ? 'border-brand-600 ink:border-brand-400' : 'border-line', (!paid || !allowed) && 'opacity-50')}>
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input type="checkbox" className="mt-1 size-4 accent-brand-600" checked={on} disabled={!paid || !allowed} onChange={(e) => toggle(a, e.target.checked)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-small font-medium text-fg-strong">{a.name}</span>
                      <span className="block text-xs text-fg-muted tabular-nums">{price}</span>
                    </span>
                  </label>
                  {on && a.kind === 'PER_UNIT' ? (
                    <div className="mt-2 flex items-center gap-2 ps-7">
                      <label htmlFor={`qty-${a.key}`} className="text-xs text-fg-muted">
                        {t.quantity}{a.unitLabel ? ` (${a.unitLabel})` : ''}
                      </label>
                      <input
                        id={`qty-${a.key}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={MAX_UNITS}
                        value={selected[a.key]}
                        onChange={(e) => setSelected((cur) => ({ ...cur, [a.key]: Math.min(MAX_UNITS, Math.max(1, Math.floor(Number(e.target.value)) || 1)) }))}
                        className="h-9 w-20 rounded-md border border-line bg-surface px-2 text-small tabular-nums text-fg-strong"
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <aside aria-live="polite" className="h-fit rounded-xl border border-line bg-surface p-5 shadow-e1 ink:shadow-none sm:p-7 lg:sticky lg:top-24">
        <h3 className="text-h4 text-fg-strong">{t.yourBill}</h3>
        <dl className="mt-4 space-y-2 text-small">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-muted">{t.planLine}: {plan.name}</dt>
            <dd className="tabular-nums text-fg-strong">{paid ? rs(bill.planTotal) : t.free}</dd>
          </div>
          {bill.lines.map((l) => (
            <div key={l.addOn.key} className="flex justify-between gap-3">
              <dt className="text-fg-muted">
                {l.addOn.name}
                {l.addOn.kind === 'PER_UNIT' && l.qty > 1 ? ` × ${l.qty}` : ''}
              </dt>
              <dd className="tabular-nums text-fg-strong">
                {l.inBundle ? t.includedInBundle : l.addOn.kind === 'ONE_TIME' ? `${rs(l.oneTime)} (${t.oneTimeLine})` : rs(l.monthly)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 border-t border-line pt-4">
          {paid ? (
            <>
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-small text-fg-muted">{t.perMonthTotal}</span>
                <span className="text-[1.75rem] font-650 leading-none tracking-[-0.03em] text-fg-strong tabular-nums">{rs(bill.perMonth)}</span>
              </p>
              {bill.months > 1 ? (
                <p className="mt-2 flex justify-between gap-3 text-small">
                  <span className="text-fg-muted">{t.periodTotal}</span>
                  <span className="tabular-nums text-fg-strong">{rs(bill.periodTotal)}</span>
                </p>
              ) : null}
              {bill.oneTime > 0 ? (
                <p className="mt-2 flex justify-between gap-3 text-small">
                  <span className="text-fg-muted">{t.oneTimeTotal}</span>
                  <span className="tabular-nums text-fg-strong">{rs(bill.oneTime)}</span>
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-[1.75rem] font-650 leading-none text-fg-strong">{t.free}</p>
          )}
        </div>
        <a
          href={signupUrl}
          onClick={() => track('cta_click', { area: 'pricing', label: `calculator:${plan.slug}` })}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-700 px-5 text-small font-semibold text-white hover:bg-brand-800 ink:bg-brand-400 ink:text-slate-950"
        >
          {paid ? fill(t.cta, { days: trialDays }) : t.ctaFree}
        </a>
        <p className="mt-3 text-center text-xs text-fg-subtle">{t.priceNote}</p>
      </aside>
    </div>
  );
}
