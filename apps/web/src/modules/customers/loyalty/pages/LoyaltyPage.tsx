/**
 * Loyalty points: what the programme costs and returns (points outstanding
 * and their rupee value, points given and redeemed over any period, by day
 * and branch), the rules (editable here), member levels, every member with
 * history, manual gifts or corrections, WhatsApp, and points expiry.
 *
 * Keys: / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Award, BarChart3, CalendarClock, Crown, Download, Gift, GraduationCap, History, MessageCircle, Minus, Percent, Plus, Settings2,
  ShoppingCart, Sparkles, Store, Users, Wallet,
} from 'lucide-react';
import {
  Alert, Avatar, Button, Card, DateRangeMenu, EmptyState, FilterBar, FilterChip, FilterMenu, IconButton, Input, Kbd, KpiCard, KpiRow,
  Modal, PageHero, PageShell, SearchField, Segmented, Skeleton, Switch, ViewTabs, heroButton, heroIconButton, resolveRange,
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
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { salutationFor, waLink } from '@modules/customers/directory/messages';
import { TIERS, loyaltyApi, tierOf, type LoyaltyMember, type LoyaltyOverview } from '../api/loyalty.api';
import { t as tr, Trans } from '@core/i18n';

const TX_LABEL: Record<string, { label: string; tone: string }> = {
  EARNED: { label: tr('Mile'), tone: 'text-success-700' }, REDEEMED: { label: tr('Istemal'), tone: 'text-rose-700' },
  EXPIRED: { label: tr('Khatam'), tone: 'text-slate-500' }, ADJUSTMENT: { label: tr('Haath se'), tone: 'text-violet-700' },
};
const when = (v: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');

type Tab = 'members' | 'analytics' | 'rules';
type Sort = 'points' | 'spent' | 'recent' | 'name';
const SORTS: Array<FilterOption<Sort>> = [
  { value: 'points', label: tr('Zyada points') }, { value: 'spent', label: tr('Zyada khareedari') }, { value: 'recent', label: tr('Haal hi mein') }, { value: 'name', label: tr('Naam (A–Z)') },
];
const LEVELS: Array<FilterOption<string>> = [
  { value: '', label: tr('Sab darje'), icon: Crown, color: '#475569' },
  ...TIERS.slice(1).map((t) => ({ value: String(t.min), label: tr('{{label}} aur upar', { label: t.label }), hint: tr('{{min}}+ points', { min: t.min }), icon: Crown, color: t.color })),
];

/** Every member in the current search, sort and level (all pages). */
async function fetchAllMembers(q: { search?: string; sort: Sort; min?: string }) {
  const items: LoyaltyMember[] = [];
  for (let page = 1; page <= 100; page++) {
    const params = { ...q, page, limit: 100 };
    const res = await loyaltyApi.members(params);
    items.push(...res.items);
    if (!res.hasMore) break;
  }
  return items;
}

