/**
 * Staff tab: awards for the best on each measure, the "needs a look" list
 * (well above the team on discounts, voids, returns, credit, drawer shorts
 * or wrong PINs), and every person's row. A click opens the person's drawer.
 */

import type { ReactNode } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, BadgePercent, Ban, Crown, Gauge, KeyRound, Package, Receipt, RotateCcw, ShieldCheck,
  Sparkles, Trophy, UserX, Vault, Zap, type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { StaffAlert, StaffOverview, StaffRow } from '../api';
import { ALERT_TITLE, ROLE_LABEL, alertText, pct, qtyText } from './meta';
import { Empty, Panel } from './parts';
import { t, Trans } from '@core/i18n';

export type StaffSort = 'net' | 'bills' | 'average' | 'perHour' | 'itemsPerBill' | 'discountPct' | 'voided' | 'returnPct' | 'short' | 'profit';

export const SORT_LABEL: Record<StaffSort, string> = {
  net: t('Sale'), bills: t('Bill'), average: t('Ausat bill'), perHour: t('Fi ghanta sale'), itemsPerBill: t('Cheezein fi bill'),
  discountPct: t('Discount %'), voided: t('Cancel bill'), returnPct: t('Return %'), short: t('Galla kam'), profit: t('Profit'),
};

const ALERT_ICON: Record<StaffAlert['kind'], LucideIcon> = {
  discount: BadgePercent, void: Ban, return: RotateCcw, credit: Receipt, short: Vault, pin: KeyRound,
};

const GRID = 'lg:grid-cols-[2.25rem_minmax(11rem,1.6fr)_minmax(9rem,1.3fr)_4rem_6.5rem_4.5rem_6.5rem_5.5rem_4.5rem_5rem_6rem]';

export function sortRows(rows: StaffRow[], sort: StaffSort) {
  const val = (r: StaffRow) => (sort === 'profit' ? r.profit ?? 0 : r[sort]);
  return [...rows].sort((a, b) => val(b) - val(a) || b.net - a.net);
}

