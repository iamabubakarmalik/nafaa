/**
 * One setup page for categories, brands and tags. Each item shows its
 * products, stock and sales for the chosen period; items can be added (one
 * by one or from the industry's suggestions), edited, switched off, merged
 * into another and deleted, alone or in bulk. Page differences come from
 * `TaxonomyConfig`.
 */

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowDownUp, ArrowRight, Check, CheckSquare, Download, Eye, EyeOff, Filter, GitMerge,
  HelpCircle, LayoutGrid, List, MoreHorizontal, Package, Pencil, Plus, Search, Sparkles, Trash2, X,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterMenu, Modal, PageHero, Segmented, heroButton, heroIconButton, heroPrimaryButton,
  resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { taxonomyApi, type TaxonomyItem, type TaxonomyKind } from './api';

export type Draft = Record<string, any>;

export interface TaxonomyConfig {
  kind: TaxonomyKind;
  /** Page title, e.g. "Categories". */
  title: string;
  /** One item in a sentence, e.g. "category". */
  one: string;
  icon: ComponentType<{ className?: string }>;
  /** Query param the products page filters by. */
  productParam: 'categoryId' | 'brandId' | 'tagId';
  /** The products page can list products that have none. */
  noneFilter?: boolean;
  /** Items can be switched off without deleting. */
  canSwitchOff?: boolean;
  /** Offer a colour (and an emoji) in the editor. */
  color?: boolean;
  emoji?: boolean;
  /** Industry suggestions not yet added are offered as one-tap chips. */
  presets: Array<{ name: string } & Draft>;
  /** Other lists that show these items and must refresh after a change. */
  refreshKeys: string[];
  /** Extra editor fields (brands: logo, website, dealer details). */
  extraFields?: (draft: Draft, set: (k: string, v: unknown) => void) => ReactNode;
  /** Payload for create/update from the draft. */
  toPayload?: (draft: Draft) => Draft;
  guide: Array<{ title: string; body: string }>;
  industry: { name: string; emoji: string };
}

type Sort = 'sales' | 'products' | 'stock' | 'name' | 'new';
type Show = 'all' | 'used' | 'unused' | 'off' | 'low';
type View = 'grid' | 'list';

