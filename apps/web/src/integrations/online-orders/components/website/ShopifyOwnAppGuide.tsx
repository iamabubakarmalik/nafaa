import { useState, type ReactNode } from 'react';
import { ExternalLink, KeyRound, ZoomIn } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { ShopifyCustomBody } from '../../api/online-orders.api';
import { SHOPIFY_SCOPES } from '../../lib/shopifyAddress';
import { CopyField } from './CopyField';
import { SetupStep, ShopifyCredentialsStep } from './ShopifySetup';
import { t, Trans } from '@core/i18n';

/* ═════════════════════════════════════════════════════════════
   Manual Shopify connect with the merchant's own Dev Dashboard app.
   Every step has a real Shopify screenshot with numbered marks; the
   numbers in the text match the numbers on the picture. Values the
   merchant types in Shopify are shown with a copy button.
   ═════════════════════════════════════════════════════════════ */

const IMG = '/guides/shopify-own-app';
const APP_NAME = 'Nafaa Connect';
const APP_URL = 'https://app.nafaa.pk';

/** Orange number that matches a mark on the screenshot. */
function Num({ n }: { n: number }) {
  return (
    <span className="me-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 align-[-0.3em] text-[0.6875rem] font-extrabold text-white ring-2 ring-white dark:ring-ink-900">
      {n}
    </span>
  );
}

/** Numbered line under a step: number + what to do. */
function Line({ n, children }: { n: number; children: ReactNode }) {
  return <li className="flex items-start gap-0.5"><Num n={n} /><span className="min-w-0 flex-1">{children}</span></li>;
}

/** Screenshot that opens full size on click. */
function Shot({ src, alt, maxW, className }: { src: string; alt: string; maxW?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={t('Tasveer bari karein')} style={maxW ? { maxWidth: maxW } : undefined}
        className={cn('group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm transition hover:shadow-md dark:border-ink-700', className)}>
        <img src={`${IMG}/${src}`} alt={alt} loading="lazy" className="block h-auto w-full" />
        <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[0.6875rem] font-medium text-white opacity-0 transition group-hover:opacity-100">
          <ZoomIn className="h-3.5 w-3.5" /> {t('Bara karein')}
        </span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} size="full" title={alt}>
        <img src={`${IMG}/${src}`} alt={alt} className="mx-auto block h-auto max-w-full rounded-lg" />
      </Modal>
    </>
  );
}

/** Step body: instructions first, then the picture at a readable size. */
function StepBody({ children, shot }: { children: ReactNode; shot?: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2.5">{children}</div>
      {shot && <div className="max-w-[760px] space-y-2">{shot}</div>}
    </div>
  );
}

/** Store handle from "name.myshopify.com", for direct Shopify admin links. */
function handleOf(shop: string | null) {
  return shop ? shop.replace(/\.myshopify\.com$/, '') : null;
}

/**
 * The full manual guide as numbered steps (rendered inside an <ol>).
 * Ends with the Client ID / secret form; on success calls onConnected.
 */
