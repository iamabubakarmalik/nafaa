/**
 * Every courier in one place: which are connected (with any connection
 * problem), which connect in one click, and manual ones; each with its
 * bookings, parcels on the road, COD held and RTO for the last 30 days, plus
 * a side-by-side comparison. A courier opens its own page.
 *
 * Keys: / search · 1 list · 2 compare · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, BarChart3, ChevronRight, Filter, GraduationCap, KeyRound, LayoutGrid, PackageCheck, PenLine, PlugZap, Printer, RefreshCw,
  Truck, Wallet, Zap,
} from 'lucide-react';
import {
  Badge, Button, Card, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { apiErrorMessage, couriersApi, type CourierAccount } from '../api/online-orders.api';
import { COURIERS_KEY, CourierLogo } from '../components/couriers/CourierForms';
import { timeAgo } from '../lib/labels';

type Kind = '' | 'connected' | 'api' | 'manual';
type Tab = 'list' | 'compare';
const KINDS: Array<{ value: Kind; label: string; hint?: string }> = [
  { value: '', label: 'Sab couriers' },
  { value: 'connected', label: 'Jure hue', hint: 'API se jure' },
  { value: 'api', label: 'Ek click wale', hint: 'Abhi nahi jure' },
  { value: 'manual', label: 'Manual', hint: 'CN khud likhein' },
];

export default function CouriersPage() {
  const { sales: money } = useMasked();
  const theme = useChartTheme();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [kind, setKind] = useState<Kind>('');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, refetchInterval: 60_000 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('compare');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const all = data ?? [];
  const sum = (k: keyof CourierAccount['stats']) => all.reduce((s, c) => s + (c.stats?.[k] ?? 0), 0);
  const dispatched = sum('dispatched30');
  const rto = dispatched ? Math.round((sum('returned30') / dispatched) * 100) : 0;
  const connected = all.filter((c) => c.connected);
  const problems = connected.filter((c) => c.lastError || c.missingSettings.length);
  const term = search.trim().toLowerCase();
  const shown = useMemo(() => all.filter((c) =>
    (!term || c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term))
    && (!kind || (kind === 'connected' ? c.connected : kind === 'api' ? c.mode === 'api' && !c.connected : c.mode === 'manual'))), [all, term, kind]);
  const groups = [
    { title: 'Jure hue', hint: 'Booking, label aur tracking khud', rows: shown.filter((c) => c.connected) },
    { title: 'Ek click se jorein', hint: 'Courier ki details paste karein — booking, tracking aur RTO sab khud', rows: shown.filter((c) => c.mode === 'api' && !c.connected) },
    { title: 'Manual', hint: 'CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai', rows: shown.filter((c) => c.mode === 'manual') },
  ].filter((g) => g.rows.length);
  const compare = all.filter((c) => c.stats.dispatched30 > 0 || c.stats.active > 0)
    .map((c) => ({ code: c.code, name: c.name, delivered: c.stats.delivered30, returned: c.stats.returned30, active: c.stats.active, rto: c.stats.rtoRate, cod: c.stats.codPendingValue }));

  return (
    <PageShell>
      <PageHero
        title="Couriers"
        chip={<><Truck />{connected.length} jure hue</>}
        meta="Courier jorein — phir ek click me booking, CN, label aur tracking"
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <button type="button" onClick={() => refetch()} title="Taaza" className={heroIconButton}><RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <Link to="/online-orders/cod" className={heroButton}><Wallet className="h-4 w-4" /> COD hisaab</Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={data ? [
          { label: 'Raste me', value: String(sum('active')), hint: `${sum('awaitingPickup')} pickup baqi` },
          { label: 'Customer nahi mila', value: String(sum('attempted')) },
          { label: 'Courier ke paas (COD)', value: money(sum('codPendingValue')), hint: `${sum('codPending')} parcel` },
          { label: 'RTO (30 din)', value: `${rto}%`, hint: `${sum('returned30')} / ${dispatched}` },
        ] : [{ label: 'Raste me', value: '' }, { label: 'Customer nahi mila', value: '' }, { label: 'Courier ke paas', value: '' }, { label: 'RTO', value: '' }]}
      />

      {isError ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Couriers nahi khule</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : (<>
        <KpiRow>
          {!data ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={PlugZap} color="#16a34a" label="Jure hue" value={connected.length} hint={`${all.filter((c) => c.mode === 'api').length} me se ek-click wale`}
              onClick={() => { setTab('list'); setKind(kind === 'connected' ? '' : 'connected'); }} active={kind === 'connected'} />
            <KpiCard icon={Zap} color="#2563eb" label="Book (30 din)" value={sum('booked30')} hint="Nafaa se book hue" />
            <KpiCard icon={PackageCheck} color="#0d9488" label="Deliver (30 din)" value={sum('delivered30')} hint={`${dispatched} bheje`} />
            <KpiCard icon={Printer} color="#d97706" label="Pickup ka intezar" value={sum('awaitingPickup')} hint="Label print karke parcel dein" />
            <KpiCard icon={AlertTriangle} color="#e11d48" label="Masla" value={problems.length} hint={problems.length ? problems.map((p) => p.name).join(', ') : 'Sab theek'}
              onClick={problems.length ? () => { setTab('list'); setKind('connected'); } : undefined} />
          </>}
        </KpiRow>

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Courier ka naam…" label="Courier search" />}
          chips={kind || term ? <>
            {kind && <FilterChip onRemove={() => setKind('')}>{KINDS.find((k) => k.value === kind)?.label}</FilterChip>}
            {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={() => { setKind(''); setSearch(''); }}>
          <FilterMenu icon={Filter} label="Kism" value={kind} active={!!kind} onChange={setKind} options={KINDS} align="right" />
        </FilterBar>

        <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> list · <Kbd>2</Kbd> muqabla</>}
          tabs={[{ id: 'list', label: 'Couriers', icon: LayoutGrid, count: shown.length }, { id: 'compare', label: 'Muqabla', icon: BarChart3 }]} />

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : tab === 'compare' ? (
          !compare.length ? (
            <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
              <p className="font-semibold text-slate-900">Pichhle 30 din me koi parcel nahi bheja</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">Courier se parcel bhejein — phir yahan muqabla dikhega.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="rounded-3xl border-0 ring-1 ring-slate-200/80 lg:col-span-3" title="Deliver aur wapas (30 din)" description="Kaun sa courier zyada parcel pohanchata hai">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compare} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                      <Tooltip formatter={(v, n) => [String(v), n === 'delivered' ? 'Deliver' : n === 'returned' ? 'Wapas' : 'Raste me']} {...theme.tooltip} />
                      <Legend formatter={(v) => (v === 'delivered' ? 'Deliver' : v === 'returned' ? 'Wapas (RTO)' : 'Raste me')} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="delivered" stackId="p" fill="#16a34a" barSize={30} />
                      <Bar dataKey="returned" stackId="p" fill="#e11d48" barSize={30} />
                      <Bar dataKey="active" stackId="p" fill={theme.primarySoft} radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="rounded-3xl border-0 ring-1 ring-slate-200/80 lg:col-span-2" flush title="RTO aur COD" description="Kam RTO wala courier behtar">
                <ul className="divide-y divide-slate-100">
                  {[...compare].sort((a, b) => a.rto - b.rto).map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-900"><CourierLogo c={c} size={24} /><span className="truncate">{c.name}</span></span>
                      <span className="flex items-center gap-3">
                        {c.cod > 0 && <span className="text-orange-700">{money(c.cod)} paas</span>}
                        <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', c.rto >= 20 ? 'bg-rose-50 text-rose-700' : c.rto >= 10 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700')}>RTO {c.rto}%</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )
        ) : !groups.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Is filter me koi courier nahi</p>
            <Button className="mt-3" variant="secondary" onClick={() => { setKind(''); setSearch(''); }}>Filter hatayein</Button>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.title}>
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{g.title}</h2>
                <span className="text-[0.8125rem] text-slate-500">{g.hint}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{g.rows.map((c) => <CourierTile key={c.code} c={c} money={money} />)}</div>
            </section>
          ))
        )}
      </>)}

      {guide.isOpen && (
        <PageGuide title="Couriers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: KeyRound, color: '#2563eb', title: 'Courier jorein', text: 'Ek-click wale courier par click karein, portal se API key copy karke paste karein. Nafaa key usi waqt check karta hai.' },
            { icon: Zap, color: '#16a34a', title: 'Booking', text: 'Courier ke safhe par "Book karein" — accept hue orders chunein aur ek saath book karein. CN khud aata hai.' },
            { icon: Printer, color: '#d97706', title: 'Label', text: 'Parcels tab se ek ya kai labels ek saath print karein aur parcel par lagayein.' },
            { icon: Truck, color: '#0284c7', title: 'Tracking', text: 'Courier utha le to order "Raste me", deliver ho to "Delivered", wapas aaye to bill void aur stock wapas — sab khud.' },
            { icon: PenLine, color: '#64748b', title: 'Manual courier', text: 'Jis courier ka API nahi, us ka CN order me khud likhein — tracking link, COD aur RTO phir bhi chalta hai.' },
            { icon: Wallet, color: '#ea580c', title: 'COD', text: 'Courier ke paas atka paisa "COD hisaab" me. Settlement aaye to wahan "Paisa mil gaya".' },
          ]}
          tips={['Masla wala courier laal dikhta hai — us par click karke "Connection" me key dobara check karein.', 'Muqabla tab se dekhein kaun sa courier kam RTO karta hai.']}
          shortcuts={[['/', 'dhoondein'], ['1', 'list'], ['2', 'muqabla'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function CourierTile({ c, money }: { c: CourierAccount; money: (n: number) => string }) {
  const s = c.stats;
  let status: ReactNode;
  if (c.connected) {
    status = c.lastError ? <Badge variant="danger" dot>Masla</Badge>
      : c.missingSettings.length ? <Badge variant="warning" dot>Settings baqi</Badge>
        : <Badge variant={c.active ? 'success' : 'default'} dot>{c.active ? 'Jura hua' : 'Band'}</Badge>;
  } else {
    status = c.mode === 'api' ? <Badge variant="info"><Zap className="h-3 w-3" />Ek click</Badge> : <Badge><PenLine className="h-3 w-3" />Manual</Badge>;
  }
  const activity = s.active > 0 || s.dispatched30 > 0 || s.codPending > 0;
  return (
    <Link to={`/online-store/couriers/${c.code.toLowerCase()}`}
      className={cn('group flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md', c.connected && c.lastError ? 'ring-rose-200' : 'ring-slate-200/80')}>
      <div className="flex items-center gap-3">
        <CourierLogo c={c} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{c.name}</span>
            {status}
          </div>
          <div className="truncate text-[0.75rem] text-slate-500">
            {c.connected
              ? c.lastError ? c.lastError : c.lastSyncAt ? `Sync ${timeAgo(c.lastSyncAt)}` : 'Abhi sync nahi hua'
              : c.mode === 'api' ? (c.connect?.features.label ? 'Booking · label · tracking khud' : 'Booking · tracking khud') : c.code === 'RIDER' ? 'COD ka hisaab Nafaa me' : 'CN khud likhein'}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
      </div>
      {activity ? (
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
          <Stat label="Raste me" value={String(s.active)} />
          <Stat label="Deliver" value={String(s.delivered30)} />
          <Stat label="RTO" value={`${s.rtoRate}%`} tone={s.rtoRate >= 20 ? 'text-rose-600' : undefined} />
          <Stat label="COD paas" value={s.codPending ? money(s.codPendingValue) : '—'} tone={s.codPending ? 'text-orange-700' : undefined} />
        </div>
      ) : c.connected ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-500">Pichhle 30 din me koi parcel nahi — "Book karein" se shuru karein.</p>
      ) : null}
      {s.attempted > 0 && (
        <p className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{s.attempted} parcel — customer nahi mila</p>
      )}
    </Link>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <div className={cn('truncate text-[0.875rem] font-bold tabular-nums text-slate-900', tone)}>{value}</div>
      <div className="truncate text-[0.6875rem] text-slate-500">{label}</div>
    </div>
  );
}
