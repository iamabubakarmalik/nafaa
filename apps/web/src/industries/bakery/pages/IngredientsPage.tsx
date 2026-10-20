/**
 * Raw materials (flour, sugar, butter): store value, what is running low
 * and the shopping list for the supplier; the stock list with goods
 * received, waste and counted corrections; recipe costing at today's rates;
 * the movement record; and analytics of money spent, used and wasted.
 *
 * Keys: N new material · / search · 1 stock · 2 recipes · 3 record · 4 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownToLine, BarChart3, Boxes, ChevronDown, Copy, Eye, EyeOff, FileSpreadsheet, Filter, GraduationCap, History, ListChecks,
  MessageCircle, Pencil, Plus, Printer, Scale, Snowflake, Tags, Trash2, Truck, Wheat,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ingredientsApi, type Ingredient, type MovementKind } from '../api/ingredients.api';
import { HistoryModal, IngredientForm, RAW_CATEGORIES, StockModal, rawCategoryOf, type StockMode } from '../components/raw/IngredientModals';
import { MovementRecord, RawAnalytics } from '../components/raw/RawMovements';
import { RecipeCosting, useRecipes, type RecipeFilter } from '../components/raw/RecipeCosting';
import { LoadFailed } from '../components/charts';
import { RAW_KEY, apiError, downloadCsv, fmtQty, waLink } from '../components/meta';
import { useConfirm } from '../components/useConfirm';

type Tab = 'stock' | 'recipes' | 'record' | 'analytics';
type State = 'all' | 'low' | 'out' | 'critical' | 'fridge' | 'hidden';

const STATES: Array<{ id: State; label: string }> = [
  { id: 'all', label: 'Sab' }, { id: 'low', label: 'Kam ho gaya' }, { id: 'out', label: 'Khatam' },
  { id: 'critical', label: 'Zaroori' }, { id: 'fridge', label: 'Fridge wale' }, { id: 'hidden', label: 'Hataye hue' },
];

const levelOf = (i: Ingredient) => Number(i.reorderLevel ?? i.minStock ?? 0);
const isOut = (i: Ingredient) => Number(i.currentStock || 0) <= 0;
const isLow = (i: Ingredient) => !isOut(i) && Number(i.currentStock || 0) <= levelOf(i);
const shortOf = (i: Ingredient) => Math.max(levelOf(i) - Number(i.currentStock || 0), 0);

export default function IngredientsPage() {
  const [ask, confirmDialog] = useConfirm();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Bakery';
  const canManage = usePermission(PERMISSIONS.BAKERY_INGREDIENTS_MANAGE);
  const { cost, costHidden } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('stock');
  const [state, setState] = useState<State>('all');
  const [category, setCategory] = useState('');
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>('all');
  const [kind, setKind] = useState<'' | MovementKind>('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ item: Ingredient | null } | null>(params.get('new') === '1' ? { item: null } : null);
  const [stockOn, setStockOn] = useState<{ item: Ingredient; mode: StockMode } | null>(null);
  const [history, setHistory] = useState<Ingredient | null>(null);
  useEffect(() => { if (params.get('new') === '1') { const n = new URLSearchParams(params); n.delete('new'); setParams(n, { replace: true }); } }, [params, setParams]);

  const period = resolveRange(range, startHour);
  const listQ = useQuery({ queryKey: [RAW_KEY, 'list', state === 'hidden'], queryFn: () => ingredientsApi.list(state === 'hidden' ? { active: 'false' } : {}) });
  const recipesQ = useRecipes();
  const all = listQ.data ?? [];
  const live = state === 'hidden' ? all : all.filter((i) => i.isActive !== false);

  const stats = useMemo(() => {
    const active = (state === 'hidden' ? [] : live);
    const need = active.filter((i) => isLow(i) || isOut(i));
    return {
      total: active.length,
      value: active.reduce((s, i) => s + Math.max(Number(i.currentStock || 0), 0) * Number(i.costPerUnit || 0), 0),
      low: active.filter(isLow).length,
      out: active.filter(isOut).length,
      critical: active.filter((i) => i.isCritical && (isLow(i) || isOut(i))).length,
      orderCost: need.reduce((s, i) => s + (shortOf(i) || levelOf(i)) * Number(i.costPerUnit || 0), 0),
      need,
    };
  }, [live, state]);

  const t = search.trim().toLowerCase();
  const shown = useMemo(() => live
    .filter((i) => state === 'hidden' || state === 'all' || (state === 'low' ? isLow(i) : state === 'out' ? isOut(i) : state === 'critical' ? i.isCritical : i.requiresRefrigeration))
    .filter((i) => !category || i.category === category)
    .filter((i) => !t || [i.name, i.brand, i.supplierName, i.lastVendorName, i.code].some((v) => v?.toLowerCase().includes(t)))
    .sort((a, b) => Number(isOut(b)) - Number(isOut(a)) || Number(isLow(b)) - Number(isLow(a)) || Number(b.isCritical) - Number(a.isCritical) || a.name.localeCompare(b.name)),
  [live, state, category, t]);

  const orderText = [
    `🛒 *${shopName}* — saamaan ki list`, '',
    ...stats.need.map((i, n) => `${n + 1}. ${i.name} — ${fmtQty(shortOf(i) || levelOf(i) || 1)} ${i.unit}`),
  ].join('\n');
  const copyList = async () => { try { await navigator.clipboard.writeText(orderText); toast.success('List copy ho gayi'); } catch { toast.error('Copy nahi hui'); } };

  const restore = useMutation({
    mutationFn: (i: Ingredient) => (i.isActive === false ? ingredientsApi.update(i.id, { isActive: true }) : ingredientsApi.remove(i.id)),
    onSuccess: (i) => { toast.success(i.isActive ? `${i.name} wapas aa gaya` : `${i.name} hata diya — record rehta hai`); qc.invalidateQueries({ queryKey: [RAW_KEY] }); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setForm({ item: null }); }
      if (e.key === '1') setTab('stock');
      if (e.key === '2') setTab('recipes');
      if (e.key === '3') setTab('record');
      if (e.key === '4') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const printDoc = (): PrintDoc => (tab === 'stock' && state !== 'low' && state !== 'out' ? {
    title: 'Raw material — stock',
    meta: [['Cheezein', String(shown.length)], ...(costHidden ? [] : [['Qeemat', formatPKR(stats.value)] as [string, string]])],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Saamaan' }, { label: 'Type', wideOnly: true }, { label: 'Stock', align: 'right' }, { label: 'Had', align: 'right', wideOnly: true }, { label: 'Gin kar', align: 'right' }],
      rows: shown.map((i) => [i.name, rawCategoryOf(i.category).label, `${fmtQty(i.currentStock)} ${i.unit}`, fmtQty(levelOf(i)), '______']),
    }],
  } : {
    title: 'Saamaan mangwane ki list',
    meta: [['Cheezein', String(stats.need.length)], ...(costHidden ? [] : [['Andazan', formatPKR(stats.orderCost)] as [string, string]])],
    sections: [{
      kind: 'table',
      columns: [{ label: 'Saamaan' }, { label: 'Abhi', align: 'right' }, { label: 'Mangwana', align: 'right' }, { label: 'Supplier', wideOnly: true }],
      rows: stats.need.map((i) => [i.name, `${fmtQty(i.currentStock)} ${i.unit}`, `${fmtQty(shortOf(i) || levelOf(i))} ${i.unit}`, i.supplierName ?? '']),
    }],
  });

  const recipes = recipesQ.data?.totals;
  return (
    <PageShell>
      <PageHero
        title="Raw material"
        chip={<><Wheat /> Saamaan</>}
        meta="Maida, cheeni, makhan — kya para hai, kya mangwana hai, recipe ki cost"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!live.length} /></span>
          <button type="button" title="CSV" onClick={() => downloadCsv('saamaan', ['Naam', 'Type', 'Stock', 'Unit', 'Had', 'Rate', 'Supplier'], shown.map((i) => [i.name, rawCategoryOf(i.category).label, i.currentStock, i.unit, levelOf(i), costHidden ? '' : i.costPerUnit, i.supplierName]))} className={heroIconButton}><FileSpreadsheet className="h-4 w-4" /></button>
          <Link to="/purchases/new" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Supplier ka bill</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setForm({ item: null })} title="Naya saamaan (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya saamaan</button>}
        </>}
        stats={[
          { label: 'Gudaam ki qeemat', value: cost(stats.value), hint: `${stats.total} cheezein` },
          { label: 'Mangwana hai', value: stats.low + stats.out, hint: costHidden ? undefined : `andazan ${formatPKR(stats.orderCost)}` },
          { label: 'Recipes', value: recipes?.recipes ?? '—', hint: recipes?.lowMargin ? `${recipes.lowMargin} kam profit` : undefined },
        ]}
      />

      <KpiRow cols={5}>
        {listQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Boxes} color="#a16207" label="Gudaam ki qeemat" value={cost(stats.value)} hint={`${stats.total} cheezein`} onClick={() => { setTab('stock'); setState('all'); }} active={tab === 'stock' && state === 'all'} />
          <KpiCard icon={AlertTriangle} color="#d97706" label="Kam ho gaya" value={stats.low} hint="Had se neeche" onClick={() => { setTab('stock'); setState('low'); }} active={tab === 'stock' && state === 'low'} />
          <KpiCard icon={Trash2} color={stats.out ? '#e11d48' : '#64748b'} label="Khatam" value={stats.out} hint={stats.critical ? `${stats.critical} zaroori` : 'Stock 0'} onClick={() => { setTab('stock'); setState('out'); }} active={tab === 'stock' && state === 'out'} />
          <KpiCard icon={Tags} color="#7c3aed" label="Kam profit" value={recipes?.lowMargin ?? '—'} hint="Recipe 20% se kam" onClick={() => { setTab('recipes'); setRecipeFilter('low'); }} active={tab === 'recipes' && recipeFilter === 'low'} />
          <KpiCard icon={Scale} color="#0891b2" label="Cost ka farq" value={recipes?.costOff ?? '—'} hint="Product par purani cost" onClick={() => { setTab('recipes'); setRecipeFilter('off'); }} active={tab === 'recipes' && recipeFilter === 'off'} />
        </>}
      </KpiRow>

      {tab === 'stock' && stats.need.length > 0 && state !== 'hidden' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <p className="min-w-0 flex-1 text-[0.8125rem] text-amber-900"><b>{stats.need.length}</b> cheezein mangwani hain{costHidden ? '' : <> — andazan <b>{formatPKR(stats.orderCost)}</b></>}{stats.critical ? <span className="text-rose-700"> · {stats.critical} zaroori cheez</span> : null}</p>
          <Button size="sm" variant="secondary" onClick={copyList} leftIcon={<Copy className="h-4 w-4" />}>List copy</Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(orderText)}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-success-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-success-700"><MessageCircle className="h-4 w-4" />WhatsApp</a>
        </div>
      )}

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Is period me kitne ka saamaan aaya, laga aur waste hua</p>}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tab === 'recipes' ? 'Product ya saamaan…' : 'Saamaan, brand, supplier…'} label="Search" />}
          chips={tab === 'stock' && (state !== 'all' || category) ? <>
            {state !== 'all' && <FilterChip onRemove={() => setState('all')}>{STATES.find((s) => s.id === state)?.label}</FilterChip>}
            {category && <FilterChip onRemove={() => setCategory('')}>{rawCategoryOf(category).label}</FilterChip>}
          </> : undefined}
          onClear={() => { setState('all'); setCategory(''); setSearch(''); }}>
          {tab === 'stock' && <>
            <FilterMenu icon={Filter} label={STATES.find((s) => s.id === state)?.label ?? 'Haal'} value={state} active={state !== 'all'} onChange={setState} options={STATES.map((s) => ({ value: s.id, label: s.label, icon: s.id === 'hidden' ? EyeOff : s.id === 'fridge' ? Snowflake : undefined }))} />
            <FilterMenu icon={Tags} label="Type" value={category} active={!!category} onChange={setCategory} options={[{ value: '', label: 'Sab types' }, ...RAW_CATEGORIES.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))]} />
          </>}
          {tab === 'recipes' && (
            <FilterMenu icon={Filter} label={recipeFilter === 'low' ? 'Kam profit' : recipeFilter === 'off' ? 'Cost ka farq' : recipeFilter === 'missing' ? 'Saamaan gum' : 'Sab recipes'} value={recipeFilter} active={recipeFilter !== 'all'} onChange={setRecipeFilter}
              options={[{ value: 'all', label: 'Sab recipes' }, { value: 'low', label: 'Kam profit (20% se kam)' }, { value: 'off', label: 'Product par purani cost' }, { value: 'missing', label: 'Jin ka saamaan nahi mila' }]} />
          )}
          {tab === 'record' && <>
            <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
            <FilterMenu icon={Filter} label={kind ? ({ PURCHASE: 'Aaya', CONSUMPTION: 'Istemal', WASTE: 'Waste', ADJUSTMENT: 'Ginti' } as const)[kind] : 'Sab type'} value={kind} active={!!kind} onChange={setKind} align="right"
              options={[{ value: '', label: 'Sab' }, { value: 'PURCHASE', label: 'Maal aaya' }, { value: 'CONSUMPTION', label: 'Banane me laga' }, { value: 'WASTE', label: 'Waste' }, { value: 'ADJUSTMENT', label: 'Ginti ka farq' }]} />
          </>}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>4</Kbd> tabs</>}
        tabs={[
          { id: 'stock', label: 'Stock', icon: Boxes, count: tab === 'stock' ? shown.length : null },
          { id: 'recipes', label: 'Recipe aur cost', icon: Wheat, count: recipes?.recipes ?? null },
          { id: 'record', label: 'Record', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'recipes' ? <RecipeCosting search={search} filter={recipeFilter} />
        : tab === 'record' ? <MovementRecord range={period} type={kind || undefined} search={search} />
          : tab === 'analytics' ? <RawAnalytics range={period} items={live} />
            : listQ.isError && !listQ.data ? <LoadFailed what="Saamaan" retry={() => listQ.refetch()} />
              : listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
                : !shown.length ? (
                  <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
                    <Wheat className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 font-semibold text-slate-900">{t || state !== 'all' || category ? 'Is filter me kuch nahi' : 'Abhi koi saamaan nahi'}</p>
                    <p className="mt-1 text-sm text-slate-500">Maida, cheeni, makhan daalein — phir recipe me lag sakenge aur khatam hone par yaad dilaye ga.</p>
                    {canManage && <Button className="mt-4" onClick={() => setForm({ item: null })} leftIcon={<Plus className="h-4 w-4" />}>Naya saamaan</Button>}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                    {shown.map((i) => (
                      <RawRow key={i.id} i={i} canManage={canManage} usedIn={recipesQ.data?.usedIn[i.id] ?? 0}
                        onStock={(mode) => setStockOn({ item: i, mode })} onEdit={() => setForm({ item: i })} onHistory={() => setHistory(i)}
                        onToggle={async () => { if (i.isActive === false || (await ask({ title: `"${i.name}" list se hatayein?`, text: 'Record aur recipes rehti hain.', yes: 'Hatayein', danger: true }))) restore.mutate(i); }} />
                    ))}
                  </ul>
                )}

      {confirmDialog}
      {form && <IngredientForm item={form.item} onClose={() => setForm(null)} />}
      {stockOn && <StockModal item={stockOn.item} mode={stockOn.mode} onClose={() => setStockOn(null)} />}
      {history && <HistoryModal item={history} onClose={() => setHistory(null)} />}

      {guide.isOpen && (
        <PageGuide title="Raw material — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ArrowDownToLine, color: '#16a34a', title: 'Maal aaya', text: 'Supplier se saamaan aaye to "Maal aaya": kitna, kis rate par aur paisa kaise diya. Is ka supplier bill banta hai: diya hua paisa khareed me, udhaar supplier ke khate me jata hai.' },
            { icon: Wheat, color: '#a16207', title: 'Recipe aur cost', text: 'Har cheez ki recipe aaj ke rate se: ek piece ki cost, bechne ki qeemat aur profit. Rate badla to yahin pata chalta hai.' },
            { icon: Trash2, color: '#e11d48', title: 'Waste hua', text: 'Kharab ya gira hua saamaan wajah ke saath likhein — Freshness aur waste ke record me bhi aata hai.' },
            { icon: Scale, color: '#7c3aed', title: 'Gin kar theek', text: 'Mahine me ek baar gudaam gin kar yahan theek karein — farq wajah ke saath record me rehta hai.' },
            { icon: MessageCircle, color: '#22c55e', title: 'Mangwane ki list', text: 'Jo kam hai us ki list ek click me WhatsApp par. Har saamaan par supplier ka number ho to seedha us ko.' },
            { icon: Printer, color: '#0891b2', title: 'Print', text: '"Kam ho gaya" chun kar print karein to mangwane ki list, warna ginti ki sheet.' },
          ]}
          tips={[
            'Baking me "Recipe ka saamaan ghatayein" on karein to istemal khud likha jata hai.',
            'Kai cheezon ka ek bill ho to "Supplier ka bill" se purchase banayein.',
            'Saamaan sambhalne ke liye "Bakery saamaan sambhalna" ki permission chahiye.',
          ]}
          shortcuts={[['N', 'naya saamaan'], ['/', 'dhoondein'], ['1', 'stock'], ['2', 'recipe'], ['3', 'record'], ['4', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function RawRow({ i, canManage, usedIn, onStock, onEdit, onHistory, onToggle }: {
  i: Ingredient; canManage: boolean; usedIn: number;
  onStock: (mode: StockMode) => void; onEdit: () => void; onHistory: () => void; onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { cost } = useMasked();
  const out = isOut(i);
  const low = isLow(i);
  const cat = rawCategoryOf(i.category);
  const wa = i.supplierPhone ? waLink(i.supplierPhone, `Assalam o alaikum, ${i.name} chahiye — ${fmtQty(shortOf(i) || levelOf(i) || 1)} ${i.unit}`) : undefined;
  const hidden = i.isActive === false;
  return (
    <li className={cn(hidden && 'bg-slate-50/60')}>
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg', out ? 'bg-rose-50' : low ? 'bg-amber-50' : 'bg-slate-100')}>{cat.emoji}</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('truncate font-semibold', hidden ? 'text-slate-400' : 'text-slate-900')}>{i.name}</span>
            {i.isCritical && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200">Zaroori</span>}
            {i.requiresRefrigeration && <Snowflake className="h-3.5 w-3.5 text-sky-500" aria-label="Fridge" />}
            {out && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200">Khatam</span>}
            {low && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-800 ring-1 ring-amber-200">Kam ho gaya</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{cost(i.costPerUnit)} / {i.unit}{i.supplierName ? ` · ${i.supplierName}` : ''}{levelOf(i) ? ` · had ${fmtQty(levelOf(i))}` : ''}{usedIn ? ` · ${usedIn} recipes me` : ''}</span>
        </button>
        <div className="text-right">
          <p className={cn('text-base font-bold tabular-nums', out ? 'text-rose-700' : low ? 'text-amber-700' : 'text-slate-900')}>{fmtQty(i.currentStock)} <span className="text-[0.75rem] font-medium">{i.unit}</span></p>
          <p className="text-[0.6875rem] tabular-nums text-slate-500">{cost(Math.max(i.currentStock, 0) * i.costPerUnit)}</p>
        </div>
        {canManage && !hidden && <Button size="sm" variant="secondary" className="hidden sm:inline-flex" onClick={() => onStock('purchase')} leftIcon={<ArrowDownToLine className="h-4 w-4" />}>Maal aaya</Button>}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur kaam" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} /></button>
      </div>
      {open && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:pl-[4.25rem]">
          {canManage && !hidden && <>
            <Button size="sm" variant="secondary" className="sm:hidden" onClick={() => onStock('purchase')} leftIcon={<ArrowDownToLine className="h-4 w-4" />}>Maal aaya</Button>
            <Button size="sm" variant="secondary" onClick={() => onStock('waste')} leftIcon={<Trash2 className="h-4 w-4" />}>Waste hua</Button>
            <Button size="sm" variant="secondary" onClick={() => onStock('adjust')} leftIcon={<Scale className="h-4 w-4" />}>Gin kar theek</Button>
            <Button size="sm" variant="secondary" onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>
          </>}
          <Button size="sm" variant="secondary" onClick={onHistory} leftIcon={<History className="h-4 w-4" />}>Record</Button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />Supplier</a>}
          {canManage && <Button size="sm" variant="ghost" className={hidden ? '' : 'text-rose-700'} onClick={onToggle} leftIcon={hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}>{hidden ? 'Wapas layein' : 'Hatayein'}</Button>}
          {i.notes && <p className="w-full text-[0.75rem] text-slate-500">{i.notes}</p>}
        </div>
      )}
    </li>
  );
}
