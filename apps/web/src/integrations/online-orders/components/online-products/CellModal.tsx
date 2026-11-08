/**
 * One product (or size) on one channel: what is linked, the Price Nafaa
 * sets there (rule or its own Price), the Stock sent, the last sync and its
 * error, with "Abhi bhejein", relink and unlink.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Clock, Link2, Link2Off, RefreshCw } from 'lucide-react';
import { Button, Input, Modal, Switch, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../../api/online-orders.api';
import { onlineProductsApi, type LinkPatch, type LinkedCell, type OnlineChannel } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { ChannelMark, channelName, lastPushText, refreshOnlineProducts, rs, ruleText } from './meta';
import { t } from '@core/i18n';

export function CellModal({ channel, cell, title, productId, canManage, onRelink, onClose }: {
  channel: OnlineChannel; cell: LinkedCell; title: string; productId: string; canManage: boolean;
  onRelink: () => void; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [own, setOwn] = useState(cell.override ? String(cell.override) : '');
  const [sale, setSale] = useState(cell.compareAtPrice ? String(cell.compareAtPrice) : '');
  const [alloc, setAlloc] = useState(cell.allocQty !== null && cell.allocQty !== undefined ? String(cell.allocQty) : '');
  const [listed, setListed] = useState(cell.listed !== false);
  const done = (msg: string) => { refreshOnlineProducts(qc); toast.success(msg); };

  const save = useMutation({
    mutationFn: (patch: LinkPatch) => onlineProductsApi.updateLink(cell.mappingId, patch),
    onSuccess: () => { done(t('Save ho gaya — channel par ja raha hai')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sync = useMutation({
    mutationFn: () => onlineProductsApi.syncProduct(productId, true),
    onSuccess: (r) => {
      const bad = r.results.find((x) => !x.ok);
      if (bad) toast.error(`${bad.name}: ${bad.error}`); else done(t('Stock aur Price bhej diye'));
      refreshOnlineProducts(qc);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const unlink = useMutation({
    mutationFn: () => onlineProductsApi.unlink(cell.mappingId),
    onSuccess: () => { done(t('Link hata diya')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const ownValue = Number(own);
  const ownOk = own === '' || (Number.isFinite(ownValue) && ownValue > 0);
  const saleOk = sale === '' || Number(sale) > 0;
  const patch: LinkPatch = {
    ...(listed !== (cell.listed !== false) ? { listed } : {}),
    ...(own !== (cell.override ? String(cell.override) : '') ? { priceOverride: own === '' ? null : ownValue } : {}),
    ...(sale !== (cell.compareAtPrice ? String(cell.compareAtPrice) : '') ? { compareAtPrice: sale === '' ? null : Number(sale) } : {}),
    ...(alloc !== (cell.allocQty !== null && cell.allocQty !== undefined ? String(cell.allocQty) : '') ? { allocQty: alloc === '' ? null : Number(alloc) } : {}),
  };
  const dirty = Object.keys(patch).length > 0;
  const lastPush = lastPushText(cell.lastPush);
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
            <p className="font-semibold">{failed ? t('Pichli dafa nahi gaya') : cell.status === 'SUCCESS' ? t('Channel par barabar') : t('Abhi nahi bheja')}</p>
            {failed && cell.error && <p className="mt-0.5">{cell.error}</p>}
            {cell.lastSyncedAt && <p className="mt-0.5 opacity-80">{t('Aakhri dafa {{lastSyncedAt}}', { lastSyncedAt: timeAgo(cell.lastSyncedAt) })}</p>}
            {lastPush && <p className="mt-0.5 opacity-80">{lastPush}</p>}
          </div>
        </div> : (
          <p className="rounded-2xl bg-slate-50 p-3 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">
            {channel.mode === 'indolj'
              ? t('Indolj ka har order is product se bill banata hai. Price Indolj panel se badlein; Stock Indolj par track nahi hota.')
              : t('Website Stock aur Price khud Nafaa se leti hai — yahan se bhejna nahi padta.')}
          </p>
        )}

        <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
            <dt className="text-slate-500">{channel.mode === 'website' ? t('Stock jo website ko dikhta hai') : t('Stock jo channel ko jata hai')}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{channel.tracksStock ? cell.stock ?? '—' : t('Track nahi')}</dd>
            <dd className="text-[0.75rem] text-slate-500">{t('Nafaa me {{nafaaStock}}{{value}}', { nafaaStock: cell.nafaaStock, value: channel.tracksStock && channel.stockBuffer ? t(' · {{stockBuffer}} rakh kar', { stockBuffer: channel.stockBuffer }) : '' })}</dd>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200/80">
            <dt className="text-slate-500">{push ? t('Channel ki Price') : t('Nafaa price')}</dt>
            <dd className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{rs(cell.price)}</dd>
            <dd className={cn('text-[0.75rem]', cell.priceDiffers ? 'font-semibold text-amber-700' : 'text-slate-500')}>
              {channel.mode === 'website' ? t('Website ko yahi jati hai') : cell.channelPrice === null ? t('Channel par abhi nahi dekhi') : cell.priceDiffers ? t('Channel par abhi {{channelPrice}}', { channelPrice: rs(cell.channelPrice) }) : t('Channel par bhi yahi')}
            </dd>
          </div>
        </dl>

        {channel.mode === 'indolj' && <p className="text-[0.75rem] font-medium text-amber-700">{t('Price Indolj panel se badlein.')}</p>}
        {push && <section className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
          <Switch checked={listed} disabled={!canManage} onChange={(e) => setListed(e.target.checked)}
            label={t('Is channel par Listed')}
            description={listed ? t('Channel par dikhta aur bikta hai.') : channel.type === 'DARAZ' ? t('Daraz par Stock 0 bheja jayega (product chhup jata hai).') : t('Channel par draft ho jayega — customer ko nahi dikhega.')} />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-slate-700">{t('Apna Stock')}</span>
              <Input inputMode="numeric" value={alloc} onChange={(e) => setAlloc(e.target.value.replace(/\D/g, ''))} placeholder={t('Channel rule')} aria-label={t('Apna Stock')} disabled={!canManage} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-slate-700">{t('Apni Price')}</span>
              <Input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value.replace(/[^\d.]/g, ''))} placeholder={t('Rule wali')} aria-label={t('Apni Price')}
                disabled={!canManage} error={ownOk ? undefined : t('Price sahi nahi')} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-semibold text-slate-700">{t('Sale se pehle ki Price')}</span>
              <Input inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value.replace(/[^\d.]/g, ''))} placeholder={t('Koi nahi')} aria-label={t('Sale se pehle ki Price')}
                disabled={!canManage || channel.type === 'DARAZ'} error={saleOk ? undefined : t('Price sahi nahi')} />
            </label>
          </div>
          <p className="text-[0.75rem] text-slate-500">
            {t('Khali Stock = channel ka rule. Khali Price = rule: {{priceRule}}.', { priceRule: ruleText(channel.priceRule) })}
            {channel.type === 'DARAZ' ? ` ${t('Daraz par Sale price Coming soon.')}` : ''}
          </p>
          {!channel.pushPrice && <p className="text-[0.75rem] font-medium text-amber-700">{t('Price is channel par haath se badlein — Price bhejna band hai.')}</p>}
          {canManage && <Button variant="secondary" loading={save.isPending} disabled={!dirty || !ownOk || !saleOk} onClick={() => save.mutate(patch)}>{t('Save karein')}</Button>}
        </section>}

        {canManage && (
          <div className="flex flex-wrap gap-2">
            {push && <Button variant="primary" loading={sync.isPending} onClick={() => sync.mutate()} leftIcon={<RefreshCw className="h-4 w-4" />}>{failed ? t('Dobara bhejein') : t('Abhi bhejein')}</Button>}
            {channel.canFetch && <Button variant="secondary" onClick={onRelink} leftIcon={<Link2 className="h-4 w-4" />}>{t('Doosre se jorein')}</Button>}
            <Button variant="ghost" className="text-rose-700" loading={unlink.isPending} leftIcon={<Link2Off className="h-4 w-4" />}
              onClick={async () => { if (await confirmDialog({ title: t('Link hatayein?'), text: push ? t('Is product ka Stock aur Price is channel par jana band ho jayega. Channel par product waise hi rahega.') : t('Is channel ke orders me ye product khud nahi milega — agle order par dobara jorna hoga.'), danger: true })) unlink.mutate(); }}>
              {t('Link hatayein')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
