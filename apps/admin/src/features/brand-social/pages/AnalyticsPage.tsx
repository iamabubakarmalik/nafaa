/**
 * Analytics (/social/analytics): followers growth per account, reach per
 * day, top posts, best posting hour (Pakistan time), pillar performance and
 * tracked link clicks with signups, for a chosen date range.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, MousePointerClick } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, DateRangeMenu, EmptyState, FilterBar, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, resolveRange, type DateRangeValue } from '@/design-system/components';
import { brandSocialApi, type AnalyticsResult } from '@/api/admin-brand-social.api';
import { useChartColors } from '@/ui/chart';
import { cn } from '@/lib/cn';
import { num } from '@/lib/format';
import { KIND_LABEL, PLATFORM, PlatformMark } from '../lib/platforms';
import { KEYS, useSettings } from '../lib/queries';
import { fmtDateTime, fmtKeyDay } from '../lib/time';
import { LoadError, PillarDot } from '../components/SocialUi';

const WEEK = [1, 2, 3, 4, 5, 6, 0];
const WEEK_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pct = (v: number | null | undefined) => (v == null ? '—' : `${v.toFixed(1)}%`);

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const { from, to } = resolveRange(range, 0) ?? { from: '', to: '' };
  const q = useQuery({ queryKey: KEYS.analytics(from, to), queryFn: () => brandSocialApi.analytics(from, to), enabled: !!from && !!to, placeholderData: (p) => p });
  const pillars = useSettings().data?.pillars;
  const d = q.data;
  const t = d?.totals;

  return (
    <PageShell>
      <PageHero
        title="Analytics"
        chip={from && to ? `${fmtKeyDay(from)} – ${fmtKeyDay(to)}` : undefined}
        busy={q.isFetching}
        loading={q.isLoading}
        stats={t ? [
          { label: 'Posts', value: num(t.posts) },
          { label: 'Reach', value: num(t.reach), hint: `${num(t.impressions)} impressions` },
          { label: 'Engagement', value: num(t.engagement), hint: `${pct(t.engagementRate)} rate` },
          { label: 'Link clicks', value: num(t.linkClicks) },
          { label: 'Signups', value: num(t.signups), hint: 'From tracked links' },
        ] : undefined}
      />
      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="analytics" /> : q.isLoading || !d ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : (
        <>
          <Followers data={d} />
          <div className="grid gap-4 lg:grid-cols-2">
            <ReachChart data={d} />
            <Heatmap data={d} />
          </div>

          <Card flush title="Top posts" description="By engagement in this period">
            {!d.topPosts.length ? <EmptyState title="No published posts with results yet" description="Results are fetched every hour for new posts and daily after a week." /> : (
              <Table minWidth="48rem">
                <THead><Tr><Th>Post</Th><Th>Platform</Th><Th align="right">Reach</Th><Th align="right">Engagement</Th><Th align="right">Rate</Th><Th align="right">Clicks</Th></Tr></THead>
                <TBody>
                  {d.topPosts.map((p) => (
                    <Tr key={`${p.id}-${p.platform}`}>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          {p.thumbUrl ? <img src={p.thumbUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="h-9 w-9 rounded-lg bg-slate-100" />}
                          <div className="min-w-0">
                            <Link to={`/social/posts/${p.id}`} className="block max-w-[18rem] truncate font-semibold text-slate-900 hover:text-brand-700">{p.title}</Link>
                            <span className="flex items-center gap-2 text-[0.75rem] text-slate-500">{KIND_LABEL[p.kind]} · {p.publishedAt ? fmtDateTime(p.publishedAt) : '—'}<PillarDot pillar={p.pillar} pillars={pillars} /></span>
                          </div>
                        </div>
                      </Td>
                      <Td><span className="inline-flex items-center gap-1.5"><PlatformMark p={p.platform} size={14} />{PLATFORM[p.platform].label}{p.permalink && <a href={p.permalink} target="_blank" rel="noreferrer" aria-label="Open on platform" className="text-slate-400 hover:text-slate-700"><ExternalLink className="h-3.5 w-3.5" /></a>}</span></Td>
                      <Td align="right" className="tabular-nums">{num(p.reach)}</Td>
                      <Td align="right" className="tabular-nums">{num(p.engagement)}</Td>
                      <Td align="right" className="tabular-nums">{pct(p.engagementRate)}</Td>
                      <Td align="right" className="tabular-nums">{num(p.clicks)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Pillars" description="How each content pillar does">
              {!d.pillars.length ? <EmptyState title="No pillar results yet" description="Give posts a pillar in the composer to compare them here." /> : (
                <ul className="space-y-3">
                  {(() => {
                    const max = Math.max(...d.pillars.map((p) => p.engagementRate), 0.0001);
                    return [...d.pillars].sort((a, b) => b.engagementRate - a.engagementRate).map((p) => (
                      <li key={p.pillar}>
                        <div className="flex items-center gap-2 text-[0.8125rem]">
                          <PillarDot pillar={p.pillar} pillars={pillars} withLabel />
                          <span className="ms-auto tabular-nums text-slate-500">{num(p.posts)} posts · {num(p.reach)} reach</span>
                          <span className="w-14 text-end font-semibold tabular-nums text-slate-900">{pct(p.engagementRate)}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, (p.engagementRate / max) * 100)}%` }} title={`${pct(p.engagementRate)} engagement rate`} />
                        </div>
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </Card>
            <Card flush title={<span className="flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-slate-500" />Links and signups</span>} description={`${num(d.links.clicks)} clicks · ${num(d.links.signups)} signups from tracked links`}>
              {!d.links.byCampaign.length && !d.links.byPost.length ? <EmptyState title="No tracked clicks yet" description="Add a link in the composer; it is tagged per platform so clicks and signups land here." /> : (
                <Table>
                  <THead><Tr><Th>Campaign / post</Th><Th align="right">Clicks</Th><Th align="right">Signups</Th></Tr></THead>
                  <TBody>
                    {d.links.byCampaign.map((c) => (
                      <Tr key={`c-${c.campaign}`}><Td className="font-semibold text-slate-900">{c.campaign || 'No campaign'}</Td><Td align="right" className="tabular-nums">{num(c.clicks)}</Td><Td align="right" className="tabular-nums">{num(c.signups)}</Td></Tr>
                    ))}
                    {d.links.byPost.slice(0, 10).map((p) => (
                      <Tr key={`p-${p.code}`}>
                        <Td>{p.postId ? <Link to={`/social/posts/${p.postId}`} className="text-slate-700 hover:text-brand-700">{p.title}</Link> : p.title} <code className="ms-1 text-[0.6875rem] text-slate-400">{p.code}</code></Td>
                        <Td align="right" className="tabular-nums">{num(p.clicks)}</Td><Td align="right" className="tabular-nums">{num(p.signups)}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

/** One small chart per account, each on its own scale, so a big account does not flatten a small one. */
function Followers({ data }: { data: AnalyticsResult }) {
  const c = useChartColors();
  if (!data.followers.length) {
    return <Card title="Followers"><EmptyState title="No follower history yet" description="Follower numbers are saved once a day for each connected account." /></Card>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {data.followers.map((f) => {
        const series = f.series.filter((s) => s.followers != null);
        return (
          <Card key={f.accountId}>
            <div className="flex items-center gap-2">
              <PlatformMark p={f.platform} size={20} />
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-700">{f.name}</span>
              {f.growth != null && <span className={cn('text-[0.75rem] font-semibold tabular-nums', f.growth > 0 ? 'text-success-700' : f.growth < 0 ? 'text-rose-600' : 'text-slate-500')}>{f.growth > 0 ? '+' : ''}{num(f.growth)}</span>}
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{f.current == null ? '—' : num(f.current)}</p>
            <div className="mt-1 h-16">
              {series.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs><linearGradient id={`f-${f.accountId}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.line} stopOpacity={0.25} /><stop offset="100%" stopColor={c.line} stopOpacity={0} /></linearGradient></defs>
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip cursor={{ stroke: c.grid }} contentStyle={{ borderRadius: 10, border: `1px solid ${c.grid}`, fontSize: 12 }} labelFormatter={(_, p) => (p?.[0]?.payload?.day ? fmtKeyDay(p[0].payload.day) : '')} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Followers']} />
                    <Area type="monotone" dataKey="followers" stroke={c.line} strokeWidth={2} fill={`url(#f-${f.accountId})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="pt-5 text-[0.75rem] text-slate-400">Not enough days yet</p>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function ReachChart({ data }: { data: AnalyticsResult }) {
  const c = useChartColors();
  const series = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of data.followers) for (const s of f.series) m.set(s.day, (m.get(s.day) ?? 0) + (s.reach ?? 0));
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, reach]) => ({ day, reach }));
  }, [data]);
  const axis = { stroke: c.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  return (
    <Card title="Reach per day" description="Every connected account together">
      {series.every((s) => !s.reach) ? <EmptyState title="No reach data yet" description="Reach comes from Facebook and Instagram insights once a day." /> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs><linearGradient id="bs-reach" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.line} stopOpacity={0.28} /><stop offset="100%" stopColor={c.line} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke={c.grid} strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={fmtKeyDay} minTickGap={24} {...axis} />
              <YAxis width={48} allowDecimals={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))} {...axis} />
              <Tooltip cursor={{ stroke: c.grid }} contentStyle={{ borderRadius: 12, border: `1px solid ${c.grid}`, fontSize: 12 }} labelFormatter={(l) => fmtKeyDay(String(l))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Reach']} />
              <Area type="monotone" dataKey="reach" stroke={c.line} strokeWidth={2} fill="url(#bs-reach)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

/** Weekday × hour grid, one hue from light to dark by average engagement rate. */
function Heatmap({ data }: { data: AnalyticsResult }) {
  const cells = new Map(data.heatmap.map((h) => [`${h.weekday}-${h.hour}`, h]));
  const max = Math.max(0, ...data.heatmap.map((h) => h.avgEngagementRate));
  const best = [...data.heatmap].filter((h) => h.posts > 0).sort((a, b) => b.avgEngagementRate - a.avgEngagementRate)[0];
  const hourLabel = (h: number) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`);
  return (
    <Card title="Best time to post" description={best ? `Best so far: ${WEEK_LABEL[best.weekday]} around ${hourLabel(best.hour)} PKT (${pct(best.avgEngagementRate)})` : 'Average engagement rate by weekday and hour, Pakistan time'}>
      {!data.heatmap.some((h) => h.posts) ? <EmptyState title="Not enough posts yet" description="After a few weeks of posting, the strongest hours light up here." /> : (
        <div className="overflow-x-auto">
          <div className="min-w-[34rem]">
            <div className="grid grid-cols-[2.25rem_repeat(24,minmax(0,1fr))] gap-0.5">
              <span />
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center text-[0.5625rem] text-slate-400">{h % 3 === 0 ? hourLabel(h) : ''}</span>)}
              {WEEK.map((w) => (
                <div key={w} className="contents">
                  <span className="pe-1 text-end text-[0.6875rem] font-medium leading-5 text-slate-500">{WEEK_LABEL[w]}</span>
                  {Array.from({ length: 24 }, (_, h) => {
                    const c = cells.get(`${w}-${h}`);
                    const v = c && c.posts && max ? c.avgEngagementRate / max : 0;
                    return (
                      <span key={h} title={c?.posts ? `${WEEK_LABEL[w]} ${hourLabel(h)}: ${pct(c.avgEngagementRate)} from ${c.posts} post${c.posts === 1 ? '' : 's'}` : `${WEEK_LABEL[w]} ${hourLabel(h)}: no posts`}
                        className={cn('h-5 rounded-[3px]', !c?.posts && 'bg-slate-100')}
                        style={c?.posts ? { background: `rgb(var(--brand-600) / ${0.15 + v * 0.85})` } : undefined} />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[0.6875rem] text-slate-500">
              Lower
              {[0.15, 0.36, 0.57, 0.78, 1].map((o) => <span key={o} className="h-2.5 w-4 rounded-sm" style={{ background: `rgb(var(--brand-600) / ${o})` }} />)}
              Higher
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
