/**
 * "10 minute store": the first-run setup wizard. One screen per step with
 * big choices and a live preview beside it:
 *   1 name + logo, 2 design, 3 colours (taken from the logo), 4 products,
 *   5 delivery charges, 6 payments, 7 go live on the free address.
 * Steps 3–6 can be skipped (smart defaults stay). Progress is remembered
 * per browser, so the shop comes back to the step it left. The store is
 * created after step 2; later steps save straight to it.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Banknote, Brush, Check, CheckCircle2, CreditCard, ExternalLink, Image as ImageIcon, Loader2, MapPin, PackageCheck,
  Palette, PartyPopper, Rocket, Store, Truck, Type, Wand2,
} from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Select, Skeleton, Switch } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { CopyField } from '@integrations/online-orders/components/website/CopyField';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { storesApi, type ShippingSettings, type StoreGateway, type ThemeId, type ThemePreset, type ThemeTokens } from '../api/stores.api';
import { UpgradeCard, slugify } from '../components/StoreGate';
import { ImageField } from '../components/ImageField';
import { ColorInput } from '../components/SettingsForm';
import { PreviewPane, type PreviewHandle } from '../components/theme/PreviewPane';
import { SK, pickStore, storeLink, useCurrentStore, useThemeSchema } from '../lib/hooks';
import { logoColors } from '../lib/logoColors';
import { newId } from '../lib/sections';
import { ALL_CITIES } from '../lib/pk-places';

type StepKey = 'name' | 'theme' | 'colors' | 'products' | 'delivery' | 'payments' | 'launch';
const STEPS: Array<{ key: StepKey; label: string; icon: typeof Store; skippable: boolean }> = [
  { key: 'name', label: t('Naam aur logo'), icon: Store, skippable: false },
  { key: 'theme', label: t('Design'), icon: Brush, skippable: false },
  { key: 'colors', label: t('Rang'), icon: Palette, skippable: true },
  { key: 'products', label: t('Products'), icon: PackageCheck, skippable: true },
  { key: 'delivery', label: t('Delivery'), icon: Truck, skippable: true },
  { key: 'payments', label: t('Payment'), icon: CreditCard, skippable: true },
  { key: 'launch', label: t('Live karein'), icon: Rocket, skippable: false },
];

interface Saved { storeId: string | null; step: StepKey; done: StepKey[]; name: string; logoUrl: string | null; themeId: ThemeId | null; finished?: boolean }
const KEY = 'nafaa.website.setup';
const read = (): Partial<Saved> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const write = (s: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ } };

/** True while the wizard for this store has steps left (for the "continue setup" banner). */
export function setupPending(storeId: string) {
  const s = read();
  return s.storeId === storeId && !s.finished;
}

const PALETTES: Array<{ name: string; primary: string; accent: string }> = [
  { name: t('Kala'), primary: '#111827', accent: '#d97706' },
  { name: t('Hara'), primary: '#15803d', accent: '#f59e0b' },
  { name: t('Neela'), primary: '#1d4ed8', accent: '#f97316' },
  { name: t('Gulabi'), primary: '#be185d', accent: '#f9a8d4' },
  { name: t('Maroon'), primary: '#7f1d1d', accent: '#ca8a04' },
  { name: t('Jamni'), primary: '#6d28d9', accent: '#10b981' },
];

type DeliveryPlan = 'one' | 'city' | 'free';

