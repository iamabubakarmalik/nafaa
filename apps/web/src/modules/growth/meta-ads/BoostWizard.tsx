/**
 * "Product boost karein": product → audience → budget and days → picture
 * and text (Nafaa AI can write it) → create. Nafaa makes the campaign, ad
 * set and ad on the shop's Facebook ads account, all paused; the shop
 * checks it and taps "Chalu karein" to start spending.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ExternalLink, Globe, MessageCircle, Rocket, Search, Sparkles } from 'lucide-react';
import { Alert, Button, Input, Modal, Segmented, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t as tr } from '@core/i18n';
import { apiError } from '../api/growth.api';
import { marketingApi, utmLink, type ProductLinks } from '../api/marketing.api';
import { META_ADS_KEY, metaAdsApi } from '../api/meta-ads.api';
import { rs } from '../ads/meta';

type Item = ProductLinks['items'][number];
type Step = 0 | 1 | 2 | 3 | 4;

export function BoostWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const optionsQ = useQuery({ queryKey: [META_ADS_KEY, 'boost-options'], queryFn: metaAdsApi.boostOptions, staleTime: 5 * 60_000 });
  const o = optionsQ.data;
  const [step, setStep] = useState<Step>(0);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const productsQ = useQuery({ queryKey: ['marketing', 'product-links', debounced], queryFn: () => marketingApi.productLinks(debounced) });
  const [product, setProduct] = useState<Item | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);
  const [gender, setGender] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [destination, setDestination] = useState<'WEBSITE' | 'WHATSAPP'>('WEBSITE');
  const [link, setLink] = useState('');
  const [budget, setBudget] = useState('1000');
  const [days, setDays] = useState('5');
  const [headline, setHeadline] = useState('');
  const [text, setText] = useState('');
  const [done, setDone] = useState<{ actionId: string; manageUrl: string } | null>(null);

  const pick = (p: Item) => {
    setProduct(p);
    const first = p.links[0]?.url ?? '';
    setLink(first);
    setDestination(first ? 'WEBSITE' : 'WHATSAPP');
    setHeadline(p.name.slice(0, 40));
    setStep(1);
  };
  const name = product ? `Boost: ${product.name}`.slice(0, 120) : '';

  const ai = useMutation({
    mutationFn: () => marketingApi.copy({ productId: product!.id, platform: 'Facebook / Instagram' }),
    onSuccess: (r) => { setHeadline(r.roman.headline); setText(r.roman.primaryText); },
    onError: (e) => toast.error(apiError(e, tr('Nafaa AI abhi nahi likh saka'))),
  });
  const create = useMutation({
    mutationFn: () => metaAdsApi.boost({
      productId: product!.id, name, destination,
      link: destination === 'WEBSITE' ? utmLink(link, { source: 'facebook', medium: 'paid', campaign: name }) : null,
      dailyBudget: Math.round(Number(budget)), days: Math.round(Number(days)),
      audience: { ageMin, ageMax, gender }, cityNames: cities,
      copy: { headline: headline.trim(), primaryText: text.trim() },
    }),
    onSuccess: (r) => { setDone({ actionId: r.actionId, manageUrl: r.manageUrl }); onDone(); },
    onError: (e) => toast.error(apiError(e, tr('Ad nahi bana'))),
  });
  const launch = useMutation({
    mutationFn: () => metaAdsApi.launch(done!.actionId),
    onSuccess: () => { toast.success(tr('Ad chalu ho gaya')); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Chalu nahi hua'))),
  });

  const cur = o?.account.currency ?? 'PKR';
  const money = (n: number) => (cur === 'PKR' ? rs(n) : `${cur} ${n}`);
  const budgetOk = Number(budget) >= (o?.minDailyBudget ?? 1);
  const daysOk = Number(days) >= 1 && Number(days) <= 90;
  const linkOk = destination === 'WHATSAPP' || /^https:\/\//i.test(link);
  const copyOk = headline.trim().length > 0 && text.trim().length > 0;
  const canNext = [!!product, true, budgetOk && daysOk && linkOk, copyOk, true][step];
  const steps = [tr('Product'), tr('Log'), tr('Budget'), tr('Ad'), tr('Dekhein')];

  const footer = done ? (
    <>
      <a href={done.manageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:underline"><ExternalLink className="h-4 w-4" /> {tr('Meta me dekhein')}</a>
      <Button variant="secondary" onClick={onClose}>{tr('Baad me')}</Button>
      <Button loading={launch.isPending} onClick={() => launch.mutate()} leftIcon={<Rocket className="h-4 w-4" />}>{tr('Chalu karein')}</Button>
    </>
  ) : (
    <>
      {step > 0 && <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>{tr('Pichla')}</Button>}
      {step < 4
        ? <Button disabled={!canNext} onClick={() => setStep((s) => (s + 1) as Step)}>{tr('Agla')}</Button>
        : <Button loading={create.isPending} onClick={() => create.mutate()} leftIcon={<Rocket className="h-4 w-4" />}>{tr('Ad banayein (ruka hua)')}</Button>}
    </>
  );

  return (
    <Modal open onClose={onClose} size="lg" title={tr('Product boost karein')} description={o ? `${o.account.name}${o.page ? ` · ${o.page.name}` : ''}` : undefined} footer={footer}>
      {!o ? <Skeleton className="h-64 rounded-2xl" /> : done ? (
        <div className="space-y-3 py-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-50 text-success-700"><Check className="h-6 w-6" /></span>
          <p className="font-semibold text-slate-900">{tr('Ad ban gaya — abhi ruka hua hai')}</p>
          <p className="text-sm text-slate-600">{tr('Koi paisa nahi laga. Meta me dekh lein, phir "Chalu karein" dabayein. Meta ad check karega (aam tor par kuch ghante).')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <ol className="flex flex-wrap gap-1.5">
            {steps.map((s, i) => (
              <li key={s} className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium', i === step ? 'bg-brand-600 text-white' : i < step ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>{i + 1}. {s}</li>
            ))}
          </ol>
          {!o.page && <Alert tone="warning">{tr('Facebook page chuna nahi gaya — Facebook & Instagram settings me page chunein.')}</Alert>}

          {step === 0 && (
            <div className="space-y-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Product dhoondein')} leftIcon={<Search className="h-4 w-4" />} aria-label={tr('Product dhoondein')} />
              {productsQ.isLoading ? <Skeleton className="h-40 rounded-xl" /> : (
                <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                  {(productsQ.data?.items ?? []).map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => pick(p)} className={cn('flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-slate-50', product?.id === p.id && 'bg-brand-50')}>
                        {p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-slate-100" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">{p.name}</span>
                          <span className="block text-[0.75rem] text-slate-500">{rs(p.price)} · {p.links.length ? p.links.map((l) => l.channel).join(', ') : tr('Website par nahi — WhatsApp ad')}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                  {!productsQ.data?.items.length && <li className="px-3 py-6 text-center text-sm text-slate-500">{tr('Koi product nahi mila. Sirf woh products aate hain jo aap ki website par hain.')}</li>}
                </ul>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{tr('Shehar (koi na chunein = poora Pakistan)')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {o.cities.map((c) => {
                    const on = cities.includes(c);
                    return <button key={c} type="button" onClick={() => setCities((l) => (on ? l.filter((x) => x !== c) : [...l, c]))} className={cn('rounded-full px-2.5 py-1 text-[0.8125rem] ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{c}</button>;
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={tr('Kam se kam umar')} inputMode="numeric" value={String(ageMin)} onChange={(e) => setAgeMin(Math.min(65, Math.max(18, Number(e.target.value) || 18)))} />
                <Input label={tr('Zyada se zyada umar')} inputMode="numeric" value={String(ageMax)} onChange={(e) => setAgeMax(Math.min(65, Math.max(ageMin, Number(e.target.value) || 65)))} />
              </div>
              <Segmented value={gender} onChange={setGender} label={tr('Kaun')} items={[{ value: 'ALL', label: tr('Sab') }, { value: 'FEMALE', label: tr('Khawateen') }, { value: 'MALE', label: tr('Mard') }]} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <Segmented value={destination} onChange={setDestination} label={tr('Click par kahan jaye')}
                items={[{ value: 'WEBSITE', label: tr('Website') }, { value: 'WHATSAPP', label: tr('WhatsApp') }]} />
              {destination === 'WEBSITE' ? (
                product && product.links.length > 1
                  ? <select value={link} onChange={(e) => setLink(e.target.value)} aria-label={tr('Store')} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{product.links.map((l) => <option key={l.url} value={l.url}>{l.channel}</option>)}</select>
                  : <Input value={link} onChange={(e) => setLink(e.target.value)} label={tr('Product ka link')} leftIcon={<Globe className="h-4 w-4" />} />
              ) : (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-800"><MessageCircle className="h-4 w-4" /> {tr('Log ad dabayenge to page ke WhatsApp number par message aayega.')}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input label={tr('Roz ka budget ({{cur}})', { cur })} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} error={budget && !budgetOk ? tr('Kam se kam {{min}}', { min: o.minDailyBudget }) : undefined} />
                <Input label={tr('Kitne din')} inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} error={days && !daysOk ? tr('1 se 90 din') : undefined} />
              </div>
              {budgetOk && daysOk && <p className="text-[0.8125rem] text-slate-600">{tr('Kul zyada se zyada {{total}}', { total: money(Number(budget) * Number(days)) })}{destination === 'WEBSITE' && !o.pixel ? ` · ${tr('Pixel nahi — ad clicks ke liye chalega. Meta events on karein to kharid ke liye chalega.')}` : ''}</p>}
            </div>
          )}

          {step === 3 && product && (
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              {product.image ? <img src={product.image} alt="" className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200" /> : <span className="aspect-square w-full rounded-xl bg-slate-100" />}
              <div className="space-y-2">
                <Input label={tr('Headline')} value={headline} maxLength={60} onChange={(e) => setHeadline(e.target.value)} />
                <Textarea label={tr('Ad ki baat')} rows={4} value={text} maxLength={500} onChange={(e) => setText(e.target.value)} />
                <Button variant="secondary" size="sm" loading={ai.isPending} onClick={() => ai.mutate()} leftIcon={<Sparkles className="h-4 w-4" />}>{tr('Nafaa AI se likhwayein')}</Button>
              </div>
            </div>
          )}

          {step === 4 && product && (
            <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-slate-500">{tr('Product')}</dt><dd className="font-medium text-slate-900">{product.name}</dd>
              <dt className="text-slate-500">{tr('Log')}</dt><dd>{cities.length ? cities.join(', ') : tr('Poora Pakistan')} · {ageMin}–{ageMax} · {gender === 'ALL' ? tr('Sab') : gender === 'FEMALE' ? tr('Khawateen') : tr('Mard')}</dd>
              <dt className="text-slate-500">{tr('Budget')}</dt><dd>{tr('{{budget}} roz × {{days}} din', { budget: money(Number(budget)), days })}</dd>
              <dt className="text-slate-500">{tr('Click par')}</dt><dd className="truncate">{destination === 'WHATSAPP' ? 'WhatsApp' : link}</dd>
              <dt className="text-slate-500">{tr('Headline')}</dt><dd>{headline}</dd>
              <dt className="text-slate-500">{tr('Ad ki baat')}</dt><dd className="whitespace-pre-line">{text}</dd>
              <dd className="col-span-2 mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-800">{tr('Ad ruka hua banega — jab tak aap "Chalu karein" na dabayein koi paisa nahi lagega.')}</dd>
            </dl>
          )}
        </div>
      )}
    </Modal>
  );
}
