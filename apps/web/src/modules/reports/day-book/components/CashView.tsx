/**
 * Galla tab: cash that moved through drawers in the day, every register
 * (shift) reconciled — opening, expected from the shared live-cash
 * calculation, counted, short or over, who opened and closed — and the
 * manual cash in / out entries.
 */

import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Banknote, Clock, LockKeyhole, Vault } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { CashFlow, DayBook, DrawerRow } from '../api';
import { clock, diffLabel, type Money } from '../print';
import { Empty, Line, Panel, Tag } from './parts';

function FlowLines({ f, m }: { f: CashFlow; m: Money }) {
  const rows: Array<[string, number, '+' | '−', string?]> = [
    ['Cash sale', f.cashSales, '+', 'diya − wapas rezgari'],
    ['Booking advance', f.bookingReceived, '+'],
    ['Khata wasooli', f.khataReceived, '+'],
    ['Cash in', f.cashIn, '+'],
    ['Cash out', f.cashOut, '−'],
    ['Return (cash)', f.returns, '−'],
    ['Booking return', f.bookingRefunds, '−'],
    ['Expense (cash)', f.expenses, '−'],
    ['Purchase (cash)', f.purchases, '−'],
    ['Supplier ko diya', f.supplierPaid, '−'],
  ];
  return <>{rows.filter(([, v]) => v).map(([l, v, s, h]) => <Line key={l} sign={s} label={l} hint={h} value={m.sales(v)} />)}</>;
}

/** Only rendered when the drawer figures are shown to this user. */
export function CashView({ d, m, dr }: { d: DayBook; m: Money; dr: NonNullable<DayBook['drawer']> }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={Vault} title="Din ka galla" hint="Is din jitne register chale, sab ka jor" className="lg:col-span-1">
          <Line label="Opening (shuru ka cash)" value={m.sales(dr.opening)} hint={dr.registers.some((r) => r.startedEarlier) ? 'pehle se khule register ke ilawa' : undefined} />
          <FlowLines f={dr.flow} m={m} />
          <Line strong label="Hona chahiye" hint="har register ka jor" value={m.sales(dr.expected)} />
          {dr.counted != null ? (
            <>
              <Line label="Gina hua" value={m.sales(dr.counted)} />
              <DiffBox diff={dr.difference ?? 0} m={m} />
            </>
          ) : (
            <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800 ring-1 ring-amber-100">
              {dr.registers.length ? `${dr.openNow} register abhi khula hai — "hona chahiye" abhi tak ka hai.` : 'Is din koi register nahi khula.'}
            </p>
          )}
          {dr.previousClosing && (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-100">
              Pichhli closing <b className="tabular-nums text-slate-900">{m.sales(dr.previousClosing.amount)}</b> ({dr.previousClosing.number}) · aaj ki opening <b className="tabular-nums text-slate-900">{m.sales(dr.previousClosing.nextOpening)}</b>
              {Math.abs(dr.previousClosing.nextOpening - dr.previousClosing.amount) >= 1 && <span className="ml-1 font-semibold text-amber-700">· farq {m.sales(dr.previousClosing.nextOpening - dr.previousClosing.amount)}</span>}
            </div>
          )}
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          {!dr.registers.length ? (
            <Panel icon={LockKeyhole} title="Register"><Empty icon={LockKeyhole} text="Is din koi register nahi khula" hint="Cash register kholne se galla ka hisaab milta hai" /></Panel>
          ) : dr.registers.map((r) => <RegisterCard key={r.id} r={r} m={m} />)}
          <Link to="/cash-register" className="inline-block text-[0.8125rem] font-semibold text-brand-700 hover:underline">Cash register kholein →</Link>
        </div>
      </div>

      <Panel icon={Banknote} title="Cash in / out" hint="Galle me haath se daala ya nikala gaya paisa, wajah ke saath">
        {!d.cashMoves.length ? <Empty icon={Banknote} text="Koi cash in / out nahi hua" /> : (
          <ul className="divide-y divide-slate-100">
            {d.cashMoves.map((c) => {
              const inn = c.type === 'CASH_IN';
              return (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', inn ? 'bg-success-50 text-success-700' : 'bg-rose-50 text-rose-700')}>
                    {inn ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.8125rem] font-medium text-slate-800">{c.reason || c.note || (inn ? 'Cash in' : 'Cash out')}</p>
                    <p className="text-[0.6875rem] text-slate-500">{clock(c.at)} · {c.register}{c.by ? ` · ${c.by}` : ''}{c.reason && c.note ? ` · ${c.note}` : ''}</p>
                  </div>
                  <span className={cn('shrink-0 font-semibold tabular-nums', inn ? 'text-success-700' : 'text-rose-700')}>{inn ? '+' : '−'}{m.sales(c.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DiffBox({ diff, m }: { diff: number; m: Money }) {
  return (
    <div className={cn('mt-2 flex items-center justify-between rounded-xl px-3 py-2 text-[0.8125rem] font-semibold ring-1',
      diff === 0 ? 'bg-success-50 text-success-800 ring-success-100' : diff < 0 ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-amber-50 text-amber-800 ring-amber-100')}>
      <span>Farq · {diffLabel(diff)}</span>
      <span className="tabular-nums">{m.sales(diff)}</span>
    </div>
  );
}

function RegisterCard({ r, m }: { r: DrawerRow; m: Money }) {
  const open = r.status === 'OPEN';
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-[0.9375rem] font-semibold text-slate-900">
            {r.number}
            {open ? <Tag tone="amber">Khula</Tag> : <Tag tone="green">Band</Tag>}
            {r.startedEarlier && <Tag tone="slate">Pichhle din se</Tag>}
            {r.shop && <span className="text-[0.75rem] font-normal text-slate-500">{r.shop}</span>}
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.75rem] text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{clock(r.openedAt)} – {open ? 'abhi tak' : clock(r.closedAt)}</span>
            <span>Khola: <b className="font-medium text-slate-700">{r.openedBy}</b></span>
            {r.closedBy && <span>Band kiya: <b className="font-medium text-slate-700">{r.closedBy}</b></span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.6875rem] text-slate-500">{open ? 'Abhi hona chahiye' : 'Gina hua'}</p>
          <p className="text-lg font-bold tabular-nums text-slate-900">{m.sales(open ? r.expected : r.counted)}</p>
        </div>
      </header>
      <div className="mt-3 grid gap-x-6 sm:grid-cols-2">
        <div>
          <Line label="Opening" value={m.sales(r.opening)} />
          <FlowLines f={r.flow} m={m} />
        </div>
        <div>
          <Line strong label="Hona chahiye" value={m.sales(r.expected)} />
          {r.counted != null && <Line label="Gina hua" value={m.sales(r.counted)} />}
          {r.difference != null && <DiffBox diff={r.difference} m={m} />}
          {r.notes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600">Note: {r.notes}</p>}
        </div>
      </div>
    </section>
  );
}
