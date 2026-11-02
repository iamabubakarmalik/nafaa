/**
 * Multi-units for every industry: sell and buy a product by the pack (pack,
 * dozen, box, carton, bori, strip…) as well as loose. Lists products with
 * their packs from the server, a page at a time; packs are added and edited
 * inline, with one-tap presets that follow the product's base unit and the
 * shop's industry. Several products can get the same pack at once. KPIs
 * filter the list; Analytics shows coverage, price problems and purchases
 * by pack. Keys: / search · B bulk add · A analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Barcode, BarChart3, Boxes, CheckSquare, GraduationCap, Layers, ListChecks, PackagePlus, PackageSearch, Pencil, Plus,
  ScanLine, Square, Star, Tags, Trash2, Truck,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { useBranchName } from '@modules/inventory/combos/components/meta';
import { unitsPageApi, type OverviewProduct, type OverviewUnit, type UnitsFilter, type UnitsQuery } from '../api/units-page.api';
import { BulkAddModal } from '../components/BulkAddModal';
import { UnitEditor, apiMessage } from '../components/UnitEditor';
import { UnitsAnalytics } from '../components/UnitsAnalytics';
import { UNITS_KEY, UNIT_KEYS, presetsFor, qtyText } from '../components/meta';
import { unitsDoc } from '../components/print';
import { t as tr, Trans } from '@core/i18n';

const FILTERS: Record<UnitsFilter, string> = {
  all: tr('Sab products'), with: tr('Pack wale'), without: tr('Bina pack'), noBarcode: tr('Barcode nahi'), priceIssue: tr('Qeemat ke masle'),
};

type Editing = { productId: string; unitId?: string } | null;

export default function ProductUnitsPage() {
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const startHour = useBusinessDayStart();
  const { sales: money, cost, costHidden } = useMasked();
  const branch = useBranchName();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<UnitsFilter>('all');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [editing, setEditing] = useState<Editing>(null);
  const [selected, setSelected] = useState<Map<string, OverviewProduct>>(new Map());
  const [bulk, setBulk] = useState(false);
  const [scan, setScan] = useState(false);
  const [confirm, setConfirm] = useState<{ product: OverviewProduct; unit: OverviewUnit } | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [query, filter, categoryId]);

  const filters: Omit<UnitsQuery, 'page' | 'limit'> = { search: query || undefined, filter, categoryId: categoryId || undefined };
  const q: UnitsQuery = { ...filters, page, limit: 25 };
  const listQ = useQuery({ queryKey: [UNITS_KEY, 'list', q], queryFn: () => unitsPageApi.overview(q), placeholderData: (p) => p });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const data = listQ.data;
  const t = data?.totals;
  const period = resolveRange(range, startHour) ?? undefined;

  const invalidate = () => UNIT_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const quickAdd = useMutation({
    // Price and cost are left out, so the server sets loose rate × miqdar.
    mutationFn: ({ product, name, rate, type }: { product: OverviewProduct; name: string; rate: number; type: OverviewUnit['conversionType'] }) =>
      productUnitsApi.create({ productId: product.id, unitName: name, unitLabel: `${name} (${qtyText(rate)} ${product.unit})`, conversionType: type, conversionRate: rate }),
    onSuccess: (u) => { invalidate(); toast.success(tr('{{unitName}} jur gaya — qeemat {{price}}', { unitName: u.unitName, price: formatPKR(u.price) })); },
    onError: (e) => toast.error(apiMessage(e, tr('Pack nahi jura'))),
  });
  const removeM = useMutation({
    mutationFn: (id: string) => productUnitsApi.remove(id),
    onSuccess: () => { invalidate(); setConfirm(null); toast.success(tr('Pack mita diya')); },
    onError: (e) => toast.error(apiMessage(e, tr('Pack nahi mita'))),
  });
  const defaultM = useMutation({
    mutationFn: (u: OverviewUnit) => productUnitsApi.update(u.id, { isDefault: !u.isDefault }),
    onSuccess: (u) => { invalidate(); toast.success(u.isDefault ? tr('POS par ab pehle {{unitName}}', { unitName: u.unitName }) : tr('POS par asal unit pehle')); },
    onError: (e) => toast.error(apiMessage(e, tr('Nahi badla'))),
  });

  const filtered = filter !== 'all' || !!query || !!categoryId;
  const clear = () => { setFilter('all'); setSearch(''); setCategoryId(''); };
  const categoryName = (categoriesQ.data ?? []).find((c) => c.id === categoryId)?.name;
  const filterText = [filter !== 'all' && FILTERS[filter], categoryName, query && `"${query}"`].filter(Boolean).join(' · ');
  const printDoc = async () => unitsDoc(await unitsPageApi.overview({ ...filters, page: 1, limit: 200 }), filterText, branch);

  const pageItems = useMemo(() => data?.items ?? [], [data]);
  const allOnPage = pageItems.length > 0 && pageItems.every((p) => selected.has(p.id));
  const toggle = (p: OverviewProduct) => setSelected((m) => { const n = new Map(m); if (n.has(p.id)) n.delete(p.id); else n.set(p.id, p); return n; });
  const togglePage = () => setSelected((m) => {
    const n = new Map(m);
    if (allOnPage) pageItems.forEach((p) => n.delete(p.id)); else pageItems.forEach((p) => n.set(p.id, p));
    return n;
  });
  const openBulk = () => {
    if (!selected.size) { toast(tr('Pehle products ke aage nishan lagayein, phir "Kai products me pack"')); return; }
    setBulk(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); setTab((x) => (x === 'analytics' ? 'list' : 'analytics')); }
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); document.getElementById('units-bulk')?.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const kpi = (f: UnitsFilter) => ({ onClick: () => setFilter((v) => (v === f ? 'all' : f)), active: filter === f });

  return (
    <PageShell>
      <PageHero
        title={tr('Multi-units')}
        chip={<><Layers /> {' '}{tr('Pack · dozen · carton')}</>}
        meta={tr('Ek cheez khuli bhi, pack me bhi — alag qeemat aur barcode ke sath')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button id="units-bulk" type="button" onClick={openBulk} title={tr('Kai products me ek pack (B)')} className={heroButton}><Boxes className="h-4 w-4" /> {' '}{tr('Kai products me pack{{value}}', { value: selected.size ? ` (${selected.size})` : '' })}</button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: tr('Pack wale products'), value: t.withPacks, hint: `${Math.round(t.coverage)}%` },
          { label: tr('Kul packs'), value: t.packs },
          { label: tr('Barcode nahi'), value: t.noBarcode, hint: 'products' },
          { label: tr('Qeemat ke masle'), value: t.priceIssues, hint: 'products' },
        ] : [{ label: tr('Pack wale products'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Tags} color="#2563eb" label={tr('Sab products')} value={t.products} hint={tr('Chalu products')} {...kpi('all')} />
          <KpiCard icon={Layers} color="#16a34a" label={tr('Pack wale')} value={t.withPacks} hint={tr('{{coverage}}% ke pack hain', { coverage: Math.round(t.coverage) })} {...kpi('with')} />
          <KpiCard icon={PackagePlus} color="#7c3aed" label={tr('Bina pack')} value={Math.max(0, t.products - t.withPacks)} hint={tr('Pack jor sakte hain')} {...kpi('without')} />
          <KpiCard icon={Barcode} color="#d97706" label={tr('Barcode nahi')} value={t.noBarcode} hint={tr('Pack scan nahi hota')} {...kpi('noBarcode')} />
          <KpiCard icon={AlertTriangle} color="#e11d48" label={tr('Qeemat ke masle')} value={t.priceIssues} hint={tr('Khule se mehnga / nuqsan')} {...kpi('priceIssue')} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Product ka naam, SKU ya barcode (pack ka bhi)…')} label={tr('Search')}
          trailing={<Button variant="secondary" className="h-11" onClick={() => setScan(true)} leftIcon={<ScanLine className="h-4 w-4" />}><span className="hidden sm:inline">{tr('Scan')}</span></Button>} />}
        chips={filtered ? <>
          {filter !== 'all' && <FilterChip onRemove={() => setFilter('all')}>{FILTERS[filter]}</FilterChip>}
          {categoryName && <FilterChip onRemove={() => setCategoryId('')}>{categoryName}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label={tr('Dikhayein')} value={filter} active={filter !== 'all'} onChange={setFilter}
          options={(Object.keys(FILTERS) as UnitsFilter[]).map((k) => ({ value: k, label: FILTERS[k] }))} />
        <FilterMenu icon={Tags} label={tr('Category')} value={categoryId} active={!!categoryId} onChange={setCategoryId} width="w-72" align="right"
          options={[{ value: '', label: tr('Sab categories') }, ...(categoriesQ.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))]} />
        {tab === 'analytics' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        tabs={[{ id: 'list', label: tr('Products'), icon: Layers, count: data?.total ?? null }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]}
        right={tab === 'list' && pageItems.length ? (
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
            <button type="button" onClick={togglePage} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {allOnPage ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}{tr('Is safhe ke sab')}
            </button>
            {selected.size > 0 && <>
              <span className="text-slate-600">{tr('{{size}} chune', { size: selected.size })}</span>
              <Button size="sm" onClick={() => setBulk(true)} leftIcon={<Boxes className="h-4 w-4" />}>{tr('Sab me pack jorein')}</Button>
              <button type="button" onClick={() => setSelected(new Map())} className="text-[0.75rem] text-slate-500 hover:underline">{tr('saaf')}</button>
            </>}
            <span className="hidden text-[0.75rem] text-slate-500 lg:inline"><Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>B</Kbd> {' '}{tr('kai products ·')}{' '} <Kbd>A</Kbd> {' '}{tr('analytics')}</span>
          </div>
        ) : undefined} />

      {tab === 'analytics' ? (
        <UnitsAnalytics range={period ?? {}} money={money} cost={cost} costHidden={costHidden}
          onAddPack={(name) => { setTab('list'); setFilter('all'); setSearch(name); }} />
      ) : listQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}</div>
      ) : !pageItems.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <PackageSearch className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi product nahi') : tr('Abhi koi product nahi')}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{tr('Pehle products banayein, phir yahan un ke pack (dozen, carton, bori) jorein.')}</p>
          {filtered && <Button className="mt-4" variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
        </div>
      ) : (
        <ul className="space-y-2">
          {pageItems.map((p) => (
            <ProductRow key={p.id} p={p} industryId={industry?.id} costHidden={costHidden}
              selected={selected.has(p.id)} onSelect={() => toggle(p)}
              editing={editing?.productId === p.id ? editing : null}
              onEdit={(unitId) => setEditing({ productId: p.id, unitId })} onDoneEdit={() => setEditing(null)}
              busy={quickAdd.isPending || defaultM.isPending}
              onQuickAdd={(name, rate, type) => quickAdd.mutate({ product: p, name, rate, type })}
              onDefault={(u) => defaultM.mutate(u)}
              onDelete={(u) => setConfirm({ product: p, unit: u })} />
          ))}
        </ul>
      )}

      {tab === 'list' && data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}

      {scan && <BarcodeScanner title={tr('Product ya pack scan')} hint={tr('Product ya carton ka barcode rakhein')} onDetected={(c) => { setScan(false); setTab('list'); setFilter('all'); setSearch(c.trim()); }} onClose={() => setScan(false)} />}
      {bulk && <BulkAddModal products={[...selected.values()]} industryId={industry?.id} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected(new Map()); }} />}
      {confirm && (
        <Modal open onClose={() => setConfirm(null)} size="sm" title={tr('{{unitName}} mitayein?', { unitName: confirm.unit.unitName })}
          description={tr('{{name}} ka ye pack POS, purchase aur labels se hat jayega. Purane bills par asar nahi.', { name: confirm.product.name })}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(null)}>{tr('Rehne dein')}</Button>
            <Button variant="danger" loading={removeM.isPending} onClick={() => removeM.mutate(confirm.unit.id)} leftIcon={<Trash2 className="h-4 w-4" />}>{tr('Mita dein')}</Button>
          </>}>
          <p className="text-sm text-slate-600"><Trans text="Kuch der ke liye rokna ho to mitane ki bajaye pack ko {{off}} kar dein." values={{ off: <b>{tr('band')}</b> }} /></p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title={tr('Multi-units — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Layers, color: '#2563eb', title: tr('Asal unit aur pack'), text: tr('Har product ka ek asal unit hota hai (piece, kg, litre). Pack us ka guna hai — carton = 24 piece, bori = 50 kg. Stock hamesha asal unit me rehta hai.') },
            { icon: PackagePlus, color: '#16a34a', title: tr('Ek tap me pack'), text: tr('Product ke neeche wale chhote button (Dozen, Carton, Pao…) dabayein — pack ban jata hai, qeemat khule rate × quantity se khud lagti hai.') },
            { icon: Pencil, color: '#7c3aed', title: tr('Qeemat aur barcode'), text: tr('Pack par dabayein to badal sakte hain: apni qeemat, "2% kam" jaise button, wholesale rate aur carton ka barcode (scan ya naya banayein).') },
            { icon: Boxes, color: '#d97706', title: tr('Kai products ek sath'), text: tr('Products ke aage nishan lagayein aur "Kai products me pack" dabayein — sab me ek hi pack (misaal: carton = 24) jur jata hai.') },
            { icon: Star, color: '#f59e0b', title: tr('POS par pehle'), text: tr('Star wala pack POS par product chunte hi khulta hai. Wholesale wali dukaan carton ko pehle rakh sakti hai.') },
            { icon: Truck, color: '#0891b2', title: tr('Purchase aur analytics'), text: tr('Purchase me carton chun kar likhein, stock khud piece me barhta hai. Analytics me dikhta hai kitna maal pack me aaya aur kis pack ki qeemat ghalat hai.') },
          ]}
          tips={[
            tr('Lal "mehnga" ka matlab: pack khule se mehnga hai — customer khula le lega.'),
            tr('Pack ka barcode ho to POS par carton scan karte hi carton bill me aata hai.'),
            tr('Print se packs ka rate card A4, PDF ya thermal par nikaalein.'),
            tr('Jo pack kisi combo me laga ho woh nahi mitta — pehle combo se hatayein ya band karein.'),
          ]}
          shortcuts={[['/', tr('dhoondein')], ['B', tr('kai products me pack')], ['A', tr('analytics')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

function ProductRow({ p, industryId, costHidden, selected, onSelect, editing, onEdit, onDoneEdit, busy, onQuickAdd, onDefault, onDelete }: {
  p: OverviewProduct;
  industryId?: string;
  costHidden: boolean;
  selected: boolean;
  onSelect: () => void;
  editing: Editing;
  onEdit: (unitId?: string) => void;
  onDoneEdit: () => void;
  busy: boolean;
  onQuickAdd: (name: string, rate: number, type: OverviewUnit['conversionType']) => void;
  onDefault: (u: OverviewUnit) => void;
  onDelete: (u: OverviewUnit) => void;
}) {
  const packs = p.units.filter((u) => !u.isBase);
  const base = p.units.find((u) => u.isBase);
  const have = new Set(p.units.map((u) => u.unitName.trim().toLowerCase()));
  const presets = presetsFor(p.unit, industryId).filter((x) => !have.has(x.name.toLowerCase())).slice(0, 4);
  const editUnit = editing?.unitId ? p.units.find((u) => u.id === editing.unitId) : undefined;
  return (
    <li className={cn('overflow-hidden rounded-3xl bg-white shadow-sm ring-1', selected ? 'ring-2 ring-brand-400' : 'ring-slate-200/80')}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
        <button type="button" onClick={onSelect} aria-label={tr('Chunein')} aria-pressed={selected} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
          {selected ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5" />}
        </button>
        <ProductThumb name={p.name} category={p.category?.name} url={p.image} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">
            {tr('{{price}} / {{unit}} · stock {{stock}} {{unit}}{{value}}{{value2}}', { price: formatPKR(p.price), unit: p.unit, stock: qtyText(p.stock), value: p.sku ? ` · ${p.sku}` : '', value2: p.category ? ` · ${p.category.name}` : '' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((x) => (
            <button key={x.name} type="button" disabled={busy || !(p.price > 0)} onClick={() => onQuickAdd(x.name, x.rate, x.type)}
              title={p.price > 0 ? `${x.name} = ${qtyText(x.rate)} ${p.unit} · ${formatPKR(p.price * x.rate)}` : tr('Pehle product ki qeemat lagayein')}
              className="hidden rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40 md:inline-flex">
              + {x.name}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => onEdit()} leftIcon={<Plus className="h-4 w-4" />}>{tr('Pack')}</Button>
        </div>
      </div>

      {(packs.length > 0 || base) && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          {[...(base ? [base] : []), ...packs].map((u) => (
            <li key={u.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[0.8125rem] sm:ps-14', !u.isActive && 'opacity-60')}>
              <button type="button" onClick={() => onEdit(u.id)} className="min-w-0 text-start">
                <span className="font-semibold text-slate-900">{u.unitName}</span>
                {u.variantName && <span className="text-slate-500"> · {u.variantName}</span>}
                <span className="ms-1.5 text-slate-500">{u.isBase ? tr('asal unit') : `= ${qtyText(u.conversionRate)} ${p.unit}`}</span>
              </button>
              <span className="font-semibold tabular-nums text-slate-900">{formatPKR(u.price)}</span>
              {!u.isBase && u.saving > 0.5 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">{tr('{{saving}} bachat', { saving: formatPKR(u.saving) })}</span>}
              {u.dearer && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800 ring-1 ring-amber-200">{tr('khule se mehnga')}</span>}
              {u.loss && !costHidden && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700 ring-1 ring-rose-200">{tr('cost se kam')}</span>}
              {!u.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.6875rem] text-slate-600">{tr('band')}</span>}
              {!u.isBase && <span className="text-[0.75rem] text-slate-500">{tr('stock {{inStock}}', { inStock: qtyText(u.inStock) })}</span>}
              {u.barcode
                ? <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-slate-400"><Barcode className="h-3 w-3" />{u.barcode}</span>
                : !u.isBase && <span className="text-[0.6875rem] text-amber-700">{tr('barcode nahi')}</span>}
              <span className="ms-auto flex items-center gap-0.5">
                <button type="button" onClick={() => onDefault(u)} disabled={busy} title={u.isDefault ? tr('POS par pehle yahi khulta hai') : tr('POS par pehle ye kholein')} aria-label={tr('POS par pehle')}
                  className={cn('flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50', u.isDefault ? 'text-amber-500' : 'text-slate-300')}>
                  <Star className={cn('h-4 w-4', u.isDefault && 'fill-current')} />
                </button>
                <button type="button" onClick={() => onEdit(u.id)} aria-label={tr('Badlein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><Pencil className="h-3.5 w-3.5" /></button>
                {!u.isBase && <button type="button" onClick={() => onDelete(u)} aria-label={tr('Mitayein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="border-t border-slate-100 p-3 sm:p-4">
          <UnitEditor key={editing.unitId ?? 'new'} product={p} unit={editUnit} industryId={industryId} costHidden={costHidden} onDone={onDoneEdit} />
        </div>
      )}
    </li>
  );
}
