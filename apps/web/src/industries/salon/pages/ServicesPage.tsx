/**
 * Service list: rate, time, commission and who it is for, with bookings
 * and billed amount, filters by category, men/women/kids and on/off; the
 * analytics tab ranks services by what they billed this period. Switching
 * a service off keeps its history.
 *
 * Keys: N new service · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BarChart3, Clock, Filter, GraduationCap, ListChecks, Pencil, Percent, Plus, Power, Scissors, Sparkles, Star, Tag, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Badge, Button, Card, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { appointmentsApi } from '../api/appointments.api';
import { salonServicesApi, type SalonService } from '../api/services.api';
import { CardTitle, EmptyList, HeroPrint, ListSkeleton, LoadFailed, RankedBars } from '../components/ui';
import { CATEGORIES, SALON_KEYS, apiError, categoryLabel, minutes } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

type Tab = 'list' | 'analytics';
type Gender = '' | 'MEN' | 'WOMEN' | 'KIDS';
type Status = 'true' | 'false' | '';
const GENDERS: Array<{ value: Gender; label: string }> = [{ value: '', label: 'Sab ke liye' }, { value: 'MEN', label: 'Mard' }, { value: 'WOMEN', label: 'Khawateen' }, { value: 'KIDS', label: 'Bachay' }];

const priceOf = (s: SalonService) => Number(s.discountPrice ?? s.price);

export default function ServicesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('list');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [status, setStatus] = useState<Status>('true');
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const params = { search: query || undefined, category: category || undefined, forGender: gender || undefined, active: status === '' ? undefined : status === 'true' };
  const listQ = useQuery({ queryKey: [SALON_KEYS.services, 'page', params], queryFn: () => salonServicesApi.list(params), placeholderData: (p) => p });
  const allQ = useQuery({ queryKey: [SALON_KEYS.services, 'all'], queryFn: () => salonServicesApi.list(), staleTime: 60_000 });
  const aPeriod = resolveRange(aRange, startHour);
  const sumQ = useQuery({ queryKey: [SALON_KEYS.appointments, 'summary', aPeriod?.from, aPeriod?.to], queryFn: () => appointmentsApi.summary(aPeriod ?? undefined), enabled: tab === 'analytics' });

  const toggle = useMutation({
    mutationFn: (s: SalonService) => (s.isActive ? salonServicesApi.remove(s.id) : salonServicesApi.update(s.id, { isActive: true })),
    onSuccess: (_r, s) => { toast.success(s.isActive ? `${s.name} band ho gayi` : `${s.name} chalu ho gayi`); qc.invalidateQueries({ queryKey: [SALON_KEYS.services] }); },
    onError: (e) => toast.error(apiError(e, 'Badla nahi')),
  });

  const rows = listQ.data ?? [];
  const all = allQ.data ?? [];
  const active = all.filter((s) => s.isActive);
  const avg = active.length ? active.reduce((t, s) => t + priceOf(s), 0) / active.length : 0;
  const top = [...active].sort((a, b) => b.totalBookings - a.totalBookings)[0];
  const noCommission = active.filter((s) => !s.commissionPct && !s.commissionFixed).length;
  const filtered = !!query || !!category || !!gender || status !== 'true';
  const clear = () => { setSearch(''); setCategory(''); setGender(''); setStatus('true'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.catalog) { e.preventDefault(); navigate('/salon-services/new'); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: 'Services aur rates',
    subtitle: category ? categoryLabel(category) : 'Sab services',
    meta: [['Services', String(rows.length)]],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Service' }, { label: 'Category', wideOnly: true }, { label: 'Waqt', wideOnly: true }, { label: 'Rate', align: 'right' }],
      rows: rows.map((s) => [s.name, categoryLabel(s.category), minutes(s.durationMinutes), formatPKR(priceOf(s))]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title="Services"
        chip={<><Scissors /> Rate list</>}
        meta="Rate, waqt, commission — bill aur booking yahin se rate lete hain"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={allQ.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length} />
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.catalog && <Link to="/salon-services/new" title="Nayi service (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi service</Link>}
        </>}
        stats={[
          { label: 'Chalu services', value: active.length, hint: `${all.length - active.length} band` },
          { label: 'Ausat rate', value: formatPKR(avg) },
          { label: 'Sab se zyada booking', value: top?.name ?? '—', hint: top ? `${top.totalBookings} dafa` : undefined },
        ]}
      />

      <KpiRow cols={4}>
        {allQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Sparkles} color="#db2777" label="Chalu" value={active.length} hint="Counter aur booking me" onClick={() => setStatus('true')} active={status === 'true'} />
          <KpiCard icon={Power} color="#64748b" label="Band" value={all.length - active.length} hint="History rehti hai" onClick={() => setStatus('false')} active={status === 'false'} />
          <KpiCard icon={Star} color="#ca8a04" label="Popular" value={active.filter((s) => s.isPopular || s.isFeatured).length} hint="Counter par upar" />
          <KpiCard icon={Percent} color={noCommission ? '#d97706' : '#16a34a'} label="Bina commission" value={noCommission} hint={noCommission ? 'Stylist ka rate lagega' : 'Sab par commission'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Jo services is period ke bills me bikin</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Service ka naam ya code…" />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {category && <FilterChip onRemove={() => setCategory('')}>{categoryLabel(category)}</FilterChip>}
            {gender && <FilterChip onRemove={() => setGender('')}>{GENDERS.find((g) => g.value === gender)?.label}</FilterChip>}
            {status !== 'true' && <FilterChip onRemove={() => setStatus('true')}>{status === 'false' ? 'Band' : 'Chalu aur band'}</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Tag} label={category ? categoryLabel(category) : 'Category'} value={category} active={!!category} onChange={setCategory} width="w-64"
            options={[{ value: '', label: 'Sab' }, ...CATEGORIES.filter((c) => all.some((s) => s.category === c.value)).map((c) => ({ value: c.value as string, label: c.label, hint: `${all.filter((s) => s.category === c.value).length}` }))]} />
          <FilterMenu icon={Users} label={GENDERS.find((g) => g.value === gender)?.label ?? 'Kis ke liye'} value={gender} active={!!gender} onChange={setGender} options={GENDERS} />
          <FilterMenu icon={Filter} label={status === 'true' ? 'Chalu' : status === 'false' ? 'Band' : 'Sab'} value={status} active={status !== 'true'} onChange={setStatus}
            options={[{ value: 'true', label: 'Chalu' }, { value: 'false', label: 'Band' }, { value: '', label: 'Sab' }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{can.catalog && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[{ id: 'list', label: 'Services', icon: ListChecks, count: rows.length }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? (
        <Card title={<CardTitle icon={BarChart3}>Services — bills me kitna</CardTitle>}>
          {sumQ.isLoading ? <Skeleton className="h-64 rounded-xl" /> : (
            <RankedBars limit={20} onPick={(id) => navigate(`/salon-services/${id}`)}
              rows={(sumQ.data?.services ?? []).map((x) => ({ key: x.serviceId, label: `${x.name} · ${x.count} dafa`, value: x.revenue, display: sales(x.revenue), color: '#db2777' }))} />
          )}
        </Card>
      ) : listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Services" retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Scissors} title={filtered ? 'Is filter me koi service nahi' : 'Abhi koi service nahi'} text="Hair cut, facial, makeup — har service ka rate aur waqt likhein. Counter aur booking yahin se rate lete hain.">
          {can.catalog && <Button onClick={() => navigate('/salon-services/new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi service</Button>}
          {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
        </EmptyList>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="48rem">
            <THead><Tr><Th>Service</Th><Th>Waqt</Th><Th align="right">Rate</Th><Th align="right">Commission</Th><Th align="right">Bookings</Th><Th align="right">Bill</Th><Th /></Tr></THead>
            <TBody>
              {rows.map((s) => (
                <Tr key={s.id} className={s.isActive ? '' : 'opacity-60'}>
                  <Td>
                    <Link to={`/salon-services/${s.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{s.name}</Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      <Badge size="xs" variant="outline">{categoryLabel(s.category)}</Badge>
                      {(s.isPopular || s.isFeatured) && <Badge size="xs" variant="accent">Popular</Badge>}
                      {!s.isActive && <Badge size="xs" variant="default">Band</Badge>}
                      {[s.forMen && 'Mard', s.forWomen && 'Khawateen', s.forKids && 'Bachay'].filter(Boolean).length < 3 && (
                        <span className="text-[0.6875rem] text-slate-500">{[s.forMen && 'Mard', s.forWomen && 'Khawateen', s.forKids && 'Bachay'].filter(Boolean).join(' / ')}</span>
                      )}
                    </div>
                  </Td>
                  <Td><span className="inline-flex items-center gap-1 text-slate-600"><Clock className="h-3.5 w-3.5" />{minutes(s.durationMinutes)}</span></Td>
                  <Td align="right" className="tabular-nums">
                    <span className="font-semibold">{formatPKR(priceOf(s))}</span>
                    {s.discountPrice != null && <p className="text-[0.6875rem] text-slate-400 line-through">{formatPKR(s.price)}</p>}
                  </Td>
                  <Td align="right" className="tabular-nums text-slate-600">{s.commissionPct ? `${s.commissionPct}%` : ''}{s.commissionPct && s.commissionFixed ? ' + ' : ''}{s.commissionFixed ? formatPKR(s.commissionFixed) : ''}{!s.commissionPct && !s.commissionFixed ? <span className="text-slate-400">Stylist ka</span> : ''}</Td>
                  <Td align="right" className="tabular-nums">{s.totalBookings}</Td>
                  <Td align="right" className="tabular-nums">{sales(s.totalRevenue)}</Td>
                  <Td align="right">
                    {can.catalog && (
                      <div className="flex justify-end gap-1">
                        <Link to={`/salon-services/${s.id}/edit`} title="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" /></Link>
                        <button type="button" title={s.isActive ? 'Band karein' : 'Chalu karein'} onClick={() => toggle.mutate(s)} disabled={toggle.isPending}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Power className="h-4 w-4" /></button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Services — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: 'Service aur rate', text: 'Naam, category, rate aur kitna waqt lagta hai. Discount rate ho to woh bhi — counter wahi lagata hai.' },
            { icon: Clock, color: '#0891b2', title: 'Waqt', text: 'Waqt se booking ka khatam hone ka time banta hai aur stylist double book nahi hota.' },
            { icon: Percent, color: '#16a34a', title: 'Commission', text: 'Service par % ya fixed commission likhein. Khali chhorein to stylist ka apna rate lagta hai (Staff page).' },
            { icon: Power, color: '#64748b', title: 'Band karna', text: 'Purani service band karein — mitti nahi, history aur reports me rehti hai.' },
          ]}
          shortcuts={[['N', 'nayi service'], ['/', 'dhoondein'], ['1', 'list'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
