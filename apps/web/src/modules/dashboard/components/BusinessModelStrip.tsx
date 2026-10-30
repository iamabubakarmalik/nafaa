/**
 * Home-page panels for how the business sells (Tenant.businessModels),
 * shown above the widgets on every industry's dashboard:
 *
 *   Online       no channel yet → "Pehla channel jorein"; otherwise today's
 *                online orders, new orders waiting and COD still to come.
 *   Wholesale /  shortcuts to orders, price lists and recoveries, or the
 *   distribution next step when the plan lacks distribution or it is off.
 *
 * Retail-only businesses (and those that never answered) see nothing new.
 * The distributor industry opens on the distribution dashboard while it is
 * on, so the wholesale panel is only shown there to explain the next step.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, BadgePercent, Clock, Globe, HandCoins, Lock, Plus, Power, ShoppingBag, Tag, Truck, Wallet, Warehouse,
} from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { useBusinessModels } from '@core/lib/business-models';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { useSalesChannels } from '@integrations/online-orders/hooks/useSalesChannels';
import { onlineOrdersApi } from '@integrations/online-orders/api/online-orders.api';
import { useDistributionState } from '@modules/distribution/hooks/useDistribution';
import { useMasked } from '../engine/useMasked';
import { MetricTile, WidgetCard } from '../engine/parts';

export function BusinessModelStrip() {
  const { sellsOnline, sellsToShops } = useBusinessModels();
  const industry = useCurrentIndustry();
  const { state } = useDistributionState();
  const distributor = industry?.id === 'distribution';
  const showWholesale = distributor ? state === 'plan' || state === 'off' : sellsToShops;
  if (!sellsOnline && !showWholesale) return null;
  return (
    <div className={cn('grid gap-4', sellsOnline && showWholesale && 'lg:grid-cols-2')}>
      {sellsOnline && <OnlinePanel />}
      {showWholesale && <WholesalePanel distributor={distributor} />}
    </div>
  );
}

const CHANNEL_LOGOS: BrandName[] = ['shopify', 'woocommerce', 'daraz', 'website', 'whatsapp'];

function OnlinePanel() {
  const canSales = usePermission(PERMISSIONS.SALES_VIEW);
  const canConnect = usePermission(PERMISSIONS.SETTINGS_VIEW);
  const channels = useSalesChannels();
  const hasChannel = (channels.data?.length ?? 0) > 0;
  const { sales } = useMasked();
  const orders = useQuery({
    queryKey: ['online-orders', 'home-strip'],
    queryFn: () => onlineOrdersApi.list({ limit: 1 }),
    enabled: hasChannel && canSales,
    staleTime: 60_000,
  });

  if (channels.isLoading) return null;

  if (!hasChannel) {
    return (
      <section className="flex h-full flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-sky-50 to-white p-5 ring-1 ring-sky-200/70" data-strip="online-start">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 ring-1 ring-sky-200"><Globe className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">Connect your first channel</h2>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-slate-600">
              Online orders seedha Nafaa me aayenge, stock khud kam hoga aur har order ka profit dikhega.
            </p>
          </div>
        </div>
        <ol className="grid gap-1 text-[0.75rem] text-slate-600 sm:grid-cols-3">
          {['Channel chunein', 'Login karke Connect', 'Products match — bas'].map((t, i) => (
            <li key={t} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[0.625rem] font-bold text-white">{i + 1}</span>{t}
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-label="Shopify, WooCommerce, Daraz, website, WhatsApp">
            {CHANNEL_LOGOS.map((b) => <BrandLogo key={b} name={b} size={26} />)}
          </div>
          {canConnect
            ? <Link to="/online-store/connect"><Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>Connect channel</Button></Link>
            : <span className="text-xs text-slate-500">Dukaan ke malik se kahein</span>}
        </div>
      </section>
    );
  }

  if (!canSales) return null;
  const s = orders.data?.stats;
  const waiting = orders.data?.counts?.PENDING ?? 0;
  return (
    <WidgetCard title="Online store — aaj" icon={ShoppingBag} to="/online-orders" linkLabel="Orders" className="h-auto">
      <div className="grid grid-cols-3 gap-2">
        <MetricTile icon={ShoppingBag} tone="info" label="Orders" value={orders.isLoading ? '…' : String(s?.todayOrders ?? 0)} hint={sales(s?.todayValue ?? 0)} to="/online-orders" />
        <MetricTile icon={Clock} tone={waiting ? 'warning' : 'neutral'} label="Naye, baqi" value={orders.isLoading ? '…' : String(waiting)} hint="Accept karein" to="/online-orders" alert={waiting > 0} />
        <MetricTile icon={Wallet} tone="brand" label="COD aana hai" value={orders.isLoading ? '…' : String(s?.codDueCount ?? 0)} hint={sales(s?.codDueValue ?? 0)} to="/online-orders/cod" />
      </div>
    </WidgetCard>
  );
}

function WholesalePanel({ distributor }: { distributor: boolean }) {
  const { state, data } = useDistributionState();
  const wantsFull = useBusinessModels().distribution || distributor;
  const canPlans = usePermission(PERMISSIONS.PLANS_VIEW);
  const canSettings = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const canOrders = usePermission(PERMISSIONS.DISTRIBUTION_ORDERS_VIEW);

  if (state === 'loading') return null;

  if (state === 'plan' || state === 'off') {
    const plan = state === 'plan';
    return (
      <section className="flex h-full flex-col justify-between gap-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-white p-5 ring-1 ring-indigo-200/70" data-strip="wholesale-locked">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 ring-1 ring-indigo-200">
            {plan ? <Lock className="h-5 w-5" /> : <Warehouse className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">
              {plan ? `${wantsFull ? 'Distribution' : 'Wholesale'} tools aap ke plan me nahi` : 'Distribution band hai'}
            </h2>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-slate-600">
              {plan
                ? `Price list, order, udhaar ki limit aur recovery${wantsFull ? ', booker app aur load sheet' : ''} — plan upgrade karte hi chalu.${data?.access.planName ? ` Abhi: ${data.access.planName}.` : ''}`
                : 'Settings me Distribution on karein — phir order, price list aur recovery yahan milenge.'}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          {plan && canPlans && <Link to="/plans"><Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>See plans</Button></Link>}
          {!plan && canSettings && <Link to="/settings/distribution"><Button size="sm" leftIcon={<Power className="h-4 w-4" />}>Turn on</Button></Link>}
        </div>
      </section>
    );
  }

  if (!canOrders) return null;
  const full = data?.settings.mode !== 'WHOLESALE';
  const links = [
    { to: '/distribution/orders', icon: Truck, label: 'Orders', hint: 'Book, approve, Invoice' },
    { to: '/distribution/price-lists', icon: Tag, label: 'Price lists', hint: 'Har group ka rate' },
    { to: '/distribution/recoveries', icon: HandCoins, label: 'Recoveries', hint: 'Udhaar wasooli' },
    full
      ? { to: '/distribution/load-sheets', icon: Truck, label: 'Load sheets', hint: 'Gaari aur delivery' }
      : { to: '/distribution/schemes', icon: BadgePercent, label: 'Schemes', hint: '10+1, % off' },
  ];
  return (
    <WidgetCard title={full ? 'Distribution' : 'Wholesale'} icon={Warehouse} to="/distribution" linkLabel="Dashboard" className="h-auto">
      <div className="grid grid-cols-2 gap-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="flex items-center gap-2.5 rounded-lg border border-slate-200 p-2.5 transition hover:border-slate-300 hover:bg-slate-50">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700"><l.icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{l.label}</span>
              <span className="block truncate text-[0.6875rem] text-slate-500">{l.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </WidgetCard>
  );
}
