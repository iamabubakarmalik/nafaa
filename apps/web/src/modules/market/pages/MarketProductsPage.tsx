/**
 * Online products: the shop's POS catalog with its Market listing state.
 * Search, listed / not listed, POS category, stock, photo and sort all run
 * on the server a page at a time;
 * stock always comes from the POS. Products can be listed one by one or in
 * bulk, and each opens a drawer for its Market name, photos and price.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownWideNarrow, CheckSquare, EyeOff, Filter, FolderTree, ImageOff, Package, PackageX, Rocket, Search, Store } from 'lucide-react';
import {
  Badge, Button, Checkbox, EmptyState, FilterBar, FilterChip, FilterMenu, Kbd, PageHero, PageShell, SearchField, SkeletonTable, Switch,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { errorText, marketApi, type MarketProductRow } from '../api/market.api';
import { shopGate, useMarketConfig, useMarketProfile } from '../hooks/useMarket';
import { ProductMarketDrawer } from '../components/ProductMarketDrawer';
import { GuideButton, Pager, TONE } from '../components/parts';

type Listed = 'all' | 'listed' | 'unlisted';
type Stock = 'all' | 'in' | 'out';
type Sort = 'listed' | 'name' | 'price_asc' | 'price_desc';

export default function MarketProductsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [listed, setListed] = useState<Listed>('all');
  const [stock, setStock] = useState<Stock>('all');
  const [noPhoto, setNoPhoto] = useState(false);
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<Sort>('listed');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const profileQ = useMarketProfile();
  const configQ = useMarketConfig();
  const gate = configQ.data?.gates.find((g) => g.id === shopGate(profileQ.data));

  useEffect(() => { const h = setTimeout(() => setQ(search.trim()), 250); return () => clearTimeout(h); }, [search]);
  useEffect(() => { setPage(1); setPicked(new Set()); }, [q, listed, sort, stock, noPhoto, category]);

  const params = {
    search: q || undefined,
    listed: listed === 'all' ? undefined : listed === 'listed' ? 'yes' as const : 'no' as const,
    category: category || undefined,
    stock: stock === 'all' ? undefined : stock,
    photo: noPhoto ? 'none' as const : undefined,
    sortBy: sort, page, limit: 30,
  };
  const listQ = useQuery({ queryKey: ['market', 'products', params], queryFn: () => marketApi.products.list(params), placeholderData: (prev) => prev });
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const shown = listQ.data?.items ?? [];
  const counts = listQ.data?.counts;
  const meta = listQ.data?.meta;
  const categoryOptions = useMemo(() => [
    { value: '', label: t('Sab categories') },
    ...(categoriesQ.data ?? []).filter((c) => c.isActive !== false).map((c) => ({ value: c.id, label: c.name })),
  ], [categoriesQ.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['market'] });
  const bulk = useMutation({
    mutationFn: (on: boolean) => (on ? marketApi.products.bulkPublish([...picked]) : marketApi.products.bulkUnpublish([...picked])),
    onSuccess: (r, on) => {
      toast.success(on ? t('{{count}} products online ho gaye', { count: r?.count ?? picked.size }) : t('{{count}} products online se hata diye', { count: r?.count ?? picked.size }));
      setPicked(new Set());
      invalidate();
    },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const toggleOne = useMutation({
    mutationFn: (r: MarketProductRow) => (r.isListedOnMarketplace ? marketApi.products.unpublish(r.productId) : marketApi.products.publish(r.productId)),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const pick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = shown.length > 0 && shown.every((r) => picked.has(r.productId));
  const pickAll = () => setPicked(allPicked ? new Set() : new Set(shown.map((r) => r.productId)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'a' && canEdit) { e.preventDefault(); pickAll(); }
      if (k === 'l' && canEdit && picked.size) { e.preventDefault(); bulk.mutate(true); }
      if (k === 'u' && canEdit && picked.size) { e.preventDefault(); bulk.mutate(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const LISTED = [{ value: 'all' as const, label: t('Sab') }, { value: 'listed' as const, label: t('Online') }, { value: 'unlisted' as const, label: t('Online nahi') }];
  const STOCKS = [{ value: 'all' as const, label: t('Sab') }, { value: 'in' as const, label: t('Stock hai') }, { value: 'out' as const, label: t('Stock khatam') }];
  const filtered = listed !== 'all' || stock !== 'all' || noPhoto || !!category || !!q;
  const clear = () => { setListed('all'); setStock('all'); setNoPhoto(false); setCategory(''); setSearch(''); };

  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Online products')}
        chip={<><Store /> {t('POS catalog Market par')}</>}
        loading={listQ.isLoading}
        busy={listQ.isFetching && !listQ.isLoading}
        actions={<>
          {canEdit && picked.size > 0 && (
            <>
              <button type="button" className={heroButton} onClick={() => bulk.mutate(true)} disabled={bulk.isPending}><Rocket className="h-4 w-4" /> {t('{{count}} online karein', { count: picked.size })}</button>
              <button type="button" className={heroButton} onClick={() => bulk.mutate(false)} disabled={bulk.isPending}><EyeOff className="h-4 w-4" /> {t('Hatayein')}</button>
            </>
          )}
          <GuideButton onClick={guide.open} />
        </>}
        stats={counts ? [
          { label: t('Online'), value: counts.listed },
          { label: t('Online nahi'), value: counts.unlisted },
          { label: t('Kul products'), value: counts.total },
          { label: t('Is filter me'), value: meta?.total ?? 0 },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Naam ya SKU…')} label={t('Search')} />}
        chips={filtered ? <>
          {listed !== 'all' && <FilterChip onRemove={() => setListed('all')}>{LISTED.find((o) => o.value === listed)?.label}</FilterChip>}
          {stock !== 'all' && <FilterChip onRemove={() => setStock('all')}>{STOCKS.find((o) => o.value === stock)?.label}</FilterChip>}
          {noPhoto && <FilterChip onRemove={() => setNoPhoto(false)}>{t('Tasveer nahi')}</FilterChip>}
          {category && <FilterChip onRemove={() => setCategory('')}>{categoryOptions.find((o) => o.value === category)?.label}</FilterChip>}
          {q && <FilterChip onRemove={() => setSearch('')}>"{q}"</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={Filter} label={t('Halat')} value={listed} active={listed !== 'all'} onChange={setListed} options={LISTED} />
        {categoryOptions.length > 1 && <FilterMenu icon={FolderTree} label={t('Category')} value={category} active={!!category} onChange={setCategory} options={categoryOptions} />}
        <FilterMenu icon={PackageX} label={t('Stock')} value={stock} active={stock !== 'all'} onChange={setStock} options={STOCKS} />
        <FilterMenu icon={ImageOff} label={t('Tasveer')} value={noPhoto ? 'none' : 'all'} active={noPhoto} onChange={(v) => setNoPhoto(v === 'none')}
          options={[{ value: 'all', label: t('Sab') }, { value: 'none', label: t('Tasveer nahi') }]} />
        <FilterMenu icon={ArrowDownWideNarrow} label={t('Sort')} value={sort} active={sort !== 'listed'} onChange={setSort} align="right"
          options={[{ value: 'listed', label: t('Haal hi me badle') }, { value: 'name', label: t('Naam (A–Z)') }, { value: 'price_asc', label: t('Sasta pehle') }, { value: 'price_desc', label: t('Mehnga pehle') }]} />
      </FilterBar>

      <ViewTabs value="list" onChange={() => undefined}
        tabs={[{ id: 'list', label: t('Products'), icon: Package, count: meta?.total ?? null }]}
        hint={<><Kbd>/</Kbd> {t('search')} · <Kbd>Space</Kbd> {t('chunein')} · <Kbd>L</Kbd> {t('online')} · <Kbd>U</Kbd> {t('hatayein')}</>} />

      {listQ.isLoading ? <SkeletonTable /> : !shown.length ? (
        <EmptyState icon={<Search className="h-6 w-6" />} title={t('Koi product nahi mila')}
          description={filtered ? t('Filter badal kar dekhein') : t('POS me products banayein, phir yahan online karein')} />
      ) : (
        <Table minWidth="48rem">
          <THead>
            <Tr>
              {canEdit && <Th className="w-10"><Checkbox aria-label={t('Sab chunein')} checked={allPicked} onChange={pickAll} /></Th>}
              <Th>{t('Product')}</Th>
              <Th align="right">{t('POS qeemat')}</Th>
              <Th align="right">{t('Market qeemat')}</Th>
              <Th align="right">{t('Stock (POS)')}</Th>
              <Th align="right">{t('Bika')}</Th>
              <Th>{t('Online')}</Th>
            </Tr>
          </THead>
          <TBody>
            {shown.map((r) => {
              const custom = Number(r.publicPrice) !== Number(r.productPrice);
              return (
                <Tr key={r.productId} data-nav-row className={cn('transition hover:bg-slate-50/80', picked.has(r.productId) && 'bg-brand-50/50')}>
                  {canEdit && <Td><Checkbox data-nav-select aria-label={t('Chunein')} checked={picked.has(r.productId)} onChange={() => pick(r.productId)} /></Td>}
                  <Td>
                    <button type="button" data-nav-open onClick={() => setOpen(r.productId)} className="flex min-w-0 items-center gap-3 text-start">
                      {r.publicImages[0]
                        ? <img src={r.publicImages[0]} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                        : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageOff className="h-4 w-4" /></span>}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900">{r.publicName || r.productName}</span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{[r.productSku, r.marketplaceCategory].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                    </button>
                  </Td>
                  <Td align="right" className="tabular-nums text-slate-600">{formatPKR(r.productPrice)}</Td>
                  <Td align="right" className="tabular-nums">
                    <span className={cn('font-semibold', custom ? 'text-brand-700' : 'text-slate-900')}>{formatPKR(r.publicPrice)}</span>
                    {r.compareAtPrice ? <span className="ms-1 text-[0.75rem] text-slate-400 line-through">{formatPKR(r.compareAtPrice)}</span> : null}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {r.productStock <= 0 ? <Badge size="xs" variant="danger">{t('Khatam')}</Badge> : <span className="text-slate-700">{r.productStock}</span>}
                  </Td>
                  <Td align="right" className="tabular-nums text-slate-600">{r.totalSold}</Td>
                  <Td>
                    <Switch size="sm" aria-label={t('Online')} checked={r.isListedOnMarketplace} disabled={!canEdit || toggleOne.isPending}
                      onChange={() => toggleOne.mutate(r)} />
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      )}

      {meta && <Pager page={page} totalPages={meta.totalPages} onPage={setPage} />}

      <ProductMarketDrawer productId={open} onClose={() => setOpen(null)} canEdit={canEdit} gate={gate} />

      {guide.isOpen && (
        <PageGuide title={t('Online products')} onClose={guide.close}
          flow={[
            { label: t('POS product'), icon: Package, color: TONE.slate },
            { label: t('Tasveer aur qeemat'), hint: t('Khali = POS qeemat'), icon: ImageOff, color: TONE.pink },
            { label: t('Online karein'), icon: Rocket, color: TONE.green },
            { label: t('Stock POS se'), hint: t('Khud update'), icon: Store, color: TONE.blue },
          ]}
          steps={[
            { icon: CheckSquare, color: TONE.green, title: t('Bohat sare ek saath'), text: t('Products chunein (Space ya checkbox), phir upar "online karein" ya "Hatayein".') },
            { icon: Package, color: TONE.blue, title: t('Ek product'), text: t('Product par click karein: Market ka naam, tafseel, tasveerein, qeemat aur category.') },
            { icon: Store, color: TONE.amber, title: t('Stock'), text: t('Stock hamesha POS wala hai. Khatam ho to Market par "Abhi nahi milta" dikhta hai.') },
            { icon: ImageOff, color: TONE.pink, title: t('Tasveer zaroori'), text: t('"Tasveer nahi" filter se woh products dhoondein jin ki tasveer nahi — tasveer wale zyada bikte hain.') },
          ]}
          shortcuts={[['/', t('search')], ['Space', t('chunein')], ['A', t('sab chunein')], ['L', t('online karein')], ['U', t('hatayein')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
