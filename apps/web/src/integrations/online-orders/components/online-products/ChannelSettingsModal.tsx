/**
 * Channel sync settings, price rule and stock buffer: where price, content,
 * new products and hand-edited stock come from (the shared sync card), percent
 * or fixed rupees up or down on the Nafaa price, rounding, and how many units
 * to keep back from the channel. Shows a live example. The price safety
 * guard (on by default) holds a push that moves the channel price too far.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button, Input, Modal, Segmented, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '../../api/online-orders.api';
import { applyRule, onlineProductsApi, type OnlineChannel, type PriceRounding, type PriceRuleMode, type PushContent, type StockMode } from '../../api/online-products.api';
import { ChannelMark, channelName, kindOf, refreshOnlineProducts, rs } from './meta';
import { SyncSettingsFields, useSyncForm } from './SyncSettingsCard';
import { t, Trans } from '@core/i18n';

export function ChannelSettingsModal({ channel, onClose, section }: { channel: OnlineChannel; onClose: () => void; section?: 'content' }) {
  const qc = useQueryClient();
  const r = channel.priceRule;
  const sync = useSyncForm(channel);
  // The channel as last saved here (the preset returns a fresh copy).
  const [current, setCurrent] = useState(channel);
  const [mode, setMode] = useState<PriceRuleMode>(r.mode);
  const [dir, setDir] = useState<'up' | 'down'>(r.value < 0 ? 'down' : 'up');
  const [amount, setAmount] = useState(r.value ? String(Math.abs(r.value)) : '');
  const [rounding, setRounding] = useState<PriceRounding>(r.rounding);
  const [buffer, setBuffer] = useState(channel.stockBuffer ? String(channel.stockBuffer) : '');
  const [stockMode, setStockMode] = useState<StockMode>(channel.stockMode ?? 'ALL');
  const [stockPercent, setStockPercent] = useState(String(channel.stockPercent ?? 100));
  const [stockFixed, setStockFixed] = useState(channel.stockFixed ? String(channel.stockFixed) : '');
  const [content, setContent] = useState<PushContent>(channel.pushContent);
  const g = channel.priceGuard ?? { on: true, dropPct: 40, risePct: 150, firstPct: 40 };
  const [guardOn, setGuardOn] = useState(g.on);
  const [guardDrop, setGuardDrop] = useState(String(g.dropPct));
  const [guardRise, setGuardRise] = useState(String(g.risePct));

  const value = mode === 'NONE' ? 0 : (Number(amount) || 0) * (dir === 'down' ? -1 : 1);
  const rule = { mode, value, rounding };
  const tooLow = mode === 'PERCENT' && dir === 'down' && (Number(amount) || 0) >= 90;

  const save = useMutation({
    // A custom website only takes the stock buffer; its price is the Nafaa price from the website API.
    mutationFn: () => onlineProductsApi.settings(channel.id, {
      ...(channel.canPush ? {
        ...(sync.body ?? {}), priceRule: rule, stockMode,
        stockPercent: Math.min(100, Math.max(1, Math.floor(Number(stockPercent) || 100))),
        stockFixed: Math.max(0, Math.floor(Number(stockFixed) || 0)),
        ...(channel.canContent ? { pushContent: content } : {}),
        priceGuard: { on: guardOn, dropPct: Number(guardDrop) || g.dropPct, risePct: Number(guardRise) || g.risePct },
      } : {}),
      stockBuffer: Math.max(0, Math.floor(Number(buffer) || 0)),
    }),
    onSuccess: () => {
      refreshOnlineProducts(qc);
      const sends = sync.form.priceFrom === 'NAFAA' || sync.form.priceFrom === 'LATEST';
      toast.success(channel.canPush && sends ? t('Save ho gaya — nayi Price aur Stock channel par ja rahe hain') : t('Save ho gaya'));
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const examples = [500, 1250, 3999];
  const name = channelName(channel);

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="flex items-center gap-2"><ChannelMark channel={channel} size="sm" />{name} — {channel.canPush ? t('Price aur Stock') : t('Stock buffer')}</span>}
      description={`${kindOf(channel).label}${channel.shopName ? ` · Stock ${channel.shopName} branch se` : ''}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button loading={save.isPending} disabled={tooLow} onClick={() => save.mutate()}>{t('Save karein')}</Button>
      </>}>
      <div className="space-y-5">
        {channel.canPush && (
          <section className="space-y-2">
            <p className="text-[0.875rem] font-semibold text-slate-900">{t('Sync settings')}</p>
            {!sync.chosen && <p className="rounded-xl bg-sky-50 px-3 py-2 text-[0.78125rem] text-sky-900 ring-1 ring-sky-100">{t('Ye settings abhi chuni nahi gayin. Dekh kar Save karein, ya "Sab kuch khud sync" chalu karein.')}</p>}
            <SyncSettingsFields channel={current} sync={sync} canManage rule={rule} onPreset={(c) => { setCurrent(c); setContent(c.pushContent); }} />
          </section>
        )}

        {channel.canPush && <section className="space-y-3 border-t border-slate-100 pt-4">
          {!(sync.form.priceFrom === 'NAFAA' || sync.form.priceFrom === 'LATEST') && (
            <p className="text-[0.75rem] text-slate-500">{t('Nafaa abhi is channel par Price nahi bhejta — neeche wala rule tab lagega jab qeemat Nafaa se bhi badle.')}</p>
          )}

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">{t('Channel ki Price')}</p>
            <Segmented<PriceRuleMode> label={t('Price ka tareeqa')} value={mode} onChange={setMode} className="w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[{ value: 'NONE', label: t('Nafaa wali') }, { value: 'PERCENT', label: t('% se') }, { value: 'FIXED', label: t('Rs se') }]} />
          </div>

          {mode !== 'NONE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented<'up' | 'down'> label={t('Zyada ya kam')} value={dir} onChange={setDir} className="w-full [&>button]:flex-1 [&>button]:justify-center"
                items={[{ value: 'up', label: t('Zyada') }, { value: 'down', label: t('Kam') }]} />
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={mode === 'PERCENT' ? t('Maslan 10') : t('Maslan 100')} aria-label={mode === 'PERCENT' ? t('Kitne percent') : t('Kitne rupay')}
                rightIcon={<span className="text-[0.75rem] font-semibold text-slate-500">{mode === 'PERCENT' ? '%' : 'Rs'}</span>}
                error={tooLow ? t('90% se zyada kam nahi kar sakte') : undefined} />
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">{t('Gol karein')}</p>
            <Segmented<PriceRounding> label={t('Gol karna')} value={rounding} onChange={setRounding} className="w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[{ value: 'NONE', label: t('Jaisi hai') }, { value: 'NEAREST_10', label: t('10 ke qareeb') }, { value: 'END_9', label: t('9 par khatam') }]} />
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Misaal')}</p>
            <ul className="mt-1.5 grid gap-1 sm:grid-cols-3">
              {examples.map((b) => (
                <li key={b} className="text-[0.8125rem] text-slate-700">
                  {t('Nafaa {{rs}} →', { rs: rs(b) })}{' '} <b className="tabular-nums text-slate-900">{rs(applyRule(b, rule))}</b>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.75rem] text-slate-500">{t('Kisi ek product ki apni Price grid me us ke khane se lag sakti hai — wo is rule se upar hai.')}</p>
          </div>

          <div className="space-y-2">
            <Switch checked={guardOn} onChange={(e) => setGuardOn(e.target.checked)} label={t('Qeemat bahut badle to pehle poochein')} />
            {guardOn && (
              <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600">
                <span>{t('Rokein agar qeemat itni kam ho:')}</span>
                <Input inputMode="numeric" value={guardDrop} onChange={(e) => setGuardDrop(e.target.value.replace(/\D/g, ''))} aria-label={t('Kitne percent kam')}
                  wrapperClassName="w-24" rightIcon={<span className="text-[0.75rem] text-slate-500">%</span>} />
                <span>{t('ya itni zyada:')}</span>
                <Input inputMode="numeric" value={guardRise} onChange={(e) => setGuardRise(e.target.value.replace(/\D/g, ''))} aria-label={t('Kitne percent zyada')}
                  wrapperClassName="w-24" rightIcon={<span className="text-[0.75rem] text-slate-500">%</span>} />
              </div>
            )}
          </div>
        </section>}

        <section className={cn('space-y-2', channel.canPush && 'border-t border-slate-100 pt-4')}>
          <p className="text-[0.8125rem] font-semibold text-slate-800">{t('Stock buffer')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Input inputMode="numeric" value={buffer} onChange={(e) => setBuffer(e.target.value.replace(/\D/g, ''))} placeholder="0" aria-label={t('Kitne rakh lein')}
              wrapperClassName="w-28" rightIcon={<span className="text-[0.75rem] text-slate-500">{t('pcs')}</span>} />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">
              {Number(buffer) > 0 ? <Trans text="Channel ko Stock se {{count}} kam dikhega — dukaan ke liye bach jayenge." values={{ count: <b>{Number(buffer)}</b> }} /> : t('Poora Stock channel ko dikhega.')}
            </p>
          </div>
        </section>

        {channel.canPush && (
          <section className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-[0.8125rem] font-semibold text-slate-800">{t('Is channel ko kitna Stock')}</p>
            <Segmented<StockMode> label={t('Stock ka hissa')} value={stockMode} onChange={setStockMode} className="w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[{ value: 'ALL', label: t('Poora') }, { value: 'PERCENT', label: t('% hissa') }, { value: 'FIXED', label: t('Fixed') }]} />
            {stockMode === 'PERCENT' && (
              <Input inputMode="numeric" value={stockPercent} onChange={(e) => setStockPercent(e.target.value.replace(/\D/g, ''))} aria-label={t('Kitne percent')}
                wrapperClassName="w-32" rightIcon={<span className="text-[0.75rem] text-slate-500">%</span>} />
            )}
            {stockMode === 'FIXED' && (
              <Input inputMode="numeric" value={stockFixed} onChange={(e) => setStockFixed(e.target.value.replace(/\D/g, ''))} placeholder="0" aria-label={t('Har product kitne')}
                wrapperClassName="w-32" rightIcon={<span className="text-[0.75rem] text-slate-500">{t('pcs')}</span>} />
            )}
            <p className="text-[0.75rem] text-slate-500">
              {stockMode === 'ALL' ? t('Nafaa ka poora Stock (buffer ke baad) is channel par dikhega.')
                : stockMode === 'PERCENT' ? t('Maslan Nafaa me 100 hain aur 30% rakha to channel par 30 dikhenge.')
                  : t('Har product/size ke itne channel ko milenge. Kisi ek ka apna number grid me us ke khane se rakhein.')}
              {' '}{t('Kabhi Nafaa ke Stock se zyada nahi jata — fixed hisse zyada hon to sab barabar kam ho jate hain.')}
            </p>
          </section>
        )}

        {channel.canContent && (
          <section className="space-y-2 border-t border-slate-100 pt-4" ref={(el) => { if (el && section === 'content') window.setTimeout(() => el.scrollIntoView({ block: 'start' }), 50); }}>
            <p className="text-[0.8125rem] font-semibold text-slate-800">{t('"Abhi bhejein" par kya jaye')}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['title', t('Naam (title)')], ['description', t('Description')], ['images', t('Tasveerein')],
                ['compareAt', t('Sale price (kati hui Price)')], ['sku', t('SKU aur barcode')], ['weight', t('Weight')],
              ] as Array<[keyof PushContent, string]>).map(([k, label]) => (
                <Switch key={k} checked={content[k]} onChange={(e) => setContent((c) => ({ ...c, [k]: e.target.checked }))} label={label} />
              ))}
            </div>
            <p className="text-[0.75rem] text-slate-500">{t('Listed / band hamesha jata hai. Shopify par tasveerein sirf tab jati hain jab wahan koi tasveer na ho.')}</p>
          </section>
        )}
        {channel.contentNote && <p className="rounded-2xl bg-amber-50 p-3 text-[0.78125rem] text-amber-900 ring-1 ring-amber-100">{t('Daraz par title/tasveer/description bhejna Coming soon — Stock aur Price ja rahe hain')}</p>}

        <p className="flex gap-2 rounded-2xl bg-sky-50 p-3 text-[0.78125rem] text-sky-900 ring-1 ring-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {channel.mode === 'website' ? <>{t('Website ko Nafaa price jati hai (branch ki Price ho to wo). Stock buffer website ke agle pull par lagta hai.')}{' '} </> : null}
            <Trans text="Online order ke bill me Price: {{source}} (channel ki settings se)." values={{ source: <b>{channel.priceSource === 'NAFAA' ? t('Nafaa wali') : t('jo customer ne channel par di')}</b> }} />{channel.type === 'DARAZ' ? <> {t('Daraz par Sale price chal rahi ho to customer ko wohi dikhti hai.')}</> : null}
          </span>
        </p>
      </div>
    </Modal>
  );
}
