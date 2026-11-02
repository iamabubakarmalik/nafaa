/**
 * Discount codes: what each code brought in (bills, sales, discount given,
 * customers, branches) for any period; create and edit with branch and
 * per-customer limits and business-day dates; share on WhatsApp; used codes
 * are switched off rather than deleted.
 *
 * Keys: / search · N new code · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowDownWideNarrow, BadgePercent, BarChart3, CalendarClock, Check, Copy, Download, GraduationCap, ListChecks, MessageCircle, Pencil,
  Percent, Plus, Store, Tag, Trash2, TrendingUp, Trophy, Users, Wallet, Wand2,
} from 'lucide-react';
import {
  Button, Card, DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, IconButton, Input, KpiCard, KpiRow, Modal, PageHero, PageShell,
  SearchField, Skeleton, Switch, Table, TBody, THead, Td, Th, Tr, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange,
  type DateRangeValue, type FilterOption,
} from '@/design-system/components';
import { PageGuide, type GuideStep } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { downloadCsv } from '@core/lib/csv';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useBusinessDayStart } from '@core/lib/business-day';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { rangeLabel } from '@core/lib/dateRange';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { discountsApi, type CreateDiscountPayload, type DiscountCode, type DiscountStatus, type DiscountType } from '../api/discounts.api';
import { t as tr, Trans } from '@core/i18n';

const STATUS: Record<DiscountStatus, { label: string; tone: string }> = {
  active: { label: tr('Chalu'), tone: 'bg-success-50 text-success-700' },
  scheduled: { label: tr('Shuru hoga'), tone: 'bg-sky-50 text-sky-700' },
  expired: { label: tr('Period khatam'), tone: 'bg-slate-100 text-slate-600' },
  used_up: { label: tr('Had poori'), tone: 'bg-amber-50 text-amber-800' },
  inactive: { label: tr('Band'), tone: 'bg-slate-100 text-slate-500' },
};
const TABS: Array<{ id: 'all' | DiscountStatus; label: string }> = [
  { id: 'active', label: tr('Chalu') }, { id: 'scheduled', label: tr('Shuru hone wale') }, { id: 'used_up', label: tr('Had poori') },
  { id: 'expired', label: tr('Period khatam') }, { id: 'inactive', label: tr('Band') }, { id: 'all', label: tr('Sab') },
];
type Sort = 'revenue' | 'given' | 'ending' | 'new' | 'code';
const SORTS: Array<FilterOption<Sort>> = [
  { value: 'revenue', label: tr('Zyada Sale pehle') }, { value: 'given', label: tr('Zyada Discount diya') }, { value: 'ending', label: tr('Jald khatam hone wale') },
  { value: 'new', label: tr('Naye pehle') }, { value: 'code', label: tr('Code (A–Z)') },
];
type Kind = 'all' | DiscountType;
const KINDS: Array<FilterOption<Kind>> = [
  { value: 'all', label: tr('Har tarah'), icon: ListChecks, color: '#475569' },
  { value: 'PERCENTAGE', label: tr('Percent (%)'), icon: Percent, color: '#7c3aed' },
  { value: 'FIXED_AMOUNT', label: tr('Seedhi amount'), icon: Wallet, color: '#16a34a' },
];
const PRESETS: Array<{ code: string; description: string; type: DiscountType; value: number; minPurchase?: number; maxDiscount?: number }> = [
  { code: 'EID2026', description: tr('Eid special'), type: 'PERCENTAGE', value: 20, minPurchase: 1000, maxDiscount: 1000 },
  { code: 'SALE10', description: tr('Har cheez par 10%'), type: 'PERCENTAGE', value: 10 },
  { code: 'NEW500', description: tr('Naye customer ke liye'), type: 'FIXED_AMOUNT', value: 500, minPurchase: 3000 },
  { code: 'BULK15', description: tr('Bari khareedari par'), type: 'PERCENTAGE', value: 15, minPurchase: 10000 },
  { code: 'FLASH50', description: tr('Aaj ka flash sale'), type: 'PERCENTAGE', value: 50, maxDiscount: 2000 },
];

const offText = (d: Pick<DiscountCode, 'type' | 'value' | 'maxDiscount'>) =>
  d.type === 'PERCENTAGE' ? tr('{{value}}% off{{value2}}', { value: d.value, value2: d.maxDiscount ? tr(' (zyada se zyada {{maxDiscount}})', { maxDiscount: formatPKR(d.maxDiscount) }) : '' }) : tr('{{formatPKR}} off', { formatPKR: formatPKR(d.value) });
const day = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : null);
const daysLeft = (v?: string | null) => (v ? Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000) : null);
const keyOf = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-CA') : '');

export default function DiscountsPage() {
  const qc = useQueryClient();
  const theme = useChartTheme();
  const canManage = usePermission(PERMISSIONS.DISCOUNTS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) ?? tr('Hamari dukaan');
  const startHour = useBusinessDayStart();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const [view, setView] = useState<'codes' | 'analytics'>('codes');
  const [tab, setTab] = useState<'all' | DiscountStatus>('active');
  const [kind, setKind] = useState<Kind>('all');
  const [sort, setSort] = useState<Sort>('revenue');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<DiscountCode | 'new' | null>(null);
  const [removing, setRemoving] = useState<DiscountCode | null>(null);
  const [guide, setGuide] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const list = useQuery({ queryKey: ['discounts', period?.from, period?.to], queryFn: () => discountsApi.list(period ?? undefined), placeholderData: (p) => p });
  const refresh = () => qc.invalidateQueries({ queryKey: ['discounts'] });
  const toggle = useMutation({ mutationFn: discountsApi.toggle, onSuccess: (d) => { toast.success(d.isActive ? tr('Code chalu') : tr('Code band')); void refresh(); } });
  const remove = useMutation({ mutationFn: discountsApi.remove, onSuccess: (r) => { toast.success(r.message); setRemoving(null); void refresh(); } });

  const all = useMemo(() => list.data?.items ?? [], [list.data]);
  const items = useMemo(() => {
    const t = search.trim().toLowerCase();
    const out = all.filter((d) => (tab === 'all' || d.status === tab) && (kind === 'all' || d.type === kind)
      && (!t || d.code.toLowerCase().includes(t) || d.description?.toLowerCase().includes(t)));
    const end = (d: DiscountCode) => (d.validUntil ? new Date(d.validUntil).getTime() : Infinity);
    const by: Record<Sort, (a: DiscountCode, b: DiscountCode) => number> = {
      revenue: (a, b) => b.revenue - a.revenue, given: (a, b) => b.discountGiven - a.discountGiven, ending: (a, b) => end(a) - end(b),
      new: () => 0, code: (a, b) => a.code.localeCompare(b.code),
    };
    return sort === 'new' ? out : [...out].sort(by[sort]);
  }, [all, tab, kind, sort, search]);
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: all.length };
    for (const d of all) m[d.status] = (m[d.status] ?? 0) + 1;
    return m;
  }, [all]);
  const endingSoon = useMemo(() => all.filter((d) => d.status === 'active' && (daysLeft(d.validUntil) ?? 99) <= 7).length, [all]);
  const top = useMemo(() => [...all].filter((d) => d.uses > 0).sort((a, b) => b.revenue - a.revenue), [all]);
  const t = list.data?.totals;
  const hasFilters = !!(search.trim() || kind !== 'all');
  const clear = () => { setSearch(''); setKind('all'); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setView('codes'); setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'n' && canManage) setEditing('new');
      else if (k === 'a') setView((v) => (v === 'codes' ? 'analytics' : 'codes'));
      else if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const periodText = period ? rangeLabel(period.from, period.to) : tr('Sab waqt');
  const exportCsv = () => {
    if (!items.length) return toast.error(tr('Koi code nahi'));
    downloadCsv(`discount-codes-${new Date().toISOString().slice(0, 10)}.csv`, [
      [tr('Code'), tr('Details'), tr('Discount'), tr('Kam se kam'), tr('Had'), tr('Istemal'), tr('Har customer'), tr('Shuru'), tr('Khatam'), tr('Halat'), tr('Is period: bill'), tr('Sale'), tr('Discount diya'), tr('Customers')],
      ...items.map((d) => [d.code, d.description ?? '', offText(d), d.minPurchase, d.usageLimit ?? '', d.usageCount, d.perCustomerLimit ?? '', day(d.validFrom) ?? '', day(d.validUntil) ?? '', STATUS[d.status].label, d.uses, d.revenue.toFixed(2), d.discountGiven.toFixed(2), d.customers]),
    ]);
  };
  const printDoc = (): PrintDoc => ({
    title: tr('Discount codes'), subtitle: periodText,
    meta: [[tr('Codes'), String(items.length)], [tr('Sale'), formatPKR(t?.revenue ?? 0)], [tr('Discount diya'), formatPKR(t?.discountGiven ?? 0)]],
    sections: [{
      kind: 'table',
      columns: [{ label: tr('Code') }, { label: tr('Discount') }, { label: tr('Halat'), wideOnly: true }, { label: tr('Bill'), align: 'right' }, { label: tr('Sale'), align: 'right' }, { label: tr('Discount diya'), align: 'right' }],
      rows: items.map((d) => [d.code, offText(d), STATUS[d.status].label, String(d.uses), formatPKR(d.revenue), formatPKR(d.discountGiven)]),
      footer: [tr('Kul'), '', '', String(items.reduce((a, d) => a + d.uses, 0)), formatPKR(items.reduce((a, d) => a + d.revenue, 0)), formatPKR(items.reduce((a, d) => a + d.discountGiven, 0))],
    }],
  });
  const share = (d: DiscountCode) => {
    const text = tr('🎁 {{shopName}} ki taraf se khaas offer!\n\nCode: *{{code}}* — {{offText}}{{value}}{{value2}}\n\nBill banwate waqt yeh code batayein. Shukriya!', { shopName, code: d.code, offText: offText(d), value: d.minPurchase ? tr('\nKam se kam {{minPurchase}} ki khareedari par', { minPurchase: formatPKR(d.minPurchase) }) : '', value2: d.validUntil ? tr('\n{{validUntil}} tak', { validUntil: day(d.validUntil) }) : '' });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <PageShell>
      {editing && <CodeEditor code={editing === 'new' ? null : editing} shops={list.data?.shops ?? []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void refresh(); }} />}
      {removing && (
        <Modal open onClose={() => setRemoving(null)} size="sm" title={removing.usageCount ? tr('{{code}} band karein?', { code: removing.code }) : tr('{{code}} mitayein?', { code: removing.code })}
          description={removing.usageCount ? tr('Yeh code bills par lag chuka hai — mitega nahi, band ho jayega. Purane bills ka hisaab bacha rahega.') : tr('Yeh code kabhi istemal nahi hua.')}
          footer={<><Button variant="secondary" onClick={() => setRemoving(null)}>{tr('Rehne dein')}</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(removing.id)}>{removing.usageCount ? tr('Band karein') : tr('Mitayein')}</Button></>}>
          <p className="text-[0.875rem] text-slate-600">{offText(removing)}{removing.description ? ` · ${removing.description}` : ''}</p>
        </Modal>
      )}
      {guide && <DiscountsGuide onClose={() => setGuide(false)} />}

      <PageHero
        title={tr('Discount codes')}
        chip={<><Tag />{t ? tr('{{active}} chalu', { active: t.active }) : '…'}</>}
        meta={periodText}
        busy={list.isFetching && !list.isLoading}
        loading={list.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroIconButton} title={tr('CSV')}><Download className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya code')}</button>}
        </>}
        stats={[
          { label: tr('Codes se Sale'), value: formatPKR(t?.revenue ?? 0), hint: tr('{{value}} bill', { value: t?.uses ?? 0 }) },
          { label: tr('Discount diya'), value: formatPKR(t?.discountGiven ?? 0), hint: t?.revenue ? tr('Sale ka {{value}}%', { value: ((t.discountGiven / t.revenue) * 100).toFixed(1) }) : '' },
          { label: tr('Customers'), value: String(t?.customers ?? 0), hint: tr('jinhon ne code lagaya') },
          { label: tr('Har Rs 1 Discount par'), value: t?.discountGiven ? formatPKR(t.revenue / t.discountGiven) : '—', hint: tr('Sale aayi') },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Tag} color="#16a34a" label={tr('Chalu codes')} value={counts.active ?? 0} hint={tr('{{value}} mein se', { value: counts.all ?? 0 })} active={tab === 'active'} onClick={() => { setTab('active'); setView('codes'); }} />
        <KpiCard icon={CalendarClock} color="#d97706" label={tr('7 din mein khatam')} value={endingSoon} hint={tr('Chalu codes')} onClick={() => { setTab('active'); setSort('ending'); setView('codes'); }} />
        <KpiCard icon={CalendarClock} color="#0284c7" label={tr('Shuru hone wale')} value={counts.scheduled ?? 0} active={tab === 'scheduled'} onClick={() => { setTab('scheduled'); setView('codes'); }} />
        <KpiCard icon={BadgePercent} color="#e11d48" label={tr('Had poori')} value={counts.used_up ?? 0} hint={tr('Jitni dafa chalna tha chal gaya')} active={tab === 'used_up'} onClick={() => { setTab('used_up'); setView('codes'); }} />
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Code ya details…')} label={tr('Code dhoondein')} />}
        chips={hasFilters ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>“{search.trim()}”</FilterChip>}
          {kind !== 'all' && <FilterChip onRemove={() => setKind('all')}>{KINDS.find((k) => k.value === kind)?.label}</FilterChip>}
        </> : undefined}
        onClear={clear}
      >
        <div className="-mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {TABS.map((x) => (
            <button key={x.id} type="button" onClick={() => setTab(x.id)} aria-pressed={tab === x.id}
              className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-[0.8125rem] font-semibold transition', tab === x.id ? 'bg-slate-900 text-white shadow' : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/70')}>
              {x.label}<span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', tab === x.id ? 'bg-white/20' : 'bg-white text-slate-600')}>{counts[x.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <FilterMenu icon={Percent} label={tr('Tarah')} value={kind} options={KINDS} onChange={setKind} active={kind !== 'all'} width="w-56" />
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Hisaab')} defaultPreset="thisMonth" />
        <FilterMenu icon={ArrowDownWideNarrow} label={tr('Sort')} value={sort} options={SORTS} onChange={setSort} align="right" width="w-60" />
      </FilterBar>

      <ViewTabs
        tabs={[{ id: 'codes', label: tr('Codes'), icon: Tag, count: items.length }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]}
        value={view} onChange={setView}
        hint={<>{tr('Sale aur Discount: {{periodText}}', { periodText })}</>}
      />

      {view === 'analytics' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title={tr('Har code: Sale aur Discount')} description={periodText}>
            {list.isLoading ? <Skeleton className="h-64 rounded-xl" /> : top.length === 0 ? <p className="py-16 text-center text-[0.875rem] text-slate-500">{tr('Is period mein koi code istemal nahi hua')}</p> : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={top.slice(0, 10)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="code" tick={theme.axis} axisLine={false} tickLine={false} />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={56} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} formatter={(v) => formatPKR(Number(v) || 0)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Sale" fill={theme.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="discountGiven" name="Discount" fill={theme.highlight} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card className="rounded-2xl" title={tr('Percent ya amount')} description={tr('Percent ya seedhi amount')}>
            <ul className="space-y-3 text-[0.8125rem]">
              {KINDS.slice(1).map((k) => {
                const rows = all.filter((d) => d.type === k.value);
                const rev = rows.reduce((a, d) => a + d.revenue, 0);
                const given = rows.reduce((a, d) => a + d.discountGiven, 0);
                return (
                  <li key={k.value} className="rounded-xl bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">{k.label} <span className="font-normal text-slate-500">{tr('· {{count}} codes', { count: rows.length })}</span></p>
                    <p className="mt-1 flex justify-between text-slate-600"><span>{tr('Sale')}</span><strong className="tabular-nums">{formatPKR(rev)}</strong></p>
                    <p className="flex justify-between text-slate-600"><span>{tr('Discount')}</span><strong className="tabular-nums text-pink-700">{formatPKR(given)}</strong></p>
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card className="rounded-2xl lg:col-span-3" title={<span className="inline-flex items-center gap-2"><Trophy className="h-4 w-4 text-brand-600" />{tr('Kaunsa code kaam aaya')}</span>} description={tr('Har Rs 1 Discount par kitni Sale')} flush>
            {top.length === 0 ? <p className="px-5 py-10 text-center text-[0.8125rem] text-slate-500">{tr('Abhi kuch nahi')}</p> : (
              <Table minWidth="40rem">
                <THead><Tr><Th>{tr('Code')}</Th><Th align="right">{tr('Bill')}</Th><Th align="right">{tr('Customers')}</Th><Th align="right">{tr('Sale')}</Th><Th align="right">{tr('Discount')}</Th><Th align="right">{tr('Rs 1 par')}</Th><Th>{tr('Branches')}</Th></Tr></THead>
                <TBody>
                  {top.map((d) => (
                    <Tr key={d.id} interactive onClick={() => canManage && setEditing(d)}>
                      <Td className="font-mono font-semibold text-slate-900">{d.code}</Td>
                      <Td align="right">{d.uses}</Td>
                      <Td align="right">{d.customers}</Td>
                      <Td align="right" className="font-semibold">{formatPKR(d.revenue)}</Td>
                      <Td align="right" className="text-pink-700">{formatPKR(d.discountGiven)}</Td>
                      <Td align="right" className="font-semibold text-success-700">{d.discountGiven ? formatPKR(d.revenue / d.discountGiven) : '—'}</Td>
                      <Td className="max-w-[16rem] truncate text-[0.75rem] text-slate-500">{d.branches.map((b) => `${b.name}: ${b.uses}`).join(' · ') || '—'}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      ) : list.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl bg-white ring-1 ring-slate-200/80">
          <EmptyState icon={<BadgePercent className="h-6 w-6" />}
            title={hasFilters || tab !== 'all' ? tr('Is filter mein koi code nahi') : tr('Abhi koi discount code nahi')}
            description={tr('Code banayein, WhatsApp par customers ko bhejein — POS par bill banate waqt lagta hai.')}
            action={<>
              {(hasFilters || tab !== 'all') && <Button variant="secondary" onClick={() => { clear(); setTab('all'); }}>{tr('Filter hatayein')}</Button>}
              {canManage && <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setEditing('new')}>{tr('Naya code')}</Button>}
            </>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((d) => {
            const left = daysLeft(d.validUntil);
            const usePct = d.usageLimit ? Math.min(100, (d.usageCount / d.usageLimit) * 100) : null;
            const branches = d.shopIds.length ? d.shopIds.map((id) => list.data?.shops.find((s) => s.id === id)?.name).filter(Boolean) : null;
            return (
              <article key={d.id} className={cn('flex flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80', d.status !== 'active' && 'opacity-85')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" onClick={() => { void navigator.clipboard.writeText(d.code); toast.success(tr('{{code}} copy ho gaya', { code: d.code })); }} title={tr('Copy')}
                      className="group inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono text-[1.0625rem] font-bold tracking-wider text-brand-800 hover:bg-brand-100">
                      {d.code}<Copy className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" />
                    </button>
                    {d.description && <p className="mt-1.5 truncate text-[0.8125rem] text-slate-600">{d.description}</p>}
                  </div>
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold', STATUS[d.status].tone)}>{STATUS[d.status].label}</span>
                </div>
                <p className="mt-3 text-[1.25rem] font-bold text-slate-900">{offText(d)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[0.6875rem]">
                  {d.minPurchase > 0 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{tr('Kam se kam {{minPurchase}}', { minPurchase: formatPKR(d.minPurchase) })}</span>}
                  {d.perCustomerLimit && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-600">{tr('Har customer {{perCustomerLimit}} dafa', { perCustomerLimit: d.perCustomerLimit })}</span>}
                  {branches && <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 text-violet-700"><Store className="h-3 w-3" />{branches.join(', ')}</span>}
                  {(d.validFrom || d.validUntil) && (
                    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5', left !== null && left <= 3 && left >= 0 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600')}>
                      <CalendarClock className="h-3 w-3" />{[day(d.validFrom), day(d.validUntil)].filter(Boolean).join(' — ')}{left !== null && left >= 0 && left <= 30 ? tr(' · {{left}} din baqi', { left }) : ''}
                    </span>
                  )}
                </div>
                {usePct !== null && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[0.6875rem] text-slate-500"><span>{tr('Istemal')}</span><span className="tabular-nums">{d.usageCount} / {d.usageLimit}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', usePct >= 100 ? 'bg-amber-500' : 'bg-brand-500')} style={{ width: `${usePct}%` }} /></div>
                  </div>
                )}
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                  <div><dt className="text-[0.6875rem] text-slate-500">{tr('Bill')}</dt><dd className="font-bold tabular-nums">{d.uses}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">{tr('Sale')}</dt><dd className="truncate font-bold tabular-nums">{formatPKR(d.revenue)}</dd></div>
                  <div><dt className="text-[0.6875rem] text-slate-500">{tr('Diya')}</dt><dd className="truncate font-bold tabular-nums text-pink-700">{formatPKR(d.discountGiven)}</dd></div>
                </dl>
                {d.branches.length > 1 && <p className="mt-2 truncate text-[0.6875rem] text-slate-500">{d.branches.map((b) => `${b.name}: ${b.uses}`).join(' · ')}</p>}
                <div className="mt-auto flex items-center gap-1 pt-3">
                  <Button size="sm" variant="secondary" className="flex-1 text-success-700" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={() => share(d)}>{tr('Bhejein')}</Button>
                  {canManage && (
                    <>
                      <IconButton label={tr('Badlein')} onClick={() => setEditing(d)}><Pencil className="h-4 w-4" /></IconButton>
                      <Switch aria-label={d.isActive ? tr('Band karein') : tr('Chalu karein')} title={d.isActive ? tr('Band karein') : tr('Chalu karein')} checked={d.isActive}
                        disabled={toggle.isPending} onChange={() => toggle.mutate(d.id)} />
                      <IconButton label={d.usageCount ? tr('Band karein') : tr('Mitayein')} className="text-rose-600 hover:bg-rose-50" onClick={() => setRemoving(d)}><Trash2 className="h-4 w-4" /></IconButton>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function CodeEditor({ code, shops, onClose, onSaved }: { code: DiscountCode | null; shops: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<CreateDiscountPayload>(() => code ? {
    code: code.code, description: code.description ?? '', type: code.type, value: code.value, minPurchase: code.minPurchase,
    maxDiscount: code.maxDiscount ?? null, usageLimit: code.usageLimit ?? null, perCustomerLimit: code.perCustomerLimit ?? null,
    shopIds: code.shopIds ?? [], validFrom: keyOf(code.validFrom) || null, validUntil: keyOf(code.validUntil) || null, isActive: code.isActive,
  } : { code: '', description: '', type: 'PERCENTAGE', value: 10, minPurchase: 0, maxDiscount: null, usageLimit: null, perCustomerLimit: null, shopIds: [], validFrom: null, validUntil: null, isActive: true });
  const [sample, setSample] = useState(2000);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<CreateDiscountPayload>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const payload = { ...f, code: f.code.toUpperCase().replace(/\s+/g, ''), description: f.description?.trim() || undefined, maxDiscount: f.type === 'PERCENTAGE' ? f.maxDiscount : null };
      return code ? discountsApi.update(code.id, payload) : discountsApi.create(payload);
    },
    onSuccess: () => { toast.success(code ? tr('Code badal diya') : tr('Code ban gaya')); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || tr('Save nahi hua')),
  });
  const preview = (() => {
    if (sample < (f.minPurchase ?? 0)) return null;
    let off = f.type === 'PERCENTAGE' ? (sample * f.value) / 100 : f.value;
    if (f.type === 'PERCENTAGE' && f.maxDiscount) off = Math.min(off, f.maxDiscount);
    return Math.min(off, sample);
  })();
  const errors = {
    code: f.code.trim().length < 3 ? tr('Code kam se kam 3 harf ka ho') : undefined,
    value: !(f.value > 0) ? tr('Discount 0 se zyada likhein') : f.type === 'PERCENTAGE' && f.value > 100 ? tr('100% se zyada nahi ho sakta') : undefined,
    validUntil: f.validFrom && f.validUntil && f.validFrom > f.validUntil ? tr('"Kab tak" ki date "Kab se" ke baad honi chahiye') : undefined,
  };
  const ok = !Object.values(errors).some(Boolean);
  const submit = () => { setTried(true); if (ok && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);
  const num = (v: string) => (v === '' ? null : Number(v.replace(/[^\d.]/g, '')));
  return (
    <Modal open onClose={onClose} size="lg" title={code ? tr('Badlein: {{code}}', { code: code.code }) : tr('Naya discount code')} description={tr('Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={submit}>{code ? tr('Save karein') : tr('Bana dein')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        {!code && (
          <div>
            <p className="mb-1.5 text-[0.75rem] font-medium text-slate-500">{tr('Tayyar misalein')}</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => <Button key={p.code} size="xs" variant="secondary" onClick={() => set({ ...p, maxDiscount: p.maxDiscount ?? null, minPurchase: p.minPurchase ?? 0 })}>{p.code}</Button>)}
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <Input autoFocus label={tr('Code')} required value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })} maxLength={40} placeholder="EID2026"
              className="font-mono font-bold tracking-wider" wrapperClassName="flex-1" error={show('code')} hint={tr('Customer yahi bolega; khali jagah nahi')} />
            <IconButton label={tr('Khud banayein')} variant="secondary" className="mb-6" onClick={() => set({ code: `NF${Math.random().toString(36).slice(2, 7).toUpperCase()}` })}><Wand2 className="h-4 w-4" /></IconButton>
          </div>
          <Input label={tr('Details')} value={f.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder={tr('Eid special')} hint={tr('Sirf aap ke liye — kis liye banaya')} maxLength={120} />
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={tr('Discount ka tareeqa')}>
          {([['PERCENTAGE', Percent, tr('Percent (%)'), tr('Bill ka hissa')], ['FIXED_AMOUNT', Wallet, tr('Seedhi amount'), tr('Itne rupay kam')]] as const).map(([v, Icon, l, h]) => (
            <button key={v} type="button" role="radio" aria-checked={f.type === v} onClick={() => set({ type: v })} className={cn('flex items-center gap-3 rounded-xl border p-3 text-start', f.type === v ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20' : 'border-slate-200 hover:bg-slate-50')}>
              <Icon className="h-5 w-5 text-brand-600" /><span><span className="block text-[0.875rem] font-semibold">{l}</span><span className="block text-[0.75rem] text-slate-500">{h}</span></span>
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={f.type === 'PERCENTAGE' ? tr('Kitna %') : tr('Kitne rupay')} required inputMode="decimal" value={f.value || ''} onChange={(e) => set({ value: Number(e.target.value.replace(/[^\d.]/g, '')) })} className="tabular-nums" error={show('value')} />
          <Input label={tr('Kam se kam khareedari')} inputMode="decimal" value={f.minPurchase || ''} onChange={(e) => set({ minPurchase: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} placeholder={tr('Koi shart nahi')} className="tabular-nums" hint={tr('Is se chhote bill par nahi lagega')} />
          {f.type === 'PERCENTAGE' && <Input label={tr('Zyada se zyada Discount')} inputMode="decimal" value={f.maxDiscount ?? ''} onChange={(e) => set({ maxDiscount: num(e.target.value) })} placeholder={tr('Koi had nahi')} className="tabular-nums" hint={tr('Bare bill par bhi is se zyada nahi')} />}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Kul kitni dafa chalega')} inputMode="numeric" value={f.usageLimit ?? ''} onChange={(e) => set({ usageLimit: num(e.target.value) })} placeholder={tr('Koi had nahi')} className="tabular-nums" />
          <Input label={tr('Ek customer kitni dafa')} inputMode="numeric" value={f.perCustomerLimit ?? ''} onChange={(e) => set({ perCustomerLimit: num(e.target.value) })} placeholder={tr('Koi had nahi')} className="tabular-nums" hint={tr('Naam wale customer par lagta hai')} />
          <Input label={tr('Kab se')} type="date" value={f.validFrom ?? ''} onChange={(e) => set({ validFrom: e.target.value || null })} hint={tr('Khali = abhi se')} />
          <Input label={tr('Kab tak')} type="date" value={f.validUntil ?? ''} onChange={(e) => set({ validUntil: e.target.value || null })} error={show('validUntil')} hint={tr('Us din ke aakhir tak chalega')} />
        </div>
        {shops.length > 1 && (
          <div>
            <span className="text-[0.8125rem] font-medium text-slate-700">{tr('Kis branch par chalega')}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!f.shopIds?.length} onClick={() => set({ shopIds: [] })} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', !f.shopIds?.length ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700')}>{tr('Har branch')}</button>
              {shops.map((s) => {
                const on = f.shopIds?.includes(s.id);
                return <button key={s.id} type="button" aria-pressed={on} onClick={() => set({ shopIds: on ? f.shopIds!.filter((x) => x !== s.id) : [...(f.shopIds ?? []), s.id] })} className={cn('inline-flex h-8 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-medium', on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700')}>{on && <Check className="h-3.5 w-3.5" />}{s.name}</button>;
              })}
            </div>
          </div>
        )}
        <div className="rounded-2xl bg-slate-50 p-3.5">
          <div className="flex items-center justify-between text-[0.8125rem]"><span className="text-slate-600">{tr('Agar bill ho')}</span><span className="font-semibold tabular-nums">{formatPKR(sample)}</span></div>
          <input type="range" aria-label={tr('Misal ka bill')} min={100} max={50000} step={100} value={sample} onChange={(e) => setSample(Number(e.target.value))} className="mt-1 w-full accent-[rgb(var(--brand-600))]" />
          <p className="mt-1 text-[0.875rem]">{preview === null ? <span className="text-amber-700">{tr('Kam se kam {{formatPKR}} ki khareedari par chalega', { formatPKR: formatPKR(f.minPurchase ?? 0) })}</span>
            : <Trans text="Discount {{discount}} · customer dega {{pays}}" values={{ discount: <strong className="text-pink-700">{formatPKR(preview)}</strong>, pays: <strong>{formatPKR(sample - preview)}</strong> }} />}</p>
        </div>
      </form>
    </Modal>
  );
}

function DiscountsGuide({ onClose }: { onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: Plus, color: '#2563eb', title: tr('Code banayein'), text: tr('"Naya code" — naam, kitna Discount (% ya seedhi amount), aur sharten. Tayyar misalein bhi hain.') },
    { icon: MessageCircle, color: '#16a34a', title: tr('Customers ko bhejein'), text: tr('Card par "Bhejein" — WhatsApp par code ka message tayyar.') },
    { icon: Tag, color: '#7c3aed', title: tr('POS par lagayein'), text: tr('Bill banate waqt Discount mein code likhein — sharten khud check hoti hain.') },
    { icon: Store, color: '#0891b2', title: tr('Branch aur had'), text: tr('Code sirf kuch branches par, kul itni dafa, ya ek customer itni dafa — sab rakh sakte hain.') },
    { icon: CalendarClock, color: '#d97706', title: tr('Period'), text: tr('"Kab tak" wala din poora chalta hai — raat tak. Upar ka dabba batata hai kaun se 7 din mein khatam honge.') },
    { icon: TrendingUp, color: '#db2777', title: tr('Kaunsa kaam aaya'), text: tr('Analytics tab: har code ki Sale, Discount aur customers — "Hisaab" se period badlein.') },
    { icon: Users, color: '#475569', title: tr('Mehfooz'), text: tr('Jo code istemal ho chuka woh mitta nahi, band hota hai — purane bill ka hisaab bacha rehta hai.') },
  ];
  return <PageGuide title={tr('Discount codes — aasaan tareeqa')} steps={steps} onClose={onClose} shortcuts={[['/', tr('dhoondein')], ['N', tr('naya code')], ['A', tr('analytics')], ['G', tr('guide')]]} />;
}
