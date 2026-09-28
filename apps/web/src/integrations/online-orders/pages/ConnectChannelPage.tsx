import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Bell, Boxes, CheckCircle2, ExternalLink, Globe, KeyRound, Loader2, Lock, Package, Receipt,
  RefreshCw, Send, ShieldCheck, Sparkles, XCircle, Zap,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteType } from '../api/online-orders.api';
import { PlatformPicker, type Platform } from '../components/website/ConnectGuides';
import { useChannelConnect } from '../hooks/useWooConnect';
import { HttpsNotice, ManualKeysForm } from '../components/website/ManualKeysForm';
import { CHANNELS_KEY, channelMeta, useSalesChannels } from '../hooks/useSalesChannels';
import { Faq, Step, input } from './WebsiteConnectPage';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   SALES CHANNEL JOREIN  (Shopify ke "Add sales channel" jaisa)
   ─────────────────────────────────────────────────────────────
   WooCommerce: site ka URL → popup me WordPress → Approve → bas.
                Keys, webhooks, stock sync — sab Nafaa khud.
   Shopify / apni website: ek click me channel, phir guide.
   ═════════════════════════════════════════════════════════════ */

const TYPE_OF: Record<Platform, WebsiteType> = { woocommerce: 'WOOCOMMERCE', shopify: 'SHOPIFY', custom: 'CUSTOM_WEBSITE' };

