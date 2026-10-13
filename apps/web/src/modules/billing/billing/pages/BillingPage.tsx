/**
 * Billing centre: the plan in use with renewal and owner actions, usage
 * against plan limits, Nafaa bills with pay and print, payments sent, and
 * the plan comparison. /billing, /plans and /plan-usage open it on their tab.
 *
 * Keys: 1-5 tabs · / search bills · M Q Y price period · R refresh · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3, CalendarClock, CheckCircle2, Clock, CreditCard, FileText, Gauge, GraduationCap, Layers, ListFilter,
  Receipt, RefreshCw, Sparkles, Wallet,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, type FilterOption, type ViewTab,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import type { BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import type { Invoice, InvoiceStatus, Payment, PaymentStatus } from '../api/billing.api';
import { useBilling } from '../hooks/useBilling';
import { INVOICE_STATUS, PAYMENT_STATUS, SUBSCRIPTION_STATUS, daysText, formatDate } from '../components/helpers';
import { InvoiceList, InvoiceModal } from '../components/InvoiceList';
import { PaymentList, PaymentModal } from '../components/PaymentList';
import { PlanCompare } from '../components/PlanCompare';
import { PlanSummary } from '../components/PlanSummary';
import { UsageMeters, usedPercent } from '../components/UsageMeters';
import { billingDoc } from '../components/print';

export type BillingTab = 'overview' | 'usage' | 'invoices' | 'payments' | 'plans';
const ORDER: BillingTab[] = ['overview', 'usage', 'invoices', 'payments', 'plans'];

type InvoiceFilter = 'all' | 'open' | InvoiceStatus;
type PaymentFilter = 'all' | PaymentStatus;

const INVOICE_FILTERS: Array<FilterOption<InvoiceFilter>> = [
  { value: 'all', label: 'Sab bill' },
  { value: 'open', label: 'Khule bill', hint: 'Baqi + der wale', icon: Clock, color: '#d97706' },
  ...(['PAID', 'OVERDUE', 'PENDING', 'CANCELLED', 'REFUNDED'] as const).map((s) => ({ value: s, label: INVOICE_STATUS[s].label, icon: INVOICE_STATUS[s].icon, color: INVOICE_STATUS[s].color })),
];
const PAYMENT_FILTERS: Array<FilterOption<PaymentFilter>> = [
  { value: 'all', label: 'Sab payments' },
  ...(['PENDING', 'APPROVED', 'REJECTED', 'REFUNDED'] as const).map((s) => ({ value: s, label: PAYMENT_STATUS[s].label, icon: PAYMENT_STATUS[s].icon, color: PAYMENT_STATUS[s].color })),
];

export function BillingCenter({ defaultTab = 'overview' }: { defaultTab?: BillingTab }) {
  const b = useBilling();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [interval, setInterval] = useState<BillingInterval>('MONTHLY');
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null);
  const [openPayment, setOpenPayment] = useState<Payment | null>(null);

  const allowed = useMemo(() => ORDER.filter((t) => (t === 'usage' ? b.can.usage : t === 'plans' ? b.can.plans : b.can.billing)), [b.can.usage, b.can.plans, b.can.billing]);
  const asked = params.get('tab') as BillingTab | null;
  const tab: BillingTab = asked && allowed.includes(asked) ? asked : allowed.includes(defaultTab) ? defaultTab : allowed[0] ?? defaultTab;
  const setTab = (t: BillingTab) => setParams((x) => { const n = new URLSearchParams(x); n.set('tab', t); return n; }, { replace: true });

  /** Plans tab, on the current interval when the plan needs renewing. */
  const goPlans = () => { if (b.needsRenewal && b.sub?.interval) setInterval(b.sub.interval); setTab('plans'); };

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
      if (k === 'r') b.refresh();
      if (tab === 'plans' && (k === 'm' || k === 'q' || k === 'y')) setInterval(k === 'm' ? 'MONTHLY' : k === 'q' ? 'QUARTERLY' : 'YEARLY');
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
  const st = sub ? SUBSCRIPTION_STATUS[sub.status] : null;
  const products = b.usage ? b.usage.usage.products : null;
  const productPct = products ? usedPercent(products.current, products.limit, 999_999) : null;
  const tabs: ViewTab<BillingTab>[] = ([
    { id: 'overview', label: 'Mera plan', icon: Layers },
    { id: 'usage', label: 'Istemaal', icon: Gauge },
    { id: 'invoices', label: 'Bill', icon: Receipt, count: b.invoices.length || null },
    { id: 'payments', label: 'Payments', icon: Wallet, count: b.payments.length || null },
    { id: 'plans', label: 'Plans', icon: Sparkles },
  ] as ViewTab<BillingTab>[]).filter((t) => allowed.includes(t.id));

  const listTab = tab === 'invoices' || tab === 'payments';
  const filterActive = tab === 'invoices' ? invoiceFilter !== 'all' : paymentFilter !== 'all';

  return (
    <PageShell>
      {openInvoice && <InvoiceModal invoice={openInvoice} onClose={() => setOpenInvoice(null)} />}
      {openPayment && <PaymentModal payment={openPayment} onClose={() => setOpenPayment(null)} />}
      {guide.isOpen && <BillingGuide onClose={guide.close} />}

      <PageHero
        title="Billing aur plan"
        chip={st ? <><st.icon />{st.label}</> : <><Layers />Nafaa subscription</>}
        meta="Nafaa ka bill, payment aur plan ki had"
        busy={b.fetching && !b.loading.sub}
        loading={b.loading.sub && b.can.billing}
        actions={<>
          <button type="button" onClick={b.refresh} title="Taaza karein (R)" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className="h-4 w-4" /></button>
          {b.can.billing && (
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
              <PrintButton doc={() => billingDoc(b.invoices, b.payments, b.totals, sub?.plan?.name)} disabled={!b.invoices.length} label="Record" />
            </span>
          )}
          <button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {b.can.plans && tab !== 'plans' && <button type="button" onClick={goPlans} className={heroPrimaryButton}><Sparkles className="h-4 w-4" />{sub?.status === 'TRIAL' ? 'Plan lein' : b.needsRenewal ? 'Renew' : 'Plans'}</button>}
          {tab === 'plans' && b.can.billing && <button type="button" onClick={() => setTab('overview')} className={heroButton}><Layers className="h-4 w-4" />Mera plan</button>}
        </>}
        stats={b.can.billing ? [
          { label: 'Aap ka plan', value: sub?.plan?.name ?? '—', hint: sub?.amount ? formatPKR(sub.amount) : undefined },
          { label: sub?.status === 'TRIAL' ? 'Trial khatam' : 'Plan khatam', value: formatDate(b.endsAt), hint: b.daysLeft != null ? daysText(b.daysLeft) : undefined },
          { label: 'Dena hai', value: formatPKR(b.totals.due), hint: b.totals.open.length ? `${b.totals.open.length} bill` : 'kuch nahi' },
          { label: 'Ab tak ada kiya', value: formatPKR(b.totals.paidTotal) },
        ] : undefined}
      />

      {b.can.billing && (
        <KpiRow>
          {b.loading.invoices ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
            <>
              <KpiCard icon={Clock} color="#d97706" label="Khule bill" value={formatPKR(b.totals.due)} hint={b.totals.overdue ? `${b.totals.overdue} der wale · dabayein` : `${b.totals.open.length} bill · dabayein`}
                onClick={() => { setInvoiceFilter('open'); setTab('invoices'); }} active={tab === 'invoices' && invoiceFilter === 'open'} />
              <KpiCard icon={FileText} color="#7c3aed" label="Check ho rahi" value={String(b.totals.reviewing)} hint="Payments · 24 ghante me"
                onClick={() => { setPaymentFilter('PENDING'); setTab('payments'); }} active={tab === 'payments' && paymentFilter === 'PENDING'} />
              <KpiCard icon={CheckCircle2} color="#16a34a" label="Ada kiya" value={formatPKR(b.totals.paidTotal)} hint={`${b.totals.paidCount} bill`} />
              <KpiCard icon={BarChart3} color="#2563eb" label="Products" value={products ? products.current.toLocaleString('en-PK') : '—'}
                hint={productPct != null ? `${productPct}% had istemaal` : products ? 'Koi had nahi' : undefined}
                onClick={b.can.usage ? () => setTab('usage') : undefined} active={tab === 'usage'} />
              <KpiCard icon={CalendarClock} color={b.needsRenewal ? '#e11d48' : '#0891b2'} label="Renew" value={b.daysLeft != null ? daysText(b.daysLeft) : '—'} hint={formatDate(b.endsAt)} />
            </>
          )}
        </KpiRow>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={tabs} hint={<><Kbd>1</Kbd>–<Kbd>{String(tabs.length)}</Kbd> se badlein</>} />

      {listTab && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tab === 'invoices' ? 'Bill number ya plan…' : 'Ref / TID, bill number ya naam…'} label="Search" />}
          chips={filterActive || q ? <>
            {tab === 'invoices' && invoiceFilter !== 'all' && <FilterChip onRemove={() => setInvoiceFilter('all')}>{INVOICE_FILTERS.find((f) => f.value === invoiceFilter)?.label}</FilterChip>}
            {tab === 'payments' && paymentFilter !== 'all' && <FilterChip onRemove={() => setPaymentFilter('all')}>{PAYMENT_FILTERS.find((f) => f.value === paymentFilter)?.label}</FilterChip>}
            {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setInvoiceFilter('all'); setPaymentFilter('all'); }}>
          {tab === 'invoices'
            ? <FilterMenu icon={ListFilter} label="Haal" value={invoiceFilter} active={invoiceFilter !== 'all'} options={INVOICE_FILTERS} onChange={setInvoiceFilter} />
            : <FilterMenu icon={ListFilter} label="Haal" value={paymentFilter} active={paymentFilter !== 'all'} options={PAYMENT_FILTERS} onChange={setPaymentFilter} />}
        </FilterBar>
      )}

      {tab === 'overview' && (
        <div className="space-y-4">
          <PlanSummary b={b} onPlans={goPlans} />
          {b.can.usage && <UsageMeters usage={b.usage} loading={b.loading.usage} error={b.usageError} onUpgrade={b.can.plans ? goPlans : undefined} />}
          {b.invoices.length > 0 && (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5">
                <h2 className="text-[0.875rem] font-semibold text-slate-900">Naye bill</h2>
                <button type="button" onClick={() => setTab('invoices')} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Sab dekhein</button>
              </header>
              <InvoiceList invoices={b.invoices.slice(0, 4)} onOpen={setOpenInvoice} />
            </section>
          )}
        </div>
      )}

      {tab === 'usage' && <UsageMeters usage={b.usage} loading={b.loading.usage} error={b.usageError} full onUpgrade={b.can.plans ? goPlans : undefined} />}

      {tab === 'invoices' && (
        <ListBox loading={b.loading.invoices} empty={!invoices.length}
          emptyTitle={b.invoices.length ? 'Is filter me koi bill nahi' : 'Abhi koi bill nahi'}
          emptyText={b.invoices.length ? 'Filter badal kar dekhein' : 'Plan lene par yahan bill aayenge'}
          action={b.invoices.length ? <Button variant="secondary" onClick={() => { setInvoiceFilter('all'); setSearch(''); }}>Filter hatayein</Button> : b.can.plans ? <Button onClick={goPlans}>Plans dekhein</Button> : null}>
          <InvoiceList invoices={invoices} onOpen={setOpenInvoice} />
        </ListBox>
      )}

      {tab === 'payments' && (
        <ListBox loading={b.loading.payments} empty={!payments.length}
          emptyTitle={b.payments.length ? 'Is filter me koi payment nahi' : 'Abhi koi payment nahi bheji'}
          emptyText={b.payments.length ? 'Filter badal kar dekhein' : 'Bill kholein aur "Payment karein" dabayein'}
          action={b.payments.length ? <Button variant="secondary" onClick={() => { setPaymentFilter('all'); setSearch(''); }}>Filter hatayein</Button> : null}>
          <PaymentList payments={payments} onOpen={setOpenPayment} />
        </ListBox>
      )}

      {tab === 'plans' && <PlanCompare b={b} interval={interval} setInterval={setInterval} />}
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
    <PageGuide title="Billing — aasaan tareeqa" onClose={onClose}
      steps={[
        { icon: Layers, color: '#2563eb', title: 'Mera plan', text: 'Kaunsa plan chal raha hai, kab khatam hoga aur kitne ka hai. Plan band ya wapas chalu bhi yahin se.' },
        { icon: Gauge, color: '#7c3aed', title: 'Istemaal', text: 'Products, team, branches aur is mahine ke bill — plan ki had ke muqable me. 75% par peela, 90% par laal.' },
        { icon: Sparkles, color: '#db2777', title: 'Plan chunein', text: 'Plans tab me mahana, 3 mahine ya saalana qeemat dekhein. Lambi period me bachat hai.' },
        { icon: Receipt, color: '#d97706', title: 'Bill ada karein', text: 'Khula bill kholein, "Payment karein" dabayein, bank ya wallet se bhej kar screenshot upload karein.' },
        { icon: Wallet, color: '#16a34a', title: 'Payment ka haal', text: 'Payments tab me dekhein: check ho rahi, approve ya wapas. Wapas hui ho to wajah parh kar dobara bhejein.' },
        { icon: CreditCard, color: '#0891b2', title: 'Print', text: 'Har bill ka A4 ya PDF print — apne record ya accountant ke liye.' },
      ]}
      tips={[
        'Payment khud nahi kat-ti — renew aap ko karna hai. Bache hue din naye period me jud jate hain.',
        'Plan lena, badalna ya band karna sirf malik ya billing ki permission wala kar sakta hai.',
        'Ek hi bill rakhein — doosra plan chunne par wohi khula bill update ho jata hai.',
      ]}
      shortcuts={[['1-5', 'tabs'], ['/', 'bill search'], ['M Q Y', 'muddat'], ['R', 'taaza'], ['G', 'guide']]}
      footer={<Link to="/help" onClick={onClose} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Madad chahiye? →</Link>}
    />
  );
}

export default function BillingPage() {
  return <BillingCenter />;
}
