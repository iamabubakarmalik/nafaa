/**
 * Nafaa Stores overview: how many merchant websites are live, in password
 * mode, draft or suspended; orders, sales value, visitors and conversion from
 * website orders in the chosen window; daily trends, top stores, domain
 * health and the open abuse reports.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Flag, Globe, Lightbulb, Lock, MousePointerClick, PauseCircle, ShoppingBag, Store, Wallet } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, Card, FilterBar, KpiCard, KpiRow, PageHero, PageShell, Segmented, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, type StoresOverview } from '@/api/admin-stores.api';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { Empty, useChartColors } from '@/features/shared/kit';
import { shortDay } from '../components/StoresUi';

type Days = '7' | '30' | '90';
const DAY_OPTIONS = [{ value: '7' as Days, label: '7 days' }, { value: '30' as Days, label: '30 days' }, { value: '90' as Days, label: '90 days' }];

/** Short axis label: 1.2Cr, 90L, 30K. */
const axisValue = (v: number) => (v >= 1e7 ? `${+(v / 1e7).toFixed(1)}Cr` : v >= 1e5 ? `${+(v / 1e5).toFixed(1)}L` : v >= 1e3 ? `${+(v / 1e3).toFixed(1)}K` : String(v));
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Every day in the window, so quiet days show as zero instead of disappearing. */
function fillDays(daily: StoresOverview['daily'], days: number) {
  const byDay = new Map(daily.map((d) => [d.date, d]));
  const out: StoresOverview['daily'] = [];
  const today = Date.parse(`${dayKey(Date.now())}T12:00:00Z`);
  for (let i = days - 1; i >= 0; i--) {
    const date = dayKey(today - i * 86_400_000);
    out.push(byDay.get(date) ?? { date, orders: 0, gmv: 0, visitors: 0 });
  }
  return out;
}

