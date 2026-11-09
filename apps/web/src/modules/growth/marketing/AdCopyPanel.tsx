/**
 * Nafaa AI ad copy: pick a product (or type a name), add the offer, and get
 * a headline, primary text and button in Roman Urdu, Urdu and English to
 * paste into the ads manager. Copy only; nothing is posted.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { t as tr } from '@core/i18n';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { apiError } from '../api/growth.api';
import { marketingApi, type AdCopy, type CopySet } from '../api/marketing.api';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';

export function AdCopyPanel({ canWrite }: { canWrite: boolean }) {
  const canSeeProducts = usePermission(PERMISSIONS.PRODUCTS_VIEW);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const searchQ = useQuery({ queryKey: ['products', 'ad-copy-picker', debounced], queryFn: () => productsApi.list({ search: debounced, limit: 6, isActive: true }), enabled: canSeeProducts && debounced.length >= 2 });
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [offer, setOffer] = useState('');
  const [audience, setAudience] = useState('');
  const [platform, setPlatform] = useState('Facebook / Instagram');
  const [out, setOut] = useState<AdCopy | null>(null);

  const write = useMutation({
    mutationFn: () => marketingApi.copy({
      ...(product ? { productId: product.id } : { name: q.trim() }),
      offer: offer.trim() || undefined, audience: audience.trim() || undefined, platform,
    }),
    onSuccess: (r) => setOut(r),
    onError: (e) => toast.error(apiError(e, tr('Nafaa AI abhi nahi likh saka'))),
  });
  const canAsk = canWrite && (!!product || q.trim().length >= 2);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <div className="space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-violet-600" /> {tr('Nafaa AI se ad likhwayein')}</p>
        <div>
          <label htmlFor="copy-product" className={labelCls}>{tr('Product')}</label>
          {product ? (
            <div className="flex h-10 items-center gap-2 rounded-xl bg-brand-50 px-3 text-sm font-medium text-brand-900 ring-1 ring-brand-200">
              <span className="min-w-0 flex-1 truncate">{product.name}</span>
              <button type="button" onClick={() => setProduct(null)} aria-label={tr('Hatayein')}><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input id="copy-product" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Product dhoondein ya naam likhein')} className={cn(inputCls, 'ps-9')} />
              {debounced.length >= 2 && (searchQ.data?.items.length ?? 0) > 0 && (
                <ul className="absolute inset-x-0 top-11 z-10 max-h-56 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
                  {searchQ.data!.items.map((it) => (
                    <li key={it.id}><button type="button" onClick={() => { setProduct({ id: it.id, name: it.name }); setQ(''); }} className="w-full truncate px-3 py-2 text-start text-sm hover:bg-slate-50">{it.name}</button></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="copy-offer" className={labelCls}>{tr('Offer (agar ho)')}</label>
          <input id="copy-offer" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={160} placeholder={tr('Maslan: 20% Discount, free delivery')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="copy-aud" className={labelCls}>{tr('Kis ke liye')}</label>
          <input id="copy-aud" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={120} placeholder={tr('Maslan: shaadi ke season me khawateen')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="copy-platform" className={labelCls}>{tr('Platform')}</label>
          <select id="copy-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputCls}>
            {['Facebook / Instagram', 'TikTok', 'Google', 'Snapchat'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <Button fullWidth leftIcon={<Sparkles className="h-4 w-4" />} loading={write.isPending} disabled={!canAsk} onClick={() => write.mutate()}>{out ? tr('Dobara likhein') : tr('Ad likhein')}</Button>
        <p className="text-[0.75rem] text-slate-500">{tr('Sirf likhai hai — post aap khud Ads Manager me karein. Qeemat aur offer check kar lein.')}</p>
      </div>

      <div className="space-y-3">
        {out ? (
          <>
            <CopyCard title={tr('Roman Urdu')} set={out.roman} />
            <CopyCard title={tr('Urdu')} set={out.urdu} rtl />
            <CopyCard title={tr('English')} set={out.en} />
          </>
        ) : (
          <div className="flex h-full min-h-[16rem] flex-col items-center justify-center rounded-3xl bg-white px-6 text-center ring-1 ring-slate-200/80">
            <Sparkles className="h-9 w-9 text-violet-300" />
            <p className="mt-3 font-semibold text-slate-900">{tr('Teen zabanon me ad copy')}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{tr('Headline, likhai aur button — product ki details se. Pasand na aaye to dobara likhwayein.')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CopyCard({ title, set, rtl }: { title: string; set: CopySet; rtl?: boolean }) {
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(tr('Copy ho gaya')); } catch { toast.error(tr('Copy nahi hua')); }
  };
  const all = `${set.headline}\n\n${set.primaryText}\n\n${set.cta}`;
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
        <Button size="sm" variant="secondary" leftIcon={<Copy className="h-3.5 w-3.5" />} onClick={() => copy(all)}>{tr('Sab copy')}</Button>
      </div>
      <div dir={rtl ? 'rtl' : undefined} className="mt-2 space-y-2">
        <button type="button" onClick={() => copy(set.headline)} className="block w-full text-start text-base font-bold text-slate-900 hover:text-brand-700">{set.headline}</button>
        <button type="button" onClick={() => copy(set.primaryText)} className="block w-full whitespace-pre-line text-start text-sm text-slate-700 hover:text-slate-900">{set.primaryText}</button>
      </div>
      <span className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-1 text-[0.75rem] font-semibold text-white">{set.cta}</span>
    </div>
  );
}
