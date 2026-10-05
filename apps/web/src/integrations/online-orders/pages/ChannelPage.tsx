import { CustomConnect } from '../components/website/CustomConnect';
import { DarazChannelCard } from '../components/daraz/Daraz';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, Circle, ExternalLink, KeyRound, Loader2, MoreHorizontal,
  Pause, Play, RefreshCw, Send, ShoppingBag, Trash2, TriangleAlert, Wrench, Zap,
} from 'lucide-react';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';
import { apiErrorMessage, onlineOrdersApi, type WebsiteConfig, type WebsiteOverview } from '../api/online-orders.api';
import { CHANNELS_KEY, channelMeta, useSalesChannels } from '../hooks/useSalesChannels';
import { useChannelConnect } from '../hooks/useWooConnect';
import { ConnectGuide, type Platform } from '../components/website/ConnectGuides';
import { ProductSyncCard } from '../components/website/ProductSyncCard';
import { CopyField } from '../components/website/CopyField';
import { HttpsNotice } from '../components/website/ManualKeysForm';
import { ProductLinker } from '../components/products/ProductLinker';
import { Badge, Banner, Btn, Card, ChannelAvatar, EmptyState, Field, Page, SettingRow, Stat, Tabs, Toggle, inputCls } from '../components/ui/kit';
import { STATUS_LABEL, rs, timeAgo, whenText } from '../lib/labels';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   SALES CHANNEL — ek website/store ka poora control
   Overview · Products · Settings · Developer · Activity
   ═════════════════════════════════════════════════════════════ */

type Tab = 'overview' | 'products' | 'settings' | 'developer' | 'activity';

/** Purana /online-store/website — pehle channel par, ya jorne ke safhe par */
export function WebsiteRedirect() {
  const { data, isLoading } = useSalesChannels();
  if (isLoading) return <div className="h-48 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />;
  const first = data?.find((c) => c.isWebsite);
  return <Navigate to={first ? `/online-store/channels/${first.id}` : '/online-store/connect'} replace />;
}

