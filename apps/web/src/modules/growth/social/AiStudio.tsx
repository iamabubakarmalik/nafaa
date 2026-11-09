/**
 * Nafaa AI tab: captions, hashtags, reel/TikTok scripts and 7/30-day
 * content plans from the shop's products, an offer and the festival
 * calendar. Results go straight into the calendar.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarPlus, Clapperboard, Copy, Hash, ListChecks, MessageSquareText, Sparkles } from 'lucide-react';
import { Button, Checkbox, Input, Segmented, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { NafaaAiMark } from '@modules/ai-assistant/components/NafaaAiMark';
import { SOCIAL_PLATFORMS, socialApi, type AiKind, type AiResult, type ContentLang, type Festival, type SocialPlatform, type SocialProduct } from './social.api';
import { KIND_LABEL, PLATFORM_META, PlatformMark, fullCaption } from './platforms';
import { ProductPicker } from './ProductPicker';
import type { EditorSeed } from './PostEditor';

const KINDS: Array<{ key: AiKind; label: string; icon: typeof Hash }> = [
  { key: 'caption', label: t('Caption'), icon: MessageSquareText },
  { key: 'hashtags', label: t('Hashtags'), icon: Hash },
  { key: 'script', label: t('Reel script'), icon: Clapperboard },
  { key: 'plan', label: t('Content plan'), icon: ListChecks },
];

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); toast.success(t('Copy ho gaya')); } catch { toast.error(t('Copy nahi hua')); }
};

export function AiStudio({ festivals, today, onDraft }: { festivals: Festival[]; today: string; onDraft: (seed: EditorSeed) => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AiKind>('caption');
  const [products, setProducts] = useState<SocialProduct[]>([]);
  const [platform, setPlatform] = useState<SocialPlatform>('INSTAGRAM');
  const [lang, setLang] = useState<ContentLang>('roman');
  const [offer, setOffer] = useState('');
  const [festivalKey, setFestivalKey] = useState('');
  const [note, setNote] = useState('');
  const [days, setDays] = useState<7 | 30>(7);
  const [result, setResult] = useState<AiResult | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const run = useMutation({
    mutationFn: () => socialApi.ai({ kind, productIds: products.map((p) => p.id), platform, lang, offer: offer || undefined, festivalKey: festivalKey || undefined, note: note || undefined, days, from: today }),
    onSuccess: (r) => { setResult(r); setPicked(new Set(r.plan?.map((_, i) => i) ?? [])); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const apply = useMutation({
    mutationFn: () => socialApi.applyPlan((result?.plan ?? []).filter((_, i) => picked.has(i))),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['social'] }); toast.success(t('{{count}} posts calendar me aa gayi', { count: r.created })); setResult(null); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const fest = festivals.find((f) => f.key === festivalKey);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <section className="space-y-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="grid grid-cols-2 gap-1.5">
          {KINDS.map((k) => (
            <button key={k.key} type="button" onClick={() => { setKind(k.key); setResult(null); }}
              className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8125rem] font-semibold ring-1 transition', kind === k.key ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              <k.icon className="h-4 w-4" />{k.label}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium text-slate-700">{kind === 'plan' ? t('Products (khali = haal ke products)') : t('Products')}</p>
          <ProductPicker value={products} onChange={setProducts} max={kind === 'plan' ? 10 : 3} />
        </div>
        {kind === 'plan'
          ? <Segmented value={String(days)} onChange={(v) => setDays(Number(v) as 7 | 30)} items={[{ value: '7', label: t('7 din') }, { value: '30', label: t('30 din') }]} label={t('Kitne din')} />
          : <Select label={t('Platform')} value={platform} onChange={(e) => setPlatform(e.target.value as SocialPlatform)} options={SOCIAL_PLATFORMS.map((p) => ({ value: p, label: PLATFORM_META[p].label }))} />}
        <Segmented value={lang} onChange={setLang} items={[{ value: 'roman', label: 'Roman Urdu' }, { value: 'ur', label: 'اردو' }, { value: 'en', label: 'English' }]} label={t('Zabaan')} />
        {kind !== 'plan' && (
          <Select label={t('Tehwar / sale day')} value={festivalKey} onChange={(e) => setFestivalKey(e.target.value)}
            options={[{ value: '', label: t('Koi nahi') }, ...festivals.map((f) => ({ value: f.key, label: `${f.name} · ${f.date}` }))]} />
        )}
        <Input label={t('Offer (agar hai)')} value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={200} placeholder={t('Misaal: 20% Discount, sirf 3 din')} />
        <Input label={t('Aur kuch? (zaroori nahi)')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t('Misaal: mazahiya, chhota, ammi ke liye')} />
        <Button fullWidth variant="gradient" loading={run.isPending} onClick={() => run.mutate()} leftIcon={<Sparkles className="h-4 w-4" />}>{t('Nafaa AI se banayein')}</Button>
        {result?.remaining != null && <p className="text-center text-[0.6875rem] text-slate-500">{t('Aaj Nafaa AI ke {{count}} sawal baqi', { count: result.remaining })}</p>}
      </section>

      <section className="min-h-[20rem] space-y-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        {!result ? (
          <div className="flex h-full min-h-[18rem] flex-col items-center justify-center gap-2 text-center">
            <NafaaAiMark size="lg" />
            <p className="text-[0.9375rem] font-semibold text-slate-900">{t('Product chunein, Nafaa AI likh dega')}</p>
            <p className="max-w-sm text-[0.8125rem] text-slate-500">{t('Caption, hashtags, reel ka script ya poore mahine ka plan — Eid, 11.11, White Friday jaise din khud shamil.')}</p>
          </div>
        ) : result.kind === 'plan' ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.9375rem] font-semibold text-slate-900">{t('{{count}} din ka plan', { count: result.plan?.length ?? 0 })}</p>
              <Button loading={apply.isPending} disabled={!picked.size} onClick={() => apply.mutate()} leftIcon={<CalendarPlus className="h-4 w-4" />}>{t('{{count}} calendar me daalein', { count: picked.size })}</Button>
            </div>
            <p className="text-[0.75rem] text-slate-500">{t('Posts "Idea" ban kar aayengi. Tayyar ho jayein to "Ready" karein — waqt par yaad dilayenge.')}</p>
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {(result.plan ?? []).map((p, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                  <Checkbox checked={picked.has(i)} onChange={() => setPicked((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} aria-label={p.title} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[0.8125rem] font-semibold text-slate-900">
                      <span className="tabular-nums text-slate-500">{new Date(`${p.date}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' })} · {p.time}</span>
                      <span>{p.title}</span>
                      <span className="rounded-full bg-slate-100 px-1.5 text-[0.625rem] font-semibold text-slate-600">{KIND_LABEL[p.kind]}</span>
                      {p.festivalKey && <span className="rounded-full bg-rose-50 px-1.5 text-[0.625rem] font-semibold text-rose-700">{festivals.find((f) => f.key === p.festivalKey)?.name ?? p.festivalKey}</span>}
                    </p>
                    <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-[0.75rem] text-slate-600">{p.caption}</p>
                  </div>
                  <span className="flex shrink-0 gap-0.5">{p.platforms.map((pl) => <PlatformMark key={pl} p={pl} size={16} />)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : result.kind === 'script' && result.script ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-violet-50 p-3 ring-1 ring-violet-200">
              <p className="text-[0.6875rem] font-semibold uppercase text-violet-700">{t('Hook (pehle 2 second)')}</p>
              <p className="text-[0.9375rem] font-semibold text-slate-900">{result.script.hook}</p>
            </div>
            <ol className="space-y-2">
              {result.script.scenes.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[0.75rem] font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] text-slate-800">{s.shot}</p>
                    <p className="text-[0.75rem] text-slate-500">{t('Screen par')}: <span className="font-semibold text-slate-700">{s.text}</span></p>
                  </div>
                  <span className="shrink-0 text-[0.75rem] tabular-nums text-slate-500">{s.seconds}s</span>
                </li>
              ))}
            </ol>
            <p className="text-[0.8125rem]"><span className="font-semibold">{t('CTA')}:</span> {result.script.cta}</p>
            <p className="text-[0.75rem] text-slate-500">{t('Music')}: {result.script.music}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => copy([result.script!.hook, ...result.script!.scenes.map((s, i) => `${i + 1}. ${s.shot} — ${s.text} (${s.seconds}s)`), `CTA: ${result.script!.cta}`].join('\n'))} leftIcon={<Copy className="h-4 w-4" />}>{t('Copy')}</Button>
              <Button onClick={() => onDraft({ title: t('Reel: {{name}}', { name: products[0]?.name ?? '' }), caption: `${result.script!.hook}\n\n${result.script!.cta}`, productIds: products.map((p) => p.id), aiMade: true, festivalKey: festivalKey || null })} leftIcon={<CalendarPlus className="h-4 w-4" />}>{t('Reel post banayein')}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(result.captions ?? []).map((c, i) => (
              <div key={i} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <p className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-slate-800">{c}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="xs" variant="secondary" onClick={() => copy(fullCaption(c, result.hashtags ?? []))} leftIcon={<Copy className="h-3.5 w-3.5" />}>{t('Copy')}</Button>
                  <Button size="xs" onClick={() => onDraft({ caption: c, hashtags: result.hashtags ?? [], productIds: products.map((p) => p.id), aiMade: true, festivalKey: festivalKey || null, title: fest ? `${fest.name}: ${products[0]?.name ?? ''}` : products[0]?.name })} leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}>{t('Post banayein')}</Button>
                </div>
              </div>
            ))}
            {!!result.hashtags?.length && (
              <div className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Hashtags')}</p>
                  <Button size="xs" variant="secondary" onClick={() => copy(result.hashtags!.join(' '))} leftIcon={<Copy className="h-3.5 w-3.5" />}>{t('Copy')}</Button>
                </div>
                <p className="text-[0.8125rem] leading-relaxed text-sky-700">{result.hashtags.join(' ')}</p>
                {result.kind === 'hashtags' && (
                  <Button className="mt-2" size="xs" onClick={() => onDraft({ hashtags: result.hashtags ?? [], productIds: products.map((p) => p.id), aiMade: true })} leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}>{t('Post banayein')}</Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
