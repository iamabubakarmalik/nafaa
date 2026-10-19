/**
 * Guest register: everyone who stayed, with ID (police record), company,
 * VIP and blacklist flags, stays and spend; who is in the hotel now. Server
 * paged with search and views. Printing gives the register.
 *
 * Keys: N new guest · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownWideNarrow, Ban, BedDouble, Building2, ChevronRight, Filter, GraduationCap, IdCard, Plus, Repeat, Star, Users } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { useAnyPermission, usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { guestsApi, type GuestView } from '../api/guests.api';
import { GuestForm } from '../components/GuestForm';
import { HOTEL_KEYS, stayDay } from '../components/meta';

const VIEWS: Array<{ id: GuestView; label: string; icon: typeof Users }> = [
  { id: 'all', label: 'Sab guests', icon: Users }, { id: 'vip', label: 'VIP', icon: Star }, { id: 'company', label: 'Company wale', icon: Building2 },
  { id: 'repeat', label: 'Dobara aane wale', icon: Repeat }, { id: 'noid', label: 'ID nahi li', icon: IdCard }, { id: 'blacklisted', label: 'Blacklist', icon: Ban },
];
const SORTS = [{ value: 'recent', label: 'Naye pehle' }, { value: 'stays', label: 'Zyada stays' }, { value: 'spent', label: 'Zyada kharch' }, { value: 'name', label: 'Naam A-Z' }];

export default function GuestsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canAdd = useAnyPermission([PERMISSIONS.CUSTOMERS_EDIT, PERMISSIONS.SERVICE_BOOKINGS_MANAGE]);
  const canSeeMoney = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const { sales } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<GuestView>('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, sort, query]);
  const params = { view, sort, search: query || undefined, page, limit: 30 };
  const q = useQuery({ queryKey: [HOTEL_KEYS.guests, 'page', params], queryFn: () => guestsApi.page(params), placeholderData: (p) => p });
  const d = q.data;
  const c = d?.counts;
  const countOf: Record<GuestView, number | undefined> = { all: c?.total, vip: c?.vip, company: c?.company, repeat: c?.repeat, noid: c?.noId, blacklisted: c?.blacklisted };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canAdd) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await guestsApi.page({ ...params, page: 1, limit: 200 });
    return {
      title: `Guest register — ${VIEWS.find((v) => v.id === view)?.label}`,
      meta: [['Guests', String(all.total)]],
      sections: [{
        kind: 'table',
        columns: [{ label: '#' }, { label: 'Naam' }, { label: 'Phone' }, { label: 'ID', wideOnly: true }, { label: 'Shehar', wideOnly: true }, { label: 'Stays', align: 'right' }, { label: 'Aakhri', align: 'right' }],
        rows: all.items.map((g) => [g.guestNumber, g.fullName, g.phone, g.idNumber ?? '—', g.city ?? '—', String(g.totalStays), g.lastStayAt ? stayDay(g.lastStayAt) : '—']),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title="Guests"
        chip={<><Users /> Register</>}
        meta="Har guest ka ID, company, stays aur kharch"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!d?.items.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding(true)} title="Naya guest (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya guest</button>}
        </>}
        stats={c ? [{ label: 'Kul guests', value: c.total }, { label: 'Abhi andar', value: c.inHouse }, { label: 'Dobara aaye', value: c.repeat }] : [{ label: 'Kul guests', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!c ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={BedDouble} color="#4f46e5" label="Abhi andar" value={c.inHouse} hint="Stays chal rahe" onClick={() => navigate('/hotel/bookings?view=inhouse')} />
          <KpiCard icon={Star} color="#d97706" label="VIP" value={c.vip} onClick={() => setView('vip')} active={view === 'vip'} />
          <KpiCard icon={Building2} color="#7c3aed" label="Company wale" value={c.company} onClick={() => setView('company')} active={view === 'company'} />
          <KpiCard icon={IdCard} color={c.noId ? '#e11d48' : '#16a34a'} label="ID nahi li" value={c.noId} hint="Police record adhoora" onClick={() => setView('noid')} active={view === 'noid'} />
          <KpiCard icon={Ban} color="#64748b" label="Blacklist" value={c.blacklisted} onClick={() => setView('blacklisted')} active={view === 'blacklisted'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, CNIC, company, shehar…" label="Search" />}
        chips={query || view !== 'all' ? <>
          {view !== 'all' && <FilterChip onRemove={() => setView('all')}>{VIEWS.find((v) => v.id === view)?.label}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={() => { setView('all'); setSearch(''); }}>
        <FilterMenu icon={Filter} label={VIEWS.find((v) => v.id === view)?.label ?? ''} value={view} active={view !== 'all'} onChange={setView}
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: countOf[v.id] != null ? String(countOf[v.id]) : undefined }))} />
        <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((s) => s.value === sort)?.label ?? ''} value={sort} onChange={setSort} align="right" options={SORTS} />
      </FilterBar>


      {q.isLoading ? <Skeleton className="h-60 rounded-3xl" /> : !d?.items.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{query || view !== 'all' ? 'Is filter me koi guest nahi' : 'Abhi koi guest nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">Check-in par guest khud yahan jurta hai. Pehle se bhi likh sakte hain.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {d.items.map((g) => (
            <li key={g.id}>
              <Link to={`/hotel/guests/${g.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50 sm:flex-nowrap">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.875rem] font-bold', g.isBlacklisted ? 'bg-rose-100 text-rose-700' : 'bg-brand-50 text-brand-800')}>{g.fullName.slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-[0.9375rem] font-semibold text-slate-900">
                    {g.fullName}{g.isVIP && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />}
                    {g.isBlacklisted && <span className="rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">Blacklist</span>}
                    {g.inHouse && <span className="rounded bg-brand-100 px-1.5 text-[0.6875rem] font-semibold text-brand-800">Room {g.inHouse.rooms}</span>}
                  </span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{g.phone} · {g.idNumber ? `${g.idType ?? 'ID'} ${g.idNumber}` : 'ID nahi'}{g.companyName ? ` · ${g.companyName}` : ''}{g.city ? ` · ${g.city}` : ''} · {g.guestNumber}</span>
                </span>
                <span className="ml-auto text-right">
                  <span className="block text-[0.875rem] font-semibold text-slate-900">{g.totalStays} stays · {g.totalNights} raat</span>
                  <span className="block text-[0.75rem] text-slate-500">{canSeeMoney ? sales(g.totalSpent) : ''}{g.lastStayAt ? ` · ${stayDay(g.lastStayAt)}` : ''}</span>
                </span>
                <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {d && d.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {d.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= d.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {adding && <GuestForm guest={null} onClose={() => setAdding(false)} onDone={(g) => { setAdding(false); qc.invalidateQueries({ queryKey: [HOTEL_KEYS.guests] }); navigate(`/hotel/guests/${g.id}`); }} />}

      {guide.isOpen && (
        <PageGuide title="Guests — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: IdCard, color: '#4f46e5', title: 'ID', text: 'Har guest ka CNIC / passport police record (Form C) ke liye. "ID nahi li" wale card se adhoore dekhein.' },
            { icon: Repeat, color: '#16a34a', title: 'Purane guest', text: 'Booking me naam ya phone likhte hi purana guest mil jata hai — ID dobara nahi likhni parti.' },
            { icon: Ban, color: '#e11d48', title: 'Blacklist', text: 'Jis guest ne nuqsan kiya ya paisa nahi diya — blacklist karein; check-in par system rok dega.' },
          ]}
          tips={['Guest ka paisa (advance, udhaar) us ke khate me hota hai — profile se khata khulta hai.']}
          shortcuts={[['N', 'naya guest'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
