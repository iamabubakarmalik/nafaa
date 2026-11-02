/**
 * Qist plan right after a phone is sold on udhaar at the counter. The bill's
 * udhaar is already on the customer's khata; the plan only splits it into
 * monthly installments, so the amount here is fixed to that udhaar.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock } from 'lucide-react';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { emiApi } from '../api/emi.api';
import { EMI_KEY, QIST_COUNTS, addMonths, apiError, dayOnly, todayKey } from '../components/meta';
import { t } from '@core/i18n';

export interface QistSale {
  id: string;
  saleNumber: string;
  total: number;
  creditAmount: number;
  customer: { id: string; name: string; phone?: string | null };
}

export function QistPlanPrompt({ sale, onClose }: { sale: QistSale; onClose: () => void }) {
  const qc = useQueryClient();
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(() => addMonths(todayKey(), 1));
  const [notes, setNotes] = useState('');
  const credit = sale.creditAmount;
  const down = Math.max(sale.total - credit, 0);
  const per = count ? Math.round((credit / count) * 100) / 100 : 0;
  const schedule = useMemo(() => (start ? Array.from({ length: count }, (_, i) => addMonths(start, i)) : []), [count, start]);
  const problem = !start ? t('Pehli qist ki date chunein') : start < todayKey() ? t('Pehli qist aaj se pehle nahi ho sakti') : null;

  const save = useMutation({
    mutationFn: () => emiApi.create({
      saleId: sale.id, customerId: sale.customer.id, customerName: sale.customer.name, customerPhone: sale.customer.phone ?? undefined,
      totalAmount: sale.total, downPayment: down, installmentCount: count, startDate: start, notes: notes.trim() || undefined,
    }),
    onSuccess: (p) => {
      toast.success(t('Qist plan {{planNumber}} ban gaya', { planNumber: p.planNumber }));
      [EMI_KEY, 'emi-stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, t('Plan nahi bana'))),
  });

  return (
    <Modal open onClose={onClose} size="md" title={t('Qist plan — {{saleNumber}}', { saleNumber: sale.saleNumber })}
      description={t('{{name}}{{value}} · udhaar {{credit}}', { name: sale.customer.name, value: sale.customer.phone ? ` · ${sale.customer.phone}` : '', credit: formatPKR(credit) })}
      footer={<>
        {problem && <span className="me-auto text-[0.8125rem] text-amber-800">{problem}</span>}
        <Button variant="secondary" onClick={onClose}>{t('Abhi nahi')}</Button>
        <Button onClick={() => save.mutate()} disabled={!!problem} loading={save.isPending} leftIcon={<CalendarClock className="h-4 w-4" />}>
          {t('{{count}} qist × {{per}}', { count, per: formatPKR(per) })}
        </Button>
      </>}>
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-[0.8125rem]">
          <div><dt className="text-slate-500">{t('Bill')}</dt><dd className="font-semibold tabular-nums">{formatPKR(sale.total)}</dd></div>
          <div><dt className="text-slate-500">{t('Abhi mila')}</dt><dd className="font-semibold tabular-nums">{formatPKR(down)}</dd></div>
          <div><dt className="text-slate-500">{t('Qiston me')}</dt><dd className="font-semibold tabular-nums text-amber-700">{formatPKR(credit)}</dd></div>
        </dl>
        <div>
          <span className="text-[0.8125rem] font-medium text-slate-700">{t('Kitni qistein')}</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {QIST_COUNTS.map((c) => (
              <button key={c} type="button" onClick={() => setCount(c)}
                className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', count === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{t('{{c}} mahine', { c })}</button>
            ))}
          </div>
        </div>
        <Input label={t('Pehli qist')} type="date" value={start} onChange={(e) => setStart(e.target.value)} hint={t('Har mahine isi tareekh ko (chhote mahine me aakhri din)')} />
        <div className="flex flex-wrap gap-1 text-[0.75rem] text-slate-600">
          {schedule.map((d, i) => <span key={d} className="rounded-md bg-slate-100 px-1.5 py-0.5">{i + 1}: {dayOnly(`${d}T12:00:00`)}</span>)}
        </div>
        <Textarea label={t('Note')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Zamin ka naam, cheque number…')} hint={t('Marzi hai')} />
      </div>
    </Modal>
  );
}
