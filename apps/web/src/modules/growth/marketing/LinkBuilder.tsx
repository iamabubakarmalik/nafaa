/**
 * UTM link builder: pick a product's page on a connected store (or paste any
 * link), choose where the link will be used, and copy the tagged link or its
 * QR code. Orders that come through it show under that source and campaign.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Download, Link2, QrCode, Search } from 'lucide-react';
import { Button } from '@/design-system/components';
import { BrandLogo, brandForChannel, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { qrSvg } from '@core/payments/qrSvg';
import { t as tr } from '@core/i18n';
import { MARKETING_KEY, marketingApi, utmLink } from '../api/marketing.api';

const inputCls = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const labelCls = 'mb-1.5 block text-[0.8125rem] font-medium text-slate-700';

const PRESETS: Array<{ key: string; label: string; brand: BrandName; source: string; medium: string }> = [
  { key: 'fb-ad', label: tr('Facebook ad'), brand: 'meta', source: 'facebook', medium: 'paid' },
  { key: 'ig-ad', label: tr('Instagram ad'), brand: 'meta', source: 'instagram', medium: 'paid' },
  { key: 'ig-bio', label: tr('Instagram bio / story'), brand: 'meta', source: 'instagram', medium: 'social' },
  { key: 'tiktok', label: tr('TikTok'), brand: 'tiktok', source: 'tiktok', medium: 'paid' },
  { key: 'google', label: tr('Google ad'), brand: 'google', source: 'google', medium: 'cpc' },
  { key: 'whatsapp', label: tr('WhatsApp'), brand: 'whatsapp', source: 'whatsapp', medium: 'chat' },
  { key: 'influencer', label: tr('Influencer'), brand: 'other', source: 'influencer', medium: 'social' },
];

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export function LinkBuilder() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const linksQ = useQuery({ queryKey: [MARKETING_KEY, 'links', debounced], queryFn: () => marketingApi.productLinks(debounced), staleTime: 60_000 });
  const [base, setBase] = useState('');
  const [preset, setPreset] = useState(PRESETS[0].key);
  const [source, setSource] = useState(PRESETS[0].source);
  const [medium, setMedium] = useState(PRESETS[0].medium);
  const [campaign, setCampaign] = useState('');
  const [content, setContent] = useState('');
  const [showQr, setShowQr] = useState(false);

  const pick = (key: string) => {
    const p = PRESETS.find((x) => x.key === key)!;
    setPreset(key); setSource(p.source); setMedium(p.medium);
  };
  const valid = /^https?:\/\/\S+\.\S+/i.test(base.trim());
  const link = valid && source.trim() ? utmLink(base, { source: slug(source) || source, medium: medium.trim(), campaign: campaign.trim() ? slug(campaign) : undefined, content: content.trim() ? slug(content) : undefined }) : '';
  const svg = useMemo(() => (link && showQr ? qrSvg(link, 220) : ''), [link, showQr]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); toast.success(tr('Link copy ho gaya')); } catch { toast.error(tr('Copy nahi hua')); }
  };
  const downloadQr = () => {
    const blob = new Blob([qrSvg(link, 600)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${slug(campaign || source) || 'link'}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const data = linksQ.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <p className="font-semibold text-slate-900">{tr('1. Product ya page chunein')}</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Product dhoondein')} className={cn(inputCls, 'ps-9')} aria-label={tr('Product dhoondein')} />
        </div>
        <ul className="mt-2 max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {data?.stores.filter((s) => s.url).map((s) => (
            <li key={`s-${s.id}`}>
              <button type="button" onClick={() => setBase(s.url!)} className={cn('flex w-full items-center gap-2 px-1 py-2 text-start hover:bg-slate-50', base === s.url && 'bg-brand-50')}>
                <BrandLogo name={brandForChannel(s.type)} size={28} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[0.8125rem] font-medium text-slate-900">{tr('{{name}} — home page', { name: s.name })}</span><span className="block truncate text-[0.6875rem] text-slate-500">{s.url}</span></span>
              </button>
            </li>
          ))}
          {data?.items.flatMap((p) => p.links.map((l) => (
            <li key={`${p.id}-${l.integrationId}`}>
              <button type="button" onClick={() => { setBase(l.url); if (!content) setContent(p.name); }} className={cn('flex w-full items-center gap-2 px-1 py-2 text-start hover:bg-slate-50', base === l.url && 'bg-brand-50')}>
                {p.image ? <img src={p.image} alt="" className="h-7 w-7 rounded-md object-cover" /> : <BrandLogo name={brandForChannel(l.type)} size={28} />}
                <span className="min-w-0 flex-1"><span className="block truncate text-[0.8125rem] font-medium text-slate-900">{p.name}</span><span className="block truncate text-[0.6875rem] text-slate-500">{l.channel}</span></span>
              </button>
            </li>
          )))}
        </ul>
        {data && !data.items.length && !data.stores.some((s) => s.url) && (
          <p className="mt-2 text-[0.8125rem] text-slate-500">{tr('Kisi product ka store link nahi mila. Neeche koi bhi link paste karein.')}</p>
        )}
        <label htmlFor="utm-base" className={cn(labelCls, 'mt-3')}>{tr('Ya link paste karein')}</label>
        <input id="utm-base" value={base} onChange={(e) => setBase(e.target.value)} placeholder="https://" className={inputCls} />
      </div>

      <div className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div>
          <p className="font-semibold text-slate-900">{tr('2. Link kahan lagega?')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRESETS.map((p) => (
              <button key={p.key} type="button" onClick={() => pick(p.key)} aria-pressed={preset === p.key}
                className={cn('flex h-10 items-center gap-2 rounded-xl px-2.5 text-[0.75rem] font-semibold ring-1',
                  preset === p.key ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-500' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                <BrandLogo name={p.brand} size={18} /><span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="utm-campaign" className={labelCls}>{tr('Campaign')}</label>
            <input id="utm-campaign" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder={tr('Maslan: eid-sale')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="utm-content" className={labelCls}>{tr('Ad / post ka naam')}</label>
            <input id="utm-content" value={content} onChange={(e) => setContent(e.target.value)} placeholder={tr('Maslan: video-1')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="utm-source" className={labelCls}>utm_source</label>
            <input id="utm-source" value={source} onChange={(e) => setSource(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="utm-medium" className={labelCls}>utm_medium</label>
            <input id="utm-medium" value={medium} onChange={(e) => setMedium(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{tr('3. Link copy karein')}</p>
          {link ? (
            <>
              <p className="mt-2 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-[0.75rem] text-slate-800 ring-1 ring-slate-200">{link}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" leftIcon={<Copy className="h-4 w-4" />} onClick={copy}>{tr('Copy')}</Button>
                <Button size="sm" variant="secondary" leftIcon={<QrCode className="h-4 w-4" />} onClick={() => setShowQr((v) => !v)}>{showQr ? tr('QR chhupayein') : tr('QR code')}</Button>
                {showQr && <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={downloadQr}>{tr('QR download')}</Button>}
              </div>
              {svg && <div className="mt-3 inline-block rounded-xl bg-white p-2 ring-1 ring-slate-200" dangerouslySetInnerHTML={{ __html: svg }} />}
              <p className="mt-2 text-[0.75rem] text-slate-500">{tr('Campaign ka naam wahi rakhein jo Ads Manager me hai — orders khud us campaign me gine jayenge.')}</p>
            </>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-[0.8125rem] text-slate-500"><Link2 className="h-4 w-4" /> {tr('Pehle product chunein ya https:// wala link daalein.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
