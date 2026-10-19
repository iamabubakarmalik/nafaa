/**
 * Handing the vehicle back, in one step: take what is left, set the next
 * service reminder and the work warranty, close the job and post its bill
 * (sales, cash register, khata). Whatever is still unpaid goes on the
 * customer's khata.
 */

import { useState } from 'react';
import { AlertTriangle, Bell, Receipt, ShieldCheck } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import type { DeliverInput, WorkshopJob } from '../api/workshop-jobs.api';
import { dateInput, digits, km, money } from './meta';

const NEXT_KM = [1000, 3000, 5000, 10000];
const WARRANTY = [0, 1, 3, 6];

export function DeliverJobModal({ job, pending, onConfirm, onClose }: {
  job: WorkshopJob;
  pending: boolean;
  onConfirm: (v: DeliverInput) => void;
  onClose: () => void;
}) {
  const total = Number(job.total) || 0;
  const paid = Number(job.paidAmount) || 0;
  const balance = Math.max(total - paid, 0);
  const [amount, setAmount] = useState(balance ? String(balance) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [nextKm, setNextKm] = useState(job.jobType === 'OIL_CHANGE' && job.odometerKm ? String(job.odometerKm + 3000) : '');
  const [nextDate, setNextDate] = useState(job.jobType === 'OIL_CHANGE' ? dateInput(new Date(Date.now() + 90 * 86_400_000)) : '');
  const [warranty, setWarranty] = useState(job.warrantyMonths || 0);
  const entered = Number(amount) || 0;
  const left = Math.max(balance - entered, 0);
  const tooMuch = entered > balance + 0.01;
  const noName = left > 0 && !job.customerId && !job.customerName?.trim() && !job.customerPhone?.trim();
  const kmLow = !!nextKm && !!job.odometerKm && Number(nextKm) <= job.odometerKm;

  const submit = () => {
    if (tooMuch || noName || kmLow || pending) return;
    onConfirm({
      amount: entered, paymentMethod: method, warrantyMonths: warranty || undefined,
      nextServiceKm: Number(nextKm) || undefined, nextServiceDate: nextDate ? new Date(`${nextDate}T09:00`).toISOString() : undefined,
    });
  };

  return (
    <Modal open onClose={onClose} size="md" title={`Gaari wapas dein — ${job.jobNumber}`}
      description={[job.registrationNumber, job.makeName, job.modelName, job.customerName].filter(Boolean).join(' · ')}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={tooMuch || noName || kmLow} loading={pending} leftIcon={<Receipt className="h-4 w-4" />}>
          {total <= 0 ? 'Gaari de di' : left > 0 ? `De dein — ${formatPKR(left)} khata me` : 'Paisa le kar gaari dein'}
        </Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">Kul bill</dt><dd className="font-semibold tabular-nums">{formatPKR(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Pehle mila (advance)</dt><dd className="tabular-nums">{formatPKR(paid)}</dd></div>
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="font-medium text-slate-700">Baqi</dt><dd className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(balance)}</dd></div>
        </dl>

        {total <= 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Is kaam ka koi bill nahi (warranty ya muft) — sirf gaari wapas hogi.</p>
        ) : balance > 0 && (
          <>
            <Input label="Abhi kitna liya" inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} autoFocus
              error={tooMuch ? `Baqi sirf ${formatPKR(balance)} hai` : undefined} />
            <PaymentMethodPicker value={method} onChange={setMethod} />
            {left > 0 && (
              <p className={cn('flex items-start gap-1.5 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', noName ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {noName ? 'Udhaar ke liye pehle job me customer ka naam ya phone likhein.' : `${formatPKR(left)} ${job.customerName ?? 'customer'} ke khata me udhaar likha jayega.`}
              </p>
            )}
          </>
        )}

        <div className="rounded-xl p-3 ring-1 ring-slate-200">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-800"><Bell className="h-4 w-4 text-brand-600" />Agli service ki yaad-dihani</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <Input label="Kitne km par" inputMode="numeric" value={nextKm} onChange={(e) => setNextKm(digits(e.target.value))}
                placeholder={job.odometerKm ? String(job.odometerKm + 3000) : '85000'} hint={job.odometerKm ? `Abhi ${km(job.odometerKm)}` : undefined}
                error={kmLow ? 'Abhi ke meter se zyada likhein' : undefined} />
              {job.odometerKm ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {NEXT_KM.map((d) => (
                    <button key={d} type="button" onClick={() => setNextKm(String((job.odometerKm ?? 0) + d))}
                      className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">+{d.toLocaleString('en-PK')}</button>
                  ))}
                </div>
              ) : null}
            </div>
            <Input label="Ya is date par" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} hint="Khali chhorein to reminder nahi banega" />
          </div>
        </div>

        <div>
          <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><ShieldCheck className="h-4 w-4 text-emerald-600" />Kaam ki warranty</span>
          <div className="flex flex-wrap gap-1.5">
            {WARRANTY.map((m) => (
              <button key={m} type="button" onClick={() => setWarranty(m)} aria-pressed={warranty === m}
                className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', warranty === m ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>
                {m === 0 ? 'Koi nahi' : `${m} mahina`}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
