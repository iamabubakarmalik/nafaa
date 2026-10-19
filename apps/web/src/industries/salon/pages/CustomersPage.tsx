/**
 * Salon customers: who comes (regulars, not seen for a while, allergies),
 * and for each one the visit history the stylist reads before starting —
 * services, stylist, colour formula notes, products used — with packages,
 * memberships and the hair / skin notes. Search looks through every
 * customer of the shop.
 *
 * Keys: / search · G guide · Esc closes the customer.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BookOpen, CalendarPlus, Clock, Crown, Droplet, Filter, Gift, GraduationCap, Heart, History, Repeat, Scissors, StickyNote, Users,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Tabs,
  Textarea, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { salonCustomerProfilesApi, type ProfileRow, type ProfileView } from '../api/customer-profiles.api';
import { useStylists } from '../components/fields';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed, Pager } from '../components/ui';
import { SALON_KEYS, STATUS, apiError, dateOf, staffName } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';
import type { AppointmentStatus } from '../api/appointments.api';

const VIEWS: Array<{ id: ProfileView; label: string; icon: typeof Users }> = [
  { id: 'all', label: 'Sab salon customers', icon: Users },
  { id: 'regular', label: 'Regular (3+ visit)', icon: Repeat },
  { id: 'away', label: '45 din se nahi aaye', icon: Clock },
  { id: 'allergy', label: 'Allergy wale', icon: AlertTriangle },
];

export default function CustomersPage() {
  const [params, setParams] = useSearchParams();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ProfileView>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const open = params.get('customer');
  const setOpen = (id: string | null) => { const n = new URLSearchParams(params); if (id) n.set('customer', id); else n.delete('customer'); setParams(n, { replace: true }); };
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);

  const q = { view, search: query || undefined, page, limit: 30 };
  const listQ = useQuery({ queryKey: [SALON_KEYS.customers, 'page', q], queryFn: () => salonCustomerProfilesApi.page(q), placeholderData: (p) => p });
  const data = listQ.data;
  const counts = data?.counts;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await salonCustomerProfilesApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: 'Salon customers',
      subtitle: VIEWS.find((v) => v.id === view)?.label,
      meta: [['Customers', String(all.total)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Customer' }, { label: 'Phone' }, { label: 'Visits', align: 'right' }, { label: 'Kharch', align: 'right', wideOnly: true }, { label: 'Aakhri visit' }],
        rows: all.items.map((r) => [r.customer.name, r.customer.phone ?? '', String(r.profile?.totalVisits ?? 0), formatPKR(r.profile?.totalSpent ?? 0), dateOf(r.profile?.lastVisitAt)]),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title="Salon customers"
        chip={<><Heart /> History</>}
        meta="Pichli services, colour formula, allergy — stylist kaam se pehle dekhe"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!data?.items.length} />
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/salon/appointments/new" className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Booking</Link>
        </>}
        stats={counts ? [
          { label: 'Salon customers', value: counts.all },
          { label: 'Regular', value: counts.regular },
          { label: '45 din se nahi aaye', value: counts.away },
        ] : [{ label: 'Salon customers', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!counts ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : VIEWS.map((v) => (
          <KpiCard key={v.id} icon={v.icon} color={v.id === 'allergy' ? '#e11d48' : v.id === 'away' ? '#d97706' : v.id === 'regular' ? '#16a34a' : '#db2777'}
            label={v.label} value={counts[v.id]} onClick={() => { setSearch(''); setView(v.id); }} active={!query && view === v.id}
            hint={v.id === 'away' ? 'WhatsApp par bulayein' : v.id === 'allergy' ? 'Kaam se pehle dekhein' : undefined} />
        ))}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam ya phone — dukaan ke har customer me dhoondta hai" />}
        chips={query || view !== 'all' ? <>
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          {!query && view !== 'all' && <FilterChip onRemove={() => setView('all')}>{VIEWS.find((v) => v.id === view)?.label}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setView('all'); }}>
        <FilterMenu icon={Filter} label={VIEWS.find((v) => v.id === view)?.label ?? ''} value={view} active={view !== 'all'} onChange={setView} width="w-72"
          options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? String(counts[v.id]) : undefined }))} />
      </FilterBar>

      {listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Customers" retry={() => listQ.refetch()} /> : !data?.items.length ? (
        <EmptyList icon={Heart} title={query ? 'Is naam / phone ka koi customer nahi' : 'Abhi koi salon customer nahi'} text="Pehle bill ke saath customer ki salon history khud banti hai. Kisi bhi customer ko dhoond kar notes likh sakte hain." />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {data.items.map((r) => <Row key={r.customer.id} r={r} onOpen={() => setOpen(r.customer.id)} />)}
        </ul>
      )}
      {data && <Pager page={page} pages={data.pages} onPage={setPage} />}

      {open && <CustomerModal customerId={open} onClose={() => setOpen(null)} />}

      {guide.isOpen && (
        <PageGuide title="Salon customers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: History, color: '#7c3aed', title: 'History', text: 'Customer kholein: har visit ki services, stylist, colour formula aur istemal ki cheezein. Agli dafa wohi formula.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Allergy', text: 'Allergy ya skin ki baat "Notes" me likhein — booking aur appointment khulte hi laal me nazar aati hai.' },
            { icon: Clock, color: '#d97706', title: 'Wapas bulayein', text: '"45 din se nahi aaye" me se regular customers ko WhatsApp karein — offer ya yaad dihani.' },
          ]}
          shortcuts={[['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Row({ r, onOpen }: { r: ProfileRow; onOpen: () => void }) {
  const p = r.profile;
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 sm:flex-row sm:items-center">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{r.customer.name}</span>
            {!!p?.allergies?.length && <Badge size="xs" variant="danger"><AlertTriangle className="mr-0.5 h-3 w-3" />Allergy</Badge>}
            {(p?.totalVisits ?? 0) >= 3 && <Badge size="xs" variant="success">Regular</Badge>}
          </span>
          <span className="block text-[0.8125rem] text-slate-500">{r.customer.phone ?? 'Phone nahi'}{p?.hairType ? ` · Baal: ${p.hairType}` : ''}{p?.skinType ? ` · Skin: ${p.skinType}` : ''}</span>
        </span>
        <span className="flex gap-4 text-[0.8125rem] text-slate-600 sm:text-right">
          <span><b className="tabular-nums text-slate-900">{p?.totalVisits ?? 0}</b> visits</span>
          <span className="tabular-nums">{formatPKR(p?.totalSpent ?? 0)}</span>
          <span>{p?.lastVisitAt ? dateOf(p.lastVisitAt) : 'Abhi visit nahi'}</span>
          {Number(r.customer.balance) > 0.5 && <span className="font-semibold text-rose-700">Udhaar {formatPKR(Number(r.customer.balance))}</span>}
        </span>
      </button>
    </li>
  );
}

function CustomerModal({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const can = useSalonCan();
  const [tab, setTab] = useState<'history' | 'notes'>('history');
  const q = useQuery({ queryKey: [SALON_KEYS.customers, 'history', customerId], queryFn: () => salonCustomerProfilesApi.history(customerId) });
  const h = q.data;
  return (
    <Modal open onClose={onClose} size="xl" title={h?.customer.name ?? 'Customer'} description={h ? `${h.customer.phone ?? 'Phone nahi'}${Number(h.customer.balance) > 0.5 ? ` · udhaar ${formatPKR(Number(h.customer.balance))}` : ''}` : undefined}>
      {q.isLoading ? <Skeleton className="h-64 rounded-xl" /> : q.isError || !h ? <LoadFailed what="History" retry={() => q.refetch()} /> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Fact label="Visits" value={String(h.stats.visits)} />
            <Fact label="Kharch" value={formatPKR(h.stats.spent)} />
            <Fact label="Pasandeeda stylist" value={h.stats.favouriteStylist ?? '—'} />
            <Fact label="Har kitne din" value={h.stats.everyDays ? `${h.stats.everyDays} din` : '—'} />
          </div>
          {!!h.profile?.allergies?.length && <p className="flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Allergy: {h.profile.allergies.join(', ')}</p>}
          {(h.memberships.some((m) => m.status === 'ACTIVE') || h.packages.some((p) => p.status === 'ACTIVE')) && (
            <div className="flex flex-wrap gap-2">
              {h.memberships.filter((m) => m.status === 'ACTIVE').map((m) => <Badge key={m.id} variant="accent"><Crown className="mr-1 h-3.5 w-3.5" />{m.plan.name} · {m.plan.discountPct}% · {dateOf(m.expiryDate)} tak</Badge>)}
              {h.packages.filter((p) => p.status === 'ACTIVE').map((p) => <Badge key={p.id} variant="success"><Gift className="mr-1 h-3.5 w-3.5" />{p.package.name} · {p.sessionsRemaining} session</Badge>)}
            </div>
          )}
          <Tabs value={tab} onChange={setTab} items={[{ value: 'history', label: 'Visits', count: h.visits.length }, { value: 'notes', label: 'Notes aur pasand' }]} />
          {tab === 'history' ? (
            !h.visits.length ? <p className="py-8 text-center text-[0.875rem] text-slate-500">Abhi koi visit nahi</p> : (
              <ul className="max-h-[50dvh] space-y-2 overflow-auto">
                {h.visits.map((v) => (
                  <li key={v.id} className="rounded-2xl p-3 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link to={`/salon/appointments/${v.id}`} className="text-[0.875rem] font-semibold text-slate-900 hover:text-brand-700">{dateOf(v.at)} · {v.appointmentNumber}</Link>
                      <span className="flex items-center gap-2 text-[0.8125rem]">
                        <Badge size="xs" variant={STATUS[v.status as AppointmentStatus]?.variant ?? 'default'}>{STATUS[v.status as AppointmentStatus]?.label ?? v.status}</Badge>
                        {v.sale && <span className={v.sale.status === 'VOIDED' ? 'text-rose-600 line-through' : 'tabular-nums'}>{formatPKR(v.sale.total)}</span>}
                      </span>
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {v.services.map((s, i) => (
                        <li key={i} className="text-[0.8125rem]">
                          <span className="inline-flex items-center gap-1 text-slate-800"><Scissors className="h-3.5 w-3.5 text-slate-400" />{s.serviceName}</span>
                          {s.staffName && <span className="text-slate-500"> · {s.staffName}</span>}
                          {s.notes && <p className="ml-5 text-violet-700">{s.notes}</p>}
                          {!!s.productsUsed?.length && <p className="ml-5 flex items-center gap-1 text-sky-700"><Droplet className="h-3 w-3" />{s.productsUsed.map((u) => `${u.name} ${u.quantity} ${u.unit}`).join(', ')}</p>}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )
          ) : <NotesForm customerId={customerId} profile={h.profile} editable={can.customers} />}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Link to="/salon/appointments/new" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white"><CalendarPlus className="h-4 w-4" /> Booking</Link>
            <Link to={`/customers/${customerId}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><BookOpen className="h-4 w-4" /> Khata aur profile</Link>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[0.6875rem] text-slate-500">{label}</p><p className="truncate text-[0.9375rem] font-bold text-slate-900">{value}</p></div>;
}

function NotesForm({ customerId, profile, editable }: { customerId: string; profile: Awaited<ReturnType<typeof salonCustomerProfilesApi.history>>['profile']; editable: boolean }) {
  const qc = useQueryClient();
  const stylists = useStylists();
  const [f, setF] = useState({
    hairType: profile?.hairType ?? '', hairColor: profile?.hairColor ?? '', skinType: profile?.skinType ?? '', allergies: (profile?.allergies ?? []).join(', '),
    preferredStaffId: profile?.preferredStaffId ?? '', favoriteBrands: (profile?.favoriteBrands ?? []).join(', '), medicalConditions: profile?.medicalConditions ?? '', notes: profile?.notes ?? '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const save = useMutation({
    mutationFn: () => salonCustomerProfilesApi.upsert({
      customerId, hairType: f.hairType.trim() || undefined, hairColor: f.hairColor.trim() || undefined, skinType: f.skinType.trim() || undefined,
      allergies: list(f.allergies), preferredStaffId: f.preferredStaffId || undefined, favoriteBrands: list(f.favoriteBrands),
      medicalConditions: f.medicalConditions.trim() || undefined, notes: f.notes.trim() || undefined,
    }),
    onSuccess: () => { toast.success('Notes save ho gaye'); qc.invalidateQueries({ queryKey: [SALON_KEYS.customers] }); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <fieldset disabled={!editable} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Baal" value={f.hairType} onChange={(e) => set('hairType', e.target.value)} placeholder="Ghunghrale, patle…" />
        <Input label="Baal ka rang" value={f.hairColor} onChange={(e) => set('hairColor', e.target.value)} placeholder="Natural black, 6.0…" />
        <Input label="Skin" value={f.skinType} onChange={(e) => set('skinType', e.target.value)} placeholder="Oily, sensitive…" />
        <Input label="Allergy (comma se)" value={f.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Ammonia, wax" hint="Booking par laal me dikhti hai" />
        <Select label="Pasandeeda stylist" value={f.preferredStaffId} onChange={(e) => set('preferredStaffId', e.target.value)}
          options={[{ value: '', label: '—' }, ...stylists.all.map((s) => ({ value: s.id, label: staffName(s) }))]} />
        <Input label="Pasandeeda brands" value={f.favoriteBrands} onChange={(e) => set('favoriteBrands', e.target.value)} placeholder="L'Oreal, Keune" />
      </div>
      <Textarea label="Sehat ki baat" value={f.medicalConditions} onChange={(e) => set('medicalConditions', e.target.value)} rows={2} maxLength={2000} placeholder="Pregnancy, skin treatment…" hint="Sirf staff ke liye" />
      <Textarea label="Notes" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} maxLength={4000} placeholder="Short layers pasand, kaan ke paas kam…" />
      {editable && <Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<StickyNote className="h-4 w-4" />}>Notes save karein</Button>}
    </fieldset>
  );
}
