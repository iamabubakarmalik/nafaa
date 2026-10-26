/**
 * Restaurant menu board, shown as the "Menu" tab of the shared products page.
 * Every dish, bought item and raw material with what a restaurant needs to
 * know about it: on the menu today or "86", served now, how many plates the
 * store still covers, plate cost and food cost %, and sales in the last 30
 * days. Search, filters, sort and paging run on the server
 * (/restaurant/menu-items/board). The analytics tab ranks dishes by sales and
 * profit (menu engineering) from the same bill math as the reports.
 *
 * Keys: / search (the shared page handles N, A and G).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, BookOpen, CheckSquare, ChefHat, CircleSlash, Clock, Download, Flame, FolderTree,
  LayoutList, ListPlus, Package, Pencil, Plus, Power, Search, ShoppingCart, Sparkles, Star, Truck, Upload, Wheat,
  type LucideIcon,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  type FilterOption,
} from '@/design-system/components';
import type { GuideStep } from '@modules/inventory/products/list/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { downloadCsv } from '@core/lib/csv';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PrintButton, type PrintDoc } from '@core/print';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { menuItemsApi, switchDishes, type BoardItem, type BoardQuery, type BoardSort, type BoardState, type DishClass, type MenuAnalytics } from '../api/menu-items.api';
import { clock12, foodCostTone, offLabel, spiceOf } from '../lib/menuMeta';

const LIMIT = 48;
const fmt = (n: number) => String(Number(Number(n).toFixed(2)));

const STATES: Array<{ id: Exclude<BoardState, 'inactive'>; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'Sab menu', icon: LayoutList },
  { id: 'live', label: 'Mil rahi', icon: Power },
  { id: 'off', label: 'Band (86)', icon: CircleSlash },
  { id: 'cantmake', label: 'Ban nahi sakti', icon: AlertTriangle },
  { id: 'norecipe', label: 'Recipe nahi', icon: BookOpen },
  { id: 'notonpos', label: 'Menu se bahar', icon: ListPlus },
  { id: 'raw', label: 'Raw material', icon: Wheat },
];
const SORTS: Array<FilterOption<BoardSort>> = [
  { value: 'name', label: 'Naam A–Z' }, { value: 'sold', label: 'Zyada bikne wali' }, { value: 'profit', label: 'Zyada profit' },
  { value: 'foodCost', label: 'Food cost zyada pehle' }, { value: 'canMake', label: 'Kam plate bachi pehle' },
  { value: 'priceHigh', label: 'Mehngi pehle' }, { value: 'priceLow', label: 'Sasti pehle' }, { value: 'new', label: 'Nayi pehle' },
];
const CLASS: Record<DishClass, { label: string; hint: string; color: string; icon: LucideIcon }> = {
  star: { label: 'Star', hint: 'Zyada bikti, zyada kamati — saamne rakhein', color: '#16a34a', icon: Star },
  workhorse: { label: 'Mehnati', hint: 'Zyada bikti, kam kamati — rate barhayein ya cost ghatayein', color: '#2563eb', icon: Flame },
  puzzle: { label: 'Chhupi hui', hint: 'Achha kamati, kam bikti — waiter suggest karein', color: '#d97706', icon: Sparkles },
  dog: { label: 'Kamzor', hint: 'Kam bikti, kam kamati — menu se hatane ka sochein', color: '#e11d48', icon: CircleSlash },
};

type Tab = Exclude<BoardState, 'inactive'> | 'analytics';

export default function RestaurantMenuBoard() {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name ?? s.tenant?.name ?? '');
  const { sales: money, cost, costHidden } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const can = {
    create: usePermission(PERMISSIONS.PRODUCTS_CREATE),
    edit: usePermission(PERMISSIONS.PRODUCTS_EDIT),
    menu: usePermission(PERMISSIONS.RESTAURANT_MENU_MANAGE),
    buy: usePermission(PERMISSIONS.PURCHASES_CREATE),
  };

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<BoardSort>('name');
  const [inactive, setInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [days, setDays] = useState(30);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => { const t = setTimeout(() => setTerm(search.trim()), 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); setPicked(new Set()); }, [tab, term, categoryId, sort, inactive]);

  const state: BoardState = inactive ? 'inactive' : tab === 'analytics' ? 'all' : tab;
  const query: BoardQuery = { search: term || undefined, categoryId, state, sort, page, limit: LIMIT };
  const board = useQuery({
    queryKey: ['restaurant-menu-board', shopId, query],
    queryFn: () => menuItemsApi.board(query),
    placeholderData: keepPreviousData,
    retry: (n, e) => (e as { response?: { status?: number } })?.response?.status !== 403 && n < 2,
  });
  const analytics = useQuery({
    queryKey: ['restaurant-menu-analytics', shopId, days],
    queryFn: () => menuItemsApi.analytics(days),
    enabled: tab === 'analytics',
  });

  const data = board.data;
  const st = data?.stats;
  const items = data?.items ?? [];
  const forbidden = (board.error as { response?: { status?: number } } | null)?.response?.status === 403;
  const refresh = () => ['restaurant-menu-board', 'restaurant-menu-items', 'restaurant-cookability', 'restaurant-product-extra', 'products-for-pos']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  // Off = "86" at this branch till the business day ends; it comes back by itself next day.
  const setOne = useMutation({
    mutationFn: ({ item, on }: { item: BoardItem; on: boolean }) => switchDishes([{ menuItemId: item.menuItemId!, offHere: item.offHere }], on),
    onSuccess: (_r, v) => { toast.success(v.on ? 'Chalu — counter par aa gayi' : 'Aaj ke liye band (86) — kal khud chalu ho jayegi'); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi badla')),
  });
  const setMany = useMutation({
    mutationFn: ({ items: list, on }: { items: Array<{ menuItemId: string; offHere?: boolean }>; on: boolean }) => switchDishes(list, on),
    onSuccess: (n, v) => { toast.success(`${n} ${v.on ? 'chalu' : 'aaj ke liye band (86)'}`); setPicked(new Set()); refresh(); },
    onError: (e) => toast.error(errText(e, 'Nahi badla')),
  });
  const dishesOf = (list: Array<{ menuItemId: string | null; offHere?: boolean }>) =>
    list.filter((i): i is { menuItemId: string; offHere?: boolean } => !!i.menuItemId);
  const addToMenu = useMutation({
    mutationFn: (productIds: string[]) => menuItemsApi.addToMenu(productIds),
    onSuccess: (r) => { toast.success(r.added ? `${r.added} cheez menu par aa gayi` : 'Pehle se menu par thi'); setPicked(new Set()); refresh(); },
    onError: (e) => toast.error(errText(e, 'Menu par nahi aayi')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Every row of the current filter, for CSV and print. */
  const fetchAll = async () => {
    const rows: BoardItem[] = [];
    for (let p = 1; p <= 10; p++) {
      const r = await menuItemsApi.board({ ...query, page: p, limit: 200 });
      rows.push(...r.items);
      if (rows.length >= r.count) break;
    }
    return rows;
  };
  const exportCsv = async () => {
    try {
      const rows = await fetchAll();
      if (!rows.length) { toast.error('Is filter me kuch nahi'); return; }
      downloadCsv(`menu-${new Date().toISOString().slice(0, 10)}.csv`, [
        ['Naam', 'Category', 'Type', 'Rate', ...(costHidden ? [] : ['Cost', 'Food cost %', 'Profit']), 'Menu', 'Aaj', 'Ban sakti (plate)', 'Stock', `Biki (${data?.windowDays ?? 30} din)`],
        ...rows.map((i) => [
          i.name, i.category?.name ?? '', kindLabel(i), i.price, ...(costHidden ? [] : [i.cost, i.foodCostPct ?? '', i.profit]),
          i.onPos ? 'Haan' : 'Nahi', i.onPos ? (i.available ? 'Mil rahi' : 'Band') : '', i.canMake ?? '', i.stock ?? '', i.sold,
        ]),
      ]);
      toast.success(`${rows.length} cheezein CSV me`);
    } catch { toast.error('Export nahi hua'); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll();
    return {
      title: tab === 'raw' ? 'Raw material' : 'Menu',
      subtitle: STATES.find((s) => s.id === tab)?.label,
      meta: [['Branch', shopName], ['Cheezein', String(rows.length)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Naam' }, { label: 'Category', wideOnly: true }, { label: 'Rate', align: 'right' }, ...(costHidden ? [] : [{ label: 'Cost', align: 'right' as const, wideOnly: true }]), { label: 'Aaj', align: 'right' }],
        rows: rows.map((i) => [i.name, i.category?.name ?? '', fmt(i.price), ...(costHidden ? [] : [fmt(i.cost)]),
          i.kind === 'raw' ? `${fmt(i.stock ?? 0)} ${i.unit}` : !i.onPos ? 'Menu se bahar' : i.available ? (i.canMake === 0 ? 'Ban nahi sakti' : 'Mil rahi') : 'Band']),
      }],
    };
  };

  const toggleAll = () => setPicked((p) => (p.size === items.length ? new Set() : new Set(items.map((i) => i.productId))));
  const pickedItems = items.filter((i) => picked.has(i.productId));
  const pages = data ? Math.max(1, Math.ceil(data.count / LIMIT)) : 1;
  const hasFilters = !!(term || categoryId || inactive || sort !== 'name');
  const clear = () => { setSearch(''); setCategoryId(undefined); setInactive(false); setSort('name'); };
  const catName = data?.categories.find((c) => c.id === categoryId)?.name ?? (categoryId === 'none' ? 'Baghair category' : 'Category');

  return (
    <div className="space-y-4">
      {forbidden ? (
        <EmptyState className="rounded-3xl bg-white ring-1 ring-slate-200/80" icon={<CircleSlash className="h-6 w-6" />}
          title="Menu dekhne ki permission nahi" description={'Malik se "Menu dekhna" (restaurant.menu.view) ki permission lein.'} />
      ) : (
        <>
          <section aria-label="Menu ka khulasa" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-slate-200/80 shadow-sm ring-1 ring-slate-200/80 lg:grid-cols-4">
            {[
              { label: 'Menu par mil rahi', value: st ? `${st.live} / ${st.dishes}` : null, hint: 'dish aur cheezein' },
              { label: 'Ausat food cost', value: st ? (costHidden ? '••••' : st.avgFoodCost === null ? '—' : `${st.avgFoodCost}%`) : null, hint: st?.highFoodCost ? `${st.highFoodCost} me 45% se zyada` : 'recipe wali dishes' },
              { label: `Biki · ${data?.windowDays ?? 30} din`, value: st ? fmt(st.sold) : null, hint: 'plate / adad' },
              { label: 'Raw material ki value', value: st ? cost(st.rawValue) : null, hint: st?.rawLow ? `${st.rawLow} kam` : 'stock' },
            ].map((x) => (
              <div key={x.label} className="min-w-0 bg-white px-4 py-3">
                <p className="text-[0.75rem] font-medium text-slate-500">{x.label}</p>
                {x.value === null ? <Skeleton className="mt-1 h-6 w-24" /> : <p className="text-[1.125rem] font-bold tabular-nums text-slate-900">{x.value}</p>}
                <p className="truncate text-[0.6875rem] text-slate-500">{x.hint}</p>
              </div>
            ))}
          </section>

          <KpiRow>
            {!st ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
              <>
                <KpiCard icon={AlertTriangle} color="#e11d48" label="Menu par, ban nahi sakti" value={String(st.liveButCantMake.length)} hint="Saamaan khatam · dabayein"
                  onClick={() => setTab('cantmake')} active={tab === 'cantmake'} />
                <KpiCard icon={Clock} color="#d97706" label="Thori bachi" value={String(st.running)} hint="5 plate ya kam"
                  onClick={() => { setTab('all'); setSort('canMake'); }} active={sort === 'canMake'} />
                <KpiCard icon={BookOpen} color="#7c3aed" label="Recipe nahi" value={String(data?.tabs?.norecipe ?? 0)} hint="Stock nahi katta"
                  onClick={() => setTab('norecipe')} active={tab === 'norecipe'} />
                <KpiCard icon={Flame} color="#ea580c" label="Food cost 45%+" value={costHidden ? '••••' : String(st.highFoodCost)} hint="Rate ya recipe dekhein"
                  onClick={() => { setTab('all'); setSort('foodCost'); }} active={sort === 'foodCost'} />
                <KpiCard icon={Wheat} color="#a16207" label="Raw material kam" value={String(st.rawLow)} hint="Had se kam stock"
                  onClick={() => setTab('raw')} active={tab === 'raw'} />
              </>
            )}
          </KpiRow>

          {!!st?.liveButCantMake.length && tab !== 'analytics' && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <p className="min-w-0 flex-1">
                <strong>{st.liveButCantMake.length} dish</strong> menu par hain magar saamaan khatam hai: {st.liveButCantMake.slice(0, 4).map((x) => `${x.name}${x.blocker ? ` (${x.blocker})` : ''}`).join(', ')}{st.liveButCantMake.length > 4 ? '…' : ''}
              </p>
              {can.menu && (
                <Button size="sm" variant="critical" loading={setMany.isPending}
                  onClick={() => setMany.mutate({ items: dishesOf(st.liveButCantMake), on: false })}>Sab aaj band karein (86)</Button>
              )}
              {can.buy && <Link to="/purchases/new" className="text-[0.8125rem] font-semibold text-rose-800 underline">Purchase karein</Link>}
            </div>
          )}
          {!!st?.unitProblems && tab !== 'analytics' && (
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              {st.unitProblems} recipe me unit stock se nahi milti (maslan "cup" jabke stock kilo me hai) — un ka saamaan sahi nahi katta. <Link to="/restaurant/recipes" className="font-semibold underline">Recipes dekhein</Link>
            </p>
          )}

          <FilterBar
            search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Dish, raw material, SKU ya barcode…" label="Menu search" />}
            chips={hasFilters ? <>
              {term && <FilterChip onRemove={() => setSearch('')}>"{term}"</FilterChip>}
              {categoryId && <FilterChip onRemove={() => setCategoryId(undefined)}>{catName}</FilterChip>}
              {inactive && <FilterChip onRemove={() => setInactive(false)}>Band products</FilterChip>}
              {sort !== 'name' && <FilterChip onRemove={() => setSort('name')}>{SORTS.find((s) => s.value === sort)?.label}</FilterChip>}
            </> : undefined}
            onClear={clear}>
            <FilterMenu icon={FolderTree} label="Category" value={categoryId ?? 'all'} active={!!categoryId} width="w-72"
              options={[{ value: 'all', label: 'Sab category' }, ...(data?.categories ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.count})`, color: c.color }))]}
              onChange={(v) => setCategoryId(v === 'all' ? undefined : v)} />
            <FilterMenu icon={Package} label="Products" value={inactive ? 'inactive' : 'active'} active={inactive}
              options={[{ value: 'active', label: 'Chalu products' }, { value: 'inactive', label: 'Band products', hint: 'Jo band kiye gaye' }]}
              onChange={(v) => setInactive(v === 'inactive')} />
            <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} options={SORTS} onChange={setSort} align="right" width="w-60" />
          </FilterBar>

          <ViewTabs<Tab> value={tab} onChange={(v) => { setTab(v); setInactive(false); }}
            tabs={[...STATES.map((s) => ({ id: s.id as Tab, label: s.label, icon: s.icon, count: inactive ? null : data?.tabs?.[s.id] ?? null })), { id: 'analytics' as Tab, label: 'Menu analytics', icon: BarChart3 }]}
            right={<div className="flex items-center gap-2">
              {can.create && <Link to="/products/bulk-import" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><Upload className="h-4 w-4" /><span className="hidden sm:inline">Import</span></Link>}
              <Button size="sm" variant="secondary" onClick={() => void exportCsv()} leftIcon={<Download className="h-4 w-4" />}>CSV</Button>
              <PrintButton doc={printDoc} label="Print" size="sm" />
            </div>} />

          {tab === 'analytics' ? (
            <MenuEngineering data={analytics.data} loading={analytics.isLoading} days={days} setDays={setDays} money={money} cost={cost} costHidden={costHidden} />
          ) : (
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              {picked.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-brand-50/60 px-4 py-2.5 text-[0.8125rem]">
                  <span className="font-semibold text-slate-900">{picked.size} chuni</span>
                  {can.menu && pickedItems.some((i) => i.menuItemId) && <>
                    <Button size="xs" variant="success" onClick={() => setMany.mutate({ items: dishesOf(pickedItems), on: true })}>Chalu karein</Button>
                    <Button size="xs" variant="critical" onClick={() => setMany.mutate({ items: dishesOf(pickedItems), on: false })}>Aaj band (86)</Button>
                  </>}
                  {can.menu && pickedItems.some((i) => !i.onPos && i.kind !== 'raw') && (
                    <Button size="xs" variant="secondary" onClick={() => addToMenu.mutate(pickedItems.filter((i) => !i.onPos && i.kind !== 'raw').map((i) => i.productId))}>Menu par daalein</Button>
                  )}
                  <button type="button" onClick={() => setPicked(new Set())} className="ml-auto text-[0.75rem] font-semibold text-slate-600 hover:underline">Chhorein</button>
                </div>
              )}
              <div className="hidden grid-cols-[2rem_minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)] gap-3 border-b border-slate-100 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
                <span><input type="checkbox" aria-label="Sab chunein" checked={!!items.length && picked.size === items.length} onChange={toggleAll} className="h-4 w-4 rounded border-slate-300 accent-brand-600" /></span>
                <span>Cheez</span><span className="text-right">Rate</span><span className="text-right">Cost / food cost</span><span>{tab === 'raw' ? 'Stock' : 'Ban sakti'}</span><span className="text-right">Biki</span><span className="text-right">Aaj</span>
              </div>
              {board.isLoading ? (
                <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              ) : !items.length ? (
                <Empty tab={tab} filtered={hasFilters} onClear={clear} canCreate={can.create} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((i) => (
                    <Row key={i.productId} item={i} money={money} cost={cost} costHidden={costHidden} canMenu={can.menu} canEdit={can.edit} canBuy={can.buy}
                      picked={picked.has(i.productId)} onPick={() => setPicked((p) => { const n = new Set(p); if (n.has(i.productId)) n.delete(i.productId); else n.add(i.productId); return n; })}
                      onToggle={(on) => i.menuItemId && setOne.mutate({ item: i, on })} onAdd={() => addToMenu.mutate([i.productId])} busy={setOne.isPending || addToMenu.isPending} />
                  ))}
                </ul>
              )}
              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[0.8125rem]">
                  <span className="text-slate-500">{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data?.count ?? 0)} / {data?.count}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Pichla</Button>
                    <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Agla</Button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}

const errText = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
const kindLabel = (i: BoardItem) => (i.kind === 'raw' ? 'Raw material' : i.kind === 'dish' ? 'Dish' : 'Bani banai');

function Row({ item: i, money, cost, costHidden, canMenu, canEdit, canBuy, picked, onPick, onToggle, onAdd, busy }: {
  item: BoardItem; money: (n: number) => string; cost: (n: number) => string; costHidden: boolean;
  canMenu: boolean; canEdit: boolean; canBuy: boolean; picked: boolean; onPick: () => void; onToggle: (on: boolean) => void; onAdd: () => void; busy: boolean;
}) {
  const tone = foodCostTone(i.foodCostPct);
  const spice = spiceOf(i.spiceLevel);
  const low = i.kind !== 'dish' && i.stock !== null && i.stock <= i.lowStockAlert;
  const hours = i.hours.from || i.hours.to ? `${clock12(i.hours.from) || '…'}–${clock12(i.hours.to) || '…'}` : null;
  return (
    <li className={cn('grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:grid-cols-[2rem_minmax(0,2.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,1fr)]', !i.isActive && 'opacity-60')}>
      <input type="checkbox" checked={picked} onChange={onPick} aria-label={`${i.name} chunein`} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
      <Link to={`/restaurant-menu-items/${i.productId}`} className="flex min-w-0 items-center gap-3">
        <ProductThumb name={i.name} category={i.category?.name} url={i.image} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{i.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[0.6875rem]">
            {i.category && <span className="rounded px-1.5 py-0.5 font-semibold" style={{ backgroundColor: `${i.category.color}1a`, color: i.category.color }}>{i.category.name}</span>}
            {i.kind === 'raw' && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Raw</span>}
            {i.kind === 'bought' && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600">Bani banai</span>}
            {i.chefSpecial && <span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">Chef special</span>}
            {spice && spice.chillies && <span title={spice.label}>{spice.chillies}</span>}
            {i.prepTime && <span className="text-slate-500">{i.prepTime} min</span>}
            {hours && <span className={cn('rounded px-1.5 py-0.5 font-semibold', i.servingNow ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500')}>{hours}{!i.servingNow && ' · abhi nahi'}</span>}
            {i.addOnGroups > 0 && <span className="text-slate-500">{i.addOnGroups} add-on</span>}
            {i.recipe?.unitProblems.length ? <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Unit ghalat</span> : null}
          </span>
        </span>
      </Link>
      <div className="flex items-center justify-end gap-1.5 lg:hidden">
        <MenuSwitch item={i} canMenu={canMenu} onToggle={onToggle} onAdd={onAdd} busy={busy} />
      </div>
      <div className="col-span-2 col-start-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] lg:contents">
        <span className="tabular-nums lg:text-right"><span className="text-slate-500 lg:hidden">Rate </span><strong className="text-slate-900">{i.kind === 'raw' ? '—' : money(i.price)}</strong></span>
        <span className="tabular-nums lg:text-right">
          <span className="text-slate-500 lg:hidden">Cost </span>{cost(i.cost)}
          {!costHidden && i.foodCostPct !== null && i.kind !== 'raw' && (
            <span className={cn('ml-1 text-[0.75rem] font-semibold', tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-success-700')}>{i.foodCostPct}%</span>
          )}
        </span>
        <span>
          {i.kind === 'dish' ? (
            !i.recipe ? <span className="text-[0.75rem] font-medium text-violet-700">Recipe nahi</span>
              : i.canMake === null ? <span className="text-slate-500">—</span>
                : i.canMake === 0 ? <span className="text-[0.75rem] font-semibold text-rose-700">Nahi · {i.blocker?.name} khatam</span>
                  : <span className={cn('font-semibold tabular-nums', i.canMake <= 5 ? 'text-amber-700' : 'text-slate-800')}>{i.canMake} plate{i.canMake <= 5 && i.blocker ? <span className="ml-1 text-[0.6875rem] font-normal text-slate-500">({i.blocker.name})</span> : null}</span>
          ) : (
            <span className={cn('tabular-nums', low ? 'font-semibold text-rose-700' : 'text-slate-800')}>
              {fmt(i.stock ?? 0)} {i.unit}{low && ' · kam'}
              {low && canBuy && i.kind === 'raw' && <Link to="/purchases/new" className="ml-1.5 inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold text-brand-700 hover:underline"><Truck className="h-3 w-3" />Khareedein</Link>}
            </span>
          )}
        </span>
        <span className="tabular-nums text-slate-700 lg:text-right"><span className="text-slate-500 lg:hidden">Biki </span>{i.kind === 'raw' ? '—' : fmt(i.sold)}</span>
        <span className="hidden items-center justify-end gap-1.5 lg:flex">
          <MenuSwitch item={i} canMenu={canMenu} onToggle={onToggle} onAdd={onAdd} busy={busy} />
          {canEdit && <Link to={`/restaurant-menu-items/${i.productId}/edit`} aria-label={`${i.name} badlein`} title="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></Link>}
        </span>
      </div>
    </li>
  );
}

function MenuSwitch({ item: i, canMenu, onToggle, onAdd, busy }: { item: BoardItem; canMenu: boolean; onToggle: (on: boolean) => void; onAdd: () => void; busy: boolean }) {
  if (i.kind === 'raw') return null;
  if (!i.onPos) {
    return canMenu
      ? <button type="button" disabled={busy} onClick={onAdd} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.75rem] font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-800">+ Menu</button>
      : <span className="text-[0.75rem] text-slate-400">Menu se bahar</span>;
  }
  const label = i.available ? (i.canMake === 0 ? 'Mil rahi?' : 'Mil rahi') : i.offHere ? offLabel(i.offUntil) : 'Band (86)';
  return (
    <button type="button" role="switch" aria-checked={i.available} disabled={!canMenu || busy} onClick={() => onToggle(!i.available)}
      title={canMenu ? (i.available ? 'Khatam ho gayi? Aaj ke liye band karein (86) — kal khud chalu' : 'Chalu karein') : 'Badalne ki permission nahi'}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1 transition disabled:cursor-not-allowed',
        i.available ? (i.canMake === 0 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-success-50 text-success-700 ring-success-200') : 'bg-rose-50 text-rose-700 ring-rose-200')}>
      <span className={cn('h-2 w-2 rounded-full', i.available ? (i.canMake === 0 ? 'bg-amber-500' : 'bg-success-500') : 'bg-rose-500')} />{label}
    </button>
  );
}

function Empty({ tab, filtered, onClear, canCreate }: { tab: Tab; filtered: boolean; onClear: () => void; canCreate: boolean }) {
  const text: Partial<Record<Tab, [string, string]>> = {
    cantmake: ['Har dish ban sakti hai', 'Kisi recipe ka saamaan khatam nahi.'],
    off: ['Koi dish band nahi', 'Jo dish khatam ho jaye use "Mil rahi" dabakar band karein.'],
    norecipe: ['Har dish ki recipe hai', 'Bikne par saamaan stock se katta hai.'],
    notonpos: ['Sab menu par hai', 'Products list ki har bikne wali cheez restaurant counter par aati hai.'],
    raw: ['Raw material nahi', 'Chicken, chawal, oil jaisi cheezein "Raw material" bana kar daalein — recipe me lagti hain.'],
  };
  const [title, sub] = filtered ? ['Is filter me kuch nahi', 'Filter badal kar dekhein'] : text[tab] ?? ['Menu khali hai', 'Pehli dish jorein — naam, rate, size aur recipe.'];
  return (
    <EmptyState icon={<ChefHat className="h-6 w-6" />} title={title} description={sub}
      action={<div className="flex gap-2">
        {filtered && <Button variant="secondary" onClick={onClear}>Filter hatayein</Button>}
        {!filtered && canCreate && (tab === 'all' || tab === 'raw') && <Link to="/restaurant-menu-items/new" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg shadow-sm hover:bg-brand-700"><Plus className="h-4 w-4" />Nayi cheez</Link>}
      </div>} />
  );
}

/* ── Analytics: menu engineering ── */
function MenuEngineering({ data, loading, days, setDays, money, cost, costHidden }: {
  data?: MenuAnalytics; loading: boolean; days: number; setDays: (d: number) => void;
  money: (n: number) => string; cost: (n: number) => string; costHidden: boolean;
}) {
  const [cls, setCls] = useState<DishClass | 'all'>('all');
  const rows = useMemo(() => (data?.rows ?? []).filter((r) => cls === 'all' || r.class === cls), [data, cls]);
  const t = data?.totals;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} type="button" onClick={() => setDays(d)} className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', days === d ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            {d} din
          </button>
        ))}
        <p className="ml-auto text-[0.75rem] text-slate-500">Wohi hisaab jo Profit report me — return aur bill ka Discount kaat kar</p>
      </div>
      <KpiRow cols={4}>
        {loading || !t ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={ShoppingCart} color="#2563eb" label="Dishes ki sale" value={money(t.dishRevenue)} hint={`${fmt(t.plates)} plate · ${t.bills} bill`} />
            <KpiCard icon={Wheat} color="#a16207" label="Saamaan ki cost" value={cost(t.dishCost)} hint={costHidden || t.foodCostPct === null ? undefined : `${t.foodCostPct}% food cost`} />
            <KpiCard icon={Sparkles} color="#16a34a" label="Gross profit" value={cost(t.dishProfit)} hint="Dishes se" />
            <KpiCard icon={CheckSquare} color="#0891b2" label="Net sale (report)" value={money(t.netSales)} hint={t.serviceCharges ? `${money(t.serviceCharges)} service charge shamil` : 'Day book se milta hai'} />
          </>
        )}
      </KpiRow>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(Object.keys(CLASS) as DishClass[]).map((k) => {
          const c = CLASS[k];
          return (
            <button key={k} type="button" onClick={() => setCls(cls === k ? 'all' : k)}
              className={cn('flex items-start gap-3 rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 transition', cls === k ? 'ring-2 ring-brand-500' : 'ring-slate-200/80 hover:-translate-y-0.5')}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${c.color}17`, color: c.color }}><c.icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-[0.875rem] font-semibold text-slate-900">{c.label} · {data?.counts[k] ?? 0}</span>
                <span className="block text-[0.75rem] leading-snug text-slate-500">{c.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {loading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div> : !rows.length ? (
          <p className="px-6 py-12 text-center text-[0.875rem] text-slate-500">Is period me koi dish nahi biki</p>
        ) : (
          <Table minWidth="44rem">
            <THead>
              <Tr>
                <Th>Dish</Th><Th align="right" className="px-3">Plate</Th><Th align="right" className="px-3">Sale</Th>
                <Th align="right" className="px-3">Cost</Th><Th align="right" className="px-3">Profit</Th><Th align="right" className="px-3">Fi plate</Th><Th>Darja</Th>
              </Tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const c = CLASS[r.class];
                return (
                  <Tr key={r.productId}>
                    <Td className="py-2.5"><Link to={`/restaurant-menu-items/${r.productId}`} className="font-medium text-slate-900 hover:text-brand-700">{r.name}</Link>{r.category && <span className="ml-1.5 text-[0.6875rem] text-slate-500">{r.category.name}</span>}</Td>
                    <Td align="right" className="px-3 py-2.5">{fmt(r.qty)} <span className="text-[0.6875rem] text-slate-500">{r.share}%</span></Td>
                    <Td align="right" className="px-3 py-2.5">{money(r.revenue)}</Td>
                    <Td align="right" className="px-3 py-2.5">{cost(r.cost)}{!costHidden && r.foodCostPct !== null && <span className="ml-1 text-[0.6875rem] text-slate-500">{r.foodCostPct}%</span>}</Td>
                    <Td align="right" className="px-3 py-2.5 font-semibold">{cost(r.profit)}</Td>
                    <Td align="right" className="px-3 py-2.5">{cost(r.perPlate)}</Td>
                    <Td className="py-2.5"><span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-bold" style={{ backgroundColor: `${c.color}17`, color: c.color }}><c.icon className="h-3 w-3" />{c.label}</span></Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  );
}

/** Restaurant steps for the shared products guide. */
export const MENU_GUIDE: GuideStep[] = [
  { icon: Power, color: '#16a34a', title: 'Khatam? Band karein', text: '"Mil rahi" dabane se dish is branch me aaj ke liye band (86) ho jati hai — counter par nahi aati, aur karobari din khatam hote hi khud chalu ho jati hai. Kai dishes chun kar ek saath bhi.' },
  { icon: AlertTriangle, color: '#e11d48', title: 'Ban nahi sakti', text: 'Recipe ka koi saamaan khatam ho to dish laal dikhti hai. Purchase karein ya band kar dein, taake waiter order na le.' },
  { icon: Flame, color: '#ea580c', title: 'Food cost', text: 'Rate ka kitna hissa saamaan me gaya. 30–35% theek; 45% se upar ho to rate barhayein ya recipe dekhein.' },
  { icon: Wheat, color: '#a16207', title: 'Raw material', text: 'Chicken, chawal, oil ka stock aur value. Purchase se stock aata hai, dish bikne par recipe ke hisaab se katta hai.' },
  { icon: BarChart3, color: '#2563eb', title: 'Menu analytics', text: 'Kaunsi dish star hai aur kaunsi kamzor — sale aur profit wohi jo Profit report me. Food cost 30–35% aam hai; 45% se upar ho to rate ya recipe dekhein.' },
  { icon: Search, color: '#7c3aed', title: 'Dhoondna', text: 'Menu tab me naam, SKU ya barcode likhein; category aur sort se list chhoti karein. CSV aur Print isi filter ke hain.' },
  { icon: Truck, color: '#0891b2', title: 'Raw material ka stock', text: 'Raw material ka stock Purchase se aata hai — kilo, litre ya darjan, packing ke saath.' },
];