export function ShopifyOwnAppGuide({ first, shop, channelId, extra, onConnected }: {
  first: number; shop: string | null; channelId: string | null;
  extra?: Pick<ShopifyCustomBody, 'displayName' | 'shopId'>; onConnected: (channelId: string) => void;
}) {
  const [legacy, setLegacy] = useState(false);
  const handle = handleOf(shop);
  const devAppsUrl = handle ? `https://admin.shopify.com/store/${handle}/settings/apps/development` : null;
  const n = (i: number) => first + i;

  return (
    <>
      <SetupStep n={n(0)} title={t('Shopify admin me "Develop apps" kholein')}>
        <StepBody shot={<Shot src="1-settings-apps.jpg" alt={t('Shopify: Settings → Apps → Develop apps')} />}>
          <ol className="space-y-1.5">
            <Line n={1}><Trans text="Shopify admin me neeche baayen {{settings}} dabayein." values={{ settings: <b>Settings</b> }} /></Line>
            <Line n={2}><Trans text="List me {{apps}} chunein." values={{ apps: <b>Apps</b> }} /></Line>
            <Line n={3}><Trans text="Upar daayen {{dev}} dabayein." values={{ dev: <b>Develop apps</b> }} /></Line>
          </ol>
          {devAppsUrl && (
            <div className="rounded-lg bg-slate-50 p-3 dark:bg-ink-800">
              <p className="mb-2 text-[0.78125rem]">{t('Ya ye button dabayein, seedha agla page khul jayega:')}</p>
              <a href={devAppsUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="secondary" rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>{t('Shopify me kholein')}</Button>
              </a>
            </div>
          )}
        </StepBody>
      </SetupStep>

      <SetupStep n={n(1)} title={t('"Build apps in Dev Dashboard" dabayein')}>
        <StepBody shot={<Shot src="2-dev-dashboard.jpg" alt={t('Shopify: Build apps in Dev Dashboard')} />}>
          <p><Trans text="{{button}} wala kala button dabayein. Shopify ka Dev Dashboard khulega." values={{ button: <b>Build apps in Dev Dashboard</b> }} /></p>
          <p className="text-[0.78125rem] text-slate-500">{t('Neeche "legacy custom apps" wala hissa na chherein. Shopify ne naye legacy apps band kar diye hain.')}</p>
        </StepBody>
      </SetupStep>

      <SetupStep n={n(2)} title={t('Nayi app banayein')}>
        <StepBody shot={<Shot src="3-create-manually.jpg" alt={t('Dev Dashboard: Create app → Create app manually')} />}>
          <ol className="space-y-1.5">
            <Line n={1}><Trans text="Upar daayen {{button}} dabayein." values={{ button: <b>Create app</b> }} /></Line>
            <Line n={2}><Trans text="{{option}} chunein. (Shopify CLI wala option nahi.)" values={{ option: <b>Create app manually</b> }} /></Line>
          </ol>
        </StepBody>
      </SetupStep>

      <SetupStep n={n(3)} title={t('Form bharein: ye 6 cheezein')}>
        <StepBody shot={<Shot src="4-app-form.jpg" alt={t('Dev Dashboard: app ka form')} />}>
          <ol className="space-y-3">
            <Line n={1}>
              <span className="mb-1 block"><Trans text="{{field}} me ye naam:" values={{ field: <b>App name</b> }} /></span>
              <CopyField label={t('App name')} value={APP_NAME} />
            </Line>
            <Line n={2}>
              <span className="mb-1 block"><Trans text="{{field}} me pehle se likha mita kar ye daalein:" values={{ field: <b>App URL</b> }} /></span>
              <CopyField label={t('App URL')} value={APP_URL} />
            </Line>
            <Line n={3}><Trans text="{{field}} ka tick {{off}}." values={{ field: <b>Embed app in Shopify admin</b>, off: <b>{t('hata dein')}</b> }} /></Line>
            <Line n={4}><Trans text="{{field}} {{empty}}. {{legacy}} par bhi tick na lagayein." values={{ field: <b>Allowed redirection URL(s)</b>, empty: <b>{t('khali chhor dein')}</b>, legacy: <b>Use legacy install flow</b> }} /></Line>
            <Line n={5}>
              <span className="mb-1 block"><Trans text="{{field}} me ye poori line paste karein:" values={{ field: <b>Scopes</b> }} /></span>
              <CopyField label={t('Scopes')} value={SHOPIFY_SCOPES.join(',')} />
              <span className="mt-1 block text-[0.75rem] text-slate-500"><Trans text="{{field}} jaisa hai waisa rehne dein." values={{ field: <b>Webhooks API version</b> }} /></span>
            </Line>
            <Line n={6}><Trans text="Upar daayen {{button}} dabayein." values={{ button: <b>Create app</b> }} /></Line>
          </ol>
        </StepBody>
      </SetupStep>

      <SetupStep n={n(4)} title={t('"Release" dabayein')}>
        <StepBody shot={<Shot src="5-release.jpg" alt={t('Dev Dashboard: Release version')} maxW={560} />}>
          <p><Trans text="Chhota dabba khulega. Description khali chhor kar {{button}} dabayein." values={{ button: <b>Release</b> }} /></p>
        </StepBody>
      </SetupStep>

      <SetupStep n={n(5)} title={t('App apne store par install karein')}>
        <StepBody shot={<>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Shot src="6-install.jpg" alt={t('Dev Dashboard: Install app')} />
            <div className="space-y-2">
              <Shot src="7-pick-store.jpg" alt={t('Store chunein')} />
              <Shot src="8-grant.jpg" alt={t('Shopify: Install')} />
            </div>
          </div>
        </>}>
          <ol className="space-y-1.5">
            <li><Trans text="App ke Overview page par daayen {{install}} dabayein. (Kuch accounts me is ka naam {{test}} hota hai.)" values={{ install: <b>Install app</b>, test: <b>Test app</b> }} /></li>
            <li>{t('Store poochay to apna store chunein.')}</li>
            <li><Trans text="Shopify ijazat ka page dikhayega. {{button}} dabayein." values={{ button: <b>Install</b> }} /></li>
          </ol>
          <p className="rounded-lg bg-emerald-50 p-2.5 text-[0.78125rem] text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t('Install ke baad Shopify Nafaa khol dega aur store ka address khud bhar jayega. Agla step wahin karein.')}
          </p>
        </StepBody>
      </SetupStep>

      <SetupStep n={n(6)} title={t('Client ID aur Client secret copy karein')}>
        <StepBody shot={<Shot src="9-credentials.jpg" alt={t('Dev Dashboard: Client ID aur Client secret')} maxW={420} />}>
          <p><Trans text="Dev Dashboard me app ke {{page}} page par {{box}} ka hissa hai:" values={{ page: <b>Overview</b>, box: <b>Credentials</b> }} /></p>
          <ol className="space-y-1.5">
            <Line n={1}><Trans text="{{field}} ke saath wala copy button dabayein aur neeche paste karein." values={{ field: <b>Client ID</b> }} /></Line>
            <Line n={2}><Trans text="Phir {{field}} copy karke neeche paste karein." values={{ field: <b>Client secret</b> }} /></Line>
          </ol>
          <p className="text-[0.75rem] text-slate-500">{t('Secret kisi ko na bhejein. Nafaa ise encrypt karke rakhta hai aur har 24 ghante khud naya token le leta hai.')}</p>
        </StepBody>
      </SetupStep>

      <ShopifyCredentialsStep n={n(7)} kind={legacy ? 'token' : 'client'} channelId={channelId} shop={shop} extra={extra} onConnected={onConnected} />

      <li className="ps-10">
        <button type="button" onClick={() => setLegacy((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[0.78125rem] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-ink-200">
          <KeyRound className="h-3.5 w-3.5" />
          {legacy ? t('Wapas: Client ID aur secret wala tareeqa') : t('Purani app ka "shpat_" token hai? Yahan dabayein')}
        </button>
      </li>
    </>
  );
}

/** What happens after the manual connect, shown before the merchant starts. */
export function OwnAppSummary() {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[0.78125rem] text-slate-600 sm:grid-cols-3 dark:border-ink-700 dark:bg-ink-800">
      <div><b className="block text-slate-900 dark:text-ink-white">{t('10 minute ka kaam')}</b>{t('Sirf ek dafa. Har tasveer par number dekh kar chalein.')}</div>
      <div><b className="block text-slate-900 dark:text-ink-white">{t('Sab kuch Nafaa se')}</b>{t('Orders, stock, products, qeemat aur dispatch.')}</div>
      <div><b className="block text-slate-900 dark:text-ink-white">{t('Webhooks khud lagenge')}</b>{t('Shopify me webhook ya redirect kuch nahi likhna.')}</div>
    </div>
  );
}
