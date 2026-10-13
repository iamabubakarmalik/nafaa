/**
 * Customers: every customer with server-side search (phone in any format),
 * filters and sort, so counts and totals cover the whole list. Who owes,
 * who has gone quiet, birthdays, top spenders, bulk actions, CSV and print.
 *
 * Keys: / search · N new · V view · A analytics · G guide · Esc clear selection.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, CalendarCheck, CloudOff, ArrowDownWideNarrow, BarChart3, BookOpen, Cake, Check, Crown, Download, GraduationCap, LayoutGrid,
  MapPin, MessageCircle, Plus, Search, Snowflake, Table2, ToggleRight, Trophy, UserPlus, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import { Avatar, Button, Card, DateRangeMenu, FilterMenu, Kbd, Modal, PageHero, Skeleton, heroButton, heroIconButton, heroPrimaryButton, type FilterOption } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { DirectoryActivity, DirectoryFilters, DirectoryType } from './api';
import { useDirectory } from './useDirectory';
import { rangeLabel } from '@core/lib/dateRange';
import { customersCsv, customersDoc, fetchAllCustomers } from './exportCustomers';
import { birthdayText, waLink } from './messages';
import { BulkBar } from './components/BulkBar';
import { CustomerCard, CustomerRow, ago } from './components/CustomerCard';
import { QuickAddModal } from './components/QuickAddModal';

const TYPES: Array<{ id: DirectoryType; label: string; icon: LucideIcon; tone?: string }> = [
  { id: 'all', label: 'Sab', icon: Users },
  { id: 'vip', label: 'VIP', icon: Crown, tone: 'text-amber-500' },
  { id: 'khata', label: 'Udhaar wale', icon: BookOpen, tone: 'text-rose-600' },
  { id: 'advance', label: 'Advance', icon: Wallet, tone: 'text-success-600' },
  { id: 'overLimit', label: 'Had se zyada', icon: AlertTriangle, tone: 'text-rose-600' },
];
const ACTIVITY: Array<FilterOption<DirectoryActivity>> = [
  { value: 'all', label: 'Sab' },
  { value: 'new', label: 'Is mahine naye', hint: 'Jo is mahine jore gaye' },
  { value: 'active30', label: '30 din mein aaye', hint: 'Abhi aate rehte hain' },
  { value: 'inactive30', label: '30 din se nahi aaye' },
  { value: 'inactive60', label: '60 din se nahi aaye' },
  { value: 'inactive90', label: '90 din se nahi aaye', hint: 'Kho rahe hain — rabta karein' },
  { value: 'never', label: 'Kabhi nahi khareeda' },
];
const SORTS: Array<FilterOption<DirectoryFilters['sort']>> = [
  { value: 'recent', label: 'Naye jore pehle' }, { value: 'old', label: 'Purane pehle' },
  { value: 'name', label: 'Naam (A–Z)' }, { value: 'nameDesc', label: 'Naam (Z–A)' },
  { value: 'spent', label: 'Zyada khareedne wale' }, { value: 'visits', label: 'Zyada aane wale' },
  { value: 'average', label: 'Bara ausat bill' }, { value: 'lastVisit', label: 'Haal hi mein aaye' },
  { value: 'balance', label: 'Zyada udhaar' }, { value: 'aging', label: 'Purana udhaar pehle' },
];
const STATUS: Array<FilterOption<DirectoryFilters['status']>> = [
  { value: 'active', label: 'Chalu' }, { value: 'inactive', label: 'Band' }, { value: 'all', label: 'Sab' },
];

function FilterChip({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-full bg-brand-50 pl-2.5 pr-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-100">
      {children}
      <button type="button" onClick={onRemove} aria-label="Hatayein" className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-100"><X className="h-3 w-3" /></button>
    </span>
  );
}

export function CustomersPage() {
  const d = useDirectory({ status: 'active', type: 'all', activity: 'all', sort: 'recent' }, 'nafaa-customers-v2');
  const navigate = useNavigate();
  const { sales: money } = useMasked();
  const tenantName = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const currentShop = useAuthStore((s) => s.currentShopId);
  const hasShop = !!currentShop && currentShop !== 'all';
  const can = { create: usePermission(PERMISSIONS.CUSTOMERS_EDIT), edit: usePermission(PERMISSIONS.CUSTOMERS_EDIT), delete: usePermission(PERMISSIONS.CUSTOMERS_EDIT) };
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [adding, setAdding] = useState(false);
  const [guide, setGuide] = useState(false);
  const [exporting, setExporting] = useState(false);
  const st = d.data?.stats;

  const exportCsv = async (only?: string[]) => {
    setExporting(true);
    try {
      const { items } = await fetchAllCustomers(d.filters);
      const rows = only ? items.filter((c) => only.includes(c.id)) : items;
      if (!rows.length) return toast.error('Koi customer nahi');
      customersCsv(rows, [`Customers — ${tenantName}`, `Kul: ${rows.length}`]);
      toast.success(`${rows.length} customer CSV mein`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async () => customersDoc((await fetchAllCustomers(d.filters, 5000)).items, 'Customers', money);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (k === 'n' && can.create) setAdding(true);
      else if (k === 'v') d.setView(d.view === 'grid' ? 'table' : 'grid');
      else if (k === 'a') setTab((t) => (t === 'list' ? 'analytics' : 'list'));
      else if (k === 'g') setGuide(true);
      else if (e.key === 'Escape' && d.selected.size) d.setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [d, can.create]);

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !d.hasMore) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !d.loadingMore) void d.loadMore(); }, { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [d, d.hasMore, d.loadingMore]);

  const selectedRows = useMemo(() => d.items.filter((c) => d.selected.has(c.id)), [d.items, d.selected]);
  const allVisible = d.items.length > 0 && d.items.every((c) => d.selected.has(c.id));
  const selectVisible = () => d.setSelected(allVisible ? new Set() : new Set(d.items.map((c) => c.id)));
  const chips: Array<[string, () => void]> = [];
  if (d.f.activity !== 'all') chips.push([ACTIVITY.find((a) => a.value === d.f.activity)?.label ?? '', () => d.set('activity', 'all')]);
  if (d.f.city) chips.push([d.f.city, () => d.set('city', undefined)]);
  if (d.f.birthday) chips.push(['Is mahine salgirah', () => d.set('birthday', undefined)]);
  if (d.f.status !== 'active') chips.push([d.f.status === 'inactive' ? 'Band' : 'Chalu + band', () => d.set('status', 'active')]);
  if (d.f.scope === 'all') chips.push(['Saari branches', () => d.set('scope', undefined)]);
  if (d.search.trim()) chips.push([`"${d.search.trim()}"`, () => d.setSearch('')]);
  if (d.period) chips.push([rangeLabel(d.period.from, d.period.to), () => d.setRange({ preset: 'all', custom: { from: '', to: '' } })]);

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {adding && <QuickAddModal onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); d.refresh(); navigate(`/customers/${id}`); }} />}
      {guide && <CustomersGuide onClose={() => setGuide(false)} />}

      <PageHero
        title="Customers"
        chip={<><Users />{st ? `${st.total} customer` : '…'}</>}
        busy={d.fetching && !d.loading}
        meta={tenantName}
        loading={d.loading || !st}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <Link to="/khata" className={heroButton}><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Khata</span></Link>
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.create && <button type="button" onClick={() => setAdding(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya</button>}
          {can.create && <Link to="/customers/new" title="Poori details ke saath" className={heroIconButton}><UserPlus className="h-4 w-4" /></Link>}
        </>}
        stats={[
          { label: 'Kul udhaar baqi', value: st ? money(st.receivable) : '', hint: st ? `${st.owingCount} customers` : '' },
          { label: 'Kul khareedari', value: st ? money(st.spent) : '', hint: st ? `${st.buyers} ne khareeda` : '' },
          { label: 'Is mahine naye', value: st ? String(st.newThisMonth) : '', hint: st ? `${st.vip} VIP` : '' },
          { label: '90 din se nahi aaye', value: st ? String(st.inactive90) : '', hint: st ? `${st.never} ne kabhi nahi khareeda` : '' },
        ]}
      />

      {d.offline && (
        <p className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
          <CloudOff className="h-4 w-4" />Internet nahi — computer par save customers dikh rahe hain. Aamad aur sale ki ginti internet aane par.
        </p>
      )}
      {d.data?.period && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
          <span className="text-[0.8125rem] font-semibold text-slate-900">{rangeLabel(d.data.period.from, d.data.period.to)}</span>
          <span className="text-[0.8125rem] text-slate-600"><strong className="tabular-nums text-slate-900">{d.data.period.buyers}</strong> customers ne khareeda</span>
          <span className="text-[0.8125rem] text-slate-600">Kul <strong className="tabular-nums text-slate-900">{money(d.data.period.spent)}</strong> · {d.data.period.visits} bill</span>
          <span className="text-[0.8125rem] text-slate-600"><strong className="tabular-nums text-slate-900">{d.data.period.joined}</strong> naye jore</span>
          <span className="text-[0.8125rem] text-slate-600">Udhaar <strong className="tabular-nums text-rose-700">{money(d.data.period.credit)}</strong> · receive <strong className="tabular-nums text-success-700">{money(d.data.period.paid)}</strong></span>
        </div>
      )}

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
        {TYPES.map((t) => {
          const on = d.f.type === t.id;
          return (
            <button key={t.id} type="button" onClick={() => d.set('type', t.id)}
              className={cn('inline-flex h-10 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition',
                on ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50')}>
              <t.icon className={cn('h-4 w-4', !on && t.tone)} />{t.label}
              <span className={cn('min-w-[1.5rem] rounded-full px-1.5 text-center text-[0.6875rem] tabular-nums', on ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{d.data?.tabs[t.id] ?? '·'}</span>
            </button>
          );
        })}
      </div>

      {st && st.birthdays.length > 0 && !d.hasFilters && tab === 'list' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-pink-50 px-4 py-3 ring-1 ring-pink-200/70">
          <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-pink-900"><Cake className="h-4 w-4 text-pink-600" />Is mahine salgirah:</span>
          {st.birthdays.slice(0, 8).map((b) => {
            const link = waLink(b.phone, birthdayText(b, tenantName));
            return (
              <span key={b.id} className="inline-flex items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1 text-[0.75rem] font-medium text-pink-900 ring-1 ring-pink-200">
                <Link to={`/customers/${b.id}`} className="hover:underline">{b.name} · {b.day}</Link>
                {link && <a href={link} target="_blank" rel="noreferrer" title="Mubarakbad bhejein" className="flex h-5 w-5 items-center justify-center rounded-full text-success-600 hover:bg-success-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
              </span>
            );
          })}
          <button type="button" onClick={() => d.set('birthday', 'month')} className="ml-auto text-[0.75rem] font-semibold text-pink-800 hover:underline">Sab dekhein →</button>
        </div>
      )}

      <div className="relative z-10 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:p-4">
        <div className="flex flex-col gap-2 xl:flex-row">
          <label className="group relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-600" />
            <input ref={searchRef} value={d.search} onChange={(e) => d.setSearch(e.target.value)} placeholder="Naam, phone (kisi bhi tarah), CNIC, sheher…" aria-label="Customer search"
              className="h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-12 pr-16 text-[0.9375rem] outline-none ring-1 ring-transparent transition focus:bg-white focus:ring-2 focus:ring-brand-500" />
            {d.search ? <button type="button" onClick={() => d.setSearch('')} aria-label="Saaf" className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200"><X className="h-4 w-4" /></button>
              : <Kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:inline-flex">/</Kbd>}
          </label>
          <div className="flex flex-wrap gap-2">
            <DateRangeMenu value={d.range} onChange={d.setRange} startHour={d.startHour} />
            {d.period && (
              <FilterMenu icon={CalendarCheck} label="Is period mein" value={d.f.dateOn ?? 'sales'} active
                options={[{ value: 'sales', label: 'Khareeda', hint: 'Jinhon ne is period mein khareeda' }, { value: 'joined', label: 'Naye jore', hint: 'Jo is period mein bane' }, { value: 'khata', label: 'Khata ka len-den', hint: 'Udhaar ya payment hui' }]}
                onChange={(v) => d.set('dateOn', v as 'sales' | 'joined' | 'khata')} />
            )}
            <FilterMenu icon={Activity} label="Aamad" value={d.f.activity} active={d.f.activity !== 'all'} width="w-72"
              options={ACTIVITY.map((a) => ({ ...a, hint: [a.hint, d.data ? `${d.data.activity[a.value]} customer` : ''].filter(Boolean).join(' · ') }))} onChange={(v) => d.set('activity', v)} />
            {(d.data?.cities.length ?? 0) > 0 && (
              <FilterMenu icon={MapPin} label="Sheher" value={d.f.city ?? 'all'} active={!!d.f.city}
                options={[{ value: 'all', label: 'Har sheher' }, ...d.data!.cities.map((c) => ({ value: c.name, label: c.name, hint: `${c.count}` }))]}
                onChange={(v) => d.set('city', v === 'all' ? undefined : v)} />
            )}
            <FilterMenu icon={ToggleRight} label="Halat" value={d.f.status} active={d.f.status !== 'active'} options={STATUS} onChange={(v) => d.set('status', v)} />
            <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={d.f.sort} options={SORTS} onChange={(v) => d.set('sort', v)} align="right" width="w-64" />
            <button type="button" onClick={() => d.set('birthday', d.f.birthday ? undefined : 'month')} title="Is mahine salgirah"
              className={cn('flex h-11 w-11 items-center justify-center rounded-2xl transition', d.f.birthday ? 'bg-pink-100 text-pink-700 ring-1 ring-pink-200' : 'bg-slate-100/80 text-slate-500 hover:bg-slate-200/70')}><Cake className="h-4 w-4" /></button>
            {hasShop && (
              <button type="button" onClick={() => d.set('scope', d.f.scope === 'all' ? undefined : 'all')} title="Saari branches ke customers"
                className={cn('h-11 rounded-2xl px-3 text-[0.8125rem] font-semibold transition', d.f.scope === 'all' ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70')}>
                {d.f.scope === 'all' ? 'Saari branches' : 'Is branch ke'}
              </button>
            )}
            <div className="inline-flex rounded-2xl bg-slate-100/80 p-1" role="radiogroup" aria-label="Dikhane ka tareeqa">
              {([['grid', LayoutGrid, 'Cards'], ['table', Table2, 'Table']] as const).map(([v, Icon, l]) => (
                <button key={v} type="button" role="radio" aria-checked={d.view === v} onClick={() => d.setView(v)} title={`${l} (V)`}
                  className={cn('flex h-9 w-9 items-center justify-center rounded-xl transition', d.view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}><Icon className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Lage filter:</span>
            {chips.map(([l, r]) => <FilterChip key={l} onRemove={r}>{l}</FilterChip>)}
            <button type="button" onClick={d.clear} className="ml-auto inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50"><X className="h-3.5 w-3.5" />Sab hatayein</button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="inline-flex gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200/80">
          {([['list', Users, 'Customers', d.count], ['analytics', BarChart3, 'Analytics', null]] as const).map(([id, Icon, l, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('inline-flex h-9 items-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition', tab === id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100')}>
              <Icon className="h-4 w-4" />{l}{n !== null && <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{n}</span>}
            </button>
          ))}
        </div>
        {tab === 'list' && d.items.length > 0 && (
          <button type="button" onClick={selectVisible} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-600 hover:text-slate-900">
            <span className={cn('flex h-5 w-5 items-center justify-center rounded border-2', allVisible ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}><Check className="h-3 w-3" strokeWidth={3} /></span>
            {allVisible ? 'Chunna khatam' : `Nazar aane wale ${d.items.length} chunein`}
          </button>
        )}
      </div>

      {d.selected.size > 0 && tab === 'list' && (
        <BulkBar selected={selectedRows} can={can} onClear={() => d.setSelected(new Set())} onExport={() => void exportCsv([...d.selected])}
          onDone={() => { d.setSelected(new Set()); d.refresh(); }} />
      )}

      {tab === 'analytics' ? (
        st ? <CustomersAnalytics stats={st} activity={d.data!.activity} cities={d.data!.cities} money={money} onFilter={(patch) => { setTab('list'); Object.entries(patch).forEach(([k, v]) => d.set(k as never, v as never)); }} />
          : <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : d.loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}</div>
      ) : d.items.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><Users className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{d.hasFilters ? 'Is filter mein koi nahi' : 'Abhi koi customer nahi'}</h3>
          <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{d.hasFilters ? 'Filter badal kar dekhein.' : 'POS par bill banate waqt naam aur phone likhein — customer khud ban jata hai. Ya yahan se jorein.'}</p>
          <div className="mt-4 flex gap-2">{d.hasFilters ? <Button variant="secondary" onClick={d.clear}>Filter hatayein</Button> : can.create && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setAdding(true)}>Naya customer</Button>}</div>
        </div>
      ) : d.view === 'grid' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {d.items.map((c) => <CustomerCard key={c.id} c={c} money={money} shop={tenantName} selected={d.selected.has(c.id)} selecting={d.selected.size > 0} onToggle={() => d.toggle(c.id)} canEdit={can.edit} />)}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <table className="w-full min-w-[56rem]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-10 py-2.5 pl-4"><button type="button" onClick={selectVisible} aria-label="Sab chunein" className={cn('flex h-6 w-6 items-center justify-center rounded-md border-2', allVisible ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent')}><Check className="h-3.5 w-3.5" strokeWidth={3} /></button></th>
                <th className="py-2.5 pr-3">Customer</th><th className="px-3 py-2.5">Sheher</th><th className="px-3 py-2.5 text-right">Aaya</th><th className="px-3 py-2.5 text-right">Khareeda</th>
                <th className="px-3 py-2.5 text-right">Ausat</th><th className="px-3 py-2.5">Aakhri dafa</th><th className="px-3 py-2.5 text-right">Hisaab</th><th className="py-2.5 pr-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.items.map((c) => <CustomerRow key={c.id} c={c} money={money} shop={tenantName} selected={d.selected.has(c.id)} selecting={d.selected.size > 0} onToggle={() => d.toggle(c.id)} canEdit={can.edit} />)}
            </tbody>
          </table>
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

function CustomersAnalytics({ stats, activity, cities, money, onFilter }: {
  stats: NonNullable<ReturnType<typeof useDirectory>['data']>['stats'];
  activity: Record<DirectoryActivity, number>;
  cities: Array<{ name: string; count: number }>;
  money: (n: number) => string;
  onFilter: (patch: Partial<DirectoryFilters>) => void;
}) {
  const aging = [
    { k: 'd0' as const, l: '7 din se kam', c: 'bg-success-500' }, { k: 'd7' as const, l: '7–30 din', c: 'bg-amber-400' },
    { k: 'd30' as const, l: '30–90 din', c: 'bg-orange-500' }, { k: 'd90' as const, l: '90 din se zyada', c: 'bg-rose-600' },
  ];
  const agingMax = Math.max(1, ...aging.map((a) => stats.aging[a.k].amount));
  const life = [
    { k: 'active30' as const, l: 'Pichhle 30 din mein aaye', c: 'bg-success-500' },
    { k: 'inactive30' as const, l: '30+ din se nahi aaye', c: 'bg-amber-400' },
    { k: 'inactive90' as const, l: '90+ din se nahi aaye', c: 'bg-rose-500' },
    { k: 'never' as const, l: 'Kabhi nahi khareeda', c: 'bg-slate-400' },
  ];
  const lifeMax = Math.max(1, ...life.map((x) => activity[x.k]));
  const cityMax = Math.max(1, ...cities.map((c) => c.count));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { icon: BookOpen, color: '#e11d48', l: 'Kul udhaar', v: money(stats.receivable), h: `${stats.owingCount} customers · ${stats.overLimit} had se zyada` },
          { icon: Wallet, color: '#16a34a', l: 'Advance jama', v: money(stats.advance), h: `${stats.advanceCount} customers` },
          { icon: Trophy, color: '#d97706', l: 'Ausat khareedari', v: money(stats.buyers ? stats.spent / stats.buyers : 0), h: `${stats.buyers} khareedne walon par` },
          { icon: Snowflake, color: '#64748b', l: 'Kho rahe hain', v: String(stats.inactive90), h: '90 din se nahi aaye' },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
            <div className="flex items-center gap-2 text-[0.75rem] font-medium text-slate-500"><span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${x.color}17`, color: x.color }}><x.icon className="h-4 w-4" /></span>{x.l}</div>
            <p className="mt-2 truncate text-[1.375rem] font-bold tabular-nums text-slate-900">{x.v}</p>
            <p className="truncate text-[0.75rem] text-slate-500">{x.h}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title="Udhaar kitna purana hai" description="Pehle wala udhaar pehle chukta maana gaya">
          <ul className="space-y-3">
            {aging.map((a) => (
              <li key={a.k}>
                <button type="button" onClick={() => onFilter({ type: 'khata', aging: a.k })} className="w-full text-left">
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{a.l} <span className="text-slate-400">· {stats.aging[a.k].count}</span></span><span className="font-semibold tabular-nums">{money(stats.aging[a.k].amount)}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', a.c)} style={{ width: `${(stats.aging[a.k].amount / agingMax) * 100}%` }} /></div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="rounded-2xl" title="Kitne customer aate rehte hain">
          <ul className="space-y-3">
            {life.map((x) => (
              <li key={x.k}>
                <button type="button" onClick={() => onFilter({ activity: x.k })} className="w-full text-left">
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{x.l}</span><span className="font-semibold tabular-nums">{activity[x.k]}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', x.c)} style={{ width: `${(activity[x.k] / lifeMax) * 100}%` }} /></div>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.75rem] text-slate-500">90 din wale customers ko WhatsApp par yaad karein — wapas laana naya dhoondne se sasta hai.</p>
        </Card>
        <Card className="rounded-2xl" title="Sab se achhe customers" flush>
          <ul className="divide-y divide-slate-100 pb-1">
            {stats.topSpenders.map((c, i) => (
              <li key={c.id}>
                <Link to={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 sm:px-5">
                  <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold', i < 3 ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>{i + 1}</span>
                  <Avatar name={c.name} url={c.avatarUrl ?? undefined} size={30} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[0.8125rem] font-medium text-slate-900">{c.name}</span><span className="block text-[0.6875rem] text-slate-500">{c.visits} dafa · aakhri {ago(c.daysSinceVisit)}</span></span>
                  <span className="text-[0.8125rem] font-semibold tabular-nums">{money(c.spent)}</span>
                </Link>
              </li>
            ))}
            {stats.topSpenders.length === 0 && <li className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">Abhi koi khareedari nahi</li>}
          </ul>
        </Card>
      </div>
      {cities.length > 0 && (
        <Card className="rounded-2xl" title="Kis sheher se">
          <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {cities.slice(0, 12).map((c) => (
              <li key={c.name}>
                <button type="button" onClick={() => onFilter({ city: c.name })} className="w-full text-left">
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-700">{c.name}</span><span className="font-semibold tabular-nums">{c.count}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${(c.count / cityMax) * 100}%` }} /></div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function CustomersGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: Search, color: '#7c3aed', title: 'Search', text: 'Naam, phone (0300…, +92… kisi bhi tarah), CNIC ya sheher likhein.' },
    { icon: BookOpen, color: '#e11d48', title: 'Udhaar wale', text: '"Udhaar wale" patti — kis ka kitna baqi aur kitne din se. Card par "Yaad dilayein" WhatsApp bhejta hai.' },
    { icon: Snowflake, color: '#64748b', title: 'Jo aana chhor gaye', text: '"Aamad" filter se 30/60/90 din se na aane wale — unhein WhatsApp karein.' },
    { icon: Cake, color: '#db2777', title: 'Salgirah', text: 'Is mahine ki salgirah upar dikhti hai — ek click mein mubarakbad.' },
    { icon: Crown, color: '#d97706', title: 'VIP', text: 'Achhe customers ko VIP banayein — POS par pehchane jate hain.' },
    { icon: Download, color: '#0891b2', title: 'List nikaalein', text: 'CSV ya Print — is filter ke saare customers.' },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Customers — aasaan tareeqa" description="6 cheezein, bas itna yaad rakhein">
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${s.color}17`, color: s.color }}>
              <s.icon className="h-5 w-5" /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div><p className="text-[0.875rem] font-semibold text-slate-900">{s.title}</p><p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{s.text}</p></div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">Jaldi ke liye:</span>
        {[['/', 'dhoondein'], ['N', 'naya'], ['V', 'cards/table'], ['A', 'analytics'], ['G', 'guide']].map(([k, t]) => <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {t}</span>)}
      </div>
    </Modal>
  );
}
