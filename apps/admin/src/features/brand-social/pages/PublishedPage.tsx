/**
 * Published (/social/published): every post that went out. Per platform the
 * live link, when it went live and its status; the latest numbers per
 * platform and per post; filters (platform, period, kind, pillar), search and
 * sorting by any number. Opening a row shows each platform's numbers with
 * the edit / delete actions the platform allows.
 */

import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronRight, ExternalLink, Layers, Megaphone, Share2, Shapes } from 'lucide-react';
import {
  Card, DateRangeMenu, EmptyState, FilterBar, FilterMenu, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { brandSocialApi, POST_KINDS, SOCIAL_PLATFORMS, type MetricKey, type PublishedPost } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { KIND_LABEL, PLATFORM, PlatformMark } from '../lib/platforms';
import { useSettings } from '../lib/queries';
import { fmtDateTime, fmtKeyDay } from '../lib/time';
import { LoadError, PillarDot, PostThumb } from '../components/SocialUi';
import { METRICS, PlatformResult, platformStatus } from '../components/LiveResults';

type SortKey = MetricKey | 'publishedAt';

export default function PublishedPage() {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [platform, setPlatform] = useState('ALL');
  const [kind, setKind] = useState('ALL');
  const [pillar, setPillar] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'publishedAt', dir: 'desc' });
  const [open, setOpen] = useState<string | null>(null);
  const settings = useSettings().data;
  const r = resolveRange(range, 0);
  const filters = {
    from: r?.from, to: r?.to, platform: platform === 'ALL' ? undefined : platform, kind: kind === 'ALL' ? undefined : kind,
    pillar: pillar === 'ALL' ? undefined : pillar, search: search.trim() || undefined, sort: sort.key, dir: sort.dir,
  };
  const q = useQuery({ queryKey: ['brand-social', 'published', filters], queryFn: () => brandSocialApi.published(filters), placeholderData: (p) => p, refetchInterval: 5 * 60_000 });
  const d = q.data;
  const filtered = platform !== 'ALL' || kind !== 'ALL' || pillar !== 'ALL' || range.preset !== 'all' || !!search.trim();

  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  const SortHead = ({ k, children }: { k: SortKey; children: string }) => (
    <Th align="right" aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => sortBy(k)} className={cn('inline-flex items-center gap-1 uppercase hover:text-slate-900', sort.key === k && 'text-slate-900')}>
        {children}{sort.key === k ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </Th>
  );

  return (
    <PageShell>
      <PageHero
        title="Published"
        chip={r ? `${fmtKeyDay(r.from)} – ${fmtKeyDay(r.to)}` : 'All time'}
        busy={q.isFetching}
        loading={q.isLoading}
        stats={d ? [
          { label: 'Posts', value: num(d.total) },
          { label: 'Views', value: num(d.totals.impressions) },
          { label: 'Reach', value: num(d.totals.reach) },
          { label: 'Engagement', value: num(d.totals.engagement), hint: 'Likes, comments, shares, saves' },
          { label: 'Link clicks', value: num(d.totals.clicks) },
        ] : undefined}
      />
      <FilterBar
        search={<SearchField value={search} onChange={setSearch} placeholder="Search title, caption or code" />}
        onClear={filtered ? () => { setPlatform('ALL'); setKind('ALL'); setPillar('ALL'); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); } : undefined}
      >
        <DateRangeMenu value={range} onChange={setRange} startHour={0} allowAll defaultPreset="all" />
        <FilterMenu icon={Share2} label="Platform" value={platform} active={platform !== 'ALL'} onChange={setPlatform}
          options={[{ value: 'ALL', label: 'All platforms' }, ...SOCIAL_PLATFORMS.map((p) => ({ value: p, label: PLATFORM[p].label }))]} />
        <FilterMenu icon={Shapes} label="Kind" value={kind} active={kind !== 'ALL'} onChange={setKind}
          options={[{ value: 'ALL', label: 'Every kind' }, ...POST_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))]} />
        <FilterMenu icon={Layers} label="Pillar" value={pillar} active={pillar !== 'ALL'} onChange={setPillar} align="right"
          options={[{ value: 'ALL', label: 'Every pillar' }, ...(settings?.pillars ?? []).map((p) => ({ value: p.key, label: p.label }))]} />
      </FilterBar>

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="published posts" /> : q.isLoading || !d ? (
        <Card flush><div className="space-y-2 p-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div></Card>
      ) : !d.posts.length ? (
        <Card>
          <EmptyState icon={<Megaphone className="h-6 w-6" />} title={filtered ? 'No posts match these filters' : 'Nothing published yet'}
            description={filtered ? 'Change or clear the filters.' : 'Posts show here as soon as they go live on any platform.'}
            action={!filtered && <Link to="/social/posts/new" className="text-[0.8125rem] font-semibold text-brand-700 underline">Write a post</Link>} />
        </Card>
      ) : (
        <Card flush>
          <Table minWidth="72rem">
            <THead>
              <Tr>
                <Th className="w-8" />
                <Th>
                  <button type="button" onClick={() => sortBy('publishedAt')} className={cn('inline-flex items-center gap-1 uppercase hover:text-slate-900', sort.key === 'publishedAt' && 'text-slate-900')}>
                    Post{sort.key === 'publishedAt' ? (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                </Th>
                <Th>Platforms</Th>
                {METRICS.map((m) => <SortHead key={m.key} k={m.key}>{m.short}</SortHead>)}
              </Tr>
            </THead>
            <TBody>
              {d.posts.map((p) => (
                <Fragment key={p.id}>
                  <Tr interactive onClick={() => setOpen(open === p.id ? null : p.id)} className={cn(open === p.id && 'bg-slate-50')}>
                    <Td className="pe-0">{open === p.id ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <PostThumb media={p.thumbUrl ? [{ url: p.thumbUrl, kind: 'image' }] : []} kind={p.kind} size={40} />
                        <div className="min-w-0">
                          <Link to={`/social/posts/${p.id}`} onClick={(e) => e.stopPropagation()} className="block max-w-[16rem] truncate font-semibold text-slate-900 hover:text-brand-700">{p.title || 'Untitled post'}</Link>
                          <span className="flex items-center gap-2 text-[0.75rem] text-slate-500">
                            {KIND_LABEL[p.kind]} · {p.publishedAt ? fmtDateTime(p.publishedAt) : '—'}<PillarDot pillar={p.pillar} pillars={settings?.pillars} withLabel />
                          </span>
                        </div>
                      </div>
                    </Td>
                    <Td><PlatformLinks post={p} /></Td>
                    {METRICS.map((m) => <Td key={m.key} align="right" className={cn(sort.key === m.key && 'font-semibold text-slate-900')}>{num(p.totals[m.key])}</Td>)}
                  </Tr>
                  {open === p.id && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={3 + METRICS.length} className="px-4 pb-4 pt-1">
                        <ul className="grid gap-2 xl:grid-cols-2">
                          {p.platforms.map((v) => (
                            <PlatformResult key={v.platform} postId={p.id} v={v} compact
                              defaults={{ message: p.texts[v.platform] ?? p.caption, title: p.title, description: p.texts[v.platform] ?? p.caption, link: null }} />
                          ))}
                        </ul>
                        <p className="mt-2 text-[0.75rem] text-slate-500">
                          {p.fetchedAt ? `Numbers from ${fmtDateTime(p.fetchedAt)}. ` : ''}
                          <Link to={`/social/posts/${p.id}`} className="font-semibold text-brand-700 hover:underline">Open the post</Link> for the trend and "Refresh results".
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}

/** One chip per platform: status colour, and the live link when there is one. */
function PlatformLinks({ post }: { post: PublishedPost }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {post.platforms.map((v) => {
        const st = platformStatus(v);
        const tone = st.variant === 'success' ? 'bg-success-50 text-success-700 ring-success-200' : st.variant === 'danger' ? 'bg-rose-50 text-rose-700 ring-rose-200'
          : st.variant === 'warning' ? 'bg-amber-50 text-amber-800 ring-amber-200' : st.variant === 'info' ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-50 text-slate-500 ring-slate-200';
        const cls = cn('inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.6875rem] font-medium ring-1', tone);
        const label = <><PlatformMark p={v.platform} size={12} />{st.label}</>;
        return v.permalink && !v.deletedAt && v.status === 'PUBLISHED'
          ? <a key={v.platform} href={v.permalink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={cn(cls, 'hover:underline')} title={`Open on ${PLATFORM[v.platform].label}`}>{label}<ExternalLink className="h-3 w-3" /></a>
          : <span key={v.platform} className={cls}>{label}</span>;
      })}
    </span>
  );
}
