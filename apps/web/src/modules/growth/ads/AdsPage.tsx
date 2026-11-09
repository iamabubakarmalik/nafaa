/**
 * Marketing hub (Online store → Marketing): ads spend and what it really
 * brought in. Spend per platform, campaign and ad set (typed in or imported
 * from each ads manager's export) against orders matched by discount code
 * or utm_campaign, counted on delivery: ROAS, cost per order, CAC, profit
 * after ads, budget advice and ad fatigue. Meta ads: campaigns from the
 * shop's Facebook ads account with pause / budget / duplicate, the daily
 * spend pull, the Boost product wizard and ad rules. Also the UTM link builder, Meta
 * delivered-order events with the shop's own pixel, the Google / Meta feed
 * links and Nafaa AI ad copy. The spend can be written to expenses so it
 * reaches the P&L once.
 *
 * Keys: N new spend · 1-9 tabs · G guide.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, Bot, CalendarDays, CalendarRange, Clock, GraduationCap, Rocket, Link2, Megaphone, Package, Pencil, Plus, Radio, Receipt, Rss, ShoppingBag, Sparkles,
  Store, Target, Trash2, TrendingUp, Truck, Upload, UserPlus, Wallet, Layers,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, Segmented, Skeleton, Switch, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, confirmDialog,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { BrandLogo, brandForChannel } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { ADS_AFFECTED_KEYS, ADS_KEY, adsApi, apiError, type AdEntry, type RoasRow } from '../api/growth.api';
import { MARKETING_KEY, marketingApi } from '../api/marketing.api';
import { CampaignsView, SourcesView } from '../marketing/CampaignsView';
import { LinkBuilder } from '../marketing/LinkBuilder';
import { CapiPanel } from '../marketing/CapiPanel';
import { FeedsPanel } from '../marketing/FeedsPanel';
import { AdCopyPanel } from '../marketing/AdCopyPanel';
import { MetaAdsPanel, useMetaAdsStatus } from '../meta-ads/MetaAdsPanel';
import { AdRulesPanel } from '../meta-ads/AdRulesPanel';
import { AdEntryForm } from './AdEntryForm';
import { AdsImportModal } from './AdsImportModal';
import { PLATFORM, dayLabel, roasText, rs, weekLabel } from './meta';
import { t as tr } from '@core/i18n';

type Tab = 'campaigns' | 'meta' | 'rules' | 'sources' | 'roas' | 'entries' | 'links' | 'capi' | 'feeds' | 'copy';
type RoasView = 'day' | 'week' | 'product' | 'channel';
const TABS: Tab[] = ['campaigns', 'meta', 'rules', 'sources', 'roas', 'entries', 'links', 'capi', 'feeds', 'copy'];
const DATED: Tab[] = ['campaigns', 'meta', 'sources', 'roas', 'entries'];
const MANAGERS = ['OWNER', 'ADMIN', 'MANAGER', 'SUPER_ADMIN'];

export default function AdsPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const canWrite = usePermission(PERMISSIONS.ADS_MANAGE);
  const role = useAuthStore((s) => s.user?.role);
  const canManage = canWrite && MANAGERS.includes(String(role ?? ''));
  const guide = usePageGuide();
  const canSetting = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const { salesHidden, costHidden } = useMasked();
  const showSales = (n: number | null | undefined) => (salesHidden ? MASK : rs(n));
  const showCost = (n: number | null | undefined) => (costHidden ? MASK : rs(n));
  const [tab, setTab] = useState<Tab>('campaigns');
  const [view, setView] = useState<RoasView>('day');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [form, setForm] = useState<AdEntry | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const period = resolveRange(range, startHour);
  useEffect(() => { setPage(1); }, [range]);

  const setupQ = useQuery({ queryKey: [ADS_KEY, 'setup'], queryFn: adsApi.settings, staleTime: 60_000 });
  const metaQ = useMetaAdsStatus();
  const metaLive = !!metaQ.data?.access.live;
  const hubQ = useQuery({ queryKey: [MARKETING_KEY, 'report', period], queryFn: () => marketingApi.report(period!.from, period!.to), enabled: !!period, placeholderData: (p) => p });
  const reportQ = useQuery({ queryKey: [ADS_KEY, 'report', period], queryFn: () => adsApi.report(period!.from, period!.to), enabled: !!period && tab === 'roas', placeholderData: (p) => p });
  const listQ = useQuery({ queryKey: [ADS_KEY, 'list', period, page], queryFn: () => adsApi.list({ ...(period ?? {}), page, limit: 30 }), enabled: tab === 'entries', placeholderData: (p) => p });
  const r = reportQ.data;
  const hub = hubQ.data;
  const t = hub?.totals;

  const toggle = useMutation({
    mutationFn: (on: boolean) => adsApi.saveSettings(on),
    onSuccess: (s) => { toast.success(s.postExpenses ? tr('Nayi entries Expenses me jayengi') : tr('Nayi entries Expenses me nahi jayengi')); qc.invalidateQueries({ queryKey: [ADS_KEY, 'setup'] }); },
    onError: (e) => toast.error(apiError(e, tr('Setting save nahi hui'))),
  });
  const remove = useMutation({
    mutationFn: (e: AdEntry) => adsApi.remove(e.id),
    onSuccess: () => { toast.success(tr('Entry mit gayi')); [...ADS_AFFECTED_KEYS, MARKETING_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, tr('Nahi mita'))),
  });
  const askRemove = async (e: AdEntry) => {
    if (await confirmDialog({ title: tr('{{label}} · {{day}} ({{amount}}) mitayein?', { label: PLATFORM[e.platform].label, day: dayLabel(e.day), amount: rs(e.amount) }), text: e.postExpense ? tr('Us din ka Ads Expense bhi utna kam ho jayega.') : tr('Ye sirf ROAS se niklega.'), danger: true })) remove.mutate(e);
  };
  const closeSpend = () => { setForm(null); qc.invalidateQueries({ queryKey: [MARKETING_KEY] }); };
  const closeImport = () => { setImporting(false); qc.invalidateQueries({ queryKey: [MARKETING_KEY] }); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canWrite) { e.preventDefault(); setForm('new'); }
      if (/^[1-9]$/.test(e.key)) setTab(TABS[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canWrite]);

  const profit = (v: number | null | undefined) => (v === null || v === undefined ? '—' : showCost(v));
  const roasColor = (v: number | null | undefined) => (v == null ? '#64748b' : v >= 3 ? '#16a34a' : v >= 1 ? '#d97706' : '#e11d48');

  return (
    <PageShell>
      <PageHero
        title={tr('Marketing')}
        chip={<><Megaphone /> {' '}{tr('Ads, links aur Meta')}</>}
        meta={tr('Har platform aur campaign ka kharcha, kis ad se kitne order aaye aur kitne deliver hue — ROAS, CAC aur Ads ke baad asli Profit')}
        busy={hubQ.isFetching && !hubQ.isLoading}
        loading={hubQ.isLoading}
        actions={<>
          {canWrite && <>
            <button type="button" onClick={() => setImporting(true)} className={heroButton}><Upload className="h-4 w-4" /> {' '}{tr('CSV import')}</button>
            <button type="button" onClick={() => setForm('new')} title={tr('Naya kharcha (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Aaj ka kharcha')}</button>
          </>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: tr('Ads kharcha'), value: rs(t.spend) },
          { label: tr('Delivered sale'), value: showSales(t.deliveredSales), hint: tr('{{delivered}} / {{placed}} orders', { delivered: t.delivered, placed: t.placed }) },
          { label: tr('ROAS'), value: roasText(t.roas) },
        ] : [{ label: tr('Ads kharcha'), value: '—' }]}
      />

      {DATED.includes(tab) && (
        <KpiRow cols={5}>
          {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
            <KpiCard icon={Megaphone} color="#db2777" label={tr('Ads kharcha')} value={rs(t.spend)} hint={tr('{{count}} campaigns', { count: hub!.campaigns.filter((c) => c.spend > 0).length })} />
            <KpiCard icon={Truck} color="#0ea5e9" label={tr('Delivered sale')} value={showSales(t.deliveredSales)} hint={tr('{{delivered}} delivered · {{returned}} RTO · {{open}} raste me', { delivered: t.delivered, returned: t.returned, open: t.open })} />
            <KpiCard icon={Target} color={roasColor(t.roas)} label={tr('ROAS')} value={roasText(t.roas)} hint={t.costPerOrder != null ? tr('{{amount}} har delivered order', { amount: rs(t.costPerOrder) }) : tr('Delivered sale ÷ Ads kharcha')} />
            <KpiCard icon={UserPlus} color="#7c3aed" label={tr('CAC')} value={t.cac != null ? rs(t.cac) : '—'} hint={tr('{{count}} naye customer', { count: t.newCustomers })} />
            <KpiCard icon={TrendingUp} color={(t.profitAfterAds ?? 0) >= 0 ? '#16a34a' : '#e11d48'} label={tr('Ads ke baad Profit')} value={hub!.seesProfit ? profit(t.profitAfterAds) : '—'}
              hint={hub!.seesProfit ? tr('Ads se pehle {{profitBeforeAds}}', { profitBeforeAds: profit(t.profitBeforeAds) }) : tr('Profit dekhne ki permission nahi')} />
          </>}
        </KpiRow>
      )}

      {tab === 'entries' && <PostingSetting on={setupQ.data?.postExpenses} canChange={canSetting} busy={toggle.isPending} onChange={(v) => toggle.mutate(v)} />}

      {DATED.includes(tab) && (
        <FilterBar>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" allowAll={false} />
          {period && <span className="self-center text-[0.8125rem] text-slate-500">{rangeLabel(period.from, period.to)}</span>}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canWrite && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>1</Kbd>-<Kbd>9</Kbd> {' '}{tr('tabs')}</>}
        tabs={[
          { id: 'campaigns', label: tr('Campaigns'), icon: Layers, count: hub?.campaigns.length ?? null },
          { id: 'meta', label: tr('Meta ads'), icon: Rocket },
          { id: 'rules', label: tr('Ad rules'), icon: Bot },
          { id: 'sources', label: tr('Source'), icon: Radio },
          { id: 'roas', label: tr('ROAS'), icon: BarChart3 },
          { id: 'entries', label: tr('Kharcha'), icon: Receipt, count: listQ.data?.total ?? null },
          { id: 'links', label: tr('Links'), icon: Link2 },
          { id: 'capi', label: tr('Meta events'), icon: Clock },
          { id: 'feeds', label: tr('Feeds'), icon: Rss },
          { id: 'copy', label: tr('Ad copy'), icon: Sparkles },
        ]} />

      {tab === 'campaigns' && <>
        <CampaignsView report={hub} canWrite={canWrite} show={{ sales: showSales, profit }} />
        {metaQ.data && !metaLive && <SoonStrip />}
      </>}
      {tab === 'meta' && <MetaAdsPanel period={period} canWrite={canWrite} canManage={canManage} hubCampaigns={hub?.campaigns} />}
      {tab === 'rules' && <AdRulesPanel canManage={canManage} />}
      {tab === 'sources' && <SourcesView report={hub} show={{ sales: showSales, profit }} />}
      {tab === 'roas' && <>
        <Segmented value={view} onChange={setView} label={tr('ROAS kis hisaab se')}
          items={[{ value: 'day', label: tr('Din') }, { value: 'week', label: tr('Hafta') }, { value: 'product', label: tr('Product') }, { value: 'channel', label: tr('Channel') }]} />
        {!r ? <Skeleton className="h-80 rounded-3xl" /> : (
          <RoasTable
            seesProfit={r.seesProfit}
            showSales={showSales}
            profit={profit}
            first={view === 'day' ? tr('Din') : view === 'week' ? tr('Hafta') : view === 'product' ? tr('Product') : tr('Channel')}
            empty={view === 'product' ? tr('Is period me koi online product nahi bika') : tr('Is period me na Ads kharcha hai na online sale')}
            note={view === 'product' ? tr('Product par Ads kharcha sirf un entries ka hai jin me product chuna gaya tha.') : view === 'channel' ? tr('Jin entries me channel nahi chuna gaya wo "Kisi channel se nahi juda" me hain.') : tr('Is hisaab me sab aaye hue orders gine jate hain; Campaigns tab sirf delivered ginta hai.')}
            rows={view === 'day' ? [...r.byDay].reverse().map((x) => ({ key: x.day, label: dayLabel(x.day), row: x }))
              : view === 'week' ? [...r.byWeek].reverse().map((x) => ({ key: x.week, label: weekLabel(x.week), row: x }))
                : view === 'product' ? r.byProduct.map((x) => ({ key: x.id, label: x.name, sub: x.qty ? tr('{{qty}} piece', { qty: x.qty }) : undefined, row: x }))
                  : r.byChannel.map((x) => ({ key: x.id, label: x.name, logo: x.type ? brandForChannel(x.type) : undefined, row: x }))}
          />
        )}
      </>}
      {tab === 'entries' && (
        <Entries q={listQ} canWrite={canWrite} onEdit={(e) => setForm(e)} onRemove={askRemove} busy={remove.isPending} page={page} setPage={setPage}
          onNew={() => setForm('new')} onImport={() => setImporting(true)} />
      )}
      {tab === 'links' && <LinkBuilder />}
      {tab === 'capi' && <CapiPanel canManage={canManage} />}
      {tab === 'feeds' && <FeedsPanel />}
      {tab === 'copy' && <AdCopyPanel canWrite={canWrite} />}

      {form && <AdEntryForm entry={form === 'new' ? null : form} setup={setupQ.data} onClose={closeSpend} />}
      {importing && <AdsImportModal setup={setupQ.data} onClose={closeImport} />}
      {guide.isOpen && (
        <PageGuide title={tr('Marketing')} onClose={guide.close}
          flow={[
            { label: tr('Ads kharcha'), hint: 'Meta, TikTok, Google', icon: Megaphone, color: '#db2777' },
            { label: tr('Link / code'), hint: tr('utm ya discount code'), icon: Link2, color: '#0ea5e9' },
            { label: tr('Order'), hint: tr('Campaign se juda'), icon: ShoppingBag, color: '#2563eb' },
            { label: tr('Delivered'), hint: tr('Asli sale'), icon: Truck, color: '#0d9488' },
            { label: 'ROAS · Profit', hint: tr('Ads ke baad'), icon: TrendingUp, color: '#16a34a' },
          ]}
          steps={[
            { icon: Plus, color: '#db2777', title: tr('Kharcha likhein'), text: tr('Roz ka kharcha likhein ya har platform ki CSV import karein — campaign aur ad set khud pehchane jate hain.') },
            { icon: Link2, color: '#0ea5e9', title: tr('Har ad ka link alag'), text: tr('Links tab se product ka utm link banayein, ya influencer ko apna discount code dein. Order khud us campaign me gina jata hai.') },
            { icon: Target, color: '#7c3aed', title: tr('Delivered par hisaab'), text: tr('ROAS, har order ka kharcha aur CAC sirf deliver hue orders par — RTO wale ad ko achha nahi dikhate.') },
            { icon: Wallet, color: '#16a34a', title: tr('Paisa sahi jagah'), text: tr('ROAS 1 se kam wali campaign ka kharcha achhi campaign par lagayein. Har order ka kharcha 3 din barhe to naya ad banayein.') },
            { icon: Rocket, color: '#1877f2', title: tr('Facebook ads yahin se'), text: tr('Facebook se jor kar campaigns yahin dekhein, rokein ya budget badlein. Kharcha khud aata hai, aur "Product boost karein" se ruka hua ad ban jata hai.') },
            { icon: Bot, color: '#7c3aed', title: tr('Ad rules'), text: tr('ROAS kam ho to rokein, achha ho to budget barhayein — pehle sirf mashwara, chahein to khud. Har tabdeeli wapas ho sakti hai.') },
            { icon: Clock, color: '#2563eb', title: tr('Meta ko batayein'), text: tr('Meta events on karein — delivered orders aap ke pixel par jate hain aur Meta behtar customer dhoondta hai.') },
          ]}
          shortcuts={[['N', tr('naya kharcha')], ['1-9', tr('tabs')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
  );
}

/** What needs the ad platforms' own approval: honest, with the reason. */
function SoonStrip() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-[0.8125rem] ring-1 ring-slate-200 sm:flex-row sm:items-center">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200"><Clock className="h-3.5 w-3.5" /> {tr('Jald')}</span>
      <p className="text-slate-600">
        {tr('Nafaa se ad banana, rokna ya budget badalna, aur kharcha khud aana — is ke liye Meta, Google aur TikTok ki manzoori chahiye. Manzoori milte hi yahan aa jayega; tab tak CSV import ya roz ka kharcha likhein.')}
      </p>
    </div>
  );
}

