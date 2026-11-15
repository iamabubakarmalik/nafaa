/**
 * Signup funnel (Merchants workspace): signups by day split by platform or
 * source, the step funnel (signed up → setup done → first product → first
 * bill → active in 7 days → paid) with conversion per platform and per
 * source, web vs mobile, and the list of stuck shops with a bulk "Open in
 * Support". Every filter lives in the URL. Milestones are worked out from
 * each shop's own data; see apps/api/src/admin/journey/journey.logic.ts.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CircleAlert, Globe, Headphones, HeartPulse, Lightbulb, Megaphone, MonitorSmartphone, RefreshCw, Smartphone, TrafficCone, UserPlus } from 'lucide-react';
import {
  Badge, Button, Card, DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Segmented, Skeleton,
  Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminJourneyApi, type FunnelGroup, type JourneyFunnel } from '@/api/admin-journey.api';
import { ListCard, SERIES, useChartColors, useListParams } from '@/ui';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime, formatRelative, num } from '@/lib/format';
import { PERIOD_DEFAULTS, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { HEALTH, PLATFORM, PLATFORM_KEYS, STUCK, USES, pct, supportLink } from '../lib/journey-labels';

const PLATFORM_FILTER = [
  { value: 'ALL', label: 'All platforms' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile app (Android or iOS)' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'unknown', label: 'Not recorded' },
];
const STUCK_FILTER = [{ value: 'ALL', label: 'Any step' }, ...(Object.keys(STUCK) as Array<keyof typeof STUCK>).map((v) => ({ value: v, label: STUCK[v] }))];
const HEALTH_FILTER = [{ value: 'ALL', label: 'Any health' }, ...(Object.keys(HEALTH) as Array<keyof typeof HEALTH>).map((v) => ({ value: v, label: HEALTH[v].label }))];
const FUNNEL_DEFAULTS = { ...PERIOD_DEFAULTS, period: 'month', platform: 'ALL', source: 'ALL', stuck: 'ALL', health: 'stuck' };
const useFunnelList = () => useListParams(FUNNEL_DEFAULTS);
type FunnelList = ReturnType<typeof useFunnelList>;
const shortDay = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

function StepFunnel({ data }: { data: JourneyFunnel }) {
  const top = data.steps[0]?.count || 0;
  return (
    <Card title="Step funnel" description="Shops that signed up in the period and reached each step.">
      <ol className="space-y-2.5">
        {data.steps.map((s, i) => {
          const prev = i ? data.steps[i - 1].count : s.count;
          const width = top ? Math.max(2, (s.count / top) * 100) : 0;
          return (
            <li key={s.key}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.8125rem]">
                <span className="font-medium text-slate-900">{s.label}</span>
                <span className="tabular-nums text-slate-600"><b className="text-slate-900">{num(s.count)}</b> · {pct(s.count, top)}{i > 0 && <span className="text-slate-400"> · {pct(s.count, prev)} of previous</span>}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} /></div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function GroupTable({ title, description, groups, steps, labelCell }: { title: string; description: string; groups: FunnelGroup[]; steps: JourneyFunnel['steps']; labelCell: (g: FunnelGroup) => React.ReactNode }) {
  return (
    <Card title={title} description={description} flush>
      {!groups.length ? <p className="px-5 py-6 text-[0.8125rem] text-slate-500">No signups in this period.</p> : (
        <div className="mt-3">
          <Table minWidth="44rem">
            <THead>
              <Tr>
                <Th>{title.replace(/^By /, '').replace(/^./, (c) => c.toUpperCase())}</Th>
                {steps.map((s) => <Th key={s.key} align="right">{s.label}</Th>)}
              </Tr>
            </THead>
            <TBody>
              {groups.map((g) => (
                <Tr key={g.key}>
                  <Td>{labelCell(g)}</Td>
                  {g.steps.map((n, i) => (
                    <Td key={i} align="right" className="tabular-nums">
                      <div className="text-slate-900">{num(n)}</div>
                      {i > 0 && <div className="text-[0.75rem] text-slate-500">{pct(n, g.total)}</div>}
                    </Td>
                  ))}
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </Card>
  );
}

function WebVsMobile({ data }: { data: JourneyFunnel }) {
  const key = (k: string) => data.steps.findIndex((s) => s.key === k);
  const rows: Array<{ label: string; value: (s: JourneyFunnel['webVsMobile'][number]) => string }> = [
    { label: 'Signups', value: (s) => num(s.signups) },
    { label: 'Setup done', value: (s) => pct(s.steps[key('onboarding')], s.signups) },
    { label: 'First bill', value: (s) => pct(s.steps[key('first_sale')], s.signups) },
    { label: 'Active in last 7 days', value: (s) => pct(s.steps[key('active7')], s.signups) },
    { label: 'Paid', value: (s) => pct(s.steps[key('paid')], s.signups) },
    { label: 'Time to first bill (median)', value: (s) => (s.medianHoursToFirstBill == null ? '—' : s.medianHoursToFirstBill < 48 ? `${s.medianHoursToFirstBill} h` : `${Math.round(s.medianHoursToFirstBill / 24)} days`) },
  ];
  const totalUses = Object.values(data.uses).reduce((a, b) => a + b, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Web vs mobile" description="By the app a shop signed up on." className="lg:col-span-2" flush>
        <div className="mt-3">
          <Table minWidth="30rem">
            <THead><Tr><Th>Signed up on</Th>{data.webVsMobile.map((s) => <Th key={s.key} align="right">{s.key === 'web' ? <span className="inline-flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{s.label}</span> : <span className="inline-flex items-center gap-1"><Smartphone className="h-3.5 w-3.5" />{s.label}</span>}</Th>)}</Tr></THead>
            <TBody>
              {rows.map((r) => (
                <Tr key={r.label}><Td className="text-slate-700">{r.label}</Td>{data.webVsMobile.map((s) => <Td key={s.key} align="right" className="tabular-nums font-medium text-slate-900">{r.value(s)}</Td>)}</Tr>
              ))}
            </TBody>
          </Table>
          {data.unknownPlatform > 0 && <p className="px-4 py-3 text-[0.75rem] text-slate-500 sm:px-5">{num(data.unknownPlatform)} shop{data.unknownPlatform === 1 ? '' : 's'} in this period have no recorded signup platform and are left out.</p>}
        </div>
      </Card>
      <Card title="Apps shops use now" description="Every shop, by the apps used in the last 30 days.">
        <ul className="space-y-2.5">
          {(['both', 'web', 'mobile', 'none'] as const).map((k) => (
            <li key={k}>
              <div className="mb-1 flex justify-between text-[0.8125rem]"><span className="text-slate-700">{USES[k]}</span><span className="tabular-nums"><b className="text-slate-900">{num(data.uses[k])}</b> <span className="text-slate-500">· {pct(data.uses[k], totalUses)}</span></span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', k === 'none' ? 'bg-slate-300' : 'bg-brand-500')} style={{ width: `${totalUses ? (data.uses[k] / totalUses) * 100 : 0}%` }} /></div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SignupsChart({ data }: { data: JourneyFunnel }) {
  const colors = useChartColors();
  const [split, setSplit] = useState<'platform' | 'source'>('platform');
  const keys = split === 'platform' ? PLATFORM_KEYS.filter((k) => data.daily.some((d) => d.platforms[k])) : [...data.topSources, 'other'].filter((k) => data.daily.some((d) => d.sources[k]));
  const rows = data.daily.map((d) => ({ date: d.date, ...(split === 'platform' ? d.platforms : d.sources) }));
  const color = (k: string, i: number) => (split === 'platform' ? PLATFORM[k as keyof typeof PLATFORM]?.color ?? SERIES[i % SERIES.length] : k === 'other' ? '#94a3b8' : SERIES[i % SERIES.length]);
  const axis = { tickLine: false, axisLine: false, fontSize: 11, stroke: colors.text };
  return (
    <Card title="Signups by day" description="New shops per Pakistan day." actions={<Segmented label="Split by" value={split} onChange={setSplit} items={[{ value: 'platform', label: 'Platform' }, { value: 'source', label: 'Source' }]} />}>
      {!data.total ? <p className="py-10 text-center text-[0.8125rem] text-slate-500">No signups in this period.</p> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: -16, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip labelFormatter={(d) => shortDay(String(d))} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (split === 'platform' ? PLATFORM[v as keyof typeof PLATFORM]?.label ?? v : v)} />
              {keys.map((k, i) => <Bar key={k} isAnimationActive={false} dataKey={k} stackId="s" fill={color(k, i)} maxBarSize={22} name={k} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

function StuckShops({ query, list }: { query: Record<string, string | undefined>; list: FunnelList }) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { stuck, health } = list.filters;
  const params = { ...query, stuck: stuck === 'ALL' ? undefined : stuck, health: health === 'ALL' ? undefined : health, search: list.debouncedSearch || undefined, page: list.page, limit: list.limit };
  const shops = useQuery({ queryKey: ['admin', 'journey', 'shops', params], queryFn: () => adminJourneyApi.shops(params), placeholderData: (prev) => prev });
  const rows = shops.data?.items ?? [];
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); for (const r of rows) { if (allOnPage) n.delete(r.id); else n.add(r.id); } return n; });

  return (
    <div className="space-y-3">
      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop name, username or phone" />}
        chips={stuck !== 'ALL' ? <FilterChip onRemove={() => list.setFilter('stuck', 'ALL')}>Stuck: {STUCK[stuck as keyof typeof STUCK] ?? stuck}</FilterChip> : undefined}
      >
        <FilterMenu icon={TrafficCone} label="Stuck at" value={stuck} active={stuck !== 'ALL'} onChange={(v) => list.setFilter('stuck', v)} options={STUCK_FILTER} />
        <FilterMenu icon={HeartPulse} label="Health" value={health} active={health !== 'stuck'} onChange={(v) => list.setFilter('health', v)} options={HEALTH_FILTER} align="right" />
      </FilterBar>
      <ListCard
        title={<span>Stuck shops{shops.data ? <span className="ms-2 text-[0.8125rem] font-normal text-slate-500">{num(shops.data.meta.total)}</span> : null}</span>}
        actions={selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[0.8125rem] text-slate-600">{num(selected.size)} selected</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
            <Button size="sm" leftIcon={<Headphones className="h-4 w-4" />} onClick={() => navigate(supportLink([...selected]))}>Open in Support</Button>
          </div>
        )}
        loading={shops.isLoading}
        empty={!rows.length}
        emptyIcon={<TrafficCone className="h-6 w-6" />}
        emptyTitle={shops.isError ? 'Could not load shops' : 'No shops match'}
        emptyText={shops.isError ? 'Check the connection and try again.' : 'Nobody is stuck with these filters. Try another health or step.'}
        page={list.page}
        limit={list.limit}
        total={shops.data?.meta.total}
        onPage={list.setPage}
        onLimit={list.setLimit}
      >
        <Table minWidth="64rem">
          <THead>
            <Tr>
              <Th className="w-10"><input type="checkbox" aria-label="Select all on this page" className="h-4 w-4 rounded border-slate-300" checked={allOnPage} onChange={togglePage} /></Th>
              <Th>Shop</Th>
              <Th>Signed up</Th>
              <Th>Source</Th>
              <Th>Stuck at</Th>
              <Th>Health</Th>
              <Th>Last important action</Th>
              <Th>Last seen</Th>
              <Th align="right"><span className="sr-only">Message</span></Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => {
              const p = PLATFORM[r.signupPlatform];
              return (
                <Tr key={r.id} interactive onClick={() => navigate(`/tenants/${r.id}`)}>
                  <Td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.name}`} className="h-4 w-4 rounded border-slate-300" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></Td>
                  <Td>
                    <div className="font-semibold text-slate-900">{r.name}</div>
                    <div className="text-[0.75rem] text-slate-500">@{r.slug}{r.phone ? ` · ${r.phone}` : ''}</div>
                  </Td>
                  <Td className="whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 text-slate-900"><p.icon className="h-3.5 w-3.5" style={{ color: p.color }} />{p.label}</div>
                    <div className="text-[0.75rem] text-slate-500" title={formatDateTime(r.createdAt)}>{formatDate(r.createdAt)}</div>
                  </Td>
                  <Td><span className="capitalize text-slate-700">{r.source}</span></Td>
                  <Td>
                    {r.stuckLabel ? <span className="font-medium text-rose-600">{r.stuckLabel}</span> : <span className="text-slate-400">—</span>}
                    {r.onboardingNext && r.stuckAt === 'onboarding' && <div className="text-[0.75rem] text-slate-500">next: {r.onboardingNext}</div>}
                  </Td>
                  <Td><Badge variant={HEALTH[r.health].variant}>{HEALTH[r.health].label}</Badge><div className="mt-0.5 max-w-[14rem] text-[0.75rem] text-slate-500">{r.healthReason}</div></Td>
                  <Td className="text-[0.8125rem]">{r.lastAction ? <>{r.lastAction.label}<div className="text-[0.75rem] text-slate-500">{formatRelative(r.lastAction.at)}</div></> : <span className="text-slate-400">None yet</span>}</Td>
                  <Td className="whitespace-nowrap text-[0.8125rem] text-slate-600">{r.lastSeenAt ? formatRelative(r.lastSeenAt) : <span className="text-slate-400">Never</span>}</Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <Link to={supportLink(r.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50" title="Message on Live Support"><Headphones className="h-4 w-4" /><span className="hidden xl:inline">Message</span></Link>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>
    </div>
  );
}

export default function FunnelPage() {
  const guide = usePageGuide();
  const list = useFunnelList();
  const { platform, source } = list.filters;
  const query = { ...periodQuery(list.filters), platform: platform === 'ALL' ? undefined : platform, source: source === 'ALL' ? undefined : source };
  const funnel = useQuery({ queryKey: ['admin', 'journey', 'funnel', query], queryFn: () => adminJourneyApi.funnel(query), placeholderData: (prev) => prev });
  const d = funnel.data;
  const step = (k: string) => d?.steps.find((s) => s.key === k)?.count ?? 0;
  const sourceOptions = useMemo(() => [{ value: 'ALL', label: 'All sources' }, ...(d?.sources ?? (source !== 'ALL' ? [source] : [])).map((s) => ({ value: s, label: s }))], [d?.sources, source]);
  const range = periodChip(list.filters);

  return (
    <PageShell>
      <PageHero
        title="Signup funnel"
        chip={range ? `Signed up ${range}` : 'All time'}
        busy={funnel.isFetching}
        loading={funnel.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={d ? [
          { label: 'Signups', value: num(d.total), hint: `${num(d.webVsMobile.find((s) => s.key === 'mobile')?.signups ?? 0)} from the mobile app` },
          { label: 'Made a first bill', value: pct(step('first_sale'), d.total), hint: `${num(step('first_sale'))} shops` },
          { label: 'Stuck', value: num(d.health.stuck), hint: `${num(d.health.at_risk)} at risk · ${num(d.health.churned)} churned` },
          { label: 'Paid', value: pct(step('paid'), d.total), hint: `${num(step('paid'))} shops` },
        ] : undefined}
      />

      <FilterBar
        chips={platform !== 'ALL' || source !== 'ALL' ? [
          platform !== 'ALL' && <FilterChip key="p" onRemove={() => list.setFilter('platform', 'ALL')}>{PLATFORM_FILTER.find((o) => o.value === platform)?.label ?? platform}</FilterChip>,
          source !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('source', 'ALL')}>Source: {source}</FilterChip>,
        ] : undefined}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Signed up" defaultPreset="month" />
        <FilterMenu icon={MonitorSmartphone} label="Platform" value={platform} active={platform !== 'ALL'} onChange={(v) => list.setFilter('platform', v)} options={PLATFORM_FILTER} />
        <FilterMenu icon={Megaphone} label="Source" value={source} active={source !== 'ALL'} onChange={(v) => list.setFilter('source', v)} options={sourceOptions} width="w-64" />
      </FilterBar>

      {funnel.isError && !d ? (
        <EmptyState icon={<CircleAlert className="h-6 w-6" />} title="Funnel could not load" description="Check the connection and try again." action={<Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => funnel.refetch()}>Try again</Button>} />
      ) : !d ? (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3"><Skeleton className="h-72 rounded-2xl xl:col-span-2" /><Skeleton className="h-72 rounded-2xl" /></div>
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : !d.total && !funnel.isFetching ? (
        <EmptyState icon={<UserPlus className="h-6 w-6" />} title="No signups in this period" description="Pick a longer period or clear the platform and source filters." />
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2"><SignupsChart data={d} /></div>
            <StepFunnel data={d} />
          </div>
          <WebVsMobile data={d} />
          <GroupTable title="By platform" description="Signup platform. Percent is of that platform's signups." groups={d.byPlatform} steps={d.steps}
            labelCell={(g) => { const p = PLATFORM[g.key as keyof typeof PLATFORM] ?? PLATFORM.unknown; return <span className="inline-flex items-center gap-1.5 font-medium text-slate-900"><p.icon className="h-4 w-4" style={{ color: p.color }} />{p.label}</span>; }} />
          <GroupTable title="By source" description="First touch from nafaa.pk, else the signup link's campaign, partner, referral or referring site." groups={d.bySource} steps={d.steps}
            labelCell={(g) => <button type="button" className="font-medium capitalize text-brand-700 hover:underline" onClick={() => list.setFilter('source', g.key)}>{g.label}</button>} />
        </div>
      )}

      <StuckShops query={query} list={list} />

      {guide.isOpen && (
        <PageGuide
          title="Signup funnel"
          description="Where new shops come from, which app they sign up on, and the step where they stop. Use it to find trials that need a nudge."
          flowTitle="A new shop's first steps"
          flow={[
            { label: 'Signs up', hint: 'Web or app', icon: UserPlus, color: '#4f46e5' },
            { label: 'Setup', hint: 'Business info', icon: MonitorSmartphone, color: '#0284c7' },
            { label: 'First bill', hint: 'Real use', icon: HeartPulse, color: '#059669' },
            { label: 'Pays', hint: 'Plan bought', icon: Megaphone, color: '#d97706' },
          ]}
          steps={[
            { icon: MonitorSmartphone, color: '#4f46e5', title: 'Filter', text: 'Pick the signup period, a platform or a source. Filters stay in the address, so you can share the link.' },
            { icon: TrafficCone, color: '#e11d48', title: 'Stuck shops', text: 'Shops with no bill two days after signing up are stuck. Tick some and press Open in Support to message them.' },
            { icon: HeartPulse, color: '#059669', title: 'Health', text: 'Churned: nobody seen for 30 days. At risk: not seen for 7 days, no bill in 7 days, or a trial ending within 3 days.' },
          ]}
          tips={['Milestones come from each shop’s own data (products, bills, khata, purchases), so older shops are included.', 'Shops that signed up before platforms were recorded show as Unknown unless the backfill could work it out.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
