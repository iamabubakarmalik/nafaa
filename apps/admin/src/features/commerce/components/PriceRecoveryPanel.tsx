/**
 * Price recovery for one shop, per channel. Each row is a link whose channel
 * price was changed on the channel and later overwritten by a Nafaa push.
 * "Channel" puts the channel price back on the channel and saves it as the
 * Nafaa price at the row's target; "Nafaa" keeps the Nafaa price and only
 * clears the row. The preview is read-only; Apply (per channel, after the
 * preview is loaded) acts on the picked links only.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeDollarSign } from 'lucide-react';
import { adminCommerceApi, type PriceRecoveryChoice, type PriceRecoveryRow, type PriceTarget, type TenantPriceRecovery } from '@/api/admin-commerce.api';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { Empty, kindLabel, Pill, when } from './CommerceUi';

const TARGET_LABEL: Record<PriceTarget, string> = {
  PRODUCT: 'Product price',
  VARIANT: 'Size price',
  SHOP: 'Branch price',
  CHANNEL: 'Channel-only price',
};

const PRICE_FROM_LABEL: Record<string, string> = {
  NAFAA: 'Nafaa', WEBSITE: 'Website', LATEST: 'Latest change', NONE: 'None',
};

const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `Rs ${Math.round(n).toLocaleString('en-PK')}`);

const errMsg = (e: any) => e?.response?.data?.message ?? e?.message ?? 'Action failed';

export function PriceRecoveryPanel({ tenantId }: { tenantId: string }) {
  const [shown, setShown] = useState(false);
  const q = useQuery({
    queryKey: ['admin-commerce-price-recovery', tenantId],
    queryFn: () => adminCommerceApi.priceRecovery(tenantId),
    enabled: shown,
    staleTime: 0,
  });

  return (
    <div className="rounded-2xl border border-slate-200">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <BadgeDollarSign className="h-4 w-4 text-slate-500" />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-slate-900">Price recovery</h4>
          <p className="text-xs text-slate-500">Channel prices changed on the channel and then overwritten by a Nafaa push. Nothing changes until you apply.</p>
        </div>
        <Button size="sm" variant="secondary" loading={q.isFetching} onClick={() => (shown ? q.refetch() : setShown(true))}>
          {shown ? 'Refresh preview' : 'Price recovery preview'}
        </Button>
      </div>
      {shown && (
        <div className="border-t border-slate-100 p-4">
          {q.isLoading ? <Empty>Loading…</Empty> : q.error || !q.data ? <Empty>{errMsg(q.error) || 'Could not load the preview.'}</Empty>
            : !q.data.channels.length ? <p className="text-sm text-slate-500">No channels with prices to recover.</p>
              : <div className="space-y-4">{q.data.channels.map((c) => <ChannelPriceRecovery key={c.id} tenantId={tenantId} channel={c} />)}</div>}
        </div>
      )}
    </div>
  );
}

function ChannelPriceRecovery({ tenantId, channel }: { tenantId: string; channel: TenantPriceRecovery['channels'][number] }) {
  const qc = useQueryClient();
  const { rows, checked, note } = channel.preview;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<Record<string, PriceRecoveryChoice>>({});
  useEffect(() => {
    setPicked(new Set(rows.map((r) => r.mappingId)));
    setChoice(Object.fromEntries(rows.map((r) => [r.mappingId, 'channel' as PriceRecoveryChoice])));
  }, [rows]);

  const apply = useMutation({
    mutationFn: (items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>) => adminCommerceApi.applyPriceRecovery(tenantId, channel.id, items),
    onSuccess: (r) => {
      toast.success(`${r.restored} restored, ${r.kept} kept, ${r.sent} sent, ${r.skipped} skipped`);
      if (r.errors?.[0]) toast.error(r.errors[0]);
      qc.invalidateQueries({ queryKey: ['admin-commerce-price-recovery', tenantId] });
      qc.invalidateQueries({ queryKey: ['admin-commerce-tenant', tenantId] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const run = () => {
    const chosen = rows.filter((r) => picked.has(r.mappingId));
    if (!chosen.length) return;
    const back = chosen.filter((r) => choice[r.mappingId] !== 'nafaa').length;
    const keep = chosen.length - back;
    if (window.confirm(`Apply price recovery to ${chosen.length} links on ${channel.name}?\n\n${back} channel price: the old channel price goes back on the channel and becomes the Nafaa price at the shown target.\n${keep} keep Nafaa: the Nafaa price stays; the row is cleared.\nNothing is deleted.`)) {
      apply.mutate(chosen.map((r) => ({ mappingId: r.mappingId, choice: choice[r.mappingId] ?? 'channel' })));
    }
  };
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const setOne = (id: string, c: PriceRecoveryChoice) => setChoice((m) => ({ ...m, [id]: c }));
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.mappingId));
  const heldCount = rows.filter((r) => r.held).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100">
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-2.5">
        <span className="font-medium text-slate-900">{channel.name}</span>
        <span className="text-xs text-slate-500">{kindLabel(channel.type)}</span>
        <Pill>{checked} checked</Pill>
        {rows.length > 0 && <Pill tone="indigo">{rows.length} overwritten</Pill>}
        {heldCount > 0 && <Pill tone="amber">{heldCount} on hold</Pill>}
        <span className="text-xs text-slate-500">Price from: {PRICE_FROM_LABEL[channel.preview.channel.priceFrom] ?? channel.preview.channel.priceFrom}</span>
        {rows.length > 0 && (
          <Button size="sm" className="ml-auto" loading={apply.isPending} disabled={!picked.size} onClick={run}>Apply to {picked.size}</Button>
        )}
      </div>
      {note && <p className="border-t border-slate-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">{note}</p>}
      {rows.length > 0 && (
        <div className="max-h-96 overflow-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="sticky top-0 bg-white text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-4 py-2"><input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.mappingId)))} aria-label="Pick all" /></th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Channel price</th>
                <th className="px-3 py-2 text-right">Nafaa pushed</th>
                <th className="px-3 py-2 text-right">Nafaa now</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Changed / overwritten</th>
                <th className="px-4 py-2">Choice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => <PriceRow key={r.mappingId} r={r} picked={picked.has(r.mappingId)} choice={choice[r.mappingId] ?? 'channel'} onToggle={() => toggle(r.mappingId)} onChoice={(c) => setOne(r.mappingId, c)} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PriceRow({ r, picked, choice, onToggle, onChoice }: {
  r: PriceRecoveryRow; picked: boolean; choice: PriceRecoveryChoice; onToggle: () => void; onChoice: (c: PriceRecoveryChoice) => void;
}) {
  return (
    <tr className={cn(picked && 'bg-indigo-50/40')}>
      <td className="px-4 py-2"><input type="checkbox" checked={picked} onChange={onToggle} aria-label={`Pick ${r.name}`} /></td>
      <td className="max-w-[18rem] px-3 py-2">
        <div className="truncate font-medium text-slate-900">{r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}</div>
        {(r.externalTitle || r.externalSku) && <div className="truncate text-xs text-slate-500">{r.externalTitle}{r.externalSku ? ` · ${r.externalSku}` : ''}</div>}
        {r.held && <div className="mt-0.5 text-xs font-semibold text-amber-700">On hold: waiting for a choice</div>}
      </td>
      <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{money(r.channelPrice)}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(r.pushedPrice)}{r.driftPushes > 1 ? <div className="text-xs">{r.driftPushes} pushes</div> : null}</td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{money(r.nafaaPrice)}</td>
      <td className="px-3 py-2 text-xs text-slate-600">{r.target ? TARGET_LABEL[r.target] ?? r.target : '—'}</td>
      <td className="px-3 py-2 text-xs text-slate-500">{when(r.channelPriceAt)} / {when(r.driftPushedAt)}</td>
      <td className="px-4 py-2">
        <select value={choice} onChange={(e) => onChoice(e.target.value as PriceRecoveryChoice)} aria-label={`Choice for ${r.name}`}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
          <option value="channel">Channel price back</option>
          <option value="nafaa">Keep Nafaa price</option>
        </select>
      </td>
    </tr>
  );
}