export const COLORS = ['#2c9466', '#16a34a', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#14b8a6', '#06b6d4', '#78350f', '#64748b'];
const EMOJIS = ['🛒', '🥤', '🍞', '🍰', '🥛', '🧀', '🍫', '🍪', '🥩', '🐟', '🍎', '🥬', '🧂', '🧴', '🧼', '💊', '👕', '👟', '👜', '💄', '📱', '💻', '🎧', '🔌', '🔧', '🪑', '📚', '✏️', '🧸', '🎁', '🌿', '⭐'];

const hashColor = (s: string) => COLORS[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];
const readView = (kind: string): View => { try { return localStorage.getItem(`taxonomy-view-${kind}`) === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } };

function Avatar({ item, size = 'md' }: { item: Pick<TaxonomyItem, 'name' | 'color' | 'icon' | 'logoUrl'>; size?: 'md' | 'lg' }) {
  const color = item.color || hashColor(item.name);
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl text-xl' : 'h-10 w-10 rounded-xl text-lg';
  if (item.logoUrl) return <img src={item.logoUrl} alt="" className={cn(box, 'shrink-0 bg-white object-contain ring-1 ring-slate-200')} />;
  return (
    <span className={cn(box, 'flex shrink-0 items-center justify-center font-bold text-white')} style={{ background: color }}>
      {item.icon || item.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function TaxonomyPage({ config }: { config: TaxonomyConfig }) {
  const qc = useQueryClient();
  const api = useMemo(() => taxonomyApi(config.kind), [config.kind]);
  const startHour = useBusinessDayStart();
  const { sales: money, cost, costHidden } = useMasked();
  const searchRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('sales');
  const [show, setShow] = useState<Show>('all');
  const [view, setView] = useState<View>(() => readView(config.kind));
  const [editing, setEditing] = useState<TaxonomyItem | 'new' | null>(null);
  const [merging, setMerging] = useState<TaxonomyItem | null>(null);
  const [deleting, setDeleting] = useState<TaxonomyItem[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [guide, setGuide] = useState(false);

  useEffect(() => { try { localStorage.setItem(`taxonomy-view-${config.kind}`, view); } catch { /* storage blocked */ } }, [view, config.kind]);

  const period = resolveRange(range, startHour);
  const key = ['taxonomy', config.kind, period?.from, period?.to];
  const { data, isLoading, isFetching, isError, refetch } = useQuery({ queryKey: key, queryFn: () => api.insights(period), staleTime: 30_000 });
  const items = data?.items ?? [];
  const totals = data?.totals;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['taxonomy', config.kind] });
    [...config.refreshKeys, 'product-catalog', 'dashboard-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  // "/" searches, "n" adds.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setEditing('new'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const maxRevenue = Math.max(1, ...items.map((i) => i.stats?.revenue ?? 0));
  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = items.filter((i) => {
      const s = i.stats;
      if (q && !i.name.toLowerCase().includes(q)) return false;
      if (show === 'used') return (s?.products ?? 0) > 0;
      if (show === 'unused') return !s?.products;
      if (show === 'off') return !i.isActive;
      if (show === 'low') return (s?.lowStock ?? 0) + (s?.outOfStock ?? 0) > 0;
      return true;
    });
    const by: Record<Sort, (a: TaxonomyItem, b: TaxonomyItem) => number> = {
      sales: (a, b) => (b.stats?.revenue ?? 0) - (a.stats?.revenue ?? 0) || a.name.localeCompare(b.name),
      products: (a, b) => (b.stats?.products ?? 0) - (a.stats?.products ?? 0) || a.name.localeCompare(b.name),
      stock: (a, b) => (b.stats?.stockValue ?? 0) - (a.stats?.stockValue ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...rows].sort(by[sort]);
  }, [items, search, show, sort]);

  const existing = new Set(items.map((i) => i.name.toLowerCase()));
  const suggestions = config.presets.filter((p) => !existing.has(p.name.toLowerCase()));

  const save = useMutation({
    mutationFn: async ({ id, draft }: { id?: string; draft: Draft }) => {
      const payload = config.toPayload ? config.toPayload(draft) : draft;
      return id ? api.update(id, payload) : api.create(payload);
    },
    onSuccess: (_r, v) => { toast.success(v.id ? 'Save ho gaya' : `${cap(config.one)} ban gayi`); setEditing(null); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const toggle = useMutation({
    mutationFn: (i: TaxonomyItem) => api.update(i.id, { isActive: !i.isActive }),
    onSuccess: (_r, i) => { toast.success(i.isActive ? 'Band kar diya' : 'Chalu kar diya'); refresh(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });

  const addPresets = useMutation({
    mutationFn: async (list: Draft[]) => {
      let ok = 0;
      for (const p of list) { try { await api.create(config.toPayload ? config.toPayload(p) : p); ok++; } catch { /* already there */ } }
      return ok;
    },
    onSuccess: (ok) => { toast.success(`${ok} ${config.title.toLowerCase()} add ho gaye`); refresh(); },
  });

  const exportCsv = () => {
    const head = ['Naam', 'Products', 'Chalu products', 'Stock units', ...(costHidden ? [] : ['Stock qeemat']), 'Bikri', 'Miqdar', ...(costHidden ? [] : ['Munafa']), 'Halat'];
    const rows = list.map((i) => {
      const s = i.stats;
      return [i.name, s?.products ?? 0, s?.activeProducts ?? 0, Math.round(s?.stockUnits ?? 0), ...(costHidden ? [] : [Math.round(s?.stockValue ?? 0)]),
        Math.round(s?.revenue ?? 0), s?.quantity ?? 0, ...(costHidden ? [] : [Math.round(s?.profit ?? 0)]), i.isActive ? 'Chalu' : 'Band'];
    });
    const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = `${config.title.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pick = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const linked = totals ? totals.totalProducts - totals.unlinked : 0;
  const productsLink = (i: TaxonomyItem) => `/products?${config.productParam}=${i.id}`;

  return (
    <div className="space-y-4 pb-24">
      <PageHero
        title={config.title}
        chip={<><config.icon /> {config.industry.emoji} {config.industry.name}</>}
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <button type="button" className={heroIconButton} onClick={() => setGuide(true)} aria-label="Guide"><HelpCircle className="h-4 w-4" /></button>
          <button type="button" className={heroButton} onClick={exportCsv} disabled={!list.length}><Download className="h-4 w-4" /> CSV</button>
          <button type="button" className={heroPrimaryButton} onClick={() => setEditing('new')}><Plus className="h-4 w-4" /> Nayi {config.one}</button>
        </>}
        stats={totals ? [
          { label: `Kul ${config.title.toLowerCase()}`, value: totals.count, hint: config.canSwitchOff ? `${totals.active} chalu` : undefined },
          { label: 'Bikri (is muddat)', value: money(totals.revenue) },
          { label: 'Products jure hue', value: `${linked}/${totals.totalProducts}` },
          { label: 'Stock ki qeemat', value: cost(totals.stockValue) },
        ] : undefined}
      />

      {totals && totals.unlinked > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1"><b>{totals.unlinked}</b> products ki koi {config.one} nahi — reports me alag nahi dikhenge.</span>
          {config.noneFilter && (
            <Link to={`/products?${config.productParam}=none`} className="inline-flex items-center gap-1 font-semibold hover:underline">Dekhein <ArrowRight className="h-3.5 w-3.5" /></Link>
          )}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" />
            <p className="flex-1 text-sm font-semibold text-slate-800">{config.industry.name} ke liye mashware</p>
            <Button size="sm" variant="secondary" loading={addPresets.isPending} onClick={() => addPresets.mutate(suggestions)}>Sab add karein ({suggestions.length})</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 24).map((p) => (
              <button key={p.name} type="button" disabled={addPresets.isPending} onClick={() => addPresets.mutate([p])}
                className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200">
                <Plus className="h-3 w-3" /> {p.icon ? `${p.icon} ` : ''}{p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${cap(config.one)} dhoondein…  ( / )`} aria-label="Dhoondein"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}
        </div>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="month" />
        <FilterMenu icon={Filter} label="Dikhayein" value={show} active={show !== 'all'} onChange={setShow}
          options={[
            { value: 'all', label: 'Sab' },
            { value: 'used', label: 'Products wali' },
            { value: 'unused', label: 'Khaali (koi product nahi)' },
            { value: 'low', label: 'Kam ya khatam stock' },
            ...(config.canSwitchOff ? [{ value: 'off' as const, label: 'Band' }] : []),
          ]} />
        <FilterMenu icon={ArrowDownUp} label="Tarteeb" value={sort} active={sort !== 'sales'} onChange={setSort} align="right"
          options={[
            { value: 'sales', label: 'Sab se zyada bikri' }, { value: 'products', label: 'Sab se zyada products' },
            { value: 'stock', label: 'Stock ki qeemat' }, { value: 'name', label: 'Naam (A–Z)' }, { value: 'new', label: 'Naye pehle' },
          ]} />
        <Segmented label="Shakal" value={view} onChange={setView}
          items={[{ value: 'grid', label: <LayoutGrid className="h-4 w-4" aria-label="Cards" /> }, { value: 'list', label: <List className="h-4 w-4" aria-label="List" /> }]} />
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <p className="font-semibold text-slate-900">Load nahi hua</p>
          <Button className="mt-3" variant="secondary" onClick={() => refetch()}>Dobara koshish</Button>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <config.icon className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{items.length ? 'Is filter me kuch nahi' : `Abhi koi ${config.one} nahi`}</p>
          <p className="mt-1 text-sm text-slate-500">{items.length ? 'Filter ya search badlein' : 'Upar mashware se ya "Nayi" dabakar banayein'}</p>
          {!items.length && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi {config.one}</Button>}
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const s = i.stats;
            const on = selected.has(i.id);
            return (
              <div key={i.id} className={cn('group relative rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md', on ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200', !i.isActive && 'opacity-70')}>
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => pick(i.id)} aria-label={on ? 'Chunna hatayein' : 'Chunein'} className="relative">
                    <Avatar item={i} size="lg" />
                    {on && <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white"><Check className="h-3 w-3" /></span>}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-slate-900">{i.name}</p>
                      {i.isFeatured && <span title="Khaas" className="text-amber-500">★</span>}
                    </div>
                    <p className="text-[0.8125rem] text-slate-500">
                      {s?.products ?? 0} products{!i.isActive && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">Band</span>}
                    </p>
                  </div>
                  <RowMenu item={i} config={config} onEdit={() => setEditing(i)} onMerge={() => setMerging(i)} onDelete={() => setDeleting([i])} onToggle={() => toggle.mutate(i)} productsLink={productsLink(i)} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Bikri" value={money(s?.revenue ?? 0)} />
                  <Metric label="Becha" value={Number((s?.quantity ?? 0).toFixed(2)).toLocaleString()} />
                  <Metric label="Stock" value={cost(s?.stockValue ?? 0)} />
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${((s?.revenue ?? 0) / maxRevenue) * 100}%`, background: i.color || hashColor(i.name) }} />
                </div>
                {((s?.lowStock ?? 0) > 0 || (s?.outOfStock ?? 0) > 0) && (
                  <p className="mt-2 text-[0.75rem] text-amber-700">
                    {s?.outOfStock ? `${s.outOfStock} khatam` : ''}{s?.outOfStock && s?.lowStock ? ' · ' : ''}{s?.lowStock ? `${s.lowStock} kam` : ''}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-slate-50 text-left text-[0.75rem] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2"><span className="sr-only">Chunein</span></th>
                <th className="px-3 py-2">Naam</th><th className="px-3 py-2 text-right">Products</th><th className="px-3 py-2 text-right">Bikri</th>
                <th className="px-3 py-2 text-right">Munafa</th><th className="px-3 py-2 text-right">Stock</th><th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((i) => {
                const s = i.stats;
                return (
                  <tr key={i.id} className={cn('transition hover:bg-slate-50', selected.has(i.id) && 'bg-brand-50/50', !i.isActive && 'opacity-70')}>
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(i.id)} onChange={() => pick(i.id)} aria-label={`${i.name} chunein`} className="h-4 w-4 accent-brand-600" /></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5"><Avatar item={i} /><span className="font-medium text-slate-900">{i.name}</span>{!i.isActive && <span className="rounded-full bg-slate-100 px-1.5 text-[0.6875rem] text-slate-600">Band</span>}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{s?.products ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(s?.revenue ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{cost(s?.profit ?? 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{cost(s?.stockValue ?? 0)}</td>
                    <td className="px-3 py-2"><RowMenu item={i} config={config} onEdit={() => setEditing(i)} onMerge={() => setMerging(i)} onDelete={() => setDeleting([i])} onToggle={() => toggle.mutate(i)} productsLink={productsLink(i)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(32rem,calc(100%-2rem))] items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-white shadow-xl">
          <CheckSquare className="h-4 w-4" />
          <span className="flex-1 text-sm">{selected.size} chuni</span>
          <button type="button" onClick={() => setSelected(new Set(list.map((i) => i.id)))} className="text-sm text-white/80 hover:text-white">Sab</button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-sm text-white/80 hover:text-white">Hatayein</button>
          <button type="button" onClick={() => setDeleting(items.filter((i) => selected.has(i.id)))}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-500 px-3 text-sm font-semibold hover:bg-rose-600"><Trash2 className="h-3.5 w-3.5" /> Mitayein</button>
        </div>
      )}

      {editing && (
        <EditorModal config={config} item={editing === 'new' ? null : editing} busy={save.isPending}
          onClose={() => setEditing(null)} onSave={(draft) => save.mutate({ id: editing === 'new' ? undefined : editing.id, draft })} />
      )}
      {merging && <MergeModal config={config} from={merging} items={items} onClose={() => setMerging(null)} onDone={() => { setMerging(null); refresh(); }} />}
      {deleting && <DeleteModal config={config} list={deleting} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); setSelected(new Set()); refresh(); }} />}
      {guide && (
        <Modal open onClose={() => setGuide(false)} title={`${config.title} — kaise chalayein`} size="md">
          <ol className="space-y-3">
            {config.guide.map((g, n) => (
              <li key={g.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{n + 1}</span>
                <div><p className="font-semibold text-slate-900">{g.title}</p><p className="text-sm text-slate-600">{g.body}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-[0.8125rem] text-slate-500">Shortcuts: <b>/</b> dhoondein · <b>N</b> nayi {config.one}</p>
        </Modal>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-1.5">
      <p className="text-[0.6875rem] text-slate-500">{label}</p>
      <p className="truncate text-[0.8125rem] font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function RowMenu({ item, config, productsLink, onEdit, onMerge, onDelete, onToggle }: {
  item: TaxonomyItem; config: TaxonomyConfig; productsLink: string;
  onEdit: () => void; onMerge: () => void; onDelete: () => void; onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  const row = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={`${item.name} ke options`} aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button type="button" role="menuitem" className={row} onClick={run(onEdit)}><Pencil className="h-4 w-4" /> Badlein</button>
          <Link role="menuitem" to={productsLink} className={row}><Package className="h-4 w-4" /> Products dekhein</Link>
          <button type="button" role="menuitem" className={row} onClick={run(onMerge)}><GitMerge className="h-4 w-4" /> Doosri me milayein</button>
          {config.canSwitchOff && (
            <button type="button" role="menuitem" className={row} onClick={run(onToggle)}>
              {item.isActive ? <><EyeOff className="h-4 w-4" /> Band karein</> : <><Eye className="h-4 w-4" /> Chalu karein</>}
            </button>
          )}
          <button type="button" role="menuitem" className={cn(row, 'text-rose-600 hover:bg-rose-50')} onClick={run(onDelete)}><Trash2 className="h-4 w-4" /> Mitayein</button>
        </div>
      )}
    </div>
  );
}

function EditorModal({ config, item, busy, onClose, onSave }: {
  config: TaxonomyConfig; item: TaxonomyItem | null; busy: boolean; onClose: () => void; onSave: (d: Draft) => void;
}) {
  const [d, setD] = useState<Draft>(() => item ? { ...item } : { name: '', color: COLORS[0], icon: '', isActive: true });
  const set = (k: string, v: unknown) => setD((x) => ({ ...x, [k]: v }));
  const name = String(d.name ?? '').trim();
  const submit = () => { if (name) onSave({ ...d, name }); };
  return (
    <Modal open onClose={onClose} size={config.extraFields ? 'lg' : 'md'} title={item ? `${cap(config.one)} badlein` : `Nayi ${config.one}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={busy} disabled={!name} onClick={submit}>{item ? 'Save karein' : 'Banayein'}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="flex items-center gap-3">
          <Avatar item={{ name: name || '?', color: config.color ? d.color : undefined, icon: config.emoji ? d.icon : undefined, logoUrl: d.logoUrl }} size="lg" />
          <label className="block flex-1">
            <span className="mb-1 block text-[0.8125rem] font-semibold text-slate-800">Naam</span>
            <input data-autofocus value={d.name ?? ''} onChange={(e) => set('name', e.target.value)} maxLength={80} placeholder={`${cap(config.one)} ka naam`}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          </label>
        </div>
        {config.color && (
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Rang</p>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set('color', c)} aria-label={c} aria-pressed={d.color === c}
                  className={cn('h-8 w-8 rounded-full ring-offset-2 transition', d.color === c && 'ring-2 ring-slate-900')} style={{ background: c }} />
              ))}
            </div>
          </div>
        )}
        {config.emoji && (
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Nishani (emoji)</p>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => set('icon', '')} aria-pressed={!d.icon}
                className={cn('h-9 rounded-lg px-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-200', !d.icon && 'bg-slate-900 text-white ring-slate-900')}>Koi nahi</button>
              {EMOJIS.map((em) => (
                <button key={em} type="button" onClick={() => set('icon', em)} aria-pressed={d.icon === em}
                  className={cn('h-9 w-9 rounded-lg text-lg transition hover:bg-slate-100', d.icon === em && 'bg-brand-50 ring-2 ring-brand-500')}>{em}</button>
              ))}
            </div>
          </div>
        )}
        {config.extraFields?.(d, set)}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function MergeModal({ config, from, items, onClose, onDone }: {
  config: TaxonomyConfig; from: TaxonomyItem; items: TaxonomyItem[]; onClose: () => void; onDone: () => void;
}) {
  const [q, setQ] = useState('');
  const [into, setInto] = useState<string>('');
  const api = taxonomyApi(config.kind);
  const options = items.filter((i) => i.id !== from.id && i.name.toLowerCase().includes(q.toLowerCase().trim()));
  const target = items.find((i) => i.id === into);
  const mut = useMutation({
    mutationFn: () => api.merge(from.id, into),
    onSuccess: (r) => { toast.success(r.message); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="md" title={`"${from.name}" ko milayein`}
      description={`Is ke ${from.stats?.products ?? 0} products chuni hui ${config.one} me chale jayenge, phir "${from.name}" mit jayegi.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={mut.isPending} disabled={!into} onClick={() => mut.mutate()} leftIcon={<GitMerge className="h-4 w-4" />}>Milayein</Button></>}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dhoondein…" data-autofocus aria-label="Dhoondein"
        className="mb-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-brand-500" />
      <div role="radiogroup" className="max-h-72 space-y-1 overflow-y-auto">
        {options.map((i) => (
          <button key={i.id} type="button" role="radio" aria-checked={into === i.id} onClick={() => setInto(i.id)}
            className={cn('flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition', into === i.id ? 'bg-brand-50 ring-1 ring-brand-500' : 'hover:bg-slate-50')}>
            <Avatar item={i} /><span className="flex-1 truncate text-sm font-medium text-slate-900">{i.name}</span>
            <span className="text-[0.75rem] text-slate-500">{i.stats?.products ?? 0} products</span>
          </button>
        ))}
        {!options.length && <p className="py-6 text-center text-sm text-slate-500">Koi aur {config.one} nahi</p>}
      </div>
      {target && <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-[0.8125rem] text-brand-900">{from.name} → <b>{target.name}</b></p>}
    </Modal>
  );
}

function DeleteModal({ config, list, onClose, onDone }: { config: TaxonomyConfig; list: TaxonomyItem[]; onClose: () => void; onDone: () => void }) {
  const api = taxonomyApi(config.kind);
  const products = list.reduce((s, i) => s + (i.stats?.products ?? 0), 0);
  const mut = useMutation({
    mutationFn: async () => {
      let ok = 0;
      for (const i of list) { try { await api.remove(i.id); ok++; } catch { /* reported below */ } }
      return ok;
    },
    onSuccess: (ok) => { if (ok < list.length) toast.error(`${list.length - ok} nahi mitin`); else toast.success(`${ok} mita di gayin`); onDone(); },
  });
  const one = list.length === 1 ? `"${list[0].name}"` : `${list.length} ${config.title.toLowerCase()}`;
  return (
    <Modal open onClose={onClose} size="sm" title={`${one} mitayein?`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()} leftIcon={<Trash2 className="h-4 w-4" />}>Mitayein</Button></>}>
      <p className="text-sm text-slate-700">
        {products > 0
          ? config.kind === 'tag'
            ? `${products} products se yeh tag hat jayega. Products aur un ki bikri wese hi rahegi.`
            : `${products} products bina ${config.one} ke reh jayenge. Products aur un ki bikri wese hi rahegi.`
          : 'Is me koi product nahi — seedha mit jayegi.'}
      </p>
      {products > 0 && config.kind !== 'tag' && (
        <p className="mt-2 text-[0.8125rem] text-slate-500">Behtar: mitane ki bajaye "Doosri me milayein" se products kisi aur {config.one} me le jayein.</p>
      )}
    </Modal>
  );
}
