/**
 * Add or edit one day's ads spend: date, platform, amount, and optionally the
 * campaign, the sales channel and products it promoted, and the orders the
 * ads manager reported. On the all-branches view the branch is picked here.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Store, X } from 'lucide-react';
import { Button, Kbd, Modal } from '@/design-system/components';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { useIsAllShops } from '@core/stores/auth.store';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { ADS_AFFECTED_KEYS, AD_PLATFORMS, adsApi, apiError, type AdEntry, type AdPlatform, type AdsSetup } from '../api/growth.api';
import { PLATFORM, rs } from './meta';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';

export function AdEntryForm({ entry, setup, onClose }: { entry: AdEntry | null; setup: AdsSetup | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const canSeeProducts = usePermission(PERMISSIONS.PRODUCTS_VIEW);
  const today = businessDayKey(new Date(), startHour);
  const amountRef = useRef<HTMLInputElement>(null);

  const [day, setDay] = useState(entry?.day ?? today);
  const [platform, setPlatform] = useState<AdPlatform>(entry?.platform ?? 'META');
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '');
  const [campaign, setCampaign] = useState(entry?.campaign ?? '');
  const [channelId, setChannelId] = useState(entry?.integrationId ?? '');
  const [products, setProducts] = useState<Array<{ id: string; name: string }>>(entry?.products ?? []);
  const [orders, setOrders] = useState(entry?.orders != null ? String(entry.orders) : '');
  const [shopId, setShopId] = useState('');
  const [q, setQ] = useState('');

  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops && !entry });
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  useEffect(() => { if (allShops && !shopId && shops.length) setShopId((shops.find((s) => s.isMain) ?? shops[0]).id); }, [allShops, shopId, shops]);
  useEffect(() => { const t = setTimeout(() => amountRef.current?.focus(), 80); return () => clearTimeout(t); }, []);
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const searchQ = useQuery({ queryKey: ['products', 'ads-picker', debounced], queryFn: () => productsApi.list({ search: debounced, limit: 6, isActive: true }), enabled: canSeeProducts && debounced.length >= 2 });

  const value = Number(amount);
  const problems: string[] = [];
  if (!(value > 0)) problems.push('Amount likhein');
  if (day > today) problems.push('Aane wale din ka kharcha nahi likh sakte');
  if (allShops && !entry && !shopId) problems.push('Branch chunein');

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const body = {
        day, platform, amount: value, campaign: campaign.trim() || null, integrationId: channelId || null,
        productIds: products.map((p) => p.id), orders: orders.trim() === '' ? null : Number(orders),
      };
      return entry ? adsApi.update(entry.id, body) : adsApi.create({ ...body, ...(allShops && shopId && { shopId }) });
    },
    onSuccess: (r) => {
      toast.success(entry ? 'Entry badal gayi' : `${rs(r.amount)} ka Ads kharcha likh liya${r.postExpense ? ' — Expenses me bhi chala gaya' : ''}`);
      ADS_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter' && !save.isPending) { ev.preventDefault(); save.mutate(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const posts = entry ? entry.postExpense : !!setup?.postExpenses;

  return (
    <Modal open onClose={onClose} size="lg" closeOnBackdrop={false}
      title={entry ? 'Ads ka kharcha badlein' : 'Ads ka kharcha likhein'}
      description={posts ? 'Ye kharcha "Ads / marketing" Expense me bhi jayega aur Profit se ek baar katega.' : 'Ye kharcha sirf ROAS ke liye hai — Expenses me nahi jayega.'}
      footer={<>
        <span className="mr-auto hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => save.mutate()} loading={save.isPending}>{entry ? 'Save karein' : 'Likh lein'}</Button>
      </>}>
      <div className="space-y-4">
        {allShops && !entry && shops.length > 1 && (
          <div>
            <p className={labelCls}><Store className="mr-1 inline h-3.5 w-3.5" />Branch</p>
            <div className="flex flex-wrap gap-1.5">
              {shops.map((s) => (
                <button key={s.id} type="button" onClick={() => setShopId(s.id)} aria-pressed={shopId === s.id}
                  className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', shopId === s.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className={labelCls}>Platform</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {AD_PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)} aria-pressed={platform === p}
                className={cn('flex h-11 items-center gap-2 rounded-xl px-2.5 text-left text-[0.8125rem] font-semibold ring-1 transition',
                  platform === p ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                <BrandLogo name={PLATFORM[p].brand} size={24} /><span className="truncate" title={PLATFORM[p].label}>{PLATFORM[p].short}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="ad-amount" className={labelCls}>Amount (Rs) <span className="text-rose-600">*</span></label>
            <input id="ad-amount" ref={amountRef} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
              className={cn(inputCls, 'h-11 text-right text-lg font-bold tabular-nums')} />
          </div>
          <div>
            <label htmlFor="ad-day" className={labelCls}>Date</label>
            <input id="ad-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className={cn(inputCls, 'h-11')} />
          </div>
          <div>
            <label htmlFor="ad-campaign" className={labelCls}>Campaign (agar ho)</label>
            <input id="ad-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} maxLength={120} placeholder="Maslan: Winter sale" className={inputCls} />
          </div>
          <div>
            <label htmlFor="ad-orders" className={labelCls}>Ads manager ke orders (agar pata ho)</label>
            <input id="ad-orders" inputMode="numeric" value={orders} onChange={(e) => setOrders(e.target.value.replace(/[^\d]/g, ''))} placeholder="—" className={cn(inputCls, 'tabular-nums')} />
          </div>
        </div>

        {(setup?.channels.length ?? 0) > 0 && (
          <div>
            <p className={labelCls}>Kis channel ke liye? (agar ek hi ho)</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setChannelId('')} aria-pressed={!channelId}
                className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1', !channelId ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>Sab</button>
              {setup!.channels.map((c) => (
                <button key={c.id} type="button" onClick={() => setChannelId(c.id)} aria-pressed={channelId === c.id}
                  className={cn('inline-flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.8125rem] font-semibold ring-1',
                    channelId === c.id ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200')}>
                  <BrandLogo name={brandForChannel(c.type, { platform: c.platform })} size={18} />{c.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {canSeeProducts && (
          <div>
            <label htmlFor="ad-products" className={labelCls}>Kin products ka ad tha? (agar khaas ho)</label>
            {products.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {products.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1 text-[0.75rem] font-medium text-slate-700">
                    {p.name}
                    <button type="button" onClick={() => setProducts((l) => l.filter((x) => x.id !== p.id))} aria-label={`${p.name} hatayein`} className="rounded-full p-0.5 hover:bg-slate-200"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="ad-products" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product dhoondein…" className={cn(inputCls, 'pl-9')} />
              {debounced.length >= 2 && (searchQ.data?.items.length ?? 0) > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
                  {searchQ.data!.items.filter((it) => !products.some((p) => p.id === it.id)).map((it) => (
                    <li key={it.id}>
                      <button type="button" onClick={() => { setProducts((l) => [...l, { id: it.id, name: it.name }]); setQ(''); }}
                        className="w-full truncate px-3 py-2 text-left text-sm hover:bg-slate-50">{it.name}</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-1 text-[0.6875rem] text-slate-500">Product ki report me ye kharcha unhi par lagega, un ki sale ke hisaab se.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
