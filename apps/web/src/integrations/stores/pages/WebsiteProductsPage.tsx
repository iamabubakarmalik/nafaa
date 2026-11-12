/**
 * Products on the website. Name, price and stock always come from Nafaa;
 * here the shop chooses which products show, and adds the website-only
 * parts: address, Google text, a longer web description, picture order,
 * badges ("Naya", "Best seller"), the old price to strike out, related
 * products, extra tabs and a size chart. POS fields are never changed.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, GraduationCap, GripVertical, ImageOff, PackageCheck, Plus, Save, Search, Sparkles, X } from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, Drawer, EmptyState, Input, PageShell, Segmented, Skeleton, Switch, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type WebProductDetail, type WebProductPatch, type WebProductRow } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { RichTextEditor } from '../components/RichTextEditor';
import { SeoFields, textOf } from '../components/SeoFields';
import { ProductPicker } from '../components/SettingsForm';
import { DragList } from '../components/DragList';
import { SK } from '../lib/hooks';
import { rs } from '../lib/format';

export default function WebsiteProductsPage() {
  return (
    <PageShell>
      <StoreGate title={t('Website products')}>{(ctx) => <Products ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const LIMIT = 50;

function Products({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const h = setTimeout(() => setDebounced(search), 300); return () => clearTimeout(h); }, [search]);
  const [visible, setVisible] = useState<'all' | 'shown' | 'hidden'>('all');
  const [stock, setStock] = useState<'all' | 'in' | 'out'>('all');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({
    queryKey: [...SK.products(id), 'list', debounced, visible, stock, page],
    queryFn: () => storesApi.products(id, { search: debounced || undefined, visible, stock, page, limit: LIMIT }),
    placeholderData: (p) => p,
  });
  const shown = useQuery({ queryKey: [...SK.products(id), 'count-shown'], queryFn: () => storesApi.products(id, { visible: 'shown', limit: 1 }) });
  const hiddenIn = useQuery({ queryKey: [...SK.products(id), 'count-hidden-in'], queryFn: () => storesApi.products(id, { visible: 'hidden', stock: 'in', limit: 1 }) });
  const refresh = () => qc.invalidateQueries({ queryKey: SK.products(id) });

  const bulk = useMutation({
    mutationFn: (a: { action: 'show' | 'hide' | 'show_in_stock'; ids?: string[] }) => storesApi.bulkProducts(id, a.action, a.ids),
    onSuccess: (r, a) => {
      setSel(new Set());
      void refresh();
      toast.success(t('{{n}} products badal gaye', { n: r.updated }), a.action !== 'show_in_stock' && a.ids
        ? { action: { label: t('Wapas'), onClick: () => bulk.mutate({ action: a.action === 'show' ? 'hide' : 'show', ids: a.ids }) } } : undefined);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (p: WebProductRow) => storesApi.updateProduct(id, p.productId, { visible: !p.visible }),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const items = q.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / LIMIT));
  const allSel = items.length > 0 && items.every((p) => sel.has(p.productId));

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Website products')} loading={q.isLoading}
        meta={t('Naam, qeemat aur stock Nafaa se khud aate hain. Yahan chunein kya dikhe, aur website ke liye tafseel likhein.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" className={heroPrimaryButton} disabled={bulk.isPending} onClick={() => bulk.mutate({ action: 'show_in_stock' })}>
            <PackageCheck className="h-4 w-4" />{t('Sab in-stock dikhayein')}
          </button>
        </>}
        stats={[
          { label: t('Website par'), value: (shown.data?.total ?? 0).toLocaleString() },
          { label: t('Stock hai magar chhupe'), value: (hiddenIn.data?.total ?? 0).toLocaleString() },
          { label: t('Is list me'), value: (q.data?.total ?? 0).toLocaleString() },
          { label: t('Tareeqa'), value: q.data?.catalogMode === 'CHOSEN' ? t('Sirf chune hue') : t('Sab, jab tak chhupayein nahi') },
        ]} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[14rem] flex-1"><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('Naam ya SKU')} leftIcon={<Search className="h-4 w-4" />} /></div>
        <Segmented value={visible} onChange={(v) => { setVisible(v); setPage(1); }} label={t('Website par')}
          items={[{ value: 'all', label: t('Sab') }, { value: 'shown', label: t('Dikh rahe') }, { value: 'hidden', label: t('Chhupe') }]} />
        <Segmented value={stock} onChange={(v) => { setStock(v); setPage(1); }} label={t('Stock')}
          items={[{ value: 'all', label: t('Sab stock') }, { value: 'in', label: t('Maujood') }, { value: 'out', label: t('Khatam') }]} />
      </div>

      {sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-white">
          <span className="text-[0.875rem] font-semibold">{t('{{n}} chune', { n: sel.size })}</span>
          <span className="flex-1" />
          <Button size="sm" variant="secondary" onClick={() => bulk.mutate({ action: 'show', ids: [...sel] })} leftIcon={<Eye className="h-4 w-4" />}>{t('Dikhayein')}</Button>
          <Button size="sm" variant="secondary" onClick={() => bulk.mutate({ action: 'hide', ids: [...sel] })} leftIcon={<EyeOff className="h-4 w-4" />}>{t('Chhupayein')}</Button>
          <button type="button" onClick={() => setSel(new Set())} className="rounded p-1 hover:bg-white/10" aria-label={t('Cancel')}><X className="h-4 w-4" /></button>
        </div>
      )}

      <Card flush>
        {q.isLoading ? <Skeleton className="m-4 h-72 rounded-xl" /> : !items.length ? (
          <EmptyState icon={<PackageCheck className="h-6 w-6" />} title={t('Koi product nahi mila')} description={search ? t('Doosra naam likh kar dekhein') : t('Pehle Nafaa me products banayein, phir yahan aayenge.')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead className="border-b border-slate-100 text-[0.6875rem] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-4 py-2.5"><Checkbox checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(items.map((p) => p.productId)))} aria-label={t('Sab chunein')} /></th>
                  <th className="px-2 py-2.5 text-start">{t('Product')}</th>
                  <th className="px-2 py-2.5 text-end">{t('Qeemat')}</th>
                  <th className="px-2 py-2.5 text-end">{t('Stock')}</th>
                  <th className="hidden px-2 py-2.5 text-start lg:table-cell">{t('Google')}</th>
                  <th className="px-4 py-2.5 text-end">{t('Website par')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50">
                    <td className="px-4 py-2"><Checkbox checked={sel.has(p.productId)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(p.productId)) n.delete(p.productId); else n.add(p.productId); return n; })} aria-label={p.name} /></td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => setOpen(p.productId)} className="flex min-w-0 items-center gap-2.5 text-start">
                        {p.image ? <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageOff className="h-4 w-4" /></span>}
                        <span className="min-w-0">
                          <span className="block max-w-[18rem] truncate font-semibold text-slate-900 hover:text-brand-700">{p.name}</span>
                          <span className="flex flex-wrap items-center gap-1 text-[0.6875rem] text-slate-500">
                            <span className="dir-ltr">/products/{p.handle}</span>
                            {p.badges.map((b) => <Badge key={b} size="xs" variant="brand">{b}</Badge>)}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-2 py-2 text-end tabular-nums">
                      {p.compareAtPrice ? <span className="me-1 text-slate-400 line-through">{rs(p.compareAtPrice)}</span> : null}{rs(p.price)}
                    </td>
                    <td className={cn('px-2 py-2 text-end tabular-nums', p.stock <= 0 ? 'text-rose-600' : 'text-slate-700')}>
                      {p.availability === 'backorder' ? <Badge size="xs" variant="info">{t('Order par')}</Badge> : p.stock}
                    </td>
                    <td className="hidden px-2 py-2 lg:table-cell">
                      {p.seoTitle || p.hasWebDescription ? <Badge size="xs" variant="success">{t('Likha hai')}</Badge> : <Badge size="xs">{t('Khud banega')}</Badge>}
                    </td>
                    <td className="px-4 py-2 text-end">
                      <Switch checked={p.visible} disabled={toggle.isPending && toggle.variables?.productId === p.productId} onChange={() => toggle.mutate(p)} aria-label={t('Website par')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2 text-[0.8125rem]">
            <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{t('Pichla')}</Button>
            <span className="tabular-nums text-slate-500">{page} / {pages}</span>
            <Button size="xs" variant="ghost" disabled={page >= pages} onClick={() => setPage((x) => x + 1)}>{t('Agla')}</Button>
          </div>
        )}
      </Card>

      {open && <ProductDrawer ctx={ctx} productId={open} onClose={() => setOpen(null)} onSaved={() => void refresh()} />}

      {guide.isOpen && (
        <PageGuide title={t('Website products — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Nafaa product'), hint: t('Naam, qeemat, stock'), icon: PackageCheck, color: '#2563eb' },
            { label: t('Website par dikhayein'), hint: t('Ek switch'), icon: Eye, color: '#16a34a' },
            { label: t('Tafseel likhein'), hint: t('Google aur customer ke liye'), icon: Sparkles, color: '#7c3aed' },
          ]}
          steps={[
            { icon: PackageCheck, color: '#2563eb', title: t('Ek click'), text: t('"Sab in-stock dikhayein" se jin ka stock hai wo sab website par aa jate hain.') },
            { icon: Sparkles, color: '#7c3aed', title: t('Website ki tafseel'), text: t('Product par click karein: lambi tafseel, "Naya" jaisa nishan, purani qeemat, size chart.') },
            { icon: EyeOff, color: '#64748b', title: t('Chhupana'), text: t('Switch band karne se product sirf website se hatta hai. Dukaan aur POS me waisa hi rehta hai.') },
          ]} />
      )}
    </>
  );
}

function ProductDrawer({ ctx, productId, onClose, onSaved }: { ctx: StoreCtx; productId: string; onClose: () => void; onSaved: () => void }) {
  const id = ctx.store.id;
  const q = useQuery({ queryKey: [...SK.products(id), 'one', productId], queryFn: () => storesApi.product(id, productId) });
  const [d, setD] = useState<WebProductDetail | null>(null);
  const [badge, setBadge] = useState('');
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);
  const set = <K extends keyof WebProductDetail>(k: K, v: WebProductDetail[K]) => setD((x) => (x ? { ...x, [k]: v } : x));
  const save = useMutation({
    mutationFn: () => {
      const body: WebProductPatch = {
        visible: d!.visible, handle: d!.handle, seoTitle: d!.seoTitle || null, seoDescription: d!.seoDescription || null, webDescription: d!.webDescription || null,
        imageOrder: d!.imageOrder, badges: d!.badges, relatedProductIds: d!.relatedProductIds, compareAtPrice: d!.compareAtPrice, tabs: d!.tabs, sizeChart: d!.sizeChart,
      };
      return storesApi.updateProduct(id, productId, body);
    },
    onSuccess: () => { toast.success(t('Save ho gaya')); onSaved(); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const imgs = d ? [...d.images].sort((a, b) => (d.imageOrder.indexOf(a.id) + 1 || 999) - (d.imageOrder.indexOf(b.id) + 1 || 999)) : [];

  return (
    <Drawer open onClose={onClose} size="lg" title={d?.name ?? '…'} description={t('Sirf website ke liye. POS aur dukaan me kuch nahi badalta.')}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Cancel')}</Button><Button disabled={!d} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button></div>}>
      {!d ? <Skeleton className="h-96 rounded-xl" /> : (
        <div className="space-y-5">
          <Switch label={t('Website par dikhayein')} checked={d.visible} onChange={(e) => set('visible', e.target.checked)} />

          {imgs.length > 1 && (
            <div>
              <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Tasveeron ki tarteeb (pehli tasveer card par)')}</p>
              <DragList items={imgs} getKey={(i) => i.id} onReorder={(next) => set('imageOrder', next.map((i) => i.id))} className="flex flex-wrap gap-2 space-y-0"
                renderItem={(i, idx) => (
                  <div className={cn('relative h-16 w-16 cursor-grab overflow-hidden rounded-lg ring-1', idx === 0 ? 'ring-2 ring-brand-500' : 'ring-slate-200')}>
                    <img src={i.url} alt="" className="h-full w-full object-cover" />
                    <GripVertical className="absolute end-0.5 top-0.5 h-3.5 w-3.5 text-white drop-shadow" />
                  </div>
                )} />
            </div>
          )}

          <div>
            <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{t('Website ki tafseel')}</p>
            <RichTextEditor value={d.webDescription ?? ''} onChange={(v) => set('webDescription', v)} minHeight={160}
              placeholder={d.description ? t('Khali chhorein to Nafaa wali tafseel dikhegi') : undefined} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input type="number" label={t('Purani qeemat (kaat kar dikhegi)')} value={d.compareAtPrice ?? ''} min={0}
              hint={t('Abhi ki qeemat {{p}}', { p: rs(d.price) })} onChange={(e) => set('compareAtPrice', e.target.value === '' ? null : Number(e.target.value))} />
            <div>
              <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{t('Nishan (3 tak)')}</p>
              <div className="flex flex-wrap gap-1.5">
                {d.badges.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 py-0.5 pe-1 ps-2 text-[0.75rem] font-semibold text-brand-800">
                    {b}<button type="button" onClick={() => set('badges', d.badges.filter((x) => x !== b))} aria-label={t('Hatayein')}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              {d.badges.length < 3 && (
                <form className="mt-1.5 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); const b = badge.trim().slice(0, 20); if (b && !d.badges.includes(b)) set('badges', [...d.badges, b]); setBadge(''); }}>
                  <Input size="sm" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder={t('Naya, Best seller...')} maxLength={20} />
                  <Button size="sm" type="submit" variant="secondary" aria-label={t('Add')}><Plus className="h-4 w-4" /></Button>
                </form>
              )}
            </div>
          </div>

          <ProductPicker storeId={id} label={t('Milte julte products (12 tak)')} multi max={12} value={d.relatedProductIds} onChange={(ids) => set('relatedProductIds', ids)} />

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{t('Extra tabs (5 tak)')}</p>
            <div className="space-y-2">
              {d.tabs.map((tab, i) => (
                <div key={i} className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-200/70">
                  <div className="mb-1.5 flex gap-1.5">
                    <Input size="sm" value={tab.title} placeholder={t('Tab ka naam: Material, Dhulai')} onChange={(e) => set('tabs', d.tabs.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                    <button type="button" onClick={() => set('tabs', d.tabs.filter((_, j) => j !== i))} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label={t('Hatayein')}><X className="h-4 w-4" /></button>
                  </div>
                  <RichTextEditor value={tab.html} onChange={(v) => set('tabs', d.tabs.map((x, j) => (j === i ? { ...x, html: v } : x)))} minHeight={80} />
                </div>
              ))}
              {d.tabs.length < 5 && <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => set('tabs', [...d.tabs, { title: '', html: '' }])}>{t('Tab add karein')}</Button>}
            </div>
          </div>

          <div>
            <Switch label={t('Size chart')} checked={!!d.sizeChart} onChange={(e) => set('sizeChart', e.target.checked ? { title: t('Size chart'), html: '' } : null)} />
            {d.sizeChart && <div className="mt-2"><RichTextEditor value={d.sizeChart.html} onChange={(v) => set('sizeChart', { ...d.sizeChart!, html: v })} minHeight={100} placeholder={t('Table ya tasveer lagayein')} /></div>}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <SeoFields base={ctx.store.url} prefix="/products/" handle={d.handle} onHandle={(v) => set('handle', v)}
              title={d.seoTitle ?? ''} onTitle={(v) => set('seoTitle', v)} description={d.seoDescription ?? ''} onDescription={(v) => set('seoDescription', v)}
              fallbackTitle={`${d.name} – ${ctx.store.name}`} fallbackDescription={textOf(d.webDescription || d.description)} />
          </div>
        </div>
      )}
    </Drawer>
  );
}
