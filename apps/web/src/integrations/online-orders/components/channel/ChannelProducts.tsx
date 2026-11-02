/**
 * Channel Products tab.
 *
 * Shopify, WooCommerce and Daraz: a short summary for this channel (linked,
 * not linked, problems, price differences, out of stock) and the way into
 * Online products, where linking, prices and sync are managed for every
 * channel together. Creating Nafaa products on the website stays here, since
 * it has no other home yet.
 *
 * Indolj: the menu items against Nafaa products (Online products does not
 * cover Indolj). Own website: the links made so far and CSV import/export.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BadgeDollarSign, ChevronDown, CloudUpload, Link2, Link2Off, PackageCheck, PackageX, RefreshCw, Wrench, type LucideIcon,
} from 'lucide-react';
import { Alert, Button, Skeleton } from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';
import { ONLINE_PRODUCTS_KEY, onlineProductsApi } from '../../api/online-products.api';
import { timeAgo } from '../../lib/labels';
import { CustomLinks, NafaaUnlisted, ProductLinker } from '../products/ProductLinker';
import { ProductSyncCard } from '../website/ProductSyncCard';
import { PanelHead, panel } from './ChannelOverview';
import type { ChannelFacts, ChannelTab } from './meta';
import { t as tr } from '@core/i18n';

export function ChannelProducts({ id, data, facts, setTab }: { id: string; data: WebsiteOverview; facts: ChannelFacts; setTab: (t: ChannelTab) => void }) {
  if (facts.kind === 'indolj') return <ProductLinker channelId={id} siteName="Indolj" />;
  if (!facts.productChannel) return <WebsiteProducts id={id} data={data} />;
  return <ProductChannelSummary id={id} data={data} facts={facts} setTab={setTab} />;
}

function Tile({ icon: Icon, label, value, tone, hint }: { icon: LucideIcon; label: string; value: number | undefined; tone: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 px-3.5 py-3 ring-1 ring-inset ring-slate-200/70">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[0.78125rem] font-medium text-slate-500">{label}</span>
        <Icon className={cn('h-4 w-4 shrink-0', tone)} />
      </div>
      {value === undefined ? <Skeleton className="mt-1.5 h-6 w-12 rounded-lg" /> : <p className="mt-0.5 text-[1.25rem] font-bold tabular-nums text-slate-900">{value}</p>}
      {hint && <p className="truncate text-[0.6875rem] text-slate-500">{hint}</p>}
    </div>
  );
}

function ProductChannelSummary({ id, data, facts, setTab }: { id: string; data: WebsiteOverview; facts: ChannelFacts; setTab: (t: ChannelTab) => void }) {
  const [exportOpen, setExportOpen] = useState(false);
  const summaryQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'summary', id], queryFn: () => onlineProductsApi.summary(id), staleTime: 30_000 });
  const channelsQ = useQuery({ queryKey: [ONLINE_PRODUCTS_KEY, 'channels'], queryFn: onlineProductsApi.channels, staleTime: 30_000 });
  const s = summaryQ.data;
  const ch = channelsQ.data?.channels.find((c) => c.id === id);
  const href = `/online-store/products?channel=${id}`;
  const canExport = facts.automatic && (facts.kind === 'shopify' || facts.kind === 'woocommerce');
  const manualSite = !facts.automatic && (facts.kind === 'shopify' || facts.kind === 'woocommerce');
  const lastSync = ch?.lastSyncAt ?? data.stats?.lastSyncAt ?? null;

  return (
    <div className="space-y-4">
      {!facts.automatic && (
        <Alert tone="warning" title={tr('{{name}} abhi automatic nahi jura', { name: facts.name })}
          action={<Button size="xs" onClick={() => setTab('setup')} leftIcon={<Wrench className="h-3.5 w-3.5" />}>{tr('Setup kholein')}</Button>}>
          {facts.kind === 'daraz'
            ? tr('Daraz se jorne ke baad products ki list aur stock khud chalte hain.')
            : tr('Automatic jorne par {{name}} ke products ki list Nafaa me khud aati hai aur stock khud jata hai. Tab tak neeche CSV se kaam chalayein.', { name: facts.name })}
        </Alert>
      )}

      <section className={cn(panel, 'p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center gap-3">
          <BrandLogo name={facts.brand} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{tr('{{name}} par Nafaa ke products', { name: facts.name })}</h2>
            <p className="text-[0.75rem] text-slate-500">
              {s ? tr('{{linked}} jure hue, {{all}} Nafaa products me se', { linked: s.linked, all: s.all }) : tr('Ginti aa rahi hai…')}
              {lastSync ? tr(' · aakhri sync {{lastSync}}', { lastSync: timeAgo(lastSync) }) : ''}
              {ch?.lastSyncStatus === 'FAILED' ? tr(' · aakhri sync me masla') : ''}
            </p>
          </div>
          <Link to={href} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg shadow-sm transition hover:bg-brand-700">
            {tr('Online products me kholein')}{' '} <ArrowRight className="h-4 w-4 rtl-flip" />
          </Link>
        </div>
        {s && s.all > 0 && (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-success-500" style={{ width: `${Math.round((s.linked / s.all) * 100)}%` }} />
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <Tile icon={Link2} label={tr('Jure hue')} value={s?.linked} tone="text-success-600" />
          <Tile icon={Link2Off} label={tr('Jorna baqi')} value={s?.unlinked} tone="text-slate-400" />
          <Tile icon={AlertTriangle} label={tr('Masle')} value={s?.errors} tone="text-rose-600" hint={s?.errors ? tr('Sync nahi hua') : undefined} />
          <Tile icon={BadgeDollarSign} label={tr('Price farq')} value={s?.price} tone="text-amber-600" />
          <Tile icon={PackageX} label={tr('Stock khatam')} value={s?.out} tone="text-rose-600" />
        </div>
        {summaryQ.isError && (
          <p className="mt-3 flex items-center gap-2 text-[0.8125rem] text-rose-700">
            {tr('Ginti nahi aayi.')}{' '} <button type="button" onClick={() => summaryQ.refetch()} className="inline-flex items-center gap-1 font-semibold underline"><RefreshCw className="h-3.5 w-3.5" /> {' '}{tr('Dobara')}</button>
          </p>
        )}
        <p className="mt-3 text-[0.78125rem] text-slate-500">
          {tr('Products jorna, har channel ki price, stock buffer aur "Sync abhi" — sab channels ke liye ek hi jagah, Online products me.')}
        </p>
      </section>

      {canExport && (
        <section className={panel}>
          <button type="button" onClick={() => setExportOpen((v) => !v)} aria-expanded={exportOpen}
            className="flex w-full items-center gap-3 px-4 py-4 text-start sm:px-5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><CloudUpload className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold text-slate-900">{tr('Nafaa ke products {{name}} par banayein', { name: facts.name })}</span>
              <span className="block text-[0.75rem] text-slate-500">{tr('Jo product Nafaa me hai par {{name}} par nahi — naam, price, tasveer aur stock ke saath ban jata hai, aur khud jur jata hai', { name: facts.name })}</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', exportOpen && 'rotate-180')} />
          </button>
          {exportOpen && <div className="border-t border-slate-100 pt-3"><NafaaUnlisted channelId={id} siteName={facts.name} onDone={() => summaryQ.refetch()} /></div>}
        </section>
      )}

      {manualSite && (
        <section className={panel}>
          <PanelHead title={tr('Products — CSV')} hint={tr('{{name}} ki CSV yahan daalein, ya Nafaa ki CSV {{name}} ke import me', { name: facts.name })} />
          <div className="p-4 sm:p-5"><ProductSyncCard channelId={id} productLinks={data.stats?.productLinks ?? 0} platform={data.integration!.config.platform} /></div>
        </section>
      )}
    </div>
  );
}

/** Own website: links made so far, plus CSV. */
function WebsiteProducts({ id, data }: { id: string; data: WebsiteOverview }) {
  const q = useQuery({ queryKey: ['channel-catalog', id], queryFn: () => onlineOrdersApi.catalog(id), staleTime: 60_000 });
  const links = q.data?.links ?? [];
  return (
    <div className="space-y-4">
      <section className={cn(panel, 'p-4 sm:p-5')}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success-50 text-success-700"><PackageCheck className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[0.9375rem] font-semibold text-slate-900">{q.data ? tr('{{count}} product jure hue', { count: links.length }) : tr('Jore hue products')}</h2>
            <p className="text-[0.75rem] text-slate-500">{tr('Website ka order aata hai to Nafaa inhi links se product pehchanta hai. Naya product pehli dafa Accept par ek dafa chunein — aage se khud.')}</p>
          </div>
        </div>
      </section>
      {q.isLoading ? <Skeleton className="h-40 rounded-3xl" /> : q.isError ? (
        <Alert tone="danger" title={tr('Products nahi khule')} action={<Button size="xs" onClick={() => q.refetch()}>{tr('Dobara')}</Button>} />
      ) : (
        <CustomLinks channelId={id} links={links} onDone={() => q.refetch()} />
      )}
      <section className={panel}>
        <PanelHead title={tr('Products — CSV')} hint={tr('Website ki CSV yahan daalein, ya Nafaa ki CSV website ke import me')} />
        <div className="p-4 sm:p-5"><ProductSyncCard channelId={id} productLinks={data.stats?.productLinks ?? 0} platform={data.integration!.config.platform} /></div>
      </section>
    </div>
  );
}
