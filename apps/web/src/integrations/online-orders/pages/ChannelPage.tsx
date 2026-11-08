/**
 * Sales channel page: one connected store (Shopify, WooCommerce, Daraz,
 * Indolj or an own website) with its numbers, products, settings, setup
 * guide and activity log.
 *
 * Tabs: Overview (with the "Kya kya hota hai" card) · Products · Settings
 * (every control, status mapping, Sync now) · Setup · Activity (server-paged
 * sync + webhook log) (?tab=…).
 * "?connected=1" (after an install or approve) opens Products once.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, BookOpen, ExternalLink, LayoutDashboard, MoreHorizontal, Package, Pause, Play, RefreshCw, Send,
  Settings2, ShoppingBag, Trash2, TriangleAlert, Wrench,
} from 'lucide-react';
import {
  Alert, Button, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useAuthStore } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../api/online-orders.api';
import { CHANNELS_KEY, useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { HttpsNotice } from '../components/website/ManualKeysForm';
import { ChannelOverview, panel } from '../components/channel/ChannelOverview';
import { ChannelProducts } from '../components/channel/ChannelProducts';
import { ShopifyPlanAlert } from '../components/channel/ShopifyPlanAlert';
import { ChannelSettings, useChannelLifecycle } from '../components/channel/ChannelSettings';
import { ChannelSetup } from '../components/channel/ChannelSetup';
import { ChannelActivity } from '../components/channel/ChannelActivity';
import { channelOpsApi } from '../api/channel-ops.api';
import { bareUrl, channelFacts, type ChannelTab } from '../components/channel/meta';
import { t as tr } from '@core/i18n';

const TABS: ChannelTab[] = ['overview', 'products', 'settings', 'setup', 'activity'];

/** Old /online-store/website link: the first website channel, or the connect page. */
export function WebsiteRedirect() {
  const { data, isLoading } = useSalesChannels();
  if (isLoading) return <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />;
  const first = data?.find((c) => c.isWebsite);
  return <Navigate to={first ? `/online-store/channels/${first.id}` : '/online-store/connect'} replace />;
}

