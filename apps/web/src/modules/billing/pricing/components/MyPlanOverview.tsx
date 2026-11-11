/**
 * "Mera plan" tab of /billing: the plan and its state, open bills to pay,
 * usage against the plan limits, the shop's add-ons and what the plan
 * includes. Reads GET /billing/overview.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, CreditCard, Gift, LayoutGrid, Sparkles, XCircle } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { BillingOverview, CatalogAddOn, PricingCatalog } from '../api/pricing.api';
import { useCanManageBilling } from '../hooks/usePricing';
import { LIMITS, SERVICE_DETAILS, UNLIMITED, addOnPriceText, addOnState, daysLeft, featureLabel, fmtDate, isService, limitText, rs } from '../lib/catalog-meta';
import { AddOnIcon, StatePill } from './AddOnParts';
import { AddOnSheet } from './AddOnSheet';

const STATE_LOOK = {
  trial: { icon: Sparkles, tone: 'from-sky-600 to-indigo-600', label: 'Free trial' },
  active: { icon: CheckCircle2, tone: 'from-emerald-600 to-teal-600', label: 'Chalu' },
  free: { icon: Gift, tone: 'from-slate-700 to-slate-900', label: 'Free plan' },
  grace: { icon: AlertTriangle, tone: 'from-rose-600 to-amber-500', label: 'Payment baqi' },
  expired: { icon: XCircle, tone: 'from-rose-700 to-rose-500', label: 'Khatam' },
} as const;

export function MyPlanOverview({ overview, catalog, loading }: { overview: BillingOverview | undefined; catalog: PricingCatalog | undefined; loading: boolean }) {
  const navigate = useNavigate();
  const canManage = useCanManageBilling();
  const [sheet, setSheet] = useState<string | null>(null);

  if (loading || !overview) {
    return <div className="space-y-4"><Skeleton className="h-44 rounded-3xl" /><div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-56 rounded-3xl" /><Skeleton className="h-56 rounded-3xl" /></div></div>;
  }

  const look = STATE_LOOK[overview.state];
  const planInvoice = overview.openInvoices.find((i) => !!i.subscriptionId) ?? overview.openInvoices[0] ?? null;
  const headline = overview.state === 'trial' ? t('Trial: {{count}} din baqi', { count: daysLeft(overview.trialEndsAt) })
    : overview.state === 'active' ? t('{{date}} tak chalu', { date: fmtDate(overview.periodEnd) })
      : overview.state === 'grace' ? t('Payment baqi — {{count}} din me app band', { count: overview.graceDaysLeft ?? 0 })
        : overview.state === 'free' ? t('Hamesha free')
          : t('Plan khatam ho gaya');
  const sub = overview.state === 'trial' ? t('Trial {{date}} ko khatam hoga. Sab features aur add-ons abhi free hain.', { date: fmtDate(overview.trialEndsAt) })
    : overview.state === 'active' ? t('Renew ka bill {{date}} se pehle aa jayega.', { date: fmtDate(overview.periodEnd) })
      : overview.state === 'grace' ? t('Plan {{date}} ko khatam hua. Pay karein taake kaam na ruke — data mehfooz hai.', { date: fmtDate(overview.periodEnd) })
        : overview.state === 'free' ? t('Choti dukaan ke liye. Barhne par plan barhayein.')
          : t('Renew karein ya Free plan par jayein. Aap ka data mehfooz hai.');

  const catalogByKey = new Map<string, CatalogAddOn>((catalog?.addOns ?? []).map((a) => [a.key, a]));
  const myAddOns = (catalog?.addOns ?? []).map((a) => ({ a, s: addOnState(a, { ...overview, addOns: overview.addOns }, overview, catalog?.addOns ?? []) }))
    .filter(({ a, s }) => !isService(a) && (s.active || s.id === 'lapsed' || s.id === 'paused'));
  // Trial shops are offered setup help once, until they buy a package.
  const services = (catalog?.addOns ?? []).filter((a) => isService(a) && !a.comingSoon);
  const showSetup = overview.state === 'trial' && services.length > 0 && !overview.addOns.some((r) => services.some((x) => x.key === r.key));
  const plan = catalog?.plans.find((p) => p.id === overview.plan?.id);
  const planFeatures = (plan?.features ?? []).filter((f) => !['pos', 'khata', 'inventory', 'returns', 'barcode', 'cash_register', 'reports', 'offline'].includes(f));

  return (
    <div className="space-y-4">
      {/* Plan and state */}
      <section className={cn('relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-sm sm:p-6', look.tone)}>
        <span className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.75rem] font-semibold ring-1 ring-white/25">
              <look.icon className="h-3.5 w-3.5" />{t(look.label)}
            </span>
            <h2 className="mt-3 text-[1.5rem] font-bold leading-tight sm:text-[1.75rem]">{overview.plan?.name ?? t('Koi plan nahi')}</h2>
            <p className="mt-0.5 text-[1rem] font-semibold text-white/95">{headline}</p>
            <p className="mt-1 max-w-xl text-[0.875rem] text-white/80">{sub}</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {planInvoice && (overview.state === 'grace' || overview.state === 'expired' || !planInvoice.inReview) && (
                <Link to={`/billing/invoice/${planInvoice.id}/pay`} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-[0.875rem] font-bold text-slate-900 shadow-sm hover:bg-white/90">
                  <CreditCard className="h-4 w-4" />{t('{{amount}} pay karein', { amount: rs(planInvoice.amountDue) })}
                </Link>
              )}
            </div>
          )}
        </div>
        {overview.grandfatheredUntil && (
          <p className="relative mt-4 flex items-start gap-2 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[0.875rem] ring-1 ring-white/25">
            <Gift className="mt-0.5 h-4 w-4 shrink-0" />
            <span><b>{t('Purane customer: {{date}} tak sab free', { date: fmtDate(overview.grandfatheredUntil) })}</b> — {t('har feature aur jo add-ons aap istemaal karte hain. Us ke baad apna plan chun lein.')}</span>
          </p>
        )}
      </section>

      {showSetup && (
        <section className="flex flex-wrap items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="text-[0.9375rem] font-bold text-slate-900">{t('Setup chahiye?')}</h3>
            <p className="text-[0.8125rem] text-slate-500">{t('Products daalna, printer lagana, staff sikhana — hamari team kar deti hai.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {services.map((a) => (
              <Link key={a.key} to={`/apps?add=${a.key}`} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200 hover:bg-slate-100">
                <AddOnIcon addOnKey={a.key} size="sm" />
                <span>
                  <span className="block font-semibold text-slate-900">{t(a.name)}</span>
                  <span className="block text-[0.75rem] text-slate-500">{rs(a.priceMonthly)} · {SERVICE_DETAILS[a.key] ? t(SERVICE_DETAILS[a.key].how) : t('ek dafa')}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Bills to pay */}
      {overview.openInvoices.length > 0 && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-amber-200">
          <header className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/60 px-4 py-2.5 sm:px-5">
            <Clock className="h-4 w-4 text-amber-600" />
            <h3 className="text-[0.875rem] font-bold text-slate-900">{t('Bill jo pay karne hain')}</h3>
          </header>
          <ul className="divide-y divide-slate-100">
            {overview.openInvoices.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.875rem] font-semibold text-slate-900">{i.description ?? i.invoiceNumber}</p>
                  <p className="text-[0.75rem] text-slate-500">{i.invoiceNumber} · {t('{{date}} tak', { date: fmtDate(i.dueDate) })}</p>
                </div>
                <span className="text-[1rem] font-bold tabular-nums text-slate-900">{rs(i.amountDue)}</span>
                {i.inReview
                  ? <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[0.75rem] font-semibold text-sky-700 ring-1 ring-sky-200">{t('Check ho rahi hai')}</span>
                  : canManage && <Button size="sm" onClick={() => navigate(`/billing/invoice/${i.id}/pay`)} leftIcon={<CreditCard className="h-4 w-4" />}>{t('Pay karein')}</Button>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Usage */}
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <h3 className="text-[0.9375rem] font-bold text-slate-900">{t('Istemaal')}</h3>
          <p className="text-[0.8125rem] text-slate-500">{t('Plan ki had ke muqable me')}</p>
          <ul className="mt-4 space-y-4">
            {LIMITS.filter((l) => l.key !== 'bookers' || overview.usage.bookers > 0 || (overview.limits.bookers > 0 && overview.limits.bookers < UNLIMITED)).map((l) => {
              const used = overview.usage[l.key] ?? 0;
              const max = overview.limits[l.key] ?? 0;
              const unlimited = max >= UNLIMITED;
              const pct = unlimited || max <= 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
              const color = pct >= 100 ? '#e11d48' : pct >= 80 ? '#d97706' : l.color;
              return (
                <li key={l.key}>
                  <div className="flex items-center justify-between gap-2 text-[0.8125rem]">
                    <span className="flex items-center gap-2 font-medium text-slate-700"><l.icon className="h-4 w-4" style={{ color: l.color }} />{t(l.label)}</span>
                    <span className="tabular-nums text-slate-900"><b>{used.toLocaleString('en-PK')}</b> <span className="text-slate-400">/ {limitText(max)}</span></span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    {unlimited
                      ? <div className="h-full w-full rounded-full bg-gradient-to-r from-slate-200 to-slate-100" />
                      : <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, used > 0 ? 3 : 0)}%`, backgroundColor: color }} />}
                  </div>
                  {pct >= 80 && !unlimited && (
                    <p className="mt-1 text-[0.75rem] font-medium" style={{ color }}>{pct >= 100 ? t('Had poori — plan barhayein') : t('Had ke qareeb')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Add-ons */}
        <section className="flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[0.9375rem] font-bold text-slate-900">{t('Add-ons')}</h3>
              <p className="text-[0.8125rem] text-slate-500">{myAddOns.length ? t('{{count}} chalu', { count: myAddOns.filter((x) => x.s.active).length }) : t('Abhi koi add-on nahi')}</p>
            </div>
            <Link to="/apps" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline"><LayoutGrid className="h-4 w-4" />{t('Sab apps')}</Link>
          </div>
          {myAddOns.length ? (
            <ul className="mt-3 divide-y divide-slate-100">
              {myAddOns.map(({ a, s }) => (
                <li key={a.key} className="flex items-center gap-3 py-2.5">
                  <AddOnIcon addOnKey={a.key} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-semibold text-slate-900">{t(a.name)}{a.kind === 'PER_UNIT' && s.quantity > 1 ? ` × ${s.quantity}` : ''}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5"><StatePill state={s} /><span className="text-[0.75rem] tabular-nums text-slate-500">{addOnPriceText(catalogByKey.get(a.key) ?? a)}</span></div>
                  </div>
                  <button type="button" onClick={() => setSheet(a.key)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-100">{t('Manage')}</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 flex flex-1 flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-6 text-center">
              <LayoutGrid className="h-6 w-6 text-slate-400" />
              <p className="mt-2 text-[0.875rem] text-slate-600">{t('Online store, Shopify, Daraz, distribution, FBR — jo kaam karte hain woh jodein.')}</p>
              <Link to="/apps" className="mt-3 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Apps dekhein')}<ArrowRight className="h-3.5 w-3.5 rtl-flip" /></Link>
            </div>
          )}
        </section>
      </div>

      {/* What the plan includes */}
      {plan && planFeatures.length > 0 && (
        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[0.9375rem] font-bold text-slate-900">{t('{{plan}} plan me shamil', { plan: plan.name })}</h3>
            <Link to="/plans" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Plans ka muqabla')}</Link>
          </div>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">{t('POS, stock, udhaar aur reports har plan me hain. Is ke ilawa:')}</p>
          <ul className="mt-3 grid gap-x-4 gap-y-1.5 text-[0.8125rem] text-slate-700 sm:grid-cols-2 xl:grid-cols-3">
            {planFeatures.map((f) => <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />{featureLabel(f)}</li>)}
          </ul>
        </section>
      )}

      <AddOnSheet addOnKey={sheet} onClose={() => setSheet(null)} />
    </div>
  );
}
