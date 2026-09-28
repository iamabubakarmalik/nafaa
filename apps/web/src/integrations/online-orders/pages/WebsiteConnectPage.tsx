import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2, CircleDashed, Globe, KeyRound, Loader2, Pause, Play, RefreshCw, Send, Settings2, ShoppingBag,
  Package, Activity, ArrowRight, Zap, GraduationCap, X, Bell, Store, Tag, ShieldCheck, Webhook,
  PencilLine, Circle, ChevronRight, HelpCircle, Lock, Receipt, Boxes, ArrowDownLeft, ArrowUpRight, AlertTriangle, Trash2,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Switch } from '@core/ui/Switch';
import { useAuthStore } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { apiErrorMessage, onlineOrdersApi, type WebsiteConfig, type WebsiteOverview } from '../api/online-orders.api';
import { ConnectGuide, PlatformPicker, type Platform } from '../components/website/ConnectGuides';
import { CHANNELS_KEY, useSalesChannels } from '../hooks/useSalesChannels';
import { ProductSyncCard } from '../components/website/ProductSyncCard';
import { CopyField } from '../components/website/CopyField';
import { timeAgo } from '../lib/labels';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   WEBSITE CONNECT — APNI DUKAAN ONLINE  (Orders page jaisa)
   ─────────────────────────────────────────────────────────────
   Pehli dafa: platform chuno → naam → ek click me connect,
               kaise kaam karta hai + aam sawal
   Jur gaya:   hero me zinda halat, setup checklist (progress),
               connect guide, test, settings (hisson me),
               products, keys, activity (chaant + kamyabi %)
   ⌨️ G guide • T test order • O orders • Esc band
   ═════════════════════════════════════════════════════════════ */

const QK = ['online-store-website'];

const SECTIONS = [
  { id: 'sec-connect', label: 'Website jorein', icon: Zap },
  { id: 'sec-test', label: 'Test order', icon: Send },
  { id: 'sec-settings', label: 'Settings', icon: Settings2 },
  { id: 'sec-products', label: 'Products', icon: Package },
  { id: 'sec-keys', label: 'Keys', icon: KeyRound },
  { id: 'sec-activity', label: 'Activity', icon: Activity },
] as const;

const goTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** productLinks number bhi ho sakta hai ya object — dono sambhal lo */
const linkedCount = (v: any): number =>
  typeof v === 'number' ? v : Number(v?.linked ?? v?.count ?? v?.total ?? (Array.isArray(v) ? v.length : 0)) || 0;

/** Purana /online-store/website — pehle channel par, ya jorne ke safhe par */
export function WebsiteRedirect() {
  const { data, isLoading } = useSalesChannels();
  if (isLoading) return <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
  const first = data?.find((c) => c.isWebsite);
  return <Navigate to={first ? `/online-store/channels/${first.id}` : '/online-store/connect'} replace />;
}

