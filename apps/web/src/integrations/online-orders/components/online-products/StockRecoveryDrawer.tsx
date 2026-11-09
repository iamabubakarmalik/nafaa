/**
 * Import fix: undo what an import and Nafaa's first push did to a channel.
 * Two kinds of rows come from the API:
 * - untrack: the item had "Track quantity" off on Shopify, came in with 0,
 *   and a push turned counting on. The fix turns counting off again; Nafaa
 *   stock is untouched and nothing is deleted.
 * - restore: the channel had real stock before Nafaa overwrote it. The fix
 *   sets Nafaa stock to that number (reason "Import fix") and sends it.
 * The list is read-only until the user picks rows and confirms. Owners and
 * managers only; the API refuses everyone else.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, History, Info } from 'lucide-react';
import { Button, Drawer, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type RecoveryRow, type RecoverySource } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts } from './meta';

export const recoverySourceText = (s: RecoverySource) => ({
  'import-zero': t('Import par 0 aaya, phir ginti chalu hui'),
  'untracked-link': t('Channel ginti nahi karta tha'),
  'first-push': t('Nafaa ke pehle bhejne se pehle channel par'),
}[s] ?? s);

/** Picked by default: sure "untrack" rows and every "restore" row. */
const defaultPick = (r: RecoveryRow) => r.action === 'restore' || r.confidence === 'high';

const num = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-PK'));

