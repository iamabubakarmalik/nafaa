/**
 * Shop accounts: how much money came in and went out of each account (cash,
 * bank, card, JazzCash, Easypaisa), the cash that should be in each open
 * drawer, what the shop owns and owes, a merged ledger of every movement,
 * and analytics. Cash can be put into or taken out of the drawer here.
 *
 * Keys: / search · L ledger · A analytics · I cash in · O cash out · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownCircle, ArrowDownToLine, ArrowUpCircle, ArrowUpFromLine, BarChart3, BookOpen, Calculator, ChevronRight, Coins, Filter,
  GraduationCap, Landmark, LayoutGrid, ListChecks, Package, Printer, Scale, Store, Truck, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, Card, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { isAllShops } from '@core/lib/shopScope';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import {
  moneyApi, type MoneyAccount, type MoneyAccounts, type MoneyDirection, type MoneyDrawer, type MoneyEntry, type MoneyLedgerQuery,
  type MoneyPosition, type MoneySource,
} from '../api/money.api';
import { DrawerMoveModal } from '../components/DrawerMoveModal';
import { MoneyAnalytics } from '../components/MoneyAnalytics';
import { ACCOUNTS, ACCOUNT_IDS, MONEY_KEY, SOURCES, SOURCE_IDS, entryLink, entryTitle, when } from '../components/meta';
import { statementDoc } from '../components/print';

type Tab = 'accounts' | 'ledger' | 'analytics';
type TypeFilter = '' | MoneyDirection | MoneySource;

export default function MoneyPage() {
  const startHour = useBusinessDayStart();
  const { sales: money, cost } = useMasked();
  const canMoveCash = usePermission(PERMISSIONS.CASH_REGISTER_OPEN);
  const allShops = isAllShops(useAuthStore((s) => s.currentShopId));
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [account, setAccount] = useState<'' | MoneyAccount>('');
  const [type, setType] = useState<TypeFilter>('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<Tab>('accounts');
  const [move, setMove] = useState<'CASH_IN' | 'CASH_OUT' | null>(null);
  const guide = usePageGuide();

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, account, type, query]);
  useEffect(() => { if (query) setTab('ledger'); }, [query]);

  const period = resolveRange(range, startHour) ?? undefined;
  const base = { ...period, account: account || undefined };
  const ledgerQ: MoneyLedgerQuery = {
    ...base,
    search: query || undefined,
    ...(type === 'in' || type === 'out' ? { direction: type } : type ? { source: type } : {}),
  };

  const accountsQ = useQuery({ queryKey: [MONEY_KEY, 'accounts', base], queryFn: () => moneyApi.accounts(base), placeholderData: (p) => p, refetchInterval: 60_000 });
  const positionQ = useQuery({ queryKey: [MONEY_KEY, 'position'], queryFn: moneyApi.position, refetchInterval: 60_000 });
  const listQ = useQuery({
    queryKey: [MONEY_KEY, 'ledger', ledgerQ, page],
    queryFn: () => moneyApi.ledger({ ...ledgerQ, page, limit: 40 }),
    placeholderData: (p) => p,
    enabled: tab === 'ledger',
  });

  const acc = accountsQ.data;
  const pos = positionQ.data;
  const ledger = listQ.data;
  const drawer = !allShops ? acc?.cash.drawers[0] ?? null : null;
  const nonCashIn = acc ? acc.accounts.filter((a) => a.method !== 'CASH').reduce((s, a) => s + a.in, 0) : 0;
  const typeLabel = type === 'in' ? 'Sirf aaya' : type === 'out' ? 'Sirf gaya' : type ? SOURCES[type].label : '';
  const filtered = !!account || !!type || !!query;
  const periodText = period ? rangeLabel(period.from, period.to) : '';

  const filterText = [account && ACCOUNTS[account].label, typeLabel, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => statementDoc(await moneyApi.ledger({ ...ledgerQ, page: 1, limit: 500 }), {
    title: account ? `${ACCOUNTS[account].label} statement` : 'Shop accounts statement',
    period: periodText,
    filter: filterText,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); setTab('analytics'); }
      if (k === 'l') { e.preventDefault(); setTab('ledger'); }
      if (canMoveCash && k === 'i') { e.preventDefault(); setMove('CASH_IN'); }
      if (canMoveCash && k === 'o') { e.preventDefault(); setMove('CASH_OUT'); }
      if (e.key === '/') { e.preventDefault(); setTab('ledger'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canMoveCash]);

  const clear = () => { setAccount(''); setType(''); setSearch(''); };
  const openLedger = (a: MoneyAccount | '', t: TypeFilter = '') => { setAccount(a); setType(t); setTab('ledger'); };
  const openToday = (t: TypeFilter) => { setRange({ preset: 'today', custom: { from: '', to: '' } }); openLedger(account, t); };

  return (
    <PageShell>
      <PageHero
        title="Shop accounts"
        chip={<><Landmark /> {periodText || 'Dukaan ka hisaab'}</>}
        meta="Cash, bank aur wallets — kitna aaya, kitna gaya, kitna bacha"
        busy={accountsQ.isFetching && !accountsQ.isLoading}
        loading={accountsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Statement" disabled={!acc} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canMoveCash && <>
            <button type="button" onClick={() => setMove('CASH_OUT')} title="Cash nikalein (O)" className={heroIconButton}><ArrowUpFromLine className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMove('CASH_IN')} title="Cash daalein (I)" className={heroPrimaryButton}><ArrowDownToLine className="h-4 w-4" /> Cash daalein</button>
          </>}
        </>}
        stats={acc ? [
          { label: 'Bacha (aaya − gaya)', value: money(acc.totals.net) },
          { label: 'Aaya', value: money(acc.totals.in) },
          { label: 'Gaya', value: money(acc.totals.out) },
          { label: 'Golak me hona chahiye', value: money(acc.cash.inHand), hint: acc.cash.drawers.length ? `${acc.cash.drawers.length} khula register` : 'koi register khula nahi' },
        ] : [{ label: 'Bacha (aaya − gaya)', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!acc ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wallet} color={ACCOUNTS.CASH.color} label="Golak me cash" value={money(acc.cash.inHand)}
            hint={acc.cash.drawers.length ? 'Khule register ka hisaab' : 'Register band hai'} onClick={() => setTab('accounts')} active={tab === 'accounts'} />
          <KpiCard icon={ArrowDownCircle} color="#16a34a" label="Aaj aaya" value={money(acc.totals.todayIn)} hint="Aaj ke karobari din me"
            onClick={() => openToday('in')} />
          <KpiCard icon={ArrowUpCircle} color="#e11d48" label="Aaj gaya" value={money(acc.totals.todayOut)} hint="Kharch, kharidari, wapsi"
            onClick={() => openToday('out')} />
          <KpiCard icon={Landmark} color={ACCOUNTS.BANK_TRANSFER.color} label="Bank aur wallets me aaya" value={money(nonCashIn)} hint="Bank, card, JazzCash, Easypaisa" />
          <KpiCard icon={Scale} color="#0891b2" label="Dukaan ki maliyat" value={pos ? cost(pos.netWorth) : '—'} hint="Cash + maal + lena − dena" />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Bill no., customer, supplier, kharch ya wajah…" label="Dhoondein" />}
        chips={filtered ? <>
          {account && <FilterChip onRemove={() => setAccount('')}>{ACCOUNTS[account].label}</FilterChip>}
          {type && <FilterChip onRemove={() => setType('')}>{typeLabel}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="month" />
        <FilterMenu icon={Landmark} label={account ? ACCOUNTS[account].short : 'Account'} value={account} active={!!account} onChange={setAccount}
          options={[{ value: '' as const, label: 'Sab accounts' }, ...ACCOUNT_IDS.map((id) => ({ value: id, label: ACCOUNTS[id].label, icon: ACCOUNTS[id].icon, color: ACCOUNTS[id].color }))]} />
        <FilterMenu icon={Filter} label={typeLabel || 'Qism'} value={type} active={!!type} onChange={setType} align="right"
          options={[
            { value: '' as TypeFilter, label: 'Sab' },
            { value: 'in' as TypeFilter, label: 'Sirf aaya', icon: ArrowDownCircle, color: '#16a34a' },
            { value: 'out' as TypeFilter, label: 'Sirf gaya', icon: ArrowUpCircle, color: '#e11d48' },
            ...SOURCE_IDS.map((s) => ({ value: s as TypeFilter, label: SOURCES[s].label, hint: SOURCES[s].hint, icon: SOURCES[s].icon, color: SOURCES[s].color })),
          ]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<><Kbd>/</Kbd> dhoondein · <Kbd>L</Kbd> ledger · <Kbd>A</Kbd> analytics{canMoveCash && <> · <Kbd>I</Kbd>/<Kbd>O</Kbd> cash</>}</>}
        tabs={[
          { id: 'accounts', label: 'Accounts', icon: LayoutGrid },
          { id: 'ledger', label: 'Ledger', icon: ListChecks, count: tab === 'ledger' ? ledger?.total ?? null : null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <MoneyAnalytics filters={base} money={money} /> : tab === 'accounts' ? (
        <AccountsView acc={acc} pos={pos} money={money} cost={cost} allShops={allShops} canMoveCash={canMoveCash}
          onAccount={(a) => openLedger(a)} onMove={setMove} />
      ) : (
        <LedgerView ledger={ledger} loading={listQ.isLoading} money={money} filtered={filtered} onClear={clear}
          page={page} setPage={setPage} />
      )}

      {move && <DrawerMoveModal kind={move} drawer={drawer} allShops={allShops} onClose={() => setMove(null)} />}

      {guide.isOpen && (
        <PageGuide title="Shop accounts — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Landmark, color: '#7c3aed', title: 'Accounts', text: 'Har payment ka tareeqa ek account hai: Cash, Bank transfer, Card, JazzCash aur Easypaisa. Card par click karein to us ki sari entries Ledger me khul jati hain.' },
            { icon: Wallet, color: '#16a34a', title: 'Golak ka cash', text: 'Khule register ki shuru ki raqam + cash bikri + khata wasooli + daala cash − nikala cash − cash kharch, kharidari, supplier adaigi aur wapsi. Yahi golak me hona chahiye.' },
            { icon: ListChecks, color: '#2563eb', title: 'Ledger', text: 'Bikri, wapsi, khata, kharidari, supplier, kharch aur golak ki har entry ek jagah — nayi sab se upar. Entry par click karein to asal bill ya khata khulta hai.' },
            { icon: ArrowDownToLine, color: '#059669', title: 'Cash daalna / nikalna', text: 'Malik ne paise liye, bank me jama karaye ya khulle laye? "Cash daalein" ya nikalne wala button dabayein, raqam aur wajah likhein. Ye Cash register me bhi judta hai.' },
            { icon: Printer, color: '#0891b2', title: 'Statement', text: 'Account aur muddat chun kar "Statement" dabayein — A4, PDF ya thermal par har entry, aaya, gaya aur bacha.' },
            { icon: BarChart3, color: '#d97706', title: 'Analytics', text: 'Roz kitna aaya aur gaya, paisa kahan se aaya aur kahan gaya, aur kharch kis par hua — karobari din ke hisaab se.' },
          ]}
          tips={[
            'Khata wasooli aur purani supplier adaigi par tareeqa likha nahi hota, is liye wo Cash me gini jati hain.',
            'Bikri me wohi raqam judti hai jo rakh li gayi — customer ko diya hua change nikal kar.',
            'Branch chuni ho to sirf us branch ka hisaab dikhta hai; "Sab branches" par poora karobar.',
            'Cash daalne ya nikalne ke liye "Cash register" ki ijazat aur khula register chahiye.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['L', 'ledger'], ['A', 'analytics'], ['I', 'cash daalein'], ['O', 'cash nikalein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/* ═════════════════════════ Accounts tab ═════════════════════════ */

