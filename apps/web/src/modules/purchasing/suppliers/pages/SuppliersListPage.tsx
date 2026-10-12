/**
 * Suppliers: who we buy from and what we owe. Search, dues, status, city
 * and sort run on the server a page at a time; each supplier can be paid,
 * messaged or bought from in one tap. Owed money is shown by age.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownWideNarrow, Banknote, BookOpen, Filter, GraduationCap, MapPin, MessageCircle, Phone, Plus, Search, ShoppingCart, TrendingUp, Truck, Users, X } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { suppliersDoc } from '../../print';
import { Avatar, Button, FilterMenu, PageHero, Tabs, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { suppliersApi, type Supplier } from '../api/suppliers.api';
import { SupplierMoneyModal } from '../components/SupplierMoneyModal';
import { SupplierAnalytics } from '../components/SupplierAnalytics';

type Dues = 'all' | 'due' | 'clear';
type Status = 'all' | 'active' | 'inactive';
type Sort = 'recent' | 'name' | 'purchased' | 'due' | 'orders';

const daysAgo = (v?: string | null) => (v ? Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000) : null);

export default function SuppliersListPage() {
  const navigate = useNavigate();
  const canEdit = usePermission(PERMISSIONS.SUPPLIERS_EDIT);
  const canBuy = usePermission(PERMISSIONS.PURCHASES_CREATE);
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
  const cities = useMemo(() => [{ value: '', label: 'Sab shehar' }, ...(s?.cityBreakdown ?? []).map((c) => ({ value: c.city, label: `${c.city} (${c.count})` }))], [s?.cityBreakdown]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('supplier-search')?.focus(); }
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); navigate('/suppliers/new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, canEdit]);

  return (
    <div className="space-y-4 pb-10">
      <PageHero
        title="Suppliers"
        chip={<><Truck /> Jin se maal aata hai</>}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={sumQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800">
            <PrintButton doc={async () => suppliersDoc((await suppliersApi.list({ ...params, page: 1, limit: 500 })).items)} disabled={!items.length} />
          </span>
          <Link to="/purchases" className={heroButton}><ShoppingCart className="h-4 w-4" /> Kharidari</Link>
          {canEdit && <Link to="/suppliers/new" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya supplier</Link>}
        </>}
        stats={s ? [
          { label: 'Kul dena hai', value: formatPKR(s.totalOutstanding), hint: `${s.suppliersWithDebt} supplier` },
          { label: 'Is mahine kharidari', value: formatPKR(s.monthPurchases), hint: `${s.monthCount} bill` },
          { label: 'Is mahine diye', value: formatPKR(s.monthLedgerPaid + s.monthPaid) },
          { label: 'Suppliers', value: s.activeSuppliers, hint: `${s.totalSuppliers} kul` },
        ] : undefined}
      />

      <Tabs label="Suppliers" value={tab} onChange={setTab} items={[{ value: 'list', label: 'Suppliers', count: meta?.total }, { value: 'analytics', label: 'Analytics' }]} />

      {tab === 'analytics' ? <SupplierAnalytics /> : (<>
      {!!s?.dueAging?.some((b) => b.amount > 0) && (
        <div className="grid gap-2 sm:grid-cols-4">
          {s.dueAging!.map((b) => (
            <div key={b.bucket} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[0.75rem] text-slate-500">{b.bucket}</p>
              <p className="font-semibold tabular-nums text-slate-900">{formatPKR(b.amount)}</p>
              <p className="text-[0.6875rem] text-slate-400">{b.count} supplier</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="supplier-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, phone ya shehar…  ( / )" aria-label="Dhoondein"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}
        </div>
        <FilterMenu icon={Banknote} label="Baqi" value={dues} active={dues !== 'all'} onChange={setDues}
          options={[{ value: 'all', label: 'Sab' }, { value: 'due', label: 'Jinhe dena hai' }, { value: 'clear', label: 'Hisaab saaf' }]} />
        <FilterMenu icon={Filter} label="Halat" value={status} active={status !== 'active'} onChange={setStatus}
          options={[{ value: 'active', label: 'Chalu' }, { value: 'inactive', label: 'Band' }, { value: 'all', label: 'Sab' }]} />
        {cities.length > 2 && <FilterMenu icon={MapPin} label="Shehar" value={city} active={!!city} onChange={setCity} options={cities} />}
        <FilterMenu icon={ArrowDownWideNarrow} label="Tarteeb" value={sort} active={sort !== 'due'} onChange={setSort} align="right"
          options={[{ value: 'due', label: 'Sab se zyada baqi' }, { value: 'recent', label: 'Haal hi me' }, { value: 'purchased', label: 'Sab se zyada kharidari' }, { value: 'orders', label: 'Sab se zyada bill' }, { value: 'name', label: 'Naam (A–Z)' }]} />
      </div>

      {listQ.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Koi supplier nahi mila</p>
          {canEdit && <Button className="mt-4" onClick={() => navigate('/suppliers/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya supplier</Button>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((x) => {
            const last = daysAgo(x.lastPurchaseAt);
            const paid = daysAgo(x.lastPaymentAt);
            const phone = (x.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
            return (
              <div key={x.id} className={cn('rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md', x.outstandingDue > 0 ? 'border-rose-100' : 'border-slate-200', !x.isActive && 'opacity-70')}>
                <Link to={`/suppliers/${x.id}`} className="flex items-start gap-3">
                  <Avatar name={x.name} url={x.logoUrl ?? undefined} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{x.name}</p>
                    <p className="truncate text-[0.8125rem] text-slate-500">{[x.contactPerson, x.phone, x.city].filter(Boolean).join(' · ') || 'Rabta darj nahi'}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-lg font-bold tabular-nums', x.outstandingDue > 0 ? 'text-rose-600' : 'text-emerald-600')}>{x.outstandingDue > 0 ? formatPKR(x.outstandingDue) : 'Saaf'}</p>
                    <p className="text-[0.6875rem] text-slate-400">dena hai</p>
                  </div>
                </Link>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.75rem]">
                  <div className="rounded-xl bg-slate-50 py-1.5"><p className="text-slate-500">Kul kharidari</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(x.totalPurchased)}</p></div>
                  <div className="rounded-xl bg-slate-50 py-1.5"><p className="text-slate-500">Aakhri maal</p><p className="font-semibold text-slate-900">{last == null ? '—' : last === 0 ? 'Aaj' : `${last} din`}</p></div>
                  <div className={cn('rounded-xl py-1.5', paid != null && paid > 60 && x.outstandingDue > 0 ? 'bg-rose-50' : 'bg-slate-50')}><p className="text-slate-500">Aakhri adaigi</p><p className="font-semibold text-slate-900">{paid == null ? '—' : paid === 0 ? 'Aaj' : `${paid} din`}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {canEdit && x.outstandingDue > 0 && <Button size="sm" onClick={() => setPaying(x)} leftIcon={<Banknote className="h-3.5 w-3.5" />}>Adaigi</Button>}
                  {canBuy && <Button size="sm" variant="secondary" onClick={() => navigate(`/purchases/new?supplier=${x.id}`)} leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}>Kharidari</Button>}
                  {x.phone && <a href={`tel:${x.phone}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-3.5 w-3.5" /> Call</a>}
                  {x.phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp</a>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {meta.totalPages}</span>
          <Button variant="secondary" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Agla</Button>
        </div>
      )}

      </>)}

      {guide.isOpen && (
        <PageGuide title="Suppliers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Supplier jorein', text: '"Naya supplier" — naam, phone aur adaigi ki shart. Pehle se kuch dena ho to "Purana hisaab" me likh dein.' },
            { icon: Banknote, color: '#db2777', title: 'Kitna dena hai', text: 'Har card par laal raqam = abhi dena hai. Upar kul raqam, aur "kitne din purana" ke hisaab se alag alag.' },
            { icon: Filter, color: '#7c3aed', title: 'Dhoondein aur chhantein', text: 'Naam ya phone se dhoondein. "Baqi" se sirf jinhe dena hai; "Tarteeb" se sab se zyada baqi ya haal hi wale upar.' },
            { icon: ShoppingCart, color: '#2563eb', title: 'Ek tap me kaam', text: 'Card par "Adaigi" se paisa darj, "Kharidari" se usi supplier ka naya bill, Call aur WhatsApp seedha.' },
            { icon: BookOpen, color: '#d97706', title: 'Poora khata', text: 'Supplier par click karein: khata, sab bill, rates kaise badle, bank details aur statement print.' },
            { icon: TrendingUp, color: '#0891b2', title: 'Report', text: 'Print se is filter ke saare suppliers aur un ka baqi A4, PDF ya thermal par.' },
          ]}
          tips={['Kharidari udhaar par ho to supplier ka dena khud barhta hai; adaigi yahan se darj karein.', '"Aakhri adaigi" laal ho to 60 din se zyada se paisa nahi diya.']}
          shortcuts={[['N', 'naya supplier'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
      {paying && <SupplierMoneyModal supplier={paying} onClose={() => setPaying(null)} />}
    </div>
  );
}