function PostingSetting({ on, canChange, busy, onChange }: { on: boolean | undefined; canChange: boolean; busy: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Wallet className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 text-[0.8125rem]">
        <p className="font-semibold text-slate-900">{tr('Ads ka kharcha Nafaa kharche me likhe')}</p>
        <p className="mt-0.5 text-slate-600">
          {on === false
            ? tr('Band hai: nayi entries sirf ROAS ke liye hain. Agar aap Ads ka kharcha Expenses me khud likhte hain to band hi rakhein, warna Profit se do baar katega.')
            : tr('On hai: har din aur platform ka kharcha ek "Ads / marketing" Expense ban jata hai aur Profit se sirf ek baar katta hai. Entry badlein ya mitayein to Expense bhi saath badalta hai.')}
        </p>
      </div>
      <Switch checked={!!on} disabled={!canChange || busy || on === undefined} onChange={(e) => onChange(e.target.checked)} aria-label={tr('Ads ka kharcha Expenses me likhein')} />
    </div>
  );
}

type Row = { key: string; label: string; sub?: string; logo?: ReturnType<typeof brandForChannel>; row: RoasRow };

function RoasTable({ rows, first, empty, note, seesProfit, showSales, profit }: {
  rows: Row[]; first: string; empty: string; note?: string; seesProfit: boolean;
  showSales: (n: number | null | undefined) => string; profit: (n: number | null | undefined) => string;
}) {
  const live = rows.filter((x) => x.row.spend > 0 || x.row.sales > 0 || x.row.orders > 0);
  if (!live.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{empty}</p>
        <p className="mt-1 text-sm text-slate-500">{tr('Roz ka Ads kharcha likhein ya ads manager ki report import karein — ROAS khud ban jayega.')}</p>
      </div>
    );
  }
  const max = Math.max(1, ...live.map((x) => Math.max(x.row.spend, x.row.sales)));
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-[0.8125rem]">
            <thead className="bg-slate-50 text-start text-[0.75rem] text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">{first}</th>
                <th className="px-2 py-2.5 text-end font-medium">{tr('Ads kharcha')}</th>
                <th className="px-2 py-2.5 text-end font-medium">{tr('Online sale')}</th>
                <th className="px-2 py-2.5 text-end font-medium">{tr('Orders')}</th>
                <th className="px-2 py-2.5 text-end font-medium">{tr('ROAS')}</th>
                <th className="px-2 py-2.5 text-end font-medium">{tr('Kharcha / order')}</th>
                {seesProfit && <th className="px-4 py-2.5 text-end font-medium">{tr('Ads ke baad Profit')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {live.map(({ key, label, sub, logo, row }) => (
                <tr key={key}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {logo && <BrandLogo name={logo} size={22} />}
                      <div className="min-w-0">
                        <p className="max-w-[14rem] truncate font-medium text-slate-900">{label}</p>
                        {sub && <p className="text-[0.6875rem] text-slate-500">{sub}</p>}
                        <div className="mt-1 flex w-36 flex-col gap-0.5" aria-hidden>
                          <span className="h-1 rounded-full bg-pink-400" style={{ width: `${(row.spend / max) * 100}%` }} />
                          <span className="h-1 rounded-full bg-sky-400" style={{ width: `${(row.sales / max) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-end tabular-nums text-slate-800">{row.spend ? rs(row.spend) : '—'}</td>
                  <td className="px-2 py-2.5 text-end tabular-nums text-slate-800">{row.sales ? showSales(row.sales) : '—'}</td>
                  <td className="px-2 py-2.5 text-end tabular-nums text-slate-600">{row.orders || '—'}{row.returned ? <span className="ms-1 text-[0.6875rem] text-rose-600">{tr('({{returned}} RTO)', { returned: row.returned })}</span> : null}</td>
                  <td className={cn('px-2 py-2.5 text-end font-semibold tabular-nums', row.roas == null ? 'text-slate-400' : row.roas >= 3 ? 'text-success-700' : row.roas >= 1.5 ? 'text-amber-700' : 'text-rose-600')}>{roasText(row.roas)}</td>
                  <td className="px-2 py-2.5 text-end tabular-nums text-slate-600">{row.costPerOrder != null ? rs(row.costPerOrder) : '—'}</td>
                  {seesProfit && <td className={cn('px-4 py-2.5 text-end font-semibold tabular-nums', (row.profitAfterAds ?? 0) >= 0 ? 'text-success-700' : 'text-rose-600')}>{profit(row.profitAfterAds)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[0.75rem] text-slate-500">
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-4 rounded-full bg-pink-400" /> {' '}{tr('Ads kharcha')}</span>
        <span className="inline-flex items-center gap-1"><span className="h-1.5 w-4 rounded-full bg-sky-400" /> {' '}{tr('Online sale')}</span>
        <span>{tr('Profit = online orders ka Profit (courier, COD, packing ke baad) − Ads.')}</span>
        {note && <span>{note}</span>}
      </p>
    </div>
  );
}

function Entries({ q, canWrite, onEdit, onRemove, busy, page, setPage, onNew, onImport }: {
  q: ReturnType<typeof useQuery<Awaited<ReturnType<typeof adsApi.list>>>>; canWrite: boolean; onEdit: (e: AdEntry) => void; onRemove: (e: AdEntry) => void; busy: boolean;
  page: number; setPage: (fn: (p: number) => number) => void; onNew: () => void; onImport: () => void;
}) {
  const data = q.data;
  if (q.isLoading) return <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>;
  if (!data?.items.length) {
    return (
      <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
        <Megaphone className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-900">{tr('Is period me koi Ads entry nahi')}</p>
        {canWrite && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={onNew} leftIcon={<Plus className="h-4 w-4" />}>{tr('Aaj ka kharcha')}</Button>
            <Button variant="secondary" onClick={onImport} leftIcon={<Upload className="h-4 w-4" />}>{tr('CSV import')}</Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {data.items.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
            <BrandLogo name={PLATFORM[e.platform].brand} size="md" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-900">{PLATFORM[e.platform].label}</span>
                {e.campaign && <span className="truncate text-[0.8125rem] text-slate-600">· {e.campaign}</span>}
                {e.source === 'CSV' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-500">{tr('CSV')}</span>}
              </p>
              <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">
                {[dayLabel(e.day), e.channel?.name, e.products?.length ? e.products.map((p) => p.name).join(', ') : null, e.orders != null ? tr('{{orders}} orders (ads manager)', { orders: e.orders }) : null,
                  e.postExpense ? (e.expenseNumber ? tr('Expense {{expenseNumber}}', { expenseNumber: e.expenseNumber }) : tr('Expense')) : tr('Expenses me nahi')].filter(Boolean).join(' · ')}
              </p>
            </div>
            <p className="text-base font-bold tabular-nums text-slate-900">{rs(e.amount)}</p>
            {canWrite && (
              <div className="flex gap-1">
                <button type="button" onClick={() => onEdit(e)} aria-label={tr('Badlein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                <button type="button" onClick={() => onRemove(e)} disabled={busy} aria-label={tr('Mitayein')} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
          <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
        </div>
      )}
      <p className="px-1 text-[0.75rem] text-slate-500">{tr('Kul {{amount}} · {{count}} entries', { amount: rs(data.totals.amount), count: data.totals.count })}</p>
    </>
  );
}
