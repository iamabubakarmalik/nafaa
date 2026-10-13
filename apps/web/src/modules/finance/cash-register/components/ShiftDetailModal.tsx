/**
 * One shift in full: who opened and closed it, sales by payment method,
 * every step of the drawer count, cash in/out entries and the notes
 * counted. Prints as the Z-report (X-report while the shift is open).
 */

import { useQuery } from '@tanstack/react-query';
import { Receipt, StopCircle, User } from 'lucide-react';
import { Modal, Skeleton } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { cashRegisterApi, type Denominations } from '../api/cash-register.api';
import { CASH_KEY, COINS, DIFF, NOTES, TX, diffKind, duration, ledgerRows, signed, when } from './meta';
import { zReportDoc } from './print';

export function ShiftDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: [CASH_KEY, 'shift', id], queryFn: () => cashRegisterApi.shift(id) });
  const s = q.data;
  const r = s?.register;
  const kind = s?.difference == null ? null : diffKind(s.difference);

  return (
    <Modal open onClose={onClose} size="lg"
      title={r ? `${r.shop?.name ?? 'Shift'} · ${r.registerNumber}` : 'Shift'}
      description={r ? `${when(r.openedAt)} se ${r.closedAt ? when(r.closedAt) : 'abhi tak'} · ${duration(r.openedAt, r.closedAt)}` : undefined}
      footer={<>
        <span className="mr-auto text-[0.75rem] text-slate-500">{r?.status === 'OPEN' ? 'Khuli shift ka X-report' : 'Band shift ka Z-report'} — A4, PDF ya thermal</span>
        <PrintButton doc={() => zReportDoc(s!)} disabled={!s} label={r?.status === 'OPEN' ? 'X-report' : 'Z-report'} />
      </>}>
      {!s || !r ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <Fact icon={User} k="Kholi" v={r.openedBy?.fullName ?? '—'} sub={when(r.openedAt)} />
            <Fact icon={StopCircle} k="Band ki" v={r.closedBy?.fullName ?? (r.status === 'OPEN' ? 'Abhi khuli' : '—')} sub={r.closedAt ? when(r.closedAt) : undefined} />
            <Fact icon={Receipt} k="Total sale" v={formatPKR(s.cash.allSalesTotal)} sub={`${s.cash.billCount} bill`} />
          </div>

          <section className="rounded-2xl ring-1 ring-slate-200">
            <h3 className="border-b border-slate-100 px-4 py-2 text-[0.8125rem] font-semibold text-slate-900">Galle ka hisaab</h3>
            <ul className="divide-y divide-slate-100 text-[0.8125rem]">
              {ledgerRows(s.cash).filter((x) => x.keep || x.value).map((x) => (
                <li key={x.label} className="flex items-center justify-between gap-3 px-4 py-1.5">
                  <span className="text-slate-600"><span className="inline-block w-4 font-bold text-slate-400">{x.sign}</span>{x.label}{x.note && <span className="ml-1.5 text-[0.6875rem] text-slate-400">{x.note}</span>}</span>
                  <span className={cn('font-semibold tabular-nums', x.sign === '−' ? 'text-rose-700' : 'text-slate-900')}>{formatPKR(x.value)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between bg-slate-50 px-4 py-2 font-semibold"><span>= Hona chahiye</span><span className="tabular-nums">{formatPKR(s.expected)}</span></li>
              {s.counted != null && (
                <li className="flex items-center justify-between px-4 py-2 font-semibold"><span>Gina gaya</span><span className="tabular-nums">{formatPKR(s.counted)}</span></li>
              )}
              {kind && (
                <li className={cn('flex items-center justify-between px-4 py-2 font-bold ring-1 ring-inset', DIFF[kind].tone)}>
                  <DiffLabel kind={kind} />
                  <span className="tabular-nums">{signed(s.difference ?? 0)}</span>
                </li>
              )}
            </ul>
          </section>

          <section>
            <h3 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-900">Sale payment ke hisaab se</h3>
            {!s.cash.byMethod.length ? <p className="text-[0.8125rem] text-slate-500">Is shift me koi sale nahi hui</p> : (
              <div className="flex flex-wrap gap-2">
                {s.cash.byMethod.map((m) => {
                  const pm = POS_PAYMENT_METHODS.find((p) => p.id === m.method);
                  return (
                    <span key={m.method} className="rounded-xl px-3 py-1.5 text-[0.8125rem] ring-1 ring-slate-200">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: pm?.color ?? '#64748b' }} />
                      {pm?.label ?? m.method} <b className="tabular-nums">{formatPKR(m.paid)}</b> <span className="text-slate-400">· {m.count}</span>
                    </span>
                  );
                })}
                {s.cash.creditGiven > 0 && <span className="rounded-xl bg-amber-50 px-3 py-1.5 text-[0.8125rem] text-amber-800 ring-1 ring-amber-200">Udhaar <b className="tabular-nums">{formatPKR(s.cash.creditGiven)}</b></span>}
              </div>
            )}
          </section>

          {s.entries.length > 0 && (
            <section>
              <h3 className="mb-1.5 text-[0.8125rem] font-semibold text-slate-900">Cash in / out</h3>
              <ul className="divide-y divide-slate-100 rounded-2xl text-[0.8125rem] ring-1 ring-slate-200">
                {s.entries.map((e) => {
                  const t = TX[e.type];
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${t.color}14`, color: t.color }}><t.icon className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{e.reason || t.label}</span>
                        <span className="block truncate text-[0.6875rem] text-slate-500">{t.label} · {when(e.createdAt)}{e.createdBy ? ` · ${e.createdBy.fullName}` : ''}{e.note ? ` · ${e.note}` : ''}</span>
                      </span>
                      <span className={cn('font-semibold tabular-nums', t.sign < 0 ? 'text-rose-700' : 'text-emerald-700')}>{t.sign < 0 ? '−' : '+'}{formatPKR(e.amount)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(s.openingDenominations || s.closingDenominations) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Denoms title="Kholte waqt ginti" d={s.openingDenominations} />
              <Denoms title="Band karte waqt ginti" d={s.closingDenominations} />
            </div>
          )}

          {r.notes && <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">{r.notes}</p>}
          {s.recounted && <p className="text-[0.75rem] text-slate-500">Ye purani shift hai; sale ka hisaab aaj dobara gina gaya. "Hona chahiye" aur farak wohi hain jo band karte waqt save hue.</p>}
        </div>
      )}
    </Modal>
  );
}

function DiffLabel({ kind }: { kind: keyof typeof DIFF }) {
  const D = DIFF[kind];
  return <span className="inline-flex items-center gap-1.5"><D.icon className="h-4 w-4" />{D.label}</span>;
}

function Fact({ icon: I, k, v, sub }: { icon: typeof User; k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
      <p className="flex items-center gap-1 text-[0.6875rem] text-slate-500"><I className="h-3 w-3" />{k}</p>
      <p className="truncate text-[0.875rem] font-semibold text-slate-900">{v}</p>
      {sub && <p className="text-[0.6875rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Denoms({ title, d }: { title: string; d: Denominations | null }) {
  const rows = d ? [...NOTES, ...COINS].filter((v) => d[v]) : [];
  return (
    <div className="rounded-2xl ring-1 ring-slate-200">
      <p className="border-b border-slate-100 px-3 py-1.5 text-[0.75rem] font-semibold text-slate-700">{title}</p>
      {!rows.length ? <p className="px-3 py-2 text-[0.75rem] text-slate-500">Note-war ginti nahi hui</p> : (
        <ul className="px-3 py-1.5 text-[0.75rem]">
          {rows.map((v) => <li key={v} className="flex justify-between tabular-nums"><span>Rs {v} × {d![v]}</span><span>{formatPKR(v * d![v])}</span></li>)}
        </ul>
      )}
    </div>
  );
}
