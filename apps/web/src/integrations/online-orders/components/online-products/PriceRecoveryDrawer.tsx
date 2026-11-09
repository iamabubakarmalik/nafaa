/**
 * Price recovery: channel prices that were changed on the channel and later
 * overwritten by a Nafaa push. Per row the user picks:
 * - channel: the old channel price goes back on the channel and becomes the
 *   Nafaa price at the row's target (product, size, branch or this channel);
 * - nafaa: the Nafaa price stays and the row is cleared.
 * Every row starts on "channel". The list is read-only until the user picks
 * rows and confirms; nothing is deleted. Owners and managers only; the API
 * refuses everyone else.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, History, Info } from 'lucide-react';
import { Button, Drawer, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type PriceRecoveryChoice, type PriceRecoveryRow } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts, rs } from './meta';
import { priceTargetText } from './PriceHold';

const price = (n: number | null | undefined) => (n === null || n === undefined ? '—' : rs(n));

export function PriceRecoveryDrawer({ channel, onClose }: { channel: OnlineChannel; onClose: () => void }) {
  const qc = useQueryClient();
  const key = [ONLINE_PRODUCTS_KEY, 'price-recovery', channel.id];
  const q = useQuery({ queryKey: key, queryFn: () => onlineProductsApi.priceRecovery(channel.id), staleTime: 0, retry: false });
  const rows = useMemo(() => q.data?.rows ?? [], [q.data]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [choice, setChoice] = useState<Record<string, PriceRecoveryChoice>>({});
  useEffect(() => {
    setPicked(new Set(rows.map((r) => r.mappingId)));
    setChoice(Object.fromEntries(rows.map((r) => [r.mappingId, 'channel' as PriceRecoveryChoice])));
  }, [rows]);

  const apply = useMutation({
    mutationFn: (items: Array<{ mappingId: string; choice: PriceRecoveryChoice }>) => onlineProductsApi.applyPriceRecovery(channel.id, items),
    onSuccess: (r) => {
      refreshOnlineProducts(qc);
      const parts = [t('{{restored}} ki website wali qeemat wapas, {{kept}} par Nafaa ki rakhi', { restored: r.restored, kept: r.kept })];
      if (r.sent) parts.push(t('{{sent}} website par bheji', { sent: r.sent }));
      if (r.skipped) parts.push(t('{{skipped}} chhor diye', { skipped: r.skipped }));
      toast.success(parts.join(' · '));
      if (r.errors?.[0]) toast.error(r.errors[0]);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pickOf = (r: PriceRecoveryRow) => choice[r.mappingId] ?? 'channel';
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = rows.length > 0 && rows.every((r) => picked.has(r.mappingId));
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r.mappingId)));
  const setAll = (c: PriceRecoveryChoice) => setChoice(Object.fromEntries(rows.map((r) => [r.mappingId, c])));

  const run = async () => {
    const chosen = rows.filter((r) => picked.has(r.mappingId));
    if (!chosen.length) return;
    const back = chosen.filter((r) => pickOf(r) === 'channel');
    const keep = chosen.length - back.length;
    const where = [...new Set(back.map((r) => priceTargetText(r.target)).filter(Boolean))].join(', ');
    const ok = await confirmDialog({
      title: t('{{count}} qeematein theek karein?', { count: chosen.length }),
      text: t('{{back}} items: website wali purani qeemat {{channel}} par wapas lagegi aur Nafaa me bhi wohi ho jayegi ({{where}}). {{keep}} items par Nafaa ki qeemat rahegi. Kuch delete nahi hota.', {
        back: back.length, keep, channel: channelName(channel), where: where || t('channel ki settings ke hisaab se'),
      }),
      yes: t('Theek karein'),
    });
    if (ok) apply.mutate(chosen.map((r) => ({ mappingId: r.mappingId, choice: pickOf(r) })));
  };

  const d = q.data;
  return (
    <Drawer open onClose={onClose} size="lg" icon={<ChannelMark channel={channel} />}
      title={t('Qeemat wapas laayein')}
      description={channelName(channel)}
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
        <div className="p-6"><EmptyState icon={<AlertTriangle className="h-5 w-5" />} title={t('Qeematon ki list nahi aayi')} description={apiErrorMessage(q.error)}
          action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>{t('Dobara koshish')}</Button>} /></div>
      ) : (
        <div className="space-y-3 p-4 sm:p-5">
          <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200/80">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{t('In items ki qeemat website par badli gayi thi, phir Nafaa ne apni qeemat bhej kar badal di. Ye sirf dikhata hai — jab tak aap neeche wala button na dabayein, kuch nahi badlega.')}</span>
          </p>
          {d.note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{d.note}</p>}

          {!rows.length ? (
            <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={t('Wapas laane ko kuch nahi mila')} description={t('{{checked}} links dekhe — sab theek hain.', { checked: d.checked.toLocaleString('en-PK') })} />
          ) : (
            <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
              <header className="flex flex-wrap items-center gap-2 bg-white px-3 py-2.5">
                <p className="me-auto flex items-baseline gap-2 text-[0.875rem] font-semibold text-slate-900">{t('Badli hui qeematein')}<span className="text-[0.75rem] font-medium tabular-nums text-slate-500">{rows.length}</span></p>
                <Button size="xs" variant="ghost" onClick={() => setAll('channel')}>{t('Sab par website wali')}</Button>
                <Button size="xs" variant="ghost" onClick={() => setAll('nafaa')}>{t('Sab par Nafaa wali')}</Button>
              </header>
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full min-w-[40rem] text-[0.8125rem]">
                  <thead className="bg-slate-50 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-9 px-2.5 py-2 text-start">
                        <input type="checkbox" checked={allPicked} onChange={toggleAll} aria-label={t('Sab chunein')} className="h-4 w-4 rounded border-slate-300" />
                      </th>
                      <th className="px-2 py-2 text-start">{t('Product')}</th>
                      <th className="px-2 py-2 text-end">{t('Website ki Price')}</th>
                      <th className="px-2 py-2 text-end">{t('Nafaa ne bheji')}</th>
                      <th className="px-2.5 py-2 text-start">{t('Kya karein')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const c = pickOf(r);
                      return (
                        <tr key={r.mappingId} className={cn(picked.has(r.mappingId) && 'bg-brand-50/50')}>
                          <td className="px-2.5 py-2 align-top">
                            <input type="checkbox" checked={picked.has(r.mappingId)} onChange={() => toggle(r.mappingId)}
                              aria-label={t('{{name}} chunein', { name: r.name })} className="h-4 w-4 rounded border-slate-300" />
                          </td>
                          <td className="max-w-[15rem] px-2 py-2 align-top">
                            <p className="truncate font-medium text-slate-900" title={r.name}>{r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}</p>
                            {(r.externalTitle || r.externalSku) && (
                              <p className="truncate text-[0.71875rem] text-slate-500" title={r.externalTitle ?? undefined}>
                                {r.externalTitle}{r.externalSku ? <span className="font-mono"> · {r.externalSku}</span> : null}
                              </p>
                            )}
                            {r.held && <p className="text-[0.71875rem] font-semibold text-amber-700">{t('Qeemat ka faisla baqi')}</p>}
                          </td>
                          <td className="px-2 py-2 text-end align-top">
                            <span className="font-semibold tabular-nums text-success-700">{price(r.channelPrice)}</span>
                            {r.channelPriceAt && <span className="block text-[0.6875rem] text-slate-400">{timeAgo(r.channelPriceAt)}</span>}
                          </td>
                          <td className="px-2 py-2 text-end align-top">
                            <span className="tabular-nums text-slate-700">{price(r.pushedPrice)}</span>
                            {r.driftPushedAt && <span className="block text-[0.6875rem] text-slate-400">{timeAgo(r.driftPushedAt)}</span>}
                          </td>
                          <td className="px-2.5 py-2 align-top">
                            <div role="radiogroup" aria-label={t('{{name}}: kaunsi qeemat', { name: r.name })} className="inline-flex rounded-lg bg-slate-100 p-0.5">
                              {(['channel', 'nafaa'] as const).map((v) => (
                                <button key={v} type="button" role="radio" aria-checked={c === v}
                                  onClick={() => setChoice((m) => ({ ...m, [r.mappingId]: v }))}
                                  className={cn('h-7 rounded-md px-2 text-[0.71875rem] font-semibold transition', c === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
                                  {v === 'channel' ? t('Website ki qeemat wapas') : t('Nafaa ki qeemat rakhein')}
                                </button>
                              ))}
                            </div>
                            {c === 'channel' && r.target && <span className="mt-0.5 block text-[0.6875rem] text-slate-500">{t('Nafaa me: {{where}}', { where: priceTargetText(r.target) })}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
