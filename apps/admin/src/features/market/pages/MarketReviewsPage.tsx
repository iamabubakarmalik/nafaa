/**
 * Market reviews moderation: every product, shop and order review with its
 * rating, customer reports and visibility. Staff hide a review (with a
 * reason) or show it again; shop and product ratings are recounted. Search,
 * filters and pages run on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, Eye, EyeOff, Flag, MessageSquareText, Search, Star, Tag } from 'lucide-react';
import { Button, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, type MarketReviewRow } from '@/api/admin-market.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatRelative, num } from '@/lib/format';
import { Pill } from '@/features/shared/kit';
import { TextActionModal } from '@/features/stores/components/TextActionModal';
import { GuideButton, MarketGuide } from '../components/MarketUi';

const RATINGS = [['ALL', 'Any rating'], ['low', '1–2 stars'], ['5', '5 stars'], ['4', '4 stars'], ['3', '3 stars'], ['2', '2 stars'], ['1', '1 star']] as const;
const VISIBILITY = [['ALL', 'Shown and hidden'], ['0', 'Shown'], ['1', 'Hidden']] as const;
const TYPES = [['ALL', 'Any kind'], ['PRODUCT', 'Product'], ['SHOP', 'Shop'], ['ORDER', 'Order'], ['RIDER', 'Rider']] as const;
const label = (list: ReadonlyArray<readonly [string, string]>, v: string) => list.find(([k]) => k === v)?.[1] ?? v;

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} stars`}>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`h-3.5 w-3.5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />)}
    </span>
  );
}

export default function MarketReviewsPage() {
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [hiding, setHiding] = useState<MarketReviewRow | null>(null);
  const list = useListParams({ rating: 'ALL', hidden: 'ALL', reported: '', type: 'ALL', shopId: '' });
  const { rating, hidden, reported, type, shopId } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    rating: rating === 'ALL' ? undefined : rating,
    hidden: hidden === 'ALL' ? undefined : hidden,
    reported: reported || undefined,
    type: type === 'ALL' ? undefined : type,
    shopId: shopId || undefined,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-reviews', query, list.page, list.limit],
    queryFn: () => adminMarketApi.reviews({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const canManage = can('marketplace.manage');

  const toggle = useMutation({
    mutationFn: (v: { id: string; hidden: boolean; reason?: string }) => adminMarketApi.setReviewHidden(v.id, v.hidden, v.reason),
    onSuccess: (r) => { toast.success(r.hidden ? 'Review hidden' : 'Review shown again'); setHiding(null); void qc.invalidateQueries({ queryKey: ['admin-market-reviews'] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const show = async (r: MarketReviewRow) => {
    if (await confirmDialog({ title: 'Show this review again?', text: 'Customers see it on the product or shop page and it counts in the rating.', yes: 'Show' })) toggle.mutate({ id: r.id, hidden: false });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMarketApi.reviews({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<MarketReviewRow>('market-reviews', all, [
        { label: 'Date', value: (r) => r.createdAt }, { label: 'Kind', value: (r) => r.type }, { label: 'Rating', value: (r) => r.rating },
        { label: 'Title', value: (r) => r.title }, { label: 'Comment', value: (r) => r.comment }, { label: 'Customer', value: (r) => r.customer.name },
        { label: 'Shop', value: (r) => r.shop?.name }, { label: 'Product', value: (r) => r.product?.name }, { label: 'Reports', value: (r) => r.reports },
        { label: 'Hidden', value: (r) => (r.hidden ? 'Yes' : 'No') }, { label: 'Hidden reason', value: (r) => r.hiddenReason }, { label: 'Shop reply', value: (r) => r.reply },
      ]);
      toast.success(`${num(all.length)} reviews exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    rating !== 'ALL' && <FilterChip key="r" onRemove={() => list.setFilter('rating', 'ALL')}>{label(RATINGS, rating)}</FilterChip>,
    hidden !== 'ALL' && <FilterChip key="h" onRemove={() => list.setFilter('hidden', 'ALL')}>{label(VISIBILITY, hidden)}</FilterChip>,
    reported && <FilterChip key="p" onRemove={() => list.setFilter('reported', '')}>Reported</FilterChip>,
    type !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('type', 'ALL')}>{label(TYPES, type)}</FilterChip>,
    shopId && <FilterChip key="s" onRemove={() => list.setFilter('shopId', '')}>One shop</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Reviews"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={data ? [
          { label: 'Matching', value: num(data.total) },
          { label: 'Reported', value: num(data.summary.reported), hint: 'Reviews with a customer report' },
          { label: 'Low and shown', value: num(data.summary.low), hint: '1–2 stars' },
          { label: 'Hidden', value: num(data.summary.hidden) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search review text or customer" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Star} label="Rating" value={rating} active={rating !== 'ALL'} onChange={(v) => list.setFilter('rating', v)} options={RATINGS.map(([value, l]) => ({ value, label: l }))} />
        <FilterMenu icon={Eye} label="Visibility" value={hidden} active={hidden !== 'ALL'} onChange={(v) => list.setFilter('hidden', v)} options={VISIBILITY.map(([value, l]) => ({ value, label: l }))} />
        <FilterMenu icon={Flag} label="Reports" value={reported} active={!!reported} onChange={(v) => list.setFilter('reported', v)} options={[{ value: '', label: 'All reviews' }, { value: '1', label: 'Reported only' }]} />
        <FilterMenu icon={Tag} label="Kind" value={type} active={type !== 'ALL'} onChange={(v) => list.setFilter('type', v)} align="right" options={TYPES.map(([value, l]) => ({ value, label: l }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<MessageSquareText className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load reviews' : 'No reviews match'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="64rem">
          <THead>
            <Tr><Th>Review</Th><Th>About</Th><Th>Customer</Th><Th align="right">Reports</Th><Th>State</Th><Th>Date</Th><Th align="right"> </Th></Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id}>
                <Td className="max-w-[26rem]">
                  <Stars value={r.rating} />
                  {r.title && <div className="mt-0.5 font-medium text-slate-900">{r.title}</div>}
                  <div className="line-clamp-3 text-[0.8125rem] text-slate-600">{r.comment ?? <span className="text-slate-400">No text</span>}</div>
                  {r.reply && <div className="mt-1 line-clamp-2 text-[0.75rem] text-slate-500">Shop reply: {r.reply}</div>}
                  {!!r.imageUrls.length && <div className="mt-1 flex gap-1">{r.imageUrls.slice(0, 4).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="h-10 w-10 rounded object-cover" /></a>)}</div>}
                </Td>
                <Td>
                  <div className="text-[0.75rem] text-slate-500">{r.type.toLowerCase()}</div>
                  {r.product && <div className="text-slate-800">{r.product.name}</div>}
                  {r.shop && <Link to={`/market/shops/${r.shop.shopId}`} className="text-[0.8125rem] text-brand-700 hover:underline">{r.shop.name}</Link>}
                </Td>
                <Td><Link to={`/market/customers/${r.customer.id}`} className="text-slate-800 hover:text-brand-700">{r.customer.name}</Link>{r.verified && <div className="text-[0.75rem] text-emerald-600">Verified purchase</div>}</Td>
                <Td align="right">{r.reports ? <Pill tone="rose">{r.reports}</Pill> : <span className="text-slate-400">0</span>}</Td>
                <Td>{r.hidden ? <div><Pill tone="slate">Hidden</Pill>{r.hiddenReason && <div className="mt-0.5 max-w-[12rem] text-[0.75rem] text-slate-500">{r.hiddenReason}</div>}</div> : <Pill tone="emerald">Shown</Pill>}</Td>
                <Td className="whitespace-nowrap">{formatRelative(r.createdAt)}</Td>
                <Td align="right">
                  {canManage && (r.hidden
                    ? <Button size="sm" variant="secondary" onClick={() => void show(r)} disabled={toggle.isPending}><Eye className="h-4 w-4" /> Show</Button>
                    : <Button size="sm" variant="secondary" onClick={() => setHiding(r)} disabled={toggle.isPending}><EyeOff className="h-4 w-4" /> Hide</Button>)}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <TextActionModal open={!!hiding} onClose={() => setHiding(null)} busy={toggle.isPending} danger required={false}
        title="Hide this review?" description="Customers stop seeing it and it no longer counts in the rating. You can show it again later."
        label="Reason (kept for staff)" placeholder="e.g. Abusive language, or not about this shop." yes="Hide review"
        onConfirm={(reason) => hiding && toggle.mutate({ id: hiding.id, hidden: true, reason })} />

      {guide.isOpen && (
        <MarketGuide
          title="Reviews"
          description="Keep Market reviews honest and clean."
          flowTitle="Moderate a review"
          flow={[
            { label: 'Reported', hint: 'Or low rating', icon: Flag, color: '#e11d48' },
            { label: 'Read', hint: 'Text and photos', icon: Search, color: '#0284c7' },
            { label: 'Hide or keep', hint: 'Rating recounted', icon: EyeOff, color: '#64748b' },
          ]}
          steps={[
            { icon: Flag, color: '#e11d48', title: 'Start with reports', text: 'Filter Reported only to see reviews customers flagged.' },
            { icon: Star, color: '#d97706', title: 'Check low ratings', text: '1–2 star reviews often need a look, but honest bad reviews stay.' },
            { icon: EyeOff, color: '#64748b', title: 'Hide only abuse', text: 'Hide spam, abuse or reviews about the wrong shop. Give a reason for the record.' },
          ]}
          tips={['Hiding recounts the shop or product rating at once.', 'Shops reply to reviews from their own POS.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
