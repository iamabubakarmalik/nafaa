/**
 * "Mera plan" (/billing): the plan and its state, usage against the limits,
 * add-ons and bills to pay (MyPlanOverview), then every Nafaa bill with pay
 * and print, and the payments sent. Choosing or changing a plan is /plans;
 * the add-on store is /apps. /plan-usage opens the first tab.
 *
 * Keys: 1-3 tabs · / search bills · R refresh · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Clock, CreditCard, GraduationCap, LayoutGrid, Layers, ListFilter,
  Receipt, RefreshCw, Sparkles, Wallet,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption, type ViewTab,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import type { Invoice, InvoiceStatus, Payment, PaymentStatus } from '../api/billing.api';
import { useBilling } from '../hooks/useBilling';
import { INVOICE_STATUS, PAYMENT_STATUS } from '../components/helpers';
import { InvoiceList, InvoiceModal } from '../components/InvoiceList';
import { PaymentList, PaymentModal } from '../components/PaymentList';
import { MyPlanOverview } from '@modules/billing/pricing/components/MyPlanOverview';
import { useBillingOverview, usePricingCatalog, useRefreshBilling } from '@modules/billing/pricing/hooks/usePricing';
import { addOnState, fmtDateTime, rs, timeLeftText } from '@modules/billing/pricing/lib/catalog-meta';
import { billingDoc } from '../components/print';
import { t as tr } from '@core/i18n';

export type BillingTab = 'overview' | 'invoices' | 'payments';
const ORDER: BillingTab[] = ['overview', 'invoices', 'payments'];

type InvoiceFilter = 'all' | 'open' | InvoiceStatus;
type PaymentFilter = 'all' | PaymentStatus;

const INVOICE_FILTERS: Array<FilterOption<InvoiceFilter>> = [
  { value: 'all', label: tr('Sab bill') },
  { value: 'open', label: tr('Khule bill'), hint: tr('Baqi + der wale'), icon: Clock, color: '#d97706' },
  ...(['PAID', 'OVERDUE', 'PENDING', 'CANCELLED', 'REFUNDED'] as const).map((s) => ({ value: s, label: INVOICE_STATUS[s].label, icon: INVOICE_STATUS[s].icon, color: INVOICE_STATUS[s].color })),
];
const PAYMENT_FILTERS: Array<FilterOption<PaymentFilter>> = [
  { value: 'all', label: tr('Sab payments') },
  ...(['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'] as const).map((s) => ({ value: s, label: PAYMENT_STATUS[s].label, icon: PAYMENT_STATUS[s].icon, color: PAYMENT_STATUS[s].color })),
];

export function BillingCenter({ defaultTab = 'overview' }: { defaultTab?: BillingTab }) {
  const b = useBilling();
  const overviewQ = useBillingOverview();
  const catalogQ = usePricingCatalog();
  const refreshPlan = useRefreshBilling();
  const navigate = useNavigate();
  const ov = overviewQ.data;
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [openPayment, setOpenPayment] = useState<Payment | null>(null);

  const allowed = useMemo(() => ORDER.filter(() => b.can.billing), [b.can.billing]);
  const asked = params.get('tab') as BillingTab | null;
  const tab: BillingTab = asked && allowed.includes(asked) ? asked : allowed.includes(defaultTab) ? defaultTab : allowed[0] ?? defaultTab;
  const setTab = (t: BillingTab) => setParams((x) => { const n = new URLSearchParams(x); n.set('tab', t); return n; }, { replace: true });

  const goPlans = () => navigate('/plans');
  const refreshAll = () => { b.refresh(); refreshPlan(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      const n = Number(e.key);
      if (n >= 1 && n <= allowed.length) setTab(allowed[n - 1]);
      if (e.key === '/' && allowed.includes('invoices')) {
        e.preventDefault();
        if (tab !== 'invoices' && tab !== 'payments') setTab('invoices');
        setTimeout(() => searchRef.current?.focus(), 30);
      }
      if (k === 'r') refreshAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const q = search.trim().toLowerCase();
  const invoices = useMemo(() => b.invoices.filter((i) =>
    (invoiceFilter === 'all' || (invoiceFilter === 'open' ? i.status === 'PENDING' || i.status === 'OVERDUE' : i.status === invoiceFilter))
    && (!q || [i.invoiceNumber, i.description, i.subscription?.plan?.name].some((v) => v?.toLowerCase().includes(q)))), [b.invoices, invoiceFilter, q]);
  const payments = useMemo(() => b.payments.filter((p) =>
    (paymentFilter === 'all' || p.status === paymentFilter)
    && (!q || [p.transactionId, p.invoice?.invoiceNumber, p.payerName, p.provider].some((v) => v?.toLowerCase().includes(q)))), [b.payments, paymentFilter, q]);

  const sub = b.sub;
  const tabs: ViewTab<BillingTab>[] = ([
    { id: 'overview', label: tr('Mera plan'), icon: Layers },
    { id: 'invoices', label: tr('Bill'), icon: Receipt, count: b.invoices.length || null },
    { id: 'payments', label: tr('Payments'), icon: Wallet, count: b.payments.length || null },
  ] as ViewTab<BillingTab>[]).filter((t) => allowed.includes(t.id));
  const STATE_LABEL: Record<string, string> = { trial: tr('Free trial'), active: tr('Chalu'), free: tr('Free plan'), grace: tr('Payment baqi'), expired: tr('Khatam') };
  const endDate = ov?.state === 'trial' ? ov.trialEndsAt : ov?.periodEnd ?? null;
  const activeAddOns = ov && catalogQ.data ? catalogQ.data.addOns.filter((a) => addOnState(a, ov, ov, catalogQ.data.addOns).active).length : 0;

  const listTab = tab === 'invoices' || tab === 'payments';
  const filterActive = tab === 'invoices' ? invoiceFilter !== 'all' : paymentFilter !== 'all';

  return (
    <PageShell>
      {openInvoice && <InvoiceModal invoice={openInvoice} onClose={() => setOpenInvoice(null)} />}
      {openPayment && <PaymentModal payment={openPayment} onClose={() => setOpenPayment(null)} />}
      {guide.isOpen && <BillingGuide onClose={guide.close} />}

      <PageHero
        title={tr('Mera plan')}
        chip={ov ? <><Sparkles />{STATE_LABEL[ov.state]}</> : <><Layers />{tr('Nafaa plan')}</>}
        meta={tr('Plan, istemaal, add-ons aur Nafaa ke bill')}
        busy={(b.fetching || overviewQ.isFetching) && !overviewQ.isLoading}
        loading={overviewQ.isLoading && b.can.billing}
        actions={<>
          <button type="button" onClick={refreshAll} title={tr('Taaza karein (R)')} aria-label={tr('Taaza karein')} className={heroIconButton}><RefreshCw className="h-4 w-4" /></button>
          {b.can.billing && (
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
              <PrintButton doc={() => billingDoc(b.invoices, b.payments, b.totals, sub?.plan?.name)} disabled={!b.invoices.length} label={tr('Record')} />
            </span>
          )}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/apps" className={heroButton}><LayoutGrid className="h-4 w-4" />{tr('Apps & add-ons')}</Link>
          {b.can.plans && <button type="button" onClick={goPlans} className={heroPrimaryButton}><Sparkles className="h-4 w-4" />{ov?.state === 'trial' || ov?.state === 'free' ? tr('Plan chunein') : tr('Plan badlein')}</button>}
        </>}
        stats={b.can.billing ? [
          { label: tr('Aap ka plan'), value: ov?.plan?.name ?? sub?.plan?.name ?? '—', hint: ov ? STATE_LABEL[ov.state] : undefined },
          { label: ov?.state === 'trial' ? tr('Trial khatam') : tr('Plan ki tareekh'), value: ov?.state === 'free' ? tr('Hamesha') : fmtDateTime(endDate), hint: endDate && ov?.state !== 'free' ? timeLeftText(endDate) : undefined },
          { label: tr('Dena hai'), value: rs(b.totals.due), hint: b.totals.open.length ? tr('{{count}} bill', { count: b.totals.open.length }) : tr('kuch nahi') },
          { label: tr('Add-ons'), value: String(activeAddOns), hint: tr('chalu') },
        ] : undefined}
      />

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} hint={<><Kbd>1</Kbd>–<Kbd>{String(tabs.length)}</Kbd> {' '}{tr('se badlein')}</>} />

      {listTab && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tab === 'invoices' ? tr('Bill number ya plan…') : tr('Ref / TID, bill number ya naam…')} label={tr('Search')} />}
          chips={filterActive || q ? <>
            {tab === 'invoices' && invoiceFilter !== 'all' && <FilterChip onRemove={() => setInvoiceFilter('all')}>{INVOICE_FILTERS.find((f) => f.value === invoiceFilter)?.label}</FilterChip>}
            {tab === 'payments' && paymentFilter !== 'all' && <FilterChip onRemove={() => setPaymentFilter('all')}>{PAYMENT_FILTERS.find((f) => f.value === paymentFilter)?.label}</FilterChip>}
            {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setInvoiceFilter('all'); setPaymentFilter('all'); }}>
          {tab === 'invoices'
            ? <FilterMenu icon={ListFilter} label={tr('Haal')} value={invoiceFilter} active={invoiceFilter !== 'all'} options={INVOICE_FILTERS} onChange={setInvoiceFilter} />
            : <FilterMenu icon={ListFilter} label={tr('Haal')} value={paymentFilter} active={paymentFilter !== 'all'} options={PAYMENT_FILTERS} onChange={setPaymentFilter} />}
        </FilterBar>
      )}

      {tab === 'overview' && (
        <div className="space-y-4">
          <MyPlanOverview overview={ov} catalog={catalogQ.data} loading={overviewQ.isLoading} />
          {b.invoices.length > 0 && (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.875rem] font-semibold text-slate-900">{tr('Naye bill')}</h2>
                <button type="button" onClick={() => setTab('invoices')} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Sab dekhein')}</button>
              </header>
              <InvoiceList invoices={b.invoices.slice(0, 4)} onOpen={setOpenInvoice} />
            </section>
          )}
        </div>
      )}

      {tab === 'invoices' && (
        <ListBox loading={b.loading.invoices} empty={!invoices.length}
          emptyTitle={b.invoices.length ? tr('Is filter me koi bill nahi') : tr('Abhi koi bill nahi')}
          emptyText={b.invoices.length ? tr('Filter badal kar dekhein') : tr('Plan lene par yahan bill aayenge')}
          action={b.invoices.length ? <Button variant="secondary" onClick={() => { setInvoiceFilter('all'); setSearch(''); }}>{tr('Filter hatayein')}</Button> : b.can.plans ? <Button onClick={goPlans}>{tr('Plans dekhein')}</Button> : null}>
          <InvoiceList invoices={invoices} onOpen={setOpenInvoice} />
        </ListBox>
      )}

      {tab === 'payments' && (
        <ListBox loading={b.loading.payments} empty={!payments.length}
          emptyTitle={b.payments.length ? tr('Is filter me koi payment nahi') : tr('Abhi koi payment nahi bheji')}
          emptyText={b.payments.length ? tr('Filter badal kar dekhein') : tr('Bill kholein aur "Payment karein" dabayein')}
          action={b.payments.length ? <Button variant="secondary" onClick={() => { setPaymentFilter('all'); setSearch(''); }}>{tr('Filter hatayein')}</Button> : null}>
          <PaymentList payments={payments} onOpen={setOpenPayment} />
        </ListBox>
      )}

    </PageShell>
  );
}

function ListBox({ loading, empty, emptyTitle, emptyText, action, children }: {
  loading: boolean; empty: boolean; emptyTitle: string; emptyText: string; action: ReactNode; children: ReactNode;
}) {
  if (loading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (empty) return <div className="rounded-3xl bg-white ring-1 ring-slate-200/80"><EmptyState icon={<Receipt className="h-6 w-6" />} title={emptyTitle} description={emptyText} action={action} /></div>;
  return <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">{children}</section>;
}

function BillingGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title={tr('Billing — aasaan tareeqa')} onClose={onClose}
      steps={[
        { icon: Layers, color: '#2563eb', title: tr('Mera plan'), text: tr('Kaunsa plan chal raha hai, kab khatam hoga, istemaal kitna hua aur kaun se add-ons chalu hain.') },
        { icon: LayoutGrid, color: '#7c3aed', title: tr('Apps & add-ons'), text: tr('Online store, Shopify, Daraz, distribution, FBR — sirf jo chahiye woh chalu karein. Menu saaf rehta hai.') },
        { icon: Sparkles, color: '#db2777', title: tr('Plan chunein'), text: tr('Plan aur add-ons chunein, mahana, 3 mahine ya saalana. Lambi period me bachat hai.') },
        { icon: Receipt, color: '#d97706', title: tr('Bill ada karein'), text: tr('Khula bill kholein, "Payment karein" dabayein, bank ya wallet se bhej kar screenshot upload karein.') },
        { icon: Wallet, color: '#16a34a', title: tr('Payment ka haal'), text: tr('Payments tab me dekhein: check ho rahi, approve ya wapas. Wapas hui ho to wajah parh kar dobara bhejein.') },
        { icon: CreditCard, color: '#0891b2', title: tr('Print'), text: tr('Har bill ka A4 ya PDF print — apne record ya accountant ke liye.') },
      ]}
      tips={[
        tr('Payment khud nahi kat-ti — renew aap ko karna hai. Bache hue din naye period me jud jate hain.'),
        tr('Plan lena, badalna ya band karna sirf malik ya billing ki permission wala kar sakta hai.'),
        tr('Ek hi bill rakhein — doosra plan chunne par wohi khula bill update ho jata hai.'),
      ]}
      shortcuts={[['1-3', tr('tabs')], ['/', tr('bill search')], ['R', tr('taaza')], ['G', tr('guide')]]}
      footer={<Link to="/help" onClick={onClose} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">{tr('Madad chahiye? →')}</Link>}
    />
  );
}

export default function BillingPage() {
  return <BillingCenter />;
}
