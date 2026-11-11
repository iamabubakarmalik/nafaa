/**
 * /apps — the add-on store. Optional modules (online selling, distribution,
 * tax, accounting, extra shops and users, services) are listed by section;
 * turning one on adds it to the menu. During the trial everything is free to
 * try. ?add=<key> opens that add-on's sheet directly (used by upgrade prompts).
 */

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, LayoutGrid, RefreshCw, Sparkles } from 'lucide-react';
import {
  Button, EmptyState, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroIconButton, heroPrimaryButton, type ViewTab,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import type { CatalogAddOn } from '../api/pricing.api';
import { useBillingOverview, useEntitlements, usePricingCatalog, useRefreshBilling } from '../hooks/usePricing';
import { SECTIONS, addOnState, daysLeft, fmtDate, rs, sectionOf, type SectionId } from '../lib/catalog-meta';
import { AddOnCard } from '../components/AddOnParts';
import { AddOnSheet } from '../components/AddOnSheet';
import { ServiceCards } from '../components/ServiceCards';

type Tab = 'all' | 'on' | SectionId;

export default function AppsPage() {
  const catalogQ = usePricingCatalog();
  const entQ = useEntitlements();
  const overviewQ = useBillingOverview();
  const refresh = useRefreshBilling();
  const canPlans = usePermission(PERMISSIONS.PLANS_VIEW);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const open = params.get('add');
  const setOpen = (key: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (key) n.set('add', key); else n.delete('add'); return n; }, { replace: true });

  const catalog = catalogQ.data;
  const ent = entQ.data;
  const overview = overviewQ.data;

  const rows = useMemo(() => (catalog?.addOns ?? []).map((a) => ({ addOn: a, state: addOnState(a, ent, overview, catalog?.addOns ?? []), section: sectionOf(a.category) })), [catalog, ent, overview]);
  const activeRows = rows.filter((r) => r.state.active && r.state.id !== 'service');
  // Paid add-ons only: free ones (trial, existing customers, gifts) carry a date or the free flag.
  const monthly = activeRows.filter((r) => r.state.id === 'on' && !r.state.date && r.addOn.kind !== 'ONE_TIME').reduce((n, r) => n + r.addOn.priceMonthly * (r.addOn.kind === 'PER_UNIT' ? r.state.quantity : 1), 0);
  const q = search.trim().toLowerCase();
  const shown = rows.filter((r) => (tab === 'all' || (tab === 'on' ? r.state.active || r.state.id === 'lapsed' : r.section === tab))
    && (!q || `${r.addOn.name} ${t(r.addOn.name)} ${r.addOn.description ?? ''} ${r.addOn.key}`.toLowerCase().includes(q)));

  const trial = ent?.state === 'trial';
  const grandfathered = !!ent?.grandfatheredUntil && !trial;
  const tabs: ViewTab<Tab>[] = [
    { id: 'all', label: t('Sab'), icon: LayoutGrid },
    { id: 'on', label: t('Chalu'), icon: CheckCircle2, count: activeRows.length || null },
    ...SECTIONS.filter((s) => rows.some((r) => r.section === s.id)).map((s) => ({ id: s.id as Tab, label: t(s.title), icon: s.icon })),
  ];

  const loading = catalogQ.isLoading || entQ.isLoading;

  return (
    <PageShell>
      <PageHero
        title={t('Apps & add-ons')}
        chip={trial ? <><Sparkles />{t('Trial me sab free')}</> : <><LayoutGrid />{t('{{count}} chalu', { count: activeRows.length })}</>}
        meta={t('Jo kaam aap karte hain sirf woh chalu karein — menu saaf rehta hai')}
        busy={catalogQ.isFetching || entQ.isFetching}
        loading={loading}
        actions={<>
          <button type="button" onClick={refresh} title={t('Taaza karein')} aria-label={t('Taaza karein')} className={heroIconButton}><RefreshCw className="h-4 w-4" /></button>
          {canPlans && <Link to="/billing" className={heroPrimaryButton}>{t('Mera plan')}<ArrowRight className="h-4 w-4 rtl-flip" /></Link>}
        </>}
        stats={[
          { label: t('Chalu apps'), value: String(activeRows.length), hint: t('{{count}} mil sakte hain', { count: rows.filter((r) => r.state.id !== 'soon' && r.section !== 'services').length }) },
          { label: t('Add-ons ka kharcha'), value: trial ? t('Free') : rs(monthly), hint: trial ? t('Trial me') : t('har mahina') },
          { label: t('Aap ka plan'), value: ent?.plan?.name ?? '—', hint: ent ? stateHint(ent.state) : undefined },
          trial
            ? { label: t('Trial khatam'), value: fmtDate(ent?.trialEndsAt), hint: t('{{days}} din baqi', { days: daysLeft(ent?.trialEndsAt) }) }
            : grandfathered
              ? { label: t('Purane customer'), value: fmtDate(ent?.grandfatheredUntil), hint: t('tak sab free') }
              : { label: t('Plan ki tareekh'), value: fmtDate(ent?.periodEnd), hint: ent?.state === 'free' ? t('Free plan') : undefined },
        ]}
      />

      {(trial || grandfathered) && (
        <div className="flex items-start gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-200">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
          <div className="min-w-0 text-[0.875rem] text-sky-900">
            <p className="font-semibold">{trial ? t('Trial me har add-on free hai — {{date}} tak', { date: fmtDate(ent?.trialEndsAt) }) : t('Purane customer: {{date}} tak sab free', { date: fmtDate(ent?.grandfatheredUntil) })}</p>
            <p className="mt-0.5 text-sky-800">{t('Jo chalu karein woh menu me aa jayega. Baad me rakhna ho to plan ke saath us ka bill aayega.')}</p>
          </div>
        </div>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={tabs}
        right={<div className="w-full sm:w-64"><SearchField value={search} onChange={setSearch} placeholder={t('App dhoondein…')} label={t('Search')} /></div>} />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}</div>
      ) : catalogQ.isError ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
          <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title={t('Apps load nahi hue')} description={t('Internet check karke dobara koshish karein.')} action={<Button onClick={() => catalogQ.refetch()}>{t('Dobara koshish')}</Button>} />
        </div>
      ) : !shown.length ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
          <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title={tab === 'on' ? t('Abhi koi add-on chalu nahi') : t('Koi app nahi mila')}
            description={tab === 'on' ? t('Neeche se jo kaam aap karte hain woh chalu karein.') : t('Doosra lafz likh kar dekhein.')}
            action={<Button variant="secondary" onClick={() => { setTab('all'); setSearch(''); }}>{t('Sab dekhein')}</Button>} />
        </div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.filter((s) => shown.some((r) => r.section === s.id)).map((s) => (
            <section key={s.id} aria-labelledby={`apps-${s.id}`} className="space-y-3">
              <header className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}><s.icon className="h-4 w-4" /></span>
                <div>
                  <h2 id={`apps-${s.id}`} className="text-[1rem] font-bold text-slate-900">{t(s.title)}</h2>
                  <p className="text-[0.8125rem] text-slate-500">{t(s.desc)}</p>
                </div>
              </header>
              {s.id === 'services' ? (
                <ServiceCards rows={shown.filter((r) => r.section === s.id)} catalog={catalog} onOpen={setOpen} />
              ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {shown.filter((r) => r.section === s.id).map((r) => (
                  <AddOnCard key={r.addOn.key} addOn={r.addOn} state={r.state} onOpen={() => setOpen(r.addOn.key)}
                    action={<CardAction addOn={r.addOn} stateId={r.state.id} quantity={r.state.quantity} onOpen={() => setOpen(r.addOn.key)} />} />
                ))}
              </div>
              )}
            </section>
          ))}
        </div>
      )}

      <AddOnSheet addOnKey={open} onClose={() => setOpen(null)} />
    </PageShell>
  );
}

function stateHint(state: string) {
  if (state === 'trial') return t('Trial');
  if (state === 'grace') return t('Payment baqi');
  if (state === 'expired') return t('Khatam');
  if (state === 'free') return t('Hamesha free');
  return t('Chalu');
}

function CardAction({ addOn, stateId, quantity, onOpen }: { addOn: CatalogAddOn; stateId: string; quantity: number; onOpen: () => void }) {
  if (stateId === 'soon') return null;
  const active = !['off', 'lapsed', 'paused'].includes(stateId);
  return (
    <button type="button" onClick={onOpen}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold transition',
        active ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-brand-600 text-brand-fg shadow-sm hover:bg-brand-700')}>
      {active
        ? (addOn.kind === 'PER_UNIT' ? t('{{count}} · badlein', { count: quantity }) : t('Manage'))
        : stateId === 'lapsed' ? t('Payment karein') : t('Chalu karein')}
    </button>
  );
}
