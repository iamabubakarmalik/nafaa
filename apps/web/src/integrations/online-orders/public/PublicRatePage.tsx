/**
 * The customer's rating page (/rate/<token>, no login): 1–5 stars and a
 * comment for a delivered order. After a good rating the shop's own public
 * review pages (Google, Facebook …) are offered.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, Star } from 'lucide-react';
import { Button, Card, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { publicFetch } from './publicApi';
import { Shell } from './PublicOrderPage';

interface RateInfo {
  shop: string; orderNo: string | null; firstName: string | null; rating: number | null; comment: string | null;
  rated: boolean; canEdit: boolean; links: Array<{ label: string; url: string }>; linksFrom: number;
}

const WORDS = ['', t('Bilkul pasand nahi aaya'), t('Achha nahi tha'), t('Theek tha'), t('Achha tha'), t('Bahut zabardast!')];

export default function PublicRatePage() {
  const { token = '' } = useParams();
  const [info, setInfo] = useState<RateInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    publicFetch<RateInfo>(`/integrations/reviews/v1/${encodeURIComponent(token)}`)
      .then((r) => { setInfo(r); setRating(r.rating ?? 0); setComment(r.comment ?? ''); document.title = t('{{shop}} — Rating', { shop: r.shop }); })
      .catch((e: Error) => setErr(e.message));
  }, [token]);

  const submit = async () => {
    if (!rating) { setErr(t('Star chunein')); return; }
    setBusy(true); setErr(null);
    try {
      setInfo(await publicFetch<RateInfo>(`/integrations/reviews/v1/${encodeURIComponent(token)}`, { method: 'POST', json: { rating, comment } }));
      setEditing(false);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;
  const form = info && (!info.rated || editing);
  return (
    <Shell embed={false} onClose={() => null} title={info?.shop ?? t('Rating')}>
      <div className="space-y-4 p-4 pb-16">
        {!info && !err && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}
        {!info && err && <Card className="rounded-2xl"><p className="text-center font-semibold text-slate-700">{err}</p></Card>}
        {info && form && (
          <Card className="rounded-2xl">
            <h1 className="text-lg font-bold text-slate-900">{info.firstName ? t('{{name}}, aap ka order kaisa laga?', { name: info.firstName }) : t('Aap ka order kaisa laga?')}</h1>
            {info.orderNo && <p className="text-sm text-slate-500">{t('Order #{{no}} · {{shop}}', { no: info.orderNo, shop: info.shop })}</p>}
            <div className="mt-5 flex justify-center gap-2" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" aria-label={t('{{value}} star', { value: s })} onMouseEnter={() => setHover(s)} onClick={() => setRating(s)}
                  className="rounded-xl p-1 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">
                  <Star className={cn('h-10 w-10', s <= shown ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
                </button>
              ))}
            </div>
            <p className="mt-2 h-5 text-center text-sm font-semibold text-slate-700">{WORDS[shown] ?? ''}</p>
            <Textarea wrapperClassName="mt-4" label={t('Kuch kehna chahein? (marzi)')} value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000}
              placeholder={rating && rating <= 3 ? t('Kya masla hua? Hum theek karenge.') : t('Kya achha laga?')} />
            {err && <p className="mt-2 text-sm font-semibold text-rose-600">{err}</p>}
            <Button size="lg" className="mt-4 w-full" onClick={submit} disabled={busy || !rating} leftIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}>{t('Bhejein')}</Button>
          </Card>
        )}
        {info && !form && (
          <Card className="rounded-2xl text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success-600" />
            <h1 className="mt-2 text-lg font-bold text-slate-900">{t('Shukriya!')}</h1>
            <div className="mt-2 flex justify-center gap-1">{[1, 2, 3, 4, 5].map((s) => <Star key={s} className={cn('h-6 w-6', s <= (info.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}</div>
            <p className="mt-2 text-sm text-slate-600">{(info.rating ?? 0) <= 3 ? t('{{shop}} aap se jald rabta karega.', { shop: info.shop }) : t('Aap ki rai {{shop}} tak pohanch gayi.', { shop: info.shop })}</p>
            {info.links.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-sm font-semibold text-slate-800">{t('Doosron ko bhi batayein — 1 minute lagega:')}</p>
                {info.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                    {t('{{label}} par review dein', { label: l.label })} <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
            {info.canEdit && <button type="button" onClick={() => setEditing(true)} className="mt-4 text-xs font-semibold text-slate-500 hover:underline">{t('Rating badlein')}</button>}
          </Card>
        )}
        <p className="text-center text-[0.6875rem] text-slate-400">{t('Nafaa ke zariye')}</p>
      </div>
    </Shell>
  );
}
