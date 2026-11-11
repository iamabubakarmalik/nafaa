/**
 * One channel in detail: settings (no secrets), link counts, failed links,
 * recent sync and webhook logs, catalog jobs, and the admin actions. Every
 * action is written to the shop's activity log by the API.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pause, Play, RefreshCw, RotateCcw, ScanSearch } from 'lucide-react';
import { adminCommerceApi } from '@/api/admin-commerce.api';
import { Button, Segmented, confirmDialog } from '@/design-system/components';
import { errMsg } from '@/features/shared/kit';
import { Card, ChannelStatus, dateTime, Drawer, Empty, enumLabel, Info, JobStatus, kindLabel, Pill, Progress, when } from './CommerceUi';

type Action = 'pause' | 'resume' | 'rescan' | 'repush' | 'retry-failed';

const ACTION_TITLE: Record<Action, string> = { pause: 'Pause channel', resume: 'Resume channel', rescan: 'Re-scan catalog', repush: 'Re-push stock and price', 'retry-failed': 'Retry failed links' };

const CONFIRM: Record<Action, string> = {
  pause: 'Pause this channel? Orders stop coming in and Nafaa stops pushing until it is resumed.',
  resume: 'Resume this channel?',
  rescan: 'Re-scan the catalog now? Nafaa reads the channel product list and links sure matches if the shop has auto-link on.',
  repush: 'Push stock and price for every linked product again? It runs as a background job.',
  'retry-failed': 'Retry every failed link (stock, price and listed status)? It runs as a background job.',
};

export function ChannelDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'sync' | 'webhooks' | 'links' | 'jobs'>('sync');
  const { data: c, isLoading, error } = useQuery({ queryKey: ['admin-commerce-channel', id], queryFn: () => adminCommerceApi.channel(id!), enabled: !!id });

  const act = useMutation({
    mutationFn: (a: Action) => adminCommerceApi.channelAction(id!, a),
    onSuccess: (res, a) => {
      const job = res?.job;
      toast.success(job ? `${res.existing ? 'A job is already running' : 'Job started'}: ${job.total} products` : a === 'rescan' ? 'Catalog scanned' : 'Done');
      qc.invalidateQueries({ queryKey: ['admin-commerce-channel', id] });
      qc.invalidateQueries({ queryKey: ['admin-commerce-channels'] });
      qc.invalidateQueries({ queryKey: ['admin-commerce-tenant'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const run = async (a: Action) => { if (await confirmDialog({ title: ACTION_TITLE[a], text: CONFIRM[a], yes: ACTION_TITLE[a], danger: a === 'pause' })) act.mutate(a); };

  return (
    <Drawer open={!!id} onClose={onClose} title={c?.displayName ?? 'Channel'} subtitle={c ? `${kindLabel(c.kind)} · ${c.tenant?.name ?? c.tenantId}` : undefined}>
      {isLoading ? <Empty>Loading…</Empty> : error || !c ? <Empty>Could not load this channel.</Empty> : (
        <>
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <ChannelStatus status={c.status} isActive={c.isActive} />
              {c.killSwitch && <Pill tone="rose">Kill switch on</Pill>}
              {c.settings.shopifyBilling && <Pill tone="indigo">Billing: {c.settings.shopifyBilling === 'shopify' ? 'Shopify App Store' : 'Direct'}</Pill>}
              {c.settings.shopifyPlan && <Pill tone={c.settings.shopifyPlan.active ? 'emerald' : 'amber'}>Plan: {c.settings.shopifyPlan.name ?? (c.settings.shopifyPlan.active ? 'Active' : 'None')}</Pill>}
              {c.tenant && <Link to={`/tenants/${c.tenant.id}`} className="ml-auto text-xs font-semibold text-brand-700 hover:underline">Open shop</Link>}
            </div>
            {c.settings.channelError && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">{c.settings.channelError}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Info label="Site" value={c.settings.siteUrl ? <a href={c.settings.siteUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">{c.settings.siteUrl.replace(/^https?:\/\//, '')}</a> : '—'} />
              <Info label="Last sync" value={`${when(c.lastSyncAt)}${c.lastSyncStatus ? ` · ${enumLabel(c.lastSyncStatus)}` : ''}`} />
              <Info label="Last order" value={when(c.counts.lastOrderAt)} />
              <Info label="Orders (30 days)" value={c.counts.orders30d} />
              <Info label="Linked items" value={c.counts.links} />
              <Info label="Failed links" value={<span className={c.counts.failedLinks ? 'font-bold text-rose-700' : ''}>{c.counts.failedLinks}</span>} />
              <Info label="Push stock / price" value={c.canPush ? `${c.settings.pushStock ? 'On' : 'Off'} / ${c.settings.pushPrice ? 'On' : 'Off'}` : 'Not a push channel'} />
              <Info label="Auto-link · stock mode" value={`${c.settings.autoLink ? 'On' : 'Off'} · ${c.settings.stockMode ?? 'all'}`} />
            </dl>
            {c.settings.lastScan && (
              <p className="mt-3 text-xs text-slate-500">
                Last catalog scan {when(c.settings.lastScan.at)}: {c.settings.lastScan.items} items, {c.settings.lastScan.open} not linked, {c.settings.lastScan.sure} sure matches, {c.settings.lastScan.autoLinked} auto-linked.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {c.isActive
                ? <Button size="sm" variant="secondary" onClick={() => run('pause')} loading={act.isPending && act.variables === 'pause'}><Pause className="h-4 w-4" />Pause</Button>
                : <Button size="sm" variant="secondary" onClick={() => run('resume')} loading={act.isPending && act.variables === 'resume'}><Play className="h-4 w-4" />Resume</Button>}
              {c.canScan && <Button size="sm" variant="secondary" disabled={!c.isActive} onClick={() => run('rescan')} loading={act.isPending && act.variables === 'rescan'}><ScanSearch className="h-4 w-4" />Re-scan catalog</Button>}
              {c.canPush && <Button size="sm" variant="secondary" disabled={!c.isActive || c.killSwitch} onClick={() => run('repush')} loading={act.isPending && act.variables === 'repush'}><RefreshCw className="h-4 w-4" />Re-push stock & price</Button>}
              {c.canPush && <Button size="sm" variant="secondary" disabled={!c.isActive || c.killSwitch || !c.counts.failedLinks} onClick={() => run('retry-failed')} loading={act.isPending && act.variables === 'retry-failed'}><RotateCcw className="h-4 w-4" />Retry failed links</Button>}
            </div>
          </Card>

          <Segmented value={tab} onChange={setTab} label="Channel logs" items={[
            { value: 'sync', label: `Sync logs (${c.syncLogs.length})` }, { value: 'webhooks', label: `Webhooks (${c.webhookLogs.length})` },
            { value: 'links', label: `Failed links (${c.counts.failedLinks})` }, { value: 'jobs', label: `Jobs (${c.jobs.length})` },
          ]} />

          <Card flush>
            {tab === 'sync' && (c.syncLogs.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.syncLogs.map((l) => (
                  <li key={l.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={l.status === 'FAILED' ? 'rose' : l.status === 'SUCCESS' ? 'emerald' : 'slate'}>{enumLabel(l.status)}</Pill>
                      <span className="font-semibold text-slate-800">{l.operation}</span>
                      <span className="text-xs text-slate-500">{enumLabel(l.direction)} · {l.recordsSuccess}/{l.recordsProcessed} ok{l.recordsFailed ? `, ${l.recordsFailed} failed` : ''}</span>
                      <span className="ml-auto text-xs text-slate-500">{dateTime(l.startedAt)}</span>
                    </div>
                    {l.errorMessage && <p className="mt-1 break-words text-xs text-rose-700">{l.errorMessage}</p>}
                  </li>
                ))}
              </ul>
            ) : <Empty>No sync logs.</Empty>)}
            {tab === 'webhooks' && (c.webhookLogs.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.webhookLogs.map((w) => (
                  <li key={w.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={w.errorMessage ? 'rose' : w.processed ? 'emerald' : 'slate'}>{w.errorMessage ? 'Error' : w.processed ? 'Processed' : 'Received'}</Pill>
                      <span className="font-semibold text-slate-800">{w.event}</span>
                      <span className="text-xs text-slate-500">{w.source} · {w.method}{w.responseStatus ? ` · ${w.responseStatus}` : ''}</span>
                      <span className="ml-auto text-xs text-slate-500">{dateTime(w.receivedAt)}</span>
                    </div>
                    {w.errorMessage && <p className="mt-1 break-words text-xs text-rose-700">{w.errorMessage}</p>}
                  </li>
                ))}
              </ul>
            ) : <Empty>No webhook logs.</Empty>)}
            {tab === 'links' && (c.failedLinks.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.failedLinks.map((m) => (
                  <li key={m.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-800">{m.product ?? m.externalTitle ?? m.productId}{m.variant ? ` · ${m.variant}` : ''}</span>
                      {m.sku && <span className="font-mono text-xs text-slate-500">{m.sku}</span>}
                      <span className="ml-auto text-xs text-slate-500">{when(m.lastSyncedAt)}</span>
                    </div>
                    <p className="mt-1 break-words text-xs text-rose-700">{m.error ?? 'Last push failed'}</p>
                  </li>
                ))}
              </ul>
            ) : <Empty>No failed links.</Empty>)}
            {tab === 'jobs' && (c.jobs.length ? (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.jobs.map((j) => (
                  <li key={j.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <JobStatus status={j.status} />
                      <span className="font-semibold text-slate-800">{enumLabel(j.kind)}</span>
                      <span className="text-xs text-slate-500">{j.done}/{j.total} done{j.failed ? `, ${j.failed} failed` : ''}</span>
                      <span className="ml-auto text-xs text-slate-500">{dateTime(j.createdAt)}</span>
                    </div>
                    <div className="mt-2"><Progress percent={j.percent} failed={j.failed} /></div>
                  </li>
                ))}
              </ul>
            ) : <Empty>No catalog jobs on this channel.</Empty>)}
          </Card>
        </>
      )}
    </Drawer>
  );
}
