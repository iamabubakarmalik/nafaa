'use client';

/** Order tracking by order number + the phone used (last 4 digits are enough). */
import { Check, Loader2, Truck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { TrackResult } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { sf } from '@/lib/client/sf';
import { useStore } from '../providers/StoreProvider';

export function TrackClient() {
  const { t, money, shop } = useStore();
  const sp = useSearchParams();
  const [no, setNo] = useState(sp.get('no') ?? '');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<TrackResult | null | undefined>(undefined);
  return (
    <section className="page flex justify-center py-12 md:py-20">
      <div className="w-full max-w-lg">
        <h1 className="h-display text-center text-3xl font-semibold">{t('account.trackTitle')}</h1>
        <p className="mt-2 text-center text-muted">{t('account.trackText')}</p>
        <form
          className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await sf<{ result: TrackResult | null }>('track', { no, phone }).catch(() => ({ result: null }));
            setRes(r.result);
            setBusy(false);
          }}
        >
          <input className="field" placeholder={t('account.orderNo')} value={no} onChange={(e) => setNo(e.target.value)} required />
          <input className="field" dir="ltr" inputMode="tel" placeholder={t('checkout.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} required />
          <button className="btn btn-primary" disabled={busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : t('account.trackBtn')}
          </button>
        </form>
        {res === null && <p className="mt-6 rounded-card bg-sale/10 px-4 py-3 text-center text-sale">{t('order.notFound')}</p>}
        {res && (
          <div className="mt-8 rounded-card border border-line p-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{res.label}</p>
              <p className="font-semibold">{money(res.total)}</p>
            </div>
            <ol className="mt-6 space-y-5">
              {res.steps.map((s, i) => (
                <li key={s.key} className="relative flex gap-4">
                  {i < res.steps.length - 1 && <span className={`absolute start-[13px] top-7 h-[calc(100%-4px)] w-0.5 ${s.at ? 'bg-ok' : 'bg-line'}`} />}
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${s.at ? 'bg-ok text-white' : 'border-2 border-line bg-bg'}`}>{s.at && <Check size={14} strokeWidth={3} />}</span>
                  <span>
                    <span className={`block text-[15px] ${s.at ? 'font-semibold' : 'text-muted'}`}>{s.label}</span>
                    {s.at && <span className="text-[12.5px] text-muted">{formatDate(s.at, shop.lang)}</span>}
                  </span>
                </li>
              ))}
            </ol>
            {res.courier && (
              <p className="mt-6 flex items-center gap-2 rounded-card bg-surface px-4 py-3 text-[14px]">
                <Truck size={16} /> {res.courier.name} · <span dir="ltr">{res.courier.trackingNumber}</span>
                {res.courier.site && (
                  <a href={res.courier.site} target="_blank" rel="noopener noreferrer" className="ms-auto underline">
                    {t('order.track')}
                  </a>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
