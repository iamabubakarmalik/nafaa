/**
 * Sales channels hub: every connected store with its status and new orders,
 * and the platforms that can be connected next.
 */

import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Globe, Plus } from 'lucide-react';
import { Badge, Button, PageHero, PageShell, Skeleton, heroPrimaryButton } from '@/design-system/components';
import { BrandLogo, brandForChannel, brandLabel, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { channelMeta, channelPath, useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';

const ADD: Array<{ brand: BrandName; name: string; desc: string; to: string; tag?: string }> = [
  { brand: 'shopify', name: 'Shopify', desc: 'Install dabayein — orders, stock aur tracking khud', to: '/online-store/connect?platform=shopify', tag: 'Automatic' },
  { brand: 'woocommerce', name: 'WooCommerce', desc: 'WordPress website — Approve dabayein, baaqi Nafaa khud', to: '/online-store/connect?platform=woocommerce', tag: 'Automatic' },
  { brand: 'daraz', name: 'Daraz', desc: 'Seller account se Allow — orders, stock, label', to: '/online-store/connect?platform=daraz', tag: 'Automatic' },
  { brand: 'foodpanda', name: 'foodpanda', desc: 'Restaurant orders seedha counter par', to: '/online-store/foodpanda' },
  { brand: 'indolj', name: 'Indolj', desc: 'Indolj par bani website — "Apni website" banayein, phir Setup me Indolj chunein', to: '/online-store/connect?platform=custom' },
  { brand: 'website', name: 'Apni banayi website', desc: 'Developer ke liye tayyar code aur key', to: '/online-store/connect?platform=custom' },
];

export default function ChannelsListPage() {
  const { data, isLoading, isFetching } = useSalesChannels();
  const channels = data ?? [];
  const live = channels.filter((c) => c.live).length;
  const pending = channels.reduce((n, c) => n + (c.pendingOrders || 0), 0);

  return (
    <PageShell>
      <PageHero
        title="Sales channels"
        chip={<><Globe /> {channels.length} channel</>}
        meta="Jahan jahan aap bechte hain — har channel ke orders Online orders me, aur stock sab ka ek"
        busy={isFetching && !isLoading}
        loading={isLoading}
        actions={<Link to="/online-store/connect" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Channel jorein</Link>}
        stats={channels.length ? [
          { label: 'Live', value: live, hint: channels.length - live ? `${channels.length - live} band` : undefined },
          { label: 'Naye orders', value: pending, hint: pending ? 'accept karne' : undefined },
        ] : undefined}
      />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((n) => <Skeleton key={n} className="h-14 rounded-2xl" />)}</div>
        ) : channels.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex w-fit -space-x-2">{(['shopify', 'woocommerce', 'daraz'] as BrandName[]).map((b) => <BrandLogo key={b} name={b} size={40} className="ring-2 ring-white" />)}</div>
            <p className="mt-4 font-semibold text-slate-900">Abhi koi channel nahi jura</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Apna store jorein — orders khud Nafaa me aayenge, ghanti bajegi, aur stock dono jagah ek rahega.</p>
            <Link to="/online-store/connect"><Button className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>Pehla channel jorein</Button></Link>
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
                        <Badge size="xs" variant={c.live ? 'success' : 'default'} dot>{c.live ? 'Live' : 'Band'}</Badge>
                        {c.oneClick && <Badge size="xs" variant="info">Automatic</Badge>}
                      </div>
                      <p className="truncate text-[0.78125rem] text-slate-500">
                        {label}{c.siteUrl ? ` · ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''} · {c.lastOrderAt ? `aakhri order ${timeAgo(c.lastOrderAt)}` : 'abhi koi order nahi'}
                      </p>
                    </div>
                    {c.pendingOrders > 0 && (
                      <span className="hidden rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200 sm:inline">{c.pendingOrders} naye</span>
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h2 className="text-[0.9375rem] font-semibold text-slate-900">Naya channel jorein</h2>
        <p className="text-[0.75rem] text-slate-500">Har channel ki apni setup guide hai — har qadam par kahan click karna hai</p>
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
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-brand-600" />
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