export default function WebsiteConnectPage() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const key = ['sales-channel', id];
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: key,
    queryFn: () => onlineOrdersApi.channel(id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.connected && !q.state.data.stats?.lastOrderAt ? 8_000 : 30_000),
  });
  const set = (d: WebsiteOverview) => {
    qc.setQueryData(key, d);
    qc.invalidateQueries({ queryKey: CHANNELS_KEY });
  };
  const [showTeacher, setShowTeacher] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === 'g') setShowTeacher(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <div className="h-48 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
          <div className="hidden xl:block h-96 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        </div>
      </div>
    );
  }
  if (error || !data?.integration) {
    return (
      <div className="w-full rounded-3xl border-4 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center">
        <Lock className="h-10 w-10 text-slate-400 mx-auto" />
        <div className="mt-3 text-lg font-black text-slate-900 dark:text-white">Ye channel nahi khula</div>
        <p className="mt-1 text-sm font-bold text-slate-500">{apiErrorMessage(error, 'Shayad hata diya gaya')}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="secondary" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>Dobara koshish</Button>
          <Link to="/online-store/connect"><Button variant="success">Website jorein</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Connected key={id} channelId={id} data={data} onChange={set} onGuide={() => setShowTeacher(true)} onRefresh={() => refetch()} refreshing={isFetching} />
      {showTeacher && <Teacher onClose={() => setShowTeacher(false)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// JUR GAYA — hero, checklist, guide, test, settings, products, keys, activity
// ═══════════════════════════════════════════════════════════════
function Connected({ channelId, data, onChange, onGuide, onRefresh, refreshing }: {
  channelId: string; data: WebsiteOverview; onChange: (d: WebsiteOverview) => void; onGuide: () => void; onRefresh: () => void; refreshing: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const i = data.integration!;
  const cfg = i.config;
  const stats = data.stats!;
  const tenantName = useAuthStore((s) => s.tenant?.name) ?? 'Meri dukaan';
  // WooCommerce / Shopify channel ka platform tay hai; sirf "apni website" wala badal sakta hai
  const fixedPlatform: Platform | null = i.type === 'WOOCOMMERCE' ? 'woocommerce' : i.type === 'SHOPIFY' ? 'shopify' : null;
  const [platform, setPlatform] = useState<Platform>(
    fixedPlatform ?? (cfg.platform === 'shopify' ? 'shopify' : cfg.platform === 'woocommerce' || cfg.platform === 'wordpress' ? 'woocommerce' : 'custom'),
  );

  const oneClick = !!i.woo?.connected || !!i.shopify?.connected;
  const receiving = !!stats.lastOrderAt || i.webhookVerified || oneClick;
  const ordersLink = `/online-orders?channel=${channelId}`;
  const paused = !i.isActive;
  const links = linkedCount((stats as any).productLinks);

  const save = useMutation({
    mutationFn: (patch: Partial<WebsiteConfig> & { displayName?: string }) => onlineOrdersApi.updateChannel(channelId, patch),
    onSuccess: (d) => { onChange(d); toast.success('Save ho gaya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const test = useMutation({
    mutationFn: () => onlineOrdersApi.testOrder(channelId),
    onSuccess: (r) => {
      toast.success('🧪 Test order aa gaya!', {
        description: 'Accept karke dekhein — bill banega, stock kam hoga. Baad me cancel karein to stock wapas.',
        action: { label: 'Dekho', onClick: () => navigate(`/online-orders?order=${r.channelOrderId}`) },
      });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pauseMut = useMutation({
    mutationFn: () => (paused ? onlineOrdersApi.resume(channelId) : onlineOrdersApi.pause(channelId)),
    onSuccess: (d) => { onChange(d); toast.success(d.integration?.isActive ? 'Connection chalu' : 'Connection band — naye orders nahi aayenge'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const rotate = useMutation({
    mutationFn: () => onlineOrdersApi.rotateKeys(channelId),
    onSuccess: (d) => {
      onChange(d);
      toast.success(oneClick ? 'Nayi key ban gayi — webhooks khud nayi key par shift ho gaye' : 'Nayi key ban gayi — website/plugin me nayi key daalein');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => onlineOrdersApi.removeChannel(channelId),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: CHANNELS_KEY });
      toast.success(r.archived ? 'Channel hata diya — purane orders aur bills mehfooz hain' : 'Channel hata diya');
      navigate('/online-store/channels');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const pickPlatform = (p: Platform) => {
    setPlatform(p);
    if (p !== cfg.platform) onlineOrdersApi.updateChannel(channelId, { platform: p }).then(onChange).catch(() => null);
  };

  /* ── Setup checklist ── */
  const steps = [
    { key: 'made', label: 'Connection bana', hint: 'Key aur secret tayyar', done: true, sec: 'sec-keys' },
    { key: 'linked', label: 'Website se jora', hint: 'Plugin / webhook lagayein', done: receiving, sec: 'sec-connect' },
    { key: 'order', label: 'Pehla order aaya', hint: 'Test order bhej kar dekhein', done: (stats.totalOrders ?? 0) > 0, sec: 'sec-test' },
    { key: 'products', label: 'Products jore', hint: 'POS aur website ke products milayein', done: links > 0, sec: 'sec-products' },
    { key: 'status', label: 'Status website ko', hint: 'Customer ko website par halat dikhe', done: !!cfg.statusWebhookUrl || oneClick, sec: 'sec-settings' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const pct = (doneCount / steps.length) * 100;
  const nextStep = steps.find((s) => !s.done);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement?.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 't' && !test.isPending) test.mutate();
      else if (k === 'o') navigate(ordersLink);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [test, navigate]);

  const tone = paused ? 'paused' : receiving ? 'live' : 'waiting';
  const heroBtn = 'h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center backdrop-blur transition';

  return (
    <div className="w-full space-y-4 sm:space-y-5 pb-10">
      {/* ═══ HERO ═══ */}
      <section className={cn(
        'relative overflow-hidden rounded-3xl text-white p-5 sm:p-6 shadow-2xl',
        tone === 'paused' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600'
          : tone === 'live' ? 'bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700'
            : 'bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700',
      )}>
        <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative h-14 w-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              {tone === 'paused' ? <Pause className="h-7 w-7" /> : tone === 'live' ? <CheckCircle2 className="h-7 w-7 text-emerald-300" /> : <CircleDashed className="h-7 w-7 animate-spin [animation-duration:3s] text-amber-200" />}
              {tone === 'live' && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-emerald-900" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[11px] font-black border border-white/25 uppercase tracking-widest">
                <Globe className="h-3.5 w-3.5" /> {platformLabel(fixedPlatform ?? cfg.platform)}
                {oneClick && <span className="normal-case tracking-normal text-emerald-200">· ek click se jura ✓</span>}
              </div>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black leading-tight truncate">{i.displayName}</h1>
              <p className="mt-1 text-xs sm:text-sm font-bold text-white/85">
                {tone === 'paused' ? 'Connection band hai — naye orders nahi aa rahe'
                  : tone === 'live' ? `Jur gaya ✓ · aakhri order ${stats.lastOrderAt ? timeAgo(stats.lastOrderAt) : '—'}${stats.lastOrderNumber ? ` (#${stats.lastOrderNumber})` : ''}`
                    : 'Pehle order ka intezar… har 8 second me dekh rahe hain'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={onGuide} title="Sikhein (G)"
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Sikhein</span>
            </button>
            <button onClick={onRefresh} disabled={refreshing} title="Taaza" className={`${heroBtn} disabled:opacity-50`}>
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </button>
            <button onClick={() => pauseMut.mutate()} disabled={pauseMut.isPending}
              title={paused ? 'Connection chalu karein' : 'Connection band karein'}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-black inline-flex items-center gap-1.5 backdrop-blur disabled:opacity-50 transition">
              {pauseMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {paused ? 'Chalu karo' : 'Band karo'}
            </button>
            <button onClick={() => test.mutate()} disabled={test.isPending} title="Test order (T)"
              className="h-11 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg disabled:opacity-60 transition">
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span className="hidden sm:inline">Test order</span>
            </button>
            <Link to={ordersLink} title="Orders (O)"
              className="h-11 px-3.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 text-xs font-black inline-flex items-center gap-1.5 shadow-lg transition">
              <ShoppingBag className="h-4 w-4" /> Orders
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <HeroStat label="Aaj ke orders" value={stats.todayOrders ?? 0} />
          <HeroStat label="Naye — accept karne" value={stats.pendingOrders ?? 0} hot={(stats.pendingOrders ?? 0) > 0} onClick={() => navigate(ordersLink)} />
          <HeroStat label="Kul orders" value={stats.totalOrders ?? 0} />
          <HeroStat label="Jore hue products" value={links} />
        </div>
      </section>

      {data.publicApi && !data.publicApi.reachable && i.type !== 'CUSTOM_WEBSITE' && (
        <Banner tone="amber" icon={AlertTriangle} title="Website abhi Nafaa tak orders nahi bhej sakti"
          text={`${data.publicApi.reason ?? ''} ${data.publicApi.fix ? data.publicApi.fix.replace(/\`/g, '') : ''}`.trim()} />
      )}

      {paused && (
        <Banner tone="slate" icon={Pause} title="Connection band hai"
          text="Website par order ho raha hai to bhi Nafaa me nahi aayega. Wapas chalu karte hi naye orders aane lagenge."
          action={<Button size="sm" onClick={() => pauseMut.mutate()} loading={pauseMut.isPending} leftIcon={<Play className="h-4 w-4" />}>Chalu karo</Button>} />
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] items-start">
        {/* ═══ MAIN ═══ */}
        <div className="min-w-0 space-y-4">
          <Section id="sec-connect" icon={Zap} tone="emerald" title="Website se jorein" sub="Apna platform chunein aur steps follow karein"
            badge={receiving ? { t: 'Jur gaya', ok: true } : { t: 'Baqi hai', ok: false }}>
            {!fixedPlatform && <div className="mb-5"><PlatformPicker value={platform} onChange={pickPlatform} /></div>}
            <ConnectGuide platform={platform} overview={data} shopName={tenantName} channelId={channelId} onChange={onChange} />
          </Section>

          <Section id="sec-test" icon={Send} tone="sky" title="Test karein" sub="Poora flow check karein — asli website ki zaroorat nahi"
            badge={(stats.totalOrders ?? 0) > 0 ? { t: 'Order aa chuka', ok: true } : undefined}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] items-center">
              <ol className="grid gap-2 sm:grid-cols-4">
                {['Test order aata hai', 'Ghanti bajti hai', 'Accept → bill', 'Cancel → stock wapas'].map((t, n) => (
                  <li key={t} className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3">
                    <div className="h-6 w-6 rounded-lg bg-sky-600 text-white text-[11px] font-black flex items-center justify-center">{n + 1}</div>
                    <div className="mt-1.5 text-xs font-black text-slate-800 dark:text-slate-100">{t}</div>
                  </li>
                ))}
              </ol>
              <Button size="lg" variant="primary" loading={test.isPending} onClick={() => test.mutate()} leftIcon={<Send className="h-4 w-4" />}>
                Test order bhejo
              </Button>
            </div>
            <p className="mt-3 text-[11px] font-bold text-slate-500">Aap ke 1-2 asli products ke saath order aata hai aur us par TEST ka nishan hota hai — analytics me nahi gina jata.</p>
          </Section>

          <Section id="sec-settings" icon={Settings2} tone="violet" title="Settings" sub="Order aane par kya ho, kis branch se, kis qeemat par">
            <SettingsForm channelId={channelId} cfg={cfg} name={i.displayName} saving={save.isPending} platform={platform} woo={oneClick} onSave={(p) => save.mutate(p)} />
          </Section>

          <Section id="sec-products" icon={Package} tone="orange" title="Products — dono taraf" sub="POS se website par lagao, ya website se POS me lao"
            badge={links > 0 ? { t: `${links} jore`, ok: true } : { t: 'Koi nahi jora', ok: false }}>
            <ProductSyncCard channelId={channelId} productLinks={stats.productLinks} platform={cfg.platform} wooConnected={!!i.woo?.connected} shopifyConnected={!!i.shopify?.connected} />
          </Section>

          <Section id="sec-keys" icon={KeyRound} tone="slate" title="Keys" sub="Sirf apni website, plugin ya developer ko dein">
            <div className="grid gap-3 md:grid-cols-2">
              <CopyField label="Nafaa Key" value={i.apiKey} secret />
              <CopyField label="Secret" value={i.webhookSecret} secret />
            </div>
            <div className="mt-3 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-3 flex flex-wrap items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              <span className="flex-1 min-w-[200px] text-[12px] font-bold text-rose-800 dark:text-rose-200">
                Key kisi galat haath lag gayi ho to foran nayi banayein. Purani key usi waqt band ho jati hai.
              </span>
              <Button size="sm" variant="outline" loading={rotate.isPending} leftIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() => { if (confirm('Nayi key banayein? Purani key foran band ho jayegi — website/plugin me nayi daalni hogi.')) rotate.mutate(); }}>
                Nayi key banao
              </Button>
            </div>
            <div className="mt-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-3 flex flex-wrap items-center gap-3">
              <Trash2 className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="flex-1 min-w-[200px] text-[12px] font-bold text-slate-600 dark:text-slate-300">
                Ye website ab nahi chahiye? Channel hata dein — purane orders aur bills mehfooz rehte hain.
              </span>
              <Button size="sm" variant="ghost" className="text-rose-600" loading={remove.isPending}
                onClick={() => { if (confirm(`"${i.displayName}" hata dein? Is website se naye orders aana band ho jayenge.`)) remove.mutate(); }}>
                Channel hatao
              </Button>
            </div>
          </Section>

          <ActivityLog logs={data.logs} />
        </div>

        {/* ═══ SIDEBAR ═══ */}
        <aside className="space-y-4 xl:sticky xl:top-4">
          <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 dark:text-white">Setup</h3>
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{doneCount}/{steps.length}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-4 space-y-1">
              {steps.map((s) => (
                <li key={s.key}>
                  <button onClick={() => goTo(s.sec)}
                    className={cn('w-full flex items-start gap-3 rounded-2xl p-2.5 text-left transition',
                      s === nextStep ? 'bg-amber-50 dark:bg-amber-500/10 ring-2 ring-amber-300 dark:ring-amber-500/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60')}>
                    {s.done
                      ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      : <Circle className={cn('h-5 w-5 shrink-0', s === nextStep ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600')} />}
                    <div className="min-w-0 flex-1">
                      <div className={cn('text-sm font-black', s.done ? 'text-slate-500 line-through decoration-2' : 'text-slate-900 dark:text-white')}>{s.label}</div>
                      {!s.done && <div className="text-[11px] font-bold text-slate-500">{s.hint}</div>}
                    </div>
                    {!s.done && <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                  </button>
                </li>
              ))}
            </ul>
            {!nextStep && (
              <div className="mt-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-[12px] font-black text-emerald-800 dark:text-emerald-200">
                🎉 Sab tayyar hai — ab orders khud aayenge.
              </div>
            )}
          </section>

          <nav className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 hidden xl:block">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => goTo(s.id)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <s.icon className="h-4 w-4 text-slate-400" /> {s.label}
              </button>
            ))}
          </nav>

          <section className="rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-5">
            <HelpCircle className="h-5 w-5 text-amber-600" />
            <h3 className="mt-2 font-black text-amber-900 dark:text-amber-200">Madad chahiye?</h3>
            <p className="mt-1 text-[12px] font-bold text-amber-800 dark:text-amber-300">
              Guide me har step ki wazahat hai. Developer ko sirf Key, Secret aur is safhe ka link dein.
            </p>
            <button onClick={onGuide} className="mt-3 h-9 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black inline-flex items-center gap-1.5 transition">
              <GraduationCap className="h-4 w-4" /> Guide kholein
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ═══ SETTINGS — hisson me ═══ */
function SettingsForm({ channelId, cfg, name, saving, platform, woo, onSave }: {
  channelId: string; cfg: WebsiteConfig; name: string; saving: boolean; platform: Platform; woo: boolean;
  onSave: (p: Partial<WebsiteConfig> & { displayName?: string }) => void;
}) {
  const { data: shops } = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list });
  const [statusUrl, setStatusUrl] = useState(cfg.statusWebhookUrl ?? '');
  const [shopifySecret, setShopifySecret] = useState(cfg.shopifySecret ?? '');
  const [displayName, setDisplayName] = useState(name);
  const shopList: any[] = Array.isArray(shops) ? shops : (shops as any)?.items ?? [];

  const testHook = useMutation({
    mutationFn: () => onlineOrdersApi.testStatusWebhook(channelId),
    onSuccess: (r) => (r.ok ? toast.success('Website ne jawab diya ✅') : toast.error(r.error ?? 'Website ne jawab nahi diya')),
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
      <Group icon={Zap} title="Order aane par" sub="Kitna kaam khud ho">
        <div className="grid gap-3 md:grid-cols-2">
          <Tile>
            <Switch checked={cfg.autoAccept} onChange={(e) => onSave({ autoAccept: e.target.checked })}
              label="⚡ Order aate hi khud accept"
              description="Bill khud banega aur stock khud kam hoga. Stock kam ho ya product na mile to order 'Naya' hi rahega." />
          </Tile>
          <Tile>
            <Switch checked={cfg.autoPrint} onChange={(e) => onSave({ autoPrint: e.target.checked })}
              label="🖨️ Accept par receipt kholo"
              description="Accept dabate hi receipt ka safha khulega (POS ki auto-print setting on ho to print bhi)." />
          </Tile>
        </div>
      </Group>

      <Group icon={Store} title="Stock aur qeemat" sub="Kis branch ka maal, kaun si qeemat">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Online orders kis branch se</Label>
            <select value={cfg.shopId ?? ''} onChange={(e) => onSave({ shopId: e.target.value || null })} className={cn(input, 'h-11')}>
              <option value="">Main branch</option>
              {shopList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">Isi branch ka stock kam hoga aur website ko isi ka stock dikhega.</p>
          </div>
          <div>
            <Label>Bill me qeemat</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['WEBSITE', 'Website wali', 'Jo customer ne di', Globe],
                ['NAFAA', 'Nafaa wali', 'Meri POS ki qeemat', Tag],
              ] as const).map(([k, t, s, Icon]) => (
                <button key={k} onClick={() => onSave({ priceSource: k })}
                  className={cn('rounded-2xl border-2 p-3 text-left transition',
                    cfg.priceSource === k ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300')}>
                  <div className="flex items-center justify-between">
                    <Icon className={cn('h-4 w-4', cfg.priceSource === k ? 'text-emerald-600' : 'text-slate-400')} />
                    {cfg.priceSource === k && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <div className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">{t}</div>
                  <div className="text-[11px] font-semibold text-slate-500">{s}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Group>

      <Group icon={ShieldCheck} title="Hifazat" sub="Sirf asli website ke order qubool hon">
        <div className="grid gap-3 md:grid-cols-2">
          <Tile>
            <Switch checked={cfg.requireSignature} onChange={(e) => onSave({ requireSignature: e.target.checked })}
              label="🔒 Sirf signed orders"
              description="Bina signature wala order reject. Plugin aur WooCommerce webhook khud sign karte hain." />
          </Tile>
          {platform === 'shopify' && !woo && (
            <div>
              <Label>Shopify signing key</Label>
              <div className="flex gap-2">
                <input value={shopifySecret} onChange={(e) => setShopifySecret(e.target.value)} placeholder="Shopify → Notifications → Webhooks ke neeche wali key" className={input} />
                <Button size="sm" variant="outline" loading={saving} onClick={() => onSave({ shopifySecret })}>Save</Button>
              </div>
            </div>
          )}
        </div>
      </Group>

      <Group icon={Webhook} title="Website ko status bhejna" sub="Nafaa → Website">
        {woo ? (
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-emerald-900 dark:text-emerald-200">Khud ho raha hai — koi URL nahi chahiye</div>
              <div className="text-[12px] font-bold text-emerald-800 dark:text-emerald-300">
                {platform === 'shopify'
                  ? 'Accept par order par "Nafaa: Accepted" tag, raste me par fulfillment + tracking (customer ko Shopify email), deliver par "Delivered", cancel par order cancel.'
                  : 'Accept par WooCommerce order "Processing", deliver par "Completed", cancel par "Cancelled" — aur customer ko "raste me hai" ka note.'}
              </div>
            </div>
            <Button size="sm" variant="ghost" loading={testHook.isPending} onClick={() => testHook.mutate()}>Check</Button>
          </div>
        ) : (<>
        <Label>
          Status URL {cfg.platform === 'woocommerce' && cfg.statusWebhookUrl ? <span className="normal-case text-emerald-600">· plugin ne khud set kiya ✓</span> : null}
        </Label>
        <div className="flex flex-wrap gap-2">
          <input value={statusUrl} onChange={(e) => setStatusUrl(e.target.value)} placeholder="https://meri-website.com/nafaa-status" className={cn(input, 'min-w-[240px] flex-1')} />
          <Button size="sm" variant="outline" loading={saving} onClick={() => onSave({ statusWebhookUrl: statusUrl.trim() || null })}>Save</Button>
          <Button size="sm" variant="ghost" loading={testHook.isPending} disabled={!cfg.statusWebhookUrl} onClick={() => testHook.mutate()}>Test</Button>
        </div>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          Accept, raste me, deliver ya cancel hone par Nafaa is URL par batata hai — customer ko website par status dikhta hai. Plugin wale ise khali chhor dein.
        </p>
        </>)}
      </Group>

      <Group icon={PencilLine} title="Naam" sub="Sirf aap ko nazar aata hai">
        <div className="flex gap-2 max-w-lg">
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={input} />
          <Button size="sm" variant="outline" disabled={!displayName.trim() || displayName === name} loading={saving} onClick={() => onSave({ displayName })}>Save</Button>
        </div>
      </Group>
    </div>
  );
}

/* ═══ ACTIVITY — chaant aur kamyabi ═══ */
function ActivityLog({ logs }: { logs: WebsiteOverview['logs'] }) {
  const [f, setF] = useState<'all' | 'IN' | 'OUT' | 'ERR'>('all');
  const rows = useMemo(() => logs.filter((l) => f === 'all' || (f === 'ERR' ? !l.ok : l.kind === f)), [logs, f]);
  const okPct = logs.length ? (logs.filter((l) => l.ok).length / logs.length) * 100 : 100;
  const errs = logs.filter((l) => !l.ok).length;

  return (
    <Section id="sec-activity" icon={Activity} tone="slate" title="Haal hi me" sub="Website se aane aur jaane wali requests"
      badge={logs.length ? { t: `${okPct.toFixed(0)}% kamyab`, ok: okPct >= 90 } : undefined}>
      {logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
          <Activity className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="mt-2 text-sm font-black text-slate-600 dark:text-slate-300">Abhi koi activity nahi</p>
          <p className="text-[11px] font-bold text-slate-400">Test order bhejein — yahan pehli line nazar aayegi.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 p-1 w-fit">
            {([['all', `Sab ${logs.length}`], ['IN', 'Aaya'], ['OUT', 'Gaya'], ['ERR', `Ghalti ${errs}`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setF(k)}
                className={cn('rounded-xl px-3 py-1.5 text-xs font-black transition',
                  f === k ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
                  k === 'ERR' && errs > 0 && f !== k && 'text-rose-600')}>{l}</button>
            ))}
          </div>
          <ul className="divide-y-2 divide-slate-100 dark:divide-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
            {rows.map((l) => (
              <li key={l.id} className={cn('flex items-center gap-3 px-3 py-2.5 text-sm', !l.ok && 'bg-rose-50/50 dark:bg-rose-500/5')}>
                <span className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0',
                  l.kind === 'IN' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' : 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300')}>
                  {l.kind === 'IN' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-800 dark:text-slate-100">{l.label}</div>
                  {l.error && <div className="truncate text-[11px] font-bold text-rose-600">{l.error}</div>}
                </div>
                <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-black', l.ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-600 text-white')}>
                  {l.ok ? 'Theek' : 'Ghalti'}
                </span>
                <span className="w-20 text-right text-[11px] font-bold text-slate-500 shrink-0">{timeAgo(l.at)}</span>
              </li>
            ))}
            {rows.length === 0 && <li className="p-6 text-center text-sm font-bold text-slate-400">Is chaant me kuch nahi</li>}
          </ul>
        </>
      )}
    </Section>
  );
}

/* ═══ CHHOTE HISSE ═══ */
export const input =
  'h-10 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

function platformLabel(p?: string | null) {
  return p === 'shopify' ? 'Shopify' : p === 'custom' ? 'Apni website' : 'WooCommerce / WordPress';
}

const TONES: Record<string, string> = {
  emerald: 'from-emerald-500 to-teal-600', sky: 'from-sky-500 to-blue-600', violet: 'from-violet-500 to-purple-600',
  orange: 'from-orange-500 to-amber-600', slate: 'from-slate-600 to-slate-800',
};

function Section({ id, icon: Icon, tone, title, sub, badge, children }: {
  id: string; icon: any; tone: string; title: string; sub?: string; badge?: { t: string; ok: boolean }; children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className={cn('h-11 w-11 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shadow-lg shrink-0', TONES[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-black text-slate-900 dark:text-white text-base sm:text-lg leading-tight">{title}</h2>
          {sub && <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {badge && (
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black',
            badge.ok ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300')}>
            {badge.ok ? '✓ ' : ''}{badge.t}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Group({ icon: Icon, title, sub, children }: { icon: any; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="py-5 first:pt-0 last:pb-0 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex items-start gap-2.5">
        <Icon className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
        <div>
          <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
          {sub && <div className="text-[11px] font-bold text-slate-500">{sub}</div>}
        </div>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Tile({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-4">{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500">{children}</label>;
}

export function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[44px_minmax(0,1fr)]">
      <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black flex items-center justify-center shadow-lg">{n}</span>
      <div className="min-w-0">
        <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
        {sub && <p className="text-[12px] font-bold text-slate-500 mb-3">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function HeroStat({ label, value, hot, onClick }: { label: string; value: number; hot?: boolean; onClick?: () => void }) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick}
      className={cn('rounded-2xl border p-3 text-left backdrop-blur transition',
        hot ? 'bg-amber-400 text-slate-900 border-amber-300' : 'bg-white/10 border-white/20',
        onClick && 'hover:-translate-y-0.5')}>
      <div className="text-2xl font-black tabular-nums leading-none">{value}</div>
      <div className={cn('mt-1 text-[11px] font-bold', hot ? 'text-slate-800' : 'text-white/75')}>{label}</div>
    </Comp>
  );
}

function Banner({ tone, icon: Icon, title, text, action }: { tone: 'slate' | 'amber'; icon: any; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className={cn('rounded-3xl border-2 p-4 flex flex-wrap items-center gap-3',
      tone === 'slate' ? 'bg-slate-50 border-slate-300 dark:bg-slate-800/60 dark:border-slate-700' : 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30')}>
      <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300 shrink-0" />
      <div className="min-w-[200px] flex-1">
        <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
        <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300">{text}</div>
      </div>
      {action}
    </div>
  );
}

export function Faq() {
  const items = [
    ['Kya website ka stock bhi badlega?', 'Haan. Products jorne ke baad dukaan me bikri ho ya website par — dono jagah ek hi stock dikhta hai.'],
    ['Developer chahiye hoga?', 'WordPress/WooCommerce par plugin lagta hai, Shopify par webhook. Apni banayi website ho to developer ko Key aur Secret de dein.'],
    ['Mera data mehfooz hai?', 'Har website ki apni Key aur Secret hai. "Sirf signed orders" on rakhein aur shak ho to kabhi bhi nayi key bana lein.'],
    ['Band karna ho to?', 'Ek click me "Band karo" — naye orders aana ruk jate hain. Purana record mehfooz rehta hai.'],
  ];
  return (
    <section className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
      <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2"><HelpCircle className="h-4 w-4 text-emerald-600" /> Aam sawal</h3>
      <div className="mt-3 divide-y-2 divide-slate-100 dark:divide-slate-800">
        {items.map(([q, a]) => (
          <details key={q} className="group py-2.5">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-sm font-black text-slate-800 dark:text-slate-100">
              {q} <ChevronRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
            </summary>
            <p className="mt-1.5 text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Teacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Website jorne ka tareeqa</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <Tip icon={Globe} title="1. Platform chunein">WooCommerce/WordPress, Shopify ya apni banayi website. Har ek ke steps alag hain — safhe par wahi dikhte hain.</Tip>
          <Tip icon={KeyRound} title="2. Key aur Secret">Plugin ya webhook me ye dono daalein. Ye aap ki dukaan ka taala-chaabi hain — sirf bharose wale ko dein.</Tip>
          <Tip icon={Send} title="3. Test order">Asli website ke bagair poora flow dekh lein: order → ghanti → accept → bill → stock kam. Cancel karein to stock wapas.</Tip>
          <Tip icon={Package} title="4. Products jorein">POS ke products website par lagayein ya website ke POS me layein. Jore hue products ka stock dono taraf ek rehta hai.</Tip>
          <Tip icon={Zap} title="Khud accept">On ho to order aate hi bill ban jata hai. Stock kam ho ya product na mile to order "Naya" me ruk jata hai taake aap dekh lein.</Tip>
          <Tip icon={Tag} title="Qeemat kaun si">"Website wali" = jo customer ne di. "Nafaa wali" = aap ki POS ki qeemat. Offer website par chal raha ho to website wali rakhein.</Tip>
          <Tip icon={Webhook} title="Status wapas website ko">Status URL ho to accept, raste me, delivered — sab customer ko website par nazar aata hai.</Tip>
          <Tip icon={Pause} title="Band karo">Chhutti ho ya maal khatam — "Band karo" dabayein. Chalu karte hi orders phir aane lagte hain.</Tip>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              <div><Kbd>T</Kbd> test order</div>
              <div><Kbd>O</Kbd> orders</div>
              <div><Kbd>G</Kbd> ye guide</div>
              <div><Kbd>Esc</Kbd> band karo</div>
            </div>
          </div>
          <Button className="w-full" onClick={onClose}>Samajh gaya</Button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border">{children}</kbd>;
}

function Tip({ icon: Icon, title, children }: any) {
  return (
    <div className="flex gap-2.5">
      <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="min-w-0">
        <div className="font-extrabold text-slate-900 dark:text-white text-[13px]">{title}</div>
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 leading-snug">{children}</p>
      </div>
    </div>
  );
}