export default function LoyaltyPage() {
  const qc = useQueryClient();
  const theme = useChartTheme();
  const startHour = useBusinessDayStart();
  const shop = useAuthStore((s) => s.tenant?.name) ?? tr('Hamari dukaan');
  const canAdjust = usePermission(PERMISSIONS.KHATA_MANAGE);
  const canSettings = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [tab, setTab] = useState<Tab>('members');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('points');
  const [min, setMin] = useState('');
  const [adjusting, setAdjusting] = useState<LoyaltyMember | null>(null);
  const [historyOf, setHistoryOf] = useState<LoyaltyMember | null>(null);
  const [rules, setRules] = useState(false);
  const [guide, setGuide] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const filter = { search: query || undefined, sort, min: min || undefined };
  const overview = useQuery({ queryKey: ['loyalty-overview', period?.from, period?.to], queryFn: () => loyaltyApi.overview(period ?? undefined), placeholderData: (p) => p });
  const members = useInfiniteQuery({
    queryKey: ['loyalty-members', query, sort, min],
    queryFn: ({ pageParam }) => loyaltyApi.members({ ...filter, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
    placeholderData: (p) => p,
  });
  const expiry = useQuery({ queryKey: ['loyalty-expiry'], queryFn: loyaltyApi.expiryPreview, enabled: (overview.data?.settings.expiryDays ?? 0) > 0 });
  const refresh = () => ['loyalty-overview', 'loyalty-members', 'loyalty-expiry', 'customer'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const expireNow = useMutation({ mutationFn: loyaltyApi.expireNow, onSuccess: (r) => { toast.success(tr('{{points}} points khatam hue ({{customers}} customers)', { points: r.points, customers: r.customers })); refresh(); } });
  const enable = useMutation({ mutationFn: () => settingsApi.update({ enableLoyalty: true }), onSuccess: () => { toast.success(tr('Loyalty chalu ho gayi')); qc.invalidateQueries({ queryKey: ['settings'] }); refresh(); } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === '/') { e.preventDefault(); setTab('members'); setTimeout(() => searchRef.current?.focus(), 0); }
      else if (k === 'a') setTab((t) => (t === 'analytics' ? 'members' : 'analytics'));
      else if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const o = overview.data;
  const s = o?.settings;
  const rate = s?.redemptionRate ?? 1;
  const list = useMemo(() => members.data?.pages.flatMap((p) => p.items) ?? [], [members.data]);
  const count = members.data?.pages[0]?.count ?? 0;
  const trend = (o?.trend ?? []).map((t) => ({
    ...t, label: o?.grouping === 'month' ? new Intl.DateTimeFormat('en-PK', { month: 'short', year: '2-digit' }).format(new Date(`${t.key}-15T12:00:00`)) : new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${t.key}T12:00:00`)),
  }));
  const pointsFor = s ? Math.round(1 / (s.pointsPerRupee || 0.01)) : 100;
  const usedPct = o && o.period.issued > 0 ? Math.round((o.period.redeemed / o.period.issued) * 100) : null;
  const level = LEVELS.find((l) => l.value === min);
  const hasFilters = !!(query || min);
  const clear = () => { setSearch(''); setMin(''); };

  const exportCsv = async () => {
    const items = await fetchAllMembers(filter).catch(() => null);
    if (!items) return toast.error(tr('List nahi aayi'));
    if (!items.length) return toast.error(tr('Koi member nahi'));
    downloadCsv(`loyalty-${new Date().toISOString().slice(0, 10)}.csv`, [
      [tr('Naam'), tr('Phone'), tr('Darja'), tr('Points'), tr('Points ki qeemat'), tr('Kul khareedari'), tr('Aakhri harkat')],
      ...items.map((m) => [m.name, m.phone ?? '', tierOf(m.loyaltyPoints).label, m.loyaltyPoints, (m.loyaltyPoints * rate).toFixed(2), m.totalSpent.toFixed(2), when(m.lastActivityAt)]),
    ]);
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const items = await fetchAllMembers(filter);
    const pts = items.reduce((a, m) => a + m.loyaltyPoints, 0);
    return {
      title: tr('Loyalty members'),
      subtitle: new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()),
      meta: [[tr('Members'), String(items.length)], [tr('Kul points'), pts.toLocaleString('en-PK')], [tr('Qeemat'), formatPKR(pts * rate)]],
      sections: [{
        kind: 'table', title: level?.value ? level.label : tr('Members'),
        columns: [{ label: tr('Naam') }, { label: tr('Phone') }, { label: tr('Darja'), wideOnly: true }, { label: tr('Points'), align: 'right' }, { label: tr('Qeemat'), align: 'right' }],
        rows: items.map((m) => [m.name, m.phone ?? '', tierOf(m.loyaltyPoints).label, m.loyaltyPoints.toLocaleString('en-PK'), formatPKR(m.loyaltyPoints * rate)]),
        footer: [tr('Kul'), '', '', pts.toLocaleString('en-PK'), formatPKR(pts * rate)],
      }],
    };
  };

  const rulesCard = (
    <Card className="rounded-2xl" title={tr('Usool')} actions={canSettings ? <Button size="xs" variant="ghost" leftIcon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setRules(true)}>{tr('Badlein')}</Button> : undefined}>
      {!s ? <Skeleton className="h-40 rounded-xl" /> : (
        <ul className="space-y-2.5 text-[0.8125rem]">
          <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">{tr('Har {{pointsFor}} ki khareedari par', { pointsFor: formatPKR(pointsFor) })}</span><strong>{tr('1 point')}</strong></li>
          <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">{tr('1 point ki qeemat')}</span><strong>{formatPKR(s.redemptionRate)}</strong></li>
          <li className="flex items-center gap-2"><Gift className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">{tr('Kam se kam istemal')}</span><strong>{s.minRedeem ? tr('{{minRedeem}} points', { minRedeem: s.minRedeem }) : tr('Koi had nahi')}</strong></li>
          <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">{tr('Bill ka zyada se zyada')}</span><strong>{s.maxRedeemPercent}%</strong></li>
          <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">{tr('Points khatam hote hain')}</span><strong>{s.expiryDays ? tr('{{expiryDays}} din baad', { expiryDays: s.expiryDays }) : tr('Kabhi nahi')}</strong></li>
        </ul>
      )}
      {s && s.expiryDays > 0 && expiry.data && expiry.data.points > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900">
          <span className="flex-1">{tr('{{points}} points ({{customers}} customers) khatam hone wale hain — har raat khud hota hai.', { points: expiry.data.points, customers: expiry.data.customers })}</span>
          {canAdjust && <Button size="xs" variant="secondary" loading={expireNow.isPending} onClick={() => expireNow.mutate()}>{tr('Abhi karein')}</Button>}
        </div>
      )}
    </Card>
  );

  return (
    <PageShell>
      {adjusting && <AdjustModal member={adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); refresh(); }} />}
      {historyOf && <HistoryModal member={historyOf} onClose={() => setHistoryOf(null)} />}
      {rules && o && <RulesModal overview={o} onClose={() => setRules(false)} onSaved={() => { setRules(false); refresh(); qc.invalidateQueries({ queryKey: ['settings'] }); }} />}
      {guide && <LoyaltyGuide onClose={() => setGuide(false)} />}

      <PageHero
        title={tr('Loyalty points')}
        chip={<><Award />{o ? tr('{{withPoints}} members', { withPoints: o.members.withPoints }) : '…'}</>}
        meta={period ? rangeLabel(period.from, period.to) : tr('Shuru se ab tak')}
        busy={overview.isFetching && !overview.isLoading}
        loading={overview.isLoading}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} className={heroIconButton} title={tr('CSV')}><Download className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          {canSettings && <button type="button" onClick={() => setRules(true)} className={heroButton}><Settings2 className="h-4 w-4" /><span className="hidden sm:inline">{tr('Usool')}</span></button>}
          <button type="button" onClick={() => setGuide(true)} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Points baqi (customers ke paas)'), value: o ? o.outstanding.points.toLocaleString('en-PK') : '', hint: o ? tr('qeemat {{formatPKR}}', { formatPKR: formatPKR(o.outstanding.value) }) : '' },
          { label: tr('Is period mein diye'), value: o ? o.period.issued.toLocaleString('en-PK') : '', hint: o ? tr('{{bills}} bill', { bills: o.period.bills }) : '' },
          { label: tr('Istemal hue'), value: o ? o.period.redeemed.toLocaleString('en-PK') : '', hint: o ? tr('{{redeemedValue}} ki discount', { redeemedValue: formatPKR(o.period.redeemedValue) }) : '' },
          { label: tr('Khatam hue'), value: o ? o.period.expired.toLocaleString('en-PK') : '', hint: s?.expiryDays ? tr('{{expiryDays}} din baad', { expiryDays: s.expiryDays }) : tr('expiry band') },
        ]}
      />

      {o && !o.enabled && (
        <Alert tone="warning" icon={<Sparkles className="h-5 w-5" />} title={tr('Loyalty abhi band hai')}
          action={canSettings ? <Button size="sm" loading={enable.isPending} onClick={() => enable.mutate()}>{tr('Chalu karein')}</Button> : undefined}>
          {tr('Sale par points nahi mil rahe. Chalu karein to har naam wale customer ko khareedari par points milenge.')}
        </Alert>
      )}

      <KpiRow cols={4}>
        <KpiCard icon={Users} color="#2563eb" label={tr('Points wale customers')} value={o ? o.members.withPoints.toLocaleString('en-PK') : '…'}
          hint={o ? tr('{{customers}} customers mein se', { customers: o.members.customers.toLocaleString('en-PK') }) : undefined} />
        <KpiCard icon={Wallet} color="#16a34a" label={tr('Points ki kul qeemat')} value={o ? formatPKR(o.outstanding.value) : '…'} hint={tr('Itni Discount aage ja sakti hai')} />
        <KpiCard icon={Percent} color="#7c3aed" label={tr('Diye mein se istemal')} value={usedPct === null ? '—' : `${usedPct}%`} hint={tr('Is period mein')} />
        <KpiCard icon={CalendarClock} color="#d97706" label={tr('Jald khatam honge')} value={s?.expiryDays ? (expiry.data?.points ?? 0).toLocaleString('en-PK') : tr('Band')}
          hint={s?.expiryDays ? tr('{{value}} customers', { value: expiry.data?.customers ?? 0 }) : tr('Expiry lagi nahi')} onClick={() => setTab('rules')} />
      </KpiRow>

      <ViewTabs<Tab>
        tabs={[{ id: 'members', label: tr('Members'), icon: Users, count }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }, { id: 'rules', label: tr('Usool aur darje'), icon: Crown }]}
        value={tab} onChange={setTab}
        right={<DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Period')} defaultPreset="thisMonth" />}
      />

      {tab === 'members' && (
        <>
          <FilterBar
            search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Naam ya phone…')} label={tr('Member dhoondein')} />}
            chips={hasFilters ? <>
              {query && <FilterChip onRemove={() => setSearch('')}>“{query}”</FilterChip>}
              {level?.value && <FilterChip onRemove={() => setMin('')}>{level.label}</FilterChip>}
            </> : undefined}
            onClear={clear}
          >
            <FilterMenu icon={Crown} label={level?.value ? level.label : tr('Darja')} value={min} options={LEVELS} onChange={setMin} active={!!min} width="w-60" />
            <FilterMenu icon={Award} label={tr('Sort')} value={sort} options={SORTS} onChange={setSort} align="right" width="w-56" />
          </FilterBar>

          <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {members.isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div> : list.length === 0 ? (
              <EmptyState icon={<Award className="h-6 w-6" />} title={hasFilters ? tr('Is filter mein koi nahi') : tr('Abhi kisi ke paas points nahi')}
                description={hasFilters ? tr('Filter hata kar dekhein.') : tr('Naam wale customer ke bill par points khud milte hain.')}
                action={hasFilters ? <Button variant="secondary" onClick={clear}>{tr('Filter hatayein')}</Button> : undefined} />
            ) : (
              <>
                <ul className="divide-y divide-slate-100">
                  {list.map((m) => {
                    const t = tierOf(m.loyaltyPoints);
                    const sal = salutationFor(m.name, m.gender);
                    const wa = waLink(m.phone, `Assalam-o-Alaikum ${m.name}${sal ? ` ${sal}` : ''}! 🎁\n\n${shop} mein aap ke *${m.loyaltyPoints} points* jama hain — yani ${formatPKR(m.loyaltyPoints * rate)} ki Discount. Agli khareedari par istemal karein!`);
                    return (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                        <Link to={`/customers/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar name={m.name} url={m.avatarUrl ?? undefined} size={38} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5"><span className="truncate text-[0.875rem] font-semibold text-slate-900">{m.name}</span><span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold" style={{ backgroundColor: `${t.color}17`, color: t.color }}>{t.label}</span></span>
                            <span className="block truncate text-[0.75rem] text-slate-500">{tr('{{value}} · khareedari {{totalSpent}} · aakhri {{lastActivityAt}}', { value: m.phone ?? '—', totalSpent: formatPKR(m.totalSpent), lastActivityAt: when(m.lastActivityAt) })}</span>
                          </span>
                        </Link>
                        <span className="w-28 shrink-0 text-end">
                          <span className="block text-[1rem] font-bold tabular-nums text-slate-900">{m.loyaltyPoints.toLocaleString('en-PK')}</span>
                          <span className="block text-[0.6875rem] text-slate-500">{formatPKR(m.loyaltyPoints * rate)}</span>
                        </span>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton label={tr('History')} onClick={() => setHistoryOf(m)}><History className="h-4 w-4" /></IconButton>
                          {wa && <a href={wa} target="_blank" rel="noreferrer" title={tr('WhatsApp')} aria-label={tr('WhatsApp')} className="flex h-10 w-10 items-center justify-center rounded-lg text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>}
                          {canAdjust && <Button size="sm" variant="secondary" onClick={() => setAdjusting(m)}>{tr('Points')}</Button>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {members.hasNextPage && (
                  <div className="border-t border-slate-100 p-2">
                    <Button variant="ghost" fullWidth loading={members.isFetchingNextPage} onClick={() => void members.fetchNextPage()}>
                      {tr('Aur dikhayein ({{count}} / {{count2}})', { count: list.length, count2: count })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {tab === 'analytics' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title={tr('Points ka aana jana')} description={period ? rangeLabel(period.from, period.to) : tr('Shuru se ab tak')}>
            {!o ? <Skeleton className="h-60 rounded-xl" /> : trend.length === 0 ? <p className="py-16 text-center text-[0.875rem] text-slate-500">{tr('Is period mein koi points nahi')}</p> : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={theme.grid} vertical={false} />
                    <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={10} />
                    <YAxis tick={theme.axis} axisLine={false} tickLine={false} width={44} />
                    <Tooltip contentStyle={theme.tooltip.contentStyle} labelStyle={theme.tooltip.labelStyle} cursor={theme.tooltip.cursor} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="issued" name="Diye" fill={theme.primary} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="redeemed" name="Istemal" fill={theme.highlight} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />{tr('Branch war')}</span>}>
            {!o ? <Skeleton className="h-40 rounded-xl" /> : o.branches.length === 0 ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">{tr('Is period mein kuch nahi')}</p> : (
              <ul className="space-y-2 text-[0.8125rem]">
                {o.branches.map((b) => (
                  <li key={b.shopId ?? 'none'} className="flex justify-between gap-2"><span className="truncate text-slate-700">{b.name}</span><span className="tabular-nums"><span className="text-success-700">+{b.issued}</span> · <span className="text-rose-700">−{b.redeemed}</span></span></li>
                ))}
              </ul>
            )}
          </Card>
          {o && (
            <Card className="rounded-2xl lg:col-span-3" title={tr('Is period ka hisaab')}>
              <dl className="grid grid-cols-2 gap-3 text-[0.8125rem] sm:grid-cols-4">
                {([
                  [tr('Points wale bill'), o.period.bills.toLocaleString('en-PK')],
                  [tr('Un bills ki Sale'), formatPKR(o.period.salesTotal)],
                  [tr('Points se Discount'), formatPKR(o.period.redeemedValue)],
                  [tr('Haath se jore / kaate'), o.period.adjusted.toLocaleString('en-PK')],
                ] as const).map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-slate-50 p-3"><dt className="text-slate-500">{l}</dt><dd className="mt-0.5 text-[1rem] font-bold tabular-nums text-slate-900">{v}</dd></div>
                ))}
              </dl>
              {o.period.salesTotal > 0 && (
                <p className="mt-3 text-[0.8125rem] text-slate-600"><Trans text="Points ki Discount in bills ki Sale ka {{pct}} rahi." values={{ pct: <strong>{((o.period.redeemedValue / o.period.salesTotal) * 100).toFixed(1)}%</strong> }} /></p>
              )}
            </Card>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="grid gap-4 lg:grid-cols-3">
          {rulesCard}
          <Card className="rounded-2xl lg:col-span-2" title={tr('Members ke darje')} description={tr('Jitne zyada points, utna ooncha darja — darje par click karein to woh members dikhenge')}>
            {!o ? <Skeleton className="h-32 rounded-xl" /> : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {TIERS.map((t) => {
                  const n = o.tiers.find((x) => x.id === t.id)?.count ?? 0;
                  return (
                    <button key={t.id} type="button" onClick={() => { setMin(t.min > 1 ? String(t.min) : ''); setTab('members'); }}
                      className="rounded-2xl p-3 text-center ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md" style={{ backgroundColor: `${t.color}0f` }}>
                      <Crown className="mx-auto h-5 w-5" style={{ color: t.color }} />
                      <p className="mt-1 text-[0.8125rem] font-semibold" style={{ color: t.color }}>{t.label}</p>
                      <p className="text-[1.25rem] font-bold tabular-nums text-slate-900">{n}</p>
                      <p className="text-[0.625rem] text-slate-500">{tr('{{min}}+ points', { min: t.min })}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 sm:flex">
        <Kbd>/</Kbd> {' '}{tr('dhoondein ·')}{' '} <Kbd>A</Kbd> {' '}{tr('analytics ·')}{' '} <Kbd>G</Kbd> {' '}{tr('guide')}
      </p>
    </PageShell>
  );
}

function AdjustModal({ member, onClose, onDone }: { member: LoyaltyMember; onClose: () => void; onDone: () => void }) {
  const [sign, setSign] = useState<'add' | 'cut'>('add');
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const n = Math.trunc(Number(points) || 0);
  const delta = sign === 'add' ? n : -n;
  const after = member.loyaltyPoints + delta;
  const error = points && !n ? tr('Points 1 ya zyada likhein') : after < 0 ? tr('Itne points nahi — abhi {{loyaltyPoints}} hain', { loyaltyPoints: member.loyaltyPoints }) : undefined;
  const save = useMutation({
    mutationFn: () => loyaltyApi.adjust(member.id, delta, note.trim() || undefined),
    onSuccess: (r) => { toast.success(tr('{{name}}: ab {{loyaltyPoints}} points', { name: member.name, loyaltyPoints: r.loyaltyPoints })); onDone(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || tr('Nahi hua')),
  });
  const submit = () => { if (n && !error && !save.isPending) save.mutate(); };
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Points · {{name}}', { name: member.name })} description={tr('Abhi {{loyaltyPoints}} points', { loyaltyPoints: member.loyaltyPoints })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button disabled={!n || !!error} loading={save.isPending} onClick={submit}>{tr('Save')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Segmented<'add' | 'cut'> label={tr('Jorein ya kaatein')} value={sign} onChange={setSign} className="grid w-full grid-cols-2"
          items={[{ value: 'add', label: <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" />{tr('Tohfa / jorein')}</span> }, { value: 'cut', label: <span className="inline-flex items-center gap-1.5"><Minus className="h-4 w-4" />{tr('Kaatein')}</span> }]} />
        <Input autoFocus label={tr('Kitne points')} inputMode="numeric" size="lg" value={points} onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))}
          error={error} hint={!error ? tr('Is ke baad: {{after}} points', { after }) : undefined} />
        <Input label={tr('Wajah')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr('Jaise: salgirah ka tohfa')} hint={tr('Customer ki history mein dikhegi')} maxLength={200} />
      </form>
    </Modal>
  );
}

function HistoryModal({ member, onClose }: { member: LoyaltyMember; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['loyalty-history', member.id], queryFn: () => loyaltyApi.history(member.id) });
  return (
    <Modal open onClose={onClose} size="lg" title={tr('{{name}} ke points', { name: member.name })} description={tr('Abhi {{value}} points', { value: data?.customer.loyaltyPoints ?? member.loyaltyPoints })}>
      {isLoading ? <Skeleton className="h-48 rounded-xl" /> : !data?.transactions.length ? <p className="py-10 text-center text-[0.875rem] text-slate-500">{tr('Abhi koi entry nahi')}</p> : (
        <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {data.transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-[0.8125rem]">
              <span className="w-28 shrink-0 text-slate-500">{when(t.createdAt)}</span>
              <span className={cn('w-20 shrink-0 font-medium', TX_LABEL[t.type]?.tone)}>{TX_LABEL[t.type]?.label ?? t.type}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{[t.reference, t.note].filter(Boolean).join(' · ')}</span>
              <span className={cn('font-semibold tabular-nums', t.points > 0 ? 'text-success-700' : 'text-rose-700')}>{t.points > 0 ? '+' : ''}{t.points}</span>
              <span className="w-14 text-end tabular-nums text-slate-500">= {t.balanceAfter}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function RulesModal({ overview, onClose, onSaved }: { overview: LoyaltyOverview; onClose: () => void; onSaved: () => void }) {
  const s = overview.settings;
  const [f, setF] = useState({
    enableLoyalty: overview.enabled, perRupees: String(Math.round(1 / (s.pointsPerRupee || 0.01))), rate: String(s.redemptionRate),
    min: String(s.minRedeem || ''), max: String(s.maxRedeemPercent), expiry: String(s.expiryDays || ''),
  });
  const per = Number(f.perRupees);
  const rate = Number(f.rate);
  const max = Number(f.max);
  const errors = {
    perRupees: !(per >= 1) ? tr('Kam se kam Rs 1 likhein') : undefined,
    rate: !(rate > 0) ? tr('Point ki qeemat 0 se zyada honi chahiye') : undefined,
    max: !(max >= 1 && max <= 100) ? tr('1 se 100 ke beech likhein') : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);
  const save = useMutation({
    mutationFn: () => settingsApi.update({
      enableLoyalty: f.enableLoyalty, loyaltyPointsPerRupee: 1 / per, loyaltyRedemptionRate: rate,
      loyaltyMinRedeem: Math.max(0, Math.trunc(Number(f.min) || 0)), loyaltyMaxRedeemPercent: max, loyaltyExpiryDays: Math.max(0, Math.trunc(Number(f.expiry) || 0)),
    }),
    onSuccess: () => { toast.success(tr('Usool save ho gaye')); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || tr('Save nahi hua')),
  });
  const submit = () => { if (!invalid && !save.isPending) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const earnOn1000 = Math.floor(1000 / Math.max(1, per || 100));
  const digits = (v: string) => v.replace(/\D/g, '');
  return (
    <Modal open onClose={onClose} size="md" title={tr('Loyalty ke usool')} description={tr('Sab branches par yahi usool chalte hain · Ctrl+S se save')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button disabled={invalid} loading={save.isPending} onClick={submit}>{tr('Save karein')}</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Switch label={tr('Loyalty chalu')} description={tr('Band ho to naye bill par points nahi milte; jo jama hain woh rehte hain')} checked={f.enableLoyalty}
          onChange={(e) => setF({ ...f, enableLoyalty: e.target.checked })} className="rounded-xl bg-slate-50 p-3" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Kitne rupay par 1 point')} inputMode="numeric" value={f.perRupees} onChange={(e) => setF({ ...f, perRupees: digits(e.target.value) })} error={errors.perRupees} hint={tr('Jaise 100: har Rs 100 par 1 point')} />
          <Input label={tr('1 point kitne rupay ka')} inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/[^\d.]/g, '') })} error={errors.rate} hint={tr('Istemal par itni Discount')} />
          <Input label={tr('Kam se kam kitne points istemal')} inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: digits(e.target.value) })} placeholder={tr('Koi had nahi')} hint={tr('Khali = koi had nahi')} />
          <Input label={tr('Bill ka zyada se zyada % points se')} inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: digits(e.target.value) })} error={errors.max} hint={tr('100 = poora bill points se')} />
          <Input label={tr('Points kitne din baad khatam hon')} inputMode="numeric" value={f.expiry} onChange={(e) => setF({ ...f, expiry: digits(e.target.value) })} placeholder={tr('Kabhi nahi')} hint={tr('Khali = kabhi khatam nahi')} wrapperClassName="sm:col-span-2" />
        </div>
        <p className="rounded-xl bg-brand-50 p-3 text-[0.8125rem] text-brand-900"><Trans text="Misal: Rs 1,000 ki khareedari par {{points}} milenge, jo agli dafa {{value}} ke barabar honge." values={{ points: <strong>{tr('{{earnOn1000}} points', { earnOn1000 })}</strong>, value: <strong>{formatPKR(earnOn1000 * (rate || 1))}</strong> }} /></p>
      </form>
    </Modal>
  );
}

function LoyaltyGuide({ onClose }: { onClose: () => void }) {
  const steps: GuideStep[] = [
    { icon: ShoppingCart, color: '#2563eb', title: tr('Points kaise milte hain'), text: tr('Naam wale customer ke har bill par — usool mein likhi amount par 1 point. Bill void ho to points wapas.') },
    { icon: Wallet, color: '#16a34a', title: tr('Istemal'), text: tr('POS par customer chunein, Discount mein "Points" — bill se utne rupay kam ho jate hain.') },
    { icon: Settings2, color: '#7c3aed', title: tr('Usool'), text: tr('Kitne rupay par point, point ki qeemat, kam se kam istemal, bill ka kitna %, aur expiry — "Usool" se badlein.') },
    { icon: Crown, color: '#ca8a04', title: tr('Darje'), text: tr('Bronze 100+, Silver 500+, Gold 1000+ — darje se members chhaantein aur achhe customers ko pehchanein.') },
    { icon: Gift, color: '#db2777', title: tr('Tohfa'), text: tr('Kisi member ke saamne "Points" — salgirah ya shikayat par points dein ya ghalti theek karein.') },
    { icon: MessageCircle, color: '#0891b2', title: tr('Yaad dilayein'), text: tr('WhatsApp button — "aap ke itne points jama hain" — customer wapas aata hai.') },
    { icon: Download, color: '#475569', title: tr('List'), text: tr('Upar CSV ya Print — jo filter laga hai usi ke members.') },
  ];
  return <PageGuide title={tr('Loyalty — aasaan tareeqa')} steps={steps} onClose={onClose} shortcuts={[['/', tr('dhoondein')], ['A', tr('analytics')], ['G', tr('guide')]]} />;
}