function AccountsView({ acc, pos, money, cost, allShops, canMoveCash, onAccount, onMove }: {
  acc?: MoneyAccounts; pos?: MoneyPosition; money: (n: number) => string; cost: (n: number) => string;
  allShops: boolean; canMoveCash: boolean; onAccount: (a: MoneyAccount) => void; onMove: (k: 'CASH_IN' | 'CASH_OUT') => void;
}) {
  if (!acc) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}</div>;
  const maxIn = Math.max(1, ...acc.accounts.map((a) => a.in));
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {acc.accounts.map((a) => {
          const m = ACCOUNTS[a.method];
          const quiet = !a.in && !a.out;
          return (
            <button key={a.method} type="button" onClick={() => onAccount(a.method)}
              className={cn('group flex flex-col rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md', quiet && 'opacity-70')}>
              <span className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{m.label}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{m.hint}</span>
                </span>
                <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
              </span>
              <span className="mt-3 text-[0.75rem] text-slate-500">Bacha (is muddat)</span>
              <span className={cn('text-xl font-bold tabular-nums', a.net < 0 ? 'text-rose-700' : 'text-slate-900')}>{money(a.net)}</span>
              <span className="mt-2 grid grid-cols-2 gap-2 text-[0.75rem]">
                <span><span className="block text-slate-500">Aaya</span><b className="tabular-nums text-emerald-700">{money(a.in)}</b></span>
                <span><span className="block text-slate-500">Gaya</span><b className="tabular-nums text-rose-700">{money(a.out)}</b></span>
              </span>
              <span className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full" style={{ width: `${(a.in / maxIn) * 100}%`, background: m.color }} /></span>
              <span className="mt-2 truncate text-[0.6875rem] text-slate-500">Aaj: +{money(a.todayIn)} · −{money(a.todayOut)} · {a.count} entries</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Golak (khule register)</span>}
          description="Register khulne se ab tak — yahi cash drawer me hona chahiye"
          actions={canMoveCash && !allShops && acc.cash.drawers.length > 0 ? (
            <span className="flex gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => onMove('CASH_OUT')} leftIcon={<ArrowUpFromLine className="h-4 w-4" />}>Nikalein</Button>
              <Button size="sm" onClick={() => onMove('CASH_IN')} leftIcon={<ArrowDownToLine className="h-4 w-4" />}>Daalein</Button>
            </span>
          ) : undefined}>
          {!acc.cash.drawers.length ? (
            <div className="py-8 text-center">
              <Store className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-2 font-semibold text-slate-900">Koi register khula nahi</p>
              <p className="mt-1 text-sm text-slate-500">Din shuru karne ke liye Cash register kholein — phir golak ka hisaab yahan dikhega.</p>
              <Link to="/cash-register" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cash register par jayein</Link>
            </div>
          ) : (
            <ul className="space-y-3">{acc.cash.drawers.map((d) => <DrawerRow key={d.id} d={d} money={money} />)}</ul>
          )}
        </Card>

        <PositionCard pos={pos} cost={cost} money={money} />
      </div>
    </div>
  );
}

function DrawerRow({ d, money }: { d: MoneyDrawer; money: (n: number) => string }) {
  const [open, setOpen] = useState(false);
  const lines: Array<[string, number]> = [
    ['Shuru ki raqam', d.opening], ['Cash bikri', d.sales], ['Khata wasooli', d.khata], ['Booking', d.bookings], ['Daala', d.cashIn],
    ['Nikala', -d.cashOut], ['Wapsi', -d.refunds], ['Kharidari', -d.purchases], ['Supplier adaigi', -d.suppliers], ['Kharch', -d.expenses],
  ];
  return (
    <li className="rounded-xl ring-1 ring-slate-200">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-slate-900">{d.shop?.name ?? 'Golak'} · {d.registerNumber}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">Khula {when(d.openedAt)}{d.openedBy ? ` · ${d.openedBy}` : ''}</span>
        </span>
        <span className="text-right">
          <span className="block text-base font-bold tabular-nums text-slate-900">{money(d.expected)}</span>
          <span className="block text-[0.6875rem] text-slate-500">{open ? 'Chhupayein' : 'Tafseel'}</span>
        </span>
      </button>
      {open && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2 text-[0.8125rem]">
          {lines.filter(([, v]) => v !== 0).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2"><dt className="text-slate-500">{k}</dt><dd className={cn('tabular-nums font-medium', v < 0 ? 'text-rose-700' : 'text-slate-900')}>{v < 0 ? `−${money(-v)}` : money(v)}</dd></div>
          ))}
        </dl>
      )}
    </li>
  );
}

