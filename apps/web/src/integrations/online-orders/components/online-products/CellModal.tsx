/**
 * One product (or size) on one channel: what is linked, the Price Nafaa
 * sets there (rule or its own Price), the Stock sent, the last sync and its
 * error, with "Abhi bhejein", relink and unlink.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock, Link2, Link2Off, RefreshCw } from 'lucide-react';
import { Button, Input, Modal, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../../api/online-orders.api';
import { onlineProductsApi, type LinkedCell, type OnlineChannel } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, refreshOnlineProducts, rs, ruleText } from './meta';

export function CellModal({ channel, cell, title, productId, canManage, onRelink, onClose }: {
  channel: OnlineChannel; cell: LinkedCell; title: string; productId: string; canManage: boolean;
  onRelink: () => void; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [own, setOwn] = useState(cell.override ? String(cell.override) : '');
  const done = (msg: string) => { refreshOnlineProducts(qc); toast.success(msg); };

  const price = useMutation({
    mutationFn: (v: number | null) => onlineProductsApi.setPrice(cell.mappingId, v),
    onSuccess: (_r, v) => { done(v === null ? 'Ab rule wali Price lagegi' : 'Apni Price save ho gayi'); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sync = useMutation({
    mutationFn: () => onlineProductsApi.syncProduct(productId),
    onSuccess: (r) => {
      const bad = r.results.find((x) => !x.ok);
      if (bad) toast.error(`${bad.name}: ${bad.error}`); else done('Stock aur Price bhej diye');
      refreshOnlineProducts(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: () => onlineProductsApi.unlink(cell.mappingId),
    onSuccess: () => { done('Link hata diya'); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const ownValue = Number(own);
  const ownOk = own === '' || (Number.isFinite(ownValue) && ownValue > 0);
  const failed = cell.status === 'FAILED';
  const push = channel.canPush;

  return (
    <Modal open onClose={onClose} size="md"
      title={<span className="flex items-center gap-2"><ChannelMark channel={channel} size="sm" /><span className="truncate">{title}</span></span>}
      description={`${channelName(channel)}${cell.externalTitle ? ` · ${cell.externalTitle}` : ''}${cell.externalSku ? ` · SKU ${cell.externalSku}` : ''}`}>
      <div className="space-y-4">
        {push ? <div className={cn('flex items-start gap-2.5 rounded-2xl p-3 ring-1',
          failed ? 'bg-rose-50 text-rose-900 ring-rose-200' : cell.status === 'SUCCESS' ? 'bg-success-50 text-success-800 ring-success-200' : 'bg-slate-50 text-slate-700 ring-slate-200')}>
          {failed ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : cell.status === 'SUCCESS' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
          <div className="min-w-0 text-[0.8125rem]">
            <p className="font-semibold">{failed ? 'Pichli dafa nahi gaya' : cell.status === 'SUCCESS' ? 'Channel par barabar' : 'Abhi nahi bheja'}</p>
            {failed && cell.error && <p className="mt-0.5">{cell.error}</p>}
            {cell.lastSyncedAt && <p className="mt-0.5 opacity-80">Aakhri dafa {timeAgo(cell.lastSyncedAt)}</p>}
          </div>
        </div> : (
          <p className="rounded-2xl bg-slate-50 p-3 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
            {channel.mode === 'indolj'
              ? 'Indolj ka har order is product se bill banata hai. Price Indolj panel se badlein; Stock Indolj par track nahi hota.'
              : 'Website Stock aur Price khud Nafaa se leti hai — yahan se bhejna nahi padta.'}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
            <dt className="text-slate-500">{channel.mode === 'website' ? 'Stock jo website ko dikhta hai' : 'Stock jo channel ko jata hai'}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{channel.tracksStock ? cell.stock ?? '—' : 'Track nahi'}</dd>
            <dd className="text-[0.75rem] text-slate-500">Nafaa me {cell.nafaaStock}{channel.tracksStock && channel.stockBuffer ? ` · ${channel.stockBuffer} rakh kar` : ''}</dd>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
            <dt className="text-slate-500">{push ? 'Channel ki Price' : 'Nafaa price'}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{rs(cell.price)}</dd>
            <dd className={cn('text-[0.75rem]', cell.priceDiffers ? 'font-semibold text-amber-700' : 'text-slate-500')}>
              {channel.mode === 'website' ? 'Website ko yahi jati hai' : cell.channelPrice === null ? 'Channel par abhi nahi dekhi' : cell.priceDiffers ? `Channel par abhi ${rs(cell.channelPrice)}` : 'Channel par bhi yahi'}
            </dd>
          </div>
        </dl>

        {channel.mode === 'indolj' && <p className="text-[0.75rem] font-medium text-amber-700">Price Indolj panel se badlein.</p>}
        {push && <section className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Is channel par apni Price</p>
          <p className="text-[0.75rem] text-slate-500">Khali chhorein to rule lagega: {ruleText(channel.priceRule)}.</p>
          <div className="flex flex-wrap items-start gap-2">
            <Input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Rule wali" aria-label="Apni Price"
              disabled={!canManage} wrapperClassName="min-w-[8rem] flex-1" rightIcon={<span className="text-[0.75rem] text-slate-500">Rs</span>} error={ownOk ? undefined : 'Price sahi nahi'} />
            {canManage && <Button variant="secondary" loading={price.isPending} disabled={!ownOk} onClick={() => price.mutate(own === '' ? null : ownValue)}>Save</Button>}
          </div>
          {!channel.pushPrice && <p className="text-[0.75rem] font-medium text-amber-700">Price is channel par haath se badlein — Price bhejna band hai.</p>}
        </section>}

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {push && <Button variant="primary" loading={sync.isPending} onClick={() => sync.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>Abhi bhejein</Button>}
            {channel.canFetch && <Button variant="secondary" onClick={onRelink} leftIcon={<Link2 className="h-4 w-4" />}>Doosre se jorein</Button>}
            <Button variant="ghost" className="text-rose-700" loading={unlink.isPending} leftIcon={<Link2Off className="h-4 w-4" />}
              onClick={async () => { if (await confirmDialog({ title: 'Link hatayein?', text: push ? 'Is product ka Stock aur Price is channel par jana band ho jayega. Channel par product waise hi rahega.' : 'Is channel ke orders me ye product khud nahi milega — agle order par dobara jorna hoga.', danger: true })) unlink.mutate(); }}>
              Link hatayein
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
