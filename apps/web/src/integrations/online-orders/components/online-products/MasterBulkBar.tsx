/**
 * Actions for picked products (or every product matching the filter):
 * Listed on/off, Stock share, own Price, Sale price, push now and publish to
 * a channel. Each runs as a background job; progress shows in the jobs panel.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeDollarSign, Boxes, Eye, EyeOff, Send, Tag, Upload, X } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../../api/online-orders.api';
import { onlineProductsApi, type BulkAction, type OnlineChannel, type Selection } from '../../api/online-products.api';
import { JOBS_KEY } from './JobsPanel';
import { ChannelMark, channelName, refreshOnlineProducts } from './meta';

type Ask = { action: BulkAction; value?: unknown };

const NEEDS_VALUE: BulkAction[] = ['alloc', 'price', 'compareAt'];

export function MasterBulkBar({ count, selection, channels, onClear }: {
  count: number; selection: Selection; channels: OnlineChannel[]; onClear: () => void;
}) {
  const qc = useQueryClient();
  const push = channels.filter((c) => c.canPush);
  const [ask, setAsk] = useState<Ask | null>(null);

  if (!push.length) return null;
  const open = (action: BulkAction, value?: unknown) => setAsk({ action, value });

  return (
    <>
      <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-white shadow-xl">
        <span className="me-1 text-[0.8125rem] font-semibold">{t('{{count}} products chune', { count: count.toLocaleString('en-PK') })}</span>
        <BarButton icon={Eye} onClick={() => open('listed', true)}>{t('Listed')}</BarButton>
        <BarButton icon={EyeOff} onClick={() => open('listed', false)}>{t('Band')}</BarButton>
        <BarButton icon={Boxes} onClick={() => open('alloc')}>{t('Stock')}</BarButton>
        <BarButton icon={BadgeDollarSign} onClick={() => open('price')}>{t('Price')}</BarButton>
        <BarButton icon={Tag} onClick={() => open('compareAt')}>{t('Sale price')}</BarButton>
        <BarButton icon={Send} onClick={() => open('push')}>{t('Abhi bhejein')}</BarButton>
        {push.some((c) => c.canPublish) && <BarButton icon={Upload} onClick={() => open('publish')}>{t('Channel par banayein')}</BarButton>}
        <button type="button" onClick={onClear} aria-label={t('Chunna khatam')} className="ms-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      {ask && (
        <BulkDialog ask={ask} count={count} selection={selection} channels={ask.action === 'publish' ? push.filter((c) => c.canPublish) : push}
          onClose={() => setAsk(null)}
          onDone={() => { setAsk(null); onClear(); refreshOnlineProducts(qc); qc.invalidateQueries({ queryKey: JOBS_KEY }); }} />
      )}
    </>
  );
}

function BarButton({ icon: Icon, onClick, children }: { icon: typeof Eye; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-[0.78125rem] font-semibold hover:bg-white/20">
      <Icon className="h-3.5 w-3.5" />{children}
    </button>
  );
}

function BulkDialog({ ask, count, selection, channels, onClose, onDone }: {
  ask: Ask; count: number; selection: Selection; channels: OnlineChannel[]; onClose: () => void; onDone: () => void;
}) {
  const single = ask.action === 'publish';
  const [channelId, setChannelId] = useState<string>(single ? channels[0]?.id ?? '' : '');
  const [value, setValue] = useState('');
  const [listedOnPublish, setListedOnPublish] = useState(true);
  const needsValue = NEEDS_VALUE.includes(ask.action);

  const run = useMutation({
    mutationFn: () => onlineProductsApi.bulk({
      selection, action: ask.action, channelId: channelId || null,
      value: needsValue ? (value === '' ? null : Number(value)) : ask.action === 'publish' ? listedOnPublish : ask.value,
    }),
    onSuccess: (r) => {
      if (r.existing) toast.info(t('Aisa kaam pehle se chal raha hai — us ke khatam hone ka intezar karein'));
      else if (ask.action === 'publish' && r.skipped) toast.success(t('{{count}} products ban rahe hain — {{skipped}} pehle se jure the', { count: r.job.total, skipped: r.skipped }));
      else toast.success(r.updated ? t('{{updated}} links badle — channel par ja rahe hain', { updated: r.updated }) : t('Kaam shuru — progress oopar dekhein'));
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const title = {
    listed: ask.value ? t('Channel par Listed karein') : t('Channel par band (draft) karein'),
    alloc: t('Channel ko kitna Stock'),
    price: t('Channel par apni Price'),
    compareAt: t('Sale se pehle ki Price'),
    push: t('Abhi channel par bhejein'),
    publish: t('Channel par naye products banayein'),
  }[ask.action];
  const help = {
    listed: ask.value ? t('Products channel par dikhenge aur bikenge.') : t('Shopify/WooCommerce par draft; Daraz par Stock 0 jata hai.'),
    alloc: t('Har chune product/size ke itne channel ko milenge. Khali chhorein to channel ka rule lagega.'),
    price: t('Har chune product ki is channel par yehi Price. Khali chhorein to channel ka Price rule lagega.'),
    compareAt: t('Channel par kati hui Price dikhegi (Sale). Khali chhorein to Sale hat jayegi.'),
    push: t('Stock, Price, Listed aur channel settings me chune hue content (naam, tasveer …) dobara jayenge.'),
    publish: t('Jo products is channel par nahi, wo sizes ke saath ban jayenge aur khud jur jayenge. Pehle se jure skip.'),
  }[ask.action];
  const valueOk = !needsValue || value === '' || Number(value) >= 0;

  return (
    <Modal open onClose={onClose} size="md" title={title} description={t('{{count}} products', { count: count.toLocaleString('en-PK') })}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button loading={run.isPending} disabled={!valueOk || (single && !channelId)} onClick={() => run.mutate()}>{t('Shuru karein')}</Button>
      </>}>
      <div className="space-y-4">
        <p className="text-[0.8125rem] text-slate-600">{help}</p>
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">{t('Kis channel par')}</p>
          <div className="flex flex-wrap gap-2">
            {!single && <ChannelChip on={!channelId} onClick={() => setChannelId('')}>{t('Sab channels')}</ChannelChip>}
            {channels.map((c) => (
              <ChannelChip key={c.id} on={channelId === c.id} onClick={() => setChannelId(c.id)}>
                <ChannelMark channel={c} size="sm" />{channelName(c)}
              </ChannelChip>
            ))}
          </div>
        </div>
        {needsValue && (
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ''))} autoFocus
            placeholder={ask.action === 'alloc' ? t('Maslan 30 (khali = rule)') : t('Khali = hata dein')}
            aria-label={title} rightIcon={<span className="text-[0.75rem] text-slate-500">{ask.action === 'alloc' ? t('pcs') : 'Rs'}</span>} />
        )}
        {ask.action === 'publish' && (
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700">
            <input type="checkbox" checked={listedOnPublish} onChange={(e) => setListedOnPublish(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            {t('Bante hi Listed (warna draft)')}
          </label>
        )}
      </div>
    </Modal>
  );
}

function ChannelChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1 transition',
        on ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
      {children}
    </button>
  );
}
