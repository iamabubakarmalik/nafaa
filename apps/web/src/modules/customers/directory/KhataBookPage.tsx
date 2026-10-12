/**
 * Khata: who owes what and for how long, from the server over every customer.
 * Payments, credit and old-register entries; WhatsApp reminders one by one
 * with editable wording; statement per customer; this month's credit and
 * collection. Behind the app PIN, with amounts hidden by the privacy toggle.
 *
 * Keys: / search · U credit · N reminders · A analytics.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, BookOpen, Download, FileText, History, MessageCircle, MessagesSquare, Plus,
  Search, Settings2, Users, Wallet, X,
} from 'lucide-react';
import { Avatar, Button, Card, FilterMenu, Kbd, PageHero, Skeleton, heroButton, heroIconButton, heroPrimaryButton, type FilterOption } from '@/design-system/components';
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
const AGING: Array<{ id: AgingBucket; label: string; tone: string }> = [
  { id: 'd0', label: '7 din se kam', tone: 'bg-success-500' }, { id: 'd7', label: '7–30 din', tone: 'bg-amber-400' },
  { id: 'd30', label: '30–90 din', tone: 'bg-orange-500' }, { id: 'd90', label: '90+ din', tone: 'bg-rose-600' },
];
const SORTS: Array<FilterOption<DirectoryFilters['sort']>> = [
  { value: 'balance', label: 'Zyada baqi pehle' }, { value: 'aging', label: 'Purana udhaar pehle' },
  { value: 'lastVisit', label: 'Haal hi mein aaye' }, { value: 'name', label: 'Naam (A–Z)' },
];
const LEDGER_LABEL: Record<string, string> = {
  SALE_CREDIT: 'Udhaar bikri', PAYMENT_RECEIVED: 'Payment aayi', ADJUSTMENT: 'Udhaar / tabdeeli', OPENING_BALANCE: 'Purana khata', REFUND: 'Maal wapas', LOYALTY_REDEEMED: 'Points',
};

export function KhataBookPage() {
  return (
    <AppLockGate title="Khata band hai" description="Kholne ke liye PIN daalein">
      <KhataBook />
    </AppLockGate>
  );
}

function KhataBook() {
  const d = useDirectory({ status: 'active', type: 'khata', activity: 'all', sort: 'balance' }, 'nafaa-khata-v2');
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
    <div className="mx-auto w-full max-w-[96rem] space-y-4 pb-12">
      {act && <KhataActionModal action={act.action} customer={act.customer} money={money} onClose={() => setAct(null)} onDone={done} />}
      {picking && <CustomerPicker title={picking === 'opening' ? 'Kis ka purana khata?' : 'Kis ko udhaar?'} money={money} onClose={() => setPicking(null)} onPick={(c) => { setAct({ action: picking, customer: c }); setPicking(null); }} />}
      {wizard && <ReminderWizard customers={wizard} shop={shop} money={money} onClose={() => setWizard(null)} />}
      {templates && <TemplatesModal onClose={() => setTemplates(false)} />}

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
          <button type="button" onClick={() => setTemplates(true)} title="Paigham badlein" className={heroIconButton}><Settings2 className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setPicking('opening')} title="Kaapi ka purana khata" className={heroButton}><History className="h-4 w-4" /><span className="hidden sm:inline">Purana khata</span></button>}
          {canManage && <button type="button" onClick={() => setPicking('udhaar')} className={heroPrimaryButton}><Plus className="h-4 w-4" />Udhaar</button>}
        </>}
        stats={[
          { label: 'Kul lena hai', value: st ? money(st.receivable) : '', hint: st ? `${st.owingCount} customers` : '' },
          { label: '30 din se purana', value: st ? money(old) : '', hint: st ? `${st.aging.d30.count + st.aging.d90.count} customers` : '' },
          { label: 'Is mahine wusool', value: month ? money(month.wasooli) : '…', hint: month ? `udhaar gaya ${money(month.udhaar)}` : '' },
          { label: 'Advance jama', value: st ? money(st.advance) : '', hint: st ? `${st.advanceCount} customers` : '' },
        ]}
      />

      {/* Ageing buckets */}
      {st && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {AGING.map((a) => {
            const on = d.f.aging === a.id;
            const b = st.aging[a.id];
            return (
              <button key={a.id} type="button" onClick={() => { d.set('aging', on ? undefined : a.id); if (!on && d.f.type !== 'khata') d.set('type', 'khata'); }}
                className={cn('rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 transition hover:-translate-y-0.5', on ? 'ring-2 ring-brand-500' : 'ring-slate-200/80')}>
                <div className="flex items-center gap-2 text-[0.75rem] font-medium text-slate-500"><span className={cn('h-2.5 w-2.5 rounded-full', a.tone)} />{a.label}</div>
                <p className="mt-1 text-[1.25rem] font-bold tabular-nums text-slate-900">{money(b.amount)}</p>
                <p className="text-[0.6875rem] text-slate-500">{b.count} customers</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="relative z-10 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex flex-col gap-2 lg:flex-row">
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
            {TYPES.map((t) => {
              const on = d.f.type === t.id;
              return (
                <button key={t.id} type="button" onClick={() => d.set('type', t.id)}
                  className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition', on ? 'bg-slate-900 text-white shadow' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70')}>
                  <t.icon className="h-4 w-4" />{t.label}<span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : 'bg-white text-slate-600')}>{d.data?.tabs[t.id] ?? '·'}</span>
                </button>
              );
            })}
          </div>
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={d.search} onChange={(e) => d.setSearch(e.target.value)} placeholder="Naam ya phone…" aria-label="Dhoondein"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-12 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {d.search ? <button type="button" onClick={() => d.setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          <FilterMenu icon={ArrowDownWideNarrow} label="Tarteeb" value={d.f.sort} options={SORTS} onChange={(v) => d.set('sort', v)} align="right" width="w-60" />
        </div>
        {(d.f.aging || d.search) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 text-[0.75rem]">
            {d.f.aging && <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 font-semibold text-brand-800">{AGING.find((a) => a.id === d.f.aging)?.label}<button type="button" onClick={() => d.set('aging', undefined)} aria-label="Hatayein" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-100"><X className="h-3 w-3" /></button></span>}
            <button type="button" onClick={d.clear} className="ml-auto font-semibold text-rose-700 hover:underline">Sab hatayein</button>
          </div>
        )}
      </div>

      <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
        {([['list', BookOpen, 'Khata', d.count], ['analytics', BarChart3, 'Analytics', null]] as const).map(([id, Icon, l, n]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', tab === id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
            <Icon className="h-4 w-4" />{l}{n !== null && <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{n}</span>}
          </button>
        ))}
      </div>

      {tab === 'analytics' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl" title="Is mahine">
            {!month ? <Skeleton className="h-32 rounded-xl" /> : (
              <div className="space-y-3">
                {[['Udhaar gaya', month.udhaar, 'bg-rose-500'], ['Wusool hua', month.wasooli, 'bg-success-500']].map(([l, v, c]) => (
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
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50 text-success-600"><BookOpen className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{d.hasFilters ? 'Is filter mein koi nahi' : 'Kisi ka udhaar baqi nahi'}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{d.hasFilters ? 'Filter hata kar dekhein.' : 'Mubarak ho — sab ka hisaab saaf hai.'}</p>
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
                    <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-[0.75rem] font-semibold', c.dueDays >= 90 ? 'bg-rose-600 text-white' : c.dueDays >= 30 ? 'bg-orange-50 text-orange-700' : c.dueDays >= 7 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>{c.dueDays} din</span>
                  )}
                  {c.overLimit && <span className="shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[0.75rem] font-semibold text-rose-700">Had paar</span>}
                  <span className={cn('w-28 shrink-0 text-right text-[1.0625rem] font-bold tabular-nums', c.balance > 0 ? 'text-rose-700' : c.balance < 0 ? 'text-success-700' : 'text-slate-400')}>
                    {Math.abs(c.balance) > 0.009 ? money(Math.abs(c.balance)) : 'Saaf'}
                    {c.balance < -0.009 && <span className="block text-[0.625rem] font-semibold uppercase">advance</span>}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    {canManage && c.balance > 0.009 && <Button size="sm" variant="success" onClick={() => setAct({ action: 'payment', customer: c })}>Payment</Button>}
                    {canManage && <button type="button" onClick={() => setAct({ action: 'udhaar', customer: c })} title="Udhaar chadhayein" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><Plus className="h-4 w-4" /></button>}
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
          <button type="button" onClick={() => void d.loadMore()} disabled={d.loadingMore} className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
            {d.loadingMore ? 'Aa rahe hain…' : `Aur dikhayein (${d.items.length} / ${d.count})`}
          </button>
        </div>
      )}
    </div>
  );
}
