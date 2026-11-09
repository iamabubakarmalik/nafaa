/**
 * Stock forecast: how fast each product sells (7/30/90 days, last year's
 * season and festival days), when it runs out, and how much to order from
 * which supplier, rounded to the supplier's pack. Dead and extra stock show
 * the money tied up. "Purchase order banayein" opens the purchase editor with
 * the lines of one supplier, unsaved, so the order stays a draft until saved.
 *
 * Keys: / search, G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, Flame, GraduationCap, Layers, Package, PackageX, RefreshCw, ShoppingCart, Snail, Tag, Truck, TrendingUp, Warehouse,
} from 'lucide-react';
import {
  Button, EmptyState, FilterBar, FilterMenu, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useIsAllShops, useShopParam } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import type { PurchasePrefill } from '@modules/purchasing/purchases/editor/PurchaseEditorPage';
import { FORECAST_KEY, forecastApi, type ForecastClass, type ForecastFilter, type ForecastRow, type ForecastSort, type OrderGroup } from '../api';
import { t } from '@core/i18n';

const CLASS: Record<ForecastClass, { label: string; color: string }> = {
  fast: { label: t('Tez bikta'), color: '#16a34a' },
  normal: { label: t('Theek'), color: '#64748b' },
  slow: { label: t('Aahista'), color: '#d97706' },
  dead: { label: t('Dead stock'), color: '#e11d48' },
  overstock: { label: t('Zyada stock'), color: '#7c3aed' },
  new: { label: t('Naya'), color: '#0284c7' },
  none: { label: t('Bikri nahi'), color: '#94a3b8' },
};

const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 1 : 0));
const dayLabel = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '');

function Spark({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const w = 84, h = 24, step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function coverText(r: ForecastRow) {
  if (r.cover === null) return r.stock > 0 ? t('Bik nahi raha') : t('Stock nahi');
  if (r.stock <= 0) return t('Khatam');
  if (r.cover < 1) return t('Aaj khatam');
  return t('{{days}} din · {{date}}', { days: Math.floor(r.cover), date: dayLabel(r.stockOut) });
}

export default function ForecastPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const shopParam = useShopParam();
  const isAll = useIsAllShops();
  const { cost } = useMasked();
  const canOrder = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const searchRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<ForecastFilter>('all');
  const [sort, setSort] = useState<ForecastSort>('urgency');
  const [categoryId, setCategoryId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState<OrderGroup[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { const id = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(id); }, [search]);
  useEffect(() => { setPage(1); }, [filter, sort, categoryId, supplierId, query, shopParam]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const params = {
    filter, sort, page, limit: 40, search: query || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    supplierId: supplierId === 'all' ? undefined : supplierId,
  };
  const q = useQuery({ queryKey: [FORECAST_KEY, shopParam, params], queryFn: () => forecastApi.list(params), placeholderData: (p) => p });
  const d = q.data;
  const s = d?.summary;

  const refresh = async () => {
    setRefreshing(true);
    try {
      await forecastApi.list({ ...params, refresh: true });
      await qc.invalidateQueries({ queryKey: [FORECAST_KEY] });
      toast.success(t('Hisaab dobara lag gaya'));
    } catch {
      toast.error(t('Hisaab nahi laga, dobara koshish karein'));
    } finally {
      setRefreshing(false);
    }
  };

  const openOrders = async (productIds?: string[]) => {
    if (isAll) { toast.error(t('Order ek branch ka banta hai — upar se branch chunein')); return; }
    try {
      const r = await forecastApi.orderGroups(productIds);
      if (!r.groups.length) { toast.error(t('Abhi kuch mangwane ki zaroorat nahi')); return; }
      setGroups(r.groups);
    } catch {
      toast.error(t('Order list nahi bani'));
    }
  };
  const handoff = (g: OrderGroup) => {
    const prefill: PurchasePrefill = { supplierId: g.supplier?.id, supplierName: g.supplier?.name, lines: g.lines.map((l) => ({ productId: l.productId, qty: l.qty })) };
    navigate('/purchases/new?order=1', { state: { prefill } });
  };

  const categoryOptions = useMemo(() => [{ value: 'all', label: t('Sab categories') }, ...(d?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))], [d?.categories]);
  const supplierOptions = useMemo(() => [
    { value: 'all', label: t('Sab suppliers') }, { value: 'none', label: t('Supplier nahi') },
    ...(d?.suppliers ?? []).map((x) => ({ value: x.id, label: x.name })),
  ], [d?.suppliers]);
  const pages = d ? Math.max(1, Math.ceil(d.total / d.limit)) : 1;

  const tile = (key: ForecastFilter, icon: typeof Flame, color: string, label: string, value: string, hint: string) => (
    <KpiCard icon={icon} color={color} label={label} value={value} hint={hint} active={filter === key} onClick={() => setFilter(filter === key ? 'all' : key)} />
  );

  return (
    <PageShell>
      <PageHero
        title={t('Stock forecast')}
        chip={<><TrendingUp />{t('Kab khatam, kitna mangwayein')}</>}
        meta={d ? t('{{count}} cheezein · hisaab {{time}} ka', { count: s?.products ?? 0, time: new Date(d.computedAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }) : t('Bikri ki raftaar se aage ka andaza')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <Link to="/low-stock" className={heroButton}><AlertTriangle className="h-4 w-4" /> <span className="hidden sm:inline">{t('Low stock')}</span></Link>
          <button type="button" onClick={refresh} disabled={refreshing} className={heroButton}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} /> <span className="hidden sm:inline">{t('Dobara hisaab')}</span></button>
          {canOrder && <button type="button" onClick={() => openOrders()} className={heroButton}><ShoppingCart className="h-4 w-4" /> <span className="hidden sm:inline">{t('Purchase order banayein')}</span></button>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('7 din me khatam'), value: s ? String(s.stockOut7) : '' },
          { label: t('Dead stock'), value: s ? cost(s.deadValue) : '' },
          { label: t('Zyada stock'), value: s ? cost(s.overValue) : '' },
          { label: t('Mangwane ka maal'), value: s ? cost(s.reorderValue) : '' },
        ]}
      />

      {q.isError ? (
        <EmptyState title={t('Forecast nahi khula')} description={t('Internet check karke dobara koshish karein')} action={<Button variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} />
      ) : (
        <>
          <KpiRow cols={5}>
            {!s ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
              {tile('stockout7', CalendarClock, '#e11d48', t('7 din me khatam'), String(s.stockOut7), t('{{count}} abhi khatam', { count: s.outNow }))}
              {tile('reorder', ShoppingCart, '#2563eb', t('Ab mangwayein'), String(s.reorderCount), cost(s.reorderValue))}
              {tile('fast', Flame, '#16a34a', t('Tez bikta'), String(s.fast), t('Sab se zyada bikne wale'))}
              {tile('dead', PackageX, '#be123c', t('Dead stock'), String(s.deadCount), cost(s.deadValue))}
              {tile('overstock', Warehouse, '#7c3aed', t('Zyada stock'), String(s.overCount), cost(s.overValue))}
            </>}
          </KpiRow>

          {!!s?.festivals.length && (
            <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
              {t('Aage tehwar/sale aa rahi hai — jin cheezon ka pichhle saal ka record nahi, un ki maang thodi barha kar lagayi hai.')}
            </p>
          )}

          <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam ya SKU se dhoondein ( / )')} />}>
            <FilterMenu icon={Layers} label={t('Qism')} value={filter} onChange={setFilter} active={filter !== 'all'} options={[
              { value: 'all', label: t('Sab') }, { value: 'stockout7', label: t('7 din me khatam') }, { value: 'reorder', label: t('Ab mangwayein') },
              { value: 'fast', label: t('Tez bikta') }, { value: 'slow', label: t('Aahista') }, { value: 'dead', label: t('Dead stock') }, { value: 'overstock', label: t('Zyada stock') },
            ]} />
            <FilterMenu icon={Tag} label={t('Category')} value={categoryId} onChange={setCategoryId} active={categoryId !== 'all'} options={categoryOptions} />
            <FilterMenu icon={Truck} label={t('Supplier')} value={supplierId} onChange={setSupplierId} active={supplierId !== 'all'} options={supplierOptions} />
            <FilterMenu icon={TrendingUp} label={t('Tarteeb')} value={sort} onChange={setSort} align="right" options={[
              { value: 'urgency', label: t('Pehle jo jaldi khatam') }, { value: 'value', label: t('Order ki raqam') }, { value: 'tied', label: t('Phansa hua paisa') },
              { value: 'demand', label: t('Roz ki bikri') }, { value: 'name', label: t('Naam') },
            ]} />
          </FilterBar>

          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <div className="hidden grid-cols-[minmax(0,2.2fr)_6rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_7rem] gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid">
              <span>{t('Cheez')}</span><span>{t('12 hafte')}</span><span>{t('Roz ki bikri')}</span><span>{t('Kab khatam')}</span><span>{t('Mangwayein')}</span><span />
            </div>
            {q.isLoading ? (
              <div className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : !d?.items.length ? (
              <EmptyState icon={<Package className="h-5 w-5" />} title={t('Is filter me kuch nahi')} description={t('Filter badal kar dekhein')} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {d.items.map((r) => {
                  const c = CLASS[r.cls];
                  const urgent = r.cover !== null && r.cover <= 7;
                  return (
                    <li key={r.productId} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,2.2fr)_6rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_7rem] lg:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        {r.image ? <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover ring-1 ring-slate-200" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100"><Package className="h-4 w-4 text-slate-400" /></div>}
                        <div className="min-w-0">
                          <Link to={`/products/${r.productId}`} className="block truncate font-semibold text-slate-900 hover:underline">{r.name}</Link>
                          <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-slate-500">
                            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: c.color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: c.color }} />{c.label}</span>
                            <span>{t('Stock {{stock}} {{unit}}', { stock: num(r.stock), unit: r.unit })}</span>
                            {r.onOrder > 0 && <span>{t('Order me {{qty}}', { qty: num(r.onOrder) })}</span>}
                            {r.supplier && <span className="truncate">{r.supplier.name}</span>}
                          </p>
                        </div>
                      </div>
                      <Spark values={r.spark} color={c.color} />
                      <div className="text-[0.8125rem]">
                        <p className="font-semibold text-slate-900">{t('{{qty}} / din', { qty: num(r.demand) })}</p>
                        <p className="text-[0.7rem] text-slate-500">
                          {r.season !== null ? t('Pichhla saal ×{{f}}', { f: r.season }) : r.festival ? t('Tehwar ×{{f}}', { f: r.festival.factor }) : t('30 din: {{qty}}', { qty: num(r.sold.d30) })}
                        </p>
                      </div>
                      <div className="text-[0.8125rem]">
                        <p className={cn('font-semibold', urgent ? 'text-rose-600' : 'text-slate-900')}>{coverText(r)}</p>
                        <p className="text-[0.7rem] text-slate-500">{r.daysSinceSale !== null ? t('Aakhri bikri {{days}} din pehle', { days: r.daysSinceSale }) : t('Koi bikri nahi')}</p>
                      </div>
                      <div className="text-[0.8125rem]">
                        {r.suggestQty > 0 ? (
                          <>
                            <p className="font-semibold text-slate-900">{num(r.suggestQty)} {r.unit}{r.pack ? ` · ${num(r.suggestQty / r.pack.size)} ${r.pack.name}` : ''}</p>
                            <p className="text-[0.7rem] text-slate-500">{cost(r.orderValue)} · {t('{{days}} din me aata hai', { days: r.leadDays })}</p>
                          </>
                        ) : r.tiedValue > 0 ? (
                          <p className="font-semibold text-rose-600">{t('{{value}} phansa hua', { value: cost(r.tiedValue) })}</p>
                        ) : r.orderInDays !== null ? (
                          <p className="text-slate-600">{t('{{days}} din baad mangwayein', { days: r.orderInDays })}</p>
                        ) : <p className="text-slate-400">—</p>}
                      </div>
                      <div className="lg:text-end">
                        {canOrder && r.suggestQty > 0 && (
                          <Button size="sm" variant="secondary" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => openOrders([r.productId])}>{t('Order')}</Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {d && pages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-[0.8125rem] text-slate-600">
                <span>{t('{{from}}–{{to}} / {{total}}', { from: (d.page - 1) * d.limit + 1, to: Math.min(d.total, d.page * d.limit), total: d.total })}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('Pichhla')}</Button>
                  <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('Agla')}</Button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {groups && (
        <Modal open onClose={() => setGroups(null)} size="lg" title={t('Purchase order banayein')} description={t('{{count}} supplier — har ek ka alag order banega. Save karne tak order kachcha rehta hai.', { count: groups.length })}>
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.supplier?.id ?? 'none'} className="rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{g.supplier?.name ?? t('Supplier chunna hai')}</p>
                    <p className="text-[0.75rem] text-slate-500">{t('{{count}} cheezein · {{total}}', { count: g.lines.length, total: cost(g.value) })}</p>
                  </div>
                  <Button size="sm" leftIcon={<ShoppingCart className="h-3.5 w-3.5" />} onClick={() => handoff(g)}>{t('Order banayein')}</Button>
                </div>
                <p className="mt-2 line-clamp-2 text-[0.75rem] text-slate-600">{g.lines.map((l) => `${l.name} ${num(l.qty)} ${l.unit}`).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide
          title={t('Stock forecast — aasaan tareeqa')}
          description={t('Har cheez ki roz ki bikri se andaza: kab khatam hogi aur kitna mangwana hai.')}
          onClose={guide.close}
          flow={[
            { label: t('Bikri'), hint: t('7, 30, 90 din'), icon: TrendingUp, color: '#16a34a' },
            { label: t('Kab khatam'), hint: t('Stock ÷ roz ki bikri'), icon: CalendarClock, color: '#e11d48' },
            { label: t('Kitna mangwayein'), hint: t('Supplier ka pack'), icon: ShoppingCart, color: '#2563eb' },
            { label: t('Purchase order'), hint: t('Save par pakka'), icon: Truck, color: '#7c3aed' },
          ]}
          steps={[
            { icon: TrendingUp, color: '#16a34a', title: t('Roz ki bikri'), text: t('Pichhle 7 din ko zyada wazan, phir 30 aur 90 din. Pichhle saal isi waqt ki bikri ho to woh bhi shamil.') },
            { icon: Truck, color: '#2563eb', title: t('Supplier ke din'), text: t('Supplier ke "kitne din me maal aata hai" se hifazati stock aur order ka waqt banta hai. Product ke Suppliers me din likhein.') },
            { icon: Snail, color: '#e11d48', title: t('Dead aur zyada stock'), text: t('90 din se na bikne wala maal dead stock hai; 120 din se zyada ka maal zyada stock. Is me paisa phansa hai — sale laga kar nikaalein.') },
          ]}
        />
      )}
    </PageShell>
  );
}
