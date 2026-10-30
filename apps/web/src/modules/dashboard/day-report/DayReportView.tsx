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
  Search, Target, Wallet,
} from 'lucide-react';
import { Badge, Button, IconButton, Skeleton } from '@/design-system/components';
import { useAuthStore } from '@core/stores/auth.store';
import { cn } from '@core/lib/cn';
import { useDayReport, type DayReport } from '../data/queries';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '../engine/useChartTheme';
import { useMasked } from '../engine/useMasked';
import { EmptyHint, fmtQty } from '../engine/parts';
import { PrintButton } from '@core/print';
import { TIER_DOT } from '@modules/reports/center/components/PriceTierSplit';
import { ProfitSplitCard } from '@modules/reports/ProfitSplit';
import { categoryTotals, dayReportDoc, prettyDate, reportText } from './exportReport';
import { t as tr } from '@core/i18n';

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
        {sign && <span className={cn('me-1 inline-block w-3 font-semibold', sign === '+' ? 'text-success-600' : 'text-rose-600')}>{sign}</span>}
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
    <Section title={tr('Galla (cash)')} icon={Banknote}>
      <Line label={tr('Opening balance')} value={sales(c.opening)} />
      <Line label={tr('Cash sale')} value={sales(c.cashSales)} sign="+" />
      {(c.khataCollected ?? 0) > 0 && <Line label={tr('Udhaar wapas aaya (cash)')} value={sales(c.khataCollected ?? 0)} sign="+" />}
      {(c.otherIncome ?? 0) > 0 && <Line label={tr('Doosri aamdani')} value={sales(c.otherIncome ?? 0)} sign="+" />}
      {c.cashIn > 0 && <Line label={tr('Cash in')} value={sales(c.cashIn)} sign="+" />}
      {c.expenses > 0 && <Line label={tr('Cash expense')} value={cost(c.expenses)} sign="−" />}
      {c.refunds > 0 && <Line label={tr('Return')} value={sales(c.refunds)} sign="−" />}
      {c.purchases > 0 && <Line label={tr('Maal ki payment')} value={cost(c.purchases)} sign="−" />}
      {c.supplierPaid > 0 && <Line label={tr('Supplier ko diya')} value={cost(c.supplierPaid)} sign="−" />}
      {c.cashOut > 0 && <Line label={tr('Cash out')} value={sales(c.cashOut)} sign="−" />}
      <Line label={c.countedClosing == null ? tr('Closing balance') : tr('Closing (gina hua)')} value={sales(closing)} strong />
      {c.countedClosing == null ? (
        <p className="mt-1 text-[0.75rem] text-slate-500">
          {c.registers === 0 ? tr('Is din register nahi khula — opening 0 maana gaya.') : tr('Register abhi khula hai — ye andaza hai.')}
        </p>
      ) : c.difference ? (
        <p className={cn('mt-1 text-[0.75rem] font-medium', c.difference < 0 ? 'text-rose-700' : 'text-amber-700')}>
          {tr('Ginti me farq: {{difference}}', { difference: sales(c.difference) })}
        </p>
      ) : (
        <p className="mt-1 text-[0.75rem] font-medium text-success-700">{tr('Ginti bilkul theek')}</p>
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
    <Section title={tr('Kya bika')} icon={Package} className="lg:row-span-2">
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
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('Item search')}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white ps-8 pe-3 text-[0.8125rem] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" />
        </label>
      )}
      {groups.length === 0 ? (
        <EmptyHint icon={Package} text={q ? tr('Koi item nahi mila') : tr('Is din kuch nahi bika')} />
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
                      <span className="w-10 shrink-0 text-end font-bold tabular-nums text-slate-900">{fmtQty(i.qty)}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">
                        {i.name}
                        {i.returnedQty > 0 && <span className="ms-1 text-[0.6875rem] text-rose-600">{tr('({{returnedQty}} wapas)', { returnedQty: fmtQty(i.returnedQty) })}</span>}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">{sales(i.revenue)}</span>
                    </li>
                  ))}
                </ul>
                {!expanded && g.list.length > PER_GROUP && (
                  <button type="button" onClick={() => setOpen(key)} className="mt-0.5 text-[0.75rem] font-semibold text-brand-700 hover:underline">
                    {tr('+{{value}} aur', { value: g.list.length - PER_GROUP })}
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
  const { sales, cost } = useMasked();
  const max = Math.max(...r.payments.map((p) => p.collected), 1);
  return (
    <>
      <Section title={tr('Paisa kaise aaya')} icon={Wallet}>
        <Line label={tr('Total sale · {{bills}} bill', { bills: r.sales.bills })} value={sales(r.sales.total)} />
        {!!r.priceTiers?.length && (
          <ul className="mb-1 space-y-1 rounded-lg bg-slate-50 px-2.5 py-2">
            {r.priceTiers.map((t) => (
              <li key={t.tier} className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                  <span className={cn('h-2 w-2 shrink-0 rounded-full', TIER_DOT[t.tier])} />
                  {t.label} <span className="text-slate-400">{tr('· {{bills}} bill', { bills: t.bills })}</span>
                </span>
                <span className="font-medium tabular-nums text-slate-900">{sales(t.total)}</span>
              </li>
            ))}
          </ul>
        )}
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
            <div className="text-[0.6875rem] font-medium text-success-800">{tr('Cash')}</div>
            <div className="text-[0.9375rem] font-bold tabular-nums text-success-900">{sales(r.cashCollected)}</div>
          </div>
          <div className="rounded-lg bg-sky-50 px-2.5 py-2">
            <div className="text-[0.6875rem] font-medium text-sky-800">{tr('Online')}</div>
            <div className="text-[0.9375rem] font-bold tabular-nums text-sky-900">{sales(r.onlineCollected)}</div>
          </div>
        </div>
        {r.sales.credit > 0 && <Line label={tr('Udhaar par diya')} value={sales(r.sales.credit)} />}
        {r.sales.discount > 0 && <Line label={tr('Discount')} value={sales(r.sales.discount)} />}
        {r.sales.refunds > 0 && <Line label={tr('Return · {{refundCount}}', { refundCount: r.sales.refundCount })} value={sales(r.sales.refunds)} />}
      </Section>
      <ProfitBlock r={r} />
      <Section title={tr('Expense')} icon={Wallet}>
        {r.expenses.list.length === 0 ? (
          <p className="py-2 text-[0.8125rem] text-slate-500">{tr('Is din koi expense nahi')}</p>
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
        <Line label={tr('Kul expense')} value={cost(r.expenses.total)} strong />
      </Section>
    </>
  );
}

/** The day's profit by the shared rules: same figures as the dashboard's "aaj ka profit". */
function ProfitBlock({ r }: { r: DayReport }) {
  const { cost, costHidden } = useMasked();
  const p = r.profit;
  if (costHidden || !p?.split || p.netProfit == null) return null;
  const s = p.split;
  return (
    <Section title={tr('Profit')} icon={Target}>
      <Line label={s.basis === 'PAID' ? tr('Haath mein aaya profit') : tr('Bill ka profit')} value={cost(s.headline)} />
      <ProfitSplitCard split={s} money={cost} periodLabel="aaj" compact className="my-2" />
      <Line label={tr('Expense')} value={cost(p.expenses)} sign="−" />
      {!!p.stockLoss && <Line label={tr('Stock nuksan')} value={cost(p.stockLoss)} sign="−" />}
      {!!p.stockGain && <Line label={tr('Stock faida')} value={cost(p.stockGain)} sign="+" />}
      {!!p.otherIncome && <Line label={tr('Doosri aamdani')} value={cost(p.otherIncome)} sign="+" />}
      <Line label={tr('Net profit')} value={cost(p.netProfit)} strong />
    </Section>
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
      toast.success(tr('Report copy ho gaya'));
    } catch {
      toast.error(tr('Copy nahi hua'));
    }
  };

  const prevDiff = r && r.sales.previousTotal > 0 ? ((r.sales.total - r.sales.previousTotal) / r.sales.previousTotal) * 100 : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[1.0625rem] font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-brand-fg"><FileText className="h-4 w-4" /></span>
            {tr('Din ka hisaab')}
            {isToday && <Badge variant="brand" size="xs" dot pulse>{tr('Live')}</Badge>}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-slate-500">
            {key ? prettyDate(key) : tr('Aaj')}
            {r && prevDiff !== null && <> {' '}{tr('· pichhle din se')}{' '} <b className={prevDiff >= 0 ? 'text-success-700' : 'text-rose-700'}>{prevDiff >= 0 ? '+' : ''}{prevDiff.toFixed(1)}%</b></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <IconButton label={tr('Pichhla din')} size="sm" onClick={() => go(-1)} disabled={!key}><ChevronLeft className="h-4 w-4 rtl-flip" /></IconButton>
            <label className="relative flex h-8 items-center gap-1.5 px-2 text-[0.8125rem] font-medium text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <span className="tabular-nums">{key ?? '—'}</span>
              <input type="date" value={key ?? ''} max={toKey(new Date())} aria-label={tr('Date chunein')}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <IconButton label={tr('Agla din')} size="sm" onClick={() => go(1)} disabled={!key || isToday}><ChevronRight className="h-4 w-4 rtl-flip" /></IconButton>
          </div>
          {!isToday && <Button size="sm" variant="ghost" onClick={() => setDate(undefined)}>{tr('Aaj')}</Button>}
          <IconButton label={tr('WhatsApp par bhejein')} variant="secondary" size="md" onClick={share} disabled={!r}><MessageCircle className="h-4 w-4" /></IconButton>
          <IconButton label={tr('Copy karein')} variant="secondary" size="md" onClick={copy} disabled={!r}><Copy className="h-4 w-4" /></IconButton>
          <PrintButton doc={() => dayReportDoc(r!, money, shopName)} disabled={!r} />
          {!full && (
            <Link to="/day-report" className="ms-1 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
              {tr('Poora report')}{' '} <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
            </Link>
          )}
        </div>
      </header>

      <div className="mt-4">
        {isLoading ? (
          <div className="grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
        ) : isError || !r ? (
          <EmptyHint icon={FileText} text={tr('Report load nahi hua — dobara koshish karein')} />
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            <CashColumn r={r} />
            <ItemsColumn r={r} full={full} />
            <div className="space-y-3 lg:row-span-2"><MoneyColumn r={r} /></div>
            {r.staff.length > 0 && (
              <Section title={tr('Kis ne kitna becha')} icon={Package}>
                <ul className="space-y-1.5">
                  {r.staff.map((p) => (
                    <li key={p.userId} className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                      <span className="truncate text-slate-700">{p.name} <span className="text-slate-400">{tr('· {{bills}} bill', { bills: p.bills })}</span></span>
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
