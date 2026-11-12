/**
 * Shows a website page only when the shop can use it: the plan includes the
 * website add-on and a store exists. Without the add-on it shows what the
 * website gives and opens the upgrade dialog; without a store it opens the
 * 10-minute setup wizard.
 */

import { type ComponentProps, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Globe, Lock, Palette, ShoppingBag, Sparkles, Truck, Wallet } from 'lucide-react';
import { Button, Card, PageHero, Skeleton } from '@/design-system/components';
import { openUpsell } from '@core/api/billing-notice';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import type { StoreList, StoreSummary, ThemePreset } from '../api/stores.api';
import { WEBSITE_ADDON, WEBSITE_FEATURE, pickStore, useCurrentStore } from '../lib/hooks';

export interface StoreCtx { store: StoreSummary; list: StoreList }

export const upsellWebsite = () => openUpsell({ kind: 'addon', feature: WEBSITE_FEATURE, addOnKey: WEBSITE_ADDON });

/**
 * `title` is the page title for the plain header shown while there is no
 * store yet (or no add-on); the page itself renders its own PageHero.
 */
export function StoreGate({ title, children }: { title: string; children: (ctx: StoreCtx) => ReactNode }) {
  const { store, list } = useCurrentStore();
  const hero = (
    <PageHero back="/online-store" backLabel={t('Online store')} title={title} loading={list.isLoading}
      meta={t('Nafaa Stores: apni website, apna domain, sab Nafaa se')}
      stats={[
        { label: t('Websites'), value: String(list.data?.items.length ?? 0) },
        { label: t('Website add-on'), value: list.data?.entitled ? t('Laga hai') : t('Nahi laga') },
        { label: t('Muft address'), value: list.data?.rootDomain ? `*.${list.data.rootDomain}` : '—' },
      ]} />
  );

  if (list.isLoading) return <>{hero}<Skeleton className="h-72 rounded-2xl" /></>;
  if (list.error || !list.data) {
    return (
      <>{hero}<Card>
        <p className="text-[0.875rem] text-slate-600">{apiErrorMessage(list.error)}</p>
        <Button className="mt-3" size="sm" variant="secondary" onClick={() => void list.refetch()}>{t('Dobara koshish')}</Button>
      </Card></>
    );
  }
  if (!store) return list.data.entitled ? <Navigate to="/online-store/site/setup" replace /> : <>{hero}<UpgradeCard /></>;
  return <>{children({ store, list: list.data })}</>;
}

/**
 * The page header for website pages: the shared PageHero, plus a notice
 * under it while the website add-on is off (pages stay readable, saving
 * opens the upgrade dialog).
 */
export function WebsiteHero({ ctx, ...hero }: ComponentProps<typeof PageHero> & { ctx: StoreCtx }) {
  return (
    <>
      <PageHero back="/online-store/site" backLabel={t('Website')} {...hero} />
      {!ctx.list.entitled && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <Lock className="h-4 w-4 shrink-0 text-amber-700" />
          <p className="min-w-0 flex-1 text-[0.8125rem] text-amber-900">{t('Website add-on band hai. Aap dekh sakte hain, magar badalne ke liye add-on lagayein.')}</p>
          <Button size="sm" onClick={upsellWebsite}>{t('Add-on lagayein')}</Button>
        </div>
      )}
    </>
  );
}

/** Small picker when the shop has more than one website. */
export function StorePicker({ ctx }: { ctx: StoreCtx }) {
  if (ctx.list.items.length < 2) return null;
  return (
    <select value={ctx.store.id} onChange={(e) => pickStore(e.target.value)} aria-label={t('Website chunein')}
      className="h-9 rounded-xl border-0 bg-[color:var(--hero-btn-bg)] px-2.5 text-[0.8125rem] font-semibold text-[color:var(--hero-btn-fg)] ring-1 ring-[color:var(--hero-btn-ring)]">
      {ctx.list.items.map((s) => <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>)}
    </select>
  );
}

const PERKS = [
  { icon: Globe, title: t('Apna domain'), text: t('www.apnidukaan.pk ya muft nafaa address') },
  { icon: ShoppingBag, title: t('Nafaa ke products'), text: t('Stock aur qeemat khud update hoti hai') },
  { icon: Wallet, title: t('COD, JazzCash, Easypaisa'), text: t('Order seedha Orders board par') },
  { icon: Truck, title: t('Courier tayyar'), text: t('Booking, tracking, COD sab Nafaa me') },
];

export function UpgradeCard() {
  return (
    <Card>
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-amber-200">
            <Lock className="h-3.5 w-3.5" />{t('Aap ke plan me nahi')}
          </span>
          <h2 className="mt-3 text-[1.25rem] font-bold text-slate-900">{t('10 minute me apni website banayein')}</h2>
          <p className="mt-1 text-[0.875rem] text-slate-600">{t('Website add-on lagayein. Products, orders, courier aur paisay sab Nafaa me hi rahenge.')}</p>
          <Button className="mt-4" leftIcon={<Sparkles className="h-4 w-4" />}
            onClick={upsellWebsite}>
            {t('Website add-on dekhein')}
          </Button>
        </div>
        <ul className="grid flex-1 gap-2 sm:grid-cols-2">
          {PERKS.map((p) => (
            <li key={p.title} className="flex gap-2.5 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
              <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="text-[0.8125rem] font-semibold text-slate-900">{p.title}</p>
                <p className="text-[0.75rem] text-slate-500">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function PresetCard({ preset, active, onPick, footer }: { preset: ThemePreset; active: boolean; onPick: () => void; footer?: ReactNode }) {
  const c = preset.tokens.colors;
  return (
    <button type="button" onClick={onPick}
      className={cn('group overflow-hidden rounded-2xl bg-white text-start ring-1 transition', active ? 'ring-2 ring-brand-500' : 'ring-slate-200 hover:ring-slate-300')}>
      {preset.previewImage ? (
        <img src={preset.previewImage} alt="" className="h-28 w-full object-cover object-top" />
      ) : (
        <div className="h-28 p-3" style={{ backgroundColor: c.background }}>
          <div className="h-2.5 w-16 rounded" style={{ backgroundColor: c.text, opacity: 0.8 }} />
          <div className="mt-3 h-10 rounded-lg" style={{ backgroundColor: c.primary }} />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((i) => <div key={i} className="h-5 rounded" style={{ backgroundColor: i === 1 ? c.accent : `${c.text}22` }} />)}
          </div>
        </div>
      )}
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.875rem] font-semibold text-slate-900">{preset.name}</p>
          <p className="line-clamp-2 text-[0.75rem] text-slate-500">{preset.description}</p>
          {footer}
        </div>
        {active ? <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" /> : <Palette className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-slate-400" />}
      </div>
    </button>
  );
}
