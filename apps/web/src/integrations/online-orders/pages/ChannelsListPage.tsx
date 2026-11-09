/**
 * Sales channels hub: every connected store with its status and new orders,
 * and the platforms that can be connected next.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Globe, GraduationCap, Package, Plus, ShoppingBag } from 'lucide-react';
import { Badge, Button, PageHero, PageShell, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo, brandForChannel, brandLabel, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { channelMeta, channelPath, useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { t } from '@core/i18n';

const ADD: Array<{ brand: BrandName; name: string; desc: string; to: string; tag?: string }> = [
  { brand: 'shopify', name: 'Shopify', desc: t('Install dabayein — orders, stock aur tracking khud'), to: '/online-store/connect?platform=shopify', tag: t('Automatic') },
  { brand: 'woocommerce', name: 'WooCommerce', desc: t('WordPress website — Approve dabayein, baaqi Nafaa khud'), to: '/online-store/connect?platform=woocommerce', tag: t('Automatic') },
  { brand: 'daraz', name: 'Daraz', desc: t('Seller account se Allow — orders, stock, label'), to: '/online-store/connect?platform=daraz', tag: t('Automatic') },
  { brand: 'foodpanda', name: 'foodpanda', desc: t('Restaurant orders seedha counter par'), to: '/online-store/foodpanda' },
  { brand: 'indolj', name: 'Indolj', desc: t('Indolj par bani website — "Apni website" banayein, phir Setup me Indolj chunein'), to: '/online-store/connect?platform=custom' },
  { brand: 'website', name: 'Apni banayi website', desc: t('Developer ke liye tayyar code aur key'), to: '/online-store/connect?platform=custom' },
];

export default function ChannelsListPage() {
  const guide = usePageGuide();
  const { data, isLoading, isFetching } = useSalesChannels();
  const channels = data ?? [];
  const live = channels.filter((c) => c.live).length;
  const pending = channels.reduce((n, c) => n + (c.pendingOrders || 0), 0);

  return (
    <PageShell>
      <PageHero
        title={t('Sales channels')}
        chip={<><Globe /> {' '}{t('{{count}} channel', { count: channels.length })}</>}
        meta={t('Jahan jahan aap bechte hain — har channel ke orders Online orders me, aur stock sab ka ek')}
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<>
          <Link to="/online-store/connect" className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{t('Channel jorein')}</Link>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={channels.length ? [
          { label: t('Live'), value: live, hint: channels.length - live ? t('{{value}} band', { value: channels.length - live }) : undefined },
          { label: t('Naye orders'), value: pending, hint: pending ? t('accept karne') : undefined },
        ] : undefined}
      />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-14 rounded-2xl" />)}</div>
        ) : channels.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex w-fit -space-x-2">{(['shopify', 'woocommerce', 'daraz'] as BrandName[]).map((b) => <BrandLogo key={b} name={b} size={40} className="ring-2 ring-white" />)}</div>
            <p className="mt-4 font-semibold text-slate-900">{t('Abhi koi channel nahi jura')}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{t('Apna store jorein — orders khud Nafaa me aayenge, ghanti bajegi, aur stock dono jagah ek rahega.')}</p>
            <Link to="/online-store/connect"><Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>{t('Pehla channel jorein')}</Button></Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {channels.map((c) => {
              const brand = brandForChannel(c.type, { platform: c.platform });
              const label = brand === 'other' ? channelMeta(c.type).label : brandLabel(brand);
              return (
                <li key={c.id}>
                  <Link to={channelPath(c)} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-5">
                    <BrandLogo name={brand} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[0.9375rem] font-semibold text-slate-900">{c.displayName}</span>
                        <Badge size="xs" variant={c.live ? 'success' : 'default'} dot>{c.live ? t('Live') : t('Band')}</Badge>
                        {c.oneClick && <Badge size="xs" variant="info">{t('Automatic')}</Badge>}
                      </div>
                      <p className="truncate text-[0.78125rem] text-slate-500">
                        {label}{c.siteUrl ? ` · ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''} · {c.lastOrderAt ? t('aakhri order {{lastOrderAt}}', { lastOrderAt: timeAgo(c.lastOrderAt) }) : t('abhi koi order nahi')}
                      </p>
                    </div>
                    {c.pendingOrders > 0 && (
                      <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 sm:inline">{t('{{pendingOrders}} naye', { pendingOrders: c.pendingOrders })}</span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 rtl-flip" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Naya channel jorein')}</h2>
        <p className="text-[0.75rem] text-slate-500">{t('Har channel ki apni setup guide hai — har qadam par kahan click karna hai')}</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {ADD.map((a) => (
            <Link key={a.name} to={a.to}
              className={cn('group flex items-start gap-3 rounded-2xl p-3.5 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-brand-300')}>
              <BrandLogo name={a.brand} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[0.875rem] font-semibold text-slate-900">{a.name}</span>
                  {a.tag && <Badge size="xs" variant="success">{a.tag}</Badge>}
                </span>
                <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">{a.desc}</span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-600 rtl-flip" />
            </Link>
          ))}
        </div>
      </section>
      {guide.isOpen && (
        <PageGuide title={t('Sales channels')} onClose={guide.close}
          flow={[
            { label: t('Channel jorein'), icon: Plus, color: '#0891b2' },
            { label: t('Orders'), hint: t('Ek jagah'), icon: ShoppingBag, color: '#7c3aed' },
            { label: t('Stock'), hint: t('Sab ka ek'), icon: Package, color: '#16a34a' },
          ]}
          steps={[
            { icon: Plus, color: '#0891b2', title: t('Channel jorein'), text: t('Shopify, WooCommerce, Daraz ya apni website jorein — kuch minute ka kaam.') },
            { icon: ShoppingBag, color: '#7c3aed', title: t('Orders'), text: t('Har channel ke order Online orders me aate hain, wahan se accept aur dispatch karein.') },
            { icon: Globe, color: '#16a34a', title: t('Live / band'), text: t('Channel par click karke uski setting, products aur activity dekhein.') },
          ]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
