/**
 * Ads & ROAS (Online store → Ads & ROAS): the ads spend log and what it
 * brought in. Spend against online sales by day, week, product and channel:
 * ROAS, cost per order and profit after ads. Daily entry, CSV/Excel import
 * from the ads managers, and the setting that writes the spend to expenses
 * so it reaches the P&L once.
 *
 * Keys: N new · 1-5 tabs.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, CalendarDays, GraduationCap, CalendarRange, Megaphone, Package, Pencil, Plus, Receipt, ShoppingBag, Store, Target, Trash2, TrendingUp, Upload, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, Kbd, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Switch, ViewTabs,
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
import { MASK, useMasked } from '@modules/dashboard/engine/useMasked';
import { ADS_AFFECTED_KEYS, ADS_KEY, adsApi, apiError, type AdEntry, type RoasRow } from '../api/growth.api';
import { AdEntryForm } from './AdEntryForm';
import { AdsImportModal } from './AdsImportModal';
import { PLATFORM, dayLabel, roasText, rs, weekLabel } from './meta';
import { t as tr } from '@core/i18n';

type Tab = 'day' | 'week' | 'product' | 'channel' | 'entries';

export default function AdsPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const canWrite = usePermission(PERMISSIONS.ADS_MANAGE);
  const guide = usePageGuide();
  const canSetting = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const { salesHidden, costHidden } = useMasked();
  const showSales = (n: number | null | undefined) => (salesHidden ? MASK : rs(n));
  const showCost = (n: number | null | undefined) => (costHidden ? MASK : rs(n));
  const [tab, setTab] = useState<Tab>('day');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const [form, setForm] = useState<AdEntry | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);
  const period = resolveRange(range, startHour);
  useEffect(() => { setPage(1); }, [range]);

  const setupQ = useQuery({ queryKey: [ADS_KEY, 'setup'], queryFn: adsApi.settings, staleTime: 60_000 });
  const reportQ = useQuery({ queryKey: [ADS_KEY, 'report', period], queryFn: () => adsApi.report(period!.from, period!.to), enabled: !!period, placeholderData: (p) => p });
  const listQ = useQuery({ queryKey: [ADS_KEY, 'list', period, page], queryFn: () => adsApi.list({ ...(period ?? {}), page, limit: 30 }), enabled: tab === 'entries', placeholderData: (p) => p });
  const r = reportQ.data;
  const t = r?.totals;

  const toggle = useMutation({
    mutationFn: (on: boolean) => adsApi.saveSettings(on),
    onSuccess: (s) => { toast.success(s.postExpenses ? tr('Nayi entries Expenses me jayengi') : tr('Nayi entries Expenses me nahi jayengi')); qc.invalidateQueries({ queryKey: [ADS_KEY, 'setup'] }); },
    onError: (e) => toast.error(apiError(e, tr('Setting save nahi hui'))),
  });
  const remove = useMutation({
    mutationFn: (e: AdEntry) => adsApi.remove(e.id),
    onSuccess: () => { toast.success(tr('Entry mit gayi')); ADS_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, tr('Nahi mita'))),
  });
  const askRemove = async (e: AdEntry) => {
    if (await confirmDialog({ title: tr('{{label}} · {{day}} ({{amount}}) mitayein?', { label: PLATFORM[e.platform].label, day: dayLabel(e.day), amount: rs(e.amount) }), text: e.postExpense ? tr('Us din ka Ads Expense bhi utna kam ho jayega.') : tr('Ye sirf ROAS se niklega.'), danger: true })) remove.mutate(e);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canWrite) { e.preventDefault(); setForm('new'); }
      const tabs: Tab[] = ['day', 'week', 'product', 'channel', 'entries'];
      if (/^[1-5]$/.test(e.key)) setTab(tabs[Number(e.key) - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canWrite]);

  const profit = (v: number | null | undefined) => (v === null || v === undefined ? '—' : showCost(v));

  return (
    <PageShell>
      <PageHero
        title={tr('Ads & ROAS')}
        chip={<><Megaphone /> {' '}{tr('Ads ka kharcha')}</>}
        meta={tr('Facebook, Instagram, TikTok ya Google par kitna lagaya aur kitni online sale aayi — ROAS, har order ka Ads kharcha aur Ads ke baad Profit')}
        busy={reportQ.isFetching && !reportQ.isLoading}
        loading={reportQ.isLoading}
        actions={<>
          {canWrite && <>
            <button type="button" onClick={() => setImporting(true)} className={heroButton}><Upload className="h-4 w-4" /> {' '}{tr('CSV import')}</button>
            <button type="button" onClick={() => setForm('new')} title={tr('Naya kharcha (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Aaj ka kharcha')}</button>
          </>}
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={t ? [
          { label: tr('Ads kharcha'), value: rs(t.spend) },
          { label: tr('Online sale'), value: showSales(t.sales), hint: tr('{{orders}} orders', { orders: t.orders }) },
          { label: tr('ROAS'), value: roasText(t.roas) },
        ] : [{ label: tr('Ads kharcha'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!t ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Megaphone} color="#db2777" label={tr('Ads kharcha')} value={rs(t.spend)} hint={r!.byPlatform.map((p) => `${PLATFORM[p.platform].short} ${p.share}%`).join(' · ') || tr('Abhi koi entry nahi')} />
          <KpiCard icon={ShoppingBag} color="#0ea5e9" label={tr('Online sale')} value={showSales(t.sales)} hint={tr('{{orders}} orders · {{returned}} wapas', { orders: t.orders, returned: t.returned })} />
          <KpiCard icon={Target} color={t.roas == null ? '#64748b' : t.roas >= 3 ? '#16a34a' : t.roas >= 1.5 ? '#d97706' : '#e11d48'} label={tr('ROAS')} value={roasText(t.roas)} hint={tr('Sale ÷ Ads kharcha')} />
          <KpiCard icon={Receipt} color="#7c3aed" label={tr('Har order ka Ads kharcha')} value={t.costPerOrder != null ? rs(t.costPerOrder) : '—'} hint={tr('Ads kharcha ÷ orders')} />
          <KpiCard icon={TrendingUp} color={(t.profitAfterAds ?? 0) >= 0 ? '#16a34a' : '#e11d48'} label={tr('Ads ke baad Profit')} value={r!.seesProfit ? profit(t.profitAfterAds) : '—'}
            hint={r!.seesProfit ? tr('Ads se pehle {{profitBeforeAds}}', { profitBeforeAds: profit(t.profitBeforeAds) }) : tr('Profit dekhne ki permission nahi')} />
        </>}
      </KpiRow>

      <PostingSetting on={setupQ.data?.postExpenses} canChange={canSetting} busy={toggle.isPending} onChange={(v) => toggle.mutate(v)} />

      <FilterBar>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="week" allowAll={false} />
        {period && <span className="self-center text-[0.8125rem] text-slate-500">{rangeLabel(period.from, period.to)}</span>}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canWrite && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>1</Kbd>-<Kbd>5</Kbd> {' '}{tr('tabs')}</>}
        tabs={[
          { id: 'day', label: tr('Din'), icon: CalendarDays },
          { id: 'week', label: tr('Hafta'), icon: CalendarRange },
          { id: 'product', label: tr('Product'), icon: Package, count: r?.byProduct.length ?? null },
          { id: 'channel', label: tr('Channel'), icon: Store },
          { id: 'entries', label: tr('Entries'), icon: BarChart3, count: listQ.data?.total ?? null },
        ]} />

      {tab === 'entries' ? (
        <Entries q={listQ} canWrite={canWrite} onEdit={(e) => setForm(e)} onRemove={askRemove} busy={remove.isPending} page={page} setPage={setPage}
          onNew={() => setForm('new')} onImport={() => setImporting(true)} />
      ) : !r ? <Skeleton className="h-80 rounded-3xl" /> : (
        <RoasTable
          seesProfit={r.seesProfit}
          showSales={showSales}
          profit={profit}
          first={tab === 'day' ? tr('Din') : tab === 'week' ? tr('Hafta') : tab === 'product' ? tr('Product') : tr('Channel')}
          empty={tab === 'product' ? tr('Is period me koi online product nahi bika') : tr('Is period me na Ads kharcha hai na online sale')}
          note={tab === 'product' ? tr('Product par Ads kharcha sirf un entries ka hai jin me product chuna gaya tha.') : tab === 'channel' ? tr('Jin entries me channel nahi chuna gaya wo "Kisi channel se nahi juda" me hain.') : undefined}
          rows={tab === 'day' ? [...r.byDay].reverse().map((x) => ({ key: x.day, label: dayLabel(x.day), row: x }))
            : tab === 'week' ? [...r.byWeek].reverse().map((x) => ({ key: x.week, label: weekLabel(x.week), row: x }))
              : tab === 'product' ? r.byProduct.map((x) => ({ key: x.id, label: x.name, sub: x.qty ? tr('{{qty}} piece', { qty: x.qty }) : undefined, row: x }))
                : r.byChannel.map((x) => ({ key: x.id, label: x.name, logo: x.type ? brandForChannel(x.type) : undefined, row: x }))}
        />
      )}

      {form && <AdEntryForm entry={form === 'new' ? null : form} setup={setupQ.data} onClose={() => setForm(null)} />}
      {importing && <AdsImportModal setup={setupQ.data} onClose={() => setImporting(false)} />}
      {guide.isOpen && (
        <PageGuide title={tr('Ads & ROAS')} onClose={guide.close}
          flow={[
            { label: tr('Ads kharcha'), hint: 'Meta, TikTok, Google', icon: Megaphone, color: '#db2777' },
            { label: tr('Online sale'), hint: tr('Orders se khud'), icon: ShoppingBag, color: '#2563eb' },
            { label: 'ROAS', hint: tr('Sale ÷ kharcha'), icon: BarChart3, color: '#7c3aed' },
            { label: 'Profit', hint: tr('Ads ke baad'), icon: TrendingUp, color: '#16a34a' },
          ]}
          steps={[
            { icon: Plus, color: '#db2777', title: tr('Kharcha likhein'), text: tr('Roz ka Ads kharcha likhein ya platform ki CSV import karein.') },
            { icon: BarChart3, color: '#7c3aed', title: tr('ROAS dekhein'), text: tr('Har 1 rupay ke Ads par kitni sale aayi — 3 se upar achha hai.') },
            { icon: TrendingUp, color: '#16a34a', title: tr('Asli Profit'), text: tr('Ads ka kharcha har order par baant kar Profit me ghata diya jata hai.') },
          ]}
          shortcuts={[['N', tr('naya kharcha')], ['G', tr('guide')]]}
        />
      )}
    </PageShell>
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
