/**
 * The rate grid of one price list: every item and its packs with retail,
 * wholesale (and cost for those who may see it), the rule price, and the
 * list's own rate to type. Typed rates are kept as a draft until Save; an
 * empty box hands the row back to the rule. "Base ± %" fills the page in one
 * go. Quantity breaks (a lower rate from N packs) are added per row.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Plus, Save, Search, Star, Trash2, Undo2, Users, Wand2, X } from 'lucide-react';
import { Badge, Button, Card, Input, Segmented, Select, Skeleton, Table, TBody, THead, Td, Th, Tr, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { DIST_KEY, distError, distSetupApi, type ListBase, type PriceGridRow, type PriceList, type PriceListItemRow } from '../../api/distribution.api';
import { rs } from '../../lib/meta';
import { num, useDebounced } from '../shared';
import { ruleText } from './PriceListFormModal';
import { PriceImportModal } from './PriceImportModal';
import { AssignCustomersModal } from './AssignCustomersModal';
import { QtyBreakModal } from './QtyBreakModal';

const LIMIT = 50;
const keyOf = (productId: string, unitId: string | null) => `${productId}|${unitId ?? ''}`;
const money = (n: number | null | undefined) => (n == null ? '—' : rs(n));

export function PriceListEditor({ list, canManage, onEdit }: { list: PriceList; canManage: boolean; onEdit: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [fillBase, setFillBase] = useState<ListBase>(list.basedOn);
  const [fillPct, setFillPct] = useState(String(list.adjustPct ?? 0));
  const [modal, setModal] = useState<'import' | 'customers' | { productId: string; name: string; rows: PriceGridRow[] } | null>(null);

  const gridQ = useQuery({
    queryKey: [DIST_KEY, 'price-grid', list.id, q, categoryId, page],
    queryFn: () => distSetupApi.priceGrid(list.id, { search: q || undefined, categoryId: categoryId || undefined, page, limit: LIMIT }),
    placeholderData: (p) => p,
  });
  const itemsQ = useQuery({
    queryKey: [DIST_KEY, 'price-items', list.id],
    queryFn: async () => {
      const out: PriceListItemRow[] = [];
      for (let p = 1; p <= 20; p++) {
        const r = await distSetupApi.priceItems(list.id, { page: p, limit: 500 });
        out.push(...r.items);
        if (out.length >= r.total || !r.items.length) break;
      }
      return out;
    },
  });
  const catsQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });

  /** Quantity breaks (rows with a min qty) per product and pack. */
  const breaks = useMemo(() => {
    const m = new Map<string, PriceListItemRow[]>();
    for (const it of itemsQ.data ?? []) {
      if (!(Number(it.minQty) > 0) || it.variantId) continue;
      const k = keyOf(it.productId, it.unitId ?? null);
      m.set(k, [...(m.get(k) ?? []), it].sort((a, b) => Number(a.minQty) - Number(b.minQty)));
    }
    return m;
  }, [itemsQ.data]);

  const grid = gridQ.data;
  const showCost = !!grid?.products.some((p) => p.rows.some((r) => r.cost !== undefined));
  const rowsOnPage = useMemo(() => grid?.products.flatMap((p) => p.rows.map((r) => ({ p, r }))) ?? [], [grid]);

  const changes = useMemo(() => Object.entries(draft).filter(([k, v]) => {
    const [productId, unitId] = k.split('|');
    const cur = rowsOnPage.find((x) => x.p.productId === productId && (x.r.unitId ?? '') === unitId)?.r.listPrice ?? null;
    const next = num(v);
    return (next ?? 0) > 0 ? next !== cur : cur != null;
  }), [draft, rowsOnPage]);
  const dirty = Object.keys(draft).length > 0;

  const save = useMutation({
    mutationFn: () => distSetupApi.savePriceItems(list.id, Object.entries(draft).map(([k, v]) => {
      const [productId, unitId] = k.split('|');
      return { productId, unitId: unitId || null, price: num(v) ?? 0 };
    })),
    onSuccess: (r) => {
      setDraft({});
      [['price-grid', list.id], ['price-items', list.id], ['price-lists']].forEach((k) => qc.invalidateQueries({ queryKey: [DIST_KEY, ...k] }));
      toast.success(`${r.saved} rate save${r.removed ? ` · ${r.removed} rule par wapas` : ''}`);
    },
    onError: (e) => toast.error(distError(e, 'Rates save nahi hue')),
  });
  const removeBreak = useMutation({
    mutationFn: (id: string) => distSetupApi.removePriceItems(list.id, [id]),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-items', list.id] }); qc.invalidateQueries({ queryKey: [DIST_KEY, 'price-lists'] }); },
    onError: (e) => toast.error(distError(e)),
  });
  const del = useMutation({
    mutationFn: () => distSetupApi.deletePriceList(list.id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [DIST_KEY] });
      toast.success(r.deleted ? 'List mita di' : `List band kar di — ${r.customers} customer ya Settings is par the`);
    },
    onError: (e) => toast.error(distError(e)),
  });

  const baseOf = (r: PriceGridRow, b: ListBase) => (b === 'COST' ? r.cost ?? null : b === 'WHOLESALE' ? r.wholesale ?? r.retail : r.retail);
  const fill = () => {
    const pct = Number(fillPct);
    if (!Number.isFinite(pct)) return;
    const next = { ...draft };
    let n = 0;
    for (const { p, r } of rowsOnPage) {
      const base = baseOf(r, fillBase);
      if (!(base && base > 0)) continue;
      next[keyOf(p.productId, r.unitId)] = String(Math.round(base * (1 + pct / 100)));
      n++;
    }
    setDraft(next);
    toast.success(`${n} rates bhar diye — dekh kar Save karein`);
  };
  const clearPage = () => {
    const next = { ...draft };
    for (const { p, r } of rowsOnPage) if (r.listPrice != null) next[keyOf(p.productId, r.unitId)] = '';
    setDraft(next);
  };

  type GridProduct = NonNullable<typeof grid>['products'][number];
  const rateCell = (p: GridProduct, r: PriceGridRow) => {
    const k = keyOf(p.productId, r.unitId);
    const typed = draft[k];
    const value = typed ?? (r.listPrice != null ? String(r.listPrice) : '');
    const edited = typed !== undefined;
    const v = num(value);
    const below = v != null && r.cost != null && v < r.cost;
    return (
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1">
          <input inputMode="decimal" aria-label={`${p.name} ${r.unitName} rate`} disabled={!canManage} value={value} placeholder="Rule"
            onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value.replace(/[^\d.]/g, '') }))}
            className={cn('h-8 w-28 rounded-lg border bg-white px-2 text-right text-[0.8125rem] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-brand-500/40 disabled:bg-slate-50',
              edited ? 'border-amber-400 bg-amber-50/60' : r.listPrice != null ? 'border-brand-300' : 'border-slate-200 text-slate-900 placeholder:font-normal placeholder:text-slate-300')} />
          {edited && <button type="button" aria-label="Wapas" onClick={() => setDraft((d) => { const n = { ...d }; delete n[k]; return n; })} className="rounded p-1 text-slate-400 hover:bg-slate-100"><Undo2 className="h-3.5 w-3.5" /></button>}
        </div>
        {below && <p className="mt-0.5 text-[0.6875rem] font-semibold text-rose-600">Cost se kam</p>}
      </div>
    );
  };
  const breakChips = (p: GridProduct, r: PriceGridRow, i: number) => {
    const br = breaks.get(keyOf(p.productId, r.unitId)) ?? [];
    return (
      <div className="flex flex-wrap items-center gap-1">
        {br.map((b) => (
          <span key={b.id} className="inline-flex h-6 items-center gap-1 rounded-full bg-violet-50 pl-2 pr-0.5 text-[0.6875rem] font-semibold text-violet-800 ring-1 ring-violet-100">
            {Number(b.minQty)}+ · {rs(b.price)}
            {canManage && <button type="button" aria-label="Hatayein" onClick={() => removeBreak.mutate(b.id)} className="rounded-full p-0.5 hover:bg-violet-100"><X className="h-3 w-3" /></button>}
          </span>
        ))}
        {canManage && i === 0 && (
          <button type="button" onClick={() => setModal({ productId: p.productId, name: p.name, rows: p.rows })} aria-label={`${p.name} zyada qty ka rate`}
            className="inline-flex h-6 items-center gap-0.5 rounded-full px-1.5 text-[0.6875rem] font-semibold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><Plus className="h-3 w-3" />Qty</button>
        )}
      </div>
    );
  };

  const pages = grid ? Math.max(1, Math.ceil(grid.total / grid.limit)) : 1;
  const catOptions = [{ value: '', label: 'Sab categories' }, ...((catsQ.data ?? []) as Array<{ id: string; name: string }>).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <div className="min-w-0 space-y-3">
      <Card className="rounded-2xl"
        title={<span className="inline-flex flex-wrap items-center gap-2">{list.name}{list.isDefault && <Badge size="xs" variant="warning"><Star className="h-3 w-3" />Default</Badge>}{!list.isActive && <Badge size="xs" variant="danger">Band</Badge>}</span>}
        description={<>List me na ho to: <b className="text-slate-700">{ruleText(list)}</b> · {list.itemCount ?? 0} apne rates · {list.customerCount ?? 0} customers</>}
        >
        {canManage && (
          <div className="-mt-1 mb-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" leftIcon={<Users className="h-4 w-4" />} onClick={() => setModal('customers')}>Customers</Button>
            <Button size="sm" variant="secondary" leftIcon={<FileSpreadsheet className="h-4 w-4" />} onClick={() => setModal('import')}>Excel import</Button>
            <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-4 w-4" />} onClick={onEdit}>Badlein</Button>
            <Button size="sm" variant="ghost" aria-label="List mitayein" onClick={async () => {
              if (await confirmDialog({ title: `${list.name} mitayein?`, text: 'Customers ya Settings is list par hon to list sirf band hogi, mitegi nahi.', yes: 'Mitayein', danger: true })) del.mutate();
            }}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
          </div>
        )}
        {canManage && (
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="mr-1 min-w-[10rem] flex-1">
              <p className="text-[0.8125rem] font-semibold text-slate-800">Jaldi bharein</p>
              <p className="text-[0.75rem] text-slate-500">Is page ke sab rows: base ± % (poore rupay)</p>
            </div>
            <Segmented label="Base" value={fillBase} onChange={setFillBase}
              items={[{ value: 'PRICE', label: 'Retail' }, { value: 'WHOLESALE', label: 'Wholesale' }, ...(showCost ? [{ value: 'COST' as ListBase, label: 'Cost' }] : [])]} />
            <Input size="sm" type="number" aria-label="Percent" value={fillPct} onChange={(e) => setFillPct(e.target.value)} wrapperClassName="w-24" rightIcon={<span className="text-xs">%</span>} />
            <Button size="sm" leftIcon={<Wand2 className="h-4 w-4" />} onClick={fill} disabled={!rowsOnPage.length}>Bharein</Button>
            <Button size="sm" variant="ghost" onClick={clearPage} disabled={!rowsOnPage.some((x) => x.r.listPrice != null)}>Sab rule par</Button>
          </div>
        )}
      </Card>

      <Card flush className="rounded-2xl">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <Input size="sm" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Item, SKU ya barcode" aria-label="Item dhoondein"
            leftIcon={<Search className="h-4 w-4" />} wrapperClassName="min-w-[12rem] flex-1" />
          <Select size="sm" aria-label="Category" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }} options={catOptions} wrapperClassName="w-48" />
        </div>

        {gridQ.isLoading ? <div className="p-4"><Skeleton className="h-72" /></div> : !grid?.products.length ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">{q || categoryId ? 'Is search me koi item nahi' : 'Koi item nahi — pehle Products me maal daalein'}</p>
        ) : (
          <>
          {/* Phones: one card per item, packs stacked. */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {grid.products.map((p) => (
              <li key={p.productId} className="space-y-2 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold text-slate-900">{p.name}</p>
                  {breakChips(p, p.rows[0], 0)}
                </div>
                {p.rows.map((r) => (
                  <div key={keyOf(p.productId, r.unitId)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-100">
                    <div className="min-w-0 flex-1 text-[0.75rem]">
                      <p className="font-semibold text-slate-800">{r.unitName}{r.conversionRate > 1 && <span className="font-normal text-slate-400"> · {r.conversionRate} {p.baseUnit}</span>}</p>
                      <p className="truncate text-slate-500">Retail {money(r.retail)} · Rule {money(r.rulePrice)}</p>
                    </div>
                    {rateCell(p, r)}
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <div className="hidden sm:block">
          <Table minWidth={showCost ? '52rem' : '46rem'}>
            <THead>
              <Tr>
                <Th>Item</Th><Th>Pack</Th><Th align="right">Retail / Wholesale</Th>
                {showCost && <Th align="right">Cost</Th>}
                <Th align="right">Rule se</Th><Th align="right">List rate</Th><Th>Qty par</Th>
              </Tr>
            </THead>
            <TBody>
              {grid.products.map((p) => p.rows.map((r, i) => (
                <Tr key={keyOf(p.productId, r.unitId)} className={cn(i === 0 && 'border-t-2 border-t-slate-100')}>
                  <Td className="max-w-[16rem]">
                    {i === 0 && <><p className="truncate font-semibold text-slate-900">{p.name}</p>{p.sku && <p className="font-mono text-[0.6875rem] text-slate-400">{p.sku}</p>}</>}
                  </Td>
                  <Td><span className="whitespace-nowrap text-[0.8125rem] text-slate-700">{r.unitName}{r.conversionRate > 1 && <span className="text-slate-400"> · {r.conversionRate} {p.baseUnit}</span>}</span></Td>
                  <Td align="right" className="whitespace-nowrap tabular-nums">
                    <span className="text-slate-700">{money(r.retail)}</span>
                    <span className="block text-[0.75rem] text-slate-400">{r.wholesale ? money(r.wholesale) : '—'}</span>
                  </Td>
                  {showCost && <Td align="right" className="whitespace-nowrap tabular-nums text-slate-400">{money(r.cost)}</Td>}
                  <Td align="right" className="whitespace-nowrap tabular-nums text-slate-500">{money(r.rulePrice)}</Td>
                  <Td align="right">{rateCell(p, r)}</Td>
                  <Td>{breakChips(p, r, i)}</Td>
                </Tr>
              )))}
            </TBody>
          </Table>
          </div>
          </>
        )}

        {grid && grid.total > grid.limit && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600">
            <span>{(page - 1) * grid.limit + 1}–{Math.min(page * grid.limit, grid.total)} / {grid.total} items</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((x) => x - 1)} aria-label="Pichla page"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" disabled={page >= pages} onClick={() => setPage((x) => x + 1)} aria-label="Agla page"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {dirty && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          <p className="mr-auto text-[0.8125rem] text-slate-600"><b className="text-slate-900">{changes.length}</b> rate badle — khali box rule par chala jata hai</p>
          <Button variant="secondary" onClick={() => setDraft({})}>Rehne dein</Button>
          <Button data-save-action loading={save.isPending} leftIcon={<Save className="h-4 w-4" />} onClick={() => save.mutate()}>Save karein</Button>
        </div>
      )}

      {modal === 'import' && <PriceImportModal list={list} onClose={() => setModal(null)} />}
      {modal === 'customers' && <AssignCustomersModal list={list} onClose={() => setModal(null)} />}
      {modal && typeof modal === 'object' && <QtyBreakModal list={list} product={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
