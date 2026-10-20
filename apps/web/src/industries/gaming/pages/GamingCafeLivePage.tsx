/**
 * Cafe Live: every station with its clock. A free station starts a session
 * (player, game, rate); a running one pauses, resumes, is billed here
 * ("Bill banayein": time, extra charges, discount, paid now or on the
 * player's khata) or at the counter together with snacks and cards. A
 * session started by mistake is cancelled with a reason. History lists
 * every session with paging, export and print; Analytics shows each
 * station's hours and money.
 *
 * Keys: / search · N start on the first free station · L live · H history · A analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, Clock, Download, GraduationCap, History, Monitor, Pause, Play, Plus, Receipt, ShoppingCart, Timer, Users, Wallet, Wrench, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Textarea, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { gamingSessionsApi, type GamingCafeSession } from '../api/sessions.api';
import { gamingStationsApi, type GamingStation } from '../api/stations.api';
import { BarList, Empty, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import {
  GAMING_KEYS, MONEY_KEYS, PAY_METHODS, SESSION_STATUS, STATION_TYPES, errorText, liveOf, minutesText, moneyText, numIn, phoneOk, shortDate, timeOf,
} from '../lib/meta';

type Tab = 'live' | 'history' | 'analytics';
const LIMIT = 25;
const STATUS_OPTIONS = [{ value: '', label: 'Sab' }, ...Object.entries(SESSION_STATUS).map(([value, s]) => ({ value, label: s.label }))];

/** Re-renders every 30 seconds so running clocks move. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export default function GamingCafeLivePage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const canStations = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const now = useNow();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('live');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'today', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [starting, setStarting] = useState<GamingStation | null>(null);
  const [billing, setBilling] = useState<GamingCafeSession | null>(null);
  const [cancelling, setCancelling] = useState<GamingCafeSession | null>(null);
  const range = resolveRange(period, startHour);

  const stationsQ = useQuery({ queryKey: [GAMING_KEYS.stations, 'active'], queryFn: () => gamingStationsApi.list({ active: true }) });
  const activeQ = useQuery({ queryKey: [GAMING_KEYS.active], queryFn: () => gamingSessionsApi.active(), refetchInterval: 30_000 });
  const params = { search: q || undefined, status: status || undefined, from: range?.from, to: range?.to, page, limit: LIMIT };
  const historyQ = useQuery({ queryKey: [GAMING_KEYS.sessions, 'page', params], queryFn: () => gamingSessionsApi.page(params), enabled: tab !== 'live', placeholderData: (p) => p });
  const todayRange = resolveRange({ preset: 'today', custom: { from: '', to: '' } }, startHour);
  const todayQ = useQuery({ queryKey: [GAMING_KEYS.sessions, 'today'], queryFn: () => gamingSessionsApi.page({ from: todayRange?.from, to: todayRange?.to, status: 'ENDED', page: 1, limit: 1 }) });

  const stations = stationsQ.data ?? [];
  const bySession = useMemo(() => new Map((activeQ.data ?? []).map((s) => [s.stationId, s])), [activeQ.data]);
  const live = activeQ.data ?? [];
  const running = live.filter((s) => s.status === 'ACTIVE').length;
  const paused = live.length - running;
  const free = stations.filter((s) => !bySession.has(s.id) && !s.isUnderMaintenance);
  const runningBill = live.reduce((a, s) => a + liveOf(s, now).amount, 0);
  const shown = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t || tab !== 'live') return stations;
    return stations.filter((st) => [st.name, st.stationNumber, STATION_TYPES[st.stationType], bySession.get(st.id)?.customerName].some((v) => v?.toLowerCase().includes(t)));
  }, [stations, search, tab, bySession]);

  usePageKeys(searchRef, {
    n: () => { if (canWork && free[0]) setStarting(free[0]); },
    l: () => setTab('live'), h: () => setTab('history'), a: () => setTab('analytics'),
  });

  const refresh = () => [GAMING_KEYS.active, GAMING_KEYS.sessions, GAMING_KEYS.stations, GAMING_KEYS.counter, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const pause = useMutation({
    mutationFn: (s: GamingCafeSession) => (s.status === 'PAUSED' ? gamingSessionsApi.resume(s.id) : gamingSessionsApi.pause(s.id)),
    onSuccess: (s) => { refresh(); toast.success(s.status === 'PAUSED' ? 'Waqt ruk gaya' : 'Waqt phir chalu'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  const rows = historyQ.data?.items ?? [];
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi session nahi'); return; }
    downloadCsv('gaming-sessions.csv', [
      ['Session', 'Station', 'Player', 'Phone', 'Shuru', 'Khatam', 'Minute', 'Rate', 'Bill', 'Mila', 'Halat'],
      ...rows.map((s) => [s.sessionNumber, s.station?.name, s.customerName, s.customerPhone, s.startedAt, s.endedAt, s.billableMinutes, s.ratePerHour, s.totalAmount, s.paidAmount, SESSION_STATUS[s.status]?.label]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: 'Station sessions', subtitle: range ? `${range.from.slice(0, 10)} → ${range.to.slice(0, 10)}` : undefined,
    meta: [['Bill hue', String(historyQ.data?.totals.ended ?? 0)], ['Kamai', money(historyQ.data?.totals.amount ?? 0)], ['Waqt', minutesText(historyQ.data?.totals.minutes ?? 0)]],
    sections: [{
      kind: 'table', title: 'Sessions',
      columns: [{ label: 'Session' }, { label: 'Station' }, { label: 'Player', wideOnly: true }, { label: 'Waqt' }, { label: 'Bill', align: 'right' }],
      rows: rows.map((s) => [s.sessionNumber, s.station?.name ?? '—', s.customerName ?? '—', minutesText(s.billableMinutes ?? 0), money(s.totalAmount)]),
    }],
  });
  const filtered = !!(search.trim() || status || period.preset !== 'today');
  const clear = () => { setSearch(''); setStatus(''); setPeriod({ preset: 'today', custom: { from: '', to: '' } }); setPage(1); };

  const byStation = useMemo(() => stations
    .map((s) => ({ key: s.id, label: `${s.name} · ${Math.round(s.totalHoursUsed)} ghante`, count: Math.round(s.totalHoursUsed), value: s.totalRevenue }))
    .sort((a, b) => b.value - a.value), [stations]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Cafe Live — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Play, color: '#16a34a', title: 'Shuru', text: 'Khali station par "Shuru" dabayein — player ka naam (udhaar ke liye zaroori), game aur rate. Package ya do player ka rate ho to rate badal dein.' },
            { icon: Pause, color: '#d97706', title: 'Rokna', text: 'Player break par jaye to "Rokein" — ruka hua waqt bill me nahi lagta.' },
            { icon: Receipt, color: '#7c3aed', title: 'Bill', text: '"Bill" se yahin paise lein, ya "Counter" par station ki tile dabayein — wahan snacks aur card bhi usi bill me aate hain aur paise hisson me (cash + JazzCash) le sakte hain.' },
            { icon: Wallet, color: '#0891b2', title: 'Udhaar / wallet', text: 'Baqi paisa player ke khate me jata hai. Pehle se jama paise (advance) khud bill me lag jate hain.' },
          ]}
          shortcuts={[['N', 'pehla khali station shuru'], ['L', 'live'], ['H', 'history'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Cafe Live" chip={<><Timer /> Stations</>} loading={stationsQ.isLoading} busy={activeQ.isFetching && !activeQ.isLoading}
        meta="Kaun sa station chal raha hai, kitni der se, aur kitna bill bana"
        actions={<>
          {tab !== 'live' && <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>}
          {tab !== 'live' && <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>}
          {canStations && <Link to="/gaming/stations" className={heroButton}><Monitor className="h-4 w-4" /><span className="hidden sm:inline">Stations</span></Link>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWork && <Link to="/pos" className={heroPrimaryButton}><ShoppingCart className="h-4 w-4" />Counter</Link>}
        </>}
        stats={[
          { label: 'Chal rahe', value: String(live.length), hint: `${free.length} khali` },
          { label: 'Chalta bill', value: money(runningBill) },
          { label: 'Aaj ki kamai', value: money(todayQ.data?.totals.amount ?? 0), hint: `${todayQ.data?.totals.ended ?? 0} bill` },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={Play} color="#16a34a" label="Chal rahe" value={running} />
        <KpiCard icon={Pause} color="#d97706" label="Ruke hue" value={paused} hint={paused ? 'Bhool na jayein' : undefined} />
        <KpiCard icon={Monitor} color="#2563eb" label="Khali" value={free.length} hint={`${stations.length} me se`} />
        <KpiCard icon={Clock} color="#7c3aed" label="Aaj khela" value={minutesText(todayQ.data?.totals.minutes ?? 0)} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tab === 'live' ? 'Station ya player…' : 'Session, player, phone ya game…'} />}
        chips={tab !== 'live' && filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{SESSION_STATUS[status]?.label}</FilterChip>}
          {range && period.preset !== 'today' && <FilterChip onRemove={() => setPeriod({ preset: 'today', custom: { from: '', to: '' } })}>{range.from.slice(0, 10)} → {range.to.slice(0, 10)}</FilterChip>}
        </> : undefined}
        onClear={tab !== 'live' ? clear : undefined}>
        {tab !== 'live' && <>
          <FilterMenu icon={History} label={status ? SESSION_STATUS[status]?.label : 'Halat'} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
          <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Kab" defaultPreset="today" />
        </>}
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint={tab === 'live' ? 'Station par click kar ke shuru ya bill karein' : undefined}
        tabs={[
          { id: 'live', label: 'Live', icon: Timer, count: live.length },
          { id: 'history', label: 'History', icon: History, count: historyQ.data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'live' && (
        stationsQ.isLoading ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}</div>
          : stations.length === 0 ? (
            <ListCard><Empty icon={Monitor} title="Abhi koi station nahi" text="Pehle Stations page par PS5, PC ya simulator jorein — rate wahan likhte hain."
              action={canStations ? <Link to="/gaming/stations" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Station jorein</Link> : undefined} /></ListCard>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {shown.map((st) => {
                const s = bySession.get(st.id);
                const l = s ? liveOf(s, now) : null;
                return (
                  <li key={st.id} className={cn('flex flex-col rounded-3xl bg-white p-4 shadow-sm ring-1', s ? (s.status === 'PAUSED' ? 'ring-amber-300' : 'ring-emerald-300') : 'ring-slate-200/80')}>
                    <div className="flex items-start gap-2">
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', s ? 'bg-emerald-50 text-emerald-700' : st.isUnderMaintenance ? 'bg-slate-100 text-slate-400' : 'bg-brand-50 text-brand-700')}><Monitor className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{st.name}</p>
                        <p className="truncate text-[0.75rem] text-slate-500">{st.stationNumber} · {STATION_TYPES[st.stationType]} · {money(st.pricePerHour)}/ghanta</p>
                      </div>
                      {s ? <Pill tone={SESSION_STATUS[s.status].tone}>{SESSION_STATUS[s.status].label}</Pill>
                        : st.isUnderMaintenance ? <Pill tone="bg-slate-100 text-slate-600 ring-slate-200"><Wrench className="h-3 w-3" />Theek ho raha</Pill>
                          : <Pill tone="bg-sky-50 text-sky-700 ring-sky-200">Khali</Pill>}
                    </div>
                    {s && l ? (
                      <>
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                          <p className="text-[1.5rem] font-bold tabular-nums text-slate-900">{money(l.amount)}</p>
                          <p className="text-[0.75rem] text-slate-600">{minutesText(l.minutes)} · {timeOf(s.startedAt)} se{s.status === 'PAUSED' ? ' · ruka hua' : ''}</p>
                          <p className="mt-1 truncate text-[0.75rem] text-slate-500">{[s.customerName, s.gameSelected, s.playerCount > 1 ? `${s.playerCount} player` : null].filter(Boolean).join(' · ') || 'Naam nahi likha'}</p>
                        </div>
                        {canWork && (
                          <div className="mt-3 grid grid-cols-3 gap-1.5">
                            <Button size="sm" variant="secondary" loading={pause.isPending && pause.variables?.id === s.id} onClick={() => pause.mutate(s)}>
                              {s.status === 'PAUSED' ? <><Play className="h-3.5 w-3.5" />Chalayein</> : <><Pause className="h-3.5 w-3.5" />Rokein</>}
                            </Button>
                            <Button size="sm" onClick={() => setBilling(s)}><Receipt className="h-3.5 w-3.5" />Bill</Button>
                            <Button size="sm" variant="ghost" onClick={() => setCancelling(s)}><XCircle className="h-3.5 w-3.5" />Cancel</Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mt-auto pt-3">
                        {st.isUnderMaintenance ? <p className="text-[0.75rem] text-slate-500">{st.maintenanceNotes || 'Station theek ho raha hai'}</p>
                          : canWork && <Button className="w-full" onClick={() => setStarting(st)}><Play className="h-4 w-4" />Shuru karein</Button>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )
      )}

      {tab === 'history' && (
        <ListCard footer={historyQ.data && <Pager page={page} total={historyQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {historyQ.isLoading ? <ListLoading /> : rows.length === 0 ? <Empty icon={History} title="Is filter me koi session nahi" text="Date badal kar dekhein — aaj ke session pehle se chune hain." /> : (
            <ul className="divide-y divide-slate-100">
              {rows.map((s) => (
                <li key={s.id} className="grid gap-1 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_10rem_9rem_8rem] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{s.station?.name ?? 'Station'} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{s.sessionNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[s.customerName, s.customerPhone, s.gameSelected].filter(Boolean).join(' · ') || '—'}</p>
                    {s.notes && <p className="truncate text-[0.75rem] text-slate-500">{s.notes.split('\n').slice(-1)[0]}</p>}
                  </div>
                  <p className="text-[0.8125rem] text-slate-700">{shortDate(s.startedAt)} · {timeOf(s.startedAt)}<span className="block text-[0.75rem] text-slate-500">{minutesText(s.billableMinutes ?? 0)}</span></p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(s.totalAmount)}{s.totalAmount - s.paidAmount > 0.009 && <span className="block text-[0.75rem] font-medium text-rose-700">{money(s.totalAmount - s.paidAmount)} khate me</span>}</p>
                  <div className="flex justify-end"><Pill tone={SESSION_STATUS[s.status].tone}>{SESSION_STATUS[s.status].label}</Pill></div>
                </li>
              ))}
            </ul>
          )}
        </ListCard>
      )}

      {tab === 'analytics' && (
        <div className="space-y-4">
          <KpiRow cols={3}>
            <KpiCard icon={Receipt} color="#7c3aed" label="Bill hue (period)" value={historyQ.data?.totals.ended ?? 0} />
            <KpiCard icon={Wallet} color="#16a34a" label="Kamai (period)" value={money(historyQ.data?.totals.amount ?? 0)} />
            <KpiCard icon={Clock} color="#0891b2" label="Waqt (period)" value={minutesText(historyQ.data?.totals.minutes ?? 0)} />
          </KpiRow>
          <BarList title="Har station — kul kamai aur ghante" money={money} rows={byStation} empty="Abhi koi station nahi" />
        </div>
      )}

      {starting && <StartModal station={starting} onClose={() => setStarting(null)} onDone={() => { setStarting(null); refresh(); }} />}
      {billing && <BillModal session={billing} money={money} onClose={() => setBilling(null)} onDone={() => { setBilling(null); refresh(); }} />}
      {cancelling && <CancelModal session={cancelling} onClose={() => setCancelling(null)} onDone={() => { setCancelling(null); refresh(); }} />}
    </PageShell>
  );
}

function StartModal({ station, onClose, onDone }: { station: GamingStation; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [players, setPlayers] = useState('1');
  const [game, setGame] = useState('');
  const [rate, setRate] = useState(String(station.pricePerHour));
  const rateN = numIn(rate);
  const problem = !phoneOk(phone) ? 'Phone 10 se 15 hindse' : rateN === null ? 'Ghante ka rate likhein' : null;
  const start = useMutation({
    mutationFn: () => gamingSessionsApi.start({
      stationId: station.id, customerName: name.trim() || undefined, customerPhone: phone.trim() || undefined,
      playerCount: Math.max(Number(players) || 1, 1), gameSelected: game.trim() || undefined, ratePerHour: rateN ?? undefined,
    }),
    onSuccess: (s) => { toast.success(`${station.name} shuru — ${s.sessionNumber}`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Shuru nahi hua')),
  });
  const submit = () => { if (!problem && !start.isPending) start.mutate(); };
  useSaveKey(submit);
  const rates = [station.pricePerHour, station.pricePerHalfHour ? station.pricePerHalfHour * 2 : null, station.peakHourPrice, station.offPeakPrice].filter((v, i, a): v is number => !!v && a.indexOf(v) === i);
  return (
    <Modal open onClose={onClose} size="md" title={`${station.name} shuru karein`} description={`${station.stationNumber} · ${STATION_TYPES[station.stationType]}${station.minimumMinutes ? ` · kam se kam ${station.minimumMinutes} min ka bill` : ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={start.isPending} disabled={!!problem} onClick={submit}><Play className="h-4 w-4" />Shuru (Ctrl+S)</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Player ka naam" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ali" hint="Udhaar ke liye zaroori" />
          <Input label="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03001234567" error={!phoneOk(phone) ? '10 se 15 hindse' : undefined} hint="Isi se khata milta hai" />
          <Input label="Kitne player" inputMode="numeric" value={players} onChange={(e) => setPlayers(e.target.value.replace(/\D/g, ''))} leftIcon={<Users className="h-4 w-4" />} />
          <Input label="Game" value={game} onChange={(e) => setGame(e.target.value)} placeholder="FIFA, Tekken, GTA" list="gm-games" />
        </div>
        <datalist id="gm-games">{station.installedGames.map((g) => <option key={g} value={g} />)}</datalist>
        <Input label="Ghante ka rate (Rs)" inputMode="decimal" value={rate} onChange={(e) => setRate(moneyText(e.target.value))} error={rateN === null ? 'Rate likhein' : undefined}
          hint="Package, do player ya raat ka rate ho to yahan badlein — sirf is session par lagega" />
        {rates.length > 1 && <div className="flex flex-wrap gap-1.5">{rates.map((r) => <button key={r} type="button" onClick={() => setRate(String(r))} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50">Rs {r}/ghanta</button>)}</div>}
      </form>
    </Modal>
  );
}

function BillModal({ session: s, money, onClose, onDone }: { session: GamingCafeSession; money: (n: number) => string; onClose: () => void; onDone: () => void }) {
  const l = liveOf(s);
  const [extra, setExtra] = useState('');
  const [discount, setDiscount] = useState('');
  const extraN = numIn(extra) ?? 0;
  const discN = numIn(discount) ?? 0;
  const total = Math.max(Math.round((l.amount + extraN - discN) * 100) / 100, 0);
  const [paid, setPaid] = useState<string | null>(null);
  const paidN = paid === null ? total : numIn(paid) ?? 0;
  const [method, setMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const due = Math.max(total - paidN, 0);
  const problem = discN > l.amount + extraN ? 'Discount bill se zyada hai' : due > 0.009 && !s.customerName?.trim() ? 'Udhaar ke liye player ka naam chahiye (session shuru karte waqt)' : null;
  const end = useMutation({
    mutationFn: () => gamingSessionsApi.end(s.id, { additionalCharges: extraN || undefined, discount: discN || undefined, paidAmount: paidN, paymentMethod: method, notes: notes.trim() || undefined }),
    onSuccess: (r) => { toast.success(`Bill ban gaya — ${money(r.totalAmount)}${r.change ? ` · wapas ${money(r.change)}` : ''}`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Bill nahi bana')),
  });
  const submit = () => { if (!problem && !end.isPending) end.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="md" title={`${s.station?.name ?? 'Station'} — bill`} description={`${s.sessionNumber} · ${minutesText(l.minutes)} @ ${money(s.ratePerHour)}/ghanta`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <Link to="/pos" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Snacks bhi hain? Counter par bill karein →</Link>
        <span className="flex-1" />
        <Button variant="secondary" onClick={onClose}>Wapas</Button>
        <Button loading={end.isPending} disabled={!!problem} onClick={submit}><Receipt className="h-4 w-4" />Bill banayein</Button>
      </div>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex justify-between text-[0.875rem]"><span>Waqt ({minutesText(l.minutes)})</span><span className="tabular-nums">{money(l.amount)}</span></div>
          {extraN > 0 && <div className="flex justify-between text-[0.875rem]"><span>Aur charges</span><span className="tabular-nums">{money(extraN)}</span></div>}
          {discN > 0 && <div className="flex justify-between text-[0.875rem] text-emerald-700"><span>Discount</span><span className="tabular-nums">−{money(discN)}</span></div>}
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-1 text-[1rem] font-bold"><span>Total</span><span className="tabular-nums">{money(total)}</span></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Aur charges (Rs)" inputMode="decimal" value={extra} onChange={(e) => setExtra(moneyText(e.target.value))} placeholder="0" hint="Controller ka nuqsan waghera. Snacks counter se bechein taake stock kam ho." />
          <Input label="Discount (Rs)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(moneyText(e.target.value))} placeholder="0" error={discN > l.amount + extraN ? 'Bill se zyada' : undefined} />
          <Input label="Abhi mila (Rs)" inputMode="decimal" value={paid ?? String(total)} onChange={(e) => setPaid(moneyText(e.target.value))}
            hint={due > 0.009 ? `${money(due)} ${s.customerName ? `${s.customerName} ke khate me` : 'baqi'}` : paidN > total ? `Wapas dein ${money(paidN - total)}` : 'Poora bill'} />
          <Select label="Kaise mila" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} />
        </div>
        <Textarea label="Note (marzi)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {problem && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{problem}</p>}
      </form>
    </Modal>
  );
}

function CancelModal({ session: s, onClose, onDone }: { session: GamingCafeSession; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const cancel = useMutation({
    mutationFn: () => gamingSessionsApi.cancel(s.id, reason.trim()),
    onSuccess: () => { toast.success(`${s.sessionNumber} cancel — koi bill nahi bana`); onDone(); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${s.station?.name ?? 'Station'} — cancel`} description="Sirf ghalti se shuru hua session. Khela hai to Bill banayein."
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant="danger" loading={cancel.isPending} disabled={!reason.trim()} onClick={() => cancel.mutate()}>Cancel karein</Button></>}>
      <Textarea label="Wajah" required autoFocus rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ghalat station chun liya" hint="History me likhi rehti hai" />
    </Modal>
  );
}
