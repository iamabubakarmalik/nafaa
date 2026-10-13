/**
 * Side panel for one person: their figures against the team, sales trend,
 * busy hours, payment mix, top items and commission; their bills by kind;
 * drawer shifts; returns they processed, bills cancelled and PIN log; and
 * attendance when an HR record is linked to the login.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Ban, CalendarCheck, Coins, KeyRound, Package, Receipt, RotateCcw, ShieldCheck, Store, TrendingUp, Vault, Wallet, X,
} from 'lucide-react';
import { Avatar, Button, IconButton, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { STAFF_REPORT_KEY, staffReportApi, type BillKind, type Period, type StaffOverview, type StaffRow } from '../api';
import { HOURS_SOURCE, ROLE_LABEL, WEEKDAYS, dateText, hoursText, keyLabel, pct, qtyText, timeText, when } from './meta';
import { Empty, Figure, HeatGrid } from './parts';

type Tab = 'summary' | 'bills' | 'shifts' | 'record' | 'attendance';
const BILL_KINDS: Array<{ value: BillKind; label: string }> = [
  { value: 'all', label: 'Sab' }, { value: 'big', label: 'Bare' }, { value: 'discount', label: 'Discount' },
  { value: 'credit', label: 'Udhaar' }, { value: 'returned', label: 'Return' }, { value: 'voided', label: 'Cancel' },
];
const STATUS_LABEL: Record<string, string> = { PRESENT: 'Hazir', LATE: 'Late', ABSENT: 'Ghair hazir', HALF_DAY: 'Aadha din', ON_LEAVE: 'Chhutti', HOLIDAY: 'Chhutti ka din' };

export function StaffDrawer({ row, team, period, money, cost, costHidden, drawerHidden, onClose }: {
  row: StaffRow;
  team: StaffOverview['team'];
  period: Period;
  money: (n: number) => string;
  cost: (n: number | null | undefined) => string;
  costHidden: boolean;
  /** Settings → Reports hides drawer money from this user. */
  drawerHidden: boolean;
  onClose: () => void;
}) {
  const theme = useChartTheme();
  const [tab, setTab] = useState<Tab>('summary');
  const [kind, setKind] = useState<BillKind>('all');
  const [page, setPage] = useState(1);
  const id = row.id!;
  const detail = useQuery({ queryKey: [STAFF_REPORT_KEY, 'person', id, period], queryFn: () => staffReportApi.person(id, period) });
  const billsQ = useQuery({
    queryKey: [STAFF_REPORT_KEY, 'bills', id, period, kind, page],
    queryFn: () => staffReportApi.bills({ ...period, userId: id, kind, page, limit: 20 }),
    enabled: tab === 'bills',
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  useEffect(() => { setPage(1); }, [kind]);

  const d = detail.data;
  const vs = (now: number, avg: number, up: 'good' | 'bad' = 'good'): 'good' | 'bad' | undefined => {
    if (!avg || Math.abs(now - avg) / avg < 0.1) return undefined;
    return (now > avg) === (up === 'good') ? 'good' : 'bad';
  };
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'summary', label: 'Khulasa' }, { value: 'bills', label: 'Bill' },
    ...(drawerHidden ? [] : [{ value: 'shifts' as const, label: 'Galla' }]),
    { value: 'record', label: 'Return/cancel' }, { value: 'attendance', label: 'Haziri' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={row.name}
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={row.name} url={row.avatarUrl} size={44} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="truncate text-lg font-semibold text-slate-900">{row.name}</h2>
                {row.rank > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-bold text-amber-800 ring-1 ring-amber-200">#{row.rank}</span>}
              </div>
              <p className="truncate text-[0.8125rem] text-slate-500">
                {d?.person.staff?.designation ?? (row.role ? ROLE_LABEL[row.role] ?? row.role : '')}
                {d?.person.shop && <> · <Store className="inline h-3 w-3" /> {d.person.shop}</>}
                {d?.person.lastLoginAt && ` · aakhri login ${when(d.person.lastLoginAt)}`}
              </p>
            </div>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="border-b border-slate-100 px-5 py-2">
          <Segmented label="Hissa" value={tab} onChange={setTab} items={tabs} className="flex-wrap" />
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {tab === 'summary' && (<>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Figure label="Sale" value={money(row.net)} hint={row.prevNet != null ? `pichli period ${money(row.prevNet)}` : `${pct(row.share)} hissa`} />
              <Figure label="Bill" value={row.bills} hint={`${row.customers} customer · ${row.walkIns} walk-in`} />
              <Figure label="Ausat bill" value={money(row.average)} tone={vs(row.average, team.average)} hint={`team ${money(team.average)}`} />
              <Figure label="Cheezein fi bill" value={qtyText(row.itemsPerBill)} tone={vs(row.itemsPerBill, team.itemsPerBill)} hint={`team ${qtyText(team.itemsPerBill)}`} />
              <Figure label="Fi ghanta sale" value={row.hours > 0 ? money(row.perHour) : '—'} tone={row.hours > 0 ? vs(row.perHour, team.perHour) : undefined}
                hint={row.hoursSource ? `${hoursText(row.hours)} · ${HOURS_SOURCE[row.hoursSource]}` : 'Ghante darj nahi'} />
              <Figure label="Cheezein fi ghanta" value={row.hours > 0 ? qtyText(row.itemsPerHour) : '—'} hint={row.hours > 0 ? `${qtyText(row.billsPerHour)} bill fi ghanta` : undefined} />
              <Figure label="Haath se discount" value={money(row.manualDiscount)} tone={vs(row.discountPct, team.discountPct, 'bad')}
                hint={`${pct(row.discountPct)} · team ${pct(team.discountPct)} · ${row.discountBills} bill`} />
              <Figure label="Udhaar par" value={money(row.credit)} hint={`${row.creditBills} bill · ${pct(row.creditPct)}`} />
              <Figure label="Cancel bill" value={row.voided} tone={row.voided ? vs(row.voidPct, team.voidPct, 'bad') : undefined} hint={row.voided ? `${money(row.voidedValue)} · ${pct(row.voidPct)}` : 'Koi nahi'} />
              <Figure label="Is ke bill par return" value={money(row.refunds)} tone={row.refunds ? vs(row.returnPct, team.returnPct, 'bad') : undefined} hint={`${row.returnedBills} bill · ${pct(row.returnPct)}`} />
              <Figure label="Return ki (khud)" value={row.returnsDone} hint={row.returnsDone ? `${money(row.returnsDoneValue)}${row.returnsOthers ? ` · ${row.returnsOthers} doosron ke bill` : ''}` : 'Koi nahi'} />
              {!drawerHidden && <Figure label="Galla" value={row.shifts ? (row.short > 0.5 ? `−${money(row.short)}` : row.over > 0.5 ? `+${money(row.over)}` : 'Theek') : '—'}
                tone={row.short > 0.5 ? 'bad' : row.over > 0.5 ? 'warn' : row.shifts ? 'good' : undefined}
                hint={row.shifts ? `${row.shifts} shift · ${row.shortCount} kam · ${row.overCount} zyada` : 'Koi shift nahi kholi'} />}
              {!costHidden && row.profit != null && <Figure label="Profit" value={cost(row.profit)} hint={row.margin != null ? `${pct(row.margin)} margin` : undefined} />}
              {!drawerHidden && <Figure label="Cash daala / nikala" value={`${money(row.cashIn)} / ${money(row.cashOut)}`} hint={`${row.cashInCount + row.cashOutCount} entries`} />}
              <Figure label="PIN" value={`${row.pinApprovals} manzoor`} tone={row.pinFailures >= 3 ? 'bad' : undefined} hint={row.pinFailures ? `${row.pinFailures} dafa ghalat PIN` : 'Koi ghalat PIN nahi'} />
            </div>
            {row.reassigned > 0 && (
              <p className="rounded-xl bg-sky-50 px-3 py-2 text-[0.8125rem] text-sky-800 ring-1 ring-sky-100">
                {row.reassigned} bill kisi aur ne banaye magar sale {row.name} ke naam chuni gayi — wo bhi yahan gine gaye hain.
              </p>
            )}

            {!d ? <Skeleton className="h-56 rounded-2xl" /> : (<>
              <Block icon={TrendingUp} title="Sale ka rujhan" hint={d.grouping === 'month' ? 'Mahine war' : 'Din war'}>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={d.trend.map((t) => ({ ...t, label: keyLabel(t.key) }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                      <defs><linearGradient id="staff-person" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid stroke={theme.grid} vertical={false} />
                      <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                      <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                      <Tooltip {...theme.tooltip} formatter={(v, n) => [n === 'bills' ? String(v) : formatPKR(Number(v)), n === 'bills' ? 'Bill' : 'Sale']} />
                      <Area type="monotone" dataKey="net" stroke={theme.primary} strokeWidth={2} fill="url(#staff-person)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Block>

              <Block icon={Receipt} title="Kab bechta hai" hint="Hafte ke din aur ghante — gehra rang yani zyada bill">
                <HeatGrid rows={d.heatmap.map((v, i) => ({ key: String(i), label: WEEKDAYS[i], values: v }))} />
              </Block>

              <div className="grid gap-4 sm:grid-cols-2">
                <Block icon={Wallet} title="Payment kaise li">
                  {!d.payments.length ? <Empty text="Koi bill nahi" /> : (
                    <ul className="space-y-1.5 text-[0.8125rem]">
                      {d.payments.map((p) => (
                        <li key={p.method} className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[p.method] ?? '#64748b' }} />{PAYMENT_LABELS[p.method] ?? p.method}<span className="text-slate-400">· {p.bills}</span></span>
                          <span className="tabular-nums text-slate-900">{money(p.net)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Block>
                <Block icon={Package} title="Sab se zyada becha">
                  {!d.products.length ? <Empty text="Koi cheez nahi biki" /> : (
                    <ul className="space-y-1.5 text-[0.8125rem]">
                      {d.products.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-slate-700">{p.name} <span className="text-slate-400">· {qtyText(p.qty)} {p.unit}</span></span>
                          <span className="shrink-0 tabular-nums text-slate-900">{money(p.net)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Block>
              </div>

              {d.commission?.row?.enrolled && (
                <Block icon={Coins} title={`Commission — ${d.commission.period}`} hint="Is mahine ka hisab, sab branches ki sale par">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-2xl font-bold tabular-nums text-slate-900">{money(d.commission.row.earned)}</p>
                    <span className="text-[0.8125rem] text-slate-500">
                      {d.commission.row.paid ? 'Ada ho gayi' : 'Abhi baqi'}{d.commission.row.targetPct != null && ` · target ${d.commission.row.targetPct.toFixed(0)}%`}
                    </span>
                    <Link to="/staff/commission" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Poora hisab →</Link>
                  </div>
                </Block>
              )}
            </>)}
          </>)}

          {tab === 'bills' && (<>
            <Segmented label="Kaun se bill" value={kind} onChange={setKind} items={BILL_KINDS} className="flex-wrap" />
            {!billsQ.data ? <Skeleton className="h-64 rounded-2xl" /> : !billsQ.data.items.length ? <Empty text="Is type ka koi bill nahi" /> : (
              <>
                <p className="text-[0.75rem] text-slate-500">{billsQ.data.count} bill · bill par click se receipt khulti hai</p>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl ring-1 ring-slate-200">
                  {billsQ.data.items.map((b) => (
                    <li key={b.id}>
                      <Link to={receiptLink(b.id)} className="flex items-center gap-3 px-3 py-2.5 text-[0.8125rem] hover:bg-slate-50">
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-900">{b.number}</span>
                            <span className="text-slate-500">{b.customer ?? 'Walk-in'}</span>
                            {b.status === 'VOIDED' && <Tag tone="rose">Cancel</Tag>}
                            {b.refunded > 0 && <Tag tone="orange">Return {money(b.refunded)}</Tag>}
                            {b.credit > 0 && <Tag tone="amber">Udhaar {money(b.credit)}</Tag>}
                            {b.manualDiscount > 0 && <Tag tone="pink">Discount {money(b.manualDiscount)}</Tag>}
                          </span>
                          <span className="mt-0.5 block text-[0.75rem] text-slate-400">
                            {when(b.soldAt)} · {b.lines} cheez · {PAYMENT_LABELS[b.method] ?? b.method}{b.madeBy && ` · bill ${b.madeBy} ne banaya`}
                          </span>
                        </span>
                        <span className={cn('shrink-0 font-semibold tabular-nums', b.status === 'VOIDED' ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(b.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {billsQ.data.pages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
                    <span className="text-sm text-slate-600">{page} / {billsQ.data.pages}</span>
                    <Button variant="secondary" size="sm" disabled={page >= billsQ.data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
                  </div>
                )}
              </>
            )}
          </>)}

          {tab === 'shifts' && (!d ? <Skeleton className="h-64 rounded-2xl" /> : !d.shifts.length ? <Empty text="Is period me galla nahi khola" /> : (
            <Block icon={Vault} title="Is ki shifts" hint="Aakhri 20 — jo is ne kholi">
              <ul className="divide-y divide-slate-100">
                {d.shifts.map((s) => {
                  const diff = s.difference ?? 0;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">{when(s.openedAt)}{s.closedAt ? ` — ${timeText(s.closedAt)}` : ''}</span>
                        <span className="block text-[0.75rem] text-slate-500">
                          <span className="font-mono">{s.number}</span>{s.hours != null && ` · ${hoursText(s.hours)}`} · cash sale {money(s.cashSales)}{s.closedBy && ` · ${s.closedBy} ne band ki`}{s.shop && ` · ${s.shop}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {s.status === 'OPEN' ? <Tag tone="sky">Khuli</Tag> : (
                          <>
                            <span className={cn('block font-semibold tabular-nums', diff < -0.5 ? 'text-rose-700' : diff > 0.5 ? 'text-amber-700' : 'text-emerald-700')}>
                              {Math.abs(diff) < 0.5 ? 'Barabar' : `${diff > 0 ? '+' : '−'}${money(Math.abs(diff))}`}
                            </span>
                            <span className="block text-[0.6875rem] text-slate-400">{money(s.expected ?? 0)} / {money(s.counted ?? 0)}</span>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Block>
          ))}

          {tab === 'record' && (!d ? <Skeleton className="h-64 rounded-2xl" /> : (<>
            <Block icon={RotateCcw} title="Return jo is ne ki" hint="Aakhri 15">
              {!d.returns.length ? <Empty text="Koi return nahi ki" /> : (
                <ul className="divide-y divide-slate-100">
                  {d.returns.map((x) => (
                    <li key={x.id}>
                      <Link to={receiptLink(x.sale.id)} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem] hover:text-brand-700">
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-900">{x.number} · bill {x.sale.number}{!x.ownBill && <Tag tone="violet">Doosre ka bill</Tag>}</span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{when(x.at)} · {x.sale.customer ?? 'Walk-in'}{x.reason && ` · ${x.reason}`}</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-rose-700">−{money(x.amount)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block icon={Ban} title="Is ke cancel hue bill" hint="Kis ne cancel kiya, ye abhi record nahi hota — bill is ke naam tha">
              {!d.voided.length ? <Empty text="Koi bill cancel nahi hua" /> : (
                <ul className="divide-y divide-slate-100">
                  {d.voided.map((v) => (
                    <li key={v.id}>
                      <Link to={receiptLink(v.id)} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem] hover:text-brand-700">
                        <span className="min-w-0">
                          <span className="block font-mono font-medium text-slate-900">{v.number}</span>
                          <span className="block text-[0.75rem] text-slate-500">Bana {when(v.soldAt)} · cancel {when(v.voidedAt)} · {v.customer ?? 'Walk-in'}</span>
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500 line-through">{money(v.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
            <Block icon={KeyRound} title="PIN ka record" hint="Malik ke PIN se approve return aur ghalat PIN">
              {!d.pins.length ? <Empty text="Koi PIN record nahi" /> : (
                <ul className="divide-y divide-slate-100">
                  {d.pins.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 py-2 text-[0.8125rem]">
                      {p.ok ? <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" /> : <KeyRound className="h-4 w-4 shrink-0 text-rose-600" />}
                      <span className="min-w-0 flex-1 truncate text-slate-700">{p.text}</span>
                      <span className="shrink-0 text-[0.75rem] text-slate-400">{when(p.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </>))}

          {tab === 'attendance' && (!d ? <Skeleton className="h-64 rounded-2xl" /> : !d.attendance.linked ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-center ring-1 ring-slate-100">
              <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 font-semibold text-slate-900">Haziri ka record jura nahi</p>
              <p className="mt-1 text-[0.8125rem] text-slate-500">Staff me is bande ka record bana kar login se jorein — phir haziri, ghante aur fi ghanta sale asal ghanton par banegi.</p>
              <Link to="/staff" className="mt-3 inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Staff kholein →</Link>
            </div>
          ) : (<>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Figure label="Hazir din" value={d.attendance.summary?.days ?? 0} />
              <Figure label="Kaam ke ghante" value={hoursText(d.attendance.summary?.hours ?? 0)} hint={d.attendance.summary?.overtime ? `${hoursText(d.attendance.summary.overtime)} overtime` : undefined} />
              <Figure label="Late" value={d.attendance.summary?.late ?? 0} tone={(d.attendance.summary?.late ?? 0) > 2 ? 'warn' : undefined} />
              <Figure label="Ghair hazir / chhutti" value={`${d.attendance.summary?.absent ?? 0} / ${d.attendance.summary?.leave ?? 0}`} />
            </div>
            <Block icon={CalendarCheck} title="Din war haziri" hint="Aakhri 31 din">
              {!d.attendance.days.length ? <Empty text="Is period me haziri nahi lagi" /> : (
                <ul className="divide-y divide-slate-100">
                  {d.attendance.days.map((a) => (
                    <li key={a.date} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-900">{dateText(`${a.date}T12:00:00`)}</span>
                        <span className="block text-[0.75rem] text-slate-500">
                          {a.checkIn ? timeText(a.checkIn) : '—'} — {a.checkOut ? timeText(a.checkOut) : '—'}{a.late ? ` · ${a.late} min late` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-semibold text-slate-900">{STATUS_LABEL[a.status] ?? a.status}</span>
                        <span className="block text-[0.6875rem] text-slate-400">{a.hours ? hoursText(a.hours) : ''}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Block>
          </>))}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

function Block({ icon: Icon, title, hint, children }: { icon: typeof Receipt; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl p-4 ring-1 ring-slate-200">
      <h3 className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><Icon className="h-4 w-4 text-brand-600" />{title}</h3>
      {hint && <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const TAG_TONES: Record<string, string> = {
  rose: 'bg-rose-50 text-rose-700 ring-rose-200', orange: 'bg-orange-50 text-orange-700 ring-orange-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  pink: 'bg-pink-50 text-pink-700 ring-pink-200', sky: 'bg-sky-50 text-sky-700 ring-sky-200', violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};
function Tag({ tone, children }: { tone: keyof typeof TAG_TONES; children: ReactNode }) {
  return <span className={cn('ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold ring-1', TAG_TONES[tone])}>{children}</span>;
}
