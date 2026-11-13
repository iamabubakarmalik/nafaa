/**
 * Ads (/social/ads): read-only overview of the Meta ad account: spend,
 * impressions, clicks, CPC and results per campaign. When the connection
 * has no ads access, the page explains how to turn it on.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeDollarSign, Megaphone, Plug, Settings2 } from 'lucide-react';
import { Badge, Button, Card, DateRangeMenu, EmptyState, FilterBar, PageHero, PageShell, Skeleton, Table, TBody, THead, Td, Th, Tr, resolveRange, type DateRangeValue } from '@/design-system/components';
import { brandSocialApi, type AdsOverview } from '@/api/admin-brand-social.api';

type LiveAds = Extract<AdsOverview, { connected: true }>;
const isLive = (d: AdsOverview | undefined): d is LiveAds => !!d && d.connected === true;
import { num } from '@/lib/format';
import { KEYS } from '../lib/queries';
import { fmtKeyDay } from '../lib/time';
import { LoadError } from '../components/SocialUi';
import { useMetaConnect } from './AccountsPage';

export default function AdsPage() {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const { from, to } = resolveRange(range, 0) ?? { from: '', to: '' };
  const q = useQuery({ queryKey: KEYS.ads(from, to), queryFn: () => brandSocialApi.ads(from, to), enabled: !!from && !!to, placeholderData: (p) => p });
  const connect = useMetaConnect();
  const d = q.data;
  const money = (v: number | null | undefined) => {
    if (v == null) return '—';
    const cur = isLive(d) ? d.currency ?? 'PKR' : 'PKR';
    try { return new Intl.NumberFormat('en-PK', { style: 'currency', currency: cur, maximumFractionDigits: v < 100 ? 2 : 0 }).format(v); } catch { return `${cur} ${v.toLocaleString('en-PK')}`; }
  };
  const live: LiveAds | null = isLive(d) ? d : null;

  return (
    <PageShell>
      <PageHero
        title="Ads"
        chip={live ? `Ad account ${live.adAccountId}` : 'Read only'}
        busy={q.isFetching}
        loading={q.isLoading}
        stats={live ? [
          { label: 'Spend', value: money(live.totals.spend) },
          { label: 'Impressions', value: num(live.totals.impressions), hint: `${num(live.totals.reach)} reach` },
          { label: 'Clicks', value: num(live.totals.clicks), hint: `${live.totals.ctr.toFixed(2)}% CTR` },
          { label: 'Cost per click', value: money(live.totals.cpc) },
          { label: 'Results', value: num(live.totals.results) },
        ] : undefined}
      />
      {live && (
        <FilterBar>
          <DateRangeMenu value={range} onChange={setRange} startHour={0} allowAll={false} defaultPreset="month" />
          <span className="text-[0.8125rem] text-slate-500">{fmtKeyDay(live.range.from)} – {fmtKeyDay(live.range.to)}</span>
        </FilterBar>
      )}

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="ads" /> : q.isLoading || !d ? (
        <Skeleton className="h-80 rounded-2xl" />
      ) : !live ? (
        <Card>
          <EmptyState
            icon={<Megaphone className="h-7 w-7 text-brand-600" />}
            title="Connect ads"
            description={<span className="block max-w-md">{'reason' in d ? d.reason : ''} Reconnect Meta and allow ads access (ads_read), and set the ad account number in Settings. Nafaa only reads ads; it never changes or pays for them.</span>}
            action={<div className="flex flex-wrap justify-center gap-2">
              <Button leftIcon={<Plug className="h-4 w-4" />} loading={connect.isPending} onClick={() => connect.mutate()}>Connect Meta with ads access</Button>
              <Link to="/social/settings"><Button variant="secondary" leftIcon={<Settings2 className="h-4 w-4" />}>Ad account in Settings</Button></Link>
            </div>}
          />
        </Card>
      ) : (
        <Card flush title="Campaigns" description="Meta Ads Manager numbers for the period">
          {!live.campaigns.length ? <EmptyState icon={<BadgeDollarSign className="h-6 w-6" />} title="No campaign ran in this period" description="Pick a longer period, or start a campaign in Meta Ads Manager." /> : (
            <Table minWidth="52rem">
              <THead><Tr><Th>Campaign</Th><Th align="right">Spend</Th><Th align="right">Impressions</Th><Th align="right">Clicks</Th><Th align="right">CTR</Th><Th align="right">CPC</Th><Th align="right">Results</Th></Tr></THead>
              <TBody>
                {[...live.campaigns].sort((a, b) => b.spend - a.spend).map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      {c.status && <Badge size="xs" variant={c.status === 'ACTIVE' ? 'success' : 'default'}>{c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Badge>}
                    </Td>
                    <Td align="right" className="tabular-nums">{money(c.spend)}</Td>
                    <Td align="right" className="tabular-nums">{num(c.impressions)}</Td>
                    <Td align="right" className="tabular-nums">{num(c.clicks)}</Td>
                    <Td align="right" className="tabular-nums">{c.ctr.toFixed(2)}%</Td>
                    <Td align="right" className="tabular-nums">{money(c.cpc)}</Td>
                    <Td align="right" className="tabular-nums">{num(c.results)}{c.resultType && <span className="block text-[0.6875rem] text-slate-500">{c.resultType.replace(/_/g, ' ')}</span>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      )}
    </PageShell>
  );
}
