/**
 * Pakistan Post (/online-orders/post-office). Pakistan Post has no merchant
 * API, so this is a hand flow: mark accepted orders "Post office", print the
 * booking list (VPP amount for COD), book at the counter, then type or paste
 * the article numbers from the receipt. Orders get the article as their
 * tracking number (link to ep.gov.pk) and can move to DISPATCHED.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardPaste, ExternalLink, GraduationCap, Mailbox, PackageCheck, Printer, Send, Truck, Undo2 } from 'lucide-react';
import { Button, Checkbox, EmptyState, PageHero, PageShell, Skeleton, Textarea, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { apiErrorMessage } from '../api/online-orders.api';
import { dispatchApi, type PostOrder } from '../api/dispatch.api';
import { rs } from '../lib/labels';
import { postOfficeDoc } from '../lib/dispatchPrint';
import { useBoardRefresh } from '../components/orders/useMoveOrder';
import { t } from '@core/i18n';

const ARTICLE = /^[A-Z]{0,4}\d{6,}[A-Z]{0,2}$/;

/** "order# article" lines (any order) or bare articles, matched to the list in order. Same rules as the server. */
export function matchArticles(text: string, list: PostOrder[]): Record<string, string> {
  const out: Record<string, string> = {};
  const free = list.map((o) => o.id);
  const bare: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const tokens = line.split(/[\s,;\t|]+/).map((x) => x.replace(/^#+/, '').trim().toUpperCase()).filter(Boolean);
    const article = tokens.find((x) => ARTICLE.test(x) && /[A-Z]/.test(x)) ?? tokens.find((x) => ARTICLE.test(x) && x.length >= 10);
    if (!article) continue;
    const ref = tokens.find((x) => x !== article);
    const o = ref ? list.find((x) => x.number.toUpperCase() === ref) : undefined;
    if (o) { out[o.id] = article; free.splice(free.indexOf(o.id), 1); } else bare.push(article);
  }
  for (const id of free) { if (!bare.length) break; if (!out[id]) out[id] = bare.shift()!; }
  return out;
}

export default function PostOfficePage() {
  const guide = usePageGuide();
  const qc = useQueryClient();
  const refresh = useBoardRefresh();
  const { data, isLoading, error } = useQuery({ queryKey: ['post-office'], queryFn: dispatchApi.postOffice });
  const settings = useQuery({ queryKey: ['dispatch-settings'], queryFn: dispatchApi.settings, staleTime: 5 * 60_000 });
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [articles, setArticles] = useState<Record<string, string>>({});
  const [paste, setPaste] = useState('');
  const [dispatch, setDispatch] = useState(true);
  const reload = () => { qc.invalidateQueries({ queryKey: ['post-office'] }); refresh(); };

  const mark = useMutation({
    mutationFn: ({ ids, on }: { ids: string[]; on: boolean }) => dispatchApi.markPost(ids, on),
    onSuccess: (r, v) => { toast.success(v.on ? t('{{count}} orders Post office me', { count: r.updated }) : t('{{count}} orders Post office se hataye', { count: r.updated })); setPick(new Set()); reload(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const save = useMutation({
    mutationFn: () => dispatchApi.articles(Object.entries(articles).filter(([, a]) => a.trim()).map(([id, article]) => ({ id, article: article.trim() })), dispatch),
    onSuccess: (r) => {
      if (r.done) toast.success(t('{{count}} article numbers save', { count: r.done }));
      if (r.failed) toast.error(t('{{count}} nahi hue', { count: r.failed }), { description: r.results.filter((x) => !x.ok).slice(0, 3).map((x) => x.error).join('\n') });
      setArticles({}); setPaste(''); reload();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const shop = useMemo(() => {
    const s = settings.data;
    return { name: s?.returnName || s?.shop.name || '', phone: s?.returnPhone || s?.shop.phone || '', address: s?.returnAddress || s?.shop.address || '' };
  }, [settings.data]);
  const filled = Object.values(articles).filter((a) => a.trim()).length;

  return (
    <PageShell>
      <PageHero title={t('Post office')} chip={<><Mailbox />{t('Pakistan Post · VPP')}</>}
        meta={t('Pakistan Post ka API nahi — list print karein, counter par book karein, article number yahan likhein')}
        stats={data ? [{ label: t('Booking baqi'), value: String(data.toBook.length) }, { label: t('Bheje (raste me)'), value: String(data.sent.length) }] : undefined}
        actions={<>
          <Link to="/online-orders/dispatch" className={heroButton}><Truck className="h-4 w-4" /> {t('Dispatch')}</Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>} />

      {isLoading ? <Skeleton className="h-64 rounded-3xl" /> : error ? <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{apiErrorMessage(error)}</p> : data && (
        <>
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('1. Booking baqi ({{count}})', { count: data.toBook.length })}</h2>
                <p className="text-[0.75rem] text-slate-500">{t('List print karke post office le jayein. Receipt se article number neeche likhein ya paste karein.')}</p>
              </div>
              <PrintButton doc={() => postOfficeDoc(data.toBook, shop)} disabled={!data.toBook.length} label={t('Booking list')} />
              <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} disabled={!data.toBook.length}
                onClick={() => window.open(`/online-orders/labels?size=A4&ids=${data.toBook.map((o) => o.id).join(',')}`, '_blank')}>{t('Address labels')}</Button>
            </header>
            {!data.toBook.length ? (
              <EmptyState icon={<Mailbox className="h-6 w-6" />} title={t('Post office ke liye koi order nahi')} description={t('Neeche se accept hue orders chun kar "Post office se bhejein" karein.')} />
            ) : (
              <>
                <div className="grid gap-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-[1fr_auto] sm:px-5">
                  <Textarea rows={3} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={t('Paste karein: har line me "order# article" — jaise 1023 RGL12345678 — ya sirf article numbers list ki tarteeb me')} />
                  <Button variant="secondary" leftIcon={<ClipboardPaste className="h-4 w-4" />} disabled={!paste.trim()} onClick={() => {
                    const m = matchArticles(paste, data.toBook);
                    setArticles((a) => ({ ...a, ...m }));
                    toast.message(t('{{count}} article numbers bhar gaye — check karke save karein', { count: Object.keys(m).length }));
                  }}>{t('Bharein')}</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[0.8125rem]">
                    <thead><tr className="text-[0.6875rem] uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 text-start">{t('Order')}</th><th className="px-2 py-2 text-start">{t('Paane wala')}</th><th className="px-2 py-2 text-start">{t('Shehar')}</th>
                      <th className="px-2 py-2 text-end">VPP</th><th className="px-2 py-2 text-start">{t('Article no.')}</th><th className="px-4 py-2" />
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.toBook.map((o) => (
                        <tr key={o.id}>
                          <td className="px-4 py-2 font-semibold text-slate-900">#{o.number}<div className="max-w-[14rem] truncate text-[0.6875rem] font-normal text-slate-500">{o.items}</div></td>
                          <td className="px-2 py-2">{o.customerName}<div className="max-w-[16rem] truncate text-[0.6875rem] text-slate-500">{o.address}</div></td>
                          <td className="px-2 py-2">{o.city ?? ''}</td>
                          <td className="px-2 py-2 text-end tabular-nums">{o.cod ? rs(o.cod) : t('Paid')}</td>
                          <td className="px-2 py-2">
                            <input value={articles[o.id] ?? ''} onChange={(e) => setArticles((a) => ({ ...a, [o.id]: e.target.value.toUpperCase() }))} aria-label={t('Article no.')}
                              placeholder="RGL12345678" className="h-9 w-40 rounded-lg border border-slate-200 px-2 font-mono text-[0.8125rem] outline-none focus:border-brand-500" />
                          </td>
                          <td className="px-4 py-2 text-end">
                            <button type="button" title={t('Post office se hatayein')} onClick={() => mark.mutate({ ids: [o.id], on: false })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Undo2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <Checkbox checked={dispatch} onChange={(e) => setDispatch(e.target.checked)} label={t('Save ke saath DISPATCHED bhi kar dein')} />
                  <span className="flex-1" />
                  <Button disabled={!filled} loading={save.isPending} leftIcon={<Send className="h-4 w-4" />} onClick={() => save.mutate()}>{t('{{count}} article numbers save', { count: filled })}</Button>
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('2. Post office se bhejne ke liye chunein')}</h2>
                <p className="text-[0.75rem] text-slate-500">{t('Accept hue orders jin par abhi koi courier ya CN nahi')}</p>
              </div>
              <Button size="sm" disabled={!pick.size} loading={mark.isPending} leftIcon={<Mailbox className="h-4 w-4" />} onClick={() => mark.mutate({ ids: [...pick], on: true })}>
                {t('{{count}} Post office se bhejein', { count: pick.size })}
              </Button>
            </header>
            {!data.candidates.length ? <p className="px-4 py-8 text-center text-[0.8125rem] text-slate-500">{t('Koi order baqi nahi')}</p> : (
              <ul className="max-h-[24rem] divide-y divide-slate-100 overflow-y-auto">
                {data.candidates.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
                    <Checkbox checked={pick.has(o.id)} onChange={() => setPick((p) => { const n = new Set(p); if (n.has(o.id)) n.delete(o.id); else n.add(o.id); return n; })} aria-label={`#${o.number}`} />
                    <span className="font-semibold text-slate-900">#{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{o.customerName} · {o.city ?? '—'}</span>
                    <span className="tabular-nums">{o.cod ? rs(o.cod) : t('Paid')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.sent.length > 0 && (
            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
              <header className="border-b border-slate-100 px-4 py-3 text-[0.9375rem] font-semibold text-slate-900 sm:px-5">{t('3. Bheje gaye ({{count}})', { count: data.sent.length })}</header>
              <ul className="divide-y divide-slate-100">
                {data.sent.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-[0.8125rem] sm:px-5">
                    <span className="font-semibold text-slate-900">#{o.number}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{o.customerName} · {o.city ?? '—'} · {o.orderStatus}</span>
                    <span className="font-mono">{o.article}</span>
                    {o.trackUrl && <a href={o.trackUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"><ExternalLink className="h-3.5 w-3.5" />{t('Track')}</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {guide.isOpen && (
        <PageGuide title={t('Post office se parcel')} onClose={guide.close}
          flow={[
            { label: t('Chunein'), hint: t('Accept hue orders'), icon: PackageCheck, color: '#7c3aed' },
            { label: t('List print'), hint: t('VPP raqam ke saath'), icon: Printer, color: '#d97706' },
            { label: t('Counter par book'), hint: 'Pakistan Post', icon: Mailbox, color: '#b91c1c' },
            { label: t('Article no.'), hint: 'DISPATCHED', icon: Send, color: '#16a34a' },
          ]}
          steps={[
            { icon: Mailbox, color: '#b91c1c', title: t('VPP'), text: t('COD parcel VPP par jata hai: post office paane wale se raqam leta hai aur money order se dukaan ko bhejta hai.') },
            { icon: ClipboardPaste, color: '#0891b2', title: t('Article number'), text: t('Receipt ke number ek ek kar ke likhein, ya sab paste karein — "order# article" ya sirf articles list ki tarteeb me.') },
            { icon: ExternalLink, color: '#16a34a', title: t('Tracking'), text: t('Har parcel ka link ep.gov.pk par khulta hai — customer ko bhi bhej sakte hain.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
