/**
 * Doctor share payouts: pick a doctor and a period, see the share earned
 * (from the fee bills, as in the day close) less what was already paid for
 * that period, and pay it. The payment is a PAID expense (cash leaves the
 * drawer) and a printable slip; the history lists every payout.
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HandCoins, Printer, Stethoscope, Users } from 'lucide-react';
import { Button, Card, Input, KpiCard, KpiRow, Modal, Select, Table, TBody, THead, Td, Th, Tr, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { usePrinter, type PrintDoc } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { doctorsApi } from '../api/doctors.api';
import { payoutsApi, type DoctorPayout, type PayoutDue, type PayoutMethod } from '../api/payouts.api';
import { ListCard, ListFailed, ListLoading, Pager } from './ListBits';
import { apiError, dateTime, dayBounds, dayKey, drName, r2, shortDate } from '../lib/meta';
import { t } from '@core/i18n';

const METHODS: Array<{ value: PayoutMethod; label: string }> = [
  { value: 'CASH', label: t('Cash (drawer)') }, { value: 'BANK_TRANSFER', label: t('Bank') }, { value: 'JAZZCASH', label: t('JazzCash') }, { value: 'EASYPAISA', label: t('EasyPaisa') },
];
const methodLabel = (m?: string | null) => METHODS.find((x) => x.value === m)?.label ?? t('Cash');
const LIMIT = 20;

function slipDoc(p: Pick<DoctorPayout, 'amount' | 'periodFrom' | 'periodTo' | 'note' | 'createdAt'> & { doctorName: string; expenseNumber?: string | null; method?: string | null; by?: string | null }): PrintDoc {
  return {
    title: t('Doctor share slip'),
    subtitle: p.doctorName,
    meta: [[t('Date'), dateTime(p.createdAt)]],
    sections: [{ kind: 'rows', rows: [
      { label: t('Muddat'), value: `${shortDate(p.periodFrom)} – ${shortDate(p.periodTo)}` },
      { label: t('Tareeqa'), value: methodLabel(p.method) },
      ...(p.expenseNumber ? [{ label: t('Expense'), value: p.expenseNumber }] : []),
      ...(p.note ? [{ label: t('Note'), value: p.note }] : []),
      ...(p.by ? [{ label: t('Ada kiya'), value: p.by }] : []),
      { label: t('Amount'), value: formatPKR(p.amount), strong: true },
    ] }],
    footer: t('Doctor ke dastakhat: ____________________'),
  };
}

function PayModal({ due, from, to, onClose, onPaid }: { due: PayoutDue; from: string; to: string; onClose: () => void; onPaid: (p: DoctorPayout & { expenseNumber: string }, method: PayoutMethod) => void }) {
  const [amount, setAmount] = useState(String(due.due));
  const [method, setMethod] = useState<PayoutMethod>('CASH');
  const [note, setNote] = useState('');
  const n = r2(Number(amount));
  const error = !(n > 0) ? t('Amount likhein') : n > due.due + 0.009 ? t('Sirf {{due}} baqi hai', { due: formatPKR(due.due) }) : undefined;
  const pay = useMutation({
    mutationFn: () => payoutsApi.pay({ doctorId: due.doctor.id, from, to, amount: n, paymentMethod: method, note: note.trim() || undefined }),
    onSuccess: (p) => onPaid(p, method),
    onError: (e) => toast.error(apiError(e, t('Payment nahi hui'))),
  });
  const submit = (e: FormEvent) => { e.preventDefault(); if (!error) pay.mutate(); };
  return (
    <Modal open onClose={onClose} size="md" title={t('Share ada karein — {{doctor}}', { doctor: drName(due.doctor) })} description={t('{{from}} – {{shortDate}} · baqi {{due}}', { from: shortDate(due.from), shortDate: shortDate(due.to), due: formatPKR(due.due) })}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>{t('Wapas')}</Button><Button type="submit" form="payout-form" loading={pay.isPending} disabled={!!error} leftIcon={<HandCoins className="h-4 w-4" />}>{t('Ada karein')}</Button></div>}>
      <form id="payout-form" onSubmit={submit} className="space-y-4"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label={t('Amount')} inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} error={error} hint={t('Kam likhein to baqi baad me de sakte hain')} />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Payment ka tareeqa')}>
          {METHODS.map((m) => (
            <button key={m.value} type="button" role="radio" aria-checked={method === m.value} onClick={() => setMethod(m.value)}
              className={cn('h-9 rounded-xl px-3 text-[0.8125rem] font-semibold ring-1 transition', method === m.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{m.label}</button>
          ))}
        </div>
        <Textarea label={t('Note')} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Pehli qist, cheque no…')} />
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[0.8125rem] text-slate-600 ring-1 ring-slate-100">{t('Ye amount Expense ("Doctor share") me likha jayega{{value}}.', { value: method === 'CASH' ? t(' aur drawer se niklega') : '' })}</p>
      </form>
    </Modal>
  );
}

export function DoctorPayouts() {
  const qc = useQueryClient();
  const { sales: money } = useMasked();
  const { print } = usePrinter();
  const canPay = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const [doctorId, setDoctorId] = useState('');
  const [from, setFrom] = useState(() => dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(dayKey());
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(false);
  const range = { from: dayBounds(from).from, to: dayBounds(to).to };

  const { data: doctors = [] } = useQuery({ queryKey: ['clinic-doctors', 'all'], queryFn: () => doctorsApi.list() });
  const due = useQuery({ queryKey: ['clinic-payout-due', doctorId, range.from, range.to], queryFn: () => payoutsApi.due(doctorId, range.from, range.to), enabled: !!doctorId && from <= to });
  const history = useQuery({ queryKey: ['clinic-payouts', doctorId, page], queryFn: () => payoutsApi.list({ doctorId: doctorId || undefined, page, limit: LIMIT }), placeholderData: (p) => p });
  const d = due.data;

  const printSlip = (p: DoctorPayout, method?: string | null, expenseNumber?: string | null) => print(slipDoc({
    ...p, doctorName: drName(p.doctor ?? d?.doctor), expenseNumber: expenseNumber ?? p.expense?.expenseNumber, method: method ?? p.expense?.paymentMethod, by: p.createdBy?.fullName,
  }));

  return (
    <div className="space-y-4">
      {paying && d && (
        <PayModal due={d} from={range.from} to={range.to} onClose={() => setPaying(false)}
          onPaid={(p, method) => {
            setPaying(false);
            toast.success(t('{{doctor}} ko {{amount}} ada — {{expenseNumber}}', { doctor: drName(d.doctor), amount: formatPKR(p.amount), expenseNumber: p.expenseNumber }));
            printSlip({ ...p, doctor: d.doctor, expense: null, createdBy: null }, method, p.expenseNumber);
            qc.invalidateQueries({ queryKey: ['clinic-payout-due'] });
            qc.invalidateQueries({ queryKey: ['clinic-payouts'] });
          }} />
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Select label={t('Doctor')} value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setPage(1); }} placeholder={t('Doctor chunein')} wrapperClassName="w-60"
          options={doctors.map((x) => ({ value: x.id, label: `${drName(x)}${x.isActive ? '' : ' (band)'}` }))} />
        <Input label={t('Kab se')} type="date" value={from} onChange={(e) => setFrom(e.target.value || from)} wrapperClassName="w-44" error={from > to ? t('Pehle "kab tak" se') : undefined} />
        <Input label={t('Kab tak')} type="date" value={to} onChange={(e) => setTo(e.target.value || to)} wrapperClassName="w-44" />
        {canPay && d && <Button className="ms-auto" disabled={!(d.due > 0)} onClick={() => setPaying(true)} leftIcon={<HandCoins className="h-4 w-4" />}>{t('Share ada karein')}</Button>}
      </div>

      {doctorId && (
        due.isError ? <ListCard><ListFailed onRetry={() => due.refetch()} /></ListCard> : (
          <KpiRow>
            <KpiCard icon={Users} color="#2563eb" label={t('Mareez dekhe')} value={d?.seen ?? 0} hint={t('{{value}} bills', { value: d?.bills ?? 0 })} />
            <KpiCard icon={Stethoscope} color="#0891b2" label={t('Consultation fees')} value={money(d?.fees ?? 0)} />
            <KpiCard icon={HandCoins} color="#7c3aed" label={t('Share')} value={money(d?.share ?? 0)} hint={d ? (d.commissionType === 'FIXED' ? t('{{commissionPct}} har mareez', { commissionPct: formatPKR(d.commissionPct) }) : t('{{commissionPct}}% fees ka', { commissionPct: d.commissionPct })) : undefined} />
            <KpiCard icon={HandCoins} color="#16a34a" label={t('Ada ho chuka')} value={money(d?.paid ?? 0)} />
            <KpiCard icon={HandCoins} color="#d97706" label={t('Baqi share')} value={money(d?.due ?? 0)} />
          </KpiRow>
        )
      )}
      {d && d.payouts.length > 0 && (
        <p className="text-[0.75rem] text-slate-500">{t('Is muddat se milti {{count}} payout pehle ho chuki — wo share se kam ki gayi hai.', { count: d.payouts.length })}</p>
      )}

      <Card title={t('Payouts')} description={doctorId ? t('Is doctor ki saari payouts') : t('Sab doctors ki payouts')}>
        {history.isLoading ? <ListLoading rows={3} /> : history.isError ? <ListFailed onRetry={() => history.refetch()} /> : !history.data?.items.length ? (
          <p className="px-6 py-10 text-center text-[0.875rem] text-slate-500">{t('Abhi koi payout nahi')}</p>
        ) : (
          <>
            <Table minWidth="50rem">
              <THead><Tr><Th>{t('Date')}</Th><Th>{t('Doctor')}</Th><Th>{t('Muddat')}</Th><Th>{t('Expense')}</Th><Th align="right">{t('Amount')}</Th><Th align="right" /></Tr></THead>
              <TBody>
                {history.data.items.map((p) => (
                  <Tr key={p.id}>
                    <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">{shortDate(p.createdAt)}</p><p className="text-[0.75rem] text-slate-500">{p.createdBy?.fullName ?? ''}</p></Td>
                    <Td>{drName(p.doctor) || '—'}{p.note && <p className="max-w-xs truncate text-[0.75rem] text-slate-500">{p.note}</p>}</Td>
                    <Td className="whitespace-nowrap">{shortDate(p.periodFrom)} – {shortDate(p.periodTo)}</Td>
                    <Td>{p.expense ? <><p>{p.expense.expenseNumber}</p><p className="text-[0.75rem] text-slate-500">{methodLabel(p.expense.paymentMethod)}</p></> : '—'}</Td>
                    <Td align="right" className="font-semibold">{money(p.amount)}</Td>
                    <Td align="right"><Button size="xs" variant="secondary" leftIcon={<Printer className="h-3.5 w-3.5" />} onClick={() => printSlip(p)}>{t('Slip')}</Button></Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pager page={page} total={history.data.total} limit={LIMIT} onPage={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
