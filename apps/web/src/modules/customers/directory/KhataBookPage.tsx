/**
 * Khata: who owes what and for how long, from the server over every customer.
 * Payments, credit and old-register entries; WhatsApp reminders one by one
 * with editable wording; statement per customer; this month's credit and
 * collection. Behind the app PIN, with amounts hidden by the privacy toggle.
 *
 * Keys: / search · U credit · N reminders · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, BookOpen, Clock3, CloudOff, Download, FileText, GraduationCap, History, Lock, MessageCircle,
  MessagesSquare, Plus, Settings2, Users, Wallet,
} from 'lucide-react';
import {
  Avatar, Button, Card, DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, IconButton, Kbd, KpiCard, KpiRow, PageHero, PageShell,
  SearchField, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, type FilterOption,
} from '@/design-system/components';
import { PageGuide, type GuideStep } from '@core/components/PageGuide';
import { rangeLabel } from '@core/lib/dateRange';
import { AppLockGate } from '@core/security/AppLockGate';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import type { AgingBucket, DirectoryCustomer, DirectoryFilters, DirectoryType } from './api';
import { useDirectory } from './useDirectory';
import { customersCsv, customersDoc, fetchAllCustomers } from './exportCustomers';
import { ago, waFor } from './components/CustomerCard';
import { KhataActionModal, type KhataAction } from './components/KhataActionModal';
import { CustomerPicker, ReminderWizard, TemplatesModal } from './components/KhataTools';

const TYPES: Array<{ id: DirectoryType; label: string; icon: typeof Users }> = [
  { id: 'khata', label: 'Udhaar wale', icon: BookOpen },
  { id: 'overLimit', label: 'Had se zyada', icon: AlertTriangle },
  { id: 'advance', label: 'Advance', icon: Wallet },
  { id: 'all', label: 'Sab customers', icon: Users },
];
const AGING: Array<{ id: AgingBucket; label: string; tone: string; color: string }> = [
  { id: 'd0', label: '7 din se kam', tone: 'bg-success-500', color: '#16a34a' }, { id: 'd7', label: '7–30 din', tone: 'bg-amber-400', color: '#d97706' },
  { id: 'd30', label: '30–90 din', tone: 'bg-orange-500', color: '#ea580c' }, { id: 'd90', label: '90+ din', tone: 'bg-rose-500', color: '#e11d48' },
];
const SORTS: Array<FilterOption<DirectoryFilters['sort']>> = [
  { value: 'balance', label: 'Zyada baqi pehle' }, { value: 'aging', label: 'Purana udhaar pehle' },
  { value: 'lastVisit', label: 'Haal hi mein aaye' }, { value: 'name', label: 'Naam (A–Z)' },
];
const LEDGER_LABEL: Record<string, string> = {
  SALE_CREDIT: 'Udhaar sale', PAYMENT_RECEIVED: 'Payment aayi', ADJUSTMENT: 'Udhaar / tabdeeli', OPENING_BALANCE: 'Purana khata', REFUND: 'Maal wapas', LOYALTY_REDEEMED: 'Points',
};

export function KhataBookPage() {
  return (
    <AppLockGate title="Khata band hai" description="Kholne ke liye PIN daalein">
      <KhataBook />
    </AppLockGate>
  );
}

function KhataBook() {
  const d = useDirectory({ status: 'active', type: 'khata', activity: 'all', sort: 'balance', dateOn: 'khata' }, 'nafaa-khata-v2');
  const currentShop = useAuthStore((s) => s.currentShopId);
  const hasShop = !!currentShop && currentShop !== 'all';
  const [guide, setGuide] = useState(false);
  const { sales: money } = useMasked();
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [act, setAct] = useState<{ action: KhataAction; customer: DirectoryCustomer } | null>(null);
  const [picking, setPicking] = useState<KhataAction | null>(null);
  const [wizard, setWizard] = useState<DirectoryCustomer[] | null>(null);
  const [templates, setTemplates] = useState(false);
  const summary = useQuery({ queryKey: ['khata-summary'], queryFn: customerLedgerApi.summary, staleTime: 60_000 });
  const st = d.data?.stats;
  const old = st ? st.aging.d30.amount + st.aging.d90.amount : 0;

  const startReminders = async () => {
    try {
      const { items } = await fetchAllCustomers({ ...d.filters, type: d.f.type === 'all' ? 'khata' : d.f.type });
      setWizard(items);
    } catch { toast.error('List nahi aayi'); }
  };
  const done = () => { d.refresh(); void summary.refetch(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'u' && canManage) setPicking('udhaar');
      else if (k === 'n') void startReminders();
      else if (k === 'a') setTab((t) => (t === 'list' ? 'analytics' : 'list'));
      else if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !d.hasMore) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !d.loadingMore) void d.loadMore(); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [d, d.hasMore, d.loadingMore]);

  const exportCsv = async () => {
    const { items } = await fetchAllCustomers(d.filters);
    if (!items.length) return toast.error('Koi nahi');
    customersCsv(items, [`Khata — ${shop}`, `Kul baqi: ${items.reduce((s, c) => s + Math.max(0, c.balance), 0).toFixed(2)}`], 'khata');
  };
  const printDoc = async () => customersDoc((await fetchAllCustomers(d.filters, 5000)).items, 'Udhaar ki list', money, true);
  const month = summary.data?.thisMonth;

  return (
    <PageShell>
      {act && <KhataActionModal action={act.action} customer={act.customer} money={money} onClose={() => setAct(null)} onDone={done} />}
      {picking && <CustomerPicker title={picking === 'opening' ? 'Kis ka purana khata?' : 'Kis ko udhaar?'} money={money} onClose={() => setPicking(null)} onPick={(c) => { setAct({ action: picking, customer: c }); setPicking(null); }} />}
      {wizard && <ReminderWizard customers={wizard} shop={shop} money={money} onClose={() => setWizard(null)} />}
      {templates && <TemplatesModal onClose={() => setTemplates(false)} />}
      {guide && <KhataGuide onClose={() => setGuide(false)} />}

      <PageHero
        title="Khata"
        chip={<><BookOpen />{st ? `${st.owingCount} se lena hai` : '…'}</>}
        busy={d.fetching && !d.loading}
        meta={shop}
        loading={d.loading || !st}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void startReminders()} title="Sab ko ek ek kar ke (N)" className={heroButton}><MessagesSquare className="h-4 w-4" /><span className="hidden sm:inline">Yaad-dihani</span></button>
          <button type="button" onClick={() => void exportCsv()} className={heroIconButton} title="CSV"><Download className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={() => setTemplates(true)} title="Message badlein" className={heroIconButton}><Settings2 className="h-4 w-4" /></button>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setPicking('opening')} title="Kaapi ka purana khata" className={heroButton}><History className="h-4 w-4" /><span className="hidden sm:inline">Purana khata</span></button>}
          {canManage && <button type="button" onClick={() => setPicking('udhaar')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Udhaar</button>}
        </>}
        stats={[
          { label: 'Kul lena hai', value: st ? money(st.receivable) : '', hint: st ? `${st.owingCount} customers` : '' },
          { label: '30 din se purana', value: st ? money(old) : '', hint: st ? `${st.aging.d30.count + st.aging.d90.count} customers` : '' },
          { label: 'Is mahine receive', value: month ? money(month.wasooli) : '…', hint: month ? `udhaar gaya ${money(month.udhaar)}` : '' },
          { label: 'Advance jama', value: st ? money(st.advance) : '', hint: st ? `${st.advanceCount} customers` : '' },
        ]}
      />

      {d.offline && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
          <CloudOff className="h-4 w-4" />Internet nahi — computer par save khata dikh raha hai. Payment aur udhaar abhi bhi likh sakte hain, internet aate hi server par chale jayenge.
        </p>
      )}
      {d.data?.period && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <span className="text-[0.8125rem] font-semibold text-slate-900">{rangeLabel(d.data.period.from, d.data.period.to)}</span>
          <span className="text-[0.8125rem] text-slate-600">Udhaar diya <strong className="tabular-nums text-rose-700">{money(d.data.period.credit)}</strong></span>
          <span className="text-[0.8125rem] text-slate-600">Receive hua <strong className="tabular-nums text-success-700">{money(d.data.period.paid)}</strong></span>
          {d.data.period.credit > 0 && <span className="text-[0.8125rem] text-slate-600">Wapas aaya <strong className="tabular-nums">{Math.round((d.data.period.paid / d.data.period.credit) * 100)}%</strong></span>}
          <span className="text-[0.8125rem] text-slate-500">{d.count} customers ka len-den</span>
        </div>
      )}

      {st && (
        <KpiRow cols={4}>
          {AGING.map((a) => {
            const on = d.f.aging === a.id;
            const b = st.aging[a.id];
            return (
              <KpiCard key={a.id} icon={Clock3} color={a.color} label={a.label} value={money(b.amount)} hint={`${b.count} customers`} active={on}
                onClick={() => { d.set('aging', on ? undefined : a.id); if (!on && d.f.type !== 'khata') d.set('type', 'khata'); }} />
            );
          })}
        </KpiRow>
      )}

      <FilterBar
        search={<SearchField ref={searchRef} value={d.search} onChange={d.setSearch} placeholder="Naam ya phone…" label="Search" />}
        chips={(d.f.aging || d.search || d.period) ? <>
          {d.period && <FilterChip onRemove={() => d.setRange({ preset: 'all', custom: { from: '', to: '' } })}>{rangeLabel(d.period.from, d.period.to)}</FilterChip>}
          {d.f.aging && <FilterChip onRemove={() => d.set('aging', undefined)}>{AGING.find((a) => a.id === d.f.aging)?.label}</FilterChip>}
          {d.search && <FilterChip onRemove={() => d.setSearch('')}>“{d.search}”</FilterChip>}
        </> : undefined}
        onClear={d.clear}
      >
        <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {TYPES.map((t) => {
            const on = d.f.type === t.id;
            return (
              <button key={t.id} type="button" onClick={() => d.set('type', t.id)} aria-pressed={on}
                className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition', on ? 'bg-slate-900 text-white shadow' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70')}>
                <t.icon className="h-4 w-4" />{t.label}<span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : 'bg-white text-slate-600')}>{d.data?.tabs[t.id] ?? '·'}</span>
              </button>
            );
          })}
        </div>
        <DateRangeMenu value={d.range} onChange={d.setRange} startHour={d.startHour} label="Len-den" />
        {hasShop && (
          <button type="button" onClick={() => d.set('scope', d.f.scope === 'all' ? undefined : 'all')} title="Saari branches ka khata" aria-pressed={d.f.scope === 'all'}
            className={cn('h-11 rounded-2xl px-3 text-[0.8125rem] font-semibold transition', d.f.scope === 'all' ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70')}>
            {d.f.scope === 'all' ? 'Saari branches' : 'Is branch ka'}
          </button>
        )}
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={d.f.sort} options={SORTS} onChange={(v) => d.set('sort', v)} align="right" width="w-60" />
      </FilterBar>

      <ViewTabs
        tabs={[{ id: 'list', label: 'Khata', icon: BookOpen, count: d.count }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]}
        value={tab} onChange={setTab}
        hint={<><Kbd>/</Kbd> search · <Kbd>U</Kbd> udhaar · <Kbd>A</Kbd> analytics · <Kbd>G</Kbd> guide</>}
      />

      {tab === 'analytics' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl" title="Is mahine">
            {!month ? <Skeleton className="h-32 rounded-xl" /> : (
              <div className="space-y-3">
                {[['Udhaar gaya', month.udhaar, 'bg-rose-500'], ['Receive hua', month.wasooli, 'bg-success-500']].map(([l, v, c]) => (
                  <div key={l as string}>
                    <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{l}</span><span className="font-semibold tabular-nums">{money(v as number)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', c as string)} style={{ width: `${(Number(v) / Math.max(1, month.udhaar, month.wasooli)) * 100}%` }} /></div>
                  </div>
                ))}
                <p className="text-[0.8125rem] text-slate-600">
                  {month.udhaar > 0 ? <>Jitna udhaar gaya us ka <strong>{Math.round((month.wasooli / month.udhaar) * 100)}%</strong> wapas aaya.</> : 'Is mahine koi udhaar nahi gaya.'}
                </p>
              </div>
            )}
          </Card>
          <Card className="rounded-2xl" title="Udhaar kitna purana" description="Pehle wala pehle chukta maana">
            {st && (
              <ul className="space-y-3">
                {AGING.map((a) => {
                  const max = Math.max(1, ...AGING.map((x) => st.aging[x.id].amount));
                  return (
                    <li key={a.id}>
                      <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{a.label} <span className="text-slate-400">· {st.aging[a.id].count}</span></span><span className="font-semibold tabular-nums">{money(st.aging[a.id].amount)}</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', a.tone)} style={{ width: `${(st.aging[a.id].amount / max) * 100}%` }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card className="rounded-2xl" title="Aakhri harkatein" flush>
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {(summary.data?.recentActivity ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-2 px-4 py-2 text-[0.8125rem]">
                  <span className="min-w-0 flex-1"><Link to={`/customers/${a.customer?.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-700">{a.customer?.name ?? '—'}</Link><span className="block text-[0.6875rem] text-slate-500">{LEDGER_LABEL[a.type] ?? a.type} · {new Date(a.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span></span>
                  <span className={cn('font-semibold tabular-nums', a.amount > 0 ? 'text-rose-700' : 'text-success-700')}>{a.amount > 0 ? '+' : '−'}{money(Math.abs(a.amount))}</span>
                </li>
              ))}
              {summary.data && !summary.data.recentActivity.length && <li className="px-5 py-8 text-center text-[0.8125rem] text-slate-500">Abhi kuch nahi</li>}
            </ul>
          </Card>
        </div>
      ) : d.loading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : d.items.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
          <EmptyState icon={<BookOpen className="h-6 w-6" />} title={d.hasFilters ? 'Is filter mein koi nahi' : 'Kisi ka udhaar baqi nahi'}
            description={d.hasFilters ? 'Filter hata kar dekhein.' : 'Mubarak ho — sab ka hisaab saaf hai.'}
            action={d.hasFilters ? <Button variant="secondary" onClick={d.clear}>Filter hatayein</Button> : undefined} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <ul className="divide-y divide-slate-100">
            {d.items.map((c) => {
              const wa = waFor(c, shop);
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                  <Link to={`/customers/${c.id}?tab=khata`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{c.name}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{c.phone ?? 'Phone nahi'} · aakhri dafa {ago(c.daysSinceVisit)}</span>
                    </span>
                  </Link>
                  {c.balance > 0.009 && c.dueDays !== null && (
                    <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-[0.75rem] font-semibold', c.dueDays >= 90 ? 'bg-rose-100 font-bold text-rose-800 ring-1 ring-inset ring-rose-300' : c.dueDays >= 30 ? 'bg-orange-50 text-orange-700' : c.dueDays >= 7 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{c.dueDays} din</span>
                  )}
                  {c.overLimit && <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[0.75rem] font-semibold text-rose-700">Had paar</span>}
                  {c.period && (
                    <span className="hidden shrink-0 text-right text-[0.75rem] leading-tight md:block">
                      {c.period.credit > 0 && <span className="block whitespace-nowrap text-rose-700">+{money(c.period.credit)} diya</span>}
                      {c.period.paid > 0 && <span className="block whitespace-nowrap text-success-700">−{money(c.period.paid)} aaya</span>}
                    </span>
                  )}
                  <span className={cn('min-w-[7rem] shrink-0 whitespace-nowrap text-right text-[1.0625rem] font-bold tabular-nums', c.balance > 0 ? 'text-rose-700' : c.balance < 0 ? 'text-success-700' : 'text-slate-400')}>
                    {Math.abs(c.balance) > 0.009 ? money(Math.abs(c.balance)) : 'Saaf'}
                    {c.balance < -0.009 && <span className="block text-[0.625rem] font-semibold uppercase">advance</span>}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {canManage && c.balance > 0.009 && <Button size="sm" variant="success" onClick={() => setAct({ action: 'payment', customer: c })}>Payment</Button>}
                    {canManage && <IconButton label="Udhaar chadhayein" onClick={() => setAct({ action: 'udhaar', customer: c })}><Plus className="h-4 w-4" /></IconButton>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp yaad-dihani" className="flex h-9 w-9 items-center justify-center rounded-xl text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>}
                    <Link to={`/customers/${c.id}?tab=khata`} title="Statement" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><FileText className="h-4 w-4" /></Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === 'list' && d.hasMore && (
        <div ref={sentinel}>
          <Button variant="secondary" fullWidth size="lg" loading={d.loadingMore} onClick={() => void d.loadMore()}>
            {d.loadingMore ? 'Aa rahe hain…' : `Aur dikhayein (${d.items.length} / ${d.count})`}
          </Button>
        </div>
      )}
    </PageShell>
  );
}

function KhataGuide({ onClose }: { onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: Wallet, color: '#16a34a', title: 'Payment lein', text: 'Customer ke saamne "Payment" dabayein, amount likhein. Poora baqi ek click mein bhar jata hai.' },
    { icon: Plus, color: '#e11d48', title: 'Udhaar chadhayein', text: 'Bina bill ke udhaar (naqd paise diye) — upar "Udhaar" ya customer ke saamne "+".' },
    { icon: History, color: '#7c3aed', title: 'Kaapi ka purana khata', text: '"Purana khata" — register ka purana baqi. Jo udhaar pehle se hai us mein jurta hai, kuch nahi mitta.' },
    { icon: AlertTriangle, color: '#ea580c', title: 'Kitna purana', text: 'Upar ke chaar dabbe: 7 din, 30 din, 90 din se purana. Jo payment aati hai woh sab se purane udhaar mein ginti hai.' },
    { icon: MessagesSquare, color: '#0891b2', title: 'Yaad-dihani', text: '"Yaad-dihani" sab udhaar walon ko ek ek kar ke WhatsApp. Purane udhaar par lehja khud sakht ho jata hai.' },
    { icon: FileText, color: '#475569', title: 'Statement', text: 'Customer ke saamne kaghaz wala button — poora khata, print ya PDF.' },
    { icon: Lock, color: '#db2777', title: 'Hifazat', text: 'Khata PIN ke peeche hai. Aankh wala button amount chhupata hai — grahak saamne ho to.' },
    { icon: CloudOff, color: '#0284c7', title: 'Internet ke bagair', text: 'Internet na ho to bhi payment aur udhaar likhein — internet aate hi khud server par chale jate hain.' },
  ];
  return (
    <PageGuide title="Khata — aasaan tareeqa" steps={steps} onClose={onClose}
      shortcuts={[['/', 'dhoondein'], ['U', 'udhaar'], ['N', 'yaad-dihani'], ['A', 'analytics'], ['G', 'guide']]} />
  );
}