export default function StoresOverviewPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const colors = useChartColors();
  const [days, setDays] = useState<Days>('30');
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-stores-overview', days],
    queryFn: () => adminStoresApi.overview(Number(days)),
    placeholderData: (prev) => prev,
  });
  const series = useMemo(() => fillDays(data?.daily ?? [], Number(days)), [data, days]);
  const c = data?.counts;
  const t = data?.totals;
  const axis = { stroke: colors.text, fontSize: 11, tickLine: false, axisLine: false } as const;
  const tip = { cursor: { fill: 'rgba(100,116,139,0.08)' }, contentStyle: { borderRadius: 12, border: `1px solid ${colors.grid}`, fontSize: 12 } };

  const statusBars = c ? [
    { label: 'Live', value: c.LIVE, to: '/stores/list?status=LIVE', tone: 'bg-emerald-500' },
    { label: 'Password', value: c.PASSWORD, to: '/stores/list?status=PASSWORD', tone: 'bg-amber-500' },
    { label: 'Draft', value: c.DRAFT, to: '/stores/list?status=DRAFT', tone: 'bg-slate-400' },
    { label: 'Closed', value: c.CLOSED, to: '/stores/list?status=CLOSED', tone: 'bg-slate-300' },
    { label: 'Suspended', value: c.suspended, to: '/stores/list?status=SUSPENDED', tone: 'bg-rose-500' },
  ] : [];
  const maxBar = Math.max(1, ...statusBars.map((b) => b.value));

  return (
    <PageShell>
      <PageHero
        title="Websites"
        chip={`Last ${days} days`}
        busy={isFetching}
        loading={isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={c && t ? [
          { label: 'Live websites', value: num(c.LIVE), hint: `${num(c.total)} ${c.total === 1 ? 'website' : 'websites'} in all` },
          { label: 'Website orders', value: num(t.orders), hint: `Average ${formatPKR(t.aov)}` },
          { label: 'Sales value (GMV)', value: formatPKR(t.gmv), hint: 'Without cancelled and rejected' },
          { label: 'Conversion', value: `${t.conversion}%`, hint: `${num(t.visitors)} visitors` },
        ] : undefined}
      />

      {!!data?.openReports && (
        <Alert tone="warning" title={`${num(data.openReports)} abuse report${data.openReports === 1 ? '' : 's'} waiting`} action={<Link to="/stores/reports" className="text-[0.8125rem] font-semibold underline">Open queue</Link>}>
          Buyers reported stores for scams, fake products or missing deliveries. Review them first.
        </Alert>
      )}
      {!!data?.domains.error && (
        <Alert tone="danger" title={`${num(data.domains.error)} domain${data.domains.error === 1 ? '' : 's'} with errors`} action={<Link to="/stores/domains?status=ERROR" className="text-[0.8125rem] font-semibold underline">Domains monitor</Link>}>
          These custom domains do not reach their store. Re-verify them or remove a stuck one from hosting.
        </Alert>
      )}

      <FilterBar>
        <Segmented value={days} onChange={setDays} items={DAY_OPTIONS} label="Period" />
      </FilterBar>

      {error ? <Card><Empty>Could not load the overview. The stores service may not be running yet.</Empty></Card> : (
        <>
          <KpiRow cols={5}>
            <KpiCard icon={Eye} color="#0284c7" label="Visitors" value={num(t?.visitors)} />
            <KpiCard icon={Lock} color="#d97706" label="Password mode" value={num(c?.PASSWORD)} onClick={() => navigate('/stores/list?status=PASSWORD')} />
            <KpiCard icon={PauseCircle} color="#e11d48" label="Suspended" value={num(c?.suspended)} onClick={() => navigate('/stores/list?status=SUSPENDED')} />
            <KpiCard icon={Globe} color="#0d9488" label="Custom domains" value={num(c?.withCustomDomain)} hint="Websites with an active domain" onClick={() => navigate('/stores/list?domain=custom')} />
            <KpiCard icon={Flag} color="#7c3aed" label="Open reports" value={num(data?.openReports)} onClick={() => navigate('/stores/reports')} />
          </KpiRow>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card title="Website orders per day" description="All stores, Pakistan time">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: -16, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDay(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Orders']} />
                    <Bar isAnimationActive={false} dataKey="orders" fill={colors.line} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Sales value per day" description="Order value, without cancelled and rejected">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...axis} />
                    <YAxis tickFormatter={(v) => axisValue(Number(v))} width={48} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDay(String(d))} formatter={(v) => [formatPKRFull(Number(v)), 'Sales value']} />
                    <Bar isAnimationActive={false} dataKey="gmv" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <Card title="Visitors per day" description="Unique visitors across every website" className="lg:col-span-2">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ left: -8, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="stores-visitors-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.line} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...axis} />
                    <YAxis tickFormatter={(v) => axisValue(Number(v))} allowDecimals={false} width={44} {...axis} />
                    <Tooltip {...tip} labelFormatter={(d) => shortDay(String(d))} formatter={(v) => [Number(v).toLocaleString('en-PK'), 'Visitors']} />
                    <Area isAnimationActive={false} type="monotone" dataKey="visitors" stroke={colors.line} strokeWidth={2} fill="url(#stores-visitors-fill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Websites by status" description="All time; click a row to see the stores">
              <ul className="space-y-3 pt-1">
                {statusBars.map((b) => (
                  <li key={b.label}>
                    <Link to={b.to} className="group block">
                      <div className="flex items-center justify-between text-[0.8125rem]">
                        <span className="font-medium text-slate-700 group-hover:text-brand-700">{b.label}</span>
                        <span className="tabular-nums font-semibold text-slate-900">{num(b.value)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${b.tone}`} style={{ width: `${b.value ? Math.max(3, (b.value / maxBar) * 100) : 0}%` }} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {data && (
                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                  <DomainCount label="Domains active" value={data.domains.active} tone="text-emerald-700" to="/stores/domains?status=ACTIVE" />
                  <DomainCount label="Pending" value={data.domains.pending} tone="text-amber-700" to="/stores/domains?status=PENDING" />
                  <DomainCount label="Errors" value={data.domains.error} tone="text-rose-700" to="/stores/domains?status=ERROR" />
                </div>
              )}
            </Card>
          </section>

          <Card flush title="Top stores by sales value" description={`Website orders in the last ${days} days`} actions={<Link to="/stores/list?sort=gmv" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">All stores</Link>}>
            {!data?.topStores.length ? <Empty>No website orders in this period.</Empty> : (
              <div className="mt-3">
                <Table minWidth="40rem">
                  <THead>
                    <Tr><Th>Store</Th><Th>Shop</Th><Th align="right">Orders</Th><Th align="right">Sales value</Th><Th align="right">Visitors</Th><Th align="right">Conversion</Th></Tr>
                  </THead>
                  <TBody>
                    {data.topStores.map((s) => (
                      <Tr key={s.id} interactive onClick={() => navigate(`/stores/${s.id}`)}>
                        <Td><div className="font-semibold text-slate-900">{s.name}</div><div className="text-[0.75rem] text-slate-500">{s.slug}</div></Td>
                        <Td><Link to={`/tenants/${s.tenantId}`} onClick={(e) => e.stopPropagation()} className="text-slate-700 hover:text-brand-700">{s.tenantName ?? '—'}</Link></Td>
                        <Td align="right">{num(s.orders)}</Td>
                        <Td align="right">{formatPKR(s.gmv)}</Td>
                        <Td align="right">{num(s.visitors)}</Td>
                        <Td align="right">{s.visitors ? `${Math.round((s.orders / s.visitors) * 1000) / 10}%` : '—'}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Websites"
          description="Every Nafaa Stores website across all shops, with orders and visitors."
          flowTitle="How a website goes live"
          flow={[
            { label: 'Draft', hint: 'Shop builds the website', icon: Store, color: '#64748b' },
            { label: 'Password', hint: 'Preview with a password', icon: Lock, color: '#d97706' },
            { label: 'Live', hint: 'Open to buyers', icon: Globe, color: '#059669' },
            { label: 'Orders', hint: 'Arrive in the shop', icon: ShoppingBag, color: '#4f46e5' },
          ]}
          steps={[
            { icon: Wallet, color: '#4f46e5', title: 'Pick a period', text: 'Orders, sales value, visitors and conversion follow the 7, 30 or 90 day switch.' },
            { icon: MousePointerClick, color: '#0d9488', title: 'Drill down', text: 'Click a number card, a status row or a top store to open the matching list or store.' },
            { icon: Flag, color: '#e11d48', title: 'Watch problems', text: 'Yellow and red banners point to open abuse reports and domains with errors.' },
          ]}
          tips={['Conversion is website orders divided by unique visitors.', 'Suspended websites show buyers a neutral "unavailable" page.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function DomainCount({ label, value, tone, to }: { label: string; value: number; tone: string; to: string }) {
  return (
    <Link to={to} className="rounded-xl px-1 py-1.5 transition hover:bg-slate-50">
      <div className={`text-lg font-bold tabular-nums ${tone}`}>{num(value)}</div>
      <div className="text-[0.6875rem] font-medium text-slate-500">{label}</div>
    </Link>
  );
}
