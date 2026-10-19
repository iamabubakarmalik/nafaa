/**
 * Room types: the hotel's catalog — rate per night, weekend and season
 * rates, how many people, extra bed, and its rooms with their state now.
 * Types are switched off, never deleted.
 *
 * Keys: N new type · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, BedDouble, ChevronRight, DoorOpen, Filter, GraduationCap, Layers, Pencil, Plus, Power, Users } from 'lucide-react';
import {
  Button, FilterBar, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { roomTypesApi, type HotelRoomType } from '../api/room-types.api';
import { useConfirm } from '../components/useConfirm';
import { ALL_HOTEL_KEYS, HOTEL_KEYS, apiError, roomStatusOf } from '../components/meta';

export default function RoomTypesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canCreate = usePermission(PERMISSIONS.PRODUCTS_CREATE);
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canDelete = usePermission(PERMISSIONS.PRODUCTS_DELETE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [ask, confirmDialog] = useConfirm();
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<'active' | 'off' | 'all'>('active');

  const q = useQuery({ queryKey: [HOTEL_KEYS.roomTypes, 'all'], queryFn: () => roomTypesApi.list() });
  const toggle = useMutation({
    mutationFn: (t: HotelRoomType) => (t.isActive ? roomTypesApi.remove(t.id) : roomTypesApi.update(t.id, { isActive: true })),
    onSuccess: (_, t) => { toast.success(t.isActive ? `${t.name} band` : `${t.name} chalu`); ALL_HOTEL_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canCreate) { e.preventDefault(); navigate('/hotel-room-types/new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canCreate, navigate]);

  const all = q.data ?? [];
  const active = all.filter((t) => t.isActive);
  const term = search.trim().toLowerCase();
  const rows = all.filter((t) => (show === 'all' || (show === 'active' ? t.isActive : !t.isActive)) && (!term || t.name.toLowerCase().includes(term) || t.code.toLowerCase().includes(term)));
  const rooms = active.reduce((s, t) => s + (t.rooms?.length ?? 0), 0);
  const free = active.reduce((s, t) => s + (t.rooms?.filter((r) => r.status === 'AVAILABLE').length ?? 0), 0);
  const avg = active.length ? active.reduce((s, t) => s + t.basePrice, 0) / active.length : 0;

  const off = async (t: HotelRoomType) => {
    if (t.isActive && !(await ask({ title: `${t.name} band karein?`, text: 'Is type ke room nayi booking nahi lenge. Record rehta hai; baad me chalu kar sakte hain.', yes: 'Band karein', danger: true }))) return;
    toggle.mutate(t);
  };

  return (
    <PageShell>
      <PageHero
        title="Room types"
        chip={<><Layers /> {active.length} types</>}
        meta="Rate, weekend rate, kitne log aur sahulat"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/hotel/rate-plans" className={heroButton}><Award className="h-4 w-4" /><span className="hidden sm:inline">Season rates</span></Link>
          <Link to="/hotel/rooms" className={heroButton}><DoorOpen className="h-4 w-4" /><span className="hidden sm:inline">Room board</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <Link to="/hotel-room-types/new" title="Naya type (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya room type</Link>}
        </>}
        stats={[{ label: 'Room', value: rooms }, { label: 'Abhi khaali', value: free }, { label: 'Ausat rate', value: formatPKR(Math.round(avg)) }]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Layers} color="#4f46e5" label="Types" value={active.length} hint={all.length > active.length ? `${all.length - active.length} band` : 'Sab chalu'} />
        <KpiCard icon={BedDouble} color="#0891b2" label="Room" value={rooms} />
        <KpiCard icon={DoorOpen} color="#16a34a" label="Abhi khaali" value={free} />
        <KpiCard icon={Users} color="#7c3aed" label="Kul jagah" value={active.reduce((s, t) => s + t.maxOccupancy * (t.rooms?.length ?? 0), 0)} hint="Log ek saath" />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam ya code…" label="Search" />}>
        <FilterMenu icon={Filter} label={show === 'active' ? 'Chalu' : show === 'off' ? 'Band' : 'Sab'} value={show} active={show !== 'active'} onChange={setShow}
          options={[{ value: 'active', label: 'Chalu' }, { value: 'off', label: 'Band' }, { value: 'all', label: 'Sab' }]} />
      </FilterBar>


      {q.isLoading ? <Skeleton className="h-60 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Layers className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{all.length ? 'Is filter me kuch nahi' : 'Abhi koi room type nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">Jaise "Deluxe Double — Rs 8,000 raat, 2 log" — saath hi room numbers bhi likh dein.</p>
          {canCreate && !all.length && <Button className="mt-4" onClick={() => navigate('/hotel-room-types/new')} leftIcon={<Plus className="h-4 w-4" />}>Pehla room type</Button>}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {rows.map((t) => (
            <li key={t.id} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !t.isActive && 'opacity-60')}>
              <Link to={`/hotel-room-types/${t.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-[0.75rem] font-bold text-brand-800 ring-1 ring-brand-100">{t.code}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{t.name}{!t.isActive && ' · band'}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{t.maxOccupancy} log · {t.rooms?.length ?? 0} room{t.extraBedAllowed ? ` · extra bed ${formatPKR(t.extraBedPrice)}` : ''}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {(t.rooms ?? []).slice(0, 14).map((r) => <span key={r.id} title={roomStatusOf(r.status).label} className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-1.5 text-[0.6875rem] font-semibold text-slate-700 ring-1 ring-slate-200"><span className={cn('h-1.5 w-1.5 rounded-full', roomStatusOf(r.status).dot)} />{r.roomNumber}</span>)}
                  </span>
                </span>
              </Link>
              <span className="text-right">
                <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{formatPKR(t.basePrice)}</span>
                <span className="block text-[0.75rem] text-slate-500">{t.weekendPrice ? `Weekend ${formatPKR(t.weekendPrice)}` : 'fi raat'}</span>
              </span>
              <span className="flex items-center">
                {canEdit && <Link to={`/hotel-room-types/${t.id}/edit`} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Badlein"><Pencil className="h-4 w-4" /></Link>}
                {(t.isActive ? canDelete : canEdit) && <button type="button" onClick={() => off(t)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={t.isActive ? 'Band' : 'Chalu'}><Power className="h-4 w-4" /></button>}
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </span>
            </li>
          ))}
        </ul>
      )}
      {confirmDialog}

      {guide.isOpen && (
        <PageGuide title="Room types — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Layers, color: '#4f46e5', title: 'Type', text: 'Ek jaise room ek type: naam, rate fi raat, kitne log. Weekend (Juma, Hafta ki raat) ka alag rate de sakte hain.' },
            { icon: BedDouble, color: '#0891b2', title: 'Room numbers', text: 'Type banate waqt hi 101–110 jaise number likh dein; baad me Room board → setup se bhi.' },
            { icon: Award, color: '#d97706', title: 'Season rates', text: 'Eid, garmiyon ki chhuttiyan, company rate — "Season rates" me date ke hisaab se.' },
          ]}
          tips={['Type band karne se purani bookings par asar nahi hota.', 'Banane / badalne ke liye products ki permission chahiye.']}
          shortcuts={[['N', 'naya type'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
