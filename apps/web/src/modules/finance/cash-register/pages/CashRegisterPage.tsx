/**
 * Cash register (galla) for every industry. "Aaj ka galla" shows the open
 * shift of each branch with its live count and the till actions (open,
 * cash in/out, close with a note-by-note count). "Shifts record" lists
 * every shift of a period with its short/over; "Analytics" shows shorts
 * and overs by staff and day, cash sales and the average float. Each
 * shift prints as an X/Z-report.
 *
 * Keys: O open shift · I cash in · U cash out · C close · / search · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownToLine, BarChart3, Calculator, CircleDot, ClipboardList, Filter, GraduationCap, ListChecks, PlayCircle,
  Printer, StopCircle, Store, TrendingUp, UserRound, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore, useCanSwitchShops, useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { cashRegisterApi, type CashRegister, type ShiftQuery, type ShiftRow, type ShiftStatus } from '../api/cash-register.api';
import { CashAnalytics } from '../components/CashAnalytics';
import { CashMoveModal } from '../components/CashMoveModal';
import { CloseShiftModal } from '../components/CloseShiftModal';
import { OpenShiftModal } from '../components/OpenShiftModal';
import { ShiftDetailModal } from '../components/ShiftDetailModal';
import { ClosedTill, TillCard, type TillActions } from '../components/TillCard';
import { CASH_KEY, DIFF, STATUS_FILTERS, diffKind, duration, signed, when } from '../components/meta';
import { shiftsDoc } from '../components/print';

type Tab = 'today' | 'shifts' | 'analytics';

export default function CashRegisterPage() {
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canOpen = usePermission(PERMISSIONS.CASH_REGISTER_OPEN);
  const canClose = usePermission(PERMISSIONS.CASH_REGISTER_CLOSE);
  const shopId = useShopParam();
  const allShops = useIsAllShops();
  const isOwner = useCanSwitchShops();
  const assigned = useAuthStore((s) => s.user?.assignedShop);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('today');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [branch, setBranch] = useState('');
  const [staff, setStaff] = useState('');
  const [status, setStatus] = useState<'' | ShiftStatus>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [opening, setOpening] = useState<{ id: string; name: string } | null>(null);
  const [move, setMove] = useState<{ r: CashRegister; kind: 'CASH_IN' | 'CASH_OUT' } | null>(null);
  const [closing, setClosing] = useState<CashRegister | null>(null);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, branch, staff, status, query]);
  useEffect(() => { setBranch(''); setStaff(''); }, [shopId]);

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, enabled: isOwner, staleTime: 5 * 60_000 });
  const tillShops = (shopsQ.data ?? []).filter((s) => s.isActive && s.type === 'SHOP');
  const liveQ = useQuery({ queryKey: [CASH_KEY, 'live', shopId ?? 'all'], queryFn: cashRegisterApi.live, refetchInterval: 30_000 });
  const live = liveQ.data ?? [];

  const period = resolveRange(range, startHour);
  const base: Omit<ShiftQuery, 'page' | 'limit' | 'status'> = {
    ...(period ?? {}), shopId: allShops ? branch || undefined : undefined, staffId: staff || undefined, search: query || undefined,
  };
  const listQ = useQuery({
    queryKey: [CASH_KEY, 'shifts', shopId ?? 'all', { ...base, status, page }],
    queryFn: () => cashRegisterApi.shifts({ ...base, status: status || undefined, page, limit: 30 }),
    placeholderData: (p) => p, enabled: tab === 'shifts',
  });
  const periodQ = useQuery({
    queryKey: [CASH_KEY, 'shifts', shopId ?? 'all', { ...base, page: 1, limit: 1 }],
    queryFn: () => cashRegisterApi.shifts({ ...base, page: 1, limit: 1 }),
    placeholderData: (p) => p,
  });
  const pt = periodQ.data?.totals;

  // A till slot for every branch on the owner's all-branches view, else for the branch in view.
  const shopName = (tillShops.find((s) => s.id === shopId) ?? assigned)?.name ?? live[0]?.shop?.name ?? 'Branch';
  const slotOf = (x: CashRegister) => ({ shop: { id: x.shopId ?? x.id, name: x.shop?.name ?? x.registerNumber }, r: x as CashRegister | undefined });
  const slots: Array<{ shop: { id: string; name: string }; r?: CashRegister }> = allShops
    ? [
      ...tillShops.map((s) => ({ shop: { id: s.id, name: s.name }, r: live.find((x) => x.shopId === s.id) })),
      ...live.filter((x) => !tillShops.some((s) => s.id === x.shopId)).map(slotOf),
    ]
    : shopId ? [{ shop: { id: shopId, name: shopName }, r: live[0] }] : live.map(slotOf);
  const single = live.length === 1 ? live[0] : null;
  const closedSlot = !allShops && shopId && !live.length ? { id: shopId, name: shopName } : null;
  const inDrawer = live.reduce((s, r) => s + r.expectedBalance, 0);
  const liveSales = live.reduce((s, r) => s + (r.live?.cashSales ?? 0), 0);

  const actions: TillActions = {
    canOpen, canClose,
    onMove: (r, kind) => setMove({ r, kind }),
    onClose: setClosing,
    onReport: setReport,
  };

  const staffOptions = periodQ.data?.staff ?? [];
  const filtered = !!branch || !!staff || !!status || !!query;
  const branchLabel = tillShops.find((s) => s.id === branch)?.name;
  const staffLabel = staffOptions.find((s) => s.id === staff)?.fullName;
  const statusMeta = STATUS_FILTERS.find((s) => s.value === status);
  const periodText = period ? `${period.from} — ${period.to}` : 'Sab tareekhen';
  const filterText = [branchLabel, staffLabel, statusMeta?.label, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => shiftsDoc(await cashRegisterApi.shifts({ ...base, status: status || undefined, page: 1, limit: 200 }), periodText, filterText);
  const clear = () => { setBranch(''); setStaff(''); setStatus(''); setSearch(''); };
  const show = (s: '' | ShiftStatus) => { setTab('shifts'); setStatus(s); };

  // Till shortcuts act on the only open till in view.
  const keyRef = useRef({ single, closedSlot, canOpen, canClose });
  keyRef.current = { single, closedSlot, canOpen, canClose };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      const { single: one, closedSlot: shut, canOpen: mayOpen, canClose: mayClose } = keyRef.current;
      if (k === 'a') { e.preventDefault(); setTab('analytics'); return; }
      if (e.key === '/') { e.preventDefault(); setTab('shifts'); window.setTimeout(() => searchRef.current?.focus(), 0); return; }
      if (!['o', 'i', 'u', 'c'].includes(k)) return;
      e.preventDefault();
      setTab('today');
      if (k === 'o') { if (shut && mayOpen) setOpening(shut); return; }
      if (!one) { toast.info('Pehle upar se ek branch chunein'); return; }
      if ((k === 'i' || k === 'u') && mayOpen) setMove({ r: one, kind: k === 'i' ? 'CASH_IN' : 'CASH_OUT' });
      if (k === 'c' && mayClose) setClosing(one);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PageShell>
      <PageHero
        title="Cash register"
        chip={<><Wallet /> Galla</>}
        meta="Shift kholein, cash in/out likhein, band karte waqt gin kar milayein"
        busy={liveQ.isFetching && !liveQ.isLoading}
        loading={liveQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!periodQ.data?.total} label="Shifts" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {single && canClose
            ? <button type="button" onClick={() => setClosing(single)} title="Shift band (C)" className={heroPrimaryButton}><StopCircle className="h-4 w-4" /> Shift band karein</button>
            : closedSlot && canOpen && <button type="button" onClick={() => setOpening(closedSlot)} title="Shift kholein (O)" className={heroPrimaryButton}><PlayCircle className="h-4 w-4" /> Shift kholein</button>}
        </>}
        stats={[
          { label: 'Galle me abhi hona chahiye', value: money(inDrawer), hint: live.length ? `${live.length} khuli shift` : 'Koi shift khuli nahi' },
          { label: 'Khuli shift ki cash bikri', value: money(liveSales) },
          { label: 'Is muddat kam nikle', value: pt ? money(pt.shortAmount) : '—', hint: pt?.short ? `${pt.short} shift` : undefined },
          { label: 'Zyada nikle', value: pt ? money(pt.overAmount) : '—', hint: pt?.over ? `${pt.over} shift` : undefined },
        ]}
      />

      <KpiRow cols={5}>
        {!pt || liveQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Wallet} color="#16a34a" label="Galle me abhi" value={money(inDrawer)}
            hint={live.length ? `${live.length} khuli shift` : 'Shift kholein'} onClick={() => setTab('today')} active={tab === 'today'} />
          <KpiCard icon={ArrowDownToLine} color="#0d9488" label="Cash bikri (khuli shift)" value={money(liveSales)}
            hint={`${live.reduce((s, r) => s + (r.live?.cashSalesCount ?? 0), 0)} bill`} onClick={() => setTab('today')} />
          <KpiCard icon={AlertTriangle} color="#e11d48" label="Paise kam nikle" value={money(pt.shortAmount)} hint={`${pt.short} shift · is muddat`}
            onClick={() => show('SHORT')} active={tab === 'shifts' && status === 'SHORT'} />
          <KpiCard icon={TrendingUp} color="#0284c7" label="Paise zyada nikle" value={money(pt.overAmount)} hint={`${pt.over} shift · is muddat`}
            onClick={() => show('OVER')} active={tab === 'shifts' && status === 'OVER'} />
          <KpiCard icon={Calculator} color="#475569" label="Ausat opening float" value={money(pt.avgFloat)} hint={`${pt.shifts} shift · ${pt.matched} barabar`}
            onClick={() => show('')} active={tab === 'shifts' && !status} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); if (v) setTab((t) => (t === 'today' ? 'shifts' : t)); }} placeholder="Register number, staff ka naam ya note…" label="Shift dhoondein" />}
        chips={filtered ? <>
          {branch && <FilterChip onRemove={() => setBranch('')}>{branchLabel}</FilterChip>}
          {staff && <FilterChip onRemove={() => setStaff('')}>{staffLabel ?? 'Staff'}</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{statusMeta?.label}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        {allShops && tillShops.length > 1 && (
          <FilterMenu icon={Store} label={branchLabel ?? 'Branch'} value={branch} active={!!branch} onChange={setBranch}
            options={[{ value: '', label: 'Sab branches' }, ...tillShops.map((s) => ({ value: s.id, label: s.name }))]} />
        )}
        <FilterMenu icon={UserRound} label={staffLabel ?? 'Staff'} value={staff} active={!!staff} onChange={setStaff}
          options={[{ value: '', label: 'Sab staff' }, ...staffOptions.map((s) => ({ value: s.id, label: s.fullName, hint: `${s.shifts} shift` }))]} />
        <FilterMenu icon={Filter} label={statusMeta?.label ?? 'Haal'} value={status} active={!!status} align="right"
          onChange={(v) => show(v)}
          options={[{ value: '' as '' | ShiftStatus, label: 'Sab shifts' }, ...STATUS_FILTERS.map((s) => ({ value: s.value as '' | ShiftStatus, label: s.label, hint: s.hint, icon: s.icon, color: s.color }))]} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={tab === 'today'
          ? <>Muddat ka filter yahan nahi lagta · <Kbd>I</Kbd> cash in · <Kbd>U</Kbd> cash out · <Kbd>C</Kbd> band</>
          : <><Kbd>/</Kbd> dhoondein · <Kbd>A</Kbd> analytics · <Kbd>G</Kbd> guide</>}
        tabs={[
          { id: 'today', label: 'Aaj ka galla', icon: Wallet, count: live.length || null },
          { id: 'shifts', label: 'Shifts record', icon: ListChecks, count: periodQ.data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <CashAnalytics filters={base} money={money} /> : tab === 'today' ? (
        liveQ.isLoading ? <Skeleton className="h-72 rounded-3xl" /> : !slots.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Store className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">Koi khuli shift nahi</p>
            <p className="mt-1 text-sm text-slate-500">Shift kholne ke liye upar se ek branch chunein.</p>
          </div>
        ) : (
          <div className={cn('grid gap-4', allShops && slots.length > 1 && 'xl:grid-cols-2')}>
            {slots.map(({ shop, r }) => r
              ? <TillCard key={r.id} r={r} compact={allShops && slots.length > 1} keys={!!single} actions={actions} />
              : <ClosedTill key={shop.id} shop={shop} canOpen={canOpen} keys={!allShops} onOpen={() => setOpening(shop)} />)}
          </div>
        )
      ) : (<>
        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : !listQ.data?.items.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi shift nahi' : 'Is muddat me koi shift nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Har shift kholne aur band karne par yahan record banta hai — kis ne kholi, kitna gina aur kitna farak aaya.</p>
            {filtered && <Button className="mt-4" variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {listQ.data.items.map((r) => <ShiftLine key={r.id} r={r} money={money} showShop={allShops} onOpen={() => setReport(r.id)} />)}
          </ul>
        )}
        {listQ.data && listQ.data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {listQ.data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= listQ.data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {opening && <OpenShiftModal shop={opening} onClose={() => setOpening(null)} />}
      {move && <CashMoveModal register={move.r} kind={move.kind} onClose={() => setMove(null)} />}
      {closing && <CloseShiftModal register={closing} onClose={() => setClosing(null)} onClosed={(id) => { setClosing(null); setReport(id); }} />}
      {report && <ShiftDetailModal id={report} onClose={() => setReport(null)} />}

      {guide.isOpen && (
        <PageGuide title="Cash register — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: PlayCircle, color: '#16a34a', title: 'Shift kholein', text: 'Din ya shift ke shuru me galla ginein — kul raqam likhein ya note gin kar. Ek branch me ek waqt me ek hi shift khulti hai.' },
            { icon: Wallet, color: '#0d9488', title: 'Hisaab khud chalta hai', text: 'Cash bikri, booking ki cash raqam aur khata wusooli galle me judti hai; cash kharch, wapsi, cash kharidari aur supplier ko di gayi raqam ghat jati hai. "Hona chahiye" har waqt taaza rehta hai.' },
            { icon: ArrowDownToLine, color: '#2563eb', title: 'Cash in / out', text: 'Khula paisa daala, malik ne paise liye ya bank me jama karwaye? Wajah ke saath likhein taake shift ke aakhir me farak na aaye.' },
            { icon: StopCircle, color: '#e11d48', title: 'Band karein aur milayein', text: 'Shift ke aakhir me galla note gin kar likhein. Paise kam ya zyada hon to wajah likhna zaroori hai. Band hote hi Z-report print ho sakti hai.' },
            { icon: Printer, color: '#7c3aed', title: 'X / Z-report', text: 'Khuli shift ka X-report aur band shift ka Z-report — A4, PDF ya thermal par. Shifts record me kisi bhi shift par click karein.' },
            { icon: BarChart3, color: '#d97706', title: 'Analytics', text: 'Kis staff ki shift me paise kam nikalte hain, roz ki cash bikri aur ausat opening float — karobari din ke hisaab se.' },
          ]}
          tips={[
            'Khata wusooli aur supplier ki adaigi khud hisaab me judti hain — inhein dobara "Cash in / out" se mat likhein.',
            'Shift band karne ke liye "Cash register band" ki ijazat chahiye — Team settings me de sakte hain.',
            'Sab branches wale view me har branch ka galla alag dikhta hai; wahin se khol aur band kar sakte hain.',
          ]}
          shortcuts={[['O', 'shift kholein'], ['I', 'cash in'], ['U', 'cash out'], ['C', 'shift band'], ['/', 'dhoondein'], ['A', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ShiftLine({ r, money, showShop, onOpen }: { r: ShiftRow; money: (n: number) => string; showShop: boolean; onOpen: () => void }) {
  const open = r.status === 'OPEN';
  const kind = diffKind(r.difference);
  const D = DIFF[kind];
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 sm:flex-nowrap sm:px-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', open ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
          {open ? <CircleDot className="h-4 w-4 animate-pulse" /> : <Wallet className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-slate-900">{when(r.openedAt)}{r.closedAt ? ` — ${new Date(r.closedAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}` : ''}</span>
            {open
              ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200">Khuli</span>
              : <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', D.tone)}><D.icon className="h-3 w-3" />{D.label}</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400">
            <span className="font-mono">{r.registerNumber}</span>
            {showShop && r.shop ? ` · ${r.shop.name}` : ''} · {r.openedBy?.fullName ?? '—'}
            {r.closedBy && r.closedBy.id !== r.openedBy?.id ? ` → ${r.closedBy.fullName}` : ''} · {duration(r.openedAt, r.closedAt)}
            {r.notes ? ` · ${r.notes}` : ''}
          </span>
        </span>
        <span className="hidden text-right sm:block">
          <span className="block text-[0.6875rem] text-slate-400">Opening · cash bikri</span>
          <span className="block text-[0.8125rem] tabular-nums text-slate-700">{money(r.openingBalance)} · {money(r.totalSales)}</span>
        </span>
        <span className="ml-auto text-right">
          <span className="block text-[0.6875rem] text-slate-400">{open ? 'Hona chahiye' : `Gina · hona chahiye ${money(r.expectedBalance)}`}</span>
          <span className="block text-base font-bold tabular-nums text-slate-900">{open ? money(r.expectedBalance) : money(r.closingBalance)}</span>
        </span>
        {!open && (
          <span className={cn('w-24 text-right text-[0.875rem] font-semibold tabular-nums', kind === 'short' ? 'text-rose-700' : kind === 'over' ? 'text-sky-700' : 'text-emerald-700')}>
            {kind === 'match' ? 'Barabar' : signed(r.difference)}
          </span>
        )}
      </button>
    </li>
  );
}
