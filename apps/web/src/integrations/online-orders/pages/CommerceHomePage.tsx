/**
 * Online store dashboard, the home of the commerce workspace: today's
 * numbers, the work waiting in each order status, each staff member's
 * queue, the connected channels,
 * the last 30 days at a glance and every commerce module (live or coming
 * soon).
 *
 * Keys: N add order · O orders · G guide.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, AlarmClock, AlertTriangle, BadgePercent, BarChart3, Bot, Calculator, CheckCircle2, CircleDollarSign, Clock, CreditCard, FileSpreadsheet,
  Globe, GraduationCap, Headphones, Hourglass, Languages, Megaphone, MessageCircle, PackageCheck, PackagePlus, PackageX, PauseCircle, Plus,
  Printer, RotateCcw, ScanLine, Send, Share2, ShieldAlert, ShoppingBag, ShoppingCart, Sparkles, TrendingUp, Truck, Users, Wallet, Workflow,
  Navigation, Settings2, SlidersHorizontal, Trophy, Wand2, X, Award, Star, UsersRound, Radar,
  type LucideIcon,
} from 'lucide-react';
import { KpiCard, PageHero, PageShell, Skeleton, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrivacyToggle } from '@core/security/HiddenValue';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { cn } from '@core/lib/cn';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { onlineOrdersApi } from '../api/online-orders.api';
import { useSalesChannels } from '../hooks/useSalesChannels';
import { timeAgo } from '../lib/labels';
import { TeamQueue } from '../components/TeamQueue';
import { useCommerceSetup } from '../hooks/useCommerceSetup';
import { HomeTilesModal, tileEntry } from '../components/setup/HomeTilesEditor';
import { insightsApi } from '../api/insights.api';
import { useModuleSoon } from '../hooks/usePlatformControls';
import { t as tr } from '@core/i18n';

type Work = { key: string; label: string; hint: string; icon: LucideIcon; color: string };

/** The order statuses that need someone's hands, in the order work flows. */
const WORK: Work[] = [
  { key: 'NEW', label: tr('New'), hint: tr('Confirm karne hain'), icon: ShoppingBag, color: '#2563eb' },
  { key: 'PAY_PENDING', label: tr('Pay pending'), hint: tr('Advance ka intezar'), icon: CreditCard, color: '#7c3aed' },
  { key: 'ON_HOLD', label: tr('On hold'), hint: tr('Ruke hue'), icon: PauseCircle, color: '#64748b' },
  { key: 'NO_STOCK', label: tr('No stock'), hint: tr('Maal nahi hai'), icon: PackageX, color: '#dc2626' },
  { key: 'CONFIRMED', label: tr('Confirmed'), hint: tr('Pack karne hain'), icon: CheckCircle2, color: '#0d9488' },
  { key: 'PACKED_NOT_SENT', label: tr('Packed, not sent'), hint: tr('Courier ko dene hain'), icon: PackageCheck, color: '#ea580c' },
  { key: 'STUCK', label: tr('Stuck 5+ days'), hint: tr('Courier ke paas atke'), icon: Hourglass, color: '#b45309' },
  { key: 'ISSUES', label: tr('Issues'), hint: tr('Courier ka masla'), icon: AlertTriangle, color: '#e11d48' },
  { key: 'RETURNING', label: tr('Returning'), hint: tr('Wapas aa rahe'), icon: RotateCcw, color: '#c026d3' },
  { key: 'FOLLOW_UP', label: tr('Follow-ups due'), hint: tr('Aaj dobara rabta'), icon: AlarmClock, color: '#0284c7' },
];

type Module = { to?: string; label: string; text: string; icon: LucideIcon; color: string };

