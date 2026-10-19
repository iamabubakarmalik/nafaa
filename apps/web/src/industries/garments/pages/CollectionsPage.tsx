/**
 * Collections (Summer Lawn, Eid, Winter): which products belong to each
 * season, what is left on the shelf of this branch and how each sells in
 * the last 30 days. Mark a whole collection "Sale" (the POS shows those
 * pieces under Sale), add or take out products, and switch old ones off.
 *
 * Keys: N new · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive, BadgePercent, CalendarRange, GraduationCap, Layers, Package, Palette, Pencil, Plus, Sparkles, Star, TrendingUp, X } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, FilterBar, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch, Textarea, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { collectionsApi, type CollectionInput, type GarmentCollection, type GarmentSeason } from '../api/collections.api';
import { EmptyList, LoadFailed } from '../components/charts';
import { COLLECTION_KEY, META_KEY, SEASONS, apiError, dayFull, dayInput, opt, seasonLabel } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { ProductPick, type PickedProduct } from '../components/ProductPick';

type Show = 'active' | 'all' | 'off';

export default function CollectionsPage() {
  const qc = useQueryClient();
  const { catalog: canEdit } = useGarmentsCan();
  const { sales, cost } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [season, setSeason] = useState('');
  const [show, setShow] = useState<Show>('active');
  const [form, setForm] = useState<{ c: GarmentCollection | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const listQ = useQuery({ queryKey: [COLLECTION_KEY, 'list'], queryFn: () => collectionsApi.list() });
  const statsQ = useQuery({ queryKey: [COLLECTION_KEY, 'stats'], queryFn: () => collectionsApi.stats(30) });
  const statOf = useMemo(() => new Map((statsQ.data?.items ?? []).map((s) => [s.collectionId, s])), [statsQ.data]);
  const refresh = () => [COLLECTION_KEY, META_KEY, 'products-for-pos', 'catalog'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const onSale = useMutation({
    mutationFn: ({ c, on }: { c: GarmentCollection; on: boolean }) => collectionsApi.setOnSale(c.id, on),
    onSuccess: (r, v) => { toast.success(v.on ? `${r.updated} products "Sale" par` : 'Sale hata di'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const toggleActive = useMutation({
    mutationFn: (c: GarmentCollection) => (c.isActive ? collectionsApi.remove(c.id) : collectionsApi.update(c.id, { name: c.name, isActive: true })),
    onSuccess: (c) => { toast.success(c.isActive ? 'Collection chalu' : 'Collection band — products waise hi hain'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canEdit) { e.preventDefault(); setForm({ c: null }); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canEdit]);

  const all = listQ.data ?? [];
  const term = search.trim().toLowerCase();
  const rows = all.filter((c) => (show === 'all' || (show === 'active' ? c.isActive : !c.isActive))
    && (!season || c.season === season) && (!term || c.name.toLowerCase().includes(term) || (c.code ?? '').toLowerCase().includes(term)));
  const totals = (statsQ.data?.items ?? []).reduce((t, s) => ({ stock: t.stock + s.stock, value: t.value + s.stockValue, sold: t.sold + s.soldValue, onSale: t.onSale + s.onSale }), { stock: 0, value: 0, sold: 0, onSale: 0 });

  return (
    <PageShell>
      <PageHero title="Collections" chip={<><Palette /> Season</>} meta="Har season ka maal, shelf par kitna bacha aur kitna bika"
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm({ c: null })} title="Nayi (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi collection</button>}
        </>}
        stats={[
          { label: 'Chalu collections', value: all.filter((c) => c.isActive).length },
          { label: 'Shelf par', value: `${Math.round(totals.stock)} pc`, hint: cost(totals.value) },
          { label: '30 din ki Sale', value: sales(totals.sold) },
        ]}
      />
      <KpiRow cols={4}>
        {statsQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Layers} color="#7c3aed" label="Collections" value={all.length} hint={`${all.filter((c) => c.isActive).length} chalu`} />
          <KpiCard icon={Package} color="#2563eb" label="Shelf par" value={`${Math.round(totals.stock)} pc`} hint={`Cost ${cost(totals.value)}`} />
          <KpiCard icon={TrendingUp} color="#16a34a" label="30 din me bika" value={sales(totals.sold)} hint="Is branch me" />
          <KpiCard icon={BadgePercent} color="#e11d48" label="Sale par" value={totals.onSale} hint="Products" />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Collection ka naam ya code…" />}>
        <FilterMenu icon={CalendarRange} label={season ? seasonLabel(season) : 'Har season'} value={season} active={!!season} onChange={setSeason}
          options={[{ value: '', label: 'Har season' }, ...SEASONS.map((s) => ({ value: s.value, label: s.label }))]} />
        <FilterMenu icon={Archive} label={show === 'active' ? 'Chalu' : show === 'off' ? 'Band' : 'Sab'} value={show} active={show !== 'active'} onChange={setShow} align="right"
          options={[{ value: 'active', label: 'Chalu' }, { value: 'off', label: 'Band' }, { value: 'all', label: 'Sab' }]} />
      </FilterBar>

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
        : listQ.isError ? <LoadFailed what="Collections" retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Palette} title={all.length ? 'Is filter me koi nahi' : 'Abhi koi collection nahi'} text="Summer Lawn, Eid, Winter — har season ka maal ek collection me rakhein. Season khatam ho to poori collection 'Sale' par laga dein.">
              {canEdit && <Button onClick={() => setForm({ c: null })} leftIcon={<Plus className="h-4 w-4" />}>Nayi collection</Button>}
            </EmptyList>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((c) => {
                const s = statOf.get(c.id);
                const sell = s && s.stock + s.soldQty > 0 ? Math.round((s.soldQty / (s.stock + s.soldQty)) * 100) : null;
                const allOnSale = !!s && s.products > 0 && s.onSale === s.products;
                return (
                  <article key={c.id} className={cn('flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80', !c.isActive && 'opacity-70')}>
                    <div className="h-2" style={{ background: c.colorTheme || '#ec4899' }} />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{c.name}{c.isFeatured && <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</p>
                          <p className="text-[0.75rem] text-slate-500">{seasonLabel(c.season)}{c.year ? ` ${c.year}` : ''}{c.code ? ` · ${c.code}` : ''}{!c.isActive ? ' · band' : ''}</p>
                        </div>
                        {allOnSale && <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-bold text-white">SALE</span>}
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">Products</dt><dd className="font-bold tabular-nums">{s?.products ?? c.productCount ?? 0}</dd></div>
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">Shelf par</dt><dd className="font-bold tabular-nums">{Math.round(s?.stock ?? 0)}</dd></div>
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">30 din bika</dt><dd className="font-bold tabular-nums">{Math.round(s?.soldQty ?? 0)}</dd></div>
                      </dl>
                      <p className="mt-2 text-[0.75rem] text-slate-500">
                        Sale {sales(s?.soldValue ?? 0)} · stock cost {cost(s?.stockValue ?? 0)}
                        {sell !== null && <span className={cn('ml-1 font-semibold', sell >= 50 ? 'text-success-700' : sell < 20 ? 'text-rose-700' : 'text-amber-700')}>· {sell}% bik gaya</span>}
                      </p>
                      {(c.launchDate || c.endDate) && <p className="text-[0.75rem] text-slate-500">{dayFull(c.launchDate)} — {dayFull(c.endDate)}</p>}
                      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                        <Button size="sm" variant="secondary" onClick={() => setOpenId(c.id)} leftIcon={<Package className="h-4 w-4" />}>Products</Button>
                        {canEdit && c.isActive && (
                          <Button size="sm" variant={allOnSale ? 'secondary' : 'danger'} loading={onSale.isPending && onSale.variables?.c.id === c.id} onClick={() => onSale.mutate({ c, on: !allOnSale })} leftIcon={<BadgePercent className="h-4 w-4" />}>
                            {allOnSale ? 'Sale hatayein' : 'Sale lagayein'}
                          </Button>
                        )}
                        {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm({ c })} aria-label="Badlein"><Pencil className="h-4 w-4" /></Button>}
                        {canEdit && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => toggleActive.mutate(c)}>{c.isActive ? 'Band karein' : 'Chalu karein'}</Button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

      {form && <CollectionForm c={form.c} onClose={() => setForm(null)} onDone={refresh} />}
      {openId && <CollectionProducts id={openId} canEdit={canEdit} onClose={() => setOpenId(null)} onChanged={refresh} />}

      {guide.isOpen && (
        <PageGuide title="Collections — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#ec4899', title: 'Nayi collection', text: 'Naam, season aur saal. Product banate waqt collection chunein, ya yahan "Products" se jorein.' },
            { icon: TrendingUp, color: '#16a34a', title: 'Kitna bika', text: 'Har card par shelf ka stock aur 30 din ki Sale. "% bik gaya" kam ho to us maal par Sale lagayein.' },
            { icon: BadgePercent, color: '#e11d48', title: 'Sale', text: '"Sale lagayein" se poori collection POS par "Sale" filter me aa jati hai. Rate product me hi kam karein — Discount bill par bhi de sakte hain.' },
            { icon: Archive, color: '#64748b', title: 'Band karein', text: 'Purani collection band karne se products, stock aur bill waise hi rehte hain.' },
          ]}
          shortcuts={[['N', 'nayi'], ['/', 'dhoondein'], ['G', 'guide']]} />
      )}
    </PageShell>
  );
}

const THEMES = ['#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#64748b'];

function CollectionForm({ c, onClose, onDone }: { c: GarmentCollection | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(c?.name ?? '');
  const [code, setCode] = useState(c?.code ?? '');
  const [season, setSeason] = useState<GarmentSeason>(c?.season ?? 'SUMMER');
  const [year, setYear] = useState(String(c?.year ?? new Date().getFullYear()));
  const [launch, setLaunch] = useState(dayInput(c?.launchDate));
  const [end, setEnd] = useState(dayInput(c?.endDate));
  const [desc, setDesc] = useState(c?.description ?? '');
  const [theme, setTheme] = useState(c?.colorTheme ?? THEMES[0]);
  const [featured, setFeatured] = useState(c?.isFeatured ?? false);
  const y = Number(year);
  const problem = !name.trim() ? 'Naam likhein' : year && !(y >= 2000 && y <= 2100) ? 'Saal sahi likhein' : launch && end && end < launch ? 'Khatam hone ki date shuru se pehle hai' : null;
  const save = useMutation({
    mutationFn: () => {
      const body: CollectionInput = {
        name: name.trim(), code: opt(code) ?? '', season, year: year ? y : undefined, launchDate: launch || undefined, endDate: end || undefined,
        description: opt(desc) ?? '', colorTheme: theme, isFeatured: featured,
      };
      return c ? collectionsApi.update(c.id, body) : collectionsApi.create(body);
    },
    onSuccess: (r) => { toast.success(c ? `${r.name} save ho gayi` : `${r.name} ban gayi`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={c ? `${c.name} — badlein` : 'Nayi collection'}
      footer={<>
        {problem && name ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : null}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()}>Save karein</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Summer Lawn 2026" />
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} placeholder="SL26" hint="Marzi hai" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Season" value={season} onChange={(e) => setSeason(e.target.value as GarmentSeason)} options={SEASONS.map((s) => ({ value: s.value, label: s.label }))} />
          <Input label="Saal" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Input label="Shuru" type="date" value={launch} onChange={(e) => setLaunch(e.target.value)} hint="Marzi hai" />
          <Input label="Khatam" type="date" value={end} onChange={(e) => setEnd(e.target.value)} hint="Marzi hai" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Rang</span>
          <div className="flex flex-wrap gap-1.5">{THEMES.map((t) => <button key={t} type="button" onClick={() => setTheme(t)} aria-label={t} className={cn('h-8 w-8 rounded-full ring-2 ring-offset-2', theme === t ? 'ring-slate-900' : 'ring-transparent')} style={{ background: t }} />)}</div>
        </div>
        <Textarea label="Tafseel" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={2000} hint="Marzi hai" />
        <Switch checked={featured} onChange={(e) => setFeatured(e.target.checked)} label="Khaas collection" description="List me sab se upar" />
      </div>
    </Modal>
  );
}

function CollectionProducts({ id, canEdit, onClose, onChanged }: { id: string; canEdit: boolean; onClose: () => void; onChanged: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [COLLECTION_KEY, 'one', id], queryFn: () => collectionsApi.getOne(id) });
  const [pick, setPick] = useState<PickedProduct | null>(null);
  const after = () => { qc.invalidateQueries({ queryKey: [COLLECTION_KEY] }); onChanged(); };
  const add = useMutation({
    mutationFn: (productId: string) => collectionsApi.addProducts(id, [productId]),
    onSuccess: () => { toast.success('Collection me jur gaya'); setPick(null); after(); },
    onError: (e) => toast.error(apiError(e, 'Nahi jura')),
  });
  const remove = useMutation({
    mutationFn: (productId: string) => collectionsApi.removeProducts(id, [productId]),
    onSuccess: () => { toast.success('Collection se nikal diya — product waisa hi hai'); after(); },
    onError: (e) => toast.error(apiError(e, 'Nahi nikla')),
  });
  const c = q.data;
  return (
    <Modal open onClose={onClose} size="lg" title={c ? `${c.name} — products` : 'Products'} description={c ? `${c.products.length} products · ${seasonLabel(c.season)}` : undefined}>
      <div className="space-y-3">
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1"><ProductPick value={pick} onChange={(p) => { setPick(p); if (p) add.mutate(p.productId); }} label="Product jorein" hint="Naam likhein ya barcode scan karein" /></div>
          </div>
        )}
        {q.isLoading ? <Skeleton className="h-40 rounded-xl" /> : !c?.products.length ? <p className="py-8 text-center text-[0.875rem] text-slate-500">Is collection me abhi koi product nahi</p> : (
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {c.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">{p.images[0]?.url ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="m-3 h-4 w-4 text-slate-300" />}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/garment-products/${p.id}`} className="block truncate text-[0.875rem] font-medium text-slate-900 hover:text-brand-700">{p.name}</Link>
                  <p className="text-[0.75rem] text-slate-500">{formatPKR(p.price)} · stock {Math.round(p.stock)}{p.isOnSale ? ' · Sale' : ''}{!p.isActive ? ' · band' : ''}</p>
                </div>
                {canEdit && <button type="button" onClick={() => remove.mutate(p.id)} aria-label="Collection se nikalein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
