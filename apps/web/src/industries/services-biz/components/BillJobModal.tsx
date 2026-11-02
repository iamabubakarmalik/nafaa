/**
 * Final bill of a job in one step: take what is left (one method, or split
 * across cash, card, bank and wallets), set the work warranty, close the
 * job and post its bill (sales, cash register, khata). Advances already on
 * the khata come off first; whatever is still unpaid goes on the
 * customer's khata as udhaar. Cash above the bill is change.
 */

import { useState } from 'react';
import { AlertTriangle, Plus, Receipt, ShieldCheck, Split, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { BillInput, ServiceJob } from '../api/jobs.api';
import { money } from './meta';
import { t } from '@core/i18n';

const WARRANTY = [0, 7, 30, 90, 180, 365];
const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: t('Cash') }, { value: 'CARD', label: t('Card') }, { value: 'BANK_TRANSFER', label: t('Bank') },
  { value: 'JAZZCASH', label: t('JazzCash') }, { value: 'EASYPAISA', label: t('Easypaisa') },
];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function BillJobModal({ job, pending, onConfirm, onClose }: {
  job: ServiceJob & { customer?: { id: string } | null };
  pending: boolean;
  onConfirm: (v: BillInput) => void;
  onClose: () => void;
}) {
  const total = Number(job.totalCharge) || 0;
  const paid = Number(job.paidAmount) || 0;
  const balance = r2(Math.max(total - paid, 0));
  const [split, setSplit] = useState(false);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [parts, setParts] = useState<Array<{ method: PaymentMethod; amount: string }>>([{ method: 'CASH', amount: '' }, { method: 'CARD', amount: '' }]);
  const [warranty, setWarranty] = useState(job.jobWarrantyDays || 0);

  const handed = split ? r2(parts.reduce((s, p) => s + (Number(p.amount) || 0), 0)) : Number(amount) || 0;
  const cashIn = split ? r2(parts.filter((p) => p.method === 'CASH').reduce((s, p) => s + (Number(p.amount) || 0), 0)) : method === 'CASH' ? handed : 0;
  const change = r2(Math.max(handed - balance, 0));
  const left = r2(Math.max(balance - handed, 0));
  const badChange = change > cashIn + 0.005;
  const noName = left > 0 && !job.customerId && !job.customerName?.trim() && !job.customerPhone?.trim();
  const badSplit = split && parts.filter((p) => Number(p.amount) > 0).length < 2;

  const submit = () => {
    if (badChange || noName || badSplit || pending) return;
    const rows = parts.filter((p) => Number(p.amount) > 0).map((p) => ({ method: p.method, amount: Number(p.amount) }));
    onConfirm(split ? { payments: rows, jobWarrantyDays: warranty } : { paidAmount: handed, paymentMethod: method, jobWarrantyDays: warranty });
  };

  return (
    <Modal open onClose={onClose} size="md" title={t('Bill banayein — {{jobNumber}}', { jobNumber: job.jobNumber })}
      description={[job.serviceName, job.customerName].filter(Boolean).join(' · ')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={submit} disabled={badChange || noName || badSplit} loading={pending} leftIcon={<Receipt className="h-4 w-4" />}>
          {total <= 0 ? t('Job mukammal') : left > 0 ? t('Bill — {{left}} khata me', { left: formatPKR(left) }) : change > 0 ? t('Bill — {{change}} wapas dein', { change: formatPKR(change) }) : t('Paisa le kar bill')}
        </Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">{t('Kul bill')}</dt><dd className="font-semibold tabular-nums">{formatPKR(total)}</dd></div>
          {paid > 0 && <div className="flex justify-between"><dt className="text-slate-500">{t('Pehle mila (advance)')}</dt><dd className="tabular-nums">− {formatPKR(paid)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="font-medium text-slate-700">{t('Ab lena hai')}</dt><dd className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(balance)}</dd></div>
        </dl>

        {total <= 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">{t('Is kaam ka koi bill nahi (warranty, AMC ya muft) — job sirf mukammal hogi. Dukaan ke lage parts ka Cost profit report me aayega.')}</p>
        ) : balance > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[0.8125rem] font-medium text-slate-700">{split ? t('Kai tareeqon se') : t('Abhi kitna liya')}</span>
              <button type="button" onClick={() => setSplit((x) => !x)} className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">
                <Split className="h-3.5 w-3.5" />{split ? t('Ek hi tareeqa') : t('Split payment')}
              </button>
            </div>
            {split ? (
              <div className="space-y-2">
                {parts.map((p, i) => (
                  <div key={i} className="flex gap-2">
                    <Select aria-label={t('Tareeqa')} value={p.method} wrapperClassName="w-36" options={METHODS}
                      onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, method: e.target.value as PaymentMethod } : x)))} />
                    <Input aria-label={t('Amount')} inputMode="decimal" value={p.amount} placeholder="Rs" wrapperClassName="flex-1" className="text-end tabular-nums"
                      onChange={(e) => setParts(parts.map((x, j) => (j === i ? { ...x, amount: money(e.target.value) } : x)))} />
                    {parts.length > 2 && (
                      <button type="button" aria-label={t('Hatayein')} onClick={() => setParts(parts.filter((_, j) => j !== i))}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                {parts.length < 5 && <Button size="sm" variant="ghost" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setParts([...parts, { method: 'JAZZCASH', amount: '' }])}>{t('Aur tareeqa')}</Button>}
                {badSplit && <p className="text-[0.8125rem] text-slate-500">{t('Kam az kam do tareeqon me amount likhein')}</p>}
              </div>
            ) : (
              <>
                <Input aria-label={t('Abhi kitna liya')} inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} autoFocus className="text-end text-lg font-semibold tabular-nums"
                  hint={change > 0 ? t('{{change}} wapas dein', { change: formatPKR(change) }) : undefined} />
                <PaymentMethodPicker value={method} onChange={setMethod} />
              </>
            )}
            {badChange && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">{t('Card, bank ya wallet par change nahi diya ja sakta — zyada paisa sirf Cash me lein.')}</p>}
            {left > 0 && (
              <p className={cn('flex items-start gap-1.5 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', noName ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {noName ? t('Udhaar ke liye pehle job me customer ka naam ya phone likhein.') : t('{{left}} {{value}} ke khata me udhaar likha jayega.', { left: formatPKR(left), value: job.customerName ?? 'customer' })}
              </p>
            )}
          </>
        )}

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" />{t('Kaam ki warranty (aaj se)')}</span>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...WARRANTY, job.jobWarrantyDays || 0])].sort((a, b) => a - b).map((d) => (
              <button key={d} type="button" onClick={() => setWarranty(d)} aria-pressed={warranty === d}
                className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', warranty === d ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>
                {d === 0 ? t('Koi nahi') : d >= 365 && d % 365 === 0 ? t('{{value}} saal', { value: d / 365 }) : d >= 30 && d % 30 === 0 ? t('{{value}} mahina', { value: d / 30 }) : t('{{d}} din', { d })}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