const LIVE: Module[] = [
  { to: '/online-orders', label: tr('Orders'), text: tr('Har channel ke orders, status aur bulk kaam'), icon: ShoppingBag, color: '#2563eb' },
  { to: '/online-orders/new', label: tr('Add order'), text: tr('WhatsApp, Instagram, phone — paste ya Excel'), icon: PackagePlus, color: '#16a34a' },
  { to: '/online-store/products', label: tr('Products & stock'), text: tr('Nafaa se stock, price aur link har channel par'), icon: PackageCheck, color: '#7c3aed' },
  { to: '/online-store/couriers', label: tr('Couriers'), text: tr('Booking, label, tracking'), icon: Truck, color: '#ea580c' },
  { to: '/online-orders/cod', label: tr('COD & payments'), text: tr('Courier ke paas kitna paisa hai'), icon: Wallet, color: '#0d9488' },
  { to: '/online-orders/pack', label: tr('Packing scan'), text: tr('Scan karke pack, ghalti nahi'), icon: ScanLine, color: '#0284c7' },
  { to: '/online-orders/returns-scan', label: tr('Return scan'), text: tr('RTO wapas, stock wapas'), icon: PackageX, color: '#c026d3' },
  { to: '/online-orders/customers', label: tr('Customers'), text: tr('VIP, khatre me, chale gaye — RFM aur CLV'), icon: Users, color: '#0f766e' },
  { to: '/online-store/campaigns', label: tr('WhatsApp campaigns'), text: tr('List chunein, ek ek chat tayyar message ke saath'), icon: Send, color: '#16a34a' },
  { to: '/online-store/reviews', label: tr('Reviews'), text: tr('Deliver ke baad rating aur Google review'), icon: Star, color: '#d97706' },
  { to: '/online-store/loyalty', label: tr('Loyalty & referral'), text: tr('Deliver par points, dost laane par inaam'), icon: Award, color: '#f59e0b' },
  { to: '/online-store/affiliates', label: tr('Influencers & affiliates'), text: tr('Codes, commission, payout aur ROI'), icon: UsersRound, color: '#7c3aed' },
  { to: '/online-store/blocklist', label: tr('Report scammer'), text: tr('Fake order wale number block'), icon: ShieldAlert, color: '#e11d48' },
  { to: '/online-orders/reports', label: tr('Reports'), text: tr('City, courier, channel ka RTO aur sale'), icon: BarChart3, color: '#4f46e5' },
  { to: '/online-store/costs', label: tr('Selling costs'), text: tr('Courier, COD fee, packaging — asli profit'), icon: Calculator, color: '#16a34a' },
  { to: '/online-store/marketing', label: tr('Marketing'), text: tr('Har ad ka asli nateeja, utm link, Meta events, ad copy'), icon: Megaphone, color: '#db2777' },
  { to: '/online-store/social', label: tr('Social media'), text: tr('Post calendar, yaad dihani, Nafaa AI caption aur design'), icon: Share2, color: '#0ea5e9' },
  { to: '/online-store/price-calculator', label: tr('Price calculator'), text: tr('Har channel ki sahi price'), icon: BadgePercent, color: '#9333ea' },
  { to: '/online-orders/abandoned', label: tr('Abandoned carts'), text: tr('Chhode hue checkout WhatsApp se wapas'), icon: ShoppingCart, color: '#2563eb' },
  { to: '/online-orders/profit', label: tr('Profit'), text: tr('Sale − Cost − ads − courier − returns = asli Profit'), icon: TrendingUp, color: '#16a34a' },
  { to: '/online-orders/radar', label: tr('Product Radar'), text: tr('Kaun si cheez barh rahi hai, kaun si gir rahi hai'), icon: Radar, color: '#7c3aed' },
  { to: '/online-orders/international', label: tr('International'), text: tr('Bahar ke customer ko un ki currency me price'), icon: Globe, color: '#2563eb' },
  { to: '/online-orders/payment-health', label: tr('Payment health'), text: tr('COD kis courier ke paas, kab aayega'), icon: Activity, color: '#0d9488' },
  { to: '/online-store/whatsapp-templates', label: tr('WhatsApp messages'), text: tr('Confirm, advance, tracking ke message'), icon: MessageCircle, color: '#16a34a' },
  { to: '/online-orders/dispatch', label: tr('Dispatch & airway bills'), text: tr('Bulk booking, label, loadsheet, COD audit'), icon: Printer, color: '#ea580c' },
  { to: '/online-orders/dispatch-scan', label: tr('Dispatch scan'), text: tr('Rider ko dete waqt scan — ghalti foran'), icon: ScanLine, color: '#dc2626' },
  { to: '/online-orders/dispatch-report', label: tr('Dispatch report'), text: tr('Delivered, returns, stuck, claims'), icon: BarChart3, color: '#4f46e5' },
  { to: '/online-orders/post-office', label: tr('Post office'), text: tr('Pakistan Post booking list, VPP, article no.'), icon: Send, color: '#b91c1c' },
  { to: '/online-orders/tracking', label: tr('Parcel map'), text: tr('Har parcel naqshe par — stuck aur fail foran'), icon: Navigation, color: '#0284c7' },
  { to: '/online-orders/couriers-score', label: tr('Courier scorecard'), text: tr('Har shehar ka best courier, saath saath compare'), icon: Trophy, color: '#ca8a04' },
  { to: '/online-store/automation', label: tr('Automation'), text: tr('Agar ye ho to wo karo — recipes ek tap se'), icon: Workflow, color: '#0d9488' },
  { to: '/online-store/settings', label: tr('Online store settings'), text: tr('Dashboard, board aur menu aap ke hisaab se'), icon: Settings2, color: '#475569' },
];

