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

const FILTERS: Record<UnitsFilter, string> = {
  all: 'Sab products', with: 'Pack wale', without: 'Bina pack', noBarcode: 'Barcode nahi', priceIssue: 'Qeemat ke masle',
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
    onSuccess: (u) => { invalidate(); toast.success(`${u.unitName} jur gaya — qeemat ${formatPKR(u.price)}`); },
    onError: (e) => toast.error(apiMessage(e, 'Pack nahi jura')),
  });
  const removeM = useMutation({
    mutationFn: (id: string) => productUnitsApi.remove(id),
    onSuccess: () => { invalidate(); setConfirm(null); toast.success('Pack mita diya'); },
    onError: (e) => toast.error(apiMessage(e, 'Pack nahi mita')),
  });
  const defaultM = useMutation({
    mutationFn: (u: OverviewUnit) => productUnitsApi.update(u.id, { isDefault: !u.isDefault }),
    onSuccess: (u) => { invalidate(); toast.success(u.isDefault ? `POS par ab pehle ${u.unitName}` : 'POS par asal unit pehle'); },
    onError: (e) => toast.error(apiMessage(e, 'Nahi badla')),
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
    if (!selected.size) { toast('Pehle products ke aage nishan lagayein, phir "Kai products me pack"'); return; }
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
        title="Multi-units"
        chip={<><Layers /> Pack · dozen · carton</>}
        meta="Ek cheez khuli bhi, pack me bhi — alag qeemat aur barcode ke sath"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <button id="units-bulk" type="button" onClick={openBulk} title="Kai products me ek pack (B)" className={heroButton}><Boxes className="h-4 w-4" /> Kai products me pack{selected.size ? ` (${selected.size})` : ''}</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: 'Pack wale products', value: t.withPacks, hint: `${Math.round(t.coverage)}%` },
          { label: 'Kul packs', value: t.packs },
          { label: 'Barcode nahi', value: t.noBarcode, hint: 'products' },
          { label: 'Qeemat ke masle', value: t.priceIssues, hint: 'products' },
        ] : [{ label: 'Pack wale products', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Tags} color="#2563eb" label="Sab products" value={t.products} hint="Chalu products" {...kpi('all')} />
          <KpiCard icon={Layers} color="#16a34a" label="Pack wale" value={t.withPacks} hint={`${Math.round(t.coverage)}% ke pack hain`} {...kpi('with')} />
          <KpiCard icon={PackagePlus} color="#7c3aed" label="Bina pack" value={Math.max(0, t.products - t.withPacks)} hint="Pack jor sakte hain" {...kpi('without')} />
          <KpiCard icon={Barcode} color="#d97706" label="Barcode nahi" value={t.noBarcode} hint="Pack scan nahi hota" {...kpi('noBarcode')} />
          <KpiCard icon={AlertTriangle} color="#e11d48" label="Qeemat ke masle" value={t.priceIssues} hint="Khule se mehnga / nuqsan" {...kpi('priceIssue')} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Product ka naam, SKU ya barcode (pack ka bhi)…" label="Dhoondein"
          trailing={<Button variant="secondary" className="h-11" onClick={() => setScan(true)} leftIcon={<ScanLine className="h-4 w-4" />}><span className="hidden sm:inline">Scan</span></Button>} />}
        chips={filtered ? <>
          {filter !== 'all' && <FilterChip onRemove={() => setFilter('all')}>{FILTERS[filter]}</FilterChip>}
          {categoryName && <FilterChip onRemove={() => setCategoryId('')}>{categoryName}</FilterChip>}
          {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label="Dikhayein" value={filter} active={filter !== 'all'} onChange={setFilter}
          options={(Object.keys(FILTERS) as UnitsFilter[]).map((k) => ({ value: k, label: FILTERS[k] }))} />
        <FilterMenu icon={Tags} label="Category" value={categoryId} active={!!categoryId} onChange={setCategoryId} width="w-72" align="right"
          options={[{ value: '', label: 'Sab categories' }, ...(categoriesQ.data ?? []).filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name }))]} />
        {tab === 'analytics' && <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        tabs={[{ id: 'list', label: 'Products', icon: Layers, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]}
        right={tab === 'list' && pageItems.length ? (
          <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
            <button type="button" onClick={togglePage} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              {allOnPage ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4" />}Is safhe ke sab
            </button>
            {selected.size > 0 && <>
              <span className="text-slate-600">{selected.size} chune</span>
              <Button size="sm" onClick={() => setBulk(true)} leftIcon={<Boxes className="h-4 w-4" />}>Sab me pack jorein</Button>
              <button type="button" onClick={() => setSelected(new Map())} className="text-[0.75rem] text-slate-500 hover:underline">saaf</button>
            </>}
            <span className="hidden text-[0.75rem] text-slate-500 lg:inline"><Kbd>/</Kbd> dhoondein · <Kbd>B</Kbd> kai products · <Kbd>A</Kbd> analytics</span>
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
          <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi product nahi' : 'Abhi koi product nahi'}</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Pehle products banayein, phir yahan un ke pack (dozen, carton, bori) jorein.</p>
          {filtered && <Button className="mt-4" variant="ghost" onClick={clear}>Filter saaf karein</Button>}
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
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      {scan && <BarcodeScanner title="Product ya pack scan" hint="Product ya carton ka barcode rakhein" onDetected={(c) => { setScan(false); setTab('list'); setFilter('all'); setSearch(c.trim()); }} onClose={() => setScan(false)} />}
      {bulk && <BulkAddModal products={[...selected.values()]} industryId={industry?.id} onClose={() => setBulk(false)} onDone={() => { setBulk(false); setSelected(new Map()); }} />}
      {confirm && (
        <Modal open onClose={() => setConfirm(null)} size="sm" title={`${confirm.unit.unitName} mitayein?`}
          description={`${confirm.product.name} ka ye pack POS, kharidari aur labels se hat jayega. Purane bills par asar nahi.`}
          footer={<>
            <Button variant="secondary" onClick={() => setConfirm(null)}>Rehne dein</Button>
            <Button variant="danger" loading={removeM.isPending} onClick={() => removeM.mutate(confirm.unit.id)} leftIcon={<Trash2 className="h-4 w-4" />}>Mita dein</Button>
          </>}>
          <p className="text-sm text-slate-600">Kuch der ke liye rokna ho to mitane ki bajaye pack ko <b>band</b> kar dein.</p>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Multi-units — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Layers, color: '#2563eb', title: 'Asal unit aur pack', text: 'Har product ka ek asal unit hota hai (piece, kg, litre). Pack us ka guna hai — carton = 24 piece, bori = 50 kg. Stock hamesha asal unit me rehta hai.' },
            { icon: PackagePlus, color: '#16a34a', title: 'Ek tap me pack', text: 'Product ke neeche wale chhote button (Dozen, Carton, Pao…) dabayein — pack ban jata hai, qeemat khule rate × miqdar se khud lagti hai.' },
            { icon: Pencil, color: '#7c3aed', title: 'Qeemat aur barcode', text: 'Pack par dabayein to badal sakte hain: apni qeemat, "2% kam" jaise button, wholesale rate aur carton ka barcode (scan ya naya banayein).' },
            { icon: Boxes, color: '#d97706', title: 'Kai products ek sath', text: 'Products ke aage nishan lagayein aur "Kai products me pack" dabayein — sab me ek hi pack (misaal: carton = 24) jur jata hai.' },
            { icon: Star, color: '#f59e0b', title: 'POS par pehle', text: 'Star wala pack POS par product chunte hi khulta hai. Wholesale wali dukaan carton ko pehle rakh sakti hai.' },
            { icon: Truck, color: '#0891b2', title: 'Kharidari aur analytics', text: 'Kharidari me carton chun kar likhein, stock khud piece me barhta hai. Analytics me dikhta hai kitna maal pack me aaya aur kis pack ki qeemat ghalat hai.' },
          ]}
          tips={[
            'Lal "mehnga" ka matlab: pack khule se mehnga hai — customer khula le lega.',
            'Pack ka barcode ho to POS par carton scan karte hi carton bill me aata hai.',
            'Print se packs ka rate card A4, PDF ya thermal par nikaalein.',
            'Jo pack kisi combo me laga ho woh nahi mitta — pehle combo se hatayein ya band karein.',
          ]}
          shortcuts={[['/', 'dhoondein'], ['B', 'kai products me pack'], ['A', 'analytics'], ['G', 'guide']]}
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
        <button type="button" onClick={onSelect} aria-label="Chunein" aria-pressed={selected} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
          {selected ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5" />}
        </button>
        <ProductThumb name={p.name} category={p.category?.name} url={p.image} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.name}</p>
          <p className="truncate text-[0.75rem] text-slate-500">
            {formatPKR(p.price)} / {p.unit} · stock {qtyText(p.stock)} {p.unit}{p.sku ? ` · ${p.sku}` : ''}{p.category ? ` · ${p.category.name}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((x) => (
            <button key={x.name} type="button" disabled={busy || !(p.price > 0)} onClick={() => onQuickAdd(x.name, x.rate, x.type)}
              title={p.price > 0 ? `${x.name} = ${qtyText(x.rate)} ${p.unit} · ${formatPKR(p.price * x.rate)}` : 'Pehle product ki qeemat lagayein'}
              className="hidden rounded-full px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-800 disabled:opacity-40 md:inline-flex">
              + {x.name}
            </button>
          ))}
          <Button size="sm" variant="secondary" onClick={() => onEdit()} leftIcon={<Plus className="h-4 w-4" />}>Pack</Button>
        </div>
      </div>

      {(packs.length > 0 || base) && (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60">
          {[...(base ? [base] : []), ...packs].map((u) => (
            <li key={u.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-[0.8125rem] sm:pl-14', !u.isActive && 'opacity-60')}>
              <button type="button" onClick={() => onEdit(u.id)} className="min-w-0 text-left">
                <span className="font-semibold text-slate-900">{u.unitName}</span>
                {u.variantName && <span className="text-slate-500"> · {u.variantName}</span>}
                <span className="ml-1.5 text-slate-500">{u.isBase ? 'asal unit' : `= ${qtyText(u.conversionRate)} ${p.unit}`}</span>
              </button>
              <span className="font-semibold tabular-nums text-slate-900">{formatPKR(u.price)}</span>
              {!u.isBase && u.saving > 0.5 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-emerald-700">{formatPKR(u.saving)} bachat</span>}
              {u.dearer && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800 ring-1 ring-amber-200">khule se mehnga</span>}
              {u.loss && !costHidden && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700 ring-1 ring-rose-200">lagat se kam</span>}
              {!u.isActive && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[0.6875rem] text-slate-600">band</span>}
              {!u.isBase && <span className="text-[0.75rem] text-slate-500">stock {qtyText(u.inStock)}</span>}
              {u.barcode
                ? <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-slate-400"><Barcode className="h-3 w-3" />{u.barcode}</span>
                : !u.isBase && <span className="text-[0.6875rem] text-amber-700">barcode nahi</span>}
              <span className="ml-auto flex items-center gap-0.5">
                <button type="button" onClick={() => onDefault(u)} disabled={busy} title={u.isDefault ? 'POS par pehle yahi khulta hai' : 'POS par pehle ye kholein'} aria-label="POS par pehle"
                  className={cn('flex h-8 w-8 items-center justify-center rounded-lg hover:bg-amber-50', u.isDefault ? 'text-amber-500' : 'text-slate-300')}>
                  <Star className={cn('h-4 w-4', u.isDefault && 'fill-current')} />
                </button>
                <button type="button" onClick={() => onEdit(u.id)} aria-label="Badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><Pencil className="h-3.5 w-3.5" /></button>
                {!u.isBase && <button type="button" onClick={() => onDelete(u)} aria-label="Mitayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>}
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