export default function ChannelPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  // "developer" was the Setup tab's old name; keep old links working.
  const tab: ChannelTab = raw === 'developer' ? 'setup' : TABS.includes(raw as ChannelTab) ? (raw as ChannelTab) : 'overview';
  const setTab = (t: ChannelTab) => { const n = new URLSearchParams(params); n.set('tab', t); setParams(n, { replace: true }); };
  const qc = useQueryClient();
  const key = ['sales-channel', id];

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => onlineOrdersApi.channel(id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.connected && !q.state.data.stats?.lastOrderAt ? 10_000 : 30_000),
  });
  const set = (d: WebsiteOverview) => { qc.setQueryData(key, d); qc.invalidateQueries({ queryKey: CHANNELS_KEY }); };

  useEffect(() => {
    if (params.get('connected') === '1') {
      toast.success(tr('Jur gaya! Ab products jorein'));
      const n = new URLSearchParams(params); n.delete('connected'); n.set('tab', 'products'); setParams(n, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-11 w-96 max-w-full rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><Skeleton className="h-72 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>
      </PageShell>
    );
  }
  if (error || !data?.integration) {
    return (
      <PageShell>
        <PageHero back="/online-store/channels" backLabel={tr('Sales channels')} title={tr('Channel nahi mila')} />
        <div className={cn(panel, 'px-6 py-14 text-center')}>
          <TriangleAlert className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{tr('Ye channel nahi khula')}</p>
          <p className="mt-1 text-sm text-slate-500">{apiErrorMessage(error, tr('Shayad hata diya gaya'))}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>{tr('Dobara')}</Button>
            <Link to="/online-store/channels"><Button>{tr('Sales channels')}</Button></Link>
          </div>
        </div>
      </PageShell>
    );
  }
  if ((data.integration.type as string) === 'FOODPANDA') return <Navigate to="/online-store/foodpanda" replace />;

  return <Channel key={id} id={id} data={data} onChange={set} tab={tab} setTab={setTab} busy={isFetching} />;
}

function Channel({ id, data, onChange, tab, setTab, busy }: {
  id: string; data: WebsiteOverview; onChange: (d: WebsiteOverview) => void; tab: ChannelTab; setTab: (t: ChannelTab) => void; busy: boolean;
}) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const i = data.integration!;
  const stats = data.stats!;
  const viaParam = params.get('via');
  const via: 'indolj' | 'custom' = viaParam === 'indolj' || (!viaParam && i.indolj?.connected) ? 'indolj' : 'custom';
  const setVia = (v: 'indolj' | 'custom') => { const n = new URLSearchParams(params); n.set('via', v); setParams(n, { replace: true }); };
  const facts0 = channelFacts(i, i.type === 'CUSTOM_WEBSITE' ? via : null);
  const facts = facts0;
  // Own-app Shopify connections are managed by the shop's own app: never ask for a reinstall.
  const needsReinstall = !!i.shopify?.needsReinstall && !facts0.ownApp;
  // App Store install: the connection waits for a Shopify plan
  const planNeeded = !facts0.ownApp && !!i.shopify?.connected && i.shopify.billing === 'shopify' && !i.shopify.planActive;
  const paused = !i.isActive;
  const receiving = !!stats.lastOrderAt || i.webhookVerified || facts.automatic;
  const errors = data.logs.filter((l) => !l.ok).length;
  const siteUrl = facts.kind === 'shopify' && i.shopify?.shop ? `https://${i.shopify.shop}` : i.config.siteUrl;

  const shopId = useAuthStore((s) => s.currentShopId);
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000 });
  const branchName = ((Array.isArray(shops) ? shops : (shops as any)?.items ?? []) as Array<{ id: string; name: string }>).find((s) => s.id === shopId)?.name ?? tr('is branch');

  const status = paused ? { variant: 'default' as const, text: tr('Band') }
    : needsReinstall ? { variant: 'danger' as const, text: tr('Dobara install chahiye') }
      : planNeeded ? { variant: 'warning' as const, text: tr('Shopify plan chahiye') }
      : facts.kind === 'daraz' && i.daraz?.error ? { variant: 'danger' as const, text: tr('Rabta toota') }
        : facts.kind === 'indolj' && facts.automatic && !stats.lastOrderAt ? { variant: 'info' as const, text: tr('Pehle order ka intezar') }
          : receiving ? { variant: 'success' as const, text: tr('Live') }
            : { variant: 'warning' as const, text: tr('Jorna baqi') };

  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(id),
    onSuccess: (r) => toast.success(tr('Test order aa gaya'), {
      description: tr('Accept karein → bill + stock kam. Cancel karein → stock wapas.'),
      action: { label: tr('Dekhein'), onClick: () => navigate(`/online-orders?order=${r.channelOrderId}`) },
    }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const ordersLink = `/online-orders?channel=${id}`;
  const meta = [facts.name, facts.ownApp ? tr('apni app') : facts.automatic ? 'automatic' : facts.kind === 'custom' ? tr('apni website') : 'manual'].join(' · ');

  return (
    <PageShell>
      <PageHero
        back="/online-store/channels"
        backLabel={tr('Sales channels')}
        title={<span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name={facts.brand} size={30} title={facts.name} /><span className="truncate">{i.displayName}</span></span>}
        chip={<><span className={cn('h-2 w-2 rounded-full', status.variant === 'success' ? 'bg-success-400' : status.variant === 'danger' ? 'bg-rose-400' : status.variant === 'warning' ? 'bg-amber-400' : 'bg-slate-300')} />{status.text}</>}
        busy={busy}
        meta={<span className="inline-flex flex-wrap items-center gap-x-2">{meta}
          {siteUrl && <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">{bareUrl(siteUrl)} <ExternalLink className="h-3 w-3" /></a>}
        </span>}
        actions={<>
          <button type="button" className={heroButton} disabled={test.isPending} onClick={() => test.mutate()} title={tr('Ek nakli order bhej kar poora flow check karein')}>
            <Send className="h-4 w-4" /><span className="hidden sm:inline">{test.isPending ? tr('Bhej rahe…') : tr('Test order')}</span>
          </button>
          <Link to={ordersLink} className={heroPrimaryButton} aria-label={tr('Orders')}><ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">{tr('Orders')}</span>{stats.pendingOrders ? <span className="tabular-nums">({stats.pendingOrders})</span> : null}</Link>
          <MoreMenu id={id} data={data} siteUrl={siteUrl} onChange={onChange} setTab={setTab} />
        </>}
        stats={[
          { label: tr('Aaj ke orders'), value: stats.todayOrders ?? 0 },
          { label: tr('Naye (accept karne)'), value: stats.pendingOrders ?? 0 },
          { label: tr('Kul orders'), value: stats.totalOrders ?? 0, hint: stats.lastOrderAt ? tr('aakhri {{lastOrderAt}}', { lastOrderAt: timeAgo(stats.lastOrderAt) }) : undefined },
          { label: tr('Jure items'), value: stats.productLinks, hint: stats.lastSyncAt ? tr('sync {{lastSyncAt}}', { lastSyncAt: timeAgo(stats.lastSyncAt) }) : undefined },
        ]}
      />

      {paused && (
        <Alert tone="warning" icon={<Pause className="h-4 w-4 text-amber-600" />} title={tr('Channel band hai')}
          action={<ResumeButton id={id} onChange={onChange} />}>
          {tr('{{name}} par order ho to bhi Nafaa me nahi aayega.', { name: facts.name })}
        </Alert>
      )}
      {planNeeded && !paused && !needsReinstall && <ShopifyPlanAlert id={id} onChange={onChange} />}
      {needsReinstall && !paused && tab !== 'setup' && (
        <Alert tone="danger" title={tr('Shopify ko ek dafa dobara install karein')}
          action={<Button size="xs" onClick={() => setTab('setup')}>{tr('Setup kholein')}</Button>}>
          {tr('Shopify ne nayi ijazat maangi hai. Tab tak orders aur stock ruke reh sakte hain — koi data nahi mitega.')}
        </Alert>
      )}
      {data.publicApi && !data.publicApi.reachable && (facts.kind === 'shopify' || facts.kind === 'woocommerce') && !facts.automatic && (
        <HttpsNotice compact reason={data.publicApi.reason} fix={data.publicApi.fix} />
      )}

      <ViewTabs value={tab} onChange={setTab}
        tabs={[
          { id: 'overview', label: tr('Overview'), icon: LayoutDashboard },
          { id: 'products', label: tr('Products'), icon: Package },
          { id: 'settings', label: tr('Settings'), icon: Settings2 },
          { id: 'setup', label: tr('Setup'), icon: Wrench },
          { id: 'activity', label: tr('Activity'), icon: Activity, count: errors || null },
        ]} />

      {tab === 'overview' && <ChannelOverview id={id} data={data} facts={facts} setTab={setTab} branchName={branchName} />}
      {tab === 'products' && <ChannelProducts id={id} data={data} facts={facts} setTab={setTab} />}
      {tab === 'settings' && <ChannelSettings key={i.id} id={id} data={data} facts={facts} onChange={onChange} />}
      {tab === 'setup' && <ChannelSetup id={id} data={data} facts={facts} onChange={onChange} setTab={setTab} via={via} setVia={setVia} />}
      {tab === 'activity' && <ChannelActivity id={id} name={facts.name} />}
    </PageShell>
  );
}

/* ─── Header menu ─── */

function ResumeButton({ id, onChange }: { id: string; onChange: (d: WebsiteOverview) => void }) {
  const m = useMutation({
    mutationFn: () => onlineOrdersApi.resume(id),
    onSuccess: (d) => { onChange(d); toast.success(tr('Channel chalu')); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return <Button size="xs" loading={m.isPending} onClick={() => m.mutate()} leftIcon={<Play className="h-3.5 w-3.5" />}>{tr('Chalu karein')}</Button>;
}

// Menu items set their own text colour: inside the page header the inherited colour is the header's (often white).
const item = 'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-start text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50';

function MoreMenu({ id, data, siteUrl, onChange, setTab }: {
  id: string; data: WebsiteOverview; siteUrl: string | null; onChange: (d: WebsiteOverview) => void; setTab: (t: ChannelTab) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const i = data.integration!;
  const life = useChannelLifecycle(id, onChange);
  const qc = useQueryClient();
  // Missed orders from the last 3 days, then stock and prices (same as Settings → Sync).
  const sync = useMutation({
    mutationFn: () => channelOpsApi.syncNow(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['sales-channel', id] });
      qc.invalidateQueries({ queryKey: ['channel-logs', id] });
      toast.success(tr('Sync ho gaya'), {
        description: r.orders ? tr('{{seen}} orders dekhe, {{created}} naye, {{updated}} ka status badla', r.orders) : undefined,
      });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [open]);
  const go = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div ref={ref} className="relative">
      <button type="button" className={heroIconButton} onClick={() => setOpen((v) => !v)} aria-label={tr('Aur')} aria-haspopup="menu" aria-expanded={open}>
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 z-40 mt-1.5 w-60 rounded-2xl bg-white p-1.5 text-slate-700 shadow-xl ring-1 ring-slate-200">
          <button type="button" role="menuitem" className={item} onClick={go(() => setTab('setup'))}><BookOpen className="h-4 w-4 text-slate-400" /> {' '}{tr('Setup guide')}</button>
          <button type="button" role="menuitem" className={item} onClick={go(() => setTab('settings'))}><Settings2 className="h-4 w-4 text-slate-400" /> {' '}{tr('Settings')}</button>
          {['SHOPIFY', 'WOOCOMMERCE', 'DARAZ'].includes(i.type) && (
            <button type="button" role="menuitem" className={item} disabled={sync.isPending || !i.isActive} onClick={go(() => sync.mutate())}>
              <RefreshCw className="h-4 w-4 text-slate-400" /> {' '}{sync.isPending ? tr('Sync ho raha…') : tr('Sync now')}
            </button>
          )}
          {siteUrl && <a role="menuitem" className={item} href={siteUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><ExternalLink className="h-4 w-4 text-slate-400" /> {' '}{tr('Store kholein')}</a>}
          <div className="my-1 border-t border-slate-100" />
          <button type="button" role="menuitem" className={item} disabled={life.toggle.isPending} onClick={go(() => life.toggle.mutate(!i.isActive))}>
            {i.isActive ? <Pause className="h-4 w-4 text-slate-400" /> : <Play className="h-4 w-4 text-slate-400" />} {i.isActive ? tr('Channel band karein') : tr('Channel chalu karein')}
          </button>
          <button type="button" role="menuitem" className={cn(item, 'text-rose-700 hover:bg-rose-50')} onClick={go(() => life.askRemove(i.displayName))}>
            <Trash2 className="h-4 w-4" /> {' '}{tr('Channel hatayein')}
          </button>
        </div>
      )}
    </div>
  );
}
