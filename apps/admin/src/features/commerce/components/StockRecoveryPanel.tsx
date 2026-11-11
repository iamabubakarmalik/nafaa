/**
 * Stock recovery (import fix) for one shop, per channel. "Untrack" rows had
 * Shopify "Track quantity" off before Nafaa's push turned it on; applying
 * turns it off again and leaves Nafaa stock alone. "Restore" rows had real
 * channel stock that Nafaa overwrote; applying sets Nafaa stock to that
 * number and pushes it. The preview is read-only; Apply (per channel, after
 * the preview is loaded) acts on the picked links only.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { History } from 'lucide-react';
import { adminCommerceApi, type StockRecoveryRow, type TenantStockRecovery } from '@/api/admin-commerce.api';
import { Button, confirmDialog } from '@/design-system/components';
import { cn } from '@/lib/cn';
import { Empty, kindLabel, Pill, when } from './CommerceUi';
import { apiError as errMsg } from '@/lib/errors';

const SOURCE_LABEL: Record<StockRecoveryRow['source'], string> = {
  'import-zero': 'Imported as 0, then tracking turned on',
  'untracked-link': 'Channel did not track stock',
  'first-push': 'Before first Nafaa push',
};

/** Picked by default: high-confidence untrack rows and every restore row. */
const defaultPick = (r: StockRecoveryRow) => r.action === 'restore' || r.confidence === 'high';


export function StockRecoveryPanel({ tenantId }: { tenantId: string }) {
  const [shown, setShown] = useState(false);
  const q = useQuery({
    queryKey: ['admin-commerce-stock-recovery', tenantId],
    queryFn: () => adminCommerceApi.stockRecovery(tenantId),
    enabled: shown,
    staleTime: 0,
  });

  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <History className="h-4 w-4 text-slate-500" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">Stock recovery</h4>
          <p className="text-xs text-slate-500">Items whose channel tracking Nafaa turned on, and old channel stock Nafaa overwrote. Nothing changes until you apply.</p>
        </div>
        <Button size="sm" variant="secondary" loading={q.isFetching} onClick={() => (shown ? q.refetch() : setShown(true))}>
          {shown ? 'Refresh preview' : 'Stock recovery preview'}
        </Button>
      </div>
      {shown && (
        <div className="border-t border-slate-100 p-4">
          {q.isLoading ? <Empty>Loading…</Empty> : q.error || !q.data ? <Empty>{errMsg(q.error) || 'Could not load the preview.'}</Empty>
            : !q.data.channels.length ? <p className="text-sm text-slate-500">No channels with stock to recover.</p>
              : <div className="space-y-4">{q.data.channels.map((c) => <ChannelRecovery key={c.id} tenantId={tenantId} channel={c} />)}</div>}
        </div>
      )}
    </div>
  );
}

function ChannelRecovery({ tenantId, channel }: { tenantId: string; channel: TenantStockRecovery['channels'][number] }) {
  const qc = useQueryClient();
  const { rows, checked, missing, note, readError } = channel.preview;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => { setPicked(new Set(rows.filter(defaultPick).map((r) => r.mappingId))); }, [rows]);

  const apply = useMutation({
    mutationFn: (ids: string[]) => adminCommerceApi.applyStockRecovery(tenantId, channel.id, ids),
    onSuccess: (r) => {
      toast.success(`${r.untracked} untracked, ${r.adjusted} restored, ${r.skipped} skipped${r.adjusted ? (r.pushed ? ', pushed to the channel' : ', not pushed yet') : ''}`);
      if (r.errors?.[0]) toast.error(r.errors[0]);
      qc.invalidateQueries({ queryKey: ['admin-commerce-stock-recovery', tenantId] });
      qc.invalidateQueries({ queryKey: ['admin-commerce-tenant', tenantId] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const run = async () => {
    const chosen = rows.filter((r) => picked.has(r.mappingId));
    if (!chosen.length) return;
    const untrack = chosen.filter((r) => r.action === 'untrack').length;
    const restore = chosen.length - untrack;
    if (await confirmDialog({ title: 'Apply import fix', text: `Apply the import fix to ${chosen.length} links on ${channel.name}?\n\n${untrack} untrack: channel tracking ("Track quantity") goes off again; Nafaa stock is not changed and nothing is deleted.\n${restore} restore: Nafaa stock is set to the found number (reason "Import fix") and pushed to the channel.`, yes: 'Apply' })) apply.mutate(chosen.map((r) => r.mappingId));
  };
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.mappingId));
  const untrackCount = rows.filter((r) => r.action === 'untrack').length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-2.5">
        <span className="font-medium text-slate-900">{channel.name}</span>
        <span className="text-xs text-slate-500">{kindLabel(channel.type)}</span>
        <Pill>{checked} checked</Pill>
        {untrackCount > 0 && <Pill tone="indigo">{untrackCount} untrack</Pill>}
        {rows.length - untrackCount > 0 && <Pill tone="emerald">{rows.length - untrackCount} restore</Pill>}
        {missing > 0 && <Pill tone="amber">{missing} not found</Pill>}
        {rows.length > 0 && (
          <Button size="sm" className="ml-auto" loading={apply.isPending} disabled={!picked.size} onClick={run}>Apply to {picked.size}</Button>
        )}
      </div>
      {readError && <p className="border-t border-slate-100 bg-rose-50 px-4 py-2 text-xs text-rose-800">Channel read error: {readError}</p>}
      {note && <p className="border-t border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">{note}</p>}
      {rows.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-4 py-2"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.mappingId)))} aria-label="Pick all" /></th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2 text-right">Nafaa now</th>
                <th className="px-3 py-2 text-right">Imported qty</th>
                <th className="px-3 py-2 text-right">Channel now</th>
                <th className="px-3 py-2 text-right">Found</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-4 py-2">Found at / last push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.mappingId} className={cn(picked.has(r.mappingId) && 'bg-brand-50/40')}>
                  <td className="px-4 py-2"><input type="checkbox" checked={picked.has(r.mappingId)} onChange={() => toggle(r.mappingId)} aria-label={`Pick ${r.name}`} /></td>
                  <td className="max-w-[18rem] px-3 py-2">
                    <div className="truncate font-medium text-slate-900">{r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}</div>
                    {(r.externalTitle || r.externalSku) && <div className="truncate text-xs text-slate-500">{r.externalTitle}{r.externalSku ? ` · ${r.externalSku}` : ''}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {r.action === 'untrack' ? <Pill tone="indigo">Untrack</Pill> : <Pill tone="emerald">Restore</Pill>}
                    {r.confidence === 'low' && <div className="mt-0.5 text-xs font-semibold text-amber-700">Low confidence: may really be 0</div>}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.nafaaStock}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.importQty ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{r.channelTracked === false ? 'not tracked' : r.channelAvailable ?? '—'}</td>
                  <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', (r.found ?? 0) > r.nafaaStock ? 'text-emerald-700' : 'text-slate-700')}>{r.found ?? '—'}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">{SOURCE_LABEL[r.source] ?? r.source}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{when(r.at)} / {when(r.lastPushAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
