/**
 * Stock adjustments for every industry: stock in or out by hand, damaged and
 * lost goods, physical counts, and the record of all of it with value in
 * rupees. Filters by period, type, reason and search, a page at a time from
 * the server; lines saved together are shown together. Analytics shows
 * where stock went.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpCircle, BarChart3, ClipboardCheck, Filter, GraduationCap, Layers, ListChecks, MessageSquareText, PackageSearch, Plus,
  ShieldAlert, SlidersHorizontal, Store,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { stockAdjustmentsApi, type AdjustmentQuery, type AdjustmentType, type StockAdjustment } from '../api/stock-adjustments.api';
import { AdjustmentAnalytics } from '../components/AdjustmentAnalytics';
import { AdjustmentForm } from '../components/AdjustmentForm';
import { StockCountPanel } from '../components/StockCountPanel';
import { ADJ_KEY, TYPES, TYPE_ORDER, when } from '../components/meta';
import { adjustmentsDoc, itemLabel, qtyLabel } from '../components/print';

type TypeFilter = 'all' | AdjustmentType;

export default function StockAdjustmentsPage() {
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [type, setType] = useState<TypeFilter>('all');
  const [reason, setReason] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'record' | 'analytics'>('record');
  const [form, setForm] = useState<'new' | 'count' | null>(null);
  const guide = usePageGuide();

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, type, reason, query]);

  const period = resolveRange(range, startHour);
  const filters: Omit<AdjustmentQuery, 'page' | 'limit'> = { ...(period ?? {}), type, reason: reason || undefined, search: query || undefined };
  const q: AdjustmentQuery = { ...filters, page, limit: 30 };
  const listQ = useQuery({ queryKey: [ADJ_KEY, 'list', q], queryFn: () => stockAdjustmentsApi.list(q), placeholderData: (prev) => prev });
  const reasonsQ = useQuery({ queryKey: [ADJ_KEY, 'reasons'], queryFn: stockAdjustmentsApi.reasons, staleTime: 5 * 60_000 });
  const data = listQ.data;
  const t = data?.totals;
  const lost = t ? t.outValue + t.damageValue + t.lossValue : 0;
  const filtered = type !== 'all' || !!reason || !!query;

  const filterText = [type !== 'all' && TYPES[type].label, reason, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => adjustmentsDoc(await stockAdjustmentsApi.list({ ...filters, page: 1, limit: 200 }), period ? `${period.from} — ${period.to}` : 'Sab tareekhen', filterText);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setForm('new'); }
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setForm('count'); }
      if (e.key === '/') { e.preventDefault(); setTab('record'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clear = () => { setType('all'); setReason(''); setSearch(''); };
  const groups = groupByRef(data?.items ?? []);

  const toggleType = (k: AdjustmentType) => setType((v) => (v === k ? 'all' : k));

  return (
    <PageShell>
      <PageHero
        title="Stock adjustments"
        chip={<><SlidersHorizontal /> Stock ki durusti</>}
        meta="Kam, zyada, kharab, gum aur ginti — sab ka hisaab"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button type="button" onClick={() => setForm('count')} title="Stock ginti (C)" className={heroButton}><ClipboardCheck className="h-4 w-4" /> Stock ginti</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setForm('new')} title="Naya adjustment (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya adjustment</button>
        </>}
        stats={t ? [
          { label: 'Is muddat me', value: t.count, hint: 'adjustment' },
          { label: 'Stock barha', value: money(t.inValue) },
          { label: 'Stock ghata', value: money(lost), hint: t.damageValue + t.lossValue > 0 ? `kharab/gum ${money(t.damageValue + t.lossValue)}` : undefined },
          { label: 'Kul farq', value: `${t.net >= 0 ? '+' : '−'}${money(Math.abs(t.net))}` },
        ] : [{ label: 'Is muddat me', value: '—' }]}
      />

      {/* Value per type; a card toggles its type filter */}
      <KpiRow cols={4}>
        {!t ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : TYPE_ORDER.map((k) => (
          <KpiCard key={k} icon={TYPES[k].icon} color={TYPES[k].color} label={TYPES[k].label}
            value={money(k === 'ADJUSTMENT_IN' ? t.inValue : k === 'ADJUSTMENT_OUT' ? t.outValue : k === 'DAMAGE' ? t.damageValue : t.lossValue)}
            hint={type === k ? 'Filter laga · dobara dabayein' : 'dabayein'} onClick={() => toggleType(k)} active={type === k} />
        ))}
      </KpiRow>

      {/* Filters */}
      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product, SKU, wajah ya note…" label="Dhoondein" />}
        chips={filtered ? <>
          {type !== 'all' && <FilterChip onRemove={() => setType('all')}>{TYPES[type].label}</FilterChip>}
          {reason && <FilterChip onRemove={() => setReason('')}>{reason}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Filter} label="Qism" value={type} active={type !== 'all'} onChange={setType}
          options={[{ value: 'all', label: 'Sab' }, ...TYPE_ORDER.map((k) => ({ value: k, label: TYPES[k].label, icon: TYPES[k].icon, color: TYPES[k].color }))]} />
        <FilterMenu icon={MessageSquareText} label="Wajah" value={reason} active={!!reason} onChange={setReason} width="w-72" align="right"
          options={[{ value: '', label: 'Sab wajah' }, ...(reasonsQ.data ?? []).map((r) => ({ value: r, label: r }))]} />
      </FilterBar>

      {/* Tabs */}
      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>N</Kbd> naya · <Kbd>C</Kbd> ginti · <Kbd>/</Kbd> dhoondein</>}
        tabs={[{ id: 'record', label: 'Record', icon: ListChecks, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <AdjustmentAnalytics filters={filters} money={money} /> : (<>
        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[4.5rem] rounded-xl" />)}</div>
        ) : !groups.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi adjustment nahi' : 'Is muddat me koi adjustment nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">Maal toota, gum hua ya ginti me farq nikla? Yahan likhein taake stock aur hisaab sahi rahe.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => setForm('new')} leftIcon={<Plus className="h-4 w-4" />}>Naya adjustment</Button>
              <Button variant="secondary" onClick={() => setForm('count')} leftIcon={<ClipboardCheck className="h-4 w-4" />}>Stock ginti karein</Button>
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => <Group key={g[0].id} rows={g} money={money} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {form === 'new' && <AdjustmentForm onClose={() => setForm(null)} />}
      {form === 'count' && <StockCountPanel onClose={() => setForm(null)} />}

      {guide.isOpen && (
        <PageGuide title="Stock adjustment — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ArrowUpCircle, color: '#16a34a', title: 'Barhayein ya kam karein', text: '"Naya adjustment" dabayein, product dhoondein ya scan karein. Shelf par zyada nikla to "Stock barhayein", kam hai ya apne kaam me liya to "Kam karein".' },
            { icon: ShieldAlert, color: '#e11d48', title: 'Kharab aur gum', text: 'Toota, expiry ya kharab maal "Kharab" me, chori ya gum "Gum" me likhein. Dono stock kam karte hain aur nuqsan ki report me aate hain.' },
            { icon: ClipboardCheck, color: '#2563eb', title: 'Stock ginti', text: '"Stock ginti" me shelf ka maal gin kar likhein. System aur ginti ka farq khud barhaya ya kam kiya jata hai — save se pehle khulasa dikhta hai.' },
            { icon: MessageSquareText, color: '#7c3aed', title: 'Wajah zaroor likhein', text: 'Har adjustment ki wajah zaroori hai. Neeche wale chips se jaldi chunein — Analytics me dikhta hai kis wajah se kitna maal gaya.' },
            { icon: Layers, color: '#d97706', title: 'Carton, qismein, roll, IMEI', text: 'Carton ya box chun kar likhein, stock khud pieces me badalta hai. Qismon wale product me qism, carpet me roll, mobile me device (IMEI) chunna hota hai.' },
            { icon: Store, color: '#0891b2', title: 'Branch ka usool', text: 'Adjustment hamesha khuli branch ka hota hai. "Sab branches" par pehle branch chunein. Staff sirf apni branch ka stock badal sakta hai.' },
          ]}
          tips={[
            'Stock minus me nahi ja sakta, jab tak Settings > Inventory me minus stock ki ijazat na ho.',
            'Kai products ek sath save hon to un ka ek hi ref banta hai — record me woh ek sath dikhte hain.',
            'Raqam cost price se nikalti hai, is liye nuqsan rupay me sahi pata chalta hai.',
            'Print button se is filter ki poori list A4, PDF ya thermal par nikaalein.',
          ]}
          shortcuts={[['N', 'naya adjustment'], ['C', 'stock ginti'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

/** Consecutive lines saved together (same groupRef) form one group. */
function groupByRef(items: StockAdjustment[]) {
  const out: StockAdjustment[][] = [];
  for (const a of items) {
    const last = out[out.length - 1];
    if (last && a.groupRef && last[0].groupRef === a.groupRef) last.push(a);
    else out.push([a]);
  }
  return out;
}

function Group({ rows, money }: { rows: StockAdjustment[]; money: (n: number) => string }) {
  const head = rows[0];
  const many = rows.length > 1;
  const count = head.groupRef?.startsWith('CNT');
  const net = rows.reduce((s, a) => s + TYPES[a.type].sign * a.value, 0);
  const by = [when(head.createdAt), head.shop?.name, head.createdBy?.fullName].filter(Boolean).join(' · ');
  return (
    <li className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {many && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.75rem] sm:px-5">
          <span className={cn('rounded-full px-2 py-0.5 font-semibold ring-1', count ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-white text-slate-700 ring-slate-200')}>
            {count ? 'Stock ginti' : 'Ek sath'} · {rows.length} line
          </span>
          <span className="font-mono text-slate-400">{head.groupRef}</span>
          <span className="text-slate-500">{by}</span>
          <span className={cn('ml-auto font-semibold tabular-nums', net >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{net >= 0 ? '+' : '−'}{money(Math.abs(net))}</span>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {rows.map((a) => <Line key={a.id} a={a} money={money} showMeta={!many} />)}
      </ul>
    </li>
  );
}

function Line({ a, money, showMeta }: { a: StockAdjustment; money: (n: number) => string; showMeta: boolean }) {
  const m = TYPES[a.type];
  const meta = [when(a.createdAt), a.shop?.name, a.createdBy?.fullName].filter(Boolean).join(' · ');
  const counted = a.countedQty !== null && a.countedQty !== undefined && a.systemQty !== null && a.systemQty !== undefined;
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap sm:px-4">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1', m.tone)}><m.icon className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-slate-900">{itemLabel(a)}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', m.tone)}>{m.label}</span>
          {a.variant?.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: a.variant.colorHex }} />}
        </div>
        <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">
          {a.reason}{counted ? ` · gina ${a.countedQty}, system ${a.systemQty}` : a.note ? ` — ${a.note}` : ''}
        </p>
        {showMeta && <p className="mt-0.5 text-[0.75rem] text-slate-400">{meta}{a.groupRef ? <span className="ml-1.5 font-mono">{a.groupRef}</span> : null}</p>}
      </div>
      <div className="ml-auto text-right">
        <p className={cn('text-base font-bold tabular-nums', m.sign > 0 ? 'text-emerald-700' : 'text-rose-700')}>{qtyLabel(a)}</p>
        <p className="text-[0.75rem] tabular-nums text-slate-500">{money(a.value)}</p>
      </div>
    </li>
  );
}
