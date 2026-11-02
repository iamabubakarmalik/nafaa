/**
 * Suppliers: who we buy from and what we owe. Search, dues, status, city
 * and sort run on the server a page at a time; each supplier can be paid,
 * messaged or bought from in one tap. Owed money is shown by age.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownWideNarrow, Banknote, BarChart3, BookOpen, Clock, Filter, GraduationCap, MapPin, MessageCircle, Phone, Plus, ShoppingCart, TrendingUp, Truck, Users,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { suppliersDoc } from '../../print';
import {
  Avatar, Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { suppliersApi, type Supplier } from '../api/suppliers.api';
import { SupplierMoneyModal } from '../components/SupplierMoneyModal';
import { SupplierAnalytics } from '../components/SupplierAnalytics';
import { t as tr } from '@core/i18n';

type Dues = 'all' | 'due' | 'clear';
type Status = 'all' | 'active' | 'inactive';
type Sort = 'recent' | 'name' | 'purchased' | 'due' | 'orders';

const daysAgo = (v?: string | null) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000) : null);

export default function SuppliersListPage() {
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [dues, setDues] = useState<Dues>('all');
  const [status, setStatus] = useState<Status>('active');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<Supplier | null>(null);
  const guide = usePageGuide();
  const [tab, setTab] = useState<'list' | 'analytics'>('list');

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [q, dues, status, city, sort]);

  const params = { search: q || undefined, dues, status, city: city || undefined, sort, page, limit: 30 };
  const listQ = useQuery({ queryKey: ['suppliers', 'list', params], queryFn: () => suppliersApi.list(params), placeholderData: (prev) => prev });
  const sumQ = useQuery({ queryKey: ['suppliers', 'summary'], queryFn: suppliersApi.summary, staleTime: 60_000 });
  const s = sumQ.data as (Awaited<ReturnType<typeof suppliersApi.summary>> & { dueAging?: Array<{ bucket: string; amount: number; count: number }>; cityBreakdown?: Array<{ city: string; count: number }>; staleCount?: number }) | undefined;
  const items = listQ.data?.items ?? [];
  const meta = listQ.data?.meta;
  const cities = useMemo(() => [{ value: '', label: tr('Sab shehar') }, ...(s?.cityBreakdown ?? []).map((c) => ({ value: c.city, label: `${c.city} (${c.count})` }))], [s?.cityBreakdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); navigate('/suppliers/new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, canEdit]);

  const DUES = [{ value: 'all' as const, label: tr('Sab') }, { value: 'due' as const, label: tr('Jinhe dena hai') }, { value: 'clear' as const, label: tr('Hisaab saaf') }];
  const STATUSES = [{ value: 'active' as const, label: tr('Chalu') }, { value: 'inactive' as const, label: tr('Band') }, { value: 'all' as const, label: tr('Sab') }];
  const filtered = dues !== 'all' || status !== 'active' || !!city || !!q;
  const clear = () => { setDues('all'); setStatus('active'); setCity(''); setSearch(''); };
  const AGING_COLORS = ['#16a34a', '#d97706', '#ea580c', '#e11d48'];

  return (
    <PageShell>
      <PageHero
        title={tr('Suppliers')}
        chip={<><Truck /> {' '}{tr('Jin se maal aata hai')}</>}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
            <PrintButton doc={async () => suppliersDoc((await suppliersApi.list({ ...params, page: 1, limit: 500 })).items)} disabled={!items.length} />
          </span>
          <Link to="/purchases" className={heroButton}><ShoppingCart className="h-4 w-4" /> {' '}{tr('Purchase')}</Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <Link to="/suppliers/new" className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya supplier')}</Link>}
        </>}
        stats={s ? [
          { label: tr('Kul dena hai'), value: formatPKR(s.totalOutstanding), hint: tr('{{suppliersWithDebt}} supplier', { suppliersWithDebt: s.suppliersWithDebt }) },
          { label: tr('Is mahine purchase'), value: formatPKR(s.monthPurchases), hint: tr('{{monthCount}} bill', { monthCount: s.monthCount }) },
          { label: tr('Is mahine diye'), value: formatPKR(s.monthLedgerPaid + s.monthPaid) },
          { label: tr('Suppliers'), value: s.activeSuppliers, hint: tr('{{totalSuppliers}} kul', { totalSuppliers: s.totalSuppliers }) },
        ] : undefined}
      />

      {/* Owed money by age */}
      {!!s?.dueAging?.some((b) => b.amount > 0) && (
        <KpiRow cols={4}>
          {s.dueAging!.map((b, i) => (
            <KpiCard key={b.bucket} icon={Clock} color={AGING_COLORS[Math.min(i, AGING_COLORS.length - 1)]} label={b.bucket} value={formatPKR(b.amount)} hint={tr('{{count}} supplier', { count: b.count })} />
          ))}
        </KpiRow>
      )}

      {/* Filters */}
      {tab === 'list' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam, phone ya shehar…')} label={tr('Search')} />}
          chips={filtered ? <>
            {dues !== 'all' && <FilterChip onRemove={() => setDues('all')}>{DUES.find((o) => o.value === dues)?.label}</FilterChip>}
            {status !== 'active' && <FilterChip onRemove={() => setStatus('active')}>{status === 'inactive' ? tr('Band') : tr('Sab halat')}</FilterChip>}
            {city && <FilterChip onRemove={() => setCity('')}>{city}</FilterChip>}
            {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Banknote} label={tr('Baqi')} value={dues} active={dues !== 'all'} onChange={setDues} options={DUES} />
          <FilterMenu icon={Filter} label={tr('Halat')} value={status} active={status !== 'active'} onChange={setStatus} options={STATUSES} />
          {cities.length > 2 && <FilterMenu icon={MapPin} label={tr('Shehar')} value={city} active={!!city} onChange={setCity} options={cities} />}
          <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={sort} active={sort !== 'due'} onChange={setSort} align="right"
            options={[{ value: 'due', label: tr('Sab se zyada baqi') }, { value: 'recent', label: tr('Haal hi me') }, { value: 'purchased', label: tr('Sab se zyada purchase') }, { value: 'orders', label: tr('Sab se zyada bill') }, { value: 'name', label: tr('Naam (A–Z)') }]} />
        </FilterBar>
      )}

      {/* Tabs */}
      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>N</Kbd> {' '}{tr('naya supplier ·')}{' '} <Kbd>/</Kbd> {' '}{tr('search')}</>}
        tabs={[{ id: 'list', label: tr('Suppliers'), icon: Users, count: meta?.total ?? null }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {tab === 'analytics' ? <SupplierAnalytics /> : (<>
      {listQ.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>
      ) : !items.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{tr('Koi supplier nahi mila')}</p>
          {canEdit && <Button className="mt-4" onClick={() => navigate('/suppliers/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya supplier')}</Button>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((x) => {
            const last = daysAgo(x.lastPurchaseAt);
            const paid = daysAgo(x.lastPaymentAt);
            const phone = (x.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
            return (
              <div key={x.id} className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1 transition hover:shadow-md', x.outstandingDue > 0 ? 'ring-rose-100' : 'ring-slate-200/80', !x.isActive && 'opacity-70')}>
                <Link to={`/suppliers/${x.id}`} className="flex items-start gap-3">
                  <Avatar name={x.name} url={x.logoUrl ?? undefined} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{x.name}</p>
                    <p className="truncate text-[0.8125rem] text-slate-500">{[x.contactPerson, x.phone, x.city].filter(Boolean).join(' · ') || tr('Rabta darj nahi')}</p>
                  </div>
                  <div className="text-end">
                    <p className={cn('text-lg font-bold tabular-nums', x.outstandingDue > 0 ? 'text-rose-600' : 'text-emerald-600')}>{x.outstandingDue > 0 ? formatPKR(x.outstandingDue) : tr('Saaf')}</p>
                    <p className="text-[0.6875rem] text-slate-400">{tr('dena hai')}</p>
                  </div>
                </Link>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.75rem]">
                  <div className="rounded-xl bg-slate-50 py-1.5"><p className="text-slate-500">{tr('Kul purchase')}</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(x.totalPurchased)}</p></div>
                  <div className="rounded-xl bg-slate-50 py-1.5"><p className="text-slate-500">{tr('Aakhri maal')}</p><p className="font-semibold text-slate-900">{last == null ? '—' : last === 0 ? tr('Aaj') : tr('{{last}} din', { last })}</p></div>
                  <div className={cn('rounded-xl py-1.5', paid != null && paid > 60 && x.outstandingDue > 0 ? 'bg-rose-50' : 'bg-slate-50')}><p className="text-slate-500">{tr('Aakhri payment')}</p><p className="font-semibold text-slate-900">{paid == null ? '—' : paid === 0 ? tr('Aaj') : tr('{{paid}} din', { paid })}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {canEdit && x.outstandingDue > 0 && <Button size="sm" onClick={() => setPaying(x)} leftIcon={<Banknote className="h-3.5 w-3.5" />}>{tr('Payment')}</Button>}
                  {canBuy && <Button size="sm" variant="secondary" onClick={() => navigate(`/purchases/new?supplier=${x.id}`)} leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}>{tr('Purchase')}</Button>}
                  {x.phone && <a href={`tel:${x.phone}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" /> {' '}{tr('Call')}</a>}
                  {x.phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> {' '}{tr('WhatsApp')}</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{totalPages}}', { page, totalPages: meta.totalPages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>{tr('Agla')}</Button>
        </div>
      )}

      </>)}

      {guide.isOpen && (
        <PageGuide title={tr('Suppliers — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: tr('Supplier jorein'), text: tr('"Naya supplier" — naam, phone aur payment ki shart. Pehle se kuch dena ho to "Purana hisaab" me likh dein.') },
            { icon: Banknote, color: '#db2777', title: tr('Kitna dena hai'), text: tr('Har card par laal amount = abhi dena hai. Upar kul amount, aur "kitne din purana" ke hisaab se alag alag.') },
            { icon: Filter, color: '#7c3aed', title: tr('Search aur chhantein'), text: tr('Naam ya phone se dhoondein. "Baqi" se sirf jinhe dena hai; "Tarteeb" se sab se zyada baqi ya haal hi wale upar.') },
            { icon: ShoppingCart, color: '#2563eb', title: tr('Ek tap me kaam'), text: tr('Card par "Payment" se paisa darj, "Purchase" se usi supplier ka naya bill, Call aur WhatsApp seedha.') },
            { icon: BookOpen, color: '#d97706', title: tr('Poora khata'), text: tr('Supplier par click karein: khata, sab bill, rates kaise badle, bank details aur statement print.') },
            { icon: TrendingUp, color: '#0891b2', title: tr('Report'), text: tr('Print se is filter ke saare suppliers aur un ka baqi A4, PDF ya thermal par.') },
          ]}
          tips={[tr('Kharidari udhaar par ho to supplier ka dena khud barhta hai; adaigi yahan se darj karein.'), tr('"Aakhri payment" laal ho to 60 din se zyada se paisa nahi diya.')]}
          shortcuts={[['N', tr('naya supplier')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
        />
      )}
      {paying && <SupplierMoneyModal supplier={paying} onClose={() => setPaying(null)} />}
    </PageShell>
  );
}