export default function ChannelPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'overview';
  const setTab = (t: Tab) => { const n = new URLSearchParams(params); n.set('tab', t); setParams(n, { replace: true }); };
  const qc = useQueryClient();
  const key = ['sales-channel', id];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => onlineOrdersApi.channel(id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.connected && !q.state.data.stats?.lastOrderAt ? 10_000 : 30_000),
  });
  const set = (d: WebsiteOverview) => { qc.setQueryData(key, d); qc.invalidateQueries({ queryKey: CHANNELS_KEY }); };

  useEffect(() => {
    if (params.get('connected') === '1') {
      toast.success('🎉 Jur gaya! Ab products jorein');
      const n = new URLSearchParams(params); n.delete('connected'); n.set('tab', 'products'); setParams(n, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        <div className="grid gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}</div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </div>
    );
  }
  if (error || !data?.integration) {
    return (
      <Page title="Channel nahi mila" narrow>
        <Card>
          <EmptyState icon={<TriangleAlert className="h-5 w-5" />} title="Ye channel nahi khula" action={<>
            <Btn onClick={() => refetch()} icon={<RefreshCw className="h-4 w-4" />}>Dobara</Btn>
            <Link to="/online-store/connect"><Btn variant="primary">Website jorein</Btn></Link>
          </>}>{apiErrorMessage(error, 'Shayad hata diya gaya')}</EmptyState>
        </Card>
      </Page>
    );
  }

  return <Channel key={id} id={id} data={data} onChange={set} tab={tab} setTab={setTab} />;
}

function Channel({ id, data, onChange, tab, setTab }: {
  id: string; data: WebsiteOverview; onChange: (d: WebsiteOverview) => void; tab: Tab; setTab: (t: Tab) => void;
}) {
  const navigate = useNavigate();
  const i = data.integration!;
  const cfg = i.config;
  const stats = data.stats!;
  const meta = channelMeta(i.type);
  const platform: Platform = i.type === 'WOOCOMMERCE' ? 'woocommerce' : i.type === 'SHOPIFY' ? 'shopify' : (cfg.platform === 'shopify' ? 'shopify' : cfg.platform === 'woocommerce' || cfg.platform === 'wordpress' ? 'woocommerce' : 'custom');
  const automatic = !!i.woo?.connected || !!i.shopify?.connected || !!i.daraz?.connected || !!i.indolj?.connected;
  const needsReinstall = !!i.shopify?.needsReinstall;
  const paused = !i.isActive;
  const receiving = !!stats.lastOrderAt || i.webhookVerified || automatic;
  const ordersLink = `/online-orders?channel=${id}`;
  const errors = data.logs.filter((l) => !l.ok).length;

  const status = paused ? { tone: 'neutral' as const, text: 'Band' }
    : needsReinstall ? { tone: 'critical' as const, text: 'Dobara install chahiye' }
      : i.indolj?.connected && !stats.lastOrderAt ? { tone: 'info' as const, text: 'Jura hua · pehle order ka intezar' }
      : receiving ? { tone: 'success' as const, text: 'Live' }
        : { tone: 'warning' as const, text: 'Jorna baqi' };

  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(id),
    onSuccess: (r) => toast.success('Test order aa gaya', {
      description: 'Accept karein → bill + stock kam. Cancel karein → stock wapas.',
      action: { label: 'Dekho', onClick: () => navigate(`/online-orders?order=${r.channelOrderId}`) },
    }),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Page
      back={{ to: '/online-store/channels', label: 'Sales channels' }}
      icon={<ChannelAvatar emoji={meta.emoji} color={meta.color} size={44} />}
      title={i.displayName}
      badge={<Badge tone={status.tone} dot>{status.text}</Badge>}
      subtitle={<span className="inline-flex flex-wrap items-center gap-x-2">
        <span>{meta.label}{automatic ? ' · automatic' : ' · manual'}</span>
        {cfg.siteUrl && <a href={cfg.siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">{cfg.siteUrl.replace(/^https?:\/\//, '')} <ExternalLink className="h-3 w-3" /></a>}
      </span>}
      actions={<>
        <Btn variant="secondary" loading={test.isPending} onClick={() => test.mutate()} icon={<Send className="h-4 w-4" />}>Test order</Btn>
        <Link to={ordersLink}><Btn variant="primary" icon={<ShoppingBag className="h-4 w-4" />}>Orders{stats.pendingOrders ? ` (${stats.pendingOrders})` : ''}</Btn></Link>
        <MoreMenu id={id} data={data} onChange={onChange} />
      </>}
      tabs={<Tabs value={tab} onChange={setTab} items={[
        { value: 'overview', label: 'Overview' },
        { value: 'products', label: 'Products', count: stats.productLinks, tone: 'success' },
        { value: 'settings', label: 'Settings' },
        ...(i.type === 'DARAZ' ? [] : [{ value: 'developer' as Tab, label: automatic ? 'Developer' : 'Setup & keys' }]),
        { value: 'activity', label: 'Activity', count: errors, tone: 'critical' },
      ]} />}
    >
      {paused && (
        <Banner tone="neutral" icon={<Pause className="h-4 w-4 text-slate-500" />} title="Channel band hai"
          action={<ResumeButton id={id} onChange={onChange} />}>Website par order ho to bhi Nafaa me nahi aayega.</Banner>
      )}
      {data.publicApi && !data.publicApi.reachable && i.type !== 'CUSTOM_WEBSITE' && (
        <HttpsNotice compact reason={data.publicApi.reason} fix={data.publicApi.fix} />
      )}

      {tab === 'overview' && <Overview id={id} data={data} platform={platform} onChange={onChange} setTab={setTab} />}
      {tab === 'products' && <ProductLinker channelId={id} siteName={meta.label === 'Website' ? 'Website' : meta.label} />}
      {tab === 'settings' && <SettingsTab id={id} cfg={cfg} name={i.displayName} platform={platform} automatic={automatic} onChange={onChange} />}
      {tab === 'developer' && <DeveloperTab id={id} data={data} platform={platform} automatic={automatic} onChange={onChange} />}
      {tab === 'activity' && <ActivityTab logs={data.logs} />}
    </Page>
  );
}

/* ═════════════════════ OVERVIEW ═════════════════════ */

function Overview({ id, data, platform, onChange, setTab }: {
  id: string; data: WebsiteOverview; platform: Platform; onChange: (d: WebsiteOverview) => void; setTab: (t: Tab) => void;
}) {
  const i = data.integration!;
  const stats = data.stats!;
  const automatic = !!i.woo?.connected || !!i.shopify?.connected;
  const oneClickType = i.type === 'WOOCOMMERCE' || i.type === 'SHOPIFY';

  const { data: orders } = useQuery({
    queryKey: ['online-orders', 'channel-recent', id],
    queryFn: () => onlineOrdersApi.list({ integrationId: id, limit: 5 }),
    refetchInterval: 30_000,
  });

  const steps = [
    { label: 'Channel bana', done: true, tab: 'developer' as Tab },
    { label: i.indolj?.connected ? 'Indolj se jora (menu + orders)' : i.type === 'DARAZ' ? 'Daraz se jora' : oneClickType ? `${platform === 'shopify' ? 'Shopify' : 'WooCommerce'} se jora (automatic)` : 'Website se jora', done: !!i.daraz?.connected || !!i.indolj?.connected || automatic || !!stats.lastOrderAt || i.webhookVerified, tab: (oneClickType || i.type === 'DARAZ' ? 'overview' : 'developer') as Tab },
    { label: 'Products jore', done: stats.productLinks > 0, tab: 'products' as Tab },
    { label: 'Pehla order aaya', done: (stats.totalOrders ?? 0) > 0, tab: 'overview' as Tab },
    ...(i.type === 'DARAZ' || i.indolj?.connected ? [] : [{ label: 'Status website ko jata hai', done: automatic || !!i.config.statusWebhookUrl, tab: 'settings' as Tab }]),
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Aaj ke orders" value={stats.todayOrders ?? 0} />
          <Stat label="Naye (accept karne)" value={stats.pendingOrders ?? 0} tone={(stats.pendingOrders ?? 0) > 0 ? 'attention' : undefined} />
          <Stat label="Kul orders" value={stats.totalOrders ?? 0} hint={stats.lastOrderAt ? `aakhri ${timeAgo(stats.lastOrderAt)}` : undefined} />
          <Stat label="Jure products" value={stats.productLinks} hint={stats.lastSyncAt ? `stock sync ${timeAgo(stats.lastSyncAt)}` : undefined} />
        </div>

        {i.type === 'DARAZ' ? (
          <DarazChannelCard id={id} data={data} />
        ) : i.indolj?.connected ? (
          <IndoljChannelCard data={data} setTab={setTab} />
        ) : oneClickType ? (
          <ConnectionCard id={id} data={data} platform={platform as 'woocommerce' | 'shopify'} onChange={onChange} setTab={setTab} />
        ) : (
          <CustomConnect channelId={id} data={data} onChange={onChange} />
        )}

        <Card title="Haal ke orders" flush actions={<Link to={`/online-orders?channel=${id}`}><Btn size="sm" variant="plain">Sab dekho</Btn></Link>}>
          {!orders?.items.length ? (
            <EmptyState icon={<ShoppingBag className="h-5 w-5" />} title="Abhi koi order nahi">Website par order hote hi yahan aayega aur ghanti bajegi.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
              {orders.items.map((o) => {
                const st = STATUS_LABEL[o.orderStatus as keyof typeof STATUS_LABEL] ?? STATUS_LABEL.PENDING;
                return (
                  <li key={o.id}>
                    <Link to={`/online-orders?order=${o.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 sm:px-5">
                      <span className="w-20 shrink-0 text-[13px] font-semibold text-slate-900 dark:text-white">#{o.externalOrderNumber ?? o.externalOrderId}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-600 dark:text-slate-300">{o.customerName} · {o.items.length} item</span>
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold', st.tone)}>{st.short}</span>
                      <span className="w-24 text-right text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">{rs(o.total)}</span>
                      <span className="hidden w-24 text-right text-[12px] text-slate-500 sm:block">{timeAgo(o.receivedAt)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <aside className="space-y-4">
        <Card title="Setup" actions={<span className="text-[12.5px] font-semibold tabular-nums text-slate-500">{done}/{steps.length}</span>}>
          <div className="-mt-1 mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ul className="space-y-1">
            {steps.map((s) => (
              <li key={s.label}>
                <button onClick={() => setTab(s.tab)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  {s.done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="h-4 w-4 shrink-0 text-slate-300" />}
                  <span className={cn('text-[13px]', s.done ? 'text-slate-500 line-through' : 'font-medium text-slate-900 dark:text-white')}>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Stock ka hisaab">
          <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
            Stock ka malik <b>Nafaa</b> hai. Jore hue product ka stock <b>{i.config.shopId ? 'chuni hui branch' : 'main branch'}</b> se website par jata hai —
            har 15 minute, aur har accept/cancel par foran. Jo order accept nahi hua, us ka maal pehle hi minus hota hai.
          </p>
        </Card>
      </aside>
    </div>
  );
}

/** WooCommerce / Shopify — automatic ya manual, aur us ki sehat */
function ConnectionCard({ id, data, platform, onChange, setTab }: {
  id: string; data: WebsiteOverview; platform: 'woocommerce' | 'shopify'; onChange: (d: WebsiteOverview) => void; setTab: (t: Tab) => void;
}) {
  const i = data.integration!;
  const qc = useQueryClient();
  const name = platform === 'shopify' ? 'Shopify' : 'WooCommerce';
  const auto = platform === 'shopify' ? i.shopify : i.woo;
  const connected = !!auto?.connected;
  const needsReinstall = platform === 'shopify' && !!i.shopify?.needsReinstall;
  const [site, setSite] = useState(platform === 'shopify'
    ? (i.shopify?.shop ?? i.config.siteUrl ?? '').replace(/^https?:\/\//, '').replace('.myshopify.com', '')
    : i.config.siteUrl ?? '');
  const conn = useChannelConnect(platform, () => { onlineOrdersApi.channel(id).then(onChange).catch(() => null); });

  const repair = useMutation({
    mutationFn: () => (platform === 'shopify' ? onlineOrdersApi.shopifyRepair(id) : onlineOrdersApi.wooRepair(id)),
    onSuccess: () => { toast.success('Connection check ho gaya — Activity dekhein'); qc.invalidateQueries({ queryKey: ['sales-channel', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const sync = useMutation({
    mutationFn: () => (platform === 'shopify' ? onlineOrdersApi.shopifySyncStock(id) : onlineOrdersApi.wooSyncStock(id)),
    onSuccess: (r) => { toast.success(`Stock sync: ${r.updated} update${r.missing ? ` · ${r.missing} jore nahi` : ''}`); qc.invalidateQueries({ queryKey: ['sales-channel', id] }); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const start = () => conn.start({ siteUrl: site.trim(), channelId: id, displayName: i.displayName });

  return (
    <Card title="Connection" description={connected ? `Automatic — ${name} aur Nafaa khud baat karte hain` : `${name} se jorein — automatic sab se aasaan hai`}>
      {needsReinstall && (
        <div className="mb-3">
          <Banner tone="critical" title={`${name} ko ek dafa dobara install karein`}
            action={<Btn size="sm" variant="primary" loading={conn.phase === 'starting'} onClick={start}>Dobara install</Btn>}>
            {name} ne naya token maanga hai. Dobara install se sab chal padega — koi data nahi mitega.
          </Banner>
        </div>
      )}

      {connected && conn.phase !== 'waiting' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{name} se jura hai</div>
              <div className="truncate text-[12.5px] text-slate-500">
                {platform === 'shopify' ? i.shopify?.shop : i.config.siteUrl}
                {platform === 'shopify' && i.shopify?.locationName ? ` · stock location: ${i.shopify.locationName}` : ''}
                {auto?.connectedAt ? ` · ${whenText(auto.connectedAt)} se` : ''}
              </div>
            </div>
            <Btn size="sm" loading={sync.isPending} onClick={() => sync.mutate()} icon={<RefreshCw className="h-3.5 w-3.5" />}>Stock sync abhi</Btn>
            <Btn size="sm" loading={repair.isPending} onClick={() => repair.mutate()} icon={<Wrench className="h-3.5 w-3.5" />}>Check</Btn>
            <Btn size="sm" variant="plain" loading={conn.phase === 'starting'} onClick={start}>Dobara {platform === 'shopify' ? 'install' : 'approve'}</Btn>
          </div>
          <ul className="mt-3 grid gap-2 text-[12.5px] text-slate-600 dark:text-slate-300 sm:grid-cols-3">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Orders khud aate hain</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {platform === 'shopify' ? 'Fulfillment + tracking wapas' : 'Status wapas website par'}</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Stock har 15 minute</li>
          </ul>
        </>
      ) : conn.phase === 'waiting' ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
          <div className="min-w-0 flex-1 text-[13px] font-medium text-slate-900 dark:text-white">
            {name} window me "{platform === 'shopify' ? 'Install' : 'Approve'}" dabayein…
          </div>
          <Btn size="sm" onClick={() => conn.reopen()} icon={<ExternalLink className="h-3.5 w-3.5" />}>Window dobara kholo</Btn>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border-2 border-slate-900 p-4 dark:border-white">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">Automatic</span>
              <Badge tone="success">Recommended</Badge>
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500">Popup me {name} kholein, {platform === 'shopify' ? 'Install' : 'Approve'} dabayein — baaqi sab Nafaa khud.</p>
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input value={site} onChange={(e) => setSite(e.target.value)} placeholder={platform === 'shopify' ? 'nafaa-test' : 'ahmedstore.pk'}
                  className={cn(inputCls, platform === 'shopify' && 'pr-28')} />
                {platform === 'shopify' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">.myshopify.com</span>}
              </div>
              <Btn variant="primary" loading={conn.phase === 'starting'} disabled={!site.trim() || !conn.oneClickReady} onClick={start}>Jorein</Btn>
            </div>
            {conn.error && <p className="mt-2 text-[12.5px] text-rose-600">{conn.error}</p>}
            {conn.phase === 'denied' && <p className="mt-2 text-[12.5px] text-rose-600">Ijazat nahi di gayi — dobara koshish karein.</p>}
            {!conn.oneClickReady && conn.publicApi && <p className="mt-2 text-[12px] text-amber-700">{conn.publicApi.reason}</p>}
          </div>
          <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">Manual</span>
            </div>
            <p className="mt-1 text-[12.5px] text-slate-500">
              {platform === 'shopify' ? 'Shopify admin me webhook URL khud paste karein.' : 'WooCommerce ki REST keys, Nafaa plugin, ya webhook khud lagayein.'}
            </p>
            <Btn className="mt-3" onClick={() => setTab('developer')}>Manual setup kholo</Btn>
          </div>
        </div>
      )}
      {conn.phase === 'manual' && <div className="mt-3"><HttpsNotice reason={conn.hint?.reason} fix={conn.hint?.fix} /></div>}
    </Card>
  );
}

/* ═════════════════════ SETTINGS ═════════════════════ */

function SettingsTab({ id, cfg, name, platform, automatic, onChange }: {
  id: string; cfg: WebsiteConfig; name: string; platform: Platform; automatic: boolean; onChange: (d: WebsiteOverview) => void;
}) {
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const shopList: any[] = Array.isArray(shops) ? shops : (shops as any)?.items ?? [];
  const [displayName, setDisplayName] = useState(name);
  const [statusUrl, setStatusUrl] = useState(cfg.statusWebhookUrl ?? '');
  const [shopifySecret, setShopifySecret] = useState(cfg.shopifySecret ?? '');

  const save = useMutation({
    mutationFn: (patch: Partial<WebsiteConfig> & { displayName?: string }) => onlineOrdersApi.updateChannel(id, patch),
    onSuccess: (d) => { onChange(d); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const testHook = useMutation({
    mutationFn: () => onlineOrdersApi.testStatusWebhook(id),
    onSuccess: (r) => (r.ok ? toast.success('Website ne jawab diya ✓') : toast.error(r.error ?? 'Jawab nahi aaya')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="text-[13px] text-slate-500 lg:pt-4">
        <div className="font-semibold text-slate-900 dark:text-white">Order aane par</div>
        Kitna kaam Nafaa khud kare.
      </div>
      <Card>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <SettingRow title="Order aate hi khud accept" help="Bill aur stock khud. Stock kam ho ya product na jura ho to order 'Naya' me ruk jata hai."
            control={<Toggle checked={cfg.autoAccept} onChange={(v) => save.mutate({ autoAccept: v })} />} />
          <SettingRow title="Accept par receipt kholo" help="Accept dabate hi receipt ka safha (POS auto-print on ho to print bhi)."
            control={<Toggle checked={cfg.autoPrint} onChange={(v) => save.mutate({ autoPrint: v })} />} />
        </div>
      </Card>

      <div className="text-[13px] text-slate-500 lg:pt-4">
        <div className="font-semibold text-slate-900 dark:text-white">Stock aur qeemat</div>
        Kis branch ka maal, bill me kaun si qeemat.
      </div>
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Stock kis branch se" help="Isi branch ka stock kam hoga aur website ko isi ka dikhega.">
            <select value={cfg.shopId ?? ''} onChange={(e) => save.mutate({ shopId: e.target.value || null })} className={inputCls}>
              <option value="">Main branch</option>
              {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Bill me qeemat" help="Website par offer chal raha ho to 'Website wali' rakhein.">
            <select value={cfg.priceSource} onChange={(e) => save.mutate({ priceSource: e.target.value as any })} className={inputCls}>
              <option value="WEBSITE">Website wali (jo customer ne di)</option>
              <option value="NAFAA">Nafaa wali (POS ki qeemat)</option>
            </select>
          </Field>
        </div>
        {automatic && (platform === 'woocommerce' || platform === 'shopify') && (
          <div className="mt-4 border-t border-slate-100 pt-2 dark:border-slate-800">
            <SettingRow title="Nafaa ki qeemat website par bhi"
              help="Nafaa me product ki qeemat badlein → jore hue product ki website qeemat 1-2 minute me khud badle. Website par sale/offer chalate hon to band rakhein."
              control={<Toggle checked={!!cfg.pushPrice} onChange={(v) => save.mutate({ pushPrice: v })} />} />
            <SettingRow title="Stock khud website par" help="POS par sale, purchase ya adjustment → website ka stock 15-60 second me update (hamesha chalu)."
              control={<span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">Chalu ✓</span>} />
          </div>
        )}
      </Card>

      <div className="text-[13px] text-slate-500 lg:pt-4">
        <div className="font-semibold text-slate-900 dark:text-white">Website ko status</div>
        Accept, raste me, deliver, cancel.
      </div>
      <Card>
        {automatic ? (
          <div className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span className="flex-1">
              Khud ho raha hai — koi URL nahi chahiye.{' '}
              {platform === 'shopify'
                ? 'Accept par tag, raste me par fulfillment + tracking (customer ko Shopify email), deliver par Delivered, cancel par order cancel.'
                : 'Accept par Processing, deliver par Completed, cancel par Cancelled, aur customer ko "raste me" note.'}
            </span>
            <Btn size="sm" variant="plain" loading={testHook.isPending} onClick={() => testHook.mutate()}>Check</Btn>
          </div>
        ) : (
          <Field label="Status URL (Nafaa → website)" help="Nafaa is URL par har status badalne par POST karega (signed). Nafaa plugin ise khud set karta hai.">
            <div className="flex flex-wrap gap-2">
              <input value={statusUrl} onChange={(e) => setStatusUrl(e.target.value)} placeholder="https://meri-website.com/nafaa-status" className={cn(inputCls, 'min-w-[220px] flex-1')} />
              <Btn loading={save.isPending} onClick={() => save.mutate({ statusWebhookUrl: statusUrl.trim() || null })}>Save</Btn>
              <Btn variant="plain" loading={testHook.isPending} disabled={!cfg.statusWebhookUrl} onClick={() => testHook.mutate()}>Test</Btn>
            </div>
          </Field>
        )}
      </Card>

      <div className="text-[13px] text-slate-500 lg:pt-4">
        <div className="font-semibold text-slate-900 dark:text-white">Hifazat aur naam</div>
      </div>
      <Card>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <SettingRow title="Sirf signed orders" help="Bina signature wala order reject. Automatic connection aur plugin khud sign karte hain."
            control={<Toggle checked={cfg.requireSignature} onChange={(v) => save.mutate({ requireSignature: v })} />} />
          {platform === 'shopify' && !automatic && (
            <div className="py-3">
              <Field label="Shopify webhook signing key" help="Shopify → Settings → Notifications → Webhooks ke neeche wali key.">
                <div className="flex gap-2">
                  <input value={shopifySecret} onChange={(e) => setShopifySecret(e.target.value)} className={inputCls} />
                  <Btn loading={save.isPending} onClick={() => save.mutate({ shopifySecret })}>Save</Btn>
                </div>
              </Field>
            </div>
          )}
          <div className="pt-3">
            <Field label="Channel ka naam" help="Sidebar aur orders me yahi dikhta hai.">
              <div className="flex max-w-lg gap-2">
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
                <Btn disabled={!displayName.trim() || displayName === name} loading={save.isPending} onClick={() => save.mutate({ displayName })}>Save</Btn>
              </div>
            </Field>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═════════════════════ DEVELOPER / SETUP ═════════════════════ */

function DeveloperTab({ id, data, platform, automatic, onChange }: {
  id: string; data: WebsiteOverview; platform: Platform; automatic: boolean; onChange: (d: WebsiteOverview) => void;
}) {
  const i = data.integration!;
  const tenantName = useAuthStore((s) => s.tenant?.name) ?? 'Meri dukaan';
  const rotate = useMutation({
    mutationFn: () => onlineOrdersApi.rotateKeys(id),
    onSuccess: (d) => { onChange(d); toast.success(automatic ? 'Nayi key ban gayi — webhooks khud shift ho gaye' : 'Nayi key ban gayi — website/plugin me nayi daalein'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-4">
      {!automatic && (
        <Card title="Manual setup" description="Automatic nahi chahiye ya nahi chal raha? Yahan se khud jorein.">
          <ConnectGuide platform={platform} overview={data} shopName={tenantName} channelId={id} onChange={onChange} />
        </Card>
      )}

      <Card title="Keys" description="Sirf apni website, plugin ya developer ko dein. Key galat haath lage to foran nayi banayein."
        actions={<Btn size="sm" variant="critical" loading={rotate.isPending} icon={<RefreshCw className="h-3.5 w-3.5" />}
          onClick={() => { if (confirm('Nayi key banayein? Purani foran band ho jayegi.')) rotate.mutate(); }}>Nayi key</Btn>}>
        <div className="grid gap-3 md:grid-cols-2">
          <CopyField label="Nafaa key" value={i.apiKey} secret />
          <CopyField label="Secret" value={i.webhookSecret} secret />
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <CopyField label="Orders API (POST)" value={data.urls.orders} />
          {data.urls.hook && <CopyField label="Webhook URL (WooCommerce/Shopify)" value={data.urls.hook} secret />}
        </div>
      </Card>

      <Card title="Products — CSV" description="API ke bagair bhi: website ki CSV yahan daalein, ya Nafaa ki CSV website ke import me.">
        <ProductSyncCard channelId={id} productLinks={data.stats?.productLinks ?? 0} platform={i.config.platform} />
      </Card>
    </div>
  );
}

/* ═════════════════════ ACTIVITY ═════════════════════ */

function ActivityTab({ logs }: { logs: WebsiteOverview['logs'] }) {
  const [f, setF] = useState<'all' | 'err'>('all');
  const rows = useMemo(() => logs.filter((l) => f === 'all' || !l.ok), [logs, f]);
  return (
    <Card flush title="Activity" description="Website se aane aur jaane wali har request — ghalti ho to wajah yahin likhi hoti hai"
      actions={<div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {(['all', 'err'] as const).map((k) => (
          <button key={k} onClick={() => setF(k)} className={cn('h-7 rounded-md px-2.5 text-[12.5px] font-semibold', f === k ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500')}>
            {k === 'all' ? `Sab ${logs.length}` : `Ghaltiyan ${logs.filter((l) => !l.ok).length}`}
          </button>
        ))}
      </div>}>
      {rows.length === 0 ? (
        <EmptyState icon={<Activity className="h-5 w-5" />} title="Abhi kuch nahi">Test order bhejein — pehli line yahan aayegi.</EmptyState>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          {rows.map((l) => (
            <li key={l.id} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
              <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md', l.kind === 'IN' ? 'bg-sky-50 text-sky-600 dark:bg-sky-500/10' : 'bg-violet-50 text-violet-600 dark:bg-violet-500/10')}>
                {l.kind === 'IN' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12.5px] font-semibold text-slate-900 dark:text-white">{l.label}</span>
                  <Badge tone={l.ok ? 'success' : 'critical'}>{l.ok ? 'Theek' : 'Ghalti'}</Badge>
                </div>
                {l.error && <div className="mt-0.5 break-words text-[12.5px] text-rose-600">{l.error}</div>}
              </div>
              <span className="shrink-0 text-[12px] text-slate-500" title={whenText(l.at)}>{timeAgo(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ═════════════════════ MENU ═════════════════════ */

function ResumeButton({ id, onChange }: { id: string; onChange: (d: WebsiteOverview) => void }) {
  const m = useMutation({ mutationFn: () => onlineOrdersApi.resume(id), onSuccess: (d) => { onChange(d); toast.success('Channel chalu'); } });
  return <Btn size="sm" variant="primary" loading={m.isPending} onClick={() => m.mutate()} icon={<Play className="h-3.5 w-3.5" />}>Chalu karo</Btn>;
}

function MoreMenu({ id, data, onChange }: { id: string; data: WebsiteOverview; onChange: (d: WebsiteOverview) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const i = data.integration!;
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const pause = useMutation({
    mutationFn: () => (i.isActive ? onlineOrdersApi.pause(id) : onlineOrdersApi.resume(id)),
    onSuccess: (d) => { onChange(d); setOpen(false); toast.success(d.integration?.isActive ? 'Channel chalu' : 'Channel band — naye orders nahi aayenge'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => onlineOrdersApi.removeChannel(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success(r.archived ? 'Channel hata diya — purane orders aur bills mehfooz' : 'Channel hata diya');
      navigate('/online-store/channels');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div ref={ref} className="relative">
      <Btn variant="secondary" onClick={() => setOpen((v) => !v)} icon={<MoreHorizontal className="h-4 w-4" />} aria-label="Aur" />
      {open && (
        <div className="absolute right-0 z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <button onClick={() => pause.mutate()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800">
            {i.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {i.isActive ? 'Channel band karo' : 'Channel chalu karo'}
          </button>
          <button onClick={() => { if (confirm(`"${i.displayName}" hata dein? Naye orders aana band ho jayenge. Purane orders aur bills mehfooz rahenge.`)) remove.mutate(); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4" /> Channel hatao
          </button>
        </div>
      )}
    </div>
  );
}

/** Indolj par bani website — jura hua haal (code / developer wale raaste ki zaroorat nahi) */
/** Multi-branch: har branch ka apna order URL — Indolj har branch ke webhook par usi ka URL lagaye */
function BranchUrls({ ordersUrl }: { ordersUrl: string }) {
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const list = (Array.isArray(shops) ? shops : (shops as any)?.items ?? []) as Array<{ id: string; name: string; isActive?: boolean }>;
  const active = list.filter((s) => s.isActive !== false);
  if (active.length <= 1) {
    return (
      <div className="mt-3">
        <CopyField label="Indolj ke liye order URL (POS webhook)" value={ordersUrl} hint="Indolj ko ye URL dein — live orders aur cancel status dono isi par" />
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[12.5px] text-slate-600 dark:text-slate-300">
        <b>Har branch ka apna URL</b> — Indolj har branch ke webhook par usi branch ka URL lagaye. Order, bill aur stock usi branch me jayega.
      </p>
      {active.map((s) => (
        <CopyField key={s.id} label={`${s.name} — order URL`} value={`${ordersUrl}?branch=${s.id}`} />
      ))}
      <p className="text-[12px] text-slate-500">Branch ke baghair wala URL bhi chalta hai — tab order is channel ki apni branch (Settings) me aata hai.</p>
    </div>
  );
}

function IndoljChannelCard({ data, setTab }: { data: WebsiteOverview; setTab: (t: Tab) => void }) {
  const i = data.integration!;
  const stats = data.stats!;
  const ordersUrl = i.apiKey ? `${data.urls.base}/orders/${i.apiKey}` : data.urls.orders;
  return (
    <Card title={<span className="flex items-center gap-2">🍪 Indolj se jura hua <Badge tone="success" dot>Menu sync</Badge></span>}
      description="Website Indolj par hai — menu Nafaa me aata hai aur Indolj har naya order seedha Nafaa ko bhejta hai.">
      <ul className="space-y-2 text-[13px] text-slate-700 dark:text-slate-200">
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Menu jura — <b>{stats.productLinks}</b> item Nafaa products se jure <button type="button" onClick={() => setTab('products')} className="font-semibold text-emerald-700 hover:underline">dekhein</button></li>
        <li className="flex items-center gap-2">
          {stats.lastOrderAt
            ? <><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> Orders aa rahe hain — aakhri {timeAgo(stats.lastOrderAt)}</>
            : <><Circle className="h-4 w-4 shrink-0 text-amber-500" /> Indolj se pehle live order ka intezar — Indolj ki team ne webhook neeche wale URL par lagana hai</>}
        </li>
      </ul>
      <BranchUrls ordersUrl={ordersUrl} />
      {i.indolj?.connectedAt && <p className="mt-2 text-[12px] text-slate-500">Indolj {whenText(i.indolj.connectedAt)} jora</p>}
    </Card>
  );
}
