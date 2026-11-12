/**
 * Editor for one collection: name, picture, description, sort, Google
 * fields, and its products. "Chune hue" (manual) keeps a hand-picked list
 * in drag order; "Khud bharti hai" (automatic) fills from rules on
 * category, brand, tag, price, stock or date, with a live count of what
 * matches. "new" in the URL creates one; delete only hides it.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, GraduationCap, GripVertical, Hand, Loader2, Plus, Save, Search, Trash2, Wand2, X } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Skeleton, Switch, confirmDialog, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { apiClient } from '@core/api/client';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, unwrap } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type CollectionInput, type CollectionProduct, type CollectionRules, type CollectionSort, type RuleField, type RuleOp } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImageField } from '../components/ImageField';
import { SeoFields, textOf } from '../components/SeoFields';
import { DragList } from '../components/DragList';
import { SK, storeLink } from '../lib/hooks';
import { rs, toHandle } from '../lib/format';

export default function CollectionEditPage() {
  return (
    <PageShell>
      <StoreGate title={t('Collection')}>{(ctx) => <Editor ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const SORTS: Array<{ value: CollectionSort; label: string }> = [
  { value: 'manual', label: t('Meri tarteeb') },
  { value: 'best_selling', label: t('Sab se zyada bikne wale pehle') },
  { value: 'newest', label: t('Naye pehle') },
  { value: 'price_asc', label: t('Sasta pehle') },
  { value: 'price_desc', label: t('Mehnga pehle') },
  { value: 'title_asc', label: t('Naam A-Z') },
  { value: 'title_desc', label: t('Naam Z-A') },
];

const FIELDS: Array<{ value: RuleField; label: string; ops: RuleOp[] }> = [
  { value: 'category', label: t('Category'), ops: ['is', 'is_not'] },
  { value: 'brand', label: t('Brand'), ops: ['is', 'is_not'] },
  { value: 'tag', label: t('Tag'), ops: ['is', 'is_not'] },
  { value: 'price', label: t('Qeemat'), ops: ['gt', 'lt'] },
  { value: 'stock', label: t('Stock'), ops: ['in_stock'] },
  { value: 'created', label: t('Naya product'), ops: ['within_days'] },
  { value: 'title', label: t('Naam me'), ops: ['contains'] },
];
const OPS: Record<RuleOp, string> = {
  is: t('hai'), is_not: t('nahi hai'), gt: t('se zyada'), lt: t('se kam'), contains: t('ye likha ho'), in_stock: t('maujood ho'), within_days: t('itne din me aaya'),
};

type Draft = Omit<CollectionInput, 'rules'> & { rules: CollectionRules; isPublished: boolean };
const EMPTY: Draft = { title: '', handle: '', descriptionHtml: '', imageUrl: null, kind: 'MANUAL', rules: { match: 'all', conditions: [] }, sort: 'manual', seoTitle: '', seoDescription: '', isPublished: true };

function useTaxonomy(kind: 'categories' | 'brands' | 'tags', enabled: boolean) {
  return useQuery({
    queryKey: ['taxonomy-simple', kind],
    queryFn: () => apiClient.get(`/${kind}`).then((r) => unwrap<Array<{ id: string; name: string }> | { items: Array<{ id: string; name: string }> }>(r)).then((d) => (Array.isArray(d) ? d : d.items ?? [])),
    enabled,
    staleTime: 5 * 60_000,
  });
}

function Editor({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const { cid = 'new' } = useParams();
  const isNew = cid === 'new';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const q = useQuery({ queryKey: ['stores', id, 'collection', cid], queryFn: () => storesApi.collection(id, cid), enabled: !isNew });
  const [d, setD] = useState<Draft>(EMPTY);
  const [handleTouched, setHandleTouched] = useState(!isNew);
  useEffect(() => {
    if (!q.data) return;
    const c = q.data;
    setD({ title: c.title, handle: c.handle, descriptionHtml: c.descriptionHtml, imageUrl: c.imageUrl, kind: c.kind, rules: c.rules ?? { match: 'all', conditions: [] }, sort: c.sort, seoTitle: c.seoTitle ?? '', seoDescription: c.seoDescription ?? '', isPublished: c.isPublished });
  }, [q.data]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  // Manual products.
  const prods = useQuery({ queryKey: ['stores', id, 'collection', cid, 'products'], queryFn: () => storesApi.collectionProducts(id, cid), enabled: !isNew && d.kind === 'MANUAL' });
  const [picked, setPicked] = useState<CollectionProduct[] | null>(null);
  useEffect(() => { if (prods.data) setPicked(prods.data.items); }, [prods.data]);
  const productsDirty = !!picked && JSON.stringify(picked.map((p) => p.productId)) !== JSON.stringify(prods.data?.items.map((p) => p.productId) ?? []);

  // Rule preview.
  const [debounced, setDebounced] = useState(d.rules);
  useEffect(() => { const h = setTimeout(() => setDebounced(d.rules), 500); return () => clearTimeout(h); }, [d.rules]);
  const preview = useQuery({
    queryKey: ['stores', id, 'rule-preview', JSON.stringify(debounced)],
    queryFn: () => storesApi.previewRules(id, debounced),
    enabled: d.kind === 'AUTOMATIC' && debounced.conditions.length > 0,
    staleTime: 30_000,
  });

  const save = useMutation({
    mutationFn: async () => {
      const body: CollectionInput = {
        title: d.title.trim(), handle: d.handle || toHandle(d.title), descriptionHtml: d.descriptionHtml, imageUrl: d.imageUrl, kind: d.kind,
        rules: d.kind === 'AUTOMATIC' ? d.rules : undefined, sort: d.sort, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, isPublished: d.isPublished,
      };
      const c = isNew ? await storesApi.createCollection(id, body) : await storesApi.updateCollection(id, cid, body);
      if (d.kind === 'MANUAL' && picked && (isNew || productsDirty)) await storesApi.setCollectionProducts(id, c.id, picked.map((p) => p.productId));
      return c;
    },
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: SK.collections(id) });
      void qc.invalidateQueries({ queryKey: ['stores', id, 'collection', c.id] });
      toast.success(t('Save ho gaya'));
      if (isNew) navigate(`/online-store/site/collections/${c.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => storesApi.deleteCollection(id, cid),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SK.collections(id) }); toast.success(t('Hata diya')); navigate('/online-store/site/collections'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const handle = d.handle || toHandle(d.title);
  const count = d.kind === 'AUTOMATIC' ? (d.rules.conditions.length ? preview.data?.count ?? null : 0) : picked?.length ?? 0;

  return (
    <>
      <WebsiteHero ctx={ctx} back="/online-store/site/collections" backLabel={t('Collections')} title={isNew ? t('Nayi collection') : d.title || '…'}
        meta={<span className="dir-ltr">/collections/{handle}</span>} loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {!isNew && <a href={storeLink(ctx.store, ctx.list.storefrontUrl, `/collections/${handle}`)} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" />{t('Website par dekhein')}</a>}
        </>}
        stats={[
          { label: t('Products'), value: count == null ? '…' : String(count) },
          { label: t('Qisam'), value: d.kind === 'AUTOMATIC' ? t('Khud bharti hai') : t('Chune hue') },
          { label: t('Tarteeb'), value: SORTS.find((s) => s.value === d.sort)?.label ?? '—' },
          { label: t('Halat'), value: d.isPublished ? t('Website par') : t('Chhupa') },
        ]} />

      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <Input label={t('Naam')} value={d.title} maxLength={120} placeholder={t('Misal: Eid collection')}
                  onChange={(e) => { set('title', e.target.value); if (!handleTouched) set('handle', toHandle(e.target.value)); }} />
                <div>
                  <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{t('Tafseel (zaroori nahi)')}</p>
                  <RichTextEditor value={d.descriptionHtml ?? ''} onChange={(v) => set('descriptionHtml', v)} minHeight={110} />
                </div>
              </div>
            </Card>

            <Card title={t('Products kaise aayein?')}>
              <div className="grid gap-2 sm:grid-cols-2">
                <KindCard active={d.kind === 'MANUAL'} onClick={() => set('kind', 'MANUAL')} icon={Hand} title={t('Main khud chunoon')} text={t('Ek ek product chunein, tarteeb aap ki')} />
                <KindCard active={d.kind === 'AUTOMATIC'} onClick={() => set('kind', 'AUTOMATIC')} icon={Wand2} title={t('Khud bhar jaye')} text={t('Rule lagayein, naye products khud aayenge')} />
              </div>
              <div className="mt-4">
                {d.kind === 'AUTOMATIC'
                  ? <RulesEditor rules={d.rules} onChange={(r) => set('rules', r)} preview={preview.data} loading={preview.isFetching} />
                  : <ManualProducts storeId={id} items={picked ?? []} loading={!isNew && prods.isLoading} onChange={setPicked} />}
              </div>
            </Card>

            <Card title={t('Google aur address')}>
              <SeoFields base={ctx.store.url} prefix="/collections/" handle={handle} onHandle={(v) => { setHandleTouched(true); set('handle', v); }}
                title={d.seoTitle ?? ''} onTitle={(v) => set('seoTitle', v)} description={d.seoDescription ?? ''} onDescription={(v) => set('seoDescription', v)}
                fallbackTitle={`${d.title} – ${ctx.store.name}`} fallbackDescription={textOf(d.descriptionHtml)} />
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <Switch label={t('Website par dikhayein')} checked={d.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
                <ImageField label={t('Tasveer')} value={d.imageUrl} onChange={(v) => set('imageUrl', v)} hint={t('Collections ki list aur page ke upar')} />
                <Select label={t('Products ki tarteeb')} value={d.sort} options={d.kind === 'AUTOMATIC' ? SORTS.filter((s) => s.value !== 'manual') : SORTS}
                  onChange={(e) => set('sort', e.target.value as CollectionSort)} />
                <Button className="w-full" disabled={!d.title.trim()} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
              </div>
            </Card>
            {!isNew && (
              <Button variant="ghost" className="w-full text-rose-600" loading={remove.isPending} leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={async () => { if (await confirmDialog({ title: t('Collection hatayein?'), text: t('Products nahi mitenge, sirf ye group website se hatega.'), yes: t('Hatayein'), danger: true })) remove.mutate(); }}>
                {t('Collection hatayein')}
              </Button>
            )}
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Collection banana')} onClose={guide.close}
          flow={[
            { label: t('Naam'), hint: t('Aur tasveer'), icon: Plus, color: '#2563eb' },
            { label: t('Products'), hint: t('Chunein ya rule'), icon: Wand2, color: '#7c3aed' },
            { label: t('Save'), hint: t('Website par foran'), icon: Save, color: '#16a34a' },
          ]}
          steps={[
            { icon: Wand2, color: '#7c3aed', title: t('Rule ki misal'), text: t('"Category hai Lawn" aur "Stock maujood ho" — sirf maujood lawn suits aayenge.') },
            { icon: GripVertical, color: '#0d9488', title: t('Tarteeb'), text: t('Chune hue products ko khench kar upar neeche karein. "Meri tarteeb" chuni ho to website par yahi tarteeb.') },
          ]} />
      )}
    </>
  );
}

function KindCard({ active, onClick, icon: Icon, title, text }: { active: boolean; onClick: () => void; icon: typeof Hand; title: string; text: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-start gap-3 rounded-2xl p-3.5 text-start ring-1', active ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}><Icon className="h-4 w-4" /></span>
      <span><span className="block text-[0.875rem] font-semibold text-slate-900">{title}</span><span className="block text-[0.75rem] text-slate-500">{text}</span></span>
    </button>
  );
}

function RulesEditor({ rules, onChange, preview, loading }: {
  rules: CollectionRules; onChange: (r: CollectionRules) => void;
  preview?: { count: number; sample: Array<{ productId: string; name: string; image: string | null; price: number }> }; loading: boolean;
}) {
  const used = new Set(rules.conditions.map((c) => c.field));
  const categories = useTaxonomy('categories', used.has('category'));
  const brands = useTaxonomy('brands', used.has('brand'));
  const tags = useTaxonomy('tags', used.has('tag'));
  const listFor = (f: RuleField) => (f === 'category' ? categories.data : f === 'brand' ? brands.data : f === 'tag' ? tags.data : undefined);
  const setCond = (i: number, patch: Partial<CollectionRules['conditions'][number]>) =>
    onChange({ ...rules, conditions: rules.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <div className="space-y-3">
      {rules.conditions.length > 1 && (
        <Select size="sm" value={rules.match} onChange={(e) => onChange({ ...rules, match: e.target.value as 'all' | 'any' })}
          options={[{ value: 'all', label: t('Sab shartein poori hon') }, { value: 'any', label: t('Koi ek shart poori ho') }]} />
      )}
      {rules.conditions.map((c, i) => {
        const def = FIELDS.find((f) => f.value === c.field) ?? FIELDS[0];
        const options = listFor(c.field);
        return (
          <div key={i} className="grid items-center gap-1.5 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/70 sm:grid-cols-[9rem_9rem_minmax(0,1fr)_auto]">
            <Select size="sm" value={c.field} options={FIELDS.map((f) => ({ value: f.value, label: f.label }))} aria-label={t('Kis cheez par')}
              onChange={(e) => { const nf = FIELDS.find((f) => f.value === e.target.value)!; setCond(i, { field: nf.value, op: nf.ops[0], value: nf.value === 'created' ? 30 : '' }); }} />
            <Select size="sm" value={c.op} options={def.ops.map((o) => ({ value: o, label: OPS[o] }))} aria-label={t('Shart')} onChange={(e) => setCond(i, { op: e.target.value as RuleOp })} />
            {c.op === 'in_stock' ? <span className="text-[0.8125rem] text-slate-500">—</span>
              : options ? (
                <Select size="sm" value={String(c.value)} placeholder={t('Chunein')} options={options.map((o) => ({ value: o.id, label: o.name }))} onChange={(e) => setCond(i, { value: e.target.value })} aria-label={def.label} />
              ) : (
                <Input size="sm" type={['price', 'created'].includes(c.field) ? 'number' : 'text'} value={String(c.value ?? '')} aria-label={def.label}
                  onChange={(e) => setCond(i, { value: ['price', 'created'].includes(c.field) ? Number(e.target.value) : e.target.value })} />
              )}
            <button type="button" onClick={() => onChange({ ...rules, conditions: rules.conditions.filter((_, j) => j !== i) })} className="justify-self-end rounded-md p-1 text-slate-400 hover:text-rose-600" aria-label={t('Hatayein')}><X className="h-4 w-4" /></button>
          </div>
        );
      })}
      <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => onChange({ ...rules, conditions: [...rules.conditions, { field: 'category', op: 'is', value: '' }] })}>{t('Shart add karein')}</Button>
      {rules.conditions.length > 0 && (
        <div className="rounded-xl bg-brand-50/60 p-3 ring-1 ring-brand-100">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-brand-900">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}{t('{{n}} products mil rahe hain', { n: preview?.count ?? '…' })}
          </p>
          {!!preview?.sample.length && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {preview.sample.slice(0, 8).map((p) => (
                <div key={p.productId} className="w-20 shrink-0">
                  {p.image ? <img src={p.image} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="h-20 w-20 rounded-lg bg-white" />}
                  <p className="mt-1 truncate text-[0.6875rem] text-slate-700">{p.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ManualProducts({ storeId, items, loading, onChange }: { storeId: string; items: CollectionProduct[]; loading: boolean; onChange: (x: CollectionProduct[]) => void }) {
  const [q, setQ] = useState('');
  const search = useQuery({
    queryKey: [...SK.products(storeId), 'coll-search', q],
    queryFn: () => storesApi.products(storeId, { search: q, limit: 10 }),
    enabled: q.trim().length >= 2,
  });
  const have = useMemo(() => new Set(items.map((p) => p.productId)), [items]);
  if (loading) return <Skeleton className="h-40 rounded-xl" />;
  return (
    <div>
      <div className="relative">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Product dhoond kar add karein')} leftIcon={<Search className="h-4 w-4" />} />
        {q.trim().length >= 2 && (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
            {(search.data?.items ?? []).map((p) => (
              <li key={p.productId}>
                <button type="button" disabled={have.has(p.productId)}
                  onClick={() => onChange([...items, { productId: p.productId, name: p.name, image: p.image, price: p.price, availability: p.availability, position: items.length }])}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-start text-[0.8125rem] hover:bg-slate-50 disabled:opacity-40">
                  {p.image ? <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" /> : <span className="h-8 w-8 rounded bg-slate-100" />}
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  <span className="tabular-nums text-slate-500">{rs(p.price)}</span>
                  {!have.has(p.productId) && <Plus className="h-4 w-4 text-brand-600" />}
                </button>
              </li>
            ))}
            {search.data && !search.data.items.length && <li className="px-3 py-2 text-[0.8125rem] text-slate-500">{t('Kuch nahi mila')}</li>}
          </ul>
        )}
      </div>
      {!items.length ? <p className="py-4 text-center text-[0.8125rem] text-slate-500">{t('Upar se products dhoond kar add karein.')}</p> : (
        <DragList items={items} getKey={(p) => p.productId} onReorder={onChange} className="mt-3"
          renderItem={(p) => (
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-2 py-1.5 ring-1 ring-slate-200/80">
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
              {p.image ? <img src={p.image} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-slate-100" />}
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-800">{p.name}</span>
              <span className="text-[0.8125rem] tabular-nums text-slate-500">{rs(p.price)}</span>
              <button type="button" onClick={() => onChange(items.filter((x) => x.productId !== p.productId))} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label={t('Hatayein')}><X className="h-4 w-4" /></button>
            </div>
          )} />
      )}
    </div>
  );
}