export default function SetupWizardPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const { store, list } = useCurrentStore();
  const schema = useThemeSchema();
  const saved = useRef(read());
  const [state, setState] = useState<Saved>(() => ({
    storeId: saved.current.storeId ?? null,
    step: saved.current.step ?? 'name',
    done: saved.current.done ?? [],
    name: saved.current.name ?? shopName,
    logoUrl: saved.current.logoUrl ?? null,
    themeId: saved.current.themeId ?? null,
    finished: saved.current.finished,
  }));
  const [busy, setBusy] = useState(false);
  const preview = useRef<PreviewHandle>(null);
  /** Each later step registers its save function; "Aage" runs it. */
  const stepSave = useRef<null | (() => Promise<void>)>(null);

  // A shop that already has a store (made elsewhere) continues from colours.
  useEffect(() => {
    if (!store || state.storeId === store.id) return;
    setState((s) => ({ ...s, storeId: store.id, name: store.name, themeId: store.themeId, step: s.storeId ? s.step : 'colors', done: s.storeId ? s.done : ['name', 'theme'] }));
  }, [store, state.storeId]);
  useEffect(() => { write(state); }, [state]);
  useEffect(() => { if (!state.themeId && schema.data?.themes[0]) setState((s) => ({ ...s, themeId: schema.data!.themes[0].id })); }, [schema.data, state.themeId]);

  const storeId = state.storeId && store?.id === state.storeId ? state.storeId : store?.id ?? null;
  const token = useQuery({ queryKey: ['stores', storeId, 'preview-token'], queryFn: () => storesApi.previewToken(storeId!), enabled: !!storeId, staleTime: 90 * 60_000 });

  const idx = STEPS.findIndex((s) => s.key === state.step);
  const step = STEPS[idx] ?? STEPS[0];
  const go = (key: StepKey, markDone = true) => setState((s) => ({ ...s, step: key, done: markDone && !s.done.includes(s.step) ? [...s.done, s.step] : s.done }));
  const next = () => go(STEPS[Math.min(idx + 1, STEPS.length - 1)].key);
  const skip = () => setState((s) => ({ ...s, step: STEPS[Math.min(idx + 1, STEPS.length - 1)].key }));
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  const afterSave = () => preview.current?.reload();

  const preset = schema.data?.themes.find((x) => x.id === state.themeId) ?? schema.data?.themes[0];

  if (list.data && !list.data.entitled && !store) {
    return (
      <PageShell>
        <PageHero back="/online-store" backLabel={t('Online store')} title={t('10 minute me apni website')} stats={[{ label: t('Steps'), value: '7' }, { label: t('Website add-on'), value: t('Nahi laga') }, { label: t('Muft address'), value: `*.${list.data.rootDomain}` }]} />
        <UpgradeCard />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHero back={storeId ? '/online-store/site' : '/online-store'} backLabel={storeId ? t('Website') : t('Online store')}
        title={t('10 minute me apni website')}
        chip={<span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.75rem] font-semibold">{t('Step {{n}} / {{total}}', { n: idx + 1, total: STEPS.length })}</span>}
        meta={t('Har step chhota hai. Jo abhi nahi karna, "Baad me" dabayein. Sab kuch baad me badal sakte hain.')}
        loading={list.isLoading || schema.isLoading}
        stats={[
          { label: t('Ho gaye'), value: `${state.done.length} / ${STEPS.length}` },
          { label: t('Naam'), value: state.name || '—' },
          { label: t('Design'), value: preset?.name ?? '—' },
          { label: t('Address'), value: store?.primaryHost ?? (list.data ? `${slugify(state.name) || '…'}.${list.data.rootDomain}` : '—') },
        ]} />

      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const isDone = state.done.includes(s.key);
          const reachable = i <= 1 || !!storeId;
          return (
            <li key={s.key} className="shrink-0">
              <button type="button" disabled={!reachable} onClick={() => go(s.key, false)}
                className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ring-1 transition disabled:opacity-40',
                  s.key === step.key ? 'bg-brand-600 text-white ring-brand-600' : isDone ? 'bg-success-50 text-success-700 ring-success-200' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
                {isDone && s.key !== step.key ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        <Card>
          {schema.isLoading ? <Skeleton className="h-80 rounded-xl" /> : (
            <>
              {step.key === 'name' && <NameStep state={state} setState={setState} rootDomain={list.data?.rootDomain ?? ''} hasStore={!!storeId} />}
              {step.key === 'theme' && <ThemeStep themes={schema.data?.themes ?? []} value={state.themeId} onPick={(id) => setState((s) => ({ ...s, themeId: id }))} />}
              {step.key === 'colors' && storeId && <ColorsStep storeId={storeId} logoUrl={state.logoUrl} register={(fn) => { stepSave.current = fn; }} />}
              {step.key === 'products' && storeId && <ProductsStep storeId={storeId} register={(fn) => { stepSave.current = fn; }} />}
              {step.key === 'delivery' && storeId && <DeliveryStep register={(fn) => { stepSave.current = fn; }} storeId={storeId} />}
              {step.key === 'payments' && storeId && <PaymentsStep storeId={storeId} register={(fn) => { stepSave.current = fn; }} />}
              {step.key === 'launch' && storeId && store && (
                <LaunchStep url={store.url} done={!!state.finished} link={storeLink(store, list.data?.storefrontUrl)} />
              )}

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                {idx > 0 && !state.finished && (
                  <Button variant="ghost" onClick={() => go(STEPS[idx - 1].key, false)} leftIcon={<ArrowLeft className="h-4 w-4 rtl-flip" />}>{t('Wapas')}</Button>
                )}
                <span className="flex-1" />
                {step.skippable && <Button variant="secondary" onClick={skip}>{t('Baad me')}</Button>}
                {step.key !== 'launch' ? (
                  <Button size="lg" loading={busy} disabled={step.key === 'name' && !state.name.trim()}
                    onClick={() => void run(async () => {
                      if (step.key === 'name' && storeId) {
                        await storesApi.update(storeId, { name: state.name.trim(), settings: { logoUrl: state.logoUrl } });
                        afterSave();
                      }
                      if (step.key === 'theme') {
                        if (!storeId) {
                          const base = slugify(state.name) || 'store';
                          const chk = await storesApi.checkSlug(base);
                          const created = await storesApi.create({ name: state.name.trim(), slug: chk.available ? chk.slug : chk.suggestion ?? undefined, themeId: state.themeId ?? undefined });
                          if (state.logoUrl) await storesApi.update(created.id, { settings: { logoUrl: state.logoUrl } });
                          pickStore(created.id);
                          setState((s) => ({ ...s, storeId: created.id }));
                          await qc.invalidateQueries({ queryKey: SK.list });
                          toast.success(t('Website ban gayi! Ab rang aur products.'));
                        } else if (store && state.themeId && state.themeId !== store.themeId) {
                          await storesApi.switchTheme(storeId, state.themeId, 'content');
                          void qc.invalidateQueries({ queryKey: SK.list });
                          afterSave();
                        }
                      }
                      if (stepSave.current && ['colors', 'products', 'delivery', 'payments'].includes(step.key)) {
                        await stepSave.current();
                        afterSave();
                      }
                      stepSave.current = null;
                      next();
                    })}
                    rightIcon={<ArrowRight className="h-4 w-4 rtl-flip" />}>
                    {t('Aage')}
                  </Button>
                ) : !state.finished ? (
                  <Button size="lg" loading={busy} leftIcon={<Rocket className="h-4 w-4" />}
                    onClick={() => void run(async () => {
                      await storesApi.publish(storeId!, t('Pehla design'));
                      await storesApi.setStatus(storeId!, 'LIVE');
                      void qc.invalidateQueries({ queryKey: ['stores'] });
                      setState((s) => ({ ...s, finished: true, done: STEPS.map((x) => x.key) }));
                      toast.success(t('Mubarak ho! Website live hai.'));
                    })}>
                    {t('Store live karein')}
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => navigate('/online-store/site')}>{t('Website home')}</Button>
                )}
              </div>
            </>
          )}
        </Card>

        <div className="h-[34rem] xl:h-[calc(100dvh-16rem)] xl:min-h-[34rem]">
          {storeId ? (
            <PreviewPane ref={preview} baseUrl={token.data?.url ?? null} path="/" selectedSectionId={null} onSelectSection={() => undefined}
              error={token.error ? apiErrorMessage(token.error) : null} />
          ) : (
            <MockPreview name={state.name} logoUrl={state.logoUrl} preset={preset} />
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Big({ active, onClick, icon: Icon, title, text, badge }: { active: boolean; onClick: () => void; icon: typeof Store; title: string; text: string; badge?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex w-full items-start gap-3 rounded-2xl p-4 text-start ring-1 transition', active ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">{title}{badge && <span className="rounded-full bg-success-100 px-2 py-0.5 text-[0.6875rem] font-bold text-success-700">{badge}</span>}</span>
        <span className="mt-0.5 block text-[0.8125rem] text-slate-500">{text}</span>
      </span>
      {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />}
    </button>
  );
}

function StepTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-[1.25rem] font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-[0.875rem] text-slate-500">{text}</p>
    </div>
  );
}

function NameStep({ state, setState, rootDomain, hasStore }: { state: Saved; setState: (fn: (s: Saved) => Saved) => void; rootDomain: string; hasStore: boolean }) {
  const [textLogo, setTextLogo] = useState(!state.logoUrl);
  return (
    <div>
      <StepTitle title={t('Dukaan ka naam aur logo')} text={t('Ye website ke upar aur Google me dikhega.')} />
      <Input size="lg" label={t('Website ka naam')} value={state.name} maxLength={60} placeholder={t('Misal: Hiba Fashion')} onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))} />
      {!hasStore && state.name.trim() && <p className="mt-1.5 text-[0.75rem] text-slate-500">{t('Muft address: {{a}}', { a: `${slugify(state.name)}.${rootDomain}` })}</p>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Big active={!textLogo} onClick={() => setTextLogo(false)} icon={ImageIcon} title={t('Logo lagayein')} text={t('Apni tasveer upload karein')} />
        <Big active={textLogo} onClick={() => { setTextLogo(true); setState((s) => ({ ...s, logoUrl: null })); }} icon={Type} title={t('Logo baad me')} text={t('Abhi naam hi logo banega')} />
      </div>
      {!textLogo && <div className="mt-4"><ImageField label={t('Logo')} square value={state.logoUrl} onChange={(url) => setState((s) => ({ ...s, logoUrl: url }))} hint={t('PNG behtar hai, peeche ka rang na ho')} /></div>}
    </div>
  );
}

function ThemeStep({ themes, value, onPick }: { themes: ThemePreset[]; value: ThemeId | null; onPick: (id: ThemeId) => void }) {
  return (
    <div>
      <StepTitle title={t('Design chunein')} text={t('Apne kaam ke hisaab se chunein. Rang aur hisse baad me badal sakte hain.')} />
      <div className="grid gap-3 sm:grid-cols-2">
        {themes.map((p) => (
          <button key={p.id} type="button" onClick={() => onPick(p.id)}
            className={cn('overflow-hidden rounded-2xl text-start ring-1 transition', p.id === value ? 'ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}>
            {p.previewImage ? <img src={p.previewImage} alt="" className="h-36 w-full object-cover object-top" /> : <MiniTheme tokens={p.tokens} />}
            <div className="flex items-start gap-2 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-[0.9375rem] font-semibold text-slate-900">{p.name}</p>
                <p className="line-clamp-2 text-[0.75rem] text-slate-500">{p.description}</p>
              </div>
              {p.id === value && <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniTheme({ tokens }: { tokens: ThemeTokens }) {
  const c = tokens.colors;
  return (
    <div className="h-36 p-3" style={{ backgroundColor: c.background }}>
      <div className="flex items-center justify-between"><div className="h-2.5 w-14 rounded" style={{ backgroundColor: c.text }} /><div className="h-2.5 w-8 rounded" style={{ backgroundColor: c.muted }} /></div>
      <div className="mt-2.5 flex h-14 items-end rounded-lg p-2" style={{ backgroundColor: c.primary }}><div className="h-3 w-12 rounded" style={{ backgroundColor: c.background }} /></div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-9 rounded" style={{ backgroundColor: c.surface, border: `1px solid ${c.border}` }} />)}</div>
    </div>
  );
}

function ColorsStep({ storeId, logoUrl, register }: { storeId: string; logoUrl: string | null; register: (fn: () => Promise<void>) => void }) {
  const theme = useQuery({ queryKey: SK.theme(storeId), queryFn: () => storesApi.theme(storeId), staleTime: 0 });
  const [primary, setPrimary] = useState<string | null>(null);
  const [accent, setAccent] = useState<string | null>(null);
  const [fromLogo, setFromLogo] = useState<{ primary: string; accent: string } | null>(null);
  const [reading, setReading] = useState(false);
  const tokens = theme.data?.draft.doc.tokens;
  useEffect(() => { if (tokens && primary === null) { setPrimary(tokens.colors.primary); setAccent(tokens.colors.accent); } }, [tokens, primary]);
  useEffect(() => {
    if (!logoUrl) return;
    setReading(true);
    void logoColors(logoUrl).then((c) => { setFromLogo(c); if (c) { setPrimary(c.primary); setAccent(c.accent); } }).finally(() => setReading(false));
  }, [logoUrl]);

  useEffect(() => {
    register(async () => {
      const th = theme.data;
      if (!th || !primary || !accent) return;
      const doc = { ...th.draft.doc, tokens: { ...th.draft.doc.tokens, colors: { ...th.draft.doc.tokens.colors, primary, accent } } };
      await storesApi.saveDraft(storeId, doc, th.draft.updatedAt);
    });
  });

  if (theme.isLoading || primary === null) return <Skeleton className="h-64 rounded-xl" />;
  const choices = [...(fromLogo ? [{ name: t('Logo se'), ...fromLogo }] : []), ...PALETTES];
  return (
    <div>
      <StepTitle title={t('Website ke rang')} text={logoUrl ? t('Logo se rang nikal liye. Pasand na aayein to neeche se chunein.') : t('Ek jor chunein ya apna rang lagayein.')} />
      {reading && <p className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('Logo se rang dhoond rahe hain...')}</p>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {choices.map((p) => {
          const on = p.primary === primary && p.accent === accent;
          return (
            <button key={p.name} type="button" onClick={() => { setPrimary(p.primary); setAccent(p.accent); }}
              className={cn('flex items-center gap-2 rounded-xl p-2.5 ring-1', on ? 'bg-brand-50 ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}>
              <span className="flex"><span className="h-7 w-7 rounded-full ring-2 ring-white" style={{ backgroundColor: p.primary }} /><span className="-ms-2 h-7 w-7 rounded-full ring-2 ring-white" style={{ backgroundColor: p.accent }} /></span>
              <span className="text-[0.8125rem] font-semibold text-slate-800">{p.name === t('Logo se') ? <span className="inline-flex items-center gap-1"><Wand2 className="h-3.5 w-3.5" />{p.name}</span> : p.name}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-3">
        <ColorInput label={t('Asal rang (buttons)')} value={primary} onChange={setPrimary} />
        <ColorInput label={t('Nishan ka rang')} value={accent ?? '#000000'} onChange={setAccent} />
      </div>
    </div>
  );
}

function ProductsStep({ storeId, register }: { storeId: string; register: (fn: () => Promise<void>) => void }) {
  const [mode, setMode] = useState<'all' | 'pick'>('all');
  const inStock = useQuery({ queryKey: [...SK.products(storeId), 'count-in'], queryFn: () => storesApi.products(storeId, { stock: 'in', limit: 1 }) });
  const all = useQuery({ queryKey: [...SK.products(storeId), 'count-all'], queryFn: () => storesApi.products(storeId, { limit: 1 }) });
  useEffect(() => {
    register(async () => {
      if (mode === 'all') {
        await storesApi.update(storeId, { settings: { catalogMode: 'ALL', showOutOfStock: false } });
        await storesApi.bulkProducts(storeId, 'show_in_stock');
      } else {
        await storesApi.update(storeId, { settings: { catalogMode: 'CHOSEN' } });
      }
    });
  });
  return (
    <div>
      <StepTitle title={t('Kaun se products website par hon?')} text={t('Products, qeemat aur stock Nafaa se khud aate hain. Bikne par stock khud kam hota hai.')} />
      <div className="space-y-2">
        <Big active={mode === 'all'} onClick={() => setMode('all')} icon={PackageCheck} badge={t('Behtar')}
          title={t('Sab in-stock products dikhayein')} text={t('{{n}} products jin ka stock hai. Naye products bhi khud aayenge.', { n: inStock.data?.total ?? '…' })} />
        <Big active={mode === 'pick'} onClick={() => setMode('pick')} icon={Check}
          title={t('Main khud chunungi / chunoonga')} text={t('Kul {{n}} products me se, Website products page par ek ek chunein.', { n: all.data?.total ?? '…' })} />
      </div>
      {mode === 'pick' && <p className="mt-3 text-[0.8125rem] text-slate-500">{t('Setup ke baad Website products page kholein aur jo dikhane hain unhein chalu karein.')}</p>}
    </div>
  );
}

function DeliveryStep({ storeId, register }: { storeId: string; register: (fn: () => Promise<void>) => void }) {
  const [plan, setPlan] = useState<DeliveryPlan>('one');
  const [price, setPrice] = useState(250);
  const [cityPrice, setCityPrice] = useState(150);
  const [city, setCity] = useState('Lahore');
  const [freeOn, setFreeOn] = useState(true);
  const [freeAbove, setFreeAbove] = useState(3000);
  useEffect(() => {
    register(async () => {
      // Customer-facing text on the storefront (English is the store default), not merchant UI.
      const eta = '3-5 days';
      const rate = (p: number, e = eta) => ({ id: newId('r'), name: 'Delivery', type: 'flat' as const, price: p, min: null, max: null, freeAbove: null, eta: e });
      const zones: ShippingSettings['zones'] = [];
      if (plan === 'city') zones.push({ id: newId('z'), name: city, provinces: [], cities: [city], codEnabled: true, codFee: null, eta: '1-2 days', rates: [rate(cityPrice, '1-2 days')] });
      zones.push({ id: newId('z'), name: t('Poora Pakistan'), provinces: [], cities: [], codEnabled: true, codFee: null, eta, rates: [rate(plan === 'free' ? 0 : price)] });
      await storesApi.saveShipping(storeId, { freeShippingThreshold: plan !== 'free' && freeOn ? freeAbove : null, defaultEta: eta, codFee: 0, zones });
    });
  });
  return (
    <div>
      <StepTitle title={t('Delivery charges')} text={t('Customer checkout par yahi dekhega. Baad me shehar ke hisaab se aur rate bana sakte hain.')} />
      <div className="space-y-2">
        <Big active={plan === 'one'} onClick={() => setPlan('one')} icon={Truck} title={t('Poore Pakistan ka ek rate')} text={t('Sab sheharon me ek hi charge')} badge={t('Aasaan')} />
        <Big active={plan === 'city'} onClick={() => setPlan('city')} icon={MapPin} title={t('Apne shehar me sasta')} text={t('Apne shehar ka alag kam rate, baqi Pakistan ka alag')} />
        <Big active={plan === 'free'} onClick={() => setPlan('free')} icon={PartyPopper} title={t('Sab ko free delivery')} text={t('Charge aap khud uthayenge')} />
      </div>
      {plan !== 'free' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {plan === 'city' && (
            <>
              <Select label={t('Aap ka shehar')} value={city} onChange={(e) => setCity(e.target.value)} options={ALL_CITIES.map((c) => ({ value: c, label: c }))} />
              <Input type="number" label={t('{{c}} me charge (Rs)', { c: city })} value={cityPrice} min={0} onChange={(e) => setCityPrice(Number(e.target.value) || 0)} />
            </>
          )}
          <Input type="number" label={plan === 'city' ? t('Baqi Pakistan (Rs)') : t('Charge (Rs)')} value={price} min={0} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          <div className="sm:col-span-2">
            <Switch label={t('Itne ke order par free delivery')} checked={freeOn} onChange={(e) => setFreeOn(e.target.checked)} />
            {freeOn && <Input className="mt-2" type="number" value={freeAbove} min={0} onChange={(e) => setFreeAbove(Number(e.target.value) || 0)} leftIcon={<span className="text-[0.75rem] text-slate-400">Rs</span>} />}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentsStep({ storeId, register }: { storeId: string; register: (fn: () => Promise<void>) => void }) {
  const pay = useQuery({ queryKey: SK.payments(storeId), queryFn: () => storesApi.payments(storeId) });
  const [cod, setCod] = useState(true);
  const [on, setOn] = useState<Record<string, boolean>>({});
  useEffect(() => { if (pay.data) setOn(Object.fromEntries(pay.data.gateways.map((g) => [g.code, g.connected && g.active]))); }, [pay.data]);
  useEffect(() => {
    register(async () => {
      await storesApi.saveCheckout(storeId, { payments: { cod, SAFEPAY: !!on.SAFEPAY, JAZZCASH: !!on.JAZZCASH, EASYPAISA: !!on.EASYPAISA } });
    });
  });
  return (
    <div>
      <StepTitle title={t('Customer paisay kaise dein?')} text={t('Cash on Delivery shuru se chalu hai. Online payment jo Nafaa me pehle se jora hai, wo yahan chalu karein.')} />
      <div className="space-y-2">
        <GatewayRow brand={null} icon={Banknote} name={t('Cash on Delivery (COD)')} text={t('Pakistan me sab se zyada chalta hai')} checked={cod} onChange={setCod} />
        {pay.isLoading ? <Skeleton className="h-28 rounded-xl" /> : (pay.data?.gateways ?? []).map((g) => (
          <GatewayRow key={g.code} brand={g.code} name={g.name} icon={CreditCard}
            text={g.connected ? t('Nafaa me jora hua hai') : t('Abhi jora nahi — Payments page se jorein')}
            checked={!!on[g.code]} disabled={!g.connected} onChange={(v) => setOn((o) => ({ ...o, [g.code]: v }))} />
        ))}
      </div>
      <Link to="/online-store/payments" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700">{t('JazzCash / Easypaisa jorein')}</Link>
    </div>
  );
}

function GatewayRow({ brand, icon: Icon, name, text, checked, disabled, onChange }: {
  brand: StoreGateway['code'] | null; icon: typeof Store; name: string; text: string; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void;
}) {
  const logo: BrandName | null = brand === 'JAZZCASH' ? 'jazzcash' : brand === 'EASYPAISA' ? 'easypaisa' : brand === 'SAFEPAY' ? 'safepay' : null;
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl p-3.5 ring-1 ring-slate-200', disabled && 'opacity-60')}>
      {logo ? <BrandLogo name={logo} size="lg" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-700"><Icon className="h-5 w-5" /></span>}
      <div className="min-w-0 flex-1">
        <p className="text-[0.9375rem] font-semibold text-slate-900">{name}</p>
        <p className="text-[0.75rem] text-slate-500">{text}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={name} />
    </div>
  );
}

function LaunchStep({ url, done, link }: { url: string; done: boolean; link: string }) {
  return (
    <div>
      {done ? (
        <div className="py-4 text-center">
          <PartyPopper className="mx-auto h-12 w-12 text-brand-600" />
          <h2 className="mt-3 text-[1.375rem] font-bold text-slate-900">{t('Mubarak ho! Website live hai.')}</h2>
          <p className="mt-1 text-[0.875rem] text-slate-500">{t('Link WhatsApp aur Instagram par bhejein. Orders seedha Online orders me aayenge.')}</p>
          <a href={link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-[0.875rem] font-semibold text-white"><ExternalLink className="h-4 w-4" />{t('Store dekhein')}</a>
        </div>
      ) : (
        <StepTitle title={t('Website live karein')} text={t('Abhi muft address par khul jayegi. Apna domain (www.apnidukaan.pk) baad me Domains page se jor sakte hain.')} />
      )}
      <CopyField label={t('Aap ki website ka address')} value={url} />
    </div>
  );
}

function MockPreview({ name, logoUrl, preset }: { name: string; logoUrl: string | null; preset?: ThemePreset }) {
  const c = preset?.tokens.colors ?? { primary: '#111827', accent: '#d97706', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', muted: '#64748b', border: '#e2e8f0', secondary: '#334155', sale: '#dc2626' };
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl ring-1 ring-slate-200" style={{ backgroundColor: c.background, color: c.text, fontFamily: preset?.tokens.fonts.body }}>
      <div className="py-1.5 text-center text-[0.75rem] font-medium" style={{ backgroundColor: c.primary, color: c.background }}>{t('Poore Pakistan me Cash on Delivery')}</div>
      <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: c.border }}>
        {logoUrl ? <img src={logoUrl} alt="" className="h-9 max-w-[9rem] object-contain" /> : <span className="text-[1.125rem] font-bold" style={{ fontFamily: preset?.tokens.fonts.heading }}>{name || t('Aap ki dukaan')}</span>}
        <span className="flex gap-4 text-[0.8125rem]" style={{ color: c.muted }}><span>{t('Home')}</span><span>{t('Products')}</span><span>{t('Rabta')}</span></span>
      </div>
      <div className="m-5 flex flex-1 flex-col items-center justify-center rounded-2xl p-8 text-center" style={{ backgroundColor: c.surface }}>
        <p className="text-[1.75rem] font-bold" style={{ fontFamily: preset?.tokens.fonts.heading }}>{name || t('Aap ki dukaan')}</p>
        <p className="mt-1 text-[0.875rem]" style={{ color: c.muted }}>{t('Nayi collection aa gayi')}</p>
        <span className="mt-4 rounded-xl px-5 py-2 text-[0.875rem] font-semibold" style={{ backgroundColor: c.primary, color: c.background }}>{t('Shop karein')}</span>
      </div>
      <div className="grid grid-cols-4 gap-3 px-5 pb-5">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded-xl" style={{ backgroundColor: c.surface, border: `1px solid ${c.border}` }} />)}</div>
    </div>
  );
}
