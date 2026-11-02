/**
 * Din ka hisaab (day book): the end-of-day report for any business day, per
 * branch or for all branches. Sales statement, payment methods, drawers
 * reconciled per register, cash in/out, expenses, purchases, supplier
 * payments, khata, booking payments, items, categories, hours, staff,
 * voids, returns, discounts, items running low and a comparison with the
 * day before and the same weekday last week. Prints as a thermal Z report
 * or a full A4 day book; "Din band karein" lists what is left to close.
 *
 * Keys: ← → day · T today · 1–6 tabs · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Ban, BarChart3, BookOpen, CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, Copy, FileDown, GraduationCap,
  Keyboard, ListChecks, MessageCircle, Package, Percent, Printer, RotateCcw, ShoppingBag, Store, UserRound, Vault, Wallet,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useActiveShopId, useAuthStore, useCanSwitchShops, useIsAllShops } from '@core/stores/auth.store';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useReportMasked } from '../prefs';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { getPendingAsSales } from '@modules/sales/sales/api/sales.api';
import { useDayBook } from './api';
import { dayBookDoc, dayText, itemsCsv, prettyDay, zReportDoc, type Money } from './print';
import { CashView } from './components/CashView';
import { ChecksView } from './components/ChecksView';
import { CloseChecklist } from './components/CloseChecklist';
import { ItemsView } from './components/ItemsView';
import { MoneyView } from './components/MoneyView';
import { OverviewView } from './components/OverviewView';
import { StaffBills } from './components/StaffBills';
import { StaffView } from './components/StaffView';
import { Delta } from './components/parts';
import { t as tr } from '@core/i18n';

type Tab = 'overview' | 'cash' | 'money' | 'items' | 'staff' | 'checks';
const TABS: Tab[] = ['overview', 'cash', 'money', 'items', 'staff', 'checks'];
const TAB_KEY = 'nafaa-day-book-tab';

const shiftKey = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function readTab(): Tab {
  try { const t = localStorage.getItem(TAB_KEY) as Tab | null; return t && TABS.includes(t) ? t : 'overview'; } catch { return 'overview'; }
}

export default function DayBookPage() {
  const startHour = useBusinessDayStart();
  const today = businessDayKey(new Date(), startHour);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [shopId, setShopId] = useState('');
  const [tab, setTabState] = useState<Tab>(readTab);
  const [search, setSearch] = useState('');
  const [staff, setStaff] = useState<{ id: string; name: string } | null>(null);
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const guide = usePageGuide();

  const allShops = useIsAllShops();
  const canSwitch = useCanSwitchShops();
  const activeShop = useActiveShopId();
  const tenantName = useAuthStore((s) => s.tenant?.name);
  const assignedShop = useAuthStore((s) => s.user?.assignedShop?.name);
  const { sales, cost, costHidden } = useReportMasked();
  const m: Money = useMemo(() => ({ sales, cost, costHidden }), [sales, cost, costHidden]);

  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: canSwitch });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);

  const q = useDayBook(date, shopId);
  const d = q.data;
  const key = d?.date ?? date ?? today;
  const isToday = key >= today;
  const stale = q.isPlaceholderData;
  // The Galla tab goes away when Settings → Reports hides drawer money from this user.
  const drawerHidden = !!d && !d.drawer;
  useEffect(() => { if (drawerHidden && tab === 'cash') setTabState('overview'); }, [drawerHidden, tab]);

  const pendingQ = useQuery({ queryKey: ['day-book', 'pending-bills'], queryFn: async () => (await getPendingAsSales()).length, enabled: isToday, refetchInterval: 15_000 });
  const pending = isToday ? pendingQ.data ?? 0 : 0;

  const branch = shopId
    ? shops.find((s) => s.id === shopId)?.name ?? tr('Branch')
    : allShops ? tr('Sab branches') : shops.find((s) => s.id === activeShop)?.name ?? assignedShop ?? tenantName ?? '';
  const branchLine = [tenantName, branch].filter((x, i, a) => x && a.indexOf(x) === i).join(' · ');
  const term = search.trim().toLowerCase();

  const setTab = (t: Tab) => { setTabState(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* private window */ } };
  const go = (days: number) => {
    const next = shiftKey(key, days);
    if (next > today) return;
    setDate(next === today ? undefined : next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 't' || e.key === 'T') setDate(undefined);
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (/^[1-6]$/.test(e.key)) setTab(TABS[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const share = () => { if (d) window.open(`https://wa.me/?text=${encodeURIComponent(dayText(d, m, branchLine))}`, '_blank', 'noopener'); };
  const copy = async () => {
    if (!d) return;
    try { await navigator.clipboard.writeText(dayText(d, m, branchLine)); toast.success(tr('Hisaab copy ho gaya')); } catch { toast.error(tr('Copy nahi hua')); }
  };

  const s = d?.summary;
  const moneyIn = d ? d.payments.reduce((a, p) => a + p.total, 0) + d.khata.collected : 0;
  const dayTitle = key === today ? tr('Aaj') : key === shiftKey(today, -1) ? tr('Kal') : new Intl.DateTimeFormat('en-PK', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${key}T12:00:00`));

  return (
    <PageShell>
      {guide.isOpen && <DayGuide onClose={guide.close} />}
      {staff && <StaffBills date={key} staffId={staff.id} name={staff.name} m={m} onClose={() => setStaff(null)} />}
      {closing && d && (
        <Modal open onClose={() => setClosing(false)} size="md" title={tr('Din band karein')} description={`${prettyDay(d.date)} · ${branch}`}
          footer={<>
            <Button variant="ghost" onClick={() => setClosing(false)}>{tr('Baad me')}</Button>
            <PrintButton doc={() => zReportDoc(d, m, branchLine)} label={tr('Z report')} />
          </>}>
          <CloseChecklist d={d} m={m} pending={pending} plain onTab={(t) => { setClosing(false); setTab(t); }} />
        </Modal>
      )}

      <PageHero
        title={tr('Din ka hisaab')}
        chip={<><CalendarDays />{dayTitle}{d?.isToday ? tr(' · live') : ''}</>}
        busy={q.isFetching}
        meta={`${prettyDay(key)} · ${branch}`}
        loading={q.isLoading || !s}
        actions={<>
          <PrivacyToggle compact />
          <button type="button" onClick={share} disabled={!d} title={tr('WhatsApp par bhejein')} aria-label={tr('WhatsApp par bhejein')} className={heroIconButton}><MessageCircle className="h-4 w-4" /></button>
          <button type="button" onClick={() => void copy()} disabled={!d} title={tr('Copy karein')} aria-label={tr('Copy karein')} className={heroIconButton}><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={() => d && itemsCsv(d, branchLine, costHidden)} disabled={!d} className={heroButton}><FileDown className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => zReportDoc(d!, m, branchLine)} disabled={!d} label={tr('Z report')} /></span>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => dayBookDoc(d!, m, branchLine)} disabled={!d} label={tr('Poori kitaab')} /></span>
          <button type="button" onClick={() => setClosing(true)} disabled={!d} className={heroPrimaryButton}><ClipboardCheck className="h-4 w-4" />{tr('Din band karein')}</button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} aria-label={tr('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={s && d ? [
          { label: tr('Net sale · {{bills}} bill', { bills: s.bills }), value: m.sales(s.net), hint: <span className="text-white/80">{tr('kal se')}{' '} <Delta now={s.net} before={d.compare.yesterday.net} className="!text-white" /></span> },
          { label: tr('Paisa aaya'), value: m.sales(moneyIn), hint: tr('har tareeqa') },
          { label: tr('Profit'), value: m.cost(s.grossProfit), hint: costHidden ? tr('Cost lock') : `${(s.margin ?? 0).toFixed(1)}%` },
          d.drawer
            ? { label: d.drawer.counted != null ? tr('Galla farq') : tr('Galla hona chahiye'), value: m.sales(d.drawer.counted != null ? d.drawer.difference : d.drawer.expected), hint: d.drawer.openNow ? tr('{{openNow}} khula', { openNow: d.drawer.openNow }) : d.drawer.registers.length ? tr('sab band') : tr('register nahi') }
            : { label: tr('Galla'), value: 'Chhupa', hint: tr('malik ne staff se chhupaya') },
          { label: tr('Ausat bill'), value: m.sales(s.avgBill), hint: tr('{{value}} cheezein', { value: Number(s.itemsSold.toFixed(2)) }) },
        ] : [{ label: tr('Net sale'), value: '' }, { label: tr('Paisa aaya'), value: '' }, { label: tr('Profit'), value: '' }, { label: tr('Galla'), value: '' }]}
      />

      <KpiRow>
        {!s || !d ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Percent} color="#db2777" label={tr('Discount')} value={m.sales(s.discount)} hint={tr('{{bills}} bill{{value}}', { bills: d.discounts.bills, value: s.subtotal ? ` · ${((s.discount / s.subtotal) * 100).toFixed(1)}%` : '' })} onClick={() => setTab('checks')} />
            <KpiCard icon={RotateCcw} color="#ea580c" label={tr('Return')} value={m.sales(s.returns)} hint={tr('{{returnCount}} dafa · {{voidedBills}} void', { returnCount: s.returnCount, voidedBills: s.voidedBills })} onClick={() => setTab('checks')} />
            <KpiCard icon={BookOpen} color="#d97706" label={tr('Udhaar diya')} value={m.sales(d.khata.given)} hint={tr('wasool {{collected}}', { collected: m.sales(d.khata.collected) })} onClick={() => setTab('money')} />
            <KpiCard icon={ShoppingBag} color="#e11d48" label={tr('Expense')} value={m.cost(d.expenses.total)} hint={tr('{{count}} · purchase {{total}}', { count: d.expenses.count, total: m.cost(d.purchases.total) })} onClick={() => setTab('money')} />
            <KpiCard icon={UserRound} color="#0891b2" label={tr('Customer')} value={String(s.customers)} hint={tr('{{walkIns}} walk-in bill · bara bill {{biggestBill}}', { walkIns: s.walkIns, biggestBill: m.sales(s.biggestBill) })} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Item, bill, customer, expense ya staff search…')} label={tr('Din ke hisaab me search')} />}
        chips={shopId || term ? <>
          {shopId && <FilterChip onRemove={() => setShopId('')}>{branch}</FilterChip>}
          {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setShopId(''); setSearch(''); }}>
        <div className="inline-flex h-10 items-center rounded-full bg-white ring-1 ring-slate-200">
          <button type="button" onClick={() => go(-1)} title={tr('Pichhla din (←)')} aria-label={tr('Pichhla din')} className="flex h-10 w-10 items-center justify-center rounded-s-full text-slate-600 hover:bg-slate-100"><ChevronLeft className="h-4 w-4 rtl-flip" /></button>
          <label className="relative flex h-10 items-center gap-1.5 px-2 text-[0.8125rem] font-semibold text-slate-800">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="tabular-nums">{key}</span>
            <input type="date" value={key} max={today} aria-label={tr('Date chunein')}
              onChange={(e) => e.target.value && setDate(e.target.value >= today ? undefined : e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0" />
          </label>
          <button type="button" onClick={() => go(1)} disabled={isToday} title={tr('Agla din (→)')} aria-label={tr('Agla din')} className="flex h-10 w-10 items-center justify-center rounded-e-full text-slate-600 hover:bg-slate-100 disabled:opacity-30"><ChevronRight className="h-4 w-4 rtl-flip" /></button>
        </div>
        <FilterMenu icon={CalendarDays} label={tr('Jaldi')} value={key === today ? 'today' : key === shiftKey(today, -1) ? 'yesterday' : key === shiftKey(today, -7) ? 'week' : 'other'}
          options={[
            { value: 'today', label: tr('Aaj') }, { value: 'yesterday', label: tr('Kal') },
            { value: 'week', label: tr('Pichhle hafte ka yehi din') }, { value: 'other', label: tr('Koi aur din'), hint: tr('Date par dabayein') },
          ]}
          onChange={(v) => { if (v === 'today') setDate(undefined); else if (v === 'yesterday') setDate(shiftKey(today, -1)); else if (v === 'week') setDate(shiftKey(today, -7)); }} />
        {allShops && shops.length > 1 && (
          <FilterMenu icon={Store} label={tr('Branch')} value={shopId} active={!!shopId} onChange={setShopId}
            options={[{ value: '', label: tr('Sab branches') }, ...shops.map((x) => ({ value: x.id, label: x.name }))]} />
        )}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>1</Kbd>–<Kbd>6</Kbd> {' '}{tr('se badlein ·')}{' '} <Kbd>←</Kbd><Kbd>→</Kbd> {' '}{tr('din')}</>}
        tabs={[
          { id: 'overview', label: tr('Khulasa'), icon: BarChart3 },
          ...(d && !d.drawer ? [] : [{ id: 'cash' as const, label: tr('Galla'), icon: Vault, count: d?.drawer ? d.drawer.registers.length : null }]),
          { id: 'money', label: tr('Paisa'), icon: Wallet },
          { id: 'items', label: tr('Maal'), icon: Package, count: d ? d.items.length : null },
          { id: 'staff', label: tr('Staff'), icon: UserRound, count: d ? d.staff.length : null },
          { id: 'checks', label: tr('Jaanch'), icon: Ban, count: d ? d.voids.length + d.returns.length : null },
        ]} />

      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
      ) : q.isError || !d ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-lg"><ListChecks className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{tr('Hisaab load nahi hua')}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{tr('Internet check karein aur dobara koshish karein')}</p>
          <div className="mt-4"><Button onClick={() => void q.refetch()}>{tr('Dobara koshish')}</Button></div>
        </div>
      ) : (
        <div className={cn('transition-opacity', stale && 'pointer-events-none opacity-60')}>
          {!d.summary.bills && !d.drawer?.registers.length && !d.expenses.count && !d.purchases.count && (
            <p className="mb-4 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] font-medium text-sky-800 ring-1 ring-sky-100">
              {tr('Is din koi sale, register ya expense nahi hua.')}{' '} <button type="button" onClick={() => go(-1)} className="font-semibold underline">{tr('Pichhla din dekhein')}</button>
            </p>
          )}
          {tab === 'overview' && <OverviewView d={d} m={m} pending={pending} onTab={setTab} onStaff={(id, name) => setStaff({ id, name })} />}
          {tab === 'cash' && d.drawer && <CashView d={d} m={m} dr={d.drawer} />}
          {tab === 'money' && <MoneyView d={d} m={m} q={term} />}
          {tab === 'items' && <ItemsView d={d} m={m} q={term} />}
          {tab === 'staff' && <StaffView d={d} m={m} q={term} onStaff={(id, name) => setStaff({ id, name })} />}
          {tab === 'checks' && <ChecksView d={d} m={m} q={term} />}
        </div>
      )}
    </PageShell>
  );
}

function DayGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide title={tr('Din ka hisaab — aasaan tareeqa')} onClose={onClose}
      steps={[
        { icon: CalendarDays, color: '#2563eb', title: tr('Din chunein'), text: tr('Teer se pichhla ya agla din, date par dabayein to koi bhi din. Owner branch bhi chun sakta hai.') },
        { icon: BarChart3, color: '#7c3aed', title: tr('Khulasa dekhein'), text: tr('Net sale, ghante war rush, kal aur pichhle hafte se muqabla, aur kya sab se zyada bika.') },
        { icon: Vault, color: '#16a34a', title: tr('Galla milayein'), text: tr('Har register: opening, kitna hona chahiye, kitna gina, aur kam ya zyada. Cash in/out bhi yahin.') },
        { icon: Wallet, color: '#0891b2', title: tr('Paisa aaya, paisa gaya'), text: tr('Cash, card, wallet, khata wasooli, booking advance — aur expense, purchase, supplier ko payment.') },
        { icon: Ban, color: '#e11d48', title: tr('Jaanch karein'), text: tr('Void bill, return aur discount — kis ne kiya aur kyun. Galti ya ghalat istemal yahin pakra jata hai.') },
        { icon: Printer, color: '#d97706', title: tr('Din band karein'), text: tr('Checklist poori karein, phir Z report thermal par ya poori kitaab A4/PDF par nikaal lein.') },
      ]}
      tips={[
        tr('Net sale = bill ki amount − us din ki return. Void bill shamil nahi.'),
        tr('Cash sale me se customer ko wapas di gayi rezgari pehle hi nikli hui hai.'),
        tr('Cost aur profit sirf unhein dikhte hain jin ke paas cost dekhne ki permission hai.'),
      ]}
      shortcuts={[['←', tr('pichhla din')], ['→', tr('agla din')], ['T', tr('aaj')], ['1–6', tr('tab')], ['/', tr('dhoondein')], ['G', tr('guide')]]}
      footer={<span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Keyboard className="h-3.5 w-3.5" />{tr('Shortcut tab chalte hain jab kuch type na ho raha ho')}</span>} />
  );
}
