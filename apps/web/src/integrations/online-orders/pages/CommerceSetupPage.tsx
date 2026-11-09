/**
 * Online store first-run setup (/online-store/setup): one question per
 * screen (where you sell, couriers, COD share, team size, how you confirm,
 * packing scan), then a summary of what the answers switch on. Skippable on
 * every screen; everything stays editable in Online store settings.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, GraduationCap, ListChecks, Sparkles, Truck, Wand2 } from 'lucide-react';
import { Badge, Button, Card, Checkbox, PageHero, PageShell, Skeleton, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { saveFavorites, loadFavorites } from '@/app/shell/navigation/nav-config';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '../api/online-orders.api';
import { insightsApi, type RecipeKey, type SellPlace, type SetupAnswers } from '../api/insights.api';
import { SETUP_KEY, useCommerceSetup } from '../hooks/useCommerceSetup';
import { COURIER_OPTIONS, courierBrand } from '../lib/labels';
import { tileEntry } from '../components/setup/HomeTilesEditor';

const PLACES: { value: SellPlace; label: string; brand?: Parameters<typeof BrandLogo>[0]['name'] }[] = [
  { value: 'WEBSITE', label: t('Apni website') },
  { value: 'SHOPIFY', label: 'Shopify', brand: 'shopify' },
  { value: 'WOOCOMMERCE', label: 'WooCommerce', brand: 'woocommerce' },
  { value: 'DARAZ', label: 'Daraz', brand: 'daraz' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'FOODPANDA', label: 'Foodpanda' },
];
const COURIER_CHOICES = [...COURIER_OPTIONS.filter((c) => c.code !== 'OTHER'), { code: 'PAKPOST', name: 'Pakistan Post' }];
const RECIPE_LABEL: Record<RecipeKey, string> = {
  auto_confirm_prepaid: t('Prepaid order khud confirm'),
  hold_big_cod_new: t('Naye customer ka bara COD hold'),
  city_courier: t('Shehar → courier'),
  rto_advance: t('RTO wale se advance'),
  low_stock_unlist: t('Stock kam → channel se hatao'),
  review_after_delivery: t('Deliver hone par review request'),
};

type Step = 'places' | 'couriers' | 'cod' | 'team' | 'confirm' | 'pack' | 'summary';
const STEPS: Step[] = ['places', 'couriers', 'cod', 'team', 'confirm', 'pack', 'summary'];
const blank = (): SetupAnswers => ({ places: [], couriers: [], codShare: 'MOST', team: 'SOLO', confirmBy: 'CALL', packScan: false });

function Choice({ on, onClick, children, multi }: { on: boolean; onClick: () => void; children: React.ReactNode; multi?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('flex min-h-[3.25rem] items-center gap-3 rounded-2xl bg-white px-4 py-3 text-start text-[0.875rem] font-semibold shadow-sm ring-1 transition hover:-translate-y-0.5',
        on ? 'text-slate-900 ring-2 ring-brand-500' : 'text-slate-700 ring-slate-200/80')}>
      <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center border', multi ? 'rounded-md' : 'rounded-full', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300')}>
        {on && <Check className="h-3.5 w-3.5" />}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">{children}</span>
    </button>
  );
}

export default function CommerceSetupPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const qc = useQueryClient();
  const setup = useCommerceSetup();
  const [a, setA] = useState<SetupAnswers>(blank);
  const [i, setI] = useState(0);
  const [recipes, setRecipes] = useState<RecipeKey[] | null>(null);
  const [autoBooking, setAutoBooking] = useState(false);
  const step = STEPS[i];

  useEffect(() => { if (setup.data?.answers) setA(setup.data.answers); }, [setup.data?.answers]);

  const preview = useQuery({ queryKey: ['commerce-setup-preview', a], queryFn: () => insightsApi.setupPreview(a), enabled: step === 'summary' });
  useEffect(() => { if (preview.data && recipes === null) setRecipes(preview.data.recipes.map((r) => r.key)); }, [preview.data, recipes]);

  const finish = useMutation({
    mutationFn: () => insightsApi.finishSetup({ answers: a, recipes: recipes ?? [], autoBooking }),
    onSuccess: (r) => {
      qc.setQueryData(SETUP_KEY, r.profile);
      const favs = loadFavorites();
      saveFavorites([...favs, ...(r.profile.pinnedNav ?? []).filter((p) => !favs.includes(p))]);
      qc.invalidateQueries({ queryKey: ['automation'] });
      toast.success(t('Online store aap ke hisaab se set ho gaya'));
      navigate('/online-store');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const skip = useMutation({
    mutationFn: insightsApi.skipSetup,
    onSuccess: (p) => { qc.setQueryData(SETUP_KEY, p); navigate('/online-store'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const toggle = <K extends 'places' | 'couriers'>(k: K, v: SetupAnswers[K][number], max = 20) =>
    setA((x) => {
      const list = x[k] as string[];
      return { ...x, [k]: list.includes(v) ? list.filter((y) => y !== v) : list.length >= max ? list : [...list, v] };
    });
  const parcelCouriers = a.couriers.filter((c) => c !== 'RIDER' && c !== 'PAKPOST').length;

  const title: Record<Step, string> = {
    places: t('Aap kahan bechte hain?'),
    couriers: t('Kaun se couriers istemal karte hain?'),
    cod: t('Kitne orders COD (cash on delivery) hote hain?'),
    team: t('Online orders par kitne log kaam karte hain?'),
    confirm: t('Order confirm kaise karte hain?'),
    pack: t('Kya parcel scan karke pack karte hain?'),
    summary: t('Ye sab aap ke liye set hoga'),
  };

  return (
    <PageShell>
      <PageHero title={t('Online store setup')} chip={<><Wand2 />{t('Sawal {{n}} / {{total}}', { n: Math.min(i + 1, 6), total: 6 })}</>}
        meta={t('6 chhote sawal — jawab ke hisaab se dashboard, menu, auto booking aur automation khud set ho jayenge. Baad me sab badal sakte hain.')}
        loading={setup.isLoading}
        actions={<>
          <button type="button" className={heroButton} disabled={skip.isPending} onClick={() => skip.mutate()}>{t('Abhi nahi')}</button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Channels'), value: String(a.places.length) },
          { label: t('Couriers'), value: String(a.couriers.length) },
          { label: 'COD', value: a.codShare === 'MOST' ? t('Zyada') : a.codShare === 'HALF' ? t('Aadhe') : t('Kam') },
          { label: t('Team'), value: a.team === 'SOLO' ? t('Akele') : a.team === 'SMALL' ? '2–5' : '6+' },
        ]} />

      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex gap-1.5" aria-hidden>{STEPS.map((s, k) => <span key={s} className={cn('h-1.5 flex-1 rounded-full', k <= i ? 'bg-brand-500' : 'bg-slate-200')} />)}</div>
        <Card className="rounded-3xl" title={title[step]}>
          {step === 'places' && (
            <div className="grid gap-2 sm:grid-cols-3">
              {PLACES.map((p) => (
                <Choice key={p.value} multi on={a.places.includes(p.value)} onClick={() => toggle('places', p.value)}>
                  {p.brand && <BrandLogo name={p.brand} size={20} />}{p.label}
                </Choice>
              ))}
            </div>
          )}
          {step === 'couriers' && (
            <>
              <p className="mb-2 text-[0.8125rem] text-slate-500">{t('5 tak chun sakte hain. Kai couriers hon to scorecard har shehar ka best batata hai.')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {COURIER_CHOICES.map((c) => (
                  <Choice key={c.code} multi on={a.couriers.includes(c.code)} onClick={() => toggle('couriers', c.code, 5)}>
                    <BrandLogo name={courierBrand(c.code)} size={20} />{c.name}
                  </Choice>
                ))}
              </div>
            </>
          )}
          {step === 'cod' && (
            <div className="grid gap-2">
              <Choice on={a.codShare === 'MOST'} onClick={() => setA({ ...a, codShare: 'MOST' })}>{t('Zyada tar COD (70% se upar)')}</Choice>
              <Choice on={a.codShare === 'HALF'} onClick={() => setA({ ...a, codShare: 'HALF' })}>{t('Takreeban aadhe COD, aadhe prepaid')}</Choice>
              <Choice on={a.codShare === 'FEW'} onClick={() => setA({ ...a, codShare: 'FEW' })}>{t('Zyada tar prepaid (paisa pehle)')}</Choice>
            </div>
          )}
          {step === 'team' && (
            <div className="grid gap-2">
              <Choice on={a.team === 'SOLO'} onClick={() => setA({ ...a, team: 'SOLO' })}>{t('Main akela / akeli')}</Choice>
              <Choice on={a.team === 'SMALL'} onClick={() => setA({ ...a, team: 'SMALL' })}>{t('2 se 5 log')}</Choice>
              <Choice on={a.team === 'LARGE'} onClick={() => setA({ ...a, team: 'LARGE' })}>{t('6 ya zyada log')}</Choice>
            </div>
          )}
          {step === 'confirm' && (
            <div className="grid gap-2">
              <Choice on={a.confirmBy === 'CALL'} onClick={() => setA({ ...a, confirmBy: 'CALL' })}>{t('Phone call se')}</Choice>
              <Choice on={a.confirmBy === 'WHATSAPP'} onClick={() => setA({ ...a, confirmBy: 'WHATSAPP' })}>{t('WhatsApp message se')}</Choice>
              <Choice on={a.confirmBy === 'BOTH'} onClick={() => setA({ ...a, confirmBy: 'BOTH' })}>{t('Dono — call bhi, WhatsApp bhi')}</Choice>
              <Choice on={a.confirmBy === 'NONE'} onClick={() => setA({ ...a, confirmBy: 'NONE' })}>{t('Confirm nahi karte, seedha bhejte hain')}</Choice>
            </div>
          )}
          {step === 'pack' && (
            <div className="grid gap-2">
              <Choice on={a.packScan} onClick={() => setA({ ...a, packScan: true })}>{t('Haan — barcode scan karke pack aur dispatch')}</Choice>
              <Choice on={!a.packScan} onClick={() => setA({ ...a, packScan: false })}>{t('Nahi — haath se pack karte hain')}</Choice>
            </div>
          )}
          {step === 'summary' && (
            preview.isLoading || !preview.data ? <Skeleton className="h-48 rounded-2xl" /> : (
              <div className="space-y-4 text-[0.8125rem]">
                <section>
                  <h3 className="mb-1.5 font-semibold text-slate-900">{t('Dashboard ke "Aaj ka kaam" dabbe')}</h3>
                  <div className="flex flex-wrap gap-1.5">{preview.data.homeTiles.map((k) => <Badge key={k} size="sm" variant="outline">{tileEntry(k)?.label ?? k}</Badge>)}</div>
                </section>
                <section>
                  <h3 className="mb-1.5 font-semibold text-slate-900">{t('Automation recipes (on honge)')}</h3>
                  {!preview.data.recipes.length ? <p className="text-slate-500">{t('Koi nahi — baad me Automation page se on karein')}</p> : (
                    <div className="space-y-1.5">
                      {preview.data.recipes.map((r) => (
                        <Checkbox key={r.key} label={RECIPE_LABEL[r.key]} checked={(recipes ?? []).includes(r.key)}
                          onChange={(e) => setRecipes((x) => (e.currentTarget.checked ? [...(x ?? []), r.key] : (x ?? []).filter((y) => y !== r.key)))} />
                      ))}
                    </div>
                  )}
                </section>
                {parcelCouriers > 0 && (
                  <section>
                    <h3 className="mb-1.5 flex items-center gap-1.5 font-semibold text-slate-900"><Truck className="h-4 w-4" />{t('Auto booking')}</h3>
                    {preview.data.courierFallback
                      ? <p className="mb-1.5 text-slate-600">{t('Har order ka courier: {{name}} (jo shehar ka rule na ho)', { name: COURIER_CHOICES.find((c) => c.code === preview.data!.courierFallback)?.name ?? preview.data.courierFallback })}</p>
                      : <p className="mb-1.5 text-slate-600">{t('Kai couriers: scorecard me har shehar ka best "Auto booking me lagayein" se lagayein.')}</p>}
                    <Checkbox label={t('Order confirm hote hi courier khud book karein')} checked={autoBooking} onChange={(e) => setAutoBooking(e.currentTarget.checked)} />
                  </section>
                )}
                <section>
                  <h3 className="mb-1.5 font-semibold text-slate-900">{t('Menu')}</h3>
                  <p className="text-slate-600">{t('{{hidden}} cheezein menu se chhupengi, {{pinned}} pin hongi.', { hidden: preview.data.hiddenNav.length, pinned: preview.data.pinnedNav.length })}</p>
                </section>
                {preview.data.confirmText && (
                  <section>
                    <h3 className="mb-1.5 font-semibold text-slate-900">{t('Confirm ka WhatsApp message')}</h3>
                    <p className="rounded-xl bg-slate-50 p-3 text-slate-700 ring-1 ring-slate-200/80">{preview.data.confirmText}</p>
                    <p className="mt-1 text-[0.75rem] text-slate-500">{t('Sirf tab lagega jab aap ne apna message pehle se nahi likha.')}</p>
                  </section>
                )}
              </div>
            )
          )}
        </Card>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)} leftIcon={<ArrowLeft className="h-4 w-4" />}>{t('Peeche')}</Button>
          {step === 'summary'
            ? <Button variant="primary" loading={finish.isPending} onClick={() => finish.mutate()} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{t('Set karein')}</Button>
            : <Button variant="primary" onClick={() => setI(i + 1)} rightIcon={<ArrowRight className="h-4 w-4" />}>{t('Aage')}</Button>}
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title={t('Online store setup')} onClose={guide.close}
          flow={[
            { label: t('6 sawal'), icon: ListChecks, color: '#2563eb' },
            { label: t('Aap ke hisaab se'), hint: t('dashboard, menu, rules'), icon: Sparkles, color: '#7c3aed' },
            { label: t('Baad me badlein'), hint: t('Online store settings'), icon: Wand2, color: '#16a34a' },
          ]}
          steps={[
            { icon: ListChecks, color: '#2563eb', title: t('Har sawal ek screen'), text: t('Jo theek lage chunein. "Abhi nahi" se kabhi bhi chhor sakte hain.') },
            { icon: Sparkles, color: '#7c3aed', title: t('Kya badalta hai'), text: t('Dashboard ke dabbe, menu me chhupi aur pin cheezein, automation recipes, ek courier ho to auto booking aur confirm ka message.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
