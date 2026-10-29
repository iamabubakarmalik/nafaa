/**
 * Bulk product editor: products (and their variants) in a spreadsheet grid
 * to change many at once — name, category, brand, price, cost, unit,
 * barcode, low-stock alert, status and stock.
 *
 * Only changed cells are saved, after the owner sees a summary. Product
 * fields go through the product update API in chunks. Stock is never written
 * directly: a changed stock cell becomes a stock count line in the chosen
 * branch, so the server posts the difference as an adjustment ("Bulk edit")
 * under the stock adjustment permission. Phones (IMEI), services and variant
 * parents keep their stock cell locked.
 *
 * Filters: branch, category, low stock, missing cost, products of one import, search.
 * "Cost = Sale price ka %" fills the Cost cells of the chosen lines (or every
 * line with no cost) from their sale price; nothing is saved until the review.
 * Keys: G guide (grid keys are listed in SheetGrid).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, Boxes, FileUp, GraduationCap, Loader2, Package, PencilLine, Percent, Save, Search, Table2, Tag, Undo2,
} from 'lucide-react';
import {
  Alert, Button, Checkbox, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { useBusinessFeatures } from '@core/hooks/useBusinessFeatures';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { bulkEditApi, importApi, type BulkEditChange, type BulkEditRow } from '../import/api';
import { SheetGrid, type GridColumn, type RowMark } from '../import/grid/SheetGrid';
import { SheetTools } from '../import/grid/SheetTools';
import { useSheetRows } from '../import/grid/useSheetRows';

type Key = 'name' | 'variant' | 'category' | 'brand' | 'price' | 'wholesalePrice' | 'creditPrice' | 'costPrice' | 'unit' | 'barcode' | 'lowStockAlert' | 'isActive' | 'stock';

const NUMERIC: Key[] = ['price', 'costPrice', 'lowStockAlert', 'stock'];
/** Numbers that may be left empty: an empty tier price means the retail price. */
const OPTIONAL_NUMERIC: Key[] = ['wholesalePrice', 'creditPrice'];
const PRODUCT_ONLY: Key[] = ['name', 'category', 'brand', 'unit', 'isActive'];
const LABEL: Record<Key, string> = {
  name: 'Name', variant: 'Variant', category: 'Category', brand: 'Brand', price: 'Retail Price', wholesalePrice: 'Wholesale Price', creditPrice: 'Credit Price', costPrice: 'Cost Price', unit: 'Unit',
  barcode: 'Barcode', lowStockAlert: 'Low Stock Alert', isActive: 'Status', stock: 'Stock',
};
const ACTIVE = 'Active';
const OFF = 'Band';
const UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'dozen', 'meter', 'packet', 'box', 'carton', 'bottle', 'strip', 'pair', 'bag'];
const SAVE_CHUNK = 100;
const STOCK_CHUNK = 200;

/** "Rs 1,250", "1250", "12.5" → number; null when it is not one. */
function num(v: string): number | null {
  const s = v.replace(/rs\.?|pkr|,|\s|\/-$/gi, '');
  if (!s) return null;
  return /^-?\d*\.?\d+$/.test(s) ? Number(s) : null;
}

const fmt = (n: number) => String(Math.round(n * 10_000) / 10_000);

function cellsOf(r: BulkEditRow): Record<string, string> {
  return {
    name: r.name, variant: r.variant, category: r.category, brand: r.brand, price: fmt(r.price),
    wholesalePrice: Number(r.wholesalePrice) > 0 ? fmt(Number(r.wholesalePrice)) : '', creditPrice: Number(r.creditPrice) > 0 ? fmt(Number(r.creditPrice)) : '',
    costPrice: r.costPrice === undefined ? '' : fmt(r.costPrice), unit: r.unit, barcode: r.barcode,
    lowStockAlert: fmt(r.lowStockAlert), isActive: r.isActive ? ACTIVE : OFF, stock: fmt(r.stock),
  };
}

