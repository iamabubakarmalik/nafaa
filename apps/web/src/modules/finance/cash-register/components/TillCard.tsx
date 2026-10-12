/**
 * The open shift of one branch: who opened it and when, the cash the
 * drawer should hold right now, each step of that figure, money that did
 * not come into the drawer, the latest entries and the till actions.
 * `ClosedTill` is the same slot for a branch whose till is not open.
 */

import { ArrowDownToLine, ArrowUpFromLine, CircleDot, FileText, PlayCircle, StopCircle, Store, Wallet } from 'lucide-react';
import { Button, Kbd } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { CashRegister } from '../api/cash-register.api';
import { TX, clock, duration, ledgerRows, paidOut, when } from './meta';

export interface TillActions {
  canOpen: boolean;
  canClose: boolean;
  onMove: (r: CashRegister, kind: 'CASH_IN' | 'CASH_OUT') => void;
  onClose: (r: CashRegister) => void;
  onReport: (id: string) => void;
}

export function TillCard({ r, compact, keys, actions }: { r: CashRegister; compact?: boolean; keys?: boolean; actions: TillActions }) {
  const c = r.live;
  const recent = (r.transactions ?? []).filter((t) => t.type !== 'OPENING').slice(0, compact ? 3 : 8);
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Wallet className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
            <span className="truncate">{r.shop?.name ?? 'Register'}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CircleDot className="h-3 w-3 animate-pulse" />Khuli
            </span>
          </p>
          <p className="truncate text-[0.75rem] text-slate-500">
            <span className="font-mono">{r.registerNumber}</span> · {r.openedBy?.fullName ?? '—'} ne {when(r.openedAt)} ko kholi · {duration(r.openedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.75rem] text-slate-500">Galle me hona chahiye</p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">{formatPKR(r.expectedBalance)}</p>
        </div>
      </header>

      {c && (
        <div className={cn('grid gap-4 p-4 sm:p-5', !compact && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
          <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Mini label="Opening float" value={formatPKR(c.openingBalance)} />
              <Mini label="Cash bikri" value={formatPKR(c.cashSales)} hint={`${c.cashSalesCount} bill`} tone="text-emerald-700" />
              <Mini label="Cash in" value={formatPKR(c.cashIn)} hint={`${c.cashInCount} dafa`} tone="text-emerald-700" />
              <Mini label="Cash out + kharch" value={formatPKR(c.cashOut + paidOut(c))} tone="text-rose-700" />
            </div>
            {!compact && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl text-[0.8125rem] ring-1 ring-slate-200">
                {ledgerRows(c).filter((x) => x.keep || x.value).map((x) => (
                  <li key={x.label} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span className="text-slate-600"><span className="inline-block w-4 font-bold text-slate-400">{x.sign}</span>{x.label}{x.note && <span className="ml-1.5 text-[0.6875rem] text-slate-400">{x.note}</span>}</span>
                    <span className={cn('font-semibold tabular-nums', x.sign === '−' ? 'text-rose-700' : 'text-slate-900')}>{formatPKR(x.value)}</span>
                  </li>
                ))}
                <li className="flex items-center justify-between bg-slate-50 px-3 py-2 font-semibold"><span>= Hona chahiye</span><span className="tabular-nums">{formatPKR(c.expected)}</span></li>
              </ul>
            )}
            {(c.nonCashCollected > 0 || c.creditGiven > 0) && (
              <p className="mt-2 text-[0.75rem] text-slate-500">
                Galle me nahi aaya: {c.nonCashCollected > 0 && <>card / wallet / bank <b className="tabular-nums text-slate-700">{formatPKR(c.nonCashCollected)}</b></>}
                {c.nonCashCollected > 0 && c.creditGiven > 0 && ' · '}
                {c.creditGiven > 0 && <>udhaar <b className="tabular-nums text-amber-700">{formatPKR(c.creditGiven)}</b></>}
                {' '}— kul bikri {formatPKR(c.allSalesTotal)}
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Aakhri entries</p>
            {!recent.length ? (
              <p className="rounded-2xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500 ring-1 ring-slate-200">Abhi koi cash in / out nahi hua</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-2xl text-[0.8125rem] ring-1 ring-slate-200">
                {recent.map((t) => {
                  const m = TX[t.type] ?? TX.CASH_IN;
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 px-3 py-1.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}14`, color: m.color }}><m.icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{t.reason || m.label}</span>
                        <span className="block truncate text-[0.6875rem] text-slate-500">{m.label} · {clock(t.createdAt)}{t.createdBy ? ` · ${t.createdBy.fullName}` : ''}</span>
                      </span>
                      <span className={cn('font-semibold tabular-nums', m.sign < 0 ? 'text-rose-700' : 'text-emerald-700')}>{m.sign < 0 ? '−' : '+'}{formatPKR(t.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
        {actions.canOpen && <>
          <Button size="sm" variant="secondary" onClick={() => actions.onMove(r, 'CASH_IN')} leftIcon={<ArrowDownToLine className="h-4 w-4 text-emerald-600" />}>Cash in{keys && <Kbd className="ml-1 hidden sm:inline-flex">I</Kbd>}</Button>
          <Button size="sm" variant="secondary" onClick={() => actions.onMove(r, 'CASH_OUT')} leftIcon={<ArrowUpFromLine className="h-4 w-4 text-rose-600" />}>Cash out{keys && <Kbd className="ml-1 hidden sm:inline-flex">U</Kbd>}</Button>
        </>}
        <Button size="sm" variant="ghost" onClick={() => actions.onReport(r.id)} leftIcon={<FileText className="h-4 w-4" />}>X-report</Button>
        {actions.canClose && (
          <Button size="sm" variant="danger" className="ml-auto" onClick={() => actions.onClose(r)} leftIcon={<StopCircle className="h-4 w-4" />}>
            Shift band karein{keys && <Kbd className="ml-1 hidden sm:inline-flex">C</Kbd>}
          </Button>
        )}
      </footer>
    </section>
  );
}

export function ClosedTill({ shop, canOpen, keys, onOpen }: { shop: { id: string; name: string }; canOpen: boolean; keys?: boolean; onOpen: () => void }) {
  return (
    <section className="rounded-3xl bg-white px-6 py-10 text-center shadow-sm ring-1 ring-slate-200/80">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><Store className="h-6 w-6" /></span>
      <p className="mt-3 font-semibold text-slate-900">{shop.name} — shift band hai</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Din shuru karne se pehle galla gin kar shift kholein. Cash bikri, kharch aur wapsi phir khud galle ke hisaab me judte rahenge.
      </p>
      {canOpen
        ? <Button className="mt-4" onClick={onOpen} leftIcon={<PlayCircle className="h-4 w-4" />}>Shift kholein{keys && <Kbd className="ml-1 hidden sm:inline-flex">O</Kbd>}</Button>
        : <p className="mt-4 text-[0.8125rem] text-amber-700">Shift kholne ki ijazat aap ke paas nahi — malik se kehein</p>}
    </section>
  );
}

function Mini({ label, value, hint, tone = 'text-slate-900' }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="truncate text-[0.6875rem] text-slate-500">{label}</p>
      <p className={cn('truncate text-[0.9375rem] font-bold tabular-nums', tone)}>{value}</p>
      {hint && <p className="text-[0.6875rem] text-slate-400">{hint}</p>}
    </div>
  );
}
