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
  AlertTriangle, BarChart3, Calculator, ChevronRight, Filter, GraduationCap, KeyRound, LayoutGrid, PackageCheck, PenLine, PlugZap, Printer, RefreshCw,
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
import { t } from '@core/i18n';

type Kind = '' | 'connected' | 'api' | 'manual';
type Tab = 'list' | 'compare';
const KINDS: Array<{ value: Kind; label: string; hint?: string }> = [
  { value: '', label: t('Sab couriers') },
  { value: 'connected', label: t('Jure hue'), hint: t('API se jure') },
  { value: 'api', label: t('Ek click wale'), hint: t('Abhi nahi jure') },
  { value: 'manual', label: t('Manual'), hint: t('CN khud likhein') },
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
    { title: t('Jure hue'), hint: t('Booking, label aur tracking khud'), rows: shown.filter((c) => c.connected) },
    { title: t('Ek click se jorein'), hint: t('Courier ki details paste karein — booking, tracking aur RTO sab khud'), rows: shown.filter((c) => c.mode === 'api' && !c.connected) },
    { title: t('Manual'), hint: t('CN khud likhein — tracking link, COD hisaab aur RTO Nafaa sambhalta hai'), rows: shown.filter((c) => c.mode === 'manual') },
  ].filter((g) => g.rows.length);
  const compare = all.filter((c) => c.stats.dispatched30 > 0 || c.stats.active > 0)
    .map((c) => ({ code: c.code, name: c.name, delivered: c.stats.delivered30, returned: c.stats.returned30, active: c.stats.active, rto: c.stats.rtoRate, cod: c.stats.codPendingValue }));

  return (
    <PageShell>
      <PageHero
        title={t('Couriers')}
        chip={<><Truck />{t('{{count}} jure hue', { count: connected.length })}</>}
        meta={t('Courier jorein — phir ek click me booking, CN, label aur tracking')}
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <button type="button" onClick={() => refetch()} title={t('Taaza')} className={heroIconButton}><RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /></button>
          <Link to="/online-store/couriers/rules" className={heroButton}><Zap className="h-4 w-4" /> <span className="hidden sm:inline">{t('Auto booking')}</span></Link>
          <Link to="/online-store/costs" className={heroButton}><Calculator className="h-4 w-4" /> <span className="hidden sm:inline">{t('Rates')}</span></Link>
          <Link to="/online-orders/cod" className={heroButton}><Wallet className="h-4 w-4" /> <span className="hidden sm:inline">{t('COD hisaab')}</span></Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={data ? [
          { label: t('Raste me'), value: String(sum('active')), hint: t('{{sum}} pickup baqi', { sum: sum('awaitingPickup') }) },
          { label: t('Customer tak nahi pohanche'), value: String(sum('attempted')) },
          { label: t('Courier ke paas (COD)'), value: money(sum('codPendingValue')), hint: t('{{sum}} parcel', { sum: sum('codPending') }) },
          { label: t('RTO (30 din)'), value: `${rto}%`, hint: `${sum('returned30')} / ${dispatched}` },
        ] : [{ label: t('Raste me'), value: '' }, { label: t('Customer tak nahi pohanche'), value: '' }, { label: t('Courier ke paas'), value: '' }, { label: t('RTO'), value: '' }]}
      />

      {isError ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Couriers nahi khule')}</p>
          <p className="mt-1 text-[0.8125rem] text-slate-500">{apiErrorMessage(error)}</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>{t('Dobara koshish')}</Button>
        </div>
      ) : (<>
        <KpiRow>
          {!data ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={PlugZap} color="#16a34a" label={t('Jure hue')} value={connected.length} hint={t('{{count}} me se ek-click wale', { count: all.filter((c) => c.mode === 'api').length })}
              onClick={() => { setTab('list'); setKind(kind === 'connected' ? '' : 'connected'); }} active={kind === 'connected'} />
            <KpiCard icon={Zap} color="#2563eb" label={t('Book (30 din)')} value={sum('booked30')} hint={t('Nafaa se book hue')} />
            <KpiCard icon={PackageCheck} color="#0d9488" label={t('Deliver (30 din)')} value={sum('delivered30')} hint={t('{{dispatched}} bheje', { dispatched })} />
            <KpiCard icon={Printer} color="#d97706" label={t('Pickup ka intezar')} value={sum('awaitingPickup')} hint={t('Label print karke parcel dein')} />
            <KpiCard icon={AlertTriangle} color="#e11d48" label={t('Masla')} value={problems.length} hint={problems.length ? problems.map((p) => p.name).join(', ') : t('Sab theek')}
              onClick={problems.length ? () => { setTab('list'); setKind('connected'); } : undefined} />
          </>}
        </KpiRow>

        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Courier ka naam…')} label={t('Courier search')} />}
          chips={kind || term ? <>
            {kind && <FilterChip onRemove={() => setKind('')}>{KINDS.find((k) => k.value === kind)?.label}</FilterChip>}
            {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          </> : undefined}
          onClear={() => { setKind(''); setSearch(''); }}>
          <FilterMenu icon={Filter} label={t('Kism')} value={kind} active={!!kind} onChange={setKind} options={KINDS} align="right" />
        </FilterBar>

        <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd> {' '}{t('list ·')}{' '} <Kbd>2</Kbd> {' '}{t('muqabla')}</>}
          tabs={[{ id: 'list', label: t('Couriers'), icon: LayoutGrid, count: shown.length }, { id: 'compare', label: t('Muqabla'), icon: BarChart3 }]} />

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        ) : tab === 'compare' ? (
          !compare.length ? (
            <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
              <p className="font-semibold text-slate-900">{t('Pichhle 30 din me koi parcel nahi bheja')}</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">{t('Courier se parcel bhejein — phir yahan muqabla dikhega.')}</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-5">
              <Card className="rounded-3xl border-0 ring-1 ring-slate-200/80 lg:col-span-3" title={t('Deliver aur wapas (30 din)')} description={t('Kaun sa courier zyada parcel pohanchata hai')}>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compare} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
                      <Tooltip formatter={(v, n) => [String(v), n === 'delivered' ? t('Deliver hue') : n === 'returned' ? t('Wapas') : t('Raste me')]} {...theme.tooltip} />
                      <Legend formatter={(v) => (v === 'delivered' ? t('Deliver hue') : v === 'returned' ? t('Wapas (RTO)') : t('Raste me'))} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="delivered" stackId="p" fill="#16a34a" barSize={30} />
                      <Bar dataKey="returned" stackId="p" fill="#e11d48" barSize={30} />
                      <Bar dataKey="active" stackId="p" fill={theme.primarySoft} radius={[6, 6, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="rounded-3xl border-0 ring-1 ring-slate-200/80 lg:col-span-2" flush title={t('RTO aur COD')} description={t('Kam RTO wala courier behtar')}>
                <ul className="divide-y divide-slate-100">
                  {[...compare].sort((a, b) => a.rto - b.rto).map((c) => (
                    <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                      <span className="inline-flex min-w-0 items-center gap-2 font-medium text-slate-900"><CourierLogo c={c} size={24} /><span className="truncate">{c.name}</span></span>
                      <span className="flex items-center gap-3">
                        {c.cod > 0 && <span className="text-orange-700">{t('{{cod}} paas', { cod: money(c.cod) })}</span>}
                        <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', c.rto >= 20 ? 'bg-rose-50 text-rose-700' : c.rto >= 10 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700')}>{t('RTO {{rto}}%', { rto: c.rto })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )
        ) : !groups.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">{t('Is filter me koi courier nahi')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => { setKind(''); setSearch(''); }}>{t('Filter hatayein')}</Button>
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
        <PageGuide title={t('Couriers — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Courier jorein'), icon: KeyRound, color: '#2563eb' },
            { label: t('Booking'), hint: t('CN khud'), icon: Zap, color: '#16a34a' },
            { label: t('Tracking'), hint: t('Delivered / RTO'), icon: Truck, color: '#0284c7' },
          ]}
          steps={[
            { icon: KeyRound, color: '#2563eb', title: t('Courier jorein'), text: t('Ek-click wale courier par click karein, portal se API key copy karke paste karein. Nafaa key usi waqt check karta hai.') },
            { icon: Zap, color: '#16a34a', title: t('Booking'), text: t('Courier ke safhe par "Book karein" — accept hue orders chunein aur ek saath book karein. CN khud aata hai.') },
            { icon: Printer, color: '#d97706', title: t('Label'), text: t('Parcels tab se ek ya kai labels ek saath print karein aur parcel par lagayein.') },
            { icon: Truck, color: '#0284c7', title: t('Tracking'), text: t('Courier utha le to order "Raste me", deliver ho to "Delivered", wapas aaye to bill void aur stock wapas — sab khud.') },
            { icon: PenLine, color: '#64748b', title: t('Manual courier'), text: t('Jis courier ka API nahi, us ka CN order me khud likhein — tracking link, COD aur RTO phir bhi chalta hai.') },
            { icon: Wallet, color: '#ea580c', title: t('COD'), text: t('Courier ke paas atka paisa "COD hisaab" me. Settlement aaye to wahan "Paisa mil gaya".') },
          ]}
          tips={[t('Masla wala courier laal dikhta hai — us par click karke "Connection" me key dobara check karein.'), t('Muqabla tab se dekhein kaun sa courier kam RTO karta hai.')]}
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
    status = c.lastError ? <Badge variant="danger" dot>{t('Masla')}</Badge>
      : c.missingSettings.length ? <Badge variant="warning" dot>{t('Settings baqi')}</Badge>
        : <Badge variant={c.active ? 'success' : 'default'} dot>{c.active ? t('Jura hua') : t('Band')}</Badge>;
  } else {
    status = c.mode === 'api' ? <Badge variant="info"><Zap className="h-3 w-3" />{t('Ek click')}</Badge> : <Badge><PenLine className="h-3 w-3" />{t('Manual')}</Badge>;
    if (c.apiSoon) status = <>{status}<Badge variant="warning" title={t('Apna API key/docs bhejein')}>{t('Coming soon')}</Badge></>;
  }
  if (c.beta) status = <>{status}<Badge variant="warning" title={t('Beta — pehli booking check karein')}>{t('Beta')}</Badge></>;
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
              ? c.lastError ? c.lastError : c.lastSyncAt ? t('Sync {{lastSyncAt}}', { lastSyncAt: timeAgo(c.lastSyncAt) }) : t('Abhi sync nahi hua')
              : c.mode === 'api' ? (c.connect?.features.label ? t('Booking · label · tracking khud') : t('Booking · tracking khud')) : c.code === 'RIDER' ? t('COD ka hisaab Nafaa me') : t('CN khud likhein')}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 rtl-flip" />
      </div>
      {activity ? (
        <div className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
          <Stat label={t('Raste me')} value={String(s.active)} />
          <Stat label={t('Deliver hue')} value={String(s.delivered30)} />
          <Stat label={t('RTO')} value={`${s.rtoRate}%`} tone={s.rtoRate >= 20 ? 'text-rose-600' : undefined} />
          <Stat label={t('COD paas')} value={s.codPending ? money(s.codPendingValue) : '—'} tone={s.codPending ? 'text-orange-700' : undefined} />
        </div>
      ) : c.connected ? (
        <p className="mt-3 border-t border-slate-100 pt-3 text-[0.75rem] text-slate-500">{t('Pichhle 30 din me koi parcel nahi — "Book karein" se shuru karein.')}</p>
      ) : null}
      {s.attempted > 0 && (
        <p className="mt-2 inline-flex items-center gap-1 text-[0.75rem] font-medium text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />{t('{{attempted}} parcel — customer nahi mila', { attempted: s.attempted })}</p>
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
