/**
 * Channel price rule and stock buffer: percent or fixed rupees up or down on
 * the Nafaa price, rounding, whether Nafaa sends the price at all, and how
 * many units to keep back from the channel. Shows a live example.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Info } from 'lucide-react';
import { Button, Input, Modal, Segmented, Switch } from '@/design-system/components';
import { apiErrorMessage } from '../../api/online-orders.api';
import { applyRule, onlineProductsApi, type OnlineChannel, type PriceRounding, type PriceRuleMode } from '../../api/online-products.api';
import { ChannelMark, channelName, kindOf, refreshOnlineProducts, rs } from './meta';

export function ChannelSettingsModal({ channel, onClose }: { channel: OnlineChannel; onClose: () => void }) {
  const qc = useQueryClient();
  const r = channel.priceRule;
  const [pushPrice, setPushPrice] = useState(channel.pushPrice);
  const [mode, setMode] = useState<PriceRuleMode>(r.mode);
  const [dir, setDir] = useState<'up' | 'down'>(r.value < 0 ? 'down' : 'up');
  const [amount, setAmount] = useState(r.value ? String(Math.abs(r.value)) : '');
  const [rounding, setRounding] = useState<PriceRounding>(r.rounding);
  const [buffer, setBuffer] = useState(channel.stockBuffer ? String(channel.stockBuffer) : '');

  const value = mode === 'NONE' ? 0 : (Number(amount) || 0) * (dir === 'down' ? -1 : 1);
  const rule = { mode, value, rounding };
  const tooLow = mode === 'PERCENT' && dir === 'down' && (Number(amount) || 0) >= 90;

  const save = useMutation({
    mutationFn: () => onlineProductsApi.settings(channel.id, { pushPrice, priceRule: rule, stockBuffer: Math.max(0, Math.floor(Number(buffer) || 0)) }),
    onSuccess: () => {
      refreshOnlineProducts(qc);
      toast.success(pushPrice ? 'Save ho gaya — nayi Price aur Stock channel par ja rahe hain' : 'Save ho gaya');
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const examples = [500, 1250, 3999];
  const name = channelName(channel);

  return (
    <Modal open onClose={onClose} size="lg"
      title={<span className="flex items-center gap-2"><ChannelMark type={channel.type} size="sm" />{name} — Price aur Stock</span>}
      description={`${kindOf(channel.type).label}${channel.shopName ? ` · Stock ${channel.shopName} branch se` : ''}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} disabled={tooLow} onClick={() => save.mutate()}>Save karein</Button>
      </>}>
      <div className="space-y-5">
        <section className="space-y-3">
          <Switch checked={pushPrice} onChange={(e) => setPushPrice(e.target.checked)}
            label="Price Nafaa se channel par bhejein"
            description={pushPrice ? 'Nafaa me Price badlein to yahan wali Price channel par khud lag jayegi.' : 'Band hai — Price channel par haath se badlein. Neeche wali Price sirf dikhane ke liye hai.'} />

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Channel ki Price</p>
            <Segmented<PriceRuleMode> label="Price ka tareeqa" value={mode} onChange={setMode} className="w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[{ value: 'NONE', label: 'Nafaa wali' }, { value: 'PERCENT', label: '% se' }, { value: 'FIXED', label: 'Rs se' }]} />
          </div>

          {mode !== 'NONE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Segmented<'up' | 'down'> label="Zyada ya kam" value={dir} onChange={setDir} className="w-full [&>button]:flex-1 [&>button]:justify-center"
                items={[{ value: 'up', label: 'Zyada' }, { value: 'down', label: 'Kam' }]} />
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                placeholder={mode === 'PERCENT' ? 'Maslan 10' : 'Maslan 100'} aria-label={mode === 'PERCENT' ? 'Kitne percent' : 'Kitne rupay'}
                rightIcon={<span className="text-[0.75rem] font-semibold text-slate-500">{mode === 'PERCENT' ? '%' : 'Rs'}</span>}
                error={tooLow ? '90% se zyada kam nahi kar sakte' : undefined} />
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-800">Gol karein</p>
            <Segmented<PriceRounding> label="Gol karna" value={rounding} onChange={setRounding} className="w-full [&>button]:flex-1 [&>button]:justify-center"
              items={[{ value: 'NONE', label: 'Jaisi hai' }, { value: 'NEAREST_10', label: '10 ke qareeb' }, { value: 'END_9', label: '9 par khatam' }]} />
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/80">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Misaal</p>
            <ul className="mt-1.5 grid gap-1 sm:grid-cols-3">
              {examples.map((b) => (
                <li key={b} className="text-[0.8125rem] text-slate-700">
                  Nafaa {rs(b)} → <b className="tabular-nums text-slate-900">{rs(applyRule(b, rule))}</b>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[0.75rem] text-slate-500">Kisi ek product ki apni Price grid me us ke khane se lag sakti hai — wo is rule se upar hai.</p>
          </div>
        </section>

        <section className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Stock buffer</p>
          <div className="flex flex-wrap items-center gap-3">
            <Input inputMode="numeric" value={buffer} onChange={(e) => setBuffer(e.target.value.replace(/\D/g, ''))} placeholder="0" aria-label="Kitne rakh lein"
              wrapperClassName="w-28" rightIcon={<span className="text-[0.75rem] text-slate-500">pcs</span>} />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-slate-600">
              {Number(buffer) > 0 ? <>Channel ko Stock se <b>{Number(buffer)}</b> kam dikhega — dukaan ke liye bach jayenge.</> : 'Poora Stock channel ko dikhega.'}
            </p>
          </div>
        </section>

        <p className="flex gap-2 rounded-2xl bg-sky-50 p-3 text-[0.78125rem] text-sky-900 ring-1 ring-sky-100">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Online order ke bill me Price: <b>{channel.priceSource === 'NAFAA' ? 'Nafaa wali' : 'jo customer ne channel par di'}</b> (channel ki settings se).
            {channel.type === 'DARAZ' && ' Daraz par Sale price chal rahi ho to customer ko wohi dikhti hai.'}
          </span>
        </p>
      </div>
    </Modal>
  );
}
