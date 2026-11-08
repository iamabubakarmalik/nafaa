/**
 * Every online channel across shops, with health columns (last sync, last
 * order, failed syncs, webhook errors, push failures, Shopify plan) and a
 * drill-down with logs and actions.
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { adminCommerceApi, type CommerceChannelRow } from '@/api/admin-commerce.api';
import { Button } from '@/components/ui/Button';
import { ChannelDrawer } from '../components/ChannelDrawer';
import { Card, ChannelStatus, CommerceHero, Empty, KINDS, kindLabel, Pill, tableHeadCls, tdCls, thCls, when } from '../components/CommerceUi';

const STATUSES = [['', 'Any status'], ['CONNECTED', 'Connected'], ['PAUSED', 'Paused'], ['ERROR', 'Error'], ['DISCONNECTED', 'Disconnected'], ['PENDING', 'Pending']];
const LIMIT = 50;

export default function CommerceChannelsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const kind = params.get('kind') ?? '';
  const status = params.get('status') ?? '';
  const problems = params.get('problems') === '1';
  const page = Number(params.get('page') ?? 1) || 1;
  const open = params.get('channel');
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); if (k !== 'page' && k !== 'channel') p.delete('page'); setParams(p, { replace: true }); };

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-commerce-channels', kind, status, problems, page, params.get('search') ?? ''],
    queryFn: () => adminCommerceApi.channels({ kind: kind || undefined, status: status || undefined, problems, page, limit: LIMIT, search: params.get('search') || undefined }),
    placeholderData: keepPreviousData,
  });
  const total = data?.meta.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <CommerceHero title="Channels" subtitle="Every Shopify, Daraz, WooCommerce, website, Foodpanda, Indolj and manual channel across shops. Open a row for logs and actions." />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-3">
          <form className="relative min-w-[14rem] flex-1" onSubmit={(e) => { e.preventDefault(); set('search', search.trim()); }}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => set('search', search.trim())} placeholder="Search shop, channel name, site URL or channel id"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:bg-white" />
          </form>
          <select value={kind} onChange={(e) => set('kind', e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="">All types</option>
            {KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
          </select>
          <select value={status} onChange={(e) => set('status', e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={problems} onChange={(e) => set('problems', e.target.checked ? '1' : '')} className="h-4 w-4 accent-indigo-600" />With problems only
          </label>
        </div>

        {isLoading ? <Empty>Loading…</Empty> : error ? <Empty>Could not load channels.</Empty> : !data?.items.length ? <Empty>No channels match.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] text-sm">
              <thead className={tableHeadCls}>
                <tr>
                  <th className={thCls}>Shop</th><th className={thCls}>Channel</th><th className={thCls}>Status</th>
                  <th className={thCls}>Last sync</th><th className={thCls}>Last order</th>
                  <th className={`${thCls} text-right`}>Links</th><th className={`${thCls} text-right`}>Push failures</th>
                  <th className={`${thCls} text-right`} title="Failed syncs · webhook errors in the last 7 days">Errors (7d)</th>
                  <th className={thCls}>Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c) => (
                  <tr key={c.id} onClick={() => set('channel', c.id)} className="cursor-pointer hover:bg-slate-50/80">
                    <td className={`${tdCls} min-w-[10rem]`}>
                      <Link to={`/tenants/${c.tenantId}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-indigo-700">{c.tenantName}</Link>
                      {c.tenantStatus !== 'ACTIVE' && <div className="text-xs text-slate-500">{c.tenantStatus}</div>}
                    </td>
                    <td className={`${tdCls} min-w-[12rem]`}>
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{kindLabel(c.kind)}{c.siteUrl ? ` · ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''}</div>
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap gap-1"><ChannelStatus status={c.status} isActive={c.isActive} />{c.killSwitch && <Pill tone="rose">Kill switch</Pill>}</div>
                      {c.channelError && <div className="mt-1 max-w-[14rem] truncate text-xs text-rose-700" title={c.channelError}>{c.channelError}</div>}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-slate-700`}>{when(c.lastSyncAt)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-slate-700`}>{when(c.lastOrderAt)}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{c.links}</td>
                    <td className={`${tdCls} text-right tabular-nums`}><Num v={c.pushFailures} /></td>
                    <td className={`${tdCls} whitespace-nowrap text-right tabular-nums`} title="Failed syncs · webhook errors"><Num v={c.syncErrors7d} /> · <Num v={c.webhookErrors7d} /></td>
                    <td className={tdCls}><Plan c={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span>{total.toLocaleString()} channels</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => set('page', String(page - 1))}>Previous</Button>
            <span>Page {page} of {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Next</Button>
          </div>
        </div>
      </Card>

      <ChannelDrawer id={open} onClose={() => set('channel', '')} />
    </div>
  );
}

function Num({ v }: { v: number }) {
  return v ? <span className="font-bold text-rose-700">{v}</span> : <span className="text-slate-400">0</span>;
}

function Plan({ c }: { c: CommerceChannelRow }) {
  if (!c.shopifyPlan) return <span className="text-slate-400">—</span>;
  if (c.shopifyPlan.billing !== 'shopify') return <Pill>Direct</Pill>;
  return <Pill tone={c.shopifyPlan.active ? 'emerald' : 'amber'}>{c.shopifyPlan.active ? c.shopifyPlan.name ?? 'Active' : 'No plan'}</Pill>;
}
