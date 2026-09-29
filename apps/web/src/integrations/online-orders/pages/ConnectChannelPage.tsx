import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Lock, Package, Send, XCircle, Zap } from 'lucide-react';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteType } from '../api/online-orders.api';
import { useChannelConnect } from '../hooks/useWooConnect';
import { CHANNELS_KEY, channelMeta, channelPath, useSalesChannels } from '../hooks/useSalesChannels';
import { HttpsNotice, ManualKeysForm } from '../components/website/ManualKeysForm';
import { Badge, Btn, Card, Field, Page, inputCls } from '../components/ui/kit';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   SALES CHANNEL JOREIN — Google Search Console jaisa:
   1. Platform  2. Tareeqa (Automatic / Manual)  3. Details → Jorein
   ═════════════════════════════════════════════════════════════ */

type Platform = 'woocommerce' | 'shopify' | 'custom';
type Method = 'auto' | 'manual';

const PLATFORMS: { key: Platform; type: WebsiteType; name: string; desc: string }[] = [
  { key: 'woocommerce', type: 'WOOCOMMERCE', name: 'WordPress / WooCommerce', desc: 'WordPress par bani dukaan' },
  { key: 'shopify', type: 'SHOPIFY', name: 'Shopify', desc: 'myshopify.com store' },
  { key: 'custom', type: 'CUSTOM_WEBSITE', name: 'Apni banayi website', desc: 'Developer ne khud banayi' },
];