export function StockRecoveryDrawer({ channel, onClose }: { channel: OnlineChannel; onClose: () => void }) {
  const qc = useQueryClient();
  const key = [ONLINE_PRODUCTS_KEY, 'stock-recovery', channel.id];
  const q = useQuery({ queryKey: key, queryFn: () => onlineProductsApi.stockRecovery(channel.id), staleTime: 0, retry: false });
  const rows = useMemo(() => q.data?.rows ?? [], [q.data]);
  const untrackRows = rows.filter((r) => r.action === 'untrack');
  const restoreRows = rows.filter((r) => r.action === 'restore');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => { setPicked(new Set(rows.filter(defaultPick).map((r) => r.mappingId))); }, [rows]);

  const apply = useMutation({
    mutationFn: (ids: string[]) => onlineProductsApi.applyRecovery(channel.id, ids),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      const parts = [t('{{untracked}} items par ginti band, {{adjusted}} ka Stock wapas', { untracked: r.untracked, adjusted: r.adjusted })];
      if (r.skipped) parts.push(t('{{skipped}} chhor diye', { skipped: r.skipped }));
      if (r.adjusted) parts.push(r.pushed ? t('channel par bhej diya') : t('channel par abhi nahi gaya'));
      toast.success(parts.join(' · '));
      if (r.errors?.[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = (list: RecoveryRow[]) => setPicked((s) => {
    const n = new Set(s);
    const all = list.every((r) => n.has(r.mappingId));
    list.forEach((r) => (all ? n.delete(r.mappingId) : n.add(r.mappingId)));
    return n;
  });
  const run = async () => {
    const chosen = rows.filter((r) => picked.has(r.mappingId));
    if (!chosen.length) return;
    const untrack = chosen.filter((r) => r.action === 'untrack').length;
    const restore = chosen.length - untrack;
    const ok = await confirmDialog({
      title: t('{{count}} items ka Import theek karein?', { count: chosen.length }),
      text: t('{{untrack}} items par {{channel}} ki ginti (Track quantity) band ho jayegi, jaise import se pehle thi — Nafaa ka Stock nahi badlega aur kuch delete nahi hoga. {{restore}} items ka Nafaa Stock mile hue number par set hoga (wajah "Import fix") aur channel par bhej diya jayega.', { untrack, restore, channel: channelName(channel) }),
      yes: t('Theek karein'),
    });
    if (ok) apply.mutate(chosen.map((r) => r.mappingId));
  };

  const d = q.data;
  return (
    <Drawer open onClose={onClose} size="lg" icon={<ChannelMark channel={channel} />}
      title={t('Import theek karein')}
      description={d?.channel.shopName ? `${channelName(channel)} · ${d.channel.shopName}` : channelName(channel)}
      footer={d && rows.length > 0 ? <>
        <span className="me-auto text-[0.8125rem] text-slate-600">{t('{{count}} / {{total}} chune', { count: picked.size, total: rows.length })}</span>
        <Button variant="ghost" onClick={onClose}>{t('Band karein')}</Button>
        <Button loading={apply.isPending} disabled={!picked.size} onClick={() => void run()} leftIcon={<History className="h-4 w-4" />}>
          {t('Chune hue {{count}} theek karein', { count: picked.size })}
        </Button>
      </> : undefined}>
      {q.isLoading ? (
        <div className="space-y-2 p-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : q.isError || !d ? (
        <div className="p-6"><EmptyState icon={<AlertTriangle className="h-5 w-5" />} title={t('Import ki list nahi aayi')} description={apiErrorMessage(q.error)}
          action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} /></div>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{t('Ye sirf dikhata hai. Jab tak aap neeche wala button na dabayein, kuch nahi badlega.')}</span>
          </p>
          {d.readError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">{t('Channel se parhne me masla: {{error}}', { error: d.readError })}</p>}
          {d.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{d.note}</p>}
          {d.missing > 0 && <p className="text-[0.8125rem] font-medium text-slate-600">{t('{{n}} links ka purana Stock nahi mila', { n: d.missing.toLocaleString('en-PK') })}</p>}

          {!rows.length ? (
            <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={t('Theek karne ko kuch nahi mila')} description={t('{{checked}} links dekhe — sab theek hain.', { checked: d.checked.toLocaleString('en-PK') })} />
          ) : (
            <>
              {untrackRows.length > 0 && (
                <Section title={t('Shopify par ginti band karein (pehle jaisa)')} text={t('Ye items channel par bina ginti ke bikte the. Nafaa ke bhejne se ginti chalu hui aur ye 0 par "Out of stock" ho gaye. Nafaa ka Stock nahi badlega.')}
                  rows={untrackRows} picked={picked} onToggle={toggle} onToggleAll={() => toggleAll(untrackRows)}
                  head={[t('Import par'), t('Channel abhi'), t('Kitna pakka')]}
                  cells={(r) => [
                    <span className="tabular-nums">{num(r.importQty)}</span>,
                    <span className="tabular-nums">{r.channelTracked === false ? t('Ginti nahi') : num(r.channelAvailable)}</span>,
                    r.confidence === 'low'
                      ? <span className="font-semibold text-amber-700">{t('Shayad asli 0 ho — check karein')}</span>
                      : r.confidence === 'high' ? <span className="font-semibold text-success-700">{t('Pakka')}</span> : <span className="text-slate-400">—</span>,
                  ]} />
              )}
              {restoreRows.length > 0 && (
                <Section title={t('Purana Stock wapas laayein')} text={t('Channel par asli Stock tha jo Nafaa ke bhejne se badal gaya. Nafaa me ye number set hoga aur channel par jayega.')}
                  rows={restoreRows} picked={picked} onToggle={toggle} onToggleAll={() => toggleAll(restoreRows)}
                  head={[t('Nafaa abhi'), t('Mila'), t('Kahan se')]}
                  cells={(r) => [
                    <span className="tabular-nums">{num(r.nafaaStock)}</span>,
                    <span className={cn('font-semibold tabular-nums', (r.found ?? 0) > r.nafaaStock ? 'text-success-700' : 'text-slate-700')}>{num(r.found)}</span>,
                    <span className="text-[0.75rem] text-slate-600">{recoverySourceText(r.source)}<span className="block text-slate-400">{r.at ? timeAgo(r.at) : '—'}</span></span>,
                  ]} />
              )}
            </>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Section({ title, text, rows, picked, onToggle, onToggleAll, head, cells }: {
  title: string; text: string; rows: RecoveryRow[]; picked: Set<string>;
  onToggle: (id: string) => void; onToggleAll: () => void;
  head: [string, string, string]; cells: (r: RecoveryRow) => [ReactNode, ReactNode, ReactNode];
}) {
  const allPicked = rows.every((r) => picked.has(r.mappingId));
  return (
    <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
      <header className="bg-white px-3 py-2.5">
        <p className="flex items-baseline gap-2 text-[0.875rem] font-semibold text-slate-900">{title}<span className="text-[0.75rem] font-medium tabular-nums text-slate-500">{rows.length}</span></p>
        <p className="mt-0.5 text-[0.75rem] text-slate-600">{text}</p>
      </header>
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full min-w-[36rem] text-[0.8125rem]">
          <thead className="bg-slate-50 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-9 px-2.5 py-2 text-start">
                <input type="checkbox" checked={allPicked} onChange={onToggleAll} aria-label={t('Sab chunein')} className="h-4 w-4 rounded border-slate-300" />
              </th>
              <th className="px-2 py-2 text-start">{t('Product')}</th>
              <th className="px-2 py-2 text-end">{head[0]}</th>
              <th className="px-2 py-2 text-end">{head[1]}</th>
              <th className="px-2.5 py-2 text-start">{head[2]}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const [a, b, c] = cells(r);
              return (
                <tr key={r.mappingId} className={cn(picked.has(r.mappingId) && 'bg-brand-50/50')}>
                  <td className="px-2.5 py-2 align-top">
                    <input type="checkbox" checked={picked.has(r.mappingId)} onChange={() => onToggle(r.mappingId)}
                      aria-label={t('{{name}} chunein', { name: r.name })} className="h-4 w-4 rounded border-slate-300" />
                  </td>
                  <td className="max-w-[16rem] px-2 py-2 align-top">
                    <p className="truncate font-medium text-slate-900" title={r.name}>{r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}</p>
                    {(r.externalTitle || r.externalSku) && (
                      <p className="truncate text-[0.71875rem] text-slate-500" title={r.externalTitle ?? undefined}>
                        {r.externalTitle}{r.externalSku ? <span className="font-mono"> · {r.externalSku}</span> : null}
                      </p>
                    )}
                  </td>
                  <td className="px-2 py-2 text-end align-top">{a}</td>
                  <td className="px-2 py-2 text-end align-top">{b}</td>
                  <td className="px-2.5 py-2 align-top text-[0.75rem]">{c}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