export function Leaderboard({ data, rows, money, cost, costHidden, person, onOpen }: {
  data: StaffOverview;
  rows: StaffRow[];
  money: (n: number) => string;
  cost: (n: number | null | undefined) => string;
  costHidden: boolean;
  person: string;
  onOpen: (id: string) => void;
}) {
  const team = data.team;
  const sellers = data.staff.filter((r) => r.id && r.bills > 0);
  const maxNet = Math.max(1, ...rows.map((r) => r.net));

  return (
    <div className="space-y-4">
      <Awards rows={sellers} money={money} onOpen={onOpen} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel icon={AlertTriangle} title={t('Nazar rakhein')} className="xl:col-span-2"
          hint={t('Jo team ki ausat se kaafi upar hain — zaroori nahi ghalti ho, magar pooch lena acha hai')}>
          {!data.alerts.length ? (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-[0.875rem] font-medium text-emerald-800 ring-1 ring-emerald-100">
              <ShieldCheck className="h-4 w-4" />{t('Sab theek — kisi ki discount, cancel, return ya galla team se bahut alag nahi')}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.alerts.map((a, i) => {
                const Icon = ALERT_ICON[a.kind];
                return (
                  <li key={`${a.userId}-${a.kind}-${i}`}>
                    <button type="button" onClick={() => onOpen(a.userId)}
                      className={cn('flex w-full items-start gap-3 rounded-xl p-3 text-start ring-1 transition hover:shadow-sm',
                        a.level === 'high' ? 'bg-rose-50 ring-rose-100 hover:bg-rose-100/70' : 'bg-amber-50 ring-amber-100 hover:bg-amber-100/70')}>
                      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', a.level === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[0.8125rem] font-semibold text-slate-900">{a.name} · {ALERT_TITLE[a.kind]}</span>
                        <span className="mt-0.5 block text-[0.75rem] leading-snug text-slate-600">{alertText(a, money)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel icon={Gauge} title={t('Team ki ausat')} hint={t('Har banda isi se mila kar dekha jata hai')}>
          <dl className="space-y-1.5 text-[0.8125rem]">
            <Avg label={t('Ausat bill')} value={money(team.average)} />
            <Avg label={t('Cheezein fi bill')} value={qtyText(team.itemsPerBill)} />
            <Avg label={t('Fi ghanta sale')} value={team.perHour ? money(team.perHour) : '—'} />
            <Avg label={t('Fi banda sale')} value={money(team.perStaff)} />
            <Avg label={t('Haath se discount')} value={pct(team.discountPct)} hint={t('subtotal ka')} />
            <Avg label={t('Cancel bill')} value={pct(team.voidPct)} />
            <Avg label={t('Return')} value={pct(team.returnPct)} hint={t('sale ka')} />
            <Avg label={t('Udhaar')} value={pct(team.creditPct)} hint={t('sale ka')} />
          </dl>
          {!!data.idle.length && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-slate-500"><UserX className="h-3.5 w-3.5" />{t('Is period me koi kaam nahi')}</p>
              <p className="mt-1 text-[0.8125rem] text-slate-700">{data.idle.map((u) => u.name).join(', ')}</p>
            </div>
          )}
        </Panel>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className={cn('hidden gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500 lg:grid', GRID)}>
          <span>#</span><span>{person}</span><span>{t('Sale')}</span><span className="text-end">{t('Bill')}</span><span className="text-end">{t('Ausat bill')}</span>
          <span className="text-end" title={t('Cheezein fi bill')}>{t('Cheez/bill')}</span><span className="text-end">{t('Fi ghanta')}</span>
          <span className="text-end">{t('Discount')}</span><span className="text-end">{t('Cancel')}</span><span className="text-end">{t('Return')}</span><span className="text-end">{t('Galla')}</span>
        </div>
        {!rows.length ? <Empty text={t('Is period me kisi ne sale nahi ki')} /> : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => (
              <Row key={r.id ?? 'none'} r={r} team={team} maxNet={maxNet} money={money} cost={cost} costHidden={costHidden} drawerHidden={!!data.drawerHidden} onOpen={onOpen} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Avg({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-slate-500">{label}{hint && <span className="text-slate-400"> · {hint}</span>}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function Awards({ rows, money, onOpen }: { rows: StaffRow[]; money: (n: number) => string; onOpen: (id: string) => void }) {
  if (!rows.length) return null;
  const best = (pick: (r: StaffRow) => number, min = 0, filter: (r: StaffRow) => boolean = () => true) => {
    const list = rows.filter((r) => r.bills >= min && filter(r));
    return list.length ? list.reduce((a, b) => (pick(b) > pick(a) ? b : a)) : null;
  };
  const enough = Math.min(10, Math.max(3, Math.round(rows.reduce((a, r) => a + r.bills, 0) / rows.length / 4)));
  const cards: Array<{ icon: LucideIcon; color: string; title: string; r: StaffRow | null; value: (r: StaffRow) => ReactNode; hint: string }> = [
    { icon: Crown, color: '#d97706', title: t('Sab se zyada sale'), r: best((r) => r.net), value: (r) => money(r.net), hint: t('return ke baad') },
    { icon: Receipt, color: '#2563eb', title: t('Sab se zyada bill'), r: best((r) => r.bills), value: (r) => `${r.bills} bill`, hint: t('customer nipataye') },
    { icon: Trophy, color: '#7c3aed', title: t('Bara ausat bill'), r: best((r) => r.average, enough), value: (r) => money(r.average), hint: t('kam az kam {{enough}} bill', { enough }) },
    { icon: Zap, color: '#16a34a', title: t('Sab se tez'), r: best((r) => r.perHour, enough, (r) => r.hours > 0), value: (r) => `${money(r.perHour)}/ghanta`, hint: t('fi ghanta sale') },
    { icon: Package, color: '#0891b2', title: t('Zyada cheezein fi bill'), r: best((r) => r.itemsPerBill, enough), value: (r) => `${qtyText(r.itemsPerBill)} cheez`, hint: t('saath me aur bechna') },
    { icon: Sparkles, color: '#db2777', title: t('Kam discount'), r: best((r) => -r.discountPct, enough), value: (r) => pct(r.discountPct), hint: t('sale par discount') },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.filter((c) => c.r).map((c) => (
        <button key={c.title} type="button" onClick={() => onOpen(c.r!.id!)}
          className="flex min-w-0 flex-col rounded-2xl bg-white p-3 text-start shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
          <span className="flex items-center gap-1.5 text-[0.75rem] font-medium text-slate-500">
            <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ backgroundColor: `${c.color}17`, color: c.color }}><c.icon className="h-3.5 w-3.5" /></span>
            <span className="truncate">{c.title}</span>
          </span>
          <span className="mt-2 flex min-w-0 items-center gap-2">
            <Avatar name={c.r!.name} url={c.r!.avatarUrl} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{c.r!.name}</span>
              <span className="block truncate text-[0.75rem] font-semibold tabular-nums" style={{ color: c.color }}>{c.value(c.r!)}</span>
            </span>
          </span>
          <span className="mt-1 truncate text-[0.6875rem] text-slate-400">{c.hint}</span>
        </button>
      ))}
    </div>
  );
}

function Movement({ r }: { r: StaffRow }) {
  if (r.prevRank == null || !r.rank) return null;
  const moved = r.prevRank - r.rank;
  if (!moved) return null;
  return (
    <span title={t('Pichli period me #{{prevRank}}', { prevRank: r.prevRank })} className={cn('inline-flex items-center text-[0.625rem] font-bold', moved > 0 ? 'text-emerald-600' : 'text-rose-600')}>
      {moved > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(moved)}
    </span>
  );
}

function Row({ r, team, maxNet, money, cost, costHidden, drawerHidden, onOpen }: {
  r: StaffRow; team: StaffOverview['team']; maxNet: number; money: (n: number) => string; cost: (n: number | null | undefined) => string;
  costHidden: boolean; drawerHidden: boolean; onOpen: (id: string) => void;
}) {
  const high = (v: number, avg: number, gap: number) => v > Math.max(avg * 2, avg + gap);
  const discHigh = r.discountBills >= 3 && high(r.discountPct, team.discountPct, 3);
  const voidHigh = r.voided >= 2 && high(r.voidPct, team.voidPct, 3);
  const retHigh = r.returnedBills >= 2 && high(r.returnPct, team.returnPct, 3);
  const open = r.id ? () => onOpen(r.id!) : undefined;
  const galla = drawerHidden && r.shifts ? <span className="text-slate-400">{t('Chhupa')}</span> : r.shifts
    ? r.short > 0.5 ? <span className="text-rose-700">−{money(r.short)}</span> : r.over > 0.5 ? <span className="text-amber-700">+{money(r.over)}</span> : <span className="text-emerald-700">{t('Theek')}</span>
    : <span className="text-slate-300">—</span>;
  const delta = r.prevNet != null && r.prevNet > 0 ? ((r.net - r.prevNet) / r.prevNet) * 100 : null;

  return (
    <li>
      <button type="button" onClick={open} disabled={!open}
        className={cn('grid w-full grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-start transition enabled:hover:bg-slate-50/80 lg:gap-3', GRID)}>
        <span className="flex flex-col items-center">
          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] font-bold tabular-nums',
            r.rank === 1 ? 'bg-amber-100 text-amber-800' : r.rank === 2 ? 'bg-slate-200 text-slate-700' : r.rank === 3 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-500')}>
            {r.rank || '—'}
          </span>
          <Movement r={r} />
        </span>

        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.name} url={r.avatarUrl} size={34} />
          <span className="min-w-0">
            <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{r.name}</span>
            <span className="block truncate text-[0.75rem] text-slate-500">
              {r.designation ?? (r.role ? ROLE_LABEL[r.role] ?? r.role : t('Bill par login nahi'))}
              {r.id && !r.active && t(' · band')}
              {r.reassigned > 0 && t(' · {{reassigned}} bill kisi aur ne banaye', { reassigned: r.reassigned })}
            </span>
          </span>
        </span>

        <span className="min-w-0 text-end lg:text-start">
          <span className="block text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(r.net)}</span>
          <span className="mt-1 hidden h-1.5 overflow-hidden rounded-full bg-slate-100 lg:block">
            <span className="block h-full rounded-full bg-brand-500" style={{ width: `${Math.max(2, (r.net / maxNet) * 100)}%` }} />
          </span>
          <span className="block text-[0.6875rem] text-slate-500">
            {t('{{share}} hissa', { share: pct(r.share) })}
            {delta != null && Math.abs(delta) >= 0.5 && <span className={delta > 0 ? 'text-emerald-600' : 'text-rose-600'}> · {delta > 0 ? '+' : ''}{delta.toFixed(0)}%</span>}
            {!costHidden && r.profit != null && <span className="hidden xl:inline"> {' '}{t('· profit {{profit}}', { profit: cost(r.profit) })}</span>}
          </span>
        </span>

        {/* Phone: the main figures in one line under the name. */}
        <span className="col-span-2 col-start-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-slate-500 lg:hidden">
          <span>{t('{{bills}} bill', { bills: r.bills })}</span><span>{t('ausat {{average}}', { average: money(r.average) })}</span>
          {r.hours > 0 && <span>{money(r.perHour)}/ghanta</span>}
          {r.manualDiscount > 0 && <span className={discHigh ? 'font-semibold text-rose-600' : ''}>{t('discount {{discountPct}}', { discountPct: pct(r.discountPct) })}</span>}
          {r.voided > 0 && <span className={voidHigh ? 'font-semibold text-rose-600' : ''}>{t('{{voided}} cancel', { voided: r.voided })}</span>}
          {r.returnedBills > 0 && <span className={retHigh ? 'font-semibold text-rose-600' : ''}>{t('{{returnedBills}} return', { returnedBills: r.returnedBills })}</span>}
          {r.shifts > 0 && <span><Trans text="galla {{galla}}" values={{ galla }} /></span>}
        </span>

        <Cell>{r.bills}</Cell>
        <Cell>{money(r.average)}</Cell>
        <Cell>{qtyText(r.itemsPerBill)}</Cell>
        <Cell hint={r.hoursSource ? t('{{value}} ghante', { value: Number(r.hours.toFixed(1)) }) : undefined}>{r.hours > 0 ? money(r.perHour) : '—'}</Cell>
        <Cell bad={discHigh} hint={r.manualDiscount > 0 ? money(r.manualDiscount) : undefined}>{r.manualDiscount > 0 ? pct(r.discountPct) : '—'}</Cell>
        <Cell bad={voidHigh} hint={r.voided ? money(r.voidedValue) : undefined}>{r.voided || '—'}</Cell>
        <Cell bad={retHigh} hint={r.returnedBills ? pct(r.returnPct) : undefined}>{r.returnedBills || '—'}</Cell>
        <Cell hint={r.shifts ? t('{{shifts}} shift', { shifts: r.shifts }) : undefined}>{galla}</Cell>
      </button>
    </li>
  );
}

function Cell({ children, hint, bad }: { children: ReactNode; hint?: ReactNode; bad?: boolean }) {
  return (
    <span className="hidden text-end lg:block">
      <span className={cn('block text-[0.8125rem] font-semibold tabular-nums', bad ? 'text-rose-600' : 'text-slate-800')}>{children}</span>
      {hint && <span className="block truncate text-[0.6875rem] text-slate-400">{hint}</span>}
    </span>
  );
}