export default function ConnectChannelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initial = params.get('platform') as Platform | null;
  const [platform, setPlatform] = useState<Platform>(initial && PLATFORMS.some((p) => p.key === initial) ? initial : 'woocommerce');
  const [method, setMethod] = useState<Method>('auto');
  const [site, setSite] = useState(params.get('shop')?.replace('.myshopify.com', '') ?? '');
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const shopList: any[] = Array.isArray(shops) ? shops : (shops as any)?.items ?? [];
  const { data: channels } = useSalesChannels();

  const conn = useChannelConnect(platform === 'shopify' ? 'shopify' : 'woocommerce');
  const autoAvailable = platform !== 'custom' && (platform !== 'shopify' || conn.shopifyOAuth);
  const effectiveMethod: Method = autoAvailable ? method : 'manual';
  const shortName = platform === 'shopify' ? 'Shopify' : platform === 'woocommerce' ? 'WooCommerce' : 'website';
  const typeOf = PLATFORMS.find((p) => p.key === platform)!.type;

  useEffect(() => { conn.reset(); }, [platform, method]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useMutation({
    mutationFn: () => onlineOrdersApi.createChannel({
      type: typeOf,
      displayName: name.trim() || undefined,
      shopId: shopId || undefined,
      siteUrl: platform === 'shopify' && site.trim() ? `${site.trim().replace('.myshopify.com', '')}.myshopify.com` : site.trim() || undefined,
    }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success('Channel ban gaya — ab setup ke steps');
      navigate(`/online-store/channels/${d.integration!.id}?tab=developer`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const submit = () => {
    if (effectiveMethod === 'auto') {
      if (!site.trim()) return toast.error(platform === 'shopify' ? 'Store ka naam daalein — jaise nafaa-test' : 'Website ka address daalein — jaise ahmedstore.pk');
      conn.start({ siteUrl: site.trim(), displayName: name.trim() || undefined, shopId: shopId || undefined });
    } else {
      create.mutate();
    }
  };

  const busy = conn.phase === 'starting' || create.isPending;
  const showForm = !['waiting', 'denied', 'connected', 'manual'].includes(conn.phase);

  return (
    <Page back={{ to: '/online-store/channels', label: 'Sales channels' }} title="Sales channel jorein"
      subtitle="Website ke orders Nafaa me — ghanti, bill, stock aur status khud.">
      {channels && channels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
          Pehle se jure:
          {channels.map((c) => (
            <Link key={c.id} to={channelPath(c)} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {channelMeta(c.type).emoji} {c.displayName}
              <span className={cn('h-1.5 w-1.5 rounded-full', c.live ? 'bg-emerald-500' : 'bg-slate-300')} />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {/* ─── 1. Platform ─── */}
          <Card title={<Step n={1}>Website kis par bani hai?</Step>}>
            <div className="grid gap-2 sm:grid-cols-3">
              {PLATFORMS.map((p) => {
                const m = channelMeta(p.type);
                const on = platform === p.key;
                return (
                  <button key={p.key} onClick={() => setPlatform(p.key)}
                    className={cn('flex items-start gap-3 rounded-lg border p-3 text-left transition',
                      on ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700')}>
                    <span className="text-xl">{m.emoji}</span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">{p.name}</span>
                      <span className="block text-[12px] text-slate-500">{p.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ─── 2. Tareeqa ─── */}
          <Card title={<Step n={2}>Kaise jorna hai?</Step>}>
            <div className="grid gap-2 sm:grid-cols-2">
              <MethodCard active={effectiveMethod === 'auto'} disabled={!autoAvailable} onClick={() => setMethod('auto')}
                icon={<Zap className="h-4 w-4" />} title="Automatic" badge={autoAvailable ? <Badge tone="success">Recommended</Badge> : undefined}
                desc={platform === 'custom' ? 'Apni banayi website ke liye automatic nahi hota'
                  : platform === 'shopify' && !conn.shopifyOAuth ? 'Server par Shopify app ki keys nahi lagi'
                    : `Popup me ${shortName} khulega, ${platform === 'shopify' ? 'Install' : 'Approve'} dabayein — keys, webhooks aur stock sync Nafaa khud karta hai.`} />
              <MethodCard active={effectiveMethod === 'manual'} onClick={() => setMethod('manual')}
                icon={<KeyRound className="h-4 w-4" />} title="Manual"
                desc={platform === 'custom' ? 'Developer ko tayyar code aur key dein — 15 minute ka kaam.'
                  : platform === 'shopify' ? 'Shopify admin me webhook URL khud paste karein.'
                    : 'REST keys, Nafaa plugin, ya WooCommerce webhook khud lagayein.'} />
            </div>
          </Card>

          {/* ─── 3. Details / halat ─── */}
          <Card title={<Step n={3}>{effectiveMethod === 'auto' ? `${shortName} se jorein` : 'Channel banayein'}</Step>}>
            {conn.phase === 'connected' && conn.channelId ? (
              <Connected channelId={conn.channelId} name={shortName} />
            ) : conn.phase === 'waiting' ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{shortName} window me "{platform === 'shopify' ? 'Install' : 'Approve'}" dabayein</div>
                  <div className="text-[12.5px] text-slate-500">Login nahi hain to pehle {shortName} login maangega. Window khud band hogi.</div>
                </div>
                <Btn size="sm" onClick={() => conn.reopen()} icon={<ExternalLink className="h-3.5 w-3.5" />}>Window dobara</Btn>
                <Btn size="sm" variant="plain" onClick={() => conn.reopen(true)}>Isi tab me</Btn>
              </div>
            ) : conn.phase === 'denied' ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 text-center dark:border-rose-500/30 dark:bg-rose-500/5">
                <XCircle className="mx-auto h-8 w-8 text-rose-500" />
                <div className="mt-2 text-[13.5px] font-semibold text-slate-900 dark:text-white">Ijazat nahi di gayi</div>
                <Btn className="mt-3" onClick={() => conn.reset()}>Dobara koshish</Btn>
              </div>
            ) : conn.phase === 'manual' && conn.channelId ? (
              <div className="space-y-3">
                <HttpsNotice reason={conn.hint?.reason} fix={conn.hint?.fix} />
                {platform === 'woocommerce' && <ManualKeysForm channelId={conn.channelId} site={site} />}
              </div>
            ) : null}

            {showForm && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label={platform === 'shopify' ? 'Store ka naam' : 'Website ka address'}
                      help={platform === 'shopify' ? 'Shopify admin URL me jo naam hai: admin.shopify.com/store/<naam>' : platform === 'custom' ? 'Optional — sirf pehchan ke liye' : undefined}>
                      <div className="relative">
                        <input autoFocus value={site} onChange={(e) => setSite(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !busy) submit(); }}
                          placeholder={platform === 'shopify' ? 'nafaa-test' : 'ahmedstore.pk'}
                          className={cn(inputCls, 'h-10', platform === 'shopify' && 'pr-32')} />
                        {platform === 'shopify' && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-slate-400">.myshopify.com</span>}
                      </div>
                    </Field>
                  </div>
                  <Field label="Naam (optional)" help="Sidebar me yahi dikhega">
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="jaise Ahmed Store" className={inputCls} />
                  </Field>
                  <Field label="Stock kis branch se" help="Isi branch ka stock website par jayega">
                    <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={inputCls}>
                      <option value="">Main branch</option>
                      {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </Field>
                </div>
                {effectiveMethod === 'auto' && conn.publicApi && !conn.publicApi.reachable && (
                  <HttpsNotice compact reason={conn.publicApi.reason} fix={conn.publicApi.fix} />
                )}
                {conn.error && <p className="text-[12.5px] text-rose-600">{conn.error}</p>}
                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Btn variant="primary" loading={busy} onClick={submit}
                    icon={effectiveMethod === 'auto' ? <span>{channelMeta(typeOf).emoji}</span> : undefined}>
                    {effectiveMethod === 'auto' ? `${shortName} se jorein` : 'Channel banao aur steps dekho'}
                  </Btn>
                  {effectiveMethod === 'auto' && (
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><Lock className="h-3.5 w-3.5" /> Password Nafaa tak nahi aata</span>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title={effectiveMethod === 'auto' ? 'Jorne ke baad khud' : 'Manual me'}>
            <ul className="space-y-2.5 text-[13px] text-slate-600 dark:text-slate-300">
              {(effectiveMethod === 'auto'
                ? ['Webhooks khud lagte hain — har naya order Nafaa me', 'Naye order par ghanti aur sidebar me ginti', 'Accept → bill, receipt, stock kam', `Status wapas ${shortName} par${platform === 'shopify' ? ' (fulfillment + tracking)' : ''}`, 'Stock har 15 minute, accept/cancel par foran', 'Products tab me har variant jorna']
                : ['Aap ko Key aur Secret milte hain', platform === 'custom' ? 'Developer ke liye PHP/Node/Python code' : platform === 'shopify' ? 'Shopify me webhook URL paste' : 'Plugin, REST keys ya webhook', 'Test order se poora flow check', 'Baad me Automatic par badal sakte hain']
              ).map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {t}</li>
              ))}
            </ul>
          </Card>
          <Card title="Kaun si ijazat">
            <ul className="space-y-1.5 text-[12.5px] text-slate-600 dark:text-slate-300">
              <li>✓ Orders dekhna aur status badalna</li>
              <li>✓ Products aur stock</li>
              <li className="text-slate-400">✗ Password ya payment details — kabhi nahi</li>
            </ul>
          </Card>
        </aside>
      </div>
    </Page>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{n}</span>
      {children}
    </span>
  );
}

function MethodCard({ active, disabled, onClick, icon, title, badge, desc }: {
  active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title: string; badge?: React.ReactNode; desc: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
        active ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 hover:border-slate-400 dark:border-slate-700')}>
      <div className="flex items-center gap-2">
        <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', active ? 'border-slate-900 dark:border-white' : 'border-slate-300')}>
          {active && <span className="h-2 w-2 rounded-full bg-slate-900 dark:bg-white" />}
        </span>
        {icon}
        <span className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{title}</span>
        {badge}
      </div>
      <p className="mt-1.5 pl-6 text-[12.5px] text-slate-500">{desc}</p>
    </button>
  );
}

function Connected({ channelId, name }: { channelId: string; name: string }) {
  const navigate = useNavigate();
  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(channelId),
    onSuccess: (r) => navigate(`/online-orders?order=${r.channelOrderId}`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-5 text-center dark:border-emerald-500/30 dark:bg-emerald-500/5">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <div className="mt-2 text-[16px] font-semibold text-slate-900 dark:text-white">{name} jur gaya</div>
      <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">Webhooks lag gaye aur stock sync shuru. Ab products jorein — har variant ke saath.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Btn variant="primary" onClick={() => navigate(`/online-store/channels/${channelId}?tab=products`)} icon={<Package className="h-4 w-4" />}>Products jorein</Btn>
        <Btn loading={test.isPending} onClick={() => test.mutate()} icon={<Send className="h-4 w-4" />}>Test order</Btn>
        <Btn variant="plain" onClick={() => navigate(`/online-store/channels/${channelId}`)}>Channel kholo</Btn>
      </div>
    </div>
  );
}