/** What is wrong with a changed cell, or null. */
function cellError(key: Key, value: string): string | null {
  const v = value.trim();
  if (key === 'name' && !v) return 'Naam khaali nahi ho sakta';
  if (NUMERIC.includes(key)) {
    if (!v) return key === 'stock' ? 'Stock likhein (0 bhi chalega)' : 'Number likhein';
    const n = num(v);
    if (n === null) return `"${v}" number nahi`;
    if (n < 0) return 'Minus nahi ho sakta';
    if (key === 'price' && n === 0) return 'Price 0 nahi ho sakti';
  }
  if (OPTIONAL_NUMERIC.includes(key) && v) {
    const n = num(v);
    if (n === null) return `"${v}" number nahi`;
    if (n < 0) return 'Minus nahi ho sakta';
  }
  if (key === 'isActive' && ![ACTIVE, OFF].map((x) => x.toLowerCase()).includes(v.toLowerCase())) return `"${ACTIVE}" ya "${OFF}" likhein`;
  if (key === 'barcode' && /\s/.test(v)) return 'Barcode me khali jagah nahi';
  return null;
}

interface Plan {
  changes: BulkEditChange[];
  stock: Array<{ productId: string; variantId?: string; counted: number; label: string; from: number }>;
  lines: Array<{ id: number; label: string; key: Key; from: string; to: string }>;
  products: number;
  errors: number;
}

