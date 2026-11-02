/**
 * One salary or advance: the breakdown, the advances cut from it (or the
 * instalments of an advance), every payment and refund with where the money
 * went, and the actions — payslip, pay the balance, cancel.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Banknote, CircleSlash, Printer } from 'lucide-react';
import { Avatar, Button, Modal, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { payrollApi, type RecordDetail } from '../api/payroll.api';
import { METHOD_LABEL, PAYROLL_KEY, SALARY_TYPE, STATUS, day, dayTime, qty } from './meta';
import { t } from '@core/i18n';

export function RecordModal({ recordId, canWrite, onPrint, onPay, onCancel, onClose }: {
  recordId: string; canWrite: boolean; onPrint: (id: string) => void; onPay: (r: RecordDetail) => void; onCancel: (r: RecordDetail) => void; onClose: () => void;
}) {
  const q = useQuery({ queryKey: [PAYROLL_KEY, 'record', recordId], queryFn: () => payrollApi.record(recordId) });
  const r = q.data;
  const st = r ? STATUS[r.status] : null;
  const advance = r?.kind === 'advance';
  const live = r && r.status !== 'CANCELLED';

  return (
    <Modal open onClose={onClose} size="lg" title={r ? `${r.paymentNumber} · ${r.monthLabel}` : t('Record')}
      description={r ? (advance ? t('Advance / qarz') : t('Tankhwah')) : undefined}
      footer={r && <>
        {canWrite && live && <Button variant="ghost" className="me-auto text-rose-700" onClick={() => onCancel(r)} leftIcon={<CircleSlash className="h-4 w-4" />}>{t('Cancel')}</Button>}
        <Button variant="secondary" onClick={() => onPrint(r.id)} leftIcon={<Printer className="h-4 w-4" />}>{advance ? t('Voucher') : t('Payslip')}</Button>
        {canWrite && live && !advance && r.balanceAmount > 0.5 && <Button onClick={() => onPay(r)} leftIcon={<Banknote className="h-4 w-4" />}>{t('Baqi {{balanceAmount}} dein', { balanceAmount: formatPKR(r.balanceAmount) })}</Button>}
      </>}>
      {!r ? (q.isError ? <p className="py-10 text-center text-sm text-slate-500">{t('Record load nahi hua')}</p> : <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>) : (
        <div className="space-y-4 text-[0.8125rem]">
          <div className="flex items-center gap-3">
            <Avatar name={r.staff.fullName} url={r.staff.avatarUrl} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-slate-900">{r.staff.fullName}</p>
              <p className="truncate text-slate-500">{r.staff.designation} · {SALARY_TYPE[r.staff.salaryType].label}{r.staff.shop?.name ? ` · ${r.staff.shop.name}` : ''}</p>
            </div>
            {st && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-medium ring-1', st.tone)}><st.icon className="h-3.5 w-3.5" />{st.label}</span>}
          </div>

          {advance ? (
            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <p className="font-medium text-slate-700">{r.note ?? t('Advance')}</p>
              <ul className="mt-2 space-y-1">
                {r.related.map((x) => (
                  <li key={x.id} className="flex justify-between gap-2">
                    <span className={cn(x.status === 'CANCELLED' && 'line-through text-slate-400')}>{t('{{paymentNumber}} · {{label}} ki tankhwah se', { paymentNumber: x.paymentNumber, label: x.label })}</span>
                    <span className="font-medium tabular-nums">{formatPKR(x.paidAmount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <dl className="grid gap-x-6 gap-y-1 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100 sm:grid-cols-2">
              <Row k={r.staff.salaryType === 'HOURLY' ? t('Tankhwah ({{hoursWorked}})', { hoursWorked: qty(r.hoursWorked, 'ghante') }) : t('Tankhwah ({{daysWorked}} kaam)', { daysWorked: qty(r.daysWorked, 'din') })} v={formatPKR(r.baseSalary)} />
              <Row k={t('+ Overtime')} v={formatPKR(r.overtimePay)} />
              <Row k={t('+ Commission')} v={formatPKR(r.commissionEarned)} />
              {r.adds.map((a, i) => <Row key={`a${i}`} k={`+ ${a.label}`} v={formatPKR(a.amount)} />)}
              <Row k={t('Kul kamai')} v={formatPKR(r.grossAmount)} strong />
              <Row k={t('− Ghair hazri')} v={formatPKR(r.leaveDeduction)} />
              <Row k={t('− Advance')} v={formatPKR(r.advances)} />
              {r.cuts.map((c, i) => <Row key={`c${i}`} k={`− ${c.label}`} v={formatPKR(c.amount)} />)}
              <Row k={t('Haath me (net)')} v={formatPKR(r.netAmount)} strong />
              <Row k={t('Ada')} v={formatPKR(r.paidAmount)} />
              <Row k={t('Baqi')} v={formatPKR(r.balanceAmount)} />
            </dl>
          )}

          {!advance && r.related.length > 0 && (
            <p className="text-slate-600">{t('Is tankhwah se kata advance: {{value}}', { value: r.related.map((x) => `${x.paymentNumber} (${formatPKR(x.paidAmount)})`).join(', ') })}</p>
          )}
          {!advance && r.note && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{r.note}</p>}

          <div>
            <p className="mb-1.5 font-semibold text-slate-900">{t('Paisa kahan se gaya')}</p>
            {!r.money.length ? <p className="text-slate-500">{r.paidAmount > 0 ? t('{{paidAmount}} {{value}} — purana record, galle / account me entry nahi bani thi', { paidAmount: formatPKR(r.paidAmount), value: METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod }) : t('Abhi kuch ada nahi hua')}</p> : (
              <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {r.money.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                    <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', m.back ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                      {m.back ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{m.from}{m.back ? t(' · wapas aaya') : ''}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{dayTime(m.at)}{m.by ? ` · ${m.by}` : ''}</span>
                    </span>
                    <span className={cn('font-semibold tabular-nums', m.back ? 'text-emerald-700' : 'text-slate-900')}>{m.back ? '+' : '−'}{formatPKR(m.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-[0.75rem] text-slate-500">{t('Bana: {{createdAt}}{{value}}', { createdAt: day(r.createdAt), value: r.paidBy ? t(' · Diya: {{paidBy}}', { paidBy: r.paidBy }) : '' })}</p>
        </div>
      )}
    </Modal>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t border-slate-200 pt-1 font-semibold text-slate-900 sm:col-span-2')}>
      <dt className={cn(!strong && 'text-slate-500')}>{k}</dt><dd className="tabular-nums">{v}</dd>
    </div>
  );
}
