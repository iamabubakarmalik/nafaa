/**
 * Risk score per staff member: the table (cards on phones), a score chart,
 * and a side panel per person with their numbers against the shop average
 * and their most serious events.
 */

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Filter, Gauge, Users, X } from 'lucide-react';
import { Button, IconButton, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { AUDIT_KEY, auditApi, type AuditEvent, type AuditFilters, type StaffRisk } from '../api';
import { ROLE_LABEL, TYPE_META, scoreColor, when } from '../meta';
import { Empty, Panel, ScoreRing, SeverityPill, TypeIcon } from './parts';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

const rate = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

export function StaffView({ staff, loading, fmt, onOpen }: { staff: StaffRisk[] | undefined; loading: boolean; fmt: Fmt; onOpen: (s: StaffRisk) => void }) {
  const theme = useChartTheme();
  const rows = useMemo(() => (staff ?? []).filter((s) => s.events || s.bills), [staff]);
  const chart = rows.filter((s) => s.score > 0).slice(0, 12).map((s) => ({ name: s.name, score: s.score }));

  if (loading || !staff) return <div className="grid gap-4"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div>;
  if (!rows.length) return <Panel icon={Users} title="Staff ka risk"><Empty icon={Users} text="Is muddat me kisi staff ka koi kaam nahi" /></Panel>;

  return (
    <div className="space-y-4">
      {chart.length > 0 && (
        <Panel icon={Gauge} title="Risk score" hint="0 se 100. Har shak wala kaam points deta hai (zaroori 8, dhyan 3, aam 1); dukaan ke ausat se zyada void ya wapsi par aur points. 70+ laal, 40+ peela.">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
                <YAxis domain={[0, 100]} tick={theme.axis} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v) => [`${v} / 100`, 'Risk score']} {...theme.tooltip} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chart.map((c) => <Cell key={c.name} fill={scoreColor(c.score)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <Panel icon={Users} title="Har staff" hint="Bande par dabayein: un ke numbers dukaan ke ausat ke saath aur un ke zaroori waqiye." flush>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[60rem] text-[0.8125rem]">
            <thead className="border-y border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2">Staff</th><th className="px-2 py-2 text-right">Bill</th><th className="px-2 py-2 text-right">Void</th>
                <th className="px-2 py-2 text-right">Wapsi</th><th className="px-2 py-2 text-right">Chhoot</th><th className="px-2 py-2 text-right">Drawer kam</th>
                {!fmt.costHidden && <th className="px-2 py-2 text-right">Stock nuqsan</th>}
                <th className="px-2 py-2 text-right">Waqiye</th><th className="px-5 py-2">Sab se zyada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id ?? 'none'} onClick={() => onOpen(s)} className="cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-3">
                      <ScoreRing score={s.score} size={38} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{s.name}</p>
                        <p className="truncate text-[0.75rem] text-slate-500">{[s.role && (ROLE_LABEL[s.role] ?? s.role), s.shop].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 text-right tabular-nums">{s.bills}</td>
                  <td className="px-2 text-right tabular-nums">{s.voids}{s.bills > 0 && <span className="block text-[0.6875rem] text-slate-500">{rate(s.voids, s.bills + s.voids).toFixed(1)}%</span>}</td>
                  <td className="px-2 text-right tabular-nums">{fmt.money(s.refundValue)}<span className="block text-[0.6875rem] text-slate-500">{s.refunds} · {s.cashRefunds} cash</span></td>
                  <td className="px-2 text-right tabular-nums">{fmt.money(s.discountValue)}<span className="block text-[0.6875rem] text-slate-500">{s.discounts} bill</span></td>
                  <td className={cn('px-2 text-right tabular-nums', s.drawerShort > 0 && 'text-rose-600')}>{fmt.money(s.drawerShort)}<span className="block text-[0.6875rem] text-slate-500">{s.shortCount} dafa</span></td>
                  {!fmt.costHidden && <td className="px-2 text-right tabular-nums">{fmt.cost(s.cost ?? 0)}</td>}
                  <td className="px-2 text-right tabular-nums">{s.events}{s.high > 0 && <span className="block text-[0.6875rem] font-semibold text-rose-600">{s.high} zaroori</span>}</td>
                  <td className="px-5">{s.topType ? <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full" style={{ background: TYPE_META[s.topType].color }} />{TYPE_META[s.topType].label}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-slate-100 lg:hidden">
          {rows.map((s) => (
            <li key={s.id ?? 'none'}>
              <button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                <ScoreRing score={s.score} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{s.name}</span>
                  <span className="block truncate text-[0.75rem] text-slate-500">{s.bills} bill · {s.voids} void · {fmt.money(s.refundValue)} wapsi · {fmt.money(s.drawerShort)} drawer kam</span>
                </span>
                {s.high > 0 && <span className="text-[0.75rem] font-semibold text-rose-600">{s.high}</span>}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function StaffDrawer({ s, all, filters, fmt, onFocus, onOpenEvent, onClose }: {
  s: StaffRisk;
  all: StaffRisk[];
  filters: AuditFilters;
  fmt: Fmt;
  /** Narrow the whole report to this person. */
  onFocus: () => void;
  onOpenEvent: (e: AuditEvent) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const q = { ...filters, staffId: s.id ?? undefined, sort: 'severity' as const, limit: 15 };
  const events = useQuery({ queryKey: [AUDIT_KEY, 'staff-events', q], queryFn: () => auditApi.events(q), enabled: !!s.id });

  const bills = all.reduce((x, r) => x + r.bills, 0);
  const sales = all.reduce((x, r) => x + r.sales, 0);
  const avg = {
    void: rate(all.reduce((x, r) => x + r.voids, 0), bills),
    refund: rate(all.reduce((x, r) => x + r.refundValue, 0), sales),
    discount: rate(all.reduce((x, r) => x + r.discountValue, 0), sales),
  };
  const lines: Array<{ label: string; mine: number; shop: number; text: string }> = [
    { label: 'Void bill', mine: rate(s.voids, s.bills), shop: avg.void, text: `${s.voids} bill · ${fmt.money(s.voidValue)}` },
    { label: 'Wapsi (bikri ka)', mine: rate(s.refundValue, s.sales), shop: avg.refund, text: `${s.refunds} · ${fmt.money(s.refundValue)} · ${s.cashRefunds} cash` },
    { label: 'Haath ki chhoot (bikri ka)', mine: rate(s.discountValue, s.sales), shop: avg.discount, text: `${s.discounts} bill · ${fmt.money(s.discountValue)}` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={s.name}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ScoreRing score={s.score} size={52} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">{s.name}</h2>
              <p className="text-[0.8125rem] text-slate-500">{[s.role && (ROLE_LABEL[s.role] ?? s.role), s.shop, `${s.bills} bill · ${fmt.money(s.sales)}`].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section className="space-y-3">
            <h3 className="text-[0.8125rem] font-semibold text-slate-900">Dukaan ke ausat se muqabla</h3>
            {lines.map((l) => {
              const max = Math.max(l.mine, l.shop, 0.1);
              const high = l.mine > l.shop * 2 && l.mine > 0.5;
              return (
                <div key={l.label}>
                  <div className="flex justify-between text-[0.8125rem]"><span className="text-slate-600">{l.label}</span><span className={cn('font-semibold tabular-nums', high ? 'text-rose-600' : 'text-slate-900')}>{l.mine.toFixed(1)}% <span className="font-normal text-slate-400">/ ausat {l.shop.toFixed(1)}%</span></span></div>
                  <div className="mt-1 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(l.mine / max) * 100}%`, background: high ? '#e11d48' : '#2563eb' }} /></div>
                    <div className="h-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${(l.shop / max) * 100}%` }} /></div>
                  </div>
                  <p className="mt-0.5 text-[0.6875rem] text-slate-500">{l.text}</p>
                </div>
              );
            })}
          </section>
          <section className="grid grid-cols-2 gap-2 text-[0.8125rem]">
            <Fact label="Drawer kam" value={fmt.money(s.drawerShort)} hint={`${s.shortCount} dafa`} bad={s.drawerShort > 0} />
            <Fact label="Drawer zyada" value={fmt.money(s.drawerOver)} />
            <Fact label="Galle se nikale" value={fmt.money(s.cashOut)} />
            {!fmt.costHidden && <Fact label="Stock nuqsan (lagat)" value={fmt.cost(s.cost ?? 0)} />}
            <Fact label="Lagat se kam bechi" value={`${s.belowCost} bill`} />
            <Fact label="Ghalat PIN" value={String(s.pinFailed)} bad={s.pinFailed >= 3} />
            <Fact label="Dukaan ke waqt ke baad" value={String(s.afterHours)} bad={s.afterHours >= 3} />
            <Fact label="Kul waqiye" value={String(s.events)} hint={`${s.high} zaroori`} bad={s.high > 0} />
          </section>
          {s.id && (
            <section>
              <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-900">Sab se zaroori waqiye</h3>
              {events.isLoading ? <Skeleton className="h-40 rounded-xl" /> : !events.data?.items.length ? <Empty text="Koi waqiya nahi" /> : (
                <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                  {events.data.items.map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => onOpenEvent(e)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                        <TypeIcon type={e.type} size="sm" />
                        <span className="min-w-0 flex-1"><span className="block truncate text-[0.8125rem] font-medium text-slate-900">{e.title}</span><span className="block truncate text-[0.6875rem] text-slate-500">{when(e.at)} · {e.flags.join(', ')}</span></span>
                        <SeverityPill s={e.severity} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
        {s.id && (
          <footer className="border-t border-slate-200 px-5 py-3">
            <Button className="w-full" onClick={() => { onFocus(); onClose(); }}><Filter className="h-4 w-4" />Poori report sirf {s.name} ki</Button>
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}

function Fact({ label, value, hint, bad }: { label: string; value: string; hint?: string; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
      <p className="text-[0.6875rem] text-slate-500">{label}</p>
      <p className={cn('font-semibold tabular-nums', bad ? 'text-rose-600' : 'text-slate-900')}>{value}{hint && <span className="ml-1 text-[0.6875rem] font-normal text-slate-500">{hint}</span>}</p>
    </div>
  );
}