export default function ProductBulkEditPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const canStock = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const { costHidden, cost } = useMasked();
  const { quickUnits } = useBusinessFeatures();
  const user = useAuthStore((s) => s.user);
  const activeShop = useShopParam();
  const guide = usePageGuide();

  const lockedShop = user && user.role !== 'OWNER' && user.role !== 'SUPER_ADMIN' ? user.shopId ?? null : null;
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const shops = useMemo(() => (shopsQ.data ?? []).filter((s) => s.isActive), [shopsQ.data]);
  const [shopId, setShopId] = useState('');
  useEffect(() => {
    if (shopId || !shops.length) return;
    const preferred = lockedShop ?? (activeShop && shops.some((s) => s.id === activeShop) ? activeShop : null);
    setShopId(preferred ?? (shops.find((s) => s.isMain) ?? shops[0]).id);
  }, [shops, shopId, lockedShop, activeShop]);

  const jobId = params.get('job') ?? '';
  const categoryId = params.get('category') ?? '';
  const lowStock = params.get('low') === '1';
  const noCost = params.get('nocost') === '1';
  const [costTool, setCostTool] = useState(false);
  const [costPct, setCostPct] = useState('');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(params.get('q') ?? '');

  const jobsQ = useQuery({ queryKey: ['product-import-jobs'], queryFn: importApi.jobs, staleTime: 30_000 });
  const jobs = useMemo(() => (jobsQ.data ?? []).filter((j) => j.jobType === 'PRODUCTS' && (j.productCount ?? 0) > 0), [jobsQ.data]);

  const sheetQ = useQuery({
    queryKey: ['products-bulk-edit', shopId, categoryId, lowStock, noCost, jobId, query],
    queryFn: () => bulkEditApi.rows({ shopId, categoryId, lowStock, noCost, jobId, search: query }),
    enabled: !!shopId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const grid = useSheetRows();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState<{ done: number; total: number } | null>(null);
  const [failures, setFailures] = useState<Map<number, string>>(new Map());

  // id → source row and its loaded cells.
  const source = useMemo(() => new Map((sheetQ.data?.rows ?? []).map((r, i) => [i + 1, r])), [sheetQ.data]);
  const original = useMemo(() => new Map([...source].map(([id, r]) => [id, cellsOf(r)])), [source]);
  const loadedFor = useRef<unknown>(null);
  useEffect(() => {
    if (!sheetQ.data || loadedFor.current === sheetQ.data) return;
    loadedFor.current = sheetQ.data;
    grid.reset([...original].map(([id, cells]) => ({ id, cells: { ...cells } })));
    setSelected(new Set());
    setFailures(new Map());
  }, [sheetQ.data, original, grid]);

  const rowMap = useMemo(() => new Map(grid.rows.map((r) => [r.id, r])), [grid.rows]);
  const isChanged = useCallback((id: number, key: string) => {
    const row = rowMap.get(id);
    return !!row && (original.get(id)?.[key] ?? '') !== (row.cells[key] ?? '');
  }, [rowMap, original]);

  const changedRows = useMemo(() => grid.rows.filter((r) => {
    const o = original.get(r.id);
    return o && Object.keys(o).some((k) => (o[k] ?? '') !== (r.cells[k] ?? ''));
  }), [grid.rows, original]);

  const marks = useMemo(() => {
    const out = new Map<number, RowMark>();
    for (const r of changedRows) {
      const o = original.get(r.id)!;
      const cellErrors: Partial<Record<string, string>> = {};
      for (const k of Object.keys(o) as Key[]) {
        if ((o[k] ?? '') === (r.cells[k] ?? '')) continue;
        const err = cellError(k, r.cells[k] ?? '');
        if (err) cellErrors[k] = err;
      }
      const errs = Object.values(cellErrors).filter(Boolean) as string[];
      const failed = failures.get(r.id);
      out.set(r.id, errs.length || failed
        ? { tone: 'red', label: 'Ghalti', messages: failed ? [failed, ...errs] : errs, cellErrors }
        : { tone: 'amber', label: 'Badla', messages: ['Save karna baqi hai'] });
    }
    return out;
  }, [changedRows, original, failures]);

  const viewRows = useMemo(() => (onlyChanged ? changedRows : grid.rows), [onlyChanged, changedRows, grid.rows]);

  const lockOf = useCallback((key: Key) => (id: number): string | null => {
    const r = source.get(id);
    if (!r) return null;
    if (key === 'variant') return 'Variant ka naam product page se badlein';
    if (r.variantId && PRODUCT_ONLY.includes(key)) return 'Ye product ki line par badlein (variant ki nahi)';
    if (key === 'stock') {
      if (!canStock) return 'Stock adjustment ki ijazat nahi';
      if (r.stockLock === 'variants') return 'Is product ka stock har variant ki line par hai';
      if (r.stockLock === 'imei') return 'Phone ka stock IMEI se chalta hai — IMEI stock page se badlein';
      if (r.stockLock === 'service') return 'Service ka stock nahi hota';
    }
    return null;
  }, [source, canStock]);

  const categories = useMemo(() => (sheetQ.data?.categories ?? []).map((c) => c.name), [sheetQ.data]);
  const columns = useMemo<GridColumn[]>(() => {
    const keys: Key[] = ['name', 'variant', 'category', 'brand', 'price', 'wholesalePrice', 'creditPrice', ...(costHidden ? [] : ['costPrice' as const]), 'unit', 'barcode', 'lowStockAlert', 'isActive', 'stock'];
    const width: Partial<Record<Key, number>> = { name: 240, variant: 120, category: 140, brand: 120, wholesalePrice: 125, creditPrice: 110, barcode: 140, unit: 80, isActive: 90, lowStockAlert: 110 };
    return keys.map((k) => ({
      key: k,
      label: k === 'stock' ? `Stock${sheetQ.data?.shop ? ` (${sheetQ.data.shop.name})` : ''}` : LABEL[k],
      width: k === 'stock' ? 150 : width[k] ?? 100,
      numeric: NUMERIC.includes(k) || OPTIONAL_NUMERIC.includes(k),
      lock: lockOf(k),
      options: k === 'category' ? categories : k === 'brand' ? sheetQ.data?.brands : k === 'unit' ? [...new Set([...(quickUnits ?? []), ...UNITS])] : k === 'isActive' ? [ACTIVE, OFF] : undefined,
      hint: k === 'stock' ? 'Badalne par farq ka Stock adjustment ("Bulk edit") banta hai' : OPTIONAL_NUMERIC.includes(k) ? 'Khaali ho to Retail price lagegi' : undefined,
    }));
  }, [costHidden, lockOf, categories, sheetQ.data, quickUnits]);

  /** Changed cells turned into product saves and stock counts. */
  const plan = useMemo<Plan>(() => {
    const byProduct = new Map<string, BulkEditChange>();
    const stock: Plan['stock'] = [];
    const lines: Plan['lines'] = [];
    let errors = 0;
    for (const r of changedRows) {
      const src = source.get(r.id)!;
      const o = original.get(r.id)!;
      const label = src.variantId ? `${src.name} (${src.variant})` : src.name;
      const key = `${src.productId}:${src.variantId ?? ''}`;
      for (const k of Object.keys(o) as Key[]) {
        const to = r.cells[k] ?? '';
        if ((o[k] ?? '') === to) continue;
        if (cellError(k, to) || lockOf(k)(r.id)) { errors++; continue; }
        lines.push({ id: r.id, label, key: k, from: o[k] ?? '', to });
        if (k === 'stock') {
          stock.push({ productId: src.productId, ...(src.variantId && { variantId: src.variantId }), counted: num(to)!, label, from: src.stock });
          continue;
        }
        const ch = byProduct.get(key) ?? { productId: src.productId, ...(src.variantId && { variantId: src.variantId }) };
        if (k === 'price' || k === 'costPrice' || k === 'lowStockAlert') ch[k] = num(to)!;
        else if (k === 'wholesalePrice' || k === 'creditPrice') ch[k] = to.trim() && Number(num(to)) > 0 ? num(to) : null;
        else if (k === 'isActive') ch.isActive = to.trim().toLowerCase() === ACTIVE.toLowerCase();
        else if (k === 'name' || k === 'category' || k === 'brand' || k === 'unit' || k === 'barcode') ch[k] = to.trim();
        byProduct.set(key, ch);
      }
    }
    const products = new Set([...byProduct.values()].map((c) => c.productId).concat(stock.map((s) => s.productId))).size;
    return { changes: [...byProduct.values()], stock, lines, products, errors };
  }, [changedRows, source, original, lockOf]);

  const confirmDiscard = async () => !changedRows.length
    || confirmDialog({ title: 'Tabdeeliyan save nahi huin', text: `${changedRows.length} lines ki tabdeeliyan mit jayengi.`, yes: 'Mita dein', danger: true });

  const setFilter = async (key: string, value: string) => {
    if (!(await confirmDiscard())) return;
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const changeShop = async (id: string) => {
    if (!(await confirmDiscard())) return;
    setShopId(id);
  };

  const doSearch = async () => {
    if (search === query) return;
    if (!(await confirmDiscard())) { setSearch(query); return; }
    setQuery(search);
  };

  /** Saves in chunks: product fields first, then stock counts in the branch. */
  const save = async () => {
    setReview(false);
    const total = plan.changes.length + plan.stock.length;
    let done = 0;
    let failed = 0;
    const fail = new Map<number, string>();
    const idOf = (productId: string, variantId?: string | null) =>
      [...source].find(([, r]) => r.productId === productId && (r.variantId ?? null) === (variantId ?? null))?.[0];
    setSaving({ done, total });
    try {
      for (let i = 0; i < plan.changes.length; i += SAVE_CHUNK) {
        const res = await bulkEditApi.save(plan.changes.slice(i, i + SAVE_CHUNK));
        for (const r of res.results) {
          if (r.ok) continue;
          failed++;
          const id = idOf(r.productId, r.variantId);
          if (id) fail.set(id, r.error ?? 'Save nahi hua');
        }
        done += Math.min(SAVE_CHUNK, plan.changes.length - i);
        setSaving({ done, total });
      }
      if (plan.stock.length && sheetQ.data?.shop) {
        for (let i = 0; i < plan.stock.length; i += STOCK_CHUNK) {
          const part = plan.stock.slice(i, i + STOCK_CHUNK);
          try {
            await bulkEditApi.setStock(sheetQ.data.shop.id, part.map(({ productId, variantId, counted }) => ({ productId, variantId, counted })));
          } catch (e) {
            failed += part.length;
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message?.toString() ?? 'Stock nahi badla';
            for (const s of part) { const id = idOf(s.productId, s.variantId); if (id) fail.set(id, msg); }
          }
          done += part.length;
          setSaving({ done, total });
        }
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message?.toString() ?? 'Internet ya server ka masla';
      toast.error(`${msg} — jo save ho gaya wo save hai, baqi dobara karein`);
    } finally {
      setSaving(null);
    }
    void qc.invalidateQueries({ predicate: (q) => /product|catalog|stock|pos|low/i.test(String(q.queryKey[0])) });
    if (failed) {
      toast.error(`${total - failed} save hue, ${failed} nahi — laal lines dekhein`);
      setFailures(fail);
      setOnlyChanged(true);
    } else {
      toast.success(`${plan.products} products save ho gaye${plan.stock.length ? ` · ${plan.stock.length} stock adjustments` : ''}`);
      await sheetQ.refetch();
    }
  };

  /** Lines the cost tool fills: the chosen ones, else every line with no cost and a sale price. */
  const costTargets = useMemo(() => {
    const pool = selected.size ? viewRows.filter((r) => selected.has(r.id)) : viewRows.filter((r) => !(Number(num(r.cells.costPrice ?? '')) > 0));
    return pool.filter((r) => Number(num(r.cells.price ?? '')) > 0 && !lockOf('costPrice')(r.id));
  }, [selected, viewRows, lockOf]);
  const pct = Number(costPct);
  const pctOk = pct > 0 && pct <= 100;
  const applyCostPct = () => {
    if (!pctOk || !costTargets.length) return;
    grid.edit(costTargets.map((r) => ({ id: r.id, key: 'costPrice', value: String(Math.round((num(r.cells.price ?? '')! * pct) / 100 * 100) / 100) })));
    setCostTool(false);
    toast.success(`${costTargets.length} lines mein Cost bhar di — "Dekh kar save karein" se save karein`);
  };

  const shop = sheetQ.data?.shop;
  const stockUp = plan.stock.reduce((s, x) => s + Math.max(0, x.counted - x.from), 0);
  const stockDown = plan.stock.reduce((s, x) => s + Math.max(0, x.from - x.counted), 0);

  return (
    <PageShell>
      {guide.isOpen && <BulkEditGuide onClose={guide.close} />}
      <PageHero
        title="Bulk edit"
        chip={<><Table2 />Spreadsheet</>}
        meta={sheetQ.data?.job ? `Import: ${sheetQ.data.job.fileName}` : shop?.name ?? ''}
        actions={<>
          <button type="button" onClick={guide.open} title="Tareeqa (G)" className={heroButton}><GraduationCap className="h-4 w-4" /><span className="hidden sm:inline">Tareeqa</span></button>
          <Link to="/products/bulk-import" className={heroButton}><FileUp className="h-4 w-4" /><span className="hidden sm:inline">Excel import</span></Link>
          <Link to="/products" className={heroButton}><Package className="h-4 w-4" /><span className="hidden sm:inline">Products</span></Link>
        </>}
      />

      <div className="grid gap-3 rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 sm:grid-cols-2 sm:p-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.4fr)]">
        <Select label="Stock kis branch ka" value={shopId} disabled={!!lockedShop || shops.length < 2} onChange={(e) => void changeShop(e.target.value)}
          options={shops.map((s) => ({ value: s.id, label: s.name }))} />
        <Select label="Category" value={categoryId} onChange={(e) => void setFilter('category', e.target.value)}
          options={[{ value: '', label: 'Sab categories' }, { value: 'none', label: 'Bina category' }, ...(sheetQ.data?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label="Import" value={jobId} onChange={(e) => void setFilter('job', e.target.value)}
          options={[{ value: '', label: 'Sab products' }, ...jobs.map((j) => ({ value: j.id, label: `${j.fileName} · ${new Date(j.createdAt).toLocaleDateString('en-PK')} (${j.productCount})` }))]} />
        <div className="flex items-end pb-2">
          <div className="flex flex-col gap-1.5">
            <Checkbox label="Sirf low stock" checked={lowStock} onChange={(e) => void setFilter('low', e.target.checked ? '1' : '')} />
            {!costHidden && <Checkbox label="Sirf jin ki Cost nahi" checked={noCost} onChange={(e) => void setFilter('nocost', e.target.checked ? '1' : '')} />}
          </div>
        </div>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void doSearch(); }}>
          <Input label="Dhoondein" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam, SKU ya barcode" leftIcon={<Search className="h-4 w-4" />} wrapperClassName="flex-1" />
          <Button type="submit" variant="secondary">Dhoondein</Button>
        </form>
      </div>

      <KpiRow cols={4}>
        <KpiCard icon={Package} color="#475569" label="Lines" value={sheetQ.isLoading ? '…' : grid.rows.length} hint={sheetQ.data?.truncated ? 'Pehli 10,000 — filter lagayein' : `${new Set((sheetQ.data?.rows ?? []).map((r) => r.productId)).size} products`} />
        <KpiCard icon={PencilLine} color="#d97706" label="Badle hue" value={changedRows.length} active={onlyChanged} onClick={() => setOnlyChanged((x) => !x)} hint={changedRows.length ? 'Click: sirf badli hui lines' : 'Cell par likh kar badlein'} />
        <KpiCard icon={Boxes} color="#7c3aed" label="Stock adjustments" value={plan.stock.length} hint={plan.stock.length ? `+${fmt(stockUp)} / −${fmt(stockDown)}` : shop?.name} />
        <KpiCard icon={AlertTriangle} color="#e11d48" label="Ghalti" value={plan.errors} hint={plan.errors ? 'Laal cells theek karein' : 'Sab theek'} />
      </KpiRow>

      {!costHidden && (noCost || costTargets.length > 0) && (
        <Alert tone="warning" icon={<Percent className="h-4 w-4" />}
          title={noCost ? 'In cheezon ki Cost nahi likhi — in ki poori sale Profit gini ja rahi hai' : 'Cost jaldi bharein'}
          action={<Button size="sm" variant="secondary" leftIcon={<Percent className="h-4 w-4" />} disabled={!costTargets.length} onClick={() => setCostTool(true)}>Cost = Sale price ka %</Button>}>
          Cost cell me seedha likhein, ya Sale price ka % laga dein ({selected.size ? `${costTargets.length} chuni hui lines` : `${costTargets.length} lines jin ki Cost khaali hai`}).
        </Alert>
      )}

      {!canStock && <Alert tone="info">Stock column band hai — Stock adjustment ki ijazat wale user hi stock badal sakte hain.</Alert>}

      <SheetTools columns={columns} rows={viewRows} selected={selected} onEdit={(p) => grid.edit(p)}
        canUndo={grid.canUndo} canRedo={grid.canRedo} onUndo={grid.undo} onRedo={grid.redo} />

      {sheetQ.isLoading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-white text-slate-500 ring-1 ring-slate-200/80"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Products aa rahe hain…</div>
      ) : sheetQ.isError ? (
        <Alert tone="danger" title="Products nahi aaye" action={<Button size="sm" variant="secondary" onClick={() => void sheetQ.refetch()}>Dobara</Button>}>Internet dekh kar dobara koshish karein.</Alert>
      ) : (
        <SheetGrid rows={viewRows} columns={columns} marks={marks} selected={selected} onSelectedChange={setSelected}
          onEdit={(p) => grid.edit(p)} onUndo={grid.undo} onRedo={grid.redo} isChanged={isChanged} canAddRows={false}
          height={Math.max(360, Math.min(640, 36 + viewRows.length * 34 + 2))}
          emptyText={onlyChanged ? 'Abhi kuch nahi badla' : 'Is filter me koi product nahi'} />
      )}

      <div className="sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-lg ring-1 ring-slate-200">
        <p className="text-[0.8125rem] text-slate-600">
          {saving ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" />Save ho raha hai… {saving.done} / {saving.total}</span>
            : plan.products ? <><b className="text-slate-900">{plan.products} products badlenge</b> — save se pehle dekh lein</>
              : 'Cell par click kar ke likhein, ya Excel se paste karein'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" leftIcon={<Undo2 className="h-4 w-4" />} disabled={!changedRows.length || !!saving}
            onClick={async () => { if (await confirmDiscard()) grid.reset([...original].map(([id, cells]) => ({ id, cells: { ...cells } }))); }}>Sab wapas</Button>
          <Button leftIcon={<Save className="h-4 w-4" />} disabled={!plan.products || !!saving} onClick={() => setReview(true)}>Dekh kar save karein</Button>
        </div>
      </div>

      <Modal open={costTool} onClose={() => setCostTool(false)} size="sm" title="Cost = Sale price ka %"
        description={`${costTargets.length} lines: ${selected.size ? 'jo aap ne chuni hain' : 'jin ki Cost khaali hai'}. Save se pehle sab dikhega.`}
        footer={<>
          <Button variant="secondary" onClick={() => setCostTool(false)}>Rehne dein</Button>
          <Button disabled={!pctOk || !costTargets.length} onClick={applyCostPct}>Cost bharein</Button>
        </>}>
        <div className="space-y-3">
          <Input label="Sale price ka kitna % Cost hai" inputMode="decimal" value={costPct} autoFocus
            onChange={(e) => setCostPct(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Maslan 85" rightIcon={<Percent className="h-4 w-4" />} />
          <div className="flex flex-wrap gap-1.5">
            {[70, 75, 80, 85, 90].map((v) => (
              <button key={v} type="button" onClick={() => setCostPct(String(v))} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">{v}%</button>
            ))}
          </div>
          {pctOk && costTargets[0] && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">
              Maslan <b className="text-slate-800">{costTargets[0].cells.name || 'pehli line'}</b>: Sale price {formatPKR(num(costTargets[0].cells.price ?? '') ?? 0)} → Cost {formatPKR(Math.round((num(costTargets[0].cells.price ?? '')! * pct)) / 100)}
            </p>
          )}
          <p className="text-[0.75rem] text-slate-500">Andaza hai — asal Cost maloom ho to cell me likh dein. Pehle se likhi Cost tab hi badlegi jab line chuni hui ho.</p>
        </div>
      </Modal>

      <Modal open={review} onClose={() => setReview(false)} size="lg" title={`${plan.products} products badlenge — dekh lein`}
        description={plan.errors ? `${plan.errors} ghalat cells save nahi honge.` : 'Sirf badli hui cheezein save hongi.'}
        footer={<>
          <Button variant="secondary" onClick={() => setReview(false)}>Wapas</Button>
          <Button leftIcon={<Save className="h-4 w-4" />} onClick={() => void save()}>Save karein</Button>
        </>}>
        <div className="space-y-3">
          {plan.stock.length > 0 && (
            <Alert tone="warning" icon={<Boxes className="h-4 w-4" />} title={`${plan.stock.length} stock adjustments — ${shop?.name ?? ''}`}>
              Stock seedha nahi likha jata: har badli hui line ka farq Stock adjustment ("Bulk edit") ban kar jata hai aur stock report me dikhta hai.
              Kul +{fmt(stockUp)} / −{fmt(stockDown)}.
            </Alert>
          )}
          <ul className="max-h-[50vh] divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200 text-[0.8125rem]">
            {plan.lines.slice(0, 500).map((l, i) => (
              <li key={`${l.id}-${l.key}-${i}`} className="grid grid-cols-[minmax(0,1.4fr)_7rem_minmax(0,1.6fr)] gap-2 px-3 py-1.5">
                <span className="truncate font-semibold text-slate-800" title={l.label}>{l.label}</span>
                <span className="text-slate-500">{l.key === 'stock' ? <span className="inline-flex items-center gap-1"><Boxes className="h-3.5 w-3.5" />Stock</span> : l.key === 'price' ? <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Price</span> : LABEL[l.key]}</span>
                <span className="truncate tabular-nums">
                  <span className="text-slate-400 line-through">{show(l.key, l.from, cost)}</span>{' → '}<b className="text-slate-900">{show(l.key, l.to, cost)}</b>
                  {l.key === 'stock' && <span className={Number(num(l.to)) >= Number(num(l.from)) ? 'ml-1 text-emerald-700' : 'ml-1 text-rose-700'}>({fmtDiff((num(l.to) ?? 0) - (num(l.from) ?? 0))})</span>}
                </span>
              </li>
            ))}
            {plan.lines.length > 500 && <li className="px-3 py-2 text-center text-slate-500">aur {plan.lines.length - 500}…</li>}
          </ul>
        </div>
      </Modal>
    </PageShell>
  );
}

const fmtDiff = (n: number) => `${n >= 0 ? '+' : '−'}${fmt(Math.abs(n))}`;

function show(key: Key, v: string, cost: (n: number) => string) {
  if (!v) return 'khaali';
  if (key === 'price') return formatPKR(num(v) ?? 0);
  if (key === 'costPrice') return cost(num(v) ?? 0);
  if (key === 'wholesalePrice' || key === 'creditPrice') return formatPKR(num(v) ?? 0);
  return v;
}

function BulkEditGuide({ onClose }: { onClose: () => void }) {
  return (
    <PageGuide
      title="Bulk edit — bohat se products ek saath"
      onClose={onClose}
      steps={[
        { icon: Search, color: '#2563eb', title: 'Products chunein', text: 'Category, low stock ya kisi import ke products. Branch chunein jiska stock badalna hai.' },
        { icon: PencilLine, color: '#7c3aed', title: 'Cells badlein', text: 'Excel ki tarah: click, likhein, Enter. Kai lines chun kar "Column ek saath" se ek value lagayein. Excel se paste bhi.' },
        { icon: Boxes, color: '#ea580c', title: 'Stock', text: 'Stock likhne par farq ka Stock adjustment ("Bulk edit") banta hai — seedha nahi likha jata. Phone (IMEI) ka stock yahan band hai.' },
        { icon: Save, color: '#16a34a', title: 'Dekh kar save', text: 'Save se pehle sirf badli hui cheezein dikhti hain: purani → nayi. Phir hisson me save hota hai.' },
      ]}
      tips={[
        'Peeli cell = badli hui, abhi save nahi. Laal cell = ghalti, neeche wajah likhi hoti hai.',
        'Variant ki line par sirf Price, Cost, Barcode, Low Stock aur Stock badalte hain; naam, category waghera product ki line par.',
        'Status me "Active" ya "Band" likhein.',
        'Ctrl+Z se wapas, "Sab wapas" se saari tabdeeliyan mit jati hain.',
      ]}
      shortcuts={[['G', 'Ye guide'], ['Ctrl+Z', 'Wapas'], ['F2', 'Cell edit']]}
    />
  );
}