/** What the shop owns and owes, and how much of the drawer cash is free to spend. */
function PositionCard({ pos, cost, money }: { pos?: MoneyPosition; cost: (n: number) => string; money: (n: number) => string }) {
  const [spend, setSpend] = useState('');
  if (!pos) return <Skeleton className="h-72 rounded-2xl" />;
  const want = Number(spend) || 0;
  const left = pos.spendable - want;
  const rows: Array<{ icon: typeof Coins; label: string; value: string; hint: string; color: string; to: string; minus?: boolean }> = [
    { icon: Wallet, label: 'Golak me cash', value: money(pos.cashInHand), hint: 'Khule register', color: ACCOUNTS.CASH.color, to: '/cash-register' },
    { icon: Package, label: 'Maal (lagat par)', value: cost(pos.stockCost), hint: `Bik jaye to ${cost(pos.stockRetail)}`, color: '#0ea5e9', to: '/products' },
    { icon: BookOpen, label: 'Logon se lena', value: money(pos.receivables), hint: `${pos.receivableCount} customer`, color: '#8b5cf6', to: '/khata' },
    { icon: Truck, label: 'Supplier ko dena', value: money(pos.payables), hint: `${pos.payableCount} supplier`, color: '#e11d48', to: '/suppliers', minus: true },
  ];
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Coins className="h-4 w-4 text-brand-600" />Paisa kahan para hai</span>}
      description="Abhi ka haal — chuni hui muddat se farq nahi parta">
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <li key={r.label}>
            <Link to={r.to} className="flex items-center gap-3 py-2 hover:bg-slate-50">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${r.color}17`, color: r.color }}><r.icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[0.875rem] font-medium text-slate-800">{r.label}</span><span className="block truncate text-[0.75rem] text-slate-500">{r.hint}</span></span>
              <span className={cn('font-semibold tabular-nums', r.minus ? 'text-rose-700' : 'text-slate-900')}>{r.minus ? '−' : ''}{r.value}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2.5 text-white">
        <span className="text-[0.8125rem]">Dukaan ki maliyat</span><b className="tabular-nums">{cost(pos.netWorth)}</b>
      </div>

      <div className="mt-3 rounded-xl bg-emerald-50/70 p-3 ring-1 ring-emerald-200">
        <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-emerald-900"><Calculator className="h-4 w-4" />Kya khareed sakta hoon?</p>
        <p className="mt-0.5 text-[0.75rem] text-emerald-800">
          {pos.shortfall > 0
            ? `Supplier ka ${money(pos.payables)} dena hai — golak se ${money(pos.shortfall)} zyada. Abhi kharch karne layak kuch nahi.`
            : `Golak me supplier ka hissa nikal kar ${money(pos.spendable)} kharch karne layak hai.`}
        </p>
        <label className="mt-2 block text-[0.75rem] font-medium text-emerald-900" htmlFor="spend-calc">Kitne ka maal ya kharch?</label>
        <input id="spend-calc" type="number" inputMode="decimal" min={0} value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="0"
          className="mt-1 h-9 w-full rounded-lg border border-emerald-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
        <p className="mt-1 text-[0.75rem] text-emerald-800">
          {want > 0 ? (left >= 0 ? `Theek hai — is ke baad bhi ${money(left)} bachega.` : `${money(-left)} kam par jayega — supplier ka paisa istemal hoga.`) : 'Raqam likhein, foran bata dega ke paisa poora hai ya nahi.'}
        </p>
      </div>
    </Card>
  );
}

/* ═════════════════════════ Ledger tab ═════════════════════════ */

function LedgerView({ ledger, loading, money, filtered, onClear, page, setPage }: {
  ledger?: { items: MoneyEntry[]; total: number; pages: number; totals: { in: number; out: number; net: number } };
  loading: boolean; money: (n: number) => string; filtered: boolean; onClear: () => void;
  page: number; setPage: (fn: (p: number) => number) => void;
}) {
  if (loading || !ledger) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4rem] rounded-xl" />)}</div>;
  const t = ledger.totals;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
        <span><span className="block text-[0.75rem] text-slate-500">Aaya</span><b className="tabular-nums text-emerald-700">+{money(t.in)}</b></span>
        <span><span className="block text-[0.75rem] text-slate-500">Gaya</span><b className="tabular-nums text-rose-700">−{money(t.out)}</b></span>
        <span className="text-right"><span className="block text-[0.75rem] text-slate-500">Bacha</span><b className={cn('tabular-nums', t.net < 0 ? 'text-rose-700' : 'text-slate-900')}>{money(t.net)}</b></span>
      </div>

      {!ledger.items.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <ListChecks className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi entry nahi' : 'Is muddat me paisa na aaya na gaya'}</p>
          <p className="mt-1 text-sm text-slate-500">Bikri, kharch, kharidari ya khata wasooli hote hi yahan dikhegi.</p>
          {filtered && <Button className="mt-4" variant="ghost" onClick={onClear}>Filter saaf karein</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {ledger.items.map((e) => <EntryRow key={e.id} e={e} money={money} />)}
        </ul>
      )}

      {ledger.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {ledger.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= ledger.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
    </div>
  );
}

function EntryRow({ e, money }: { e: MoneyEntry; money: (n: number) => string }) {
  const s = SOURCES[e.source];
  const a = ACCOUNTS[e.method];
  const link = entryLink(e);
  const inflow = e.direction === 'in';
  const meta = [when(e.at), e.reference, e.shop?.name, e.by].filter(Boolean).join(' · ');
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}14`, color: s.color }}><s.icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{entryTitle(e)}</span>
          <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1" style={{ backgroundColor: `${s.color}12`, color: s.color, borderColor: s.color }}>{s.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600"><a.icon className="h-3 w-3" />{a.short}</span>
        </span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">{meta}</span>
        {e.note && e.note !== e.party && <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{e.note}</span>}
      </span>
      <span className={cn('shrink-0 text-right text-base font-bold tabular-nums', inflow ? 'text-emerald-700' : 'text-rose-700')}>{inflow ? '+' : '−'}{money(e.amount)}</span>
    </>
  );
  return (
    <li>
      {link
        ? <Link to={link} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 sm:px-4">{body}</Link>
        : <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">{body}</div>}
    </li>
  );
}
