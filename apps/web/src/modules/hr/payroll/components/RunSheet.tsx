/**
 * The month's run sheet: one line per staff member with attendance, the pay
 * worked out (or the saved salary), what is cut and the net. Unsaved lines
 * can be changed and picked for paying together; saved ones open their
 * record, payslip or balance payment.
 */

import { AlertTriangle, Banknote, CheckSquare, ChevronRight, HandCoins, Pencil, Printer, Square } from 'lucide-react';
import { Avatar, Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { RunEdit, RunRow, RunSheet as Sheet } from '../api/payroll.api';
import { applyEdit, payNow } from './calc';
import { SALARY_TYPE, STATUS, qty } from './meta';

export function RunSheet({ sheet, rows, edits, selected, onToggle, onToggleAll, onEdit, onPay, onPaySelected, onOpen, onPrint, onPayBalance, showShop }: {
  sheet: Sheet;
  rows: RunRow[];
  edits: Record<string, RunEdit>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (ids: string[], on: boolean) => void;
  onEdit: (r: RunRow) => void;
  onPay: (r: RunRow) => void;
  onPaySelected: () => void;
  onOpen: (recordId: string) => void;
  onPrint: (recordId: string) => void;
  onPayBalance: (r: RunRow) => void;
  showShop: boolean;
}) {
  const open = rows.filter((r) => !r.record && sheet.canPay && !sheet.isFuture);
  const allOn = open.length > 0 && open.every((r) => selected.has(r.staff.id));
  const chosen = rows.filter((r) => selected.has(r.staff.id) && !r.record);
  const chosenTotal = chosen.reduce((a, r) => a + payNow(applyEdit(r, edits[r.staff.id]).net, edits[r.staff.id]), 0);
  const blocked = chosen.some((r) => applyEdit(r, edits[r.staff.id]).advanceTooBig);

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {open.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-2.5 sm:px-4">
          <button type="button" onClick={() => onToggleAll(open.map((r) => r.staff.id), !allOn)} className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-slate-700">
            {allOn ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4 text-slate-400" />}
            Sab chunein ({open.length} baqi)
          </button>
          <span className="text-[0.8125rem] text-slate-500">{chosen.length ? `${chosen.length} chune · ${formatPKR(chosenTotal)}` : 'Jin ki tankhwah deni hai unhein chunein'}</span>
          <Button size="sm" className="ml-auto" onClick={onPaySelected} disabled={!chosen.length || blocked} leftIcon={<HandCoins className="h-4 w-4" />}>
            Chune hue ki tankhwah
          </Button>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {rows.map((r) => (
          <Line key={r.staff.id} r={r} sheet={sheet} edit={edits[r.staff.id]} on={selected.has(r.staff.id)} showShop={showShop}
            onToggle={() => onToggle(r.staff.id)} onEdit={() => onEdit(r)} onPay={() => onPay(r)}
            onOpen={() => r.record && onOpen(r.record.id)} onPrint={() => r.record && onPrint(r.record.id)} onPayBalance={() => onPayBalance(r)} />
        ))}
      </ul>
    </div>
  );
}

function Line({ r, sheet, edit, on, showShop, onToggle, onEdit, onPay, onOpen, onPrint, onPayBalance }: {
  r: RunRow; sheet: Sheet; edit?: RunEdit; on: boolean; showShop: boolean;
  onToggle: () => void; onEdit: () => void; onPay: () => void; onOpen: () => void; onPrint: () => void; onPayBalance: () => void;
}) {
  const rec = r.record;
  const p = applyEdit(r, edit);
  const a = r.attendance;
  const editable = !rec && sheet.canPay && !sheet.isFuture;
  const type = SALARY_TYPE[r.staff.salaryType];
  const st = rec ? STATUS[rec.status] : null;

  const parts: Array<[string, number, 'plus' | 'minus']> = rec
    ? [
      ['Tankhwah', rec.baseSalary, 'plus'], ['Overtime', rec.overtimePay, 'plus'], ['Commission', rec.commissionEarned, 'plus'], ['Bonus', rec.bonuses, 'plus'],
      ['Ghair hazri', rec.leaveDeduction, 'minus'], ['Advance', rec.advances, 'minus'], ['Katauti', rec.otherDeductions, 'minus'],
    ]
    : [
      ['Tankhwah', p.basePay, 'plus'], ['Overtime', p.overtimePay, 'plus'], ['Commission', p.commission, 'plus'], ['Bonus', p.bonuses, 'plus'],
      ['Ghair hazri', p.absentCut, 'minus'], ['Advance', p.advance, 'minus'], ['Katauti', p.otherCuts, 'minus'],
    ];
  const shown = parts.filter(([, v], i) => i === 0 || v > 0);
  const net = rec ? rec.netAmount : p.net;
  const att = a.marked
    ? [`${qty(a.present + a.late + a.half * 0.5, 'din')} hazir`, a.absent ? `${a.absent} ghair hazir` : '', a.leave ? `${a.leave} chhutti` : '', a.unpaidLeave ? `${a.unpaidLeave} bina tankhwah` : '', a.overtimeHours >= 0.5 ? `${Math.round(a.overtimeHours * 10) / 10} ghante OT` : '']
      .filter(Boolean).join(' · ')
    : a.unpaidLeave ? `Hazri nahi lagi · ${a.unpaidLeave} din bina tankhwah chhutti` : 'Hazri nahi lagi';

  return (
    <li className={cn(on && 'bg-brand-50/40', rec?.status === 'PAID' && 'bg-emerald-50/30')}>
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-4">
        {editable ? (
          <button type="button" onClick={onToggle} aria-label="Chunein" aria-pressed={on} className="shrink-0">
            {on ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5 text-slate-300" />}
          </button>
        ) : <span className="w-5 shrink-0" />}
        <Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={40} />
        <button type="button" onClick={rec ? onOpen : editable ? onEdit : undefined} className="min-w-0 flex-1 text-left">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{r.staff.fullName}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] font-medium text-slate-600">{type.label}</span>
            {st && rec && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>}
            {edit && !rec && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[0.6875rem] font-medium text-brand-700 ring-1 ring-brand-100">Badla hua</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
            {r.staff.designation}{showShop ? ` · ${r.staff.shop?.name ?? 'Branch nahi lagi'}` : ''} · {att}
          </span>
          <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] tabular-nums">
            {shown.map(([k, v, sign]) => (
              <span key={k} className={sign === 'minus' ? 'text-rose-700' : 'text-slate-600'}>{sign === 'minus' ? '−' : k === 'Tankhwah' ? '' : '+'}{k} {formatPKR(v)}</span>
            ))}
          </span>
        </button>
        <div className="ml-auto text-right">
          <p className="text-base font-bold tabular-nums text-slate-900">{formatPKR(net)}</p>
          <p className="text-[0.6875rem] text-slate-500">
            {rec ? (rec.balanceAmount > 0.5 ? `Baqi ${formatPKR(rec.balanceAmount)}` : rec.paymentNumber) : edit?.payAmount != null && edit.payAmount < p.net ? `Abhi ${formatPKR(edit.payAmount)}` : 'haath me'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {editable && <>
            <Button size="sm" variant="ghost" onClick={onEdit} aria-label="Badlein" leftIcon={<Pencil className="h-4 w-4" />}><span className="hidden lg:inline">Badlein</span></Button>
            <Button size="sm" onClick={onPay} disabled={p.advanceTooBig} leftIcon={<HandCoins className="h-4 w-4" />}>Dein</Button>
          </>}
          {rec && <>
            {sheet.canPay && rec.status !== 'CANCELLED' && rec.balanceAmount > 0.5 && (
              <Button size="sm" onClick={onPayBalance} leftIcon={<Banknote className="h-4 w-4" />}>Baqi dein</Button>
            )}
            <Button size="sm" variant="ghost" onClick={onPrint} aria-label="Payslip" leftIcon={<Printer className="h-4 w-4" />}><span className="hidden lg:inline">Payslip</span></Button>
            <button type="button" onClick={onOpen} aria-label="Details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
          </>}
        </div>
      </div>
      {r.warnings.length > 0 && (
        <p className="flex items-start gap-1.5 px-4 pb-2.5 text-[0.75rem] text-amber-800 sm:pl-[4.75rem]">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{r.warnings.join(' · ')}
        </p>
      )}
    </li>
  );
}
