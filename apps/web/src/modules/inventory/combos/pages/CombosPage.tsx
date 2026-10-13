/**
 * Combos for every industry: products sold together at one price. Each card
 * shows the price, the customer's saving, how many can be made from this
 * branch's stock, profit, and how many sold in the chosen period. Filters by
 * status and a few quick states, sorts, prints, and has an Analytics tab.
 * Keys: N new · / search · A analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowUpDown, BarChart3, Boxes, CalendarClock, Filter, Gift, GraduationCap, LayoutGrid, Pencil, Percent, Plus, Power,
  Printer, ScanLine, ShoppingBag, Sparkles, Star, Store, Trash2, TrendingDown,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, usePrinter } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { combosApi, type ComboStatus, type ProductCombo } from '../api/combos.api';
import { ComboAnalytics } from '../components/ComboAnalytics';
import { COMBO_KEY, COMBO_KEYS, STATUS, STATUS_ORDER, dayText, partQty, qtyText, useBranchName } from '../components/meta';
import { comboSheet, combosDoc } from '../components/print';

type StatusFilter = 'all' | ComboStatus;
type Quick = '' | 'low' | 'expired' | 'featured' | 'loss';
type Sort = 'featured' | 'sold' | 'revenue' | 'saving' | 'profit' | 'name' | 'newest';

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: 'featured', label: 'Featured pehle' },
  { value: 'sold', label: 'Sab se zyada bike' },
  { value: 'revenue', label: 'Sab se zyada kamai' },
  { value: 'saving', label: 'Sab se zyada bachat' },
  { value: 'profit', label: 'Sab se zyada profit' },
  { value: 'name', label: 'Naam A-Z' },
  { value: 'newest', label: 'Naye pehle' },
];

const QUICK_LABEL: Record<Exclude<Quick, ''>, string> = { low: 'Khatam hone wale', expired: 'Period khatam', featured: 'Featured', loss: 'Nuqsan wale' };

export default function CombosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const { sales: money, cost, costHidden } = useMasked();
  const branch = useBranchName();
  const { print } = usePrinter();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [status, setStatus] = useState<StatusFilter>('all');
  const [quick, setQuick] = useState<Quick>('');
  const [sort, setSort] = useState<Sort>('featured');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [confirm, setConfirm] = useState<ProductCombo | null>(null);

  const period = resolveRange(range, startHour) ?? undefined;
  const listQ = useQuery({ queryKey: [COMBO_KEY, 'list'], queryFn: () => combosApi.list() });
  const salesQ = useQuery({ queryKey: [COMBO_KEY, 'analytics', period ?? {}], queryFn: () => combosApi.analytics(period ?? {}), placeholderData: (p) => p });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const soldBy = useMemo(() => new Map((salesQ.data?.byCombo ?? []).filter((r) => r.id).map((r) => [r.id!, r])), [salesQ.data]);

  const invalidate = () => COMBO_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const onError = (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || 'Kaam nahi hua');
  const featureM = useMutation({ mutationFn: (id: string) => combosApi.toggleFeatured(id), onSuccess: (c) => { invalidate(); toast.success(c.isFeatured ? 'Featured bana diya' : 'Featured se hata diya'); }, onError });
  const statusM = useMutation({
    mutationFn: ({ id, next }: { id: string; next: ComboStatus }) => combosApi.update(id, { status: next }),
    onSuccess: (c) => { invalidate(); toast.success(c.status === 'ACTIVE' ? `${c.name} chalu — POS par dikhega` : `${c.name} band — POS se hat gaya`); },
    onError,
  });
  const removeM = useMutation({ mutationFn: (id: string) => combosApi.remove(id), onSuccess: () => { invalidate(); setConfirm(null); toast.success('Combo mita diya'); }, onError });

  const q = search.trim().toLowerCase();
  const list = useMemo(() => {
    const out = all.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (quick === 'low' && !(c.sellable && (c.available ?? 0) <= 3)) return false;
      if (quick === 'expired' && !c.expired) return false;
      if (quick === 'featured' && !c.isFeatured) return false;
      if (quick === 'loss' && !((c.profit ?? 0) < 0)) return false;
      if (q) {
        const hay = [c.name, c.sku, c.barcode, c.tagLine, c.category?.name, ...c.items.map((i) => i.product?.name)].filter(Boolean).join(' ').toLowerCase();
        if (!q.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const sold = (c: ProductCombo) => soldBy.get(c.id);
    const by: Record<Sort, (a: ProductCombo, b: ProductCombo) => number> = {
      featured: () => 0,
      sold: (a, b) => (sold(b)?.count ?? 0) - (sold(a)?.count ?? 0),
      revenue: (a, b) => (sold(b)?.revenue ?? 0) - (sold(a)?.revenue ?? 0),
      saving: (a, b) => b.savingsPercentage - a.savingsPercentage,
      profit: (a, b) => (b.profit ?? 0) - (a.profit ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return sort === 'featured' ? out : [...out].sort(by[sort]);
  }, [all, status, quick, q, sort, soldBy]);

  const counts = useMemo(() => ({
    live: all.filter((c) => c.sellable).length,
    low: all.filter((c) => c.sellable && (c.available ?? 0) <= 3).length,
    expired: all.filter((c) => c.expired).length,
    featured: all.filter((c) => c.isFeatured).length,
    loss: all.filter((c) => (c.profit ?? 0) < 0).length,
    status: Object.fromEntries(STATUS_ORDER.map((s) => [s, all.filter((c) => c.status === s).length])) as Record<ComboStatus, number>,
  }), [all]);

  const filtered = status !== 'all' || !!quick || !!q;
  const clear = () => { setStatus('all'); setQuick(''); setSearch(''); };
  const filterText = [status !== 'all' && STATUS[status].label, quick && QUICK_LABEL[quick], q && `"${search.trim()}"`].filter(Boolean).join(' · ');
  const st = salesQ.data?.totals;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigate('/combos/new'); }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setTab((t) => (t === 'analytics' ? 'list' : 'analytics')); }
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <PageShell>
      <PageHero
        title="Combos"
        chip={<><Gift /> Deals aur bundles</>}
        meta={`Kai cheezein ek qeemat par · stock ${branch}`}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => combosDoc(list, filterText, !costHidden, branch)} disabled={!list.length} /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/combos/new" title="Naya combo (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya combo</Link>
        </>}
        stats={[
          { label: 'Chalu combos', value: counts.live, hint: `kul ${all.length}` },
          { label: 'Is period me bike', value: st ? qtyText(st.sold) : '—', hint: st ? `${st.bills} bill` : undefined },
          { label: 'Combo se kamai', value: st ? money(st.revenue) : '—' },
          { label: 'Profit', value: st ? cost(st.profit) : '—', hint: st && st.revenue > 0 && !costHidden ? `${Math.round(st.margin)}%` : undefined },
        ]}
      />

      <KpiRow cols={costHidden ? 4 : 5}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Power} color="#16a34a" label="Chalu" value={counts.status.ACTIVE} hint={status === 'ACTIVE' ? 'Filter laga · dobara dabayein' : 'POS par dikhte hain'}
            onClick={() => setStatus((s) => (s === 'ACTIVE' ? 'all' : 'ACTIVE'))} active={status === 'ACTIVE'} />
          <KpiCard icon={AlertTriangle} color="#d97706" label="Khatam hone wale" value={counts.low} hint="3 ya kam ban sakte" onClick={() => setQuick((v) => (v === 'low' ? '' : 'low'))} active={quick === 'low'} />
          <KpiCard icon={CalendarClock} color="#e11d48" label="Period khatam" value={counts.expired} hint="Date guzar gayi" onClick={() => setQuick((v) => (v === 'expired' ? '' : 'expired'))} active={quick === 'expired'} />
          <KpiCard icon={Star} color="#f59e0b" label="Featured" value={counts.featured} hint="POS par sab se upar" onClick={() => setQuick((v) => (v === 'featured' ? '' : 'featured'))} active={quick === 'featured'} />
          {!costHidden && <KpiCard icon={TrendingDown} color="#be123c" label="Nuqsan wale" value={counts.loss} hint="Qeemat cost se kam" onClick={() => setQuick((v) => (v === 'loss' ? '' : 'loss'))} active={quick === 'loss'} />}
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Combo, barcode ya andar ki cheez…" label="Search" />}
        chips={filtered ? <>
          {status !== 'all' && <FilterChip onRemove={() => setStatus('all')}>{STATUS[status].label}</FilterChip>}
          {quick && <FilterChip onRemove={() => setQuick('')}>{QUICK_LABEL[quick]}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} label="Sale ki period" />
        <FilterMenu icon={Filter} label="Haal" value={status} active={status !== 'all'} onChange={setStatus}
          options={[{ value: 'all', label: 'Sab', hint: String(all.length) }, ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s].label, icon: STATUS[s].icon, color: STATUS[s].color, hint: String(counts.status[s]) }))]} />
        <FilterMenu icon={ArrowUpDown} label="Sort" value={sort} active={sort !== 'featured'} onChange={setSort} align="right"
          options={SORTS.filter((s) => !(costHidden && s.value === 'profit'))} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>N</Kbd> naya · <Kbd>A</Kbd> analytics · <Kbd>/</Kbd> search</>}
        tabs={[{ id: 'list', label: 'Combos', icon: LayoutGrid, count: listQ.data ? list.length : null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <ComboAnalytics range={period ?? {}} money={money} cost={cost} /> : listQ.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}</div>
      ) : !list.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <Gift className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi combo nahi' : 'Abhi koi combo nahi'}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Do ya zyada cheezein mila kar ek qeemat par bechein — customer ko bachat, aap ki sale zyada. POS par "Combos" tab me dikhte hain.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => navigate('/combos/new')} leftIcon={<Plus className="h-4 w-4" />}>Pehla combo banayein</Button>
            {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <ComboCard key={c.id} c={c} sold={soldBy.get(c.id)} money={money} cost={cost} costHidden={costHidden}
              busy={featureM.isPending || statusM.isPending}
              onFeature={() => featureM.mutate(c.id)}
              onStatus={() => statusM.mutate({ id: c.id, next: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}
              onPrint={() => void print(comboSheet(c, !costHidden, branch))}
              onDelete={() => setConfirm(c)} />
          ))}
        </ul>
      )}

      {confirm && (
        <Modal open onClose={() => setConfirm(null)} size="sm" title={`"${confirm.name}" mitayein?`}
          description="Combo POS se hat jayega. Purane bills par koi asar nahi — un me cheezein alag alag likhi hain."
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Rehne dein</Button>
            <Button variant="danger" loading={removeM.isPending} onClick={() => removeM.mutate(confirm.id)} leftIcon={<Trash2 className="h-4 w-4" />}>Mita dein</Button>
          </>}>
          <p className="text-sm text-slate-600">Sirf kuch der ke liye rokna ho to mitane ki bajaye <b>Band</b> kar dein — baad me dobara chalu ho sakta hai.</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Combos — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Combo banayein', text: '"Naya combo" dabayein, naam likhein, phir cheezein search ya scan karein. Har cheez ki quantity likhein — pack (dozen, carton) bhi chun sakte hain.' },
            { icon: Percent, color: '#2563eb', title: 'Qeemat aur bachat', text: 'Combo ki qeemat likhein. Form khud dikhata hai alag alag lene par kitna banta, customer ki bachat aur aap ka profit.' },
            { icon: Boxes, color: '#d97706', title: 'Stock se kitne ban sakte', text: 'Har combo par "ban sakte" likha hota hai — jo cheez sab se kam hai wohi had banati hai. Ye khuli branch ka stock hai.' },
            { icon: ShoppingBag, color: '#7c3aed', title: 'POS par bechna', text: 'Chalu combo POS ke "Combos" tab (F8) me aata hai. Bill me har cheez alag line banti hai aur stock har cheez ka apna ghatta hai.' },
            { icon: CalendarClock, color: '#e11d48', title: 'Period aur band', text: 'Eid ya sale ka combo? Shuru aur khatam ki date daalein — period ke bahar POS par nahi dikhta. Rokna ho to Band kar dein.' },
            { icon: BarChart3, color: '#0891b2', title: 'Analytics', text: 'Kaunsa combo zyada bikta hai, kitna profit, kis din, aur kaun se combos bilkul nahi bike — sab Analytics tab me.' },
          ]}
          tips={[
            'Barcode laga dein to POS par combo scan ho jata hai.',
            'Featured combo POS par sab se upar dikhta hai.',
            'Lal "nuqsan" ka matlab: combo ki qeemat cheezon ki cost se kam hai.',
            'Print se combos ki list ya ek combo ki sheet A4, PDF ya thermal par nikaalein.',
          ]}
          shortcuts={[['N', 'naya combo'], ['A', 'analytics'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ComboCard({ c, sold, money, cost, costHidden, busy, onFeature, onStatus, onPrint, onDelete }: {
  c: ProductCombo;
  sold?: { count: number; revenue: number };
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  busy: boolean;
  onFeature: () => void;
  onStatus: () => void;
  onPrint: () => void;
  onDelete: () => void;
}) {
  const s = STATUS[c.status];
  const avail = c.available ?? 0;
  const loss = (c.profit ?? 0) < 0;
  const image = c.imageUrl || c.items.find((i) => i.product?.images?.[0]?.url)?.product?.images?.[0]?.url;
  return (
    <li className={cn('flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80', !c.sellable && 'opacity-90')}>
      <div className="flex gap-3 p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100">
          {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Gift className="absolute inset-0 m-auto h-7 w-7 text-brand-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <Link to={`/combos/${c.id}/edit`} className="min-w-0 flex-1 truncate font-semibold text-slate-900 hover:text-brand-700">{c.name}</Link>
            <button type="button" onClick={onFeature} disabled={busy} title={c.isFeatured ? 'Featured se hatayein' : 'Featured banayein'} aria-label="Featured"
              className={cn('-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-amber-50', c.isFeatured ? 'text-amber-500' : 'text-slate-300')}>
              <Star className={cn('h-4 w-4', c.isFeatured && 'fill-current')} />
            </button>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', c.expired ? STATUS.EXPIRED.tone : s.tone)}>{c.expired ? 'Period khatam' : c.upcoming ? 'Abhi shuru nahi' : s.label}</span>
            {c.tagLine && <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-medium text-brand-800"><Sparkles className="h-3 w-3" />{c.tagLine}</span>}
            {c.barcode && <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-slate-400"><ScanLine className="h-3 w-3" />{c.barcode}</span>}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold tabular-nums text-slate-900">{formatPKR(c.comboPrice)}</span>
            {c.savingsAmount > 0 && <span className="text-[0.8125rem] tabular-nums text-slate-400 line-through">{formatPKR(c.originalTotal)}</span>}
            {c.savingsAmount > 0 && <span className="rounded-full bg-emerald-50 px-1.5 text-[0.6875rem] font-semibold text-emerald-700">−{Math.round(c.savingsPercentage)}%</span>}
          </div>
        </div>
      </div>

      <ul className="mx-4 space-y-1 rounded-2xl bg-slate-50 px-3 py-2 text-[0.8125rem]">
        {c.items.slice(0, 4).map((i, idx) => (
          <li key={i.id ?? idx} className="flex items-center justify-between gap-2">
            <span className={cn('min-w-0 truncate text-slate-700', i.inactive && 'text-rose-600 line-through')}>
              <span className="font-semibold tabular-nums text-slate-900">{partQty(i)}</span> {i.product?.name}{i.variant ? ` · ${i.variant.name}` : ''}
            </span>
            <span className={cn('shrink-0 text-[0.75rem] tabular-nums', (i.canMake ?? 0) <= 3 ? 'text-amber-700' : 'text-slate-400')} title="Is cheez ke stock se kitne combo">{i.canMake ?? '—'}</span>
          </li>
        ))}
        {c.items.length > 4 && <li className="text-[0.75rem] text-slate-500">aur {c.items.length - 4} cheezein…</li>}
      </ul>

      <dl className="grid grid-cols-3 gap-2 px-4 py-3 text-center">
        <Stat label="Ban sakte" value={c.sellable || c.status === 'ACTIVE' ? String(avail) : '—'} tone={avail === 0 ? 'rose' : avail <= 3 ? 'amber' : undefined}
          title={c.limitedBy === 'limit' ? 'Combo ki apni had' : c.limitedBy ? `${c.limitedBy} ki wajah se` : undefined} />
        <Stat label="Profit" value={costHidden ? '••••' : `${cost(c.profit ?? 0)}`} tone={loss ? 'rose' : 'emerald'} title={!costHidden && c.margin !== undefined ? `Margin ${Math.round(c.margin)}%` : undefined} />
        <Stat label="Is period bike" value={sold ? qtyText(sold.count) : '0'} title={sold ? money(sold.revenue) : undefined} />
      </dl>

      {(c.validFrom || c.validTo) && (
        <p className="-mt-1 px-4 pb-2 text-[0.75rem] text-slate-500"><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{c.validFrom ? dayText(c.validFrom) : '…'} — {c.validTo ? dayText(c.validTo) : '…'}</p>
      )}

      <div className="mt-auto flex items-center gap-1 border-t border-slate-100 px-2 py-1.5">
        <Link to={`/combos/${c.id}/edit`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" />Badlein</Link>
        <button type="button" onClick={onStatus} disabled={busy}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold hover:bg-slate-100', c.status === 'ACTIVE' ? 'text-amber-700' : 'text-emerald-700')}>
          <Power className="h-3.5 w-3.5" />{c.status === 'ACTIVE' ? 'Band karein' : 'Chalu karein'}
        </button>
        <span className="ml-auto" />
        <button type="button" onClick={onPrint} title="Is combo ki sheet print" aria-label="Print" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-4 w-4" /></button>
        <button type="button" onClick={onDelete} title="Mitayein" aria-label="Mitayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
      </div>
      {c.status === 'ACTIVE' && !c.sellable && !c.expired && !c.upcoming && (
        <p className="flex items-center gap-1.5 bg-rose-50 px-4 py-1.5 text-[0.75rem] text-rose-700"><Store className="h-3.5 w-3.5" />Koi cheez band hai — POS par nahi dikhega</p>
      )}
    </li>
  );
}

function Stat({ label, value, tone, title }: { label: string; value: string; tone?: 'rose' | 'amber' | 'emerald'; title?: string }) {
  return (
    <div title={title} className="min-w-0 rounded-xl px-1 py-1">
      <dt className="truncate text-[0.6875rem] text-slate-500">{label}</dt>
      <dd className={cn('truncate text-[0.9375rem] font-bold tabular-nums', tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900')}>{value}</dd>
    </div>
  );
}