const SOON: Module[] = [
  { label: tr('WhatsApp AI bot'), text: tr('Order khud confirm, Roman Urdu me jawab'), icon: MessageCircle, color: '#16a34a' },
  { label: tr('Ads Nafaa se chalayein'), text: tr('Ad banana, rokna, kharcha khud aana — Meta/Google/TikTok ki manzoori ke baad'), icon: Megaphone, color: '#db2777' },
  { label: tr('Social inbox & auto-post'), text: tr('Meta / TikTok ki manzoori ke baad'), icon: Share2, color: '#0ea5e9' },
  { label: tr('Call center'), text: tr('Click-to-call aur agent dashboard'), icon: Headphones, color: '#475569' },
  { label: tr('International'), text: tr('Doosri currency aur mulk'), icon: Languages, color: '#0284c7' },
  { label: tr('AI store manager'), text: tr('Bol kar poochein, AI kaam kare'), icon: Bot, color: '#9333ea' },
];

export default function CommerceHomePage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  // Modules the Nafaa admin has switched to "Coming soon" move to the Soon tiles.
  const isSoon = useModuleSoon();
  const live = LIVE.filter((m) => !m.to || !isSoon(m.to));
  const soon = [...LIVE.filter((m) => m.to && isSoon(m.to)).map((m) => ({ ...m, to: undefined })), ...SOON];
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const today = businessDayKey(new Date(), startHour);
  const monthAgo = (() => {
    const [y, m, d] = today.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d - 29)).toISOString().slice(0, 10);
  })();

  const { data: channels, isLoading: channelsLoading } = useSalesChannels();
  const countsQ = useQuery({
    queryKey: ['online-orders', 'home-counts'],
    queryFn: () => onlineOrdersApi.list({ limit: 1 }),
    refetchInterval: 30_000,
  });
  const reportQ = useQuery({
    queryKey: ['online-orders', 'report', monthAgo, today, 'home'],
    queryFn: () => onlineOrdersApi.report({ from: monthAgo, to: today }),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigate('/online-orders/new'); }
      if (e.key === 'o' || e.key === 'O') { e.preventDefault(); navigate('/online-orders'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const list = countsQ.data;
  const board = list?.boardCounts ?? {};
  const stats = list?.stats;
  const r = reportQ.data?.totals;
  const salesChannels = (channels ?? []).filter((c) => c.type !== 'MANUAL');
  // Work tiles in the seller's own order (Online store settings), else the default set.
  const setup = useCommerceSetup();
  const [tilesOpen, setTilesOpen] = useState(false);
  const [setupHidden, setSetupHidden] = useState(false);
  const work: Work[] = setup.data?.homeTiles?.length
    ? setup.data.homeTiles.map((k) => WORK.find((w) => w.key === k) ?? (() => {
      const e = tileEntry(k);
      return e ? { key: k, label: e.label, hint: e.hint, icon: e.icon, color: e.color } : null;
    })()).filter((w): w is Work => !!w)
    : WORK;
  const askSetup = !!setup.data && !setup.data.doneAt && !setup.data.skippedAt && !setupHidden;

  return (
    <PageShell>
      <PageHero
        title={tr('Online store')}
        chip={<><Globe />{tr('Aaj')}</>}
        meta={salesChannels.length
          ? tr('{{count}} channel jore hue · sab orders, stock aur courier yahin se', { count: salesChannels.length })
          : tr('Apni website, Shopify ya Daraz joren — sab kuch Nafaa se chalayein')}
        busy={countsQ.isFetching && !countsQ.isLoading}
        loading={countsQ.isLoading}
        actions={<>
          <PrivacyToggle compact />
          <Link to="/online-orders/new" className={heroButton}><Plus className="h-4 w-4" /> {tr('Add order')}</Link>
          <Link to="/online-orders" className={heroButton}><ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">{tr('Orders')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={stats ? [
          { label: tr('Aaj ke orders'), value: String(stats.todayOrders) },
          { label: tr('Aaj ki sale'), value: money(stats.todayValue) },
          { label: tr('Confirm karne hain'), value: String(board.NEW ?? list?.counts?.PENDING ?? 0) },
          { label: tr('COD baqi'), value: money(stats.codDueValue), hint: tr('{{count}} order', { count: stats.codDueCount }) },
        ] : [{ label: tr('Aaj ke orders'), value: '' }, { label: tr('Aaj ki sale'), value: '' }, { label: tr('Confirm karne hain'), value: '' }, { label: tr('COD baqi'), value: '' }]}
      />

      {askSetup && (
        <section className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-200">
          <Wand2 className="h-5 w-5 text-brand-700" />
          <div className="min-w-0 flex-1">
            <div className="text-[0.875rem] font-semibold text-slate-900">{tr('Online store ko apne tareeqe par set karein')}</div>
            <div className="text-[0.8125rem] text-slate-600">{tr('6 chhote sawal — dashboard, menu, auto booking aur automation aap ke kaam ke hisaab se.')}</div>
          </div>
          <Link to="/online-store/setup" className="rounded-xl bg-brand-600 px-3 py-2 text-[0.8125rem] font-semibold text-white hover:bg-brand-700">{tr('Shuru karein')}</Link>
          <button type="button" aria-label={tr('Abhi nahi')} onClick={() => { setSetupHidden(true); insightsApi.skipSetup().catch(() => null); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/60"><X className="h-4 w-4" /></button>
        </section>
      )}

      {/* Work waiting in each status */}
      <section aria-labelledby="work-title">
        <div className="mb-2 flex items-center gap-2">
          <h2 id="work-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Clock className="h-4 w-4 text-slate-400" /> {tr('Aaj ka kaam')}</h2>
          <button type="button" onClick={() => setTilesOpen(true)} className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] font-medium text-slate-600 hover:bg-slate-100">
            <SlidersHorizontal className="h-3.5 w-3.5" />{tr('Dabbe chunein')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {work.map((w) => {
            const n = board[w.key];
            return (
              <Link
                key={w.key}
                to={`/online-orders?board=${w.key}`}
                className={cn('group flex min-w-0 items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md',
                  !n && 'opacity-70')}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${w.color}17`, color: w.color }}><w.icon className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] font-semibold text-slate-900">{w.label}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{w.hint}</span>
                </span>
                <span className="ms-auto text-[1.125rem] font-bold tabular-nums text-slate-900">
                  {countsQ.isLoading ? <Skeleton className="h-5 w-6" /> : (n ?? 0)}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {tilesOpen && <HomeTilesModal initial={work.map((w) => w.key)} onClose={() => setTilesOpen(false)} />}

      <TeamQueue />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Channels */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80" aria-labelledby="channels-title">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="channels-title" className="text-[0.9375rem] font-semibold text-slate-900">{tr('Sales channels')}</h2>
            <Link to="/online-store/connect" className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand-700 hover:underline"><Plus className="h-3.5 w-3.5" /> {tr('Channel joren')}</Link>
          </div>
          {channelsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : !salesChannels.length ? (
            <div className="rounded-xl bg-slate-50 p-4 text-center text-[0.8125rem] text-slate-600">
              {tr('Abhi koi channel nahi jura. Shopify, WooCommerce, Daraz ya apni website joren — orders khud yahan aayenge.')}
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {(['shopify', 'woocommerce', 'daraz'] as const).map((b) => <BrandLogo key={b} name={b} size={28} />)}
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {salesChannels.map((c) => (
                <li key={c.id}>
                  <Link to={`/online-orders?channel=${c.id}`} className="flex items-center gap-3 rounded-lg py-2.5 transition hover:bg-slate-50">
                    <BrandLogo name={brandForChannel(c.type, { platform: c.platform })} size={28} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-medium text-slate-900">{c.displayName}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">
                        {c.lastOrderAt ? tr('Aakhri order {{ago}}', { ago: timeAgo(c.lastOrderAt) }) : tr('Abhi koi order nahi')}
                      </span>
                    </span>
                    {c.pendingOrders > 0 && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.75rem] font-semibold text-blue-700">{tr('{{count}} naye', { count: c.pendingOrders })}</span>
                    )}
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', c.live ? 'bg-emerald-500' : 'bg-slate-300')} title={c.live ? tr('Chal raha hai') : tr('Band')} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Last 30 days */}
        <section aria-labelledby="month-title">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="month-title" className="text-[0.9375rem] font-semibold text-slate-900">{tr('Pichhle 30 din')}</h2>
            <Link to="/online-orders/reports" className="text-[0.8125rem] font-medium text-brand-700 hover:underline">{tr('Poori report')}</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {!r ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
              <KpiCard icon={CircleDollarSign} color="#16a34a" label={tr('Online sale')} value={money(r.netValue)} hint={tr('{{count}} order', { count: r.netOrders })} />
              <KpiCard icon={PackageCheck} color="#0d9488" label={tr('Delivery rate')} value={`${r.deliveryRate}%`} hint={tr('{{count}} deliver hue', { count: r.delivered })} />
              <KpiCard icon={RotateCcw} color="#c026d3" label={tr('RTO')} value={`${r.rtoRate}%`} hint={tr('{{count}} wapas', { count: r.returned })} />
              <KpiCard icon={ShoppingBag} color="#2563eb" label={tr('Ausat order')} value={money(r.avgOrderValue)} hint={tr('{{count}} customer', { count: r.customers })} />
            </>}
          </div>
          {!!reportQ.data?.riskyCities?.length && (
            <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
              <span className="font-semibold">{tr('Zyada RTO wale shehar:')}</span>{' '}
              {reportQ.data.riskyCities.slice(0, 4).map((c) => `${c.city} (${c.rtoRate}%)`).join(' · ')}
            </div>
          )}
        </section>
      </div>

      {/* Every commerce module */}
      <section aria-labelledby="modules-title">
        <h2 id="modules-title" className="mb-2 text-[0.9375rem] font-semibold text-slate-900">{tr('Nafaa Commerce — sab kuch ek jagah')}</h2>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {live.map((m) => <ModuleCard key={m.label} m={m} />)}
        </div>
        <h3 className="mb-2 mt-5 flex items-center gap-2 text-[0.875rem] font-semibold text-slate-700"><Sparkles className="h-4 w-4 text-amber-500" /> {tr('Jaldi aa raha hai')}</h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {soon.map((m) => <ModuleCard key={m.label} m={m} soon />)}
        </div>
      </section>

      {guide.isOpen && (
        <PageGuide
          title={tr('Online store — aasaan tareeqa')}
          description={tr('Nafaa aap ka main system hai: orders, stock, price aur courier sab yahin se.')}
          onClose={guide.close}
          flow={[
            { label: tr('Order aaya'), hint: tr('Shopify, Daraz, website, WhatsApp'), icon: ShoppingBag, color: '#2563eb' },
            { label: tr('Confirm'), hint: tr('Call ya WhatsApp'), icon: CheckCircle2, color: '#0d9488' },
            { label: tr('Packed'), hint: tr('Scan karke'), icon: PackageCheck, color: '#7c3aed' },
            { label: tr('Dispatched'), hint: tr('Courier ko diya'), icon: Truck, color: '#ea580c' },
            { label: tr('Delivered'), hint: tr('COD ka paisa aaya'), icon: Wallet, color: '#16a34a' },
          ]}
          steps={[
            { icon: Clock, color: '#2563eb', title: tr('Aaj ka kaam'), text: tr('Har dabbe me utne orders hain jin par kaam baqi hai. Dabba dabayein, wohi orders khul jayenge.') },
            { icon: Globe, color: '#0284c7', title: tr('Channels'), text: tr('Jitne channel jore hain sab ke orders ek jagah. Hara nishan = chal raha hai.') },
            { icon: PackageCheck, color: '#7c3aed', title: tr('Nafaa hi main hai'), text: tr('Stock, price aur products Nafaa me badlein — har channel par khud chale jate hain.') },
            { icon: FileSpreadsheet, color: '#16a34a', title: tr('Naya order'), text: tr('WhatsApp ya Instagram ka order "Add order" se — text paste karein ya Excel daalein.') },
          ]}
          shortcuts={[['N', tr('Add order')], ['O', tr('Orders')], ['G', tr('Guide')]]}
        />
      )}
    </PageShell>
  );
}

function ModuleCard({ m, soon }: { m: Module; soon?: boolean }) {
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-900">
          <span className="truncate">{m.label}</span>
          {soon && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-px text-[0.625rem] font-semibold uppercase text-amber-800">{tr('Soon')}</span>}
        </span>
        <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-500">{m.text}</span>
      </span>
    </>
  );
  const cls = cn('flex items-start gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80', m.to && 'transition hover:-translate-y-0.5 hover:shadow-md', soon && 'bg-slate-50/80');
  return m.to ? <Link to={m.to} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}
