/**
 * Collections (Summer Lawn, Eid, Winter): which products belong to each
 * season, what is left on the shelf of this branch and how each sells in
 * the last 30 days. A Sale on a whole collection takes a percent off every
 * price (and each size) and puts the regular prices back when it ends; the
 * POS shows those pieces under Sale. Add or take out products, and switch
 * old collections off.
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
import { collectionsApi, type CollectionInput, type CollectionSaleResult, type GarmentCollection, type GarmentSeason } from '../api/collections.api';
import { EmptyList, LoadFailed } from '../components/charts';
import { COLLECTION_KEY, META_KEY, SEASONS, apiError, dayFull, dayInput, opt, seasonLabel } from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { ProductPick, type PickedProduct } from '../components/ProductPick';
import { Trans, t as tr } from '@core/i18n';

type Show = 'active' | 'all' | 'off';
/** A percent sale answers with its counts; the plain "Sale" mark only with how many products. */
type SaleOutcome = CollectionSaleResult | { updated: number };

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
  const [saleOn, setSaleOn] = useState<GarmentCollection | null>(null);

  const listQ = useQuery({ queryKey: [COLLECTION_KEY, 'list'], queryFn: () => collectionsApi.list() });
  const statsQ = useQuery({ queryKey: [COLLECTION_KEY, 'stats'], queryFn: () => collectionsApi.stats(30) });
  const statOf = useMemo(() => new Map((statsQ.data?.items ?? []).map((s) => [s.collectionId, s])), [statsQ.data]);
  const refresh = () => [COLLECTION_KEY, META_KEY, 'products-for-pos', 'catalog'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const endSale = useMutation({
    mutationFn: (c: GarmentCollection): Promise<SaleOutcome> => (c.salePercent != null ? collectionsApi.setSale(c.id, null) : collectionsApi.setOnSale(c.id, false)),
    onSuccess: (r) => {
      const changed = 'changed' in r ? r.changed : 0;
      toast.success(changed ? tr('Sale khatam — {{changed}} rate pehle jaise ho gaye', { changed }) : tr('Sale hata di'));
      refresh();
    },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  const toggleActive = useMutation({
    mutationFn: (c: GarmentCollection) => (c.isActive ? collectionsApi.remove(c.id) : collectionsApi.update(c.id, { name: c.name, isActive: true })),
    onSuccess: (c) => { toast.success(c.isActive ? tr('Collection chalu') : tr('Collection band — products waise hi hain')); refresh(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
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
      <PageHero title={tr('Collections')} chip={<><Palette /> {' '}{tr('Season')}</>} meta={tr('Har season ka maal, shelf par kitna bacha aur kitna bika')}
        busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canEdit && <button type="button" onClick={() => setForm({ c: null })} title={tr('Nayi (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Nayi collection')}</button>}
        </>}
        stats={[
          { label: tr('Chalu collections'), value: all.filter((c) => c.isActive).length },
          { label: tr('Shelf par'), value: `${Math.round(totals.stock)} pc`, hint: cost(totals.value) },
          { label: tr('30 din ki Sale'), value: sales(totals.sold) },
        ]}
      />
      <KpiRow cols={4}>
        {statsQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Layers} color="#7c3aed" label={tr('Collections')} value={all.length} hint={tr('{{count}} chalu', { count: all.filter((c) => c.isActive).length })} />
          <KpiCard icon={Package} color="#2563eb" label={tr('Shelf par')} value={`${Math.round(totals.stock)} pc`} hint={tr('Cost {{cost}}', { cost: cost(totals.value) })} />
          <KpiCard icon={TrendingUp} color="#16a34a" label={tr('30 din me bika')} value={sales(totals.sold)} hint={tr('Is branch me')} />
          <KpiCard icon={BadgePercent} color="#e11d48" label={tr('Sale par')} value={totals.onSale} hint={tr('Products')} />
        </>}
      </KpiRow>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Collection ka naam ya code…')} />}>
        <FilterMenu icon={CalendarRange} label={season ? seasonLabel(season) : tr('Har season')} value={season} active={!!season} onChange={setSeason}
          options={[{ value: '', label: tr('Har season') }, ...SEASONS.map((s) => ({ value: s.value, label: s.label }))]} />
        <FilterMenu icon={Archive} label={show === 'active' ? tr('Chalu') : show === 'off' ? tr('Band') : tr('Sab')} value={show} active={show !== 'active'} onChange={setShow} align="right"
          options={[{ value: 'active', label: tr('Chalu') }, { value: 'off', label: tr('Band') }, { value: 'all', label: tr('Sab') }]} />
      </FilterBar>

      {listQ.isLoading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}</div>
        : listQ.isError ? <LoadFailed what={tr('Collections')} retry={() => listQ.refetch()} />
          : !rows.length ? (
            <EmptyList icon={Palette} title={all.length ? tr('Is filter me koi nahi') : tr('Abhi koi collection nahi')} text={tr('Summer Lawn, Eid, Winter — har season ka maal ek collection me rakhein. Season khatam ho to poori collection \'Sale\' par laga dein.')}>
              {canEdit && <Button onClick={() => setForm({ c: null })} leftIcon={<Plus className="h-4 w-4" />}>{tr('Nayi collection')}</Button>}
            </EmptyList>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((c) => {
                const s = statOf.get(c.id);
                const sell = s && s.stock + s.soldQty > 0 ? Math.round((s.soldQty / (s.stock + s.soldQty)) * 100) : null;
                const allOnSale = !!s && s.products > 0 && s.onSale === s.products;
                const saleRuns = c.salePercent != null || allOnSale;
                return (
                  <article key={c.id} className={cn('flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80', !c.isActive && 'opacity-70')}>
                    <div className="h-2" style={{ background: c.colorTheme || '#ec4899' }} />
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{c.name}{c.isFeatured && <Star className="ms-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-400" />}</p>
                          <p className="text-[0.75rem] text-slate-500">{seasonLabel(c.season)}{c.year ? ` ${c.year}` : ''}{c.code ? ` · ${c.code}` : ''}{!c.isActive ? tr(' · band') : ''}</p>
                        </div>
                        {saleRuns && <span className="shrink-0 rounded-full bg-rose-600 px-2 py-0.5 text-[0.6875rem] font-bold text-white">{c.salePercent != null ? tr('{{salePercent}}% OFF', { salePercent: c.salePercent }) : tr('SALE')}</span>}
                      </div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{tr('Products')}</dt><dd className="font-bold tabular-nums">{s?.products ?? c.productCount ?? 0}</dd></div>
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{tr('Shelf par')}</dt><dd className="font-bold tabular-nums">{Math.round(s?.stock ?? 0)}</dd></div>
                        <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{tr('30 din bika')}</dt><dd className="font-bold tabular-nums">{Math.round(s?.soldQty ?? 0)}</dd></div>
                      </dl>
                      <p className="mt-2 text-[0.75rem] text-slate-500">
                        {tr('Sale {{sales}} · stock cost {{cost}}', { sales: sales(s?.soldValue ?? 0), cost: cost(s?.stockValue ?? 0) })}
                        {sell !== null && <span className={cn('ms-1 font-semibold', sell >= 50 ? 'text-success-700' : sell < 20 ? 'text-rose-700' : 'text-amber-700')}>{tr('· {{sell}}% bik gaya', { sell })}</span>}
                      </p>
                      {(c.launchDate || c.endDate) && <p className="text-[0.75rem] text-slate-500">{dayFull(c.launchDate)} — {dayFull(c.endDate)}</p>}
                      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                        <Button size="sm" variant="secondary" onClick={() => setOpenId(c.id)} leftIcon={<Package className="h-4 w-4" />}>{tr('Products')}</Button>
                        {canEdit && c.isActive && (
                          <Button size="sm" variant={saleRuns ? 'secondary' : 'danger'} onClick={() => setSaleOn(c)} leftIcon={<BadgePercent className="h-4 w-4" />}>
                            {saleRuns ? tr('Sale badlein') : tr('Sale lagayein')}
                          </Button>
                        )}
                        {canEdit && saleRuns && (
                          <Button size="sm" variant="secondary" loading={endSale.isPending && endSale.variables?.id === c.id} onClick={() => endSale.mutate(c)}>{tr('Sale hatayein')}</Button>
                        )}
                        {canEdit && <Button size="sm" variant="ghost" onClick={() => setForm({ c })} aria-label={tr('Badlein')}><Pencil className="h-4 w-4" /></Button>}
                        {canEdit && <Button size="sm" variant="ghost" className="ms-auto" onClick={() => toggleActive.mutate(c)}>{c.isActive ? tr('Band karein') : tr('Chalu karein')}</Button>}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

      {form && <CollectionForm c={form.c} onClose={() => setForm(null)} onDone={refresh} />}
      {openId && <CollectionProducts id={openId} canEdit={canEdit} onClose={() => setOpenId(null)} onChanged={refresh} />}
      {saleOn && <SaleModal c={saleOn} onClose={() => setSaleOn(null)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide title={tr('Collections — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#ec4899', title: tr('Nayi collection'), text: tr('Naam, season aur saal. Product banate waqt collection chunein, ya yahan "Products" se jorein.') },
            { icon: TrendingUp, color: '#16a34a', title: tr('Kitna bika'), text: tr('Har card par shelf ka stock aur 30 din ki Sale. "% bik gaya" kam ho to us maal par Sale lagayein.') },
            { icon: BadgePercent, color: '#e11d48', title: tr('Sale'), text: tr('"Sale lagayein" me % likhein: har product aur har size ka rate utna kam ho jata hai aur POS par "Sale" filter me aata hai. "Sale hatayein" se pehle wale rate wapas. Har rate ki tabdeeli Activity log me likhi jati hai.') },
            { icon: Archive, color: '#64748b', title: tr('Band karein'), text: tr('Purani collection band karne se products, stock aur bill waise hi rehte hain.') },
          ]}
          shortcuts={[['N', tr('nayi')], ['/', tr('dhoondein')], ['G', tr('guide')]]} />
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
  const problem = !name.trim() ? tr('Naam likhein') : year && !(y >= 2000 && y <= 2100) ? tr('Saal sahi likhein') : launch && end && end < launch ? tr('Khatam hone ki date shuru se pehle hai') : null;
  const save = useMutation({
    mutationFn: () => {
      const body: CollectionInput = {
        name: name.trim(), code: opt(code) ?? '', season, year: year ? y : undefined, launchDate: launch || undefined, endDate: end || undefined,
        description: opt(desc) ?? '', colorTheme: theme, isFeatured: featured,
      };
      return c ? collectionsApi.update(c.id, body) : collectionsApi.create(body);
    },
    onSuccess: (r) => { toast.success(c ? tr('{{name}} save ho gayi', { name: r.name }) : tr('{{name}} ban gayi', { name: r.name })); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={c ? tr('{{name}} — badlein', { name: c.name }) : tr('Nayi collection')}
      footer={<>
        {problem && name ? <p className="me-auto text-[0.8125rem] text-amber-800">{problem}</p> : null}
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()}>{tr('Save karein')}</Button>
      </>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Input label={tr('Naam')} required value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder={tr('Summer Lawn 2026')} />
          <Input label={tr('Code')} value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} placeholder={tr('SL26')} hint={tr('Marzi hai')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={tr('Season')} value={season} onChange={(e) => setSeason(e.target.value as GarmentSeason)} options={SEASONS.map((s) => ({ value: s.value, label: s.label }))} />
          <Input label={tr('Saal')} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Input label={tr('Shuru')} type="date" value={launch} onChange={(e) => setLaunch(e.target.value)} hint={tr('Marzi hai')} />
          <Input label={tr('Khatam')} type="date" value={end} onChange={(e) => setEnd(e.target.value)} hint={tr('Marzi hai')} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Rang')}</span>
          <div className="flex flex-wrap gap-1.5">{THEMES.map((t) => <button key={t} type="button" onClick={() => setTheme(t)} aria-label={t} className={cn('h-8 w-8 rounded-full ring-2 ring-offset-2', theme === t ? 'ring-slate-900' : 'ring-transparent')} style={{ background: t }} />)}</div>
        </div>
        <Textarea label={tr('Tafseel')} value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={2000} hint={tr('Marzi hai')} />
        <Switch checked={featured} onChange={(e) => setFeatured(e.target.checked)} label={tr('Khaas collection')} description={tr('List me sab se upar')} />
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
    onSuccess: () => { toast.success(tr('Collection me jur gaya')); setPick(null); after(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi jura'))),
  });
  const remove = useMutation({
    mutationFn: (productId: string) => collectionsApi.removeProducts(id, [productId]),
    onSuccess: () => { toast.success(tr('Collection se nikal diya — product waisa hi hai')); after(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi nikla'))),
  });
  const c = q.data;
  return (
    <Modal open onClose={onClose} size="lg" title={c ? tr('{{name}} — products', { name: c.name }) : tr('Products')} description={c ? tr('{{count}} products · {{season}}', { count: c.products.length, season: seasonLabel(c.season) }) : undefined}>
      <div className="space-y-3">
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1"><ProductPick value={pick} onChange={(p) => { setPick(p); if (p) add.mutate(p.productId); }} label={tr('Product jorein')} hint={tr('Naam likhein ya barcode scan karein')} /></div>
          </div>
        )}
        {q.isLoading ? <Skeleton className="h-40 rounded-xl" /> : !c?.products.length ? <p className="py-8 text-center text-[0.875rem] text-slate-500">{tr('Is collection me abhi koi product nahi')}</p> : (
          <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {c.products.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100">{p.images[0]?.url ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="m-3 h-4 w-4 text-slate-300" />}</span>
                <div className="min-w-0 flex-1">
                  <Link to={`/garment-products/${p.id}`} className="block truncate text-[0.875rem] font-medium text-slate-900 hover:text-brand-700">{p.name}</Link>
                  <p className="text-[0.75rem] text-slate-500">
                    {p.regularPrice != null && p.regularPrice !== p.price && <span className="me-1 line-through">{formatPKR(p.regularPrice)}</span>}
                    <span className={cn(p.regularPrice != null && p.regularPrice !== p.price && 'font-semibold text-rose-700')}>{formatPKR(p.price)}</span>
                    {' '}{tr('· stock {{stock}}{{value}}{{value2}}', { stock: Math.round(p.stock), value: p.isOnSale ? tr(' · Sale') : '', value2: !p.isActive ? tr(' · band') : '' })}
                  </p>
                </div>
                {canEdit && <button type="button" onClick={() => remove.mutate(p.id)} aria-label={tr('Collection se nikalein')} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Percent off the whole collection; left blank, only the "Sale" mark (prices stay). */
function SaleModal({ c, onClose, onDone }: { c: GarmentCollection; onClose: () => void; onDone: () => void }) {
  const [text, setText] = useState(c.salePercent != null ? String(c.salePercent) : '');
  const pct = Number(text);
  const blank = !text.trim();
  const problem = !blank && !(pct >= 1 && pct <= 90) ? tr('1 se 90 tak likhein') : null;
  const example = 2500;
  const save = useMutation({
    mutationFn: (): Promise<SaleOutcome> => (blank ? collectionsApi.setOnSale(c.id, true) : collectionsApi.setSale(c.id, pct)),
    onSuccess: (r) => {
      if ('changed' in r) {
        const notes = [
          r.keptByHand ? `${r.keptByHand} haath se badle rate waise hi rahe` : '',
          r.branchPriced ? `${r.branchPriced} branch rate nahi badle` : '',
        ].filter(Boolean).join(' · ');
        toast.success(r.repeated ? tr('Sale pehle hi {{salePercent}}% hai', { salePercent: r.salePercent }) : tr('{{salePercent}}% Sale — {{changed}} rate badle{{value}}', { salePercent: r.salePercent, changed: r.changed, value: notes ? ` (${notes})` : '' }));
      } else toast.success(tr('{{updated}} products "Sale" par — rate nahi badle', { updated: r.updated }));
      onDone();
      onClose();
    },
    onError: (e) => toast.error(apiError(e, tr('Sale nahi lagi'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('{{name}} — Sale', { name: c.name })}
      description={c.salePercent != null ? tr('Abhi {{salePercent}}% Sale chal rahi hai', { salePercent: c.salePercent }) : tr('Poori collection ke rate ek saath kam karein')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button disabled={!!problem} loading={save.isPending} onClick={() => save.mutate()}>{blank ? tr('Sirf Sale ka nishan') : tr('{{pct}}% Sale lagayein', { pct })}</Button>
      </>}>
      <div className="space-y-3">
        <Input label={tr('Sale %')} inputMode="decimal" value={text} autoFocus error={problem ?? undefined}
          onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))} placeholder="20"
          hint={tr('Har product aur har size ka rate itna % kam hoga. Khali chhorein to sirf \'Sale\' ka nishan lagega, rate nahi badlega.')} />
        {!blank && !problem && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800">
            <Trans text="Misaal: {{before}} → {{after}}. Sale hatane par pehle wala rate wapas aa jayega." values={{ before: <span className="line-through">{formatPKR(example)}</span>, after: <b>{formatPKR(Math.round((example * (100 - pct)) / 100))}</b> }} />
          </p>
        )}
      </div>
    </Modal>
  );
}
