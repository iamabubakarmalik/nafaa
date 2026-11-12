/**
 * Website menus and old-address forwarding. Menus: the header and footer
 * menus (and any other), as a tree up to three levels, each link pointing
 * to a collection, product, page, blog, search or any web address; rows
 * drag into order and move in or out a level. Forwarding (redirects): an
 * old address sends visitors to a new one, so Google rankings survive a
 * move from Shopify; a pasted list adds many at once.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, ChevronLeft, ChevronRight, CornerDownRight, GraduationCap, GripVertical, Link2, ListTree, Plus, Save, Search, Trash2, Upload,
} from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, PageShell, Segmented, Select, Skeleton, Textarea, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type MenuItemInput, type MenuItemType, type StoreMenu } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { DragList } from '../components/DragList';
import { ProductPicker } from '../components/SettingsForm';
import { SK } from '../lib/hooks';
import { newId } from '../lib/sections';

export default function NavigationPage() {
  return (
    <PageShell>
      <StoreGate title={t('Menu')}>{(ctx) => <Navigation ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

const TYPES: Array<{ value: MenuItemType; label: string }> = [
  { value: 'home', label: t('Home page') },
  { value: 'collection', label: t('Collection') },
  { value: 'collections', label: t('Sab collections') },
  { value: 'product', label: t('Product') },
  { value: 'page', label: t('Page') },
  { value: 'blog', label: t('Blog') },
  { value: 'search', label: t('Search') },
  { value: 'url', label: t('Koi bhi link') },
];

type Item = Omit<MenuItemInput, 'children'> & { _k: string; children: Item[] };
const withKeys = (items: MenuItemInput[]): Item[] => items.map((i) => ({ ...i, _k: i.id ?? newId('m'), children: withKeys(i.children ?? []) }));
const strip = (items: Item[]): MenuItemInput[] => items.map(({ _k: _x, children, ...i }) => ({ ...i, children: strip(children) }));

function Navigation({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'redirects' ? 'redirects' : 'menus';
  const menus = useQuery({ queryKey: SK.menus(id), queryFn: () => storesApi.menus(id) });
  const redirects = useQuery({ queryKey: [...SK.redirects(id), ''], queryFn: () => storesApi.redirects(id, {}) });
  const count = (items: MenuItemInput[]): number => items.reduce((n, i) => n + 1 + count(i.children ?? []), 0);

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Menu')} loading={menus.isLoading}
        meta={t('Website ke upar aur neeche ke links. Purane address naye par bhejein taake Google se aane wale na ruken.')}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={[
          { label: t('Menu'), value: String(menus.data?.length ?? 0) },
          { label: t('Upar ke links'), value: String(count(menus.data?.find((m) => m.handle === 'main-menu')?.items ?? [])) },
          { label: t('Neeche ke links'), value: String(count(menus.data?.find((m) => m.handle === 'footer')?.items ?? [])) },
          { label: t('Purane address'), value: String(redirects.data?.total ?? 0) },
        ]} />

      <Segmented value={tab} onChange={(v) => setParams(v === 'redirects' ? { tab: 'redirects' } : {}, { replace: true })} label={t('Kya dekhein')}
        items={[{ value: 'menus', label: t('Menu') }, { value: 'redirects', label: t('Purane address'), count: redirects.data?.total }]} />

      {tab === 'menus' ? (
        menus.isLoading ? <Skeleton className="h-72 rounded-2xl" /> : (
          <div className="grid gap-4 2xl:grid-cols-2">
            {(menus.data ?? []).map((m) => <MenuEditor key={m.handle} storeId={id} menu={m} />)}
          </div>
        )
      ) : <Redirects storeId={id} />}

      {guide.isOpen && (
        <PageGuide title={t('Menu — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Link add karein'), hint: t('Collection, page...'), icon: Plus, color: '#2563eb' },
            { label: t('Jagah badlein'), hint: t('Khench kar'), icon: GripVertical, color: '#7c3aed' },
            { label: t('Save'), hint: t('Website par foran'), icon: Save, color: '#16a34a' },
          ]}
          steps={[
            { icon: CornerDownRight, color: '#7c3aed', title: t('Andar ka menu'), text: t('Daayein teer dabane se link upar wale ke andar chala jata hai (dropdown). Teen level tak.') },
            { icon: ArrowRight, color: '#0d9488', title: t('Purane address'), text: t('Shopify ya purani website ke address yahan naye address par bhejein. Shopify se aane par ye khud bharte hain.') },
          ]} />
      )}
    </>
  );
}

function MenuEditor({ storeId, menu }: { storeId: string; menu: StoreMenu }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(menu.title);
  const [items, setItems] = useState<Item[]>(() => withKeys(menu.items));
  const original = useMemo(() => JSON.stringify(menu.items), [menu.items]);
  useEffect(() => { setItems(withKeys(menu.items)); setTitle(menu.title); }, [menu]);
  const dirty = JSON.stringify(strip(items)) !== original || title !== menu.title;
  const save = useMutation({
    mutationFn: () => storesApi.saveMenu(storeId, menu.handle, { title, items: strip(items) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: SK.menus(storeId) }); toast.success(t('Menu save ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  // Tree edits by path (indexes from the top).
  const update = (path: number[], fn: (list: Item[], i: number) => Item[]) => {
    const walk = (list: Item[], depth: number): Item[] => {
      if (depth === path.length - 1) return fn(list, path[depth]);
      return list.map((it, i) => (i === path[depth] ? { ...it, children: walk(it.children, depth + 1) } : it));
    };
    setItems((cur) => walk(cur, 0));
  };
  const setAt = (path: number[], patch: Partial<Item>) => update(path, (list, i) => list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeAt = (path: number[]) => {
    const before = items;
    update(path, (list, i) => list.filter((_, j) => j !== i));
    toast(t('Link hata diya'), { action: { label: t('Wapas'), onClick: () => setItems(before) } });
  };
  const indent = (path: number[]) => {
    const i = path[path.length - 1];
    if (i === 0 || path.length >= 3) return;
    update(path, (list) => {
      const prev = list[i - 1];
      return list.flatMap((x, j) => (j === i ? [] : j === i - 1 ? [{ ...prev, children: [...prev.children, list[i]] }] : [x]));
    });
  };
  const outdent = (path: number[]) => {
    if (path.length < 2) return;
    const parentPath = path.slice(0, -1);
    const i = path[path.length - 1];
    update(parentPath, (list, pi) => list.flatMap((x, j): Item[] => {
      if (j !== pi) return [x];
      const moved = x.children[i];
      return [{ ...x, children: x.children.filter((_, k) => k !== i) }, moved];
    }));
  };

  const renderList = (list: Item[], path: number[]) => (
    <DragList items={list} getKey={(x) => x._k} className={cn(path.length && 'ms-6 mt-1 border-s border-slate-200 ps-2')}
      onReorder={(next) => (path.length ? update(path, (l, i) => l.map((x, j) => (j === i ? { ...x, children: next } : x))) : setItems(next))}
      renderItem={(it, i) => {
        const p = [...path, i];
        return (
          <div>
            <MenuRow storeId={storeId} item={it} depth={path.length}
              onChange={(patch) => setAt(p, patch)} onRemove={() => removeAt(p)}
              onIndent={i > 0 && path.length < 2 ? () => indent(p) : undefined}
              onOutdent={path.length > 0 ? () => outdent(p) : undefined} />
            {it.children.length > 0 && renderList(it.children, p)}
          </div>
        );
      }} />
  );

  return (
    <Card title={<span className="flex items-center gap-2">{menu.handle === 'main-menu' ? t('Upar ka menu') : menu.handle === 'footer' ? t('Neeche ka menu') : menu.title}<Badge size="xs">{menu.handle}</Badge></span>}
      actions={<Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>}>
      <Input label={t('Menu ka naam')} value={title} onChange={(e) => setTitle(e.target.value)} wrapperClassName="mb-3" />
      {items.length === 0 ? <p className="py-3 text-[0.8125rem] text-slate-500">{t('Abhi koi link nahi.')}</p> : renderList(items, [])}
      <Button className="mt-2" size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />}
        onClick={() => setItems((cur) => [...cur, { _k: newId('m'), title: t('Naya link'), type: 'collection', ref: null, url: null, children: [] }])}>
        {t('Link add karein')}
      </Button>
    </Card>
  );
}

function MenuRow({ storeId, item, depth, onChange, onRemove, onIndent, onOutdent }: {
  storeId: string; item: Item; depth: number; onChange: (p: Partial<Item>) => void; onRemove: () => void; onIndent?: () => void; onOutdent?: () => void;
}) {
  const collections = useQuery({ queryKey: SK.collections(storeId), queryFn: () => storesApi.collections(storeId), enabled: item.type === 'collection', staleTime: 60_000 });
  const pages = useQuery({ queryKey: SK.pages(storeId), queryFn: () => storesApi.pages(storeId), enabled: item.type === 'page', staleTime: 60_000 });
  const icon = 'rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30';
  return (
    <div className="rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200/70">
      <div className="flex items-center gap-1.5">
        <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" aria-label={t('Khench kar jagah badlein')} />
        <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} aria-label={t('Link ka naam')}
          className="min-w-0 flex-1 rounded-lg border-0 bg-white px-2 py-1 text-[0.8125rem] font-semibold text-slate-900 ring-1 ring-slate-200 focus:ring-brand-400" />
        <button type="button" className={icon} disabled={!onOutdent} onClick={onOutdent} title={t('Bahar layein')} aria-label={t('Bahar layein')}><ChevronLeft className="h-4 w-4 rtl-flip" /></button>
        <button type="button" className={icon} disabled={!onIndent} onClick={onIndent} title={t('Upar wale ke andar')} aria-label={t('Upar wale ke andar')}><ChevronRight className="h-4 w-4 rtl-flip" /></button>
        <button type="button" className={cn(icon, 'hover:text-rose-600')} onClick={onRemove} aria-label={t('Hatayein')}><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="mt-1.5 grid gap-1.5 ps-5 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <Select size="sm" value={item.type} options={TYPES} aria-label={t('Kahan le jaye')} onChange={(e) => onChange({ type: e.target.value as MenuItemType, ref: null, url: null })} />
        {item.type === 'collection' && (
          <Select size="sm" value={item.ref ?? ''} placeholder={t('Collection chunein')} aria-label={t('Collection')}
            options={(collections.data ?? []).map((c) => ({ value: c.id, label: c.title }))} onChange={(e) => onChange({ ref: e.target.value })} />
        )}
        {item.type === 'page' && (
          <Select size="sm" value={item.ref ?? ''} placeholder={t('Page chunein')} aria-label={t('Page')}
            options={(pages.data ?? []).map((p) => ({ value: p.id, label: p.title }))} onChange={(e) => onChange({ ref: e.target.value })} />
        )}
        {item.type === 'blog' && <Input size="sm" value={item.ref ?? 'news'} onChange={(e) => onChange({ ref: e.target.value })} aria-label={t('Blog')} />}
        {item.type === 'url' && <Input size="sm" value={item.url ?? ''} placeholder="https://..." leftIcon={<Link2 className="h-3.5 w-3.5" />} onChange={(e) => onChange({ url: e.target.value })} aria-label={t('Link')} />}
        {item.type === 'product' && (
          <ProductPicker storeId={storeId} label="" value={item.ref ? [item.ref] : []} onChange={(ids) => onChange({ ref: ids[0] ?? null })} />
        )}
      </div>
    </div>
  );
}

function Redirects({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: [...SK.redirects(storeId), search, page], queryFn: () => storesApi.redirects(storeId, { search: search || undefined, page }) });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: SK.redirects(storeId) });
  const add = useMutation({
    mutationFn: () => storesApi.addRedirect(storeId, { fromPath: from.trim(), toPath: to.trim() }),
    onSuccess: () => { setFrom(''); setTo(''); void refresh(); toast.success(t('Add ho gaya')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const del = useMutation({
    mutationFn: (rid: string) => storesApi.deleteRedirect(storeId, rid),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const rows = bulk.split('\n').map((l) => l.split(/[,\t]/).map((x) => x.trim())).filter((x) => x.length >= 2 && x[0] && x[1] && x[0].toLowerCase() !== 'from');
  const addBulk = useMutation({
    mutationFn: () => storesApi.bulkRedirects(storeId, rows.map(([fromPath, toPath]) => ({ fromPath, toPath }))),
    onSuccess: (r) => { setBulk(''); setBulkOpen(false); void refresh(); toast.success(t('{{a}} add hue, {{s}} pehle se the', { a: r.added, s: r.skipped })); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / 50));

  return (
    <Card flush>
      <div className="space-y-3 border-b border-slate-100 p-4">
        <form className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]" onSubmit={(e) => { e.preventDefault(); if (from.trim() && to.trim()) add.mutate(); }}>
          <Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/products/purana-naam" aria-label={t('Purana address')} className="dir-ltr" />
          <ArrowRight className="hidden h-4 w-4 self-center text-slate-400 md:block rtl-flip" />
          <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="/products/naya-naam" aria-label={t('Naya address')} className="dir-ltr" />
          <Button type="submit" disabled={!from.trim() || !to.trim()} loading={add.isPending} leftIcon={<Plus className="h-4 w-4" />}>{t('Add')}</Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1"><Input size="sm" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={t('Dhoondein')} leftIcon={<Search className="h-4 w-4" />} /></div>
          <Button size="sm" variant="secondary" onClick={() => setBulkOpen(true)} leftIcon={<Upload className="h-4 w-4" />}>{t('List chipkayein')}</Button>
        </div>
      </div>
      {q.isLoading ? <Skeleton className="m-4 h-40 rounded-xl" /> : !q.data?.items.length ? (
        <EmptyState icon={<ListTree className="h-6 w-6" />} title={t('Koi purana address nahi')} description={t('Shopify se aane par product aur collection ke purane address khud yahan aate hain.')} />
      ) : (
        <ul className="divide-y divide-slate-100">
          {q.data.items.map((r) => (
            <li key={r.id} className="flex items-center gap-2 px-4 py-2 text-[0.8125rem]">
              <code className="min-w-0 flex-1 truncate text-slate-700 dir-ltr">{r.fromPath}</code>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400 rtl-flip" />
              <code className="min-w-0 flex-1 truncate text-slate-900 dir-ltr">{r.toPath}</code>
              {r.source === 'SHOPIFY' && <Badge size="xs">Shopify</Badge>}
              <span className="hidden w-16 text-end tabular-nums text-slate-400 sm:block">{t('{{n}} visit', { n: r.hits })}</span>
              <button type="button" onClick={() => del.mutate(r.id)} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={t('Hatayein')}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-2 text-[0.8125rem]">
          <Button size="xs" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t('Pichla')}</Button>
          <span className="tabular-nums text-slate-500">{page} / {pages}</span>
          <Button size="xs" variant="ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{t('Agla')}</Button>
        </div>
      )}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={t('Bahut se address ek saath')}
        description={t('Har line me purana aur naya address, comma se alag. Excel se do column copy karke bhi chipka sakte hain.')}
        footer={<><Button variant="secondary" onClick={() => setBulkOpen(false)}>{t('Cancel')}</Button><Button disabled={!rows.length} loading={addBulk.isPending} onClick={() => addBulk.mutate()}>{t('{{n}} add karein', { n: rows.length })}</Button></>}>
        <Textarea rows={10} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'/old-page,/pages/about\n/collections/old,/collections/new'} className="font-mono text-[0.78125rem] dir-ltr" />
      </Modal>
    </Card>
  );
}