export default function ConnectChannelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const initial = (params.get('platform') as Platform) || 'woocommerce';
  const [platform, setPlatform] = useState<Platform>(['woocommerce', 'shopify', 'custom'].includes(initial) ? initial : 'woocommerce');
  const [site, setSite] = useState('');
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const shopList: any[] = Array.isArray(shops) ? shops : (shops as any)?.items ?? [];
  const { data: channels } = useSalesChannels();

  // WooCommerce "Approve" aur Shopify "Install" — dono ka ek hi popup wala tareeqa
  const woo = useChannelConnect(platform === 'shopify' ? 'shopify' : 'woocommerce');
  const shopifyOneClick = platform === 'shopify' && woo.shopifyOAuth;
  const oneClick = platform === 'woocommerce' || shopifyOneClick;
  const pName = platform === 'shopify' ? 'Shopify' : 'WooCommerce';

  const create = useMutation({
    mutationFn: () => onlineOrdersApi.createChannel({
      type: TYPE_OF[platform],
      displayName: name.trim() || undefined,
      shopId: shopId || undefined,
      siteUrl: site.trim() || undefined,
    }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success('🎉 Channel ban gaya — ab jorne ke steps');
      navigate(`/online-store/channels/${d.integration!.id}`);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const go = () => {
    if (oneClick) {
      if (!site.trim()) {
        return toast.error(platform === 'shopify' ? 'Shopify store ka naam daalein — jaise nafaa-test' : 'Website ka address daalein — jaise ahmedstore.pk');
      }
      woo.start({ siteUrl: site.trim(), displayName: name.trim() || undefined, shopId: shopId || undefined });
    } else {
      create.mutate();
    }
  };

  useEffect(() => { woo.reset(); }, [platform]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = woo.phase === 'starting' || create.isPending;

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-10">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-6 sm:p-8 lg:p-10 shadow-2xl">
        <div className="absolute -top-24 -right-20 h-80 w-80 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-sky-300/15 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] items-center">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
              <Globe className="h-3.5 w-3.5 text-emerald-300" /> Sales channel jorein
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.05]">Apni website Nafaa se jorein</h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base font-bold text-white/85">
              WooCommerce par sirf <b>Approve</b> dabana hai — keys, webhooks aur stock sync Nafaa khud karta hai.
              Jitni websites chahein jorein, har ek sidebar me apne naam se.
            </p>
          </div>
          <ConnectVisual platform={platform} phase={woo.phase} />
        </div>
      </section>

      {channels && channels.length > 0 && (
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-500 mr-1">Pehle se jure:</span>
          {channels.map((c) => (
            <Link key={c.id} to={c.isWebsite ? `/online-store/channels/${c.id}` : `/online-orders?channel=${c.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-black text-slate-700 dark:text-slate-200 hover:border-emerald-400 transition">
              <span>{channelMeta(c.type).emoji}</span> {c.displayName}
              <span className={cn('h-1.5 w-1.5 rounded-full', c.live ? 'bg-emerald-500' : 'bg-slate-300')} />
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-6">
          <Step n={1} title="Website kis par bani hai?" sub="Isi hisab se jorne ka tareeqa">
            <PlatformPicker value={platform} onChange={setPlatform} />
          </Step>

          {woo.phase === 'connected' ? (
            <ConnectedCard channelId={woo.channelId!} name={pName} />
          ) : woo.phase === 'manual' && woo.channelId ? (
            <div className="space-y-3">
              <HttpsNotice reason={woo.hint?.reason} fix={woo.hint?.fix} />
              {platform === 'woocommerce' ? (
                <ManualKeysForm channelId={woo.channelId} site={site} />
              ) : (
                <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4 text-[12px] font-bold text-slate-600 dark:text-slate-300">
                  Local test ke liye ngrok ka address Shopify Dev dashboard → app → naya version → <b>Allowed redirection URL(s)</b> me bhi daalein:
                  <code className="mt-2 block rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1 font-mono">https://&lt;ngrok&gt;/api/integrations/shopify/callback</code>
                </div>
              )}
            </div>
          ) : woo.phase === 'waiting' || woo.phase === 'denied' ? (
            <WaitingCard platform={platform === 'shopify' ? 'shopify' : 'woocommerce'} phase={woo.phase} onReopen={woo.reopen} onRetry={() => woo.reset()} channelId={woo.channelId} site={site} />
          ) : (
            <>
              <Step n={2}
                title={platform === 'woocommerce' ? 'Website ka address' : platform === 'shopify' ? 'Shopify store ka naam' : 'Website ka naam'}
                sub={platform === 'woocommerce' ? 'Jahan aap ki WooCommerce dukaan hai'
                  : platform === 'shopify' ? 'Shopify admin ke URL me jo naam hai — admin.shopify.com/store/<naam>' : 'Sirf aap ki pehchan ke liye'}>
                <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
                  {platform === 'woocommerce' ? (
                    <div className="relative sm:col-span-2">
                      <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input autoFocus value={site} onChange={(e) => setSite(e.target.value)} placeholder="ahmedstore.pk"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !busy) go(); }}
                        className={cn(input, 'h-12 pl-10 text-base')} />
                    </div>
                  ) : platform === 'shopify' ? (
                    <div className="relative sm:col-span-2 flex items-center">
                      <span className="absolute left-3.5 text-base">🟢</span>
                      <input autoFocus value={site} onChange={(e) => setSite(e.target.value)} placeholder="nafaa-test"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !busy) go(); }}
                        className={cn(input, 'h-12 pl-10 pr-36 text-base')} />
                      <span className="pointer-events-none absolute right-3.5 text-sm font-bold text-slate-400">.myshopify.com</span>
                    </div>
                  ) : (
                    <input autoFocus value={site} onChange={(e) => setSite(e.target.value)}
                      placeholder="meri-website.com (optional)"
                      className={cn(input, 'h-12 sm:col-span-2')} />
                  )}
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (optional) — jaise Ahmed Store" className={cn(input, 'h-11')} />
                  <select value={shopId} onChange={(e) => setShopId(e.target.value)} className={cn(input, 'h-11')}>
                    <option value="">Stock: main branch se</option>
                    {shopList.map((s) => <option key={s.id} value={s.id}>Stock: {s.name}</option>)}
                  </select>
                </div>
              </Step>

              <Step n={3} title={oneClick ? `${pName} se jorein` : 'Channel banayein'}
                sub={platform === 'woocommerce'
                  ? 'Chhoti window me aap ki WordPress site khulegi — login karke "Approve" dabayein'
                  : shopifyOneClick
                    ? 'Chhoti window me Shopify khulega — login karke "Install" dabayein'
                    : 'Key aur secret ban jayenge, agle safhe par jorne ke steps'}>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xl" variant="success" loading={busy} onClick={go}
                    leftIcon={oneClick ? <span className="text-lg">{platform === 'shopify' ? '🟢' : '🟣'}</span> : undefined}
                    rightIcon={<ArrowRight className="h-5 w-5" />}>
                    {platform === 'woocommerce' ? (woo.oneClickReady ? 'WooCommerce se jorein' : 'Keys se jorein')
                      : shopifyOneClick ? 'Shopify se jorein' : 'Channel banayein'}
                  </Button>
                  {oneClick && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                      <Lock className="h-3.5 w-3.5" /> Password Nafaa tak nahi aata — sirf aap ki ijazat
                    </span>
                  )}
                </div>
                {oneClick && !woo.publicApi?.reachable && woo.publicApi && (
                  <div className="mt-3"><HttpsNotice compact reason={woo.publicApi?.reason} fix={woo.publicApi?.fix} /></div>
                )}
                {woo.phase === 'error' && woo.error && (
                  <div className="mt-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 text-[12px] font-bold text-rose-800 dark:text-rose-200">
                    {woo.error}
                  </div>
                )}
              </Step>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="font-black text-slate-900 dark:text-white">
              {oneClick ? `${platform === 'shopify' ? 'Install' : 'Approve'} ke baad khud ho jata hai` : 'Aap ko kya milega'}
            </h3>
            <div className="mt-3 space-y-2.5">
              {(oneClick
                ? [
                    { icon: Zap, t: 'Webhooks khud lag jate hain', s: 'Order bana, badla, cancel — sab Nafaa me' },
                    { icon: Bell, t: 'Har order par ghanti', s: 'Sidebar me naye orders ki ginti' },
                    { icon: Boxes, t: 'Stock har 15 minute', s: 'Accept/cancel par foran bhi' },
                    { icon: Receipt, t: 'Status wapas website par', s: 'Raste me, deliver — customer ko dikhe' },
                    { icon: Package, t: 'Products 1 click dono taraf', s: 'Import aur export' },
                  ]
                : [
                    { icon: Bell, t: 'Order aate hi alert', s: 'Ghanti aur desktop notification' },
                    { icon: Receipt, t: 'Khud bill aur receipt', s: 'Dobara type karne ki zaroorat nahi' },
                    { icon: Boxes, t: 'Stock hamesha sahi', s: 'Dukaan aur website ka ek hi stock' },
                    { icon: ShieldCheck, t: 'Mehfooz connection', s: 'Har website ki apni key aur secret' },
                  ]).map((b) => (
                <div key={b.t} className="flex items-start gap-3">
                  <span className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0"><b.icon className="h-4 w-4" /></span>
                  <div>
                    <div className="text-sm font-black text-slate-900 dark:text-white">{b.t}</div>
                    <div className="text-[11px] font-bold text-slate-500">{b.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <Faq />
        </aside>
      </div>
    </div>
  );
}

/* ─── Hero ka nakhsha: Nafaa ⇄ platform ─── */
function ConnectVisual({ platform, phase }: { platform: Platform; phase: string }) {
  const p = platform === 'woocommerce' ? { e: '🟣', n: 'WooCommerce' } : platform === 'shopify' ? { e: '🟢', n: 'Shopify' } : { e: '💻', n: 'Aap ki website' };
  const live = phase === 'connected';
  return (
    <div className="rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6">
      <div className="flex items-center justify-between gap-3">
        <Logo label="Nafaa" emoji="🟩" />
        <div className="relative flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
          <div className={cn('absolute inset-y-0 left-0 rounded-full bg-emerald-300 transition-all duration-700',
            live ? 'w-full' : phase === 'waiting' ? 'w-2/3 animate-pulse' : 'w-1/4')} />
        </div>
        <Logo label={p.n} emoji={p.e} />
      </div>
      <div className="mt-5 grid gap-2 text-[12px] font-bold">
        {['Nafaa ko orders dekhne ki ijazat', 'Products aur stock sync', 'Status wapas website par'].map((t) => (
          <div key={t} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
            <CheckCircle2 className={cn('h-4 w-4', live ? 'text-emerald-300' : 'text-white/50')} /> {t}
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-white/60">
          <XCircle className="h-4 w-4" /> Password ya payment details nahi
        </div>
      </div>
    </div>
  );
}

function Logo({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="text-center shrink-0">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-white text-3xl flex items-center justify-center shadow-xl">{emoji}</div>
      <div className="mt-1.5 text-[11px] font-black text-white/80">{label}</div>
    </div>
  );
}

/* ─── Popup khula hai ─── */
function WaitingCard({ platform, phase, onReopen, onRetry, channelId, site }: {
  platform: 'woocommerce' | 'shopify';
  phase: 'waiting' | 'denied'; onReopen: (full?: boolean) => void; onRetry: () => void; channelId: string | null; site: string;
}) {
  const shopify = platform === 'shopify';
  const [showKeys, setShowKeys] = useState(false);
  if (phase === 'denied') {
    return (
      <div className="rounded-3xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-6 text-center">
        <XCircle className="mx-auto h-10 w-10 text-rose-500" />
        <div className="mt-2 font-black text-rose-900 dark:text-rose-200">{shopify ? 'Shopify me "Install" nahi hua' : 'WordPress me "Approve" nahi dabaya gaya'}</div>
        <p className="mt-1 text-[12px] font-bold text-rose-700 dark:text-rose-300">Koi baat nahi — dobara koshish karein.</p>
        <Button className="mt-4" onClick={onRetry} leftIcon={<RefreshCw className="h-4 w-4" />}>Dobara</Button>
      </div>
    );
  }
  return (
    <div className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 p-6">
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 rounded-2xl bg-white dark:bg-slate-900 shadow-lg flex items-center justify-center text-3xl">
          {shopify ? '🟢' : '🟣'}
          <span className="absolute -right-1 -top-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black text-slate-900 dark:text-white">{shopify ? 'Shopify window me "Install" dabayein' : 'WordPress window me "Approve" dabayein'}</div>
          <ol className="mt-2 space-y-1 text-[13px] font-bold text-slate-600 dark:text-slate-300">
            <li>1. Login nahi hain to {shopify ? 'Shopify' : 'WordPress admin'} ka login karein</li>
            <li>2. {shopify ? <>"Nafaa" app ki ijazaton par <b>Install</b></> : <>"Nafaa POS would like to connect…" par <b>Approve</b></>}</li>
            <li>3. Window khud band hogi — yahan ✅ aa jayega</li>
          </ol>
          <div className="mt-3 flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Intezar kar rahe hain…
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onReopen()} leftIcon={<ExternalLink className="h-4 w-4" />}>Window dobara kholo</Button>
            <Button size="sm" variant="ghost" onClick={() => onReopen(true)}>Isi tab me kholo</Button>
            {!shopify && <Button size="sm" variant="ghost" onClick={() => setShowKeys((v) => !v)} leftIcon={<KeyRound className="h-4 w-4" />}>Keys khud daalein</Button>}
          </div>
        </div>
      </div>
      {showKeys && channelId && <ManualKeysForm channelId={channelId} site={site} />}
    </div>
  );
}

/* ─── Jur gaya! ─── */
function ConnectedCard({ channelId, name }: { channelId: string; name: string }) {
  const navigate = useNavigate();
  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(channelId),
    onSuccess: (r) => navigate(`/online-orders?order=${r.channelOrderId}`),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/5 p-6 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/40 animate-in zoom-in duration-300">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{name} jur gaya!</h2>
      <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
        Webhooks lag gaye aur stock sync shuru. Ab website par jo order hoga, yahan ghanti bajegi.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button variant="success" onClick={() => navigate(`/online-store/channels/${channelId}#sec-products`)} leftIcon={<Package className="h-4 w-4" />}>
          Products jorein
        </Button>
        <Button variant="outline" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Send className="h-4 w-4" />}>Test order</Button>
        <Button variant="ghost" onClick={() => navigate(`/online-store/channels/${channelId}`)} rightIcon={<Sparkles className="h-4 w-4" />}>Channel kholo</Button>
      </div>
    </div>
  );
}
