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
  Award, CalendarClock, Crown, Gift, GraduationCap, History, MessageCircle, Minus, Plus, Search, Settings2, ShoppingCart, Sparkles,
  Store, Wallet, X, type LucideIcon,
} from 'lucide-react';
import {
  Avatar, Button, Card, DateRangeMenu, FilterMenu, Kbd, Modal, PageHero, Skeleton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useBusinessDayStart } from '@core/lib/business-day';
import { useAuthStore } from '@core/stores/auth.store';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { salutationFor, waLink } from '@modules/customers/directory/messages';
import { TIERS, loyaltyApi, tierOf, type LoyaltyMember, type LoyaltyOverview } from '../api/loyalty.api';

const TX_LABEL: Record<string, { label: string; tone: string }> = {
  EARNED: { label: 'Mile', tone: 'text-success-700' }, REDEEMED: { label: 'Istemal', tone: 'text-rose-700' },
  EXPIRED: { label: 'Khatam', tone: 'text-slate-500' }, ADJUSTMENT: { label: 'Haath se', tone: 'text-violet-700' },
};
const when = (v: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');

export default function LoyaltyPage() {
  const qc = useQueryClient();
  const theme = useChartTheme();
  const startHour = useBusinessDayStart();
  const shop = useAuthStore((s) => s.tenant?.name) ?? 'Hamari dukaan';
  const canAdjust = usePermission(PERMISSIONS.KHATA_MANAGE);
  const canSettings = usePermission(PERMISSIONS.SETTINGS_EDIT);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const period = resolveRange(range, startHour);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('points');
  const [adjusting, setAdjusting] = useState<LoyaltyMember | null>(null);
  const [historyOf, setHistoryOf] = useState<LoyaltyMember | null>(null);
  const [rules, setRules] = useState(false);
  const [guide, setGuide] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search), 250); return () => clearTimeout(t); }, [search]);

  const overview = useQuery({ queryKey: ['loyalty-overview', period?.from, period?.to], queryFn: () => loyaltyApi.overview(period ?? undefined), placeholderData: (p) => p });
  const members = useInfiniteQuery({
    queryKey: ['loyalty-members', query, sort],
    queryFn: ({ pageParam }) => loyaltyApi.members({ search: query || undefined, sort, page: pageParam, limit: 30 }),
    initialPageParam: 1,
    getNextPageParam: (l) => (l.hasMore ? l.page + 1 : undefined),
    placeholderData: (p) => p,
  });
  const expiry = useQuery({ queryKey: ['loyalty-expiry'], queryFn: loyaltyApi.expiryPreview, enabled: (overview.data?.settings.expiryDays ?? 0) > 0 });
  const refresh = () => ['loyalty-overview', 'loyalty-members', 'loyalty-expiry', 'customer'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const expireNow = useMutation({ mutationFn: loyaltyApi.expireNow, onSuccess: (r) => { toast.success(`${r.points} points khatam hue (${r.customers} customers)`); refresh(); } });
  const enable = useMutation({ mutationFn: () => settingsApi.update({ enableLoyalty: true }), onSuccess: () => { toast.success('Loyalty chalu ho gayi'); qc.invalidateQueries({ queryKey: ['settings'] }); refresh(); } });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const o = overview.data;
  const s = o?.settings;
  const list = useMemo(() => members.data?.pages.flatMap((p) => p.items) ?? [], [members.data]);
  const trend = (o?.trend ?? []).map((t) => ({
    ...t, label: o?.grouping === 'month' ? new Intl.DateTimeFormat('en-PK', { month: 'short', year: '2-digit' }).format(new Date(`${t.key}-15T12:00:00`)) : new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short' }).format(new Date(`${t.key}T12:00:00`)),
  }));
  const pointsFor = s ? Math.round(1 / (s.pointsPerRupee || 0.01)) : 100;

  return (
    <div className="mx-auto w-full max-w-[var(--page-max,96rem)] space-y-4 pb-12">
      {adjusting && <AdjustModal member={adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); refresh(); }} />}
      {historyOf && <HistoryModal member={historyOf} onClose={() => setHistoryOf(null)} />}
      {rules && o && <RulesModal overview={o} onClose={() => setRules(false)} onSaved={() => { setRules(false); refresh(); qc.invalidateQueries({ queryKey: ['settings'] }); }} />}
      {guide && <LoyaltyGuide onClose={() => setGuide(false)} />}

      <PageHero
        title="Loyalty points"
        chip={<><Award />{o ? `${o.members.withPoints} members` : '…'}</>}
        busy={overview.isFetching && !overview.isLoading}
        loading={overview.isLoading}
        actions={<>
          {canSettings && <button type="button" onClick={() => setRules(true)} title="Usool badlein" className={heroIconButton}><Settings2 className="h-4 w-4" /></button>}
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Points baqi (customers ke paas)', value: o ? o.outstanding.points.toLocaleString('en-PK') : '', hint: o ? `qeemat ${formatPKR(o.outstanding.value)}` : '' },
          { label: 'Is muddat mein diye', value: o ? o.period.issued.toLocaleString('en-PK') : '', hint: o ? `${o.period.bills} bill` : '' },
          { label: 'Istemal hue', value: o ? o.period.redeemed.toLocaleString('en-PK') : '', hint: o ? `${formatPKR(o.period.redeemedValue)} ki chhoot` : '' },
          { label: 'Khatam hue', value: o ? o.period.expired.toLocaleString('en-PK') : '', hint: s?.expiryDays ? `${s.expiryDays} din baad` : 'expiry band' },
        ]}
      />

      {o && !o.enabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <p className="flex-1 text-[0.875rem] text-amber-900">Loyalty abhi band hai — bikri par points nahi mil rahe. Chalu karein to har naam wale customer ko khareedari par points milenge.</p>
          {canSettings && <Button size="sm" loading={enable.isPending} onClick={() => enable.mutate()}>Chalu karein</Button>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title="Points ka aana jana" actions={<DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Muddat" defaultPreset="thisMonth" />}>
          {!o ? <Skeleton className="h-60 rounded-xl" /> : trend.length === 0 ? <p className="py-16 text-center text-[0.875rem] text-slate-500">Is muddat mein koi points nahi</p> : (
            <div className="h-[240px]">
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
        <Card className="rounded-2xl" title="Usool" actions={canSettings ? <button type="button" onClick={() => setRules(true)} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Badlein</button> : undefined}>
          {!s ? <Skeleton className="h-40 rounded-xl" /> : (
            <ul className="space-y-2.5 text-[0.8125rem]">
              <li className="flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">Har {formatPKR(pointsFor)} ki khareedari par</span><strong>1 point</strong></li>
              <li className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">1 point ki qeemat</span><strong>{formatPKR(s.redemptionRate)}</strong></li>
              <li className="flex items-center gap-2"><Gift className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">Kam se kam istemal</span><strong>{s.minRedeem ? `${s.minRedeem} points` : 'Koi had nahi'}</strong></li>
              <li className="flex items-center gap-2"><Crown className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">Bill ka zyada se zyada</span><strong>{s.maxRedeemPercent}%</strong></li>
              <li className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-brand-600" /><span className="flex-1 text-slate-600">Points khatam hote hain</span><strong>{s.expiryDays ? `${s.expiryDays} din baad` : 'Kabhi nahi'}</strong></li>
            </ul>
          )}
          {s && s.expiryDays > 0 && expiry.data && expiry.data.points > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[0.8125rem] text-amber-900">
              {expiry.data.points} points ({expiry.data.customers} customers) khatam hone wale hain — har raat khud hota hai.
              {canAdjust && <button type="button" onClick={() => expireNow.mutate()} className="ml-1 font-semibold underline">Abhi karein</button>}
            </div>
          )}
        </Card>
      </div>

      {o && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl lg:col-span-2" title="Members ke darje" description="Jitne zyada points, utna ooncha darja">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {TIERS.map((t) => {
                const count = o.tiers.find((x) => x.id === t.id)?.count ?? 0;
                return (
                  <div key={t.id} className="rounded-2xl p-3 text-center ring-1 ring-slate-200/80" style={{ backgroundColor: `${t.color}0f` }}>
                    <Crown className="mx-auto h-5 w-5" style={{ color: t.color }} />
                    <p className="mt-1 text-[0.8125rem] font-semibold" style={{ color: t.color }}>{t.label}</p>
                    <p className="text-[1.25rem] font-bold tabular-nums text-slate-900">{count}</p>
                    <p className="text-[0.625rem] text-slate-500">{t.min}+ points</p>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Store className="h-4 w-4 text-brand-600" />Branch war</span>}>
            {o.branches.length === 0 ? <p className="py-8 text-center text-[0.8125rem] text-slate-500">Is muddat mein kuch nahi</p> : (
              <ul className="space-y-2 text-[0.8125rem]">
                {o.branches.map((b) => (
                  <li key={b.shopId ?? 'none'} className="flex justify-between gap-2"><span className="truncate text-slate-700">{b.name}</span><span className="tabular-nums"><span className="text-success-700">+{b.issued}</span> · <span className="text-rose-700">−{b.redeemed}</span></span></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Card className="rounded-2xl" flush title="Members"
        actions={<div className="flex flex-wrap gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Naam ya phone…" className="h-9 w-48 rounded-xl bg-slate-100/80 pl-9 pr-8 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 sm:w-64" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400"><X className="h-3.5 w-3.5" /></button>}
          </label>
          <FilterMenu icon={Award} label="Tarteeb" value={sort} align="right" width="w-56" onChange={setSort}
            options={[{ value: 'points', label: 'Zyada points' }, { value: 'spent', label: 'Zyada khareedari' }, { value: 'recent', label: 'Haal hi mein' }, { value: 'name', label: 'Naam' }]} />
        </div>}>
        {members.isLoading ? <div className="p-5"><Skeleton className="h-40 rounded-xl" /></div> : list.length === 0 ? (
          <p className="px-5 py-12 text-center text-[0.875rem] text-slate-500">{query ? 'Koi nahi mila' : 'Abhi kisi ke paas points nahi'}</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {list.map((m) => {
                const t = tierOf(m.loyaltyPoints);
                const sal = salutationFor(m.name, m.gender);
                const wa = waLink(m.phone, `Assalam-o-Alaikum ${m.name}${sal ? ` ${sal}` : ''}! 🎁\n\n${shop} mein aap ke *${m.loyaltyPoints} points* jama hain — yani ${formatPKR(m.loyaltyPoints * (s?.redemptionRate ?? 1))} ki chhoot. Agli khareedari par istemal karein!`);
                return (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
                    <Link to={`/customers/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={m.name} url={m.avatarUrl ?? undefined} size={38} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5"><span className="truncate text-[0.875rem] font-semibold text-slate-900">{m.name}</span><span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold" style={{ backgroundColor: `${t.color}17`, color: t.color }}>{t.label}</span></span>
                        <span className="block truncate text-[0.75rem] text-slate-500">{m.phone ?? '—'} · khareedari {formatPKR(m.totalSpent)} · aakhri {when(m.lastActivityAt)}</span>
                      </span>
                    </Link>
                    <span className="w-28 shrink-0 text-right">
                      <span className="block text-[1rem] font-bold tabular-nums text-slate-900">{m.loyaltyPoints.toLocaleString('en-PK')}</span>
                      <span className="block text-[0.6875rem] text-slate-500">{formatPKR(m.loyaltyPoints * (s?.redemptionRate ?? 1))}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => setHistoryOf(m)} title="History" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"><History className="h-4 w-4" /></button>
                      {wa && <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-xl text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>}
                      {canAdjust && <Button size="sm" variant="secondary" onClick={() => setAdjusting(m)}>Points</Button>}
                    </div>
                  </li>
                );
              })}
            </ul>
            {members.hasNextPage && <button type="button" onClick={() => void members.fetchNextPage()} className="w-full border-t border-slate-100 py-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">{members.isFetchingNextPage ? 'Aa rahe hain…' : 'Aur dikhayein'}</button>}
          </>
        )}
      </Card>
    </div>
  );
}

function AdjustModal({ member, onClose, onDone }: { member: LoyaltyMember; onClose: () => void; onDone: () => void }) {
  const [sign, setSign] = useState<1 | -1>(1);
  const [points, setPoints] = useState('');
  const [note, setNote] = useState('');
  const n = Math.trunc(Number(points) || 0);
  const save = useMutation({
    mutationFn: () => loyaltyApi.adjust(member.id, sign * n, note || undefined),
    onSuccess: (r) => { toast.success(`${member.name}: ab ${r.loyaltyPoints} points`); onDone(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Nahi hua'),
  });
  const after = member.loyaltyPoints + sign * n;
  return (
    <Modal open onClose={onClose} size="sm" title={`Points · ${member.name}`} description={`Abhi ${member.loyaltyPoints} points`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!n || after < 0} loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {([[1, Plus, 'Tohfa / jorein'], [-1, Minus, 'Kaatein']] as const).map(([v, Icon, l]) => (
            <button key={v} type="button" onClick={() => setSign(v)} className={cn('flex h-11 items-center justify-center gap-2 rounded-xl border font-semibold', sign === v ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700')}><Icon className="h-4 w-4" />{l}</button>
          ))}
        </div>
        <input autoFocus inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value.replace(/\D/g, ''))} placeholder="Kitne points" className="h-12 w-full rounded-xl border border-slate-200 px-4 text-[1.25rem] font-bold tabular-nums outline-none focus:border-brand-500" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Wajah (jaise: salgirah ka tohfa)" className="h-10 w-full rounded-xl border border-slate-200 px-3 text-[0.875rem] outline-none focus:border-brand-500" />
        <p className={cn('text-[0.8125rem]', after < 0 ? 'text-rose-600' : 'text-slate-600')}>Is ke baad: <strong className="tabular-nums">{after}</strong> points</p>
      </div>
    </Modal>
  );
}

function HistoryModal({ member, onClose }: { member: LoyaltyMember; onClose: () => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['loyalty-history', member.id], queryFn: () => loyaltyApi.history(member.id) });
  return (
    <Modal open onClose={onClose} size="lg" title={`${member.name} ke points`} description={`Abhi ${data?.customer.loyaltyPoints ?? member.loyaltyPoints} points`}>
      {isLoading ? <Skeleton className="h-48 rounded-xl" /> : !data?.transactions.length ? <p className="py-10 text-center text-[0.875rem] text-slate-500">Abhi koi entry nahi</p> : (
        <ul className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {data.transactions.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5 text-[0.8125rem]">
              <span className="w-28 shrink-0 text-slate-500">{when(t.createdAt)}</span>
              <span className={cn('w-20 shrink-0 font-medium', TX_LABEL[t.type]?.tone)}>{TX_LABEL[t.type]?.label ?? t.type}</span>
              <span className="min-w-0 flex-1 truncate text-slate-600">{[t.reference, t.note].filter(Boolean).join(' · ')}</span>
              <span className={cn('font-semibold tabular-nums', t.points > 0 ? 'text-success-700' : 'text-rose-700')}>{t.points > 0 ? '+' : ''}{t.points}</span>
              <span className="w-14 text-right tabular-nums text-slate-500">= {t.balanceAfter}</span>
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
  const save = useMutation({
    mutationFn: () => settingsApi.update({
      enableLoyalty: f.enableLoyalty, loyaltyPointsPerRupee: 1 / Math.max(1, Number(f.perRupees) || 100), loyaltyRedemptionRate: Math.max(0, Number(f.rate) || 1),
      loyaltyMinRedeem: Math.max(0, Math.trunc(Number(f.min) || 0)), loyaltyMaxRedeemPercent: Math.min(100, Math.max(0, Number(f.max) || 100)), loyaltyExpiryDays: Math.max(0, Math.trunc(Number(f.expiry) || 0)),
    }),
    onSuccess: () => { toast.success('Usool save ho gaye'); onSaved(); },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => toast.error(e?.response?.data?.message || e.message || 'Save nahi hua'),
  });
  const input = 'mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.875rem] tabular-nums outline-none focus:border-brand-500';
  const earnOn1000 = Math.floor(1000 / Math.max(1, Number(f.perRupees) || 100));
  return (
    <Modal open onClose={onClose} size="md" title="Loyalty ke usool" description="Sab branches par yahi usool chalte hain"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save karein</Button></>}>
      <div className="space-y-3">
        <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-[0.875rem] font-medium">Loyalty chalu
          <input type="checkbox" checked={f.enableLoyalty} onChange={(e) => setF({ ...f, enableLoyalty: e.target.checked })} className="h-5 w-5 accent-[rgb(var(--brand-600))]" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[0.8125rem] font-medium text-slate-700">Kitne rupay par 1 point<input inputMode="numeric" value={f.perRupees} onChange={(e) => setF({ ...f, perRupees: e.target.value.replace(/\D/g, '') })} className={input} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">1 point kitne rupay ka<input inputMode="decimal" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value.replace(/[^\d.]/g, '') })} className={input} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Kam se kam kitne points istemal<input inputMode="numeric" value={f.min} onChange={(e) => setF({ ...f, min: e.target.value.replace(/\D/g, '') })} placeholder="Koi had nahi" className={input} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700">Bill ka zyada se zyada % points se<input inputMode="numeric" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value.replace(/\D/g, '') })} className={input} /></label>
          <label className="text-[0.8125rem] font-medium text-slate-700 sm:col-span-2">Points kitne din baad khatam hon<input inputMode="numeric" value={f.expiry} onChange={(e) => setF({ ...f, expiry: e.target.value.replace(/\D/g, '') })} placeholder="Kabhi nahi" className={input} /></label>
        </div>
        <p className="rounded-xl bg-brand-50 p-3 text-[0.8125rem] text-brand-900">Misal: Rs 1,000 ki khareedari par <strong>{earnOn1000} points</strong> milenge, jo agli dafa <strong>{formatPKR(earnOn1000 * (Number(f.rate) || 1))}</strong> ke barabar honge.</p>
      </div>
    </Modal>
  );
}

function LoyaltyGuide({ onClose }: { onClose: () => void }) {
  const steps: Array<{ icon: LucideIcon; color: string; title: string; text: string }> = [
    { icon: ShoppingCart, color: '#2563eb', title: 'Points kaise milte hain', text: 'Naam wale customer ke har bill par — usool mein likhi raqam par 1 point. Bill void ho to points wapas.' },
    { icon: Wallet, color: '#16a34a', title: 'Istemal', text: 'POS par customer chunein, Discount mein "Points" — bill se utne rupay kam ho jate hain.' },
    { icon: Settings2, color: '#7c3aed', title: 'Usool', text: 'Kitne rupay par point, point ki qeemat, kam se kam istemal, bill ka kitna %, aur expiry — upar se badlein.' },
    { icon: Crown, color: '#ca8a04', title: 'Darje', text: 'Bronze 100+, Silver 500+, Gold 1000+ — achhe customers ko pehchanein.' },
    { icon: Gift, color: '#db2777', title: 'Tohfa', text: 'Kisi member ke saamne "Points" — salgirah ya shikayat par points dein ya ghalti theek karein.' },
    { icon: MessageCircle, color: '#0891b2', title: 'Yaad dilayein', text: 'WhatsApp button — "aap ke itne points jama hain" — customer wapas aata hai.' },
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Loyalty — aasaan tareeqa" description={`${steps.length} cheezein`}>
      <ol className="grid gap-3 sm:grid-cols-2">
        {steps.map((st, i) => (
          <li key={st.title} className="flex gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${st.color}17`, color: st.color }}>
              <st.icon className="h-5 w-5" /><span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[0.625rem] font-bold text-white">{i + 1}</span>
            </span>
            <div><p className="text-[0.875rem] font-semibold text-slate-900">{st.title}</p><p className="mt-0.5 text-[0.8125rem] leading-relaxed text-slate-600">{st.text}</p></div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-3 text-[0.75rem] text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">Jaldi ke liye:</span>
        {[['/', 'dhoondein'], ['G', 'guide']].map(([k, t]) => <span key={k} className="inline-flex items-center gap-1"><Kbd>{k}</Kbd> {t}</span>)}
      </div>
    </Modal>
  );
}
