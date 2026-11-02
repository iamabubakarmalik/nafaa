/**
 * New installment plan on a credit bill: pick the customer, pick one of
 * their credit bills without a plan, then the number of installments and
 * the first due date. The bill's udhaar is already on the khata; the plan
 * only splits it into dated installments.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { Button, Input, Modal, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { customersApi, type Customer } from '@modules/customers/customers/api/customers.api';
import { salesHistoryApi, type HistorySale } from '@modules/sales/history/api';
import { emiApi } from '../../api/emi.api';
import { imeiApi } from '../../api/imei.api';
import { EMI_KEY, QIST_COUNTS, addMonths, apiError, dayOnly, todayKey } from '../meta';
import { t as tr } from '@core/i18n';

export function CreateEmiPlanModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [q, setQ] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bill, setBill] = useState<HistorySale | null>(null);
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(addMonths(todayKey(), 1));
  const [notes, setNotes] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(term.trim()), 250); return () => clearTimeout(t); }, [term]);

  const people = useQuery({ queryKey: ['emi-customer-search', q], queryFn: () => customersApi.list({ search: q, scope: 'all', limit: 8 }), enabled: !customer && q.length >= 2 });
  const bills = useQuery({
    queryKey: ['emi-credit-bills', customer?.id],
    queryFn: () => salesHistoryApi.list({ from: 'all', to: todayKey(), status: 'credit', customerId: customer!.id, sort: 'new' }, 1, 30),
    enabled: !!customer,
  });
  const ids = (bills.data?.items ?? []).map((s) => s.id);
  const taken = useQuery({ queryKey: ['emi-plan-bills', ids], queryFn: () => imeiApi.forSales(ids), enabled: ids.length > 0 });
  const withPlan = new Set((taken.data?.plans ?? []).map((p) => p.saleId));
  const open = (bills.data?.items ?? []).filter((s) => s.status !== 'VOIDED' && Number(s.creditAmount) > 0 && !withPlan.has(s.id));

  const credit = Number(bill?.creditAmount ?? 0);
  const per = count ? Math.round((credit / count) * 100) / 100 : 0;
  const schedule = useMemo(() => Array.from({ length: count }, (_, i) => addMonths(start, i)), [count, start]);
  const problem = !customer ? tr('Customer chunein') : !bill ? tr('Udhaar bill chunein') : !start ? tr('Pehli qist ki date chunein')
    : start < (bill.soldAt.slice(0, 10)) ? tr('Pehli qist bill ki date se pehle nahi ho sakti') : null;

  const save = useMutation({
    mutationFn: () => emiApi.create({
      saleId: bill!.id, customerId: customer!.id, customerName: customer!.name, customerPhone: customer!.phone ?? undefined,
      totalAmount: Number(bill!.total), downPayment: Math.max(Number(bill!.total) - credit, 0), installmentCount: count, startDate: start, notes: notes.trim() || undefined,
    }),
    onSuccess: (p) => { toast.success(tr('Plan {{planNumber}} ban gaya', { planNumber: p.planNumber })); [EMI_KEY, 'emi-stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); navigate(`/emi-plans/${p.id}`); },
    onError: (e) => toast.error(apiError(e, tr('Plan nahi bana'))),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={tr('Naya qist plan')} description={tr('Pehle POS par udhaar bill banayein — phir yahan us ki qistein')}
      footer={<>
        {problem && customer && <span className="me-auto text-[0.8125rem] text-amber-800">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending}>{tr('{{count}} qist × {{per}}', { count, per: formatPKR(per) })}</Button>
      </>}>
      <div className="space-y-4">
        <section>
          <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">{tr('1. Customer')}</p>
          {customer ? (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200">
              <span><b>{customer.name}</b> {' '}{tr('· {{phone}} · khata {{formatPKR}}', { phone: customer.phone, formatPKR: formatPKR(Number(customer.balance ?? 0)) })}</span>
              <button type="button" onClick={() => { setCustomer(null); setBill(null); }} className="font-semibold text-brand-700">{tr('Badlein')}</button>
            </div>
          ) : (
            <>
              <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder={tr('Naam ya phone…')} leftIcon={<Search className="h-4 w-4" />} />
              <ul className="mt-1 max-h-48 overflow-y-auto">
                {(people.data?.items ?? []).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setCustomer(c)} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-start text-[0.8125rem] hover:bg-slate-50">
                      <span className="font-medium text-slate-900">{c.name} <span className="font-normal text-slate-500">{c.phone}</span></span>
                      <span className={cn('tabular-nums', Number(c.balance) > 0 ? 'text-amber-700' : 'text-slate-400')}>{formatPKR(Number(c.balance ?? 0))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {customer && (
          <section>
            <p className="mb-1.5 text-[0.8125rem] font-semibold text-slate-700">{tr('2. Udhaar bill')}</p>
            {bills.isLoading ? <Skeleton className="h-16 rounded-xl" /> : open.length === 0 ? (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">{tr('Is customer ka koi udhaar bill nahi jis par plan na ho. POS par phone udhaar par bechein, phir plan banayein.')}</p>
            ) : (
              <ul className="space-y-1.5">
                {open.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setBill(s)}
                      className={cn('flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-[0.8125rem] ring-1', bill?.id === s.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                      <span><b className="font-mono">{s.saleNumber}</b> · {dayOnly(s.soldAt)} · {s.items.slice(0, 2).map((i) => i.name).join(', ')}</span>
                      <span className="text-end tabular-nums"><b>{formatPKR(s.total)}</b><span className="block text-[0.75rem] text-amber-700">{tr('udhaar {{creditAmount}}', { creditAmount: formatPKR(s.creditAmount) })}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {bill && (
          <section className="space-y-3">
            <p className="text-[0.8125rem] font-semibold text-slate-700">{tr('3. Qistein')}</p>
            <div className="flex flex-wrap gap-1.5">
              {QIST_COUNTS.map((c) => (
                <button key={c} type="button" onClick={() => setCount(c)} className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', count === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{tr('{{c}} mahine', { c })}</button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={tr('Pehli qist')} type="date" value={start} onChange={(e) => setStart(e.target.value)} hint={tr('Har mahine isi tareekh ko')} />
              <div className="rounded-xl bg-brand-50 p-3 text-[0.8125rem] ring-1 ring-brand-100">
                <p className="text-brand-900">{tr('Down payment {{formatPKR}} (bill par mila)', { formatPKR: formatPKR(Math.max(Number(bill.total) - credit, 0)) })}</p>
                <p className="text-lg font-bold text-brand-900">{count} × {formatPKR(per)}</p>
                <p className="text-[0.75rem] text-brand-800">{tr('Kul qistein {{credit}}', { credit: formatPKR(credit) })}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 text-[0.75rem] text-slate-600">{schedule.map((d, i) => <span key={d} className="rounded-md bg-slate-100 px-1.5 py-0.5">{i + 1}: {dayOnly(`${d}T12:00:00`)}</span>)}</div>
            <Textarea label={tr('Note')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Zamin ka naam, cheque number…')} hint={tr('Marzi hai')} />
          </section>
        )}
      </div>
    </Modal>
  );
}
