/**
 * Day report: opening cash to closing cash, what sold (per item and per
 * category) and how the money came in. Used as a dashboard widget and as
 * the full /day-report page.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Banknote, CalendarDays, ChevronLeft, ChevronRight, Copy, FileText, MessageCircle, Package,
  Printer, Search, Wallet,
} from 'lucide-react';
import { Badge, Button, IconButton, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useDayReport, type DayReport } from '../data/queries';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { EmptyHint, fmtQty } from '../engine/parts';
import { categoryTotals, prettyDate, printReport, reportText } from './exportReport';

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toKey(d);
};

function Line({ label, value, sign, strong, muted }: { label: string; value: string; sign?: '+' | '−'; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 py-1.5 text-[0.8125rem]', strong && 'mt-1 border-t border-slate-200 pt-2.5')}>
      <span className={cn(strong ? 'font-semibold text-slate-900' : muted ? 'text-slate-400' : 'text-slate-600')}>
        {sign && <span className={cn('mr-1 inline-block w-3 font-semibold', sign === '+' ? 'text-success-600' : 'text-rose-600')}>{sign}</span>}
        {label}
      </span>
      <span className={cn('tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-900')}>{value}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children, className }: { title: string; icon: typeof Wallet; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 rounded-xl border border-slate-200 bg-white p-4', className)}>
      <h3 className="mb-2 flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4" /> {title}
      </h3>
      {children}
    </div>
  );
}

function CashColumn({ r }: { r: DayReport }) {
  const { sales, cost } = useMasked();
  const c = r.cash;
  const closing = c.countedClosing ?? c.expectedClosing;
  return (
    <Section title="Galla (cash)" icon={Banknote}>
      <Line label="Opening balance" value={sales(c.opening)} />
      <Line label="Cash bikri" value={sales(c.cashSales)} sign="+" />
      {c.cashIn > 0 && <Line label="Cash in" value={sales(c.cashIn)} sign="+" />}
      {c.expenses > 0 && <Line label="Cash kharcha" value={cost(c.expenses)} sign="−" />}
      {c.refunds > 0 && <Line label="Wapsi" value={sales(c.refunds)} sign="−" />}
      {c.purchases > 0 && <Line label="Maal ki adaigi" value={cost(c.purchases)} sign="−" />}
      {c.supplierPaid > 0 && <Line label="Supplier ko diya" value={cost(c.supplierPaid)} sign="−" />}
      {c.cashOut > 0 && <Line label="Cash out" value={sales(c.cashOut)} sign="−" />}
      <Line label={c.countedClosing == null ? 'Closing balance' : 'Closing (gina hua)'} value={sales(closing)} strong />
      {c.countedClosing == null ? (
        <p className="mt-1 text-[0.75rem] text-slate-500">
          {c.registers === 0 ? 'Is din register nahi khula — opening 0 maana gaya.' : 'Register abhi khula hai — ye andaza hai.'}
        </p>
      ) : c.difference ? (
        <p className={cn('mt-1 text-[0.75rem] font-medium', c.difference < 0 ? 'text-rose-700' : 'text-amber-700')}>
          Ginti me farq: {sales(c.difference)}
        </p>
      ) : (
        <p className="mt-1 text-[0.75rem] font-medium text-success-700">Ginti bilkul theek</p>
      )}
    </Section>
  );
}

function ItemsColumn({ r, full }: { r: DayReport; full: boolean }) {
  const { sales } = useMasked();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const totals = categoryTotals(r);
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return r.categories.map((c) => ({
      ...c,
      list: r.items.filter((i) => (i.categoryId ?? null) === c.id && i.qty !== 0 && (!term || i.name.toLowerCase().includes(term))),
    })).filter((g) => g.list.length > 0);
  }, [r, q]);
  const PER_GROUP = full ? Infinity : 5;

  return (
    <Section title="Kya bika" icon={Package} className="lg:row-span-2">
      {totals.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {r.categories.filter((c) => c.qty > 0).map((c) => (
            <span key={c.id ?? 'none'} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[0.75rem] font-semibold text-brand-800">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color ?? 'currentColor' }} />
              {fmtQty(c.qty)} {c.name}
            </span>
          ))}
        </div>
      )}
      {full && r.items.length > 8 && (
        <label className="relative mb-3 block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Item dhoondein"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[0.8125rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </label>
      )}
      {groups.length === 0 ? (
        <EmptyHint icon={Package} text={q ? 'Koi item nahi mila' : 'Is din kuch nahi bika'} />
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const key = g.id ?? 'none';
            const expanded = open === key || full;
            const shown = expanded ? g.list : g.list.slice(0, PER_GROUP);
            return (
              <div key={key}>
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-1 text-[0.75rem] font-semibold text-slate-500">
                  <span>{g.name}</span>
                  <span className="tabular-nums">{fmtQty(g.qty)} · {sales(g.revenue)}</span>
                </div>
                <ul>
                  {shown.map((i) => (
                    <li key={i.productId ?? i.name} className="flex items-baseline gap-2 py-1 text-[0.8125rem]">
                      <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-900">{fmtQty(i.qty)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {i.name}
                        {i.returnedQty > 0 && <span className="ml-1 text-[0.6875rem] text-rose-600">({fmtQty(i.returnedQty)} wapas)</span>}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">{sales(i.revenue)}</span>
                    </li>
                  ))}
                </ul>
                {!expanded && g.list.length > PER_GROUP && (
                  <button type="button" onClick={() => setOpen(key)} className="mt-0.5 text-[0.75rem] font-semibold text-brand-700 hover:underline">
                    +{g.list.length - PER_GROUP} aur
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function MoneyColumn({ r }: { r: DayReport }) {
  const { sales, cost, costHidden } = useMasked();
  const max = Math.max(...r.payments.map((p) => p.collected), 1);
  return (
    <>
      <Section title="Paisa kaise aaya" icon={Wallet}>
        <Line label={`Kul bikri · ${r.sales.bills} bill`} value={sales(r.sales.total)} />
        <div className="my-2 space-y-2">
          {r.payments.map((p) => (
            <div key={p.method}>
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-slate-600">{PAYMENT_LABELS[p.method] ?? p.method} <span className="text-slate-400">· {p.bills}</span></span>
                <span className="font-medium tabular-nums text-slate-900">{sales(p.collected)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(p.collected / max) * 100}%`, backgroundColor: PAYMENT_COLORS[p.method] ?? '#64748b' }} />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
          <div className="rounded-lg bg-success-50 px-2.5 py-2">
            <div className="text-[0.6875rem] font-medium text-success-800">Cash</div>
            <div className="text-[0.9375rem] font-bold tabular-nums text-success-900">{sales(r.cashCollected)}</div>
          </div>
          <div className="rounded-lg bg-sky-50 px-2.5 py-2">
            <div className="text-[0.6875rem] font-medium text-sky-800">Online</div>
            <div className="text-[0.9375rem] font-bold tabular-nums text-sky-900">{sales(r.onlineCollected)}</div>
          </div>
        </div>
        {r.sales.credit > 0 && <Line label="Udhaar par diya" value={sales(r.sales.credit)} />}
        {r.sales.discount > 0 && <Line label="Discount" value={sales(r.sales.discount)} />}
        {r.sales.refunds > 0 && <Line label={`Wapsi · ${r.sales.refundCount}`} value={sales(r.sales.refunds)} />}
        {!costHidden && <Line label="Seedha munafa" value={cost(r.sales.grossProfit)} />}
      </Section>
      <Section title="Kharcha" icon={Wallet}>
        {r.expenses.list.length === 0 ? (
          <p className="py-2 text-[0.8125rem] text-slate-500">Is din koi kharcha nahi</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {r.expenses.list.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2 py-1.5 text-[0.8125rem]">
                <span className="min-w-0 truncate text-slate-700">{e.title}{e.category && <span className="text-slate-400"> · {e.category}</span>}</span>
                <span className="shrink-0 font-medium tabular-nums text-slate-900">{cost(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <Line label="Kul kharcha" value={cost(r.expenses.total)} strong />
      </Section>
    </>
  );
}

export function DayReportView({ full = false }: { full?: boolean }) {
  const [date, setDate] = useState<string | undefined>(undefined);
  const { data: r, isLoading, isError } = useDayReport(date);
  const { sales, cost } = useMasked();
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const key = r?.date ?? date;
  const isToday = r?.isToday ?? !date;
  const money = { sales: (n: number) => sales(n), cost: (n: number) => cost(n) };

  const go = (days: number) => { if (key) setDate(shift(key, days)); };
  const share = () => {
    if (!r) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(reportText(r, money, shopName))}`, '_blank', 'noopener');
  };
  const copy = async () => {
    if (!r) return;
    try {
      await navigator.clipboard.writeText(reportText(r, money, shopName));
      toast.success('Report copy ho gaya');
    } catch {
      toast.error('Copy nahi hua');
    }
  };

  const prevDiff = r && r.sales.previousTotal > 0 ? ((r.sales.total - r.sales.previousTotal) / r.sales.previousTotal) * 100 : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-brand-fg"><FileText className="h-4 w-4" /></span>
            Din ka hisaab
            {isToday && <Badge variant="brand" size="xs" dot pulse>Live</Badge>}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">
            {key ? prettyDate(key) : 'Aaj'}
            {r && prevDiff !== null && <> · pichhle din se <b className={prevDiff >= 0 ? 'text-success-700' : 'text-rose-700'}>{prevDiff >= 0 ? '+' : ''}{prevDiff.toFixed(1)}%</b></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <IconButton label="Pichhla din" size="sm" onClick={() => go(-1)} disabled={!key}><ChevronLeft className="h-4 w-4" /></IconButton>
            <label className="relative flex h-8 items-center gap-1.5 px-2 text-[0.8125rem] font-medium text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="tabular-nums">{key ?? '—'}</span>
              <input type="date" value={key ?? ''} max={toKey(new Date())} aria-label="Tareekh chunein"
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <IconButton label="Agla din" size="sm" onClick={() => go(1)} disabled={!key || isToday}><ChevronRight className="h-4 w-4" /></IconButton>
          </div>
          {!isToday && <Button size="sm" variant="ghost" onClick={() => setDate(undefined)}>Aaj</Button>}
          <IconButton label="WhatsApp par bhejein" variant="secondary" size="md" onClick={share} disabled={!r}><MessageCircle className="h-4 w-4" /></IconButton>
          <IconButton label="Copy karein" variant="secondary" size="md" onClick={copy} disabled={!r}><Copy className="h-4 w-4" /></IconButton>
          <IconButton label="Print" variant="secondary" size="md" onClick={() => r && printReport(r, money, shopName)} disabled={!r}><Printer className="h-4 w-4" /></IconButton>
          {!full && (
            <Link to="/day-report" className="ml-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
              Poora report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </header>

      <div className="mt-4">
        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        ) : isError || !r ? (
          <EmptyHint icon={FileText} text="Report load nahi hua — dobara koshish karein" />
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <CashColumn r={r} />
            <ItemsColumn r={r} full={full} />
            <div className="space-y-3 lg:row-span-2"><MoneyColumn r={r} /></div>
            {r.staff.length > 0 && (
              <Section title="Kis ne kitna becha" icon={Package}>
                <ul className="space-y-1.5">
                  {r.staff.map((p) => (
                    <li key={p.userId} className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                      <span className="truncate text-slate-700">{p.name} <span className="text-slate-400">· {p.bills} bill</span></span>
                      <span className="font-medium tabular-nums text-slate-900">{sales(p.total)}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
