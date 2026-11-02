/**
 * Recipes: the kitchen's view of every dish's ingredients. Three tabs:
 *   Recipes       plate cost at today's rates and food cost %, edit in place
 *   Ban sakti hai how many plates the branch stock still covers, and what
 *                 runs out first (take a dish off the menu from here)
 *   Saamaan       raw material used by sales against purchases and stock,
 *                 with days left at the current rate
 * Dishes without a recipe are listed so none is left uncounted.
 *
 * Keys: / search · N new recipe · R refresh rates · G guide · Ctrl+S save in the editor.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BookOpen, ChefHat, CircleSlash, Clock, Download, Flame, FolderTree, GraduationCap, Pencil, Plus, Power, RefreshCw,
  Search, Trash2, TrendingDown, Truck, Wheat,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td,
  Textarea, Th, THead, Tr, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, controlClass,
} from '@/design-system/components';
import { PageGuide, usePageGuide, type GuideStep } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PrintButton, type PrintDoc } from '@core/print';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { menuItemsApi, switchDishes, type RestaurantMenuItem } from '../api/menu-items.api';
import { recipesApi, type Cookability, type RecipeRow } from '../api/recipes.api';
import { RecipeLinesEditor, recipeFromApi, recipeInput, recipeProblem, recipeTotals, type RecipeDraft } from '../components/RecipeLinesEditor';
import { foodCostTone, offLabel } from '../lib/menuMeta';
import { t, Trans } from '@core/i18n';

type Tab = 'recipes' | 'cook' | 'usage';
const fmt = (n: number) => String(Number(Number(n).toFixed(3)));
const errText = (e: unknown, fallback: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fallback;
const KEYS = ['restaurant-recipes', 'restaurant-cookability', 'restaurant-recipe-usage', 'restaurant-menu-board', 'restaurant-product-extra', 'restaurant-menu-items'];

interface Target { menuItemId: string; name: string; price: number; productId: string }

export default function RecipesPage() {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const { cost, costHidden } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);
  const can = { kitchen: usePermission(PERMISSIONS.RESTAURANT_KITCHEN_MANAGE), menu: usePermission(PERMISSIONS.RESTAURANT_MENU_MANAGE), buy: usePermission(PERMISSIONS.PURCHASES_CREATE) };
  const [tab, setTab] = useState<Tab>('recipes');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [days, setDays] = useState(7);
  const [editing, setEditing] = useState<Target | null>(null);
  const [picking, setPicking] = useState(false);

  const recipesQ = useQuery({ queryKey: ['restaurant-recipes'], queryFn: () => recipesApi.list() });
  const cookQ = useQuery({ queryKey: ['restaurant-cookability', shopId], queryFn: () => recipesApi.cookability() });
  const menuQ = useQuery({ queryKey: ['restaurant-menu-items', 'recipes-page'], queryFn: () => menuItemsApi.list({}), retry: false });
  const usageQ = useQuery({ queryKey: ['restaurant-recipe-usage', shopId, days], queryFn: () => recipesApi.usage(days), enabled: tab === 'usage' });
  const refresh = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const recipes = recipesQ.data ?? [];
  const cookBy = useMemo(() => new Map((cookQ.data?.rows ?? []).map((r) => [r.menuItemId, r])), [cookQ.data]);
  const missing = useMemo(() => (menuQ.data ?? []).filter((m) => !m.recipe && m.product?.isActive !== false && !m.product?.isRawMaterial && m.product?.productType !== 'BOUGHT'), [menuQ.data]);

  const refreshCosts = useMutation({
    mutationFn: () => recipesApi.refreshCosts(),
    onSuccess: (r) => { toast.success(r.updated ? t('{{updated}} dish ki cost aaj ke rate par aa gayi', { updated: r.updated }) : t('Sab cost pehle se theek thi')); refresh(); },
    onError: (e) => toast.error(errText(e, t('Cost taaza nahi hui'))),
  });
  const runRefresh = refreshCosts.mutate as () => void;
  const setAvailable = useMutation({
    mutationFn: ({ r, on }: { r: Cookability; on: boolean }) => switchDishes([{ menuItemId: r.menuItemId, offHere: r.offHere }], on),
    onSuccess: (_r, v) => { toast.success(v.on ? t('Chalu') : t('Aaj ke liye band (86) — kal khud chalu ho jayegi')); refresh(); },
    onError: (e) => toast.error(errText(e, t('Nahi badla'))),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (k === 'n' && can.kitchen) { e.preventDefault(); setPicking(true); }
      if (k === 'r' && can.kitchen) { e.preventDefault(); runRefresh(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [can.kitchen, runRefresh]);

  const term = search.trim().toLowerCase();
  const categories = useMemo(() => {
    const m = new Map<string, { id: string; name: string; color: string }>();
    for (const r of recipes) if (r.menuItem.product.category) m.set(r.menuItem.product.category.id, r.menuItem.product.category);
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes]);
  const shown = recipes.filter((r) => (categoryId === 'all' || r.menuItem.product.category?.id === categoryId)
    && (!term || r.menuItem.product.name.toLowerCase().includes(term) || r.ingredients.some((i) => String(i.ingredient?.name ?? '').toLowerCase().includes(term))));
  const cookRows = (cookQ.data?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));
  const usageRows = (usageQ.data?.rows ?? []).filter((r) => !term || r.name.toLowerCase().includes(term));

  const priced = (cookQ.data?.rows ?? []).filter((r) => r.price > 0 && r.cost > 0);
  const avgFood = priced.length ? priced.reduce((s, r) => s + r.foodCostPct, 0) / priced.length : null;
  const unitProblems = (cookQ.data?.rows ?? []).filter((r) => r.unitProblems?.length);
  const target = (m: { id: string; product?: { id: string; name: string; price: number } }): Target => ({ menuItemId: m.id, name: m.product?.name ?? 'Dish', price: Number(m.product?.price) || 0, productId: m.product?.id ?? '' });

  const exportCsv = () => {
    if (tab === 'usage') {
      downloadCsv(`saamaan-${days}din.csv`, [[t('Saamaan'), t('Unit'), t('Recipe me laga'), ...(costHidden ? [] : [t('Value')]), t('Khareeda'), t('Stock'), t('Roz'), t('Kitne din')],
        ...usageRows.map((r) => [r.name, r.unit, r.used, ...(costHidden ? [] : [r.usedValue]), r.bought, r.stock, r.perDay, r.daysLeft ?? ''])]);
    } else {
      downloadCsv('recipes.csv', [[t('Dish'), t('Category'), t('Rate'), ...(costHidden ? [] : [t('Plate cost'), t('Food cost %')]), t('Ban sakti (plate)'), t('Pehle khatam'), t('Saamaan')]]
        .concat(shown.map((r) => {
          const c = cookBy.get(r.menuItemId);
          return [r.menuItem.product.name, r.menuItem.product.category?.name ?? '', String(r.menuItem.product.price), ...(costHidden ? [] : [String(c?.cost ?? ''), String(c?.foodCostPct ?? '')]),
            String(c?.canMake ?? ''), c?.blocker?.name ?? '', r.ingredients.map((i) => `${i.ingredient?.name} ${fmt(i.quantity)} ${i.unit}${i.wastagePercent ? ` +${fmt(i.wastagePercent)}%` : ''}`).join('; ')];
        })));
    }
  };
  const printDoc = (): PrintDoc => ({
    title: t('Recipes'),
    meta: [[t('Dishes'), String(shown.length)]],
    sections: shown.map((r) => ({
      kind: 'table' as const,
      title: t('{{name}} — {{yieldQuantity}} plate', { name: r.menuItem.product.name, yieldQuantity: fmt(r.yieldQuantity) }),
      columns: [{ label: t('Saamaan') }, { label: t('Quantity'), align: 'right' as const }, ...(costHidden ? [] : [{ label: t('Cost'), align: 'right' as const }])],
      rows: r.ingredients.map((i) => [`${i.ingredient?.name ?? ''}${i.isOptional ? ' (marzi)' : ''}`, `${fmt(i.quantity)} ${i.unit}${i.wastagePercent ? ` +${fmt(i.wastagePercent)}% wastage` : ''}`, ...(costHidden ? [] : [String(i.totalCost ?? '')])]),
    })),
  });

  return (
    <PageShell>
      {guide.isOpen && <PageGuide title={t('Recipes — aasaan tareeqa')} steps={GUIDE} onClose={guide.close}
        tips={[t('Degh ki recipe ho to poori degh ka saamaan likhein aur "kitni plate banti hain" me plate ginein.'), t('Chicken ya oil ka rate badla? "Rates taaza karein" dabayein — sab dishes ki cost aaj ke rate par aa jati hai.')]}
        shortcuts={[['/', 'search'], ['N', t('nayi recipe')], ['R', t('rates taaza')], ['G', 'guide']]} />}
      {editing && <RecipeModal target={editing} canSave={can.kitchen} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {picking && <PickDish dishes={missing} onClose={() => setPicking(false)} onPick={(m) => { setPicking(false); setEditing(target(m)); }} />}

      <PageHero title={t('Recipes')} chip={<><BookOpen />{t('{{count}} dish', { count: recipes.length })}</>} meta={t('Saamaan, plate ki cost aur stock')} busy={(recipesQ.isFetching || cookQ.isFetching) && !recipesQ.isLoading} loading={recipesQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          {can.kitchen && <button type="button" onClick={() => refreshCosts.mutate()} disabled={refreshCosts.isPending} title={t('Rates taaza karein (R)')} className={heroButton}><RefreshCw className={cn('h-4 w-4', refreshCosts.isPending && 'animate-spin')} /><span className="hidden sm:inline">{t('Rates taaza')}</span></button>}
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{t('CSV')}</button>
          {tab === 'recipes' && <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={t('Print')} /></span>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} aria-label={t('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.kitchen && <button type="button" onClick={() => setPicking(true)} className={heroPrimaryButton}><Plus className="h-4 w-4" />{t('Nayi recipe')}</button>}
        </>}
        stats={[
          { label: t('Recipe wali dishes'), value: String(recipes.length), hint: missing.length ? t('{{count}} baqi', { count: missing.length }) : 'sab' },
          { label: t('Ausat food cost'), value: costHidden ? '••••' : avgFood === null ? '—' : `${avgFood.toFixed(1)}%` },
          { label: t('Ab nahi ban sakti'), value: String(cookQ.data?.outOfStock ?? 0), hint: t('{{value}} thori bachi', { value: cookQ.data?.running ?? 0 }) },
        ]} />

      <KpiRow cols={4}>
        {cookQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CircleSlash} color="#e11d48" label={t('Ban nahi sakti')} value={String(cookQ.data?.outOfStock ?? 0)} hint={t('Saamaan khatam · dabayein')} onClick={() => setTab('cook')} active={tab === 'cook'} />
            <KpiCard icon={Clock} color="#d97706" label={t('Thori bachi')} value={String(cookQ.data?.running ?? 0)} hint={t('5 plate ya kam')} onClick={() => setTab('cook')} />
            <KpiCard icon={BookOpen} color="#7c3aed" label={t('Recipe nahi')} value={String(cookQ.data?.withoutRecipe ?? missing.length)} hint={t('Bikne par stock nahi katta')} onClick={() => can.kitchen && setPicking(true)} />
            <KpiCard icon={Flame} color="#ea580c" label={t('Food cost 45%+')} value={costHidden ? '••••' : String(priced.filter((r) => r.foodCostPct > 45).length)} hint={t('Rate ya recipe dekhein')} />
          </>
        )}
      </KpiRow>

      {unitProblems.length > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t('{{value}} ki recipe me unit stock se nahi milti ({{value2}}) — saamaan sahi nahi katta. Recipe khol kar unit theek karein.', { value: unitProblems.map((r) => r.name).slice(0, 5).join(', '), value2: unitProblems[0].unitProblems?.join(', ') })}</span>
        </p>
      )}

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Dish ya saamaan ka naam…')} label={t('Recipe search')} />}
        chips={term || categoryId !== 'all' ? <>
          {term && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {categoryId !== 'all' && <FilterChip onRemove={() => setCategoryId('all')}>{categories.find((c) => c.id === categoryId)?.name}</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); setCategoryId('all'); }}>
        {tab === 'recipes' && <FilterMenu icon={FolderTree} label={t('Category')} value={categoryId} active={categoryId !== 'all'}
          options={[{ value: 'all', label: t('Sab category') }, ...categories.map((c) => ({ value: c.id, label: c.name, color: c.color }))]} onChange={setCategoryId} />}
        {tab === 'usage' && <FilterMenu icon={Clock} label={t('Din')} value={String(days)} options={[{ value: '1', label: t('Aaj') }, { value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }, { value: '90', label: t('90 din') }]} onChange={(v) => setDays(Number(v))} />}
      </FilterBar>

      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'recipes', label: t('Recipes'), icon: BookOpen, count: recipes.length },
        { id: 'cook', label: t('Ban sakti hai'), icon: ChefHat, count: cookQ.data?.outOfStock || null },
        { id: 'usage', label: t('Saamaan ka istemal'), icon: Wheat },
      ]} hint={<><Kbd>R</Kbd> {' '}{t('rates taaza')}</>} />

      {tab === 'recipes' && (
        <div className="space-y-4">
          {missing.length > 0 && can.kitchen && (
            <div className="rounded-3xl bg-violet-50 p-4 ring-1 ring-violet-200">
              <p className="text-[0.875rem] font-semibold text-violet-900">{t('{{count}} dish ki recipe nahi — bikne par saamaan stock se nahi katta', { count: missing.length })}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missing.slice(0, 12).map((m) => (
                  <button key={m.id} type="button" onClick={() => setEditing(target(m))} className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[0.8125rem] font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-100">
                    <Plus className="h-3.5 w-3.5" />{m.product?.name}
                  </button>
                ))}
                {missing.length > 12 && <button type="button" onClick={() => setPicking(true)} className="h-8 px-2 text-[0.8125rem] font-semibold text-violet-800 hover:underline">{t('+{{value}} aur', { value: missing.length - 12 })}</button>}
              </div>
            </div>
          )}
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {recipesQ.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
              : recipesQ.isError ? <p className="px-6 py-12 text-center text-[0.875rem] text-slate-500">{errText(recipesQ.error, t('Recipes nahi khulin'))}</p>
                : !shown.length ? (
                  <div className="flex flex-col items-center px-6 py-14 text-center">
                    <BookOpen className="h-8 w-8 text-slate-400" />
                    <p className="mt-3 font-semibold text-slate-900">{recipes.length ? t('Is filter me koi recipe nahi') : t('Abhi koi recipe nahi')}</p>
                    <p className="mt-1 max-w-md text-[0.875rem] text-slate-500">{t('Recipe se dish bikne par chicken, chawal, oil stock se katta hai aur har plate ki cost aur profit sahi aata hai.')}</p>
                    {can.kitchen && !recipes.length && <Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setPicking(true)}>{t('Pehli recipe')}</Button>}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {shown.map((r) => <RecipeRowView key={r.id} r={r} cook={cookBy.get(r.menuItemId)} cost={cost} costHidden={costHidden} canEdit={can.kitchen}
                      onEdit={() => setEditing({ menuItemId: r.menuItemId, name: r.menuItem.product.name, price: Number(r.menuItem.product.price) || 0, productId: r.menuItem.product.id })} />)}
                  </ul>
                )}
          </section>
        </div>
      )}

      {tab === 'cook' && (
        <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {cookQ.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div> : !cookRows.length ? (
            <p className="px-6 py-12 text-center text-[0.875rem] text-slate-500">{t('Koi recipe nahi — pehle dishes ki recipe banayein')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cookRows.map((r) => <CookRow key={r.recipeId} r={r} canMenu={can.menu} canBuy={can.buy} busy={setAvailable.isPending} onToggle={(on) => setAvailable.mutate({ r, on })} />)}
            </ul>
          )}
        </section>
      )}

      {tab === 'usage' && (
        <div className="space-y-4">
          <KpiRow cols={3}>
            {usageQ.isLoading || !usageQ.data ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
              <>
                <KpiCard icon={Wheat} color="#a16207" label={t('Recipe me laga · {{days}} din', { days })} value={cost(usageQ.data.totals.usedValue)} hint={t('{{items}} cheezein', { items: usageQ.data.totals.items })} />
                <KpiCard icon={TrendingDown} color="#e11d48" label={t('2 din me khatam')} value={String(usageQ.data.totals.runningOut)} hint={t('Isi raftaar par')} />
                <KpiCard icon={Truck} color="#0891b2" label={t('Khareeda')} value={String(usageQ.data.rows.filter((r) => r.bought > 0).length)} hint={t('cheezein is period me')} />
              </>
            )}
          </KpiRow>
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {usageQ.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div> : !usageRows.length ? (
              <p className="px-6 py-12 text-center text-[0.875rem] text-slate-500">{t('Is period me recipe se koi saamaan nahi laga')}</p>
            ) : (
              <Table>
                <THead>
                  <Tr><Th className="px-4 py-2.5">{t('Saamaan')}</Th><Th align="right" className="px-3 py-2.5">{t('Recipe me laga')}</Th><Th align="right" className="px-3 py-2.5">{t('Value')}</Th><Th align="right" className="px-3 py-2.5">{t('Khareeda')}</Th><Th align="right" className="px-3 py-2.5">{t('Stock')}</Th><Th align="right" className="px-3 py-2.5">{t('Roz')}</Th><Th align="right" className="px-4 py-2.5">{t('Kitne din')}</Th></Tr>
                </THead>
                <TBody>
                  {usageRows.map((r) => (
                    <Tr key={r.productId}>
                      <Td className="px-4 py-2.5"><Link to={`/restaurant-menu-items/${r.productId}`} className="font-medium text-slate-900 hover:text-brand-700">{r.name}</Link></Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums">{fmt(r.used)} {r.unit}</Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums">{cost(r.usedValue)}</Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums">{r.bought ? `${fmt(r.bought)} ${r.unit}` : '—'}</Td>
                      <Td className={cn('px-3 py-2.5 text-end tabular-nums', r.stock <= r.lowStockAlert && 'font-semibold text-rose-700')}>{fmt(r.stock)} {r.unit}</Td>
                      <Td align="right" className="px-3 py-2.5 tabular-nums text-slate-600">{fmt(r.perDay)}</Td>
                      <Td className={cn('px-4 py-2.5 text-end font-semibold tabular-nums', r.daysLeft !== null && r.daysLeft <= 2 ? 'text-rose-700' : 'text-slate-800')}>{r.daysLeft === null ? '—' : t('{{daysLeft}} din', { daysLeft: r.daysLeft })}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
          <p className="text-[0.75rem] text-slate-500">{t('"Recipe me laga" bikne wali dishes ki recipe se nikla saamaan hai. Stock ginti me farq ho to Stock adjustment se theek karein — wahan wajah ke saath record rehta hai.')}</p>
        </div>
      )}
    </PageShell>
  );
}

function RecipeRowView({ r, cook, cost, costHidden, canEdit, onEdit }: { r: RecipeRow; cook?: Cookability; cost: (n: number) => string; costHidden: boolean; canEdit: boolean; onEdit: () => void }) {
  const p = r.menuItem.product;
  const tone = foodCostTone(cook?.foodCostPct ?? null);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Link to={`/restaurant-menu-items/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <ProductThumb name={p.name} category={p.category?.name} url={p.images[0]?.url} size="md" />
        <span className="min-w-0">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{p.name}{!r.menuItem.isAvailable && <span className="ms-1.5 rounded bg-rose-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-rose-700">{t('Band hai')}</span>}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">{t('{{yieldQuantity}} plate · {{value}}{{value2}}', { yieldQuantity: fmt(r.yieldQuantity), value: r.ingredients.map((i) => i.ingredient?.name).filter(Boolean).slice(0, 5).join(', '), value2: r.ingredients.length > 5 ? '…' : '' })}</span>
        </span>
      </Link>
      <div className="flex flex-wrap items-center gap-4 text-[0.8125rem]">
        <span className="text-end"><span className="block text-[0.6875rem] text-slate-500">{t('Plate')}</span><strong className="tabular-nums">{cost(cook?.cost ?? 0)}</strong></span>
        <span className="text-end"><span className="block text-[0.6875rem] text-slate-500">{t('Food cost')}</span>
          <strong className={cn('tabular-nums', tone === 'bad' ? 'text-rose-700' : tone === 'warn' ? 'text-amber-700' : 'text-success-700')}>{costHidden || !cook?.price ? '—' : `${cook.foodCostPct}%`}</strong></span>
        <span className="min-w-[6rem] text-end"><span className="block text-[0.6875rem] text-slate-500">{t('Ban sakti')}</span>
          <strong className={cn('tabular-nums', cook?.canMake === 0 ? 'text-rose-700' : cook?.canMake != null && cook.canMake <= 5 ? 'text-amber-700' : 'text-slate-900')}>{cook?.canMake == null ? '—' : t('{{canMake}} plate', { canMake: cook.canMake })}</strong></span>
        {canEdit && <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>{t('Badlein')}</Button>}
      </div>
    </li>
  );
}

function CookRow({ r, canMenu, canBuy, busy, onToggle }: { r: Cookability; canMenu: boolean; canBuy: boolean; busy: boolean; onToggle: (on: boolean) => void }) {
  const out = r.canMake === 0;
  return (
    <li className={cn('flex flex-wrap items-center gap-3 px-4 py-3', out && 'bg-rose-50/40')}>
      <span className={cn('flex h-11 w-14 shrink-0 flex-col items-center justify-center rounded-xl text-center', out ? 'bg-rose-600 text-white' : r.canMake !== null && r.canMake <= 5 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800')}>
        <strong className="text-[1rem] leading-none tabular-nums">{r.canMake ?? '—'}</strong><span className="text-[0.625rem]">{t('plate')}</span>
      </span>
      <div className="min-w-0 flex-1">
        <Link to={`/restaurant-menu-items/${r.productId}`} className="block truncate text-[0.9375rem] font-semibold text-slate-900 hover:text-brand-700">{r.name}</Link>
        <p className="text-[0.75rem] text-slate-600">
          {out ? <>{t('Khatam:')}{' '} <strong className="text-rose-700">{r.missing.map((m) => m.name).join(', ') || r.blocker?.name}</strong></>
            : r.blocker ? <>{t('Pehle {{name}} khatam hoga · {{have}} {{unit}} hai, plate me {{need}}', { name: r.blocker.name, have: fmt(r.blocker.have), unit: r.blocker.unit, need: fmt(r.blocker.need) })}</> : t('Sab saamaan marzi ka')}
        </p>
      </div>
      {out && canBuy && <Link to="/purchases/new" className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.75rem] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><Truck className="h-3.5 w-3.5" />{t('Khareedein')}</Link>}
      {canMenu ? (
        <button type="button" disabled={busy} onClick={() => onToggle(!r.isAvailable)}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1', r.isAvailable ? (out ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-success-50 text-success-700 ring-success-200') : 'bg-rose-50 text-rose-700 ring-rose-200')}>
          <Power className="h-3.5 w-3.5" />{r.isAvailable ? (out ? t('Menu par — aaj band karein') : t('Menu par')) : r.offHere ? offLabel(r.offUntil) : t('Band (86)')}
        </button>
      ) : <span className="text-[0.75rem] text-slate-500">{r.isAvailable ? t('Menu par') : t('Band')}</span>}
    </li>
  );
}

function PickDish({ dishes, onClose, onPick }: { dishes: RestaurantMenuItem[]; onClose: () => void; onPick: (m: RestaurantMenuItem) => void }) {
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const rows = dishes.filter((m) => !term || String(m.product?.name ?? '').toLowerCase().includes(term));
  return (
    <Modal open onClose={onClose} size="md" title={t('Kis dish ki recipe?')} description={t('Yahan woh dishes hain jin ki recipe abhi nahi bani')}>
      <label className="relative block">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Dish ka naam…')} className={cn(controlClass(), 'h-10 ps-9 pe-3 text-[0.875rem]')} />
      </label>
      <ul className="mt-3 max-h-[50vh] space-y-1 overflow-y-auto">
        {rows.map((m) => (
          <li key={m.id}><button type="button" onClick={() => onPick(m)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-[0.875rem] hover:bg-slate-50">
            <span className="font-medium text-slate-900">{m.product?.name}</span><span className="text-[0.75rem] text-slate-500">{m.product?.category?.name}</span>
          </button></li>
        ))}
        {!rows.length && <li className="py-6 text-center text-[0.8125rem] text-slate-500">{dishes.length ? t('Koi dish nahi mili') : t('Har dish ki recipe ban chuki hai. Nayi dish menu me banayein.')}</li>}
      </ul>
      <p className="mt-3 text-[0.75rem] text-slate-500"><Trans text="Dish menu par nahi? {{link}} — wahin recipe bhi." values={{ link: <Link to="/restaurant-menu-items/new" className="font-semibold text-brand-700 hover:underline">{t('Nayi dish banayein')}</Link> }} /></p>
    </Modal>
  );
}

function RecipeModal({ target, canSave, onClose, onSaved }: { target: Target; canSave: boolean; onClose: () => void; onSaved: () => void }) {
  const q = useQuery({ queryKey: ['restaurant-recipe', target.menuItemId], queryFn: () => recipesApi.getByMenuItem(target.menuItemId) });
  const dishQ = useQuery({ queryKey: ['restaurant-menu-item', target.menuItemId], queryFn: () => menuItemsApi.getOne(target.menuItemId) });
  const sizes: Array<{ id: string; name: string; price: number; isActive: boolean }> = (dishQ.data?.product?.variants ?? []).filter((v: { isActive: boolean }) => v.isActive);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { if (q.isSuccess && !draft) setDraft(recipeFromApi(q.data)); }, [q.isSuccess, q.data, draft]);
  const problem = draft ? (draft.lines.length ? recipeProblem(draft) : t('Kam se kam ek cheez recipe me daalein')) : null;

  const save = useMutation({
    mutationFn: () => recipesApi.upsert(recipeInput(target.menuItemId, draft!, dishQ.isSuccess ? sizes : undefined)),
    onSuccess: () => { toast.success(t('{{name}} ki recipe save — plate {{value}} Rs', { name: target.name, value: recipeTotals(draft!).perPlate.toFixed(0) })); onSaved(); },
    onError: (e) => toast.error(errText(e, t('Save nahi hui'))),
  });
  const remove = useMutation({
    mutationFn: () => recipesApi.remove(q.data!.id),
    onSuccess: () => { toast.success(t('Recipe hata di — ab is dish se saamaan nahi katega')); onSaved(); },
    onError: (e) => toast.error(errText(e, t('Nahi hati'))),
  });
  const submit = () => { setTried(true); if (!problem && canSave && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <Modal open onClose={onClose} size="xl" title={t('{{name}} — recipe', { name: target.name })} description={t('Gram, ml ya adad me likhein; stock kilo/litre me ho to khud badal jata hai')}
      footer={<>
        {q.data && canSave && (confirmDelete
          ? <Button variant="danger" size="sm" loading={remove.isPending} onClick={() => remove.mutate()}>{t('Haan, hatayein')}</Button>
          : <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirmDelete(true)}>{t('Recipe hatayein')}</Button>)}
        {tried && problem ? <p className="me-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problem}</p> : <span className="me-auto hidden items-center gap-1 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{t('save')}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Band')}</Button>
        {canSave && <Button loading={save.isPending} onClick={submit}>{t('Save karein')}</Button>}
      </>}>
      {!draft ? <Skeleton className="h-72 rounded-2xl" /> : (
        <div className="space-y-4">
          {!canSave && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{t('Recipe badalne ke liye "Kitchen sambhalna" ki permission chahiye.')}</p>}
          <RecipeLinesEditor value={draft} onChange={setDraft} price={target.price} dishProductId={target.productId}
            sizes={sizes.map((v) => ({ name: v.name, price: Number(v.price) || target.price }))} />
          {draft.lines.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
              <Textarea label={t('Banane ka tareeqa (marzi)')} value={draft.preparationSteps} onChange={(e) => setDraft({ ...draft, preparationSteps: e.target.value.slice(0, 5000) })} rows={3}
                placeholder="1. …" />
              <Input label={t('Pakne me (min)')} inputMode="numeric" value={draft.cookingTime ?? ''} onChange={(e) => setDraft({ ...draft, cookingTime: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })}
                className="text-end" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

const GUIDE: GuideStep[] = [
  { icon: BookOpen, color: '#7c3aed', title: t('Recipe banayein'), text: t('Dish chunein, saamaan daalein: chicken 250 gram, oil 30 ml, pyaaz 1 adad. Degh ho to poori degh likh kar plate ginein.') },
  { icon: Wheat, color: '#a16207', title: t('Stock khud katta hai'), text: t('Dish kitchen me banne ya bill banne par recipe ka saamaan branch ke stock se nikal jata hai.') },
  { icon: Flame, color: '#ea580c', title: t('Plate ki cost'), text: t('Raw material ke aaj ke rate se. Purchase ka rate badle to "Rates taaza" dabayein — profit report isi cost se banti hai.') },
  { icon: ChefHat, color: '#e11d48', title: t('Ban sakti hai?'), text: t('Kitni plate aur ban sakti hain aur kaunsa saamaan pehle khatam hoga. Khatam ho to wahin se dish band (86) karein.') },
  { icon: Truck, color: '#0891b2', title: t('Saamaan ka istemal'), text: t('Recipe se kitna laga, kitna khareeda, kitna bacha aur kitne din chalega — chori ya zyada wastage yahin pakdi jati hai.') },
];
