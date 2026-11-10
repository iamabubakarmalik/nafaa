/**
 * "Shayad ghalat jura hai": links whose channel listing and Nafaa product look
 * like two different items (no shared word in the names and no SKU match, or
 * prices more than 3x apart). Each row can be unlinked, or marked "Theek hai"
 * so it is not flagged again. Used by the Masle drawer.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronDown, Unlink } from 'lucide-react';
import { Button, EmptyState, Skeleton, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi, type OnlineChannel, type SuspectLinkRow } from '../../api/online-products.api';
import { ChannelMark, channelName, refreshOnlineProducts, rs } from './meta';

const reasonText = (r: SuspectLinkRow) => r.reasons.map((x) => (x === 'title' ? t('Naam bilkul nahi milte') : t('Qeemat 3 guna se zyada alag'))).join(' · ');

export function SuspectLinkChannelRow({ channel, count, canManage }: { channel: OnlineChannel; count: number; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <ChannelMark channel={channel} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-slate-800">{channelName(channel)}</span>
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">
            {t('Har ek dekhein')}<ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
          </button>
        </span>
        <span className="text-[0.75rem] font-semibold tabular-nums text-slate-600">{count.toLocaleString('en-PK')}</span>
      </div>
      {open && <SuspectList channelId={channel.id} canManage={canManage} />}
    </li>
  );
}

function SuspectList({ channelId, canManage }: { channelId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [ONLINE_PRODUCTS_KEY, 'suspect-links', channelId],
    queryFn: () => onlineProductsApi.suspectLinks(channelId),
  });
  const done = () => { refreshOnlineProducts(qc); qc.invalidateQueries({ queryKey: [ONLINE_PRODUCTS_KEY, 'suspect-links'] }); };
  const unlink = useMutation({
    mutationFn: (id: string) => onlineProductsApi.unlink(id),
    onSuccess: () => { done(); toast.success(t('Link hata diya — ab sahi product se jorein')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const ok = useMutation({
    mutationFn: (ids: string[]) => onlineProductsApi.markLinksOk(ids),
    onSuccess: () => { done(); toast.success(t('Theek hai — ye link dobara nahi dikhega')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (q.isLoading) return <div className="mt-2 space-y-1.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>;
  if (q.isError) return <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[0.75rem] text-rose-800">{apiErrorMessage(q.error)}</p>;
  const items = q.data?.items ?? [];
  if (!items.length) return <div className="mt-2"><EmptyState title={t('Koi shak wala link nahi')} /></div>;

  return (
    <ul className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200/80">
      {items.map((r) => (
        <li key={r.mappingId} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5">
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[0.78125rem] font-medium text-slate-900" title={r.externalTitle ?? undefined}>
              {t('Channel')}: {r.externalTitle || t('Channel ka item')}{r.externalSku ? <span className="font-mono text-slate-500"> · {r.externalSku}</span> : null}
              {r.channelPrice !== null ? <span className="tabular-nums text-slate-500"> · {rs(r.channelPrice)}</span> : null}
            </span>
            <span className="block truncate text-[0.75rem] text-slate-700" title={r.name}>
              {t('Nafaa')}: {r.name}{r.variantName ? <span className="text-slate-500"> — {r.variantName}</span> : null}
              <span className="tabular-nums text-slate-500"> · {rs(r.nafaaPrice)}</span>
            </span>
            <span className="block text-[0.6875rem] font-semibold text-rose-700">{reasonText(r)}</span>
          </span>
          {canManage && (
            <span className="flex shrink-0 items-center gap-1.5">
              <Button size="xs" variant="critical" loading={unlink.isPending && unlink.variables === r.mappingId} disabled={unlink.isPending || ok.isPending}
                leftIcon={<Unlink className="h-3.5 w-3.5" />}
                onClick={async () => {
                  if (await confirmDialog({ title: t('Link hatayein?'), text: t('Ye channel item is Nafaa product se alag ho jayega. Product aur Stock waise hi rahenge. Phir sahi product se jorein.'), danger: true, yes: t('Unlink') })) unlink.mutate(r.mappingId);
                }}>{t('Unlink')}</Button>
              <Button size="xs" variant="secondary" loading={ok.isPending && ok.variables?.[0] === r.mappingId} disabled={unlink.isPending || ok.isPending}
                leftIcon={<Check className="h-3.5 w-3.5" />} onClick={() => ok.mutate([r.mappingId])}>{t('Theek hai')}</Button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
