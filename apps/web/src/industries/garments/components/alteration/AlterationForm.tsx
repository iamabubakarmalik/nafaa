/**
 * Take in a garment for alteration, or change an open ticket: customer,
 * what the garment is, what to change, the charge (zero for free fitting
 * of a piece bought here), when to collect, karigar and an advance.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { alterationsApi, type AlterationInput, type AlterationTicket } from '../../api/alterations.api';
import type { Priority } from '../../api/tailoring.api';
import { CustomerField, TailorSelect, emptyCustomer, type CustomerValue } from '../fields';
import { ALTERATION_KEY, ALTERATION_TYPES, MONEY_KEYS, PRIORITIES, apiError, dayInput, opt, plusDays, r2 } from '../meta';

const QUICK_DAYS = [0, 1, 2, 3, 7];
const CHARGES = [0, 150, 200, 300, 500, 800];

export function AlterationForm({ ticket, onClose, onSaved }: { ticket?: AlterationTicket | null; onClose: () => void; onSaved?: (t: AlterationTicket) => void }) {
  const qc = useQueryClient();
  const editing = !!ticket;
  const [customer, setCustomer] = useState<CustomerValue>(ticket ? { customerId: ticket.customerId ?? '', name: ticket.customerName ?? '', phone: ticket.customerPhone ?? '' } : emptyCustomer);
  const [garment, setGarment] = useState(ticket?.garmentDescription ?? '');
  const [type, setType] = useState(ticket?.alterationType ?? '');
  const [details, setDetails] = useState(ticket?.alterationDetails ?? '');
  const [charges, setCharges] = useState(ticket ? String(ticket.charges) : '');
  const [promised, setPromised] = useState(ticket ? dayInput(ticket.promisedDate) : plusDays(2));
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 'NORMAL');
  const [tailorId, setTailorId] = useState(ticket?.tailorId ?? '');
  const [notes, setNotes] = useState(ticket?.notes ?? '');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [touched, setTouched] = useState(false);

  const fee = r2(Number(charges) || 0);
  const adv = r2(Number(advance) || 0);
  const paid = Number(ticket?.paidAmount ?? 0);
  const problem = !customer.customerId && !customer.name.trim() ? 'Customer ka naam likhein'
    : !garment.trim() ? 'Kaunsa kapra hai, likhein'
      : !type.trim() ? 'Kya badalna hai, chunein'
        : fee + 0.01 < paid ? `${formatPKR(paid)} pehle mil chuke — charges is se kam nahi ho sakte`
          : !editing && adv > fee + 0.01 ? 'Advance charges se zyada nahi ho sakta' : null;

  const save = useMutation({
    mutationFn: () => {
      if (problem) throw new Error(problem);
      const body: AlterationInput = {
        customerId: customer.customerId || undefined, customerName: opt(customer.name), customerPhone: opt(customer.phone),
        garmentDescription: garment.trim(), alterationType: type.trim(), alterationDetails: opt(details), charges: fee,
        promisedDate: promised || undefined, priority, tailorId: tailorId || undefined, notes: opt(notes),
      };
      return editing ? alterationsApi.update(ticket!.id, body) : alterationsApi.create({ ...body, ...(adv > 0 ? { advanceAmount: adv, advanceMethod: method } : {}) });
    },
    onSuccess: (t) => {
      [ALTERATION_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? `${t.ticketNumber} badal gaya` : `Token ${t.ticketNumber} ban gaya`);
      onSaved?.(t);
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTouched(true); if (!problem) save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title={editing ? `${ticket!.ticketNumber} — badlein` : 'Alteration ka kapra lein'}
      description={editing ? 'Mila hua paisa yahan nahi badalta' : 'Customer ko token dein — kapra lene par yahi dikhayega'}
      footer={<>
        {touched && problem ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <p className="mr-auto text-[0.8125rem] text-slate-500">{fee > 0 ? `Charges ${formatPKR(fee)}` : 'Muft alteration'}</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit} leftIcon={<Ruler className="h-4 w-4" />}>{editing ? 'Save karein' : 'Token banayein'}</Button>
      </>}>
      <div className="space-y-4" onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <CustomerField value={customer} onChange={setCustomer} locked={editing && paid > 0} error={touched && !customer.customerId && !customer.name.trim() ? 'Naam likhein' : undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Kaunsa kapra" required value={garment} onChange={(e) => setGarment(e.target.value)} maxLength={200} placeholder="Lawn 3 piece, jeans, sherwani…" error={touched && !garment.trim() ? 'Likhein' : undefined} hint="Rang ya brand bhi likh dein taake pehchaan ho" />
          <div>
            <Input label="Kya badalna hai" required value={type} onChange={(e) => setType(e.target.value)} maxLength={120} error={touched && !type.trim() ? 'Chunein' : undefined} />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ALTERATION_TYPES.map((t) => <button key={t} type="button" onClick={() => setType(t)} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-medium ring-1', type === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{t}</button>)}
            </div>
          </div>
        </div>
        <Textarea label="Tafseel" value={details} onChange={(e) => setDetails(e.target.value)} rows={2} maxLength={2000} placeholder="Kameez 2 inch chhoti, bazu 1 inch…" hint="Karigar ke liye" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Input label="Charges (Rs)" inputMode="decimal" value={charges} onChange={(e) => setCharges(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" hint="Yahan se khareeda ho aur muft karna ho to 0" />
            <div className="mt-1.5 flex flex-wrap gap-1">{CHARGES.map((c) => <button key={c} type="button" onClick={() => setCharges(String(c))} className="h-7 rounded-lg bg-white px-2 text-[0.75rem] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{c === 0 ? 'Muft' : c}</button>)}</div>
          </div>
          <div>
            <Input label="Kab lena hai" type="date" value={promised} onChange={(e) => setPromised(e.target.value)} hint="Is din ke 'Aaj dena hai' me aayega" />
            <div className="mt-1.5 flex flex-wrap gap-1">{QUICK_DAYS.map((d) => <button key={d} type="button" onClick={() => setPromised(plusDays(d))} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', promised === plusDays(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{d === 0 ? 'Aaj' : d === 1 ? 'Kal' : `${d} din`}</button>)}</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TailorSelect value={tailorId} onChange={setTailorId} />
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitni jaldi</span>
            <div className="grid grid-cols-4 gap-1">{PRIORITIES.map((p) => <button key={p.value} type="button" onClick={() => setPriority(p.value)} className={cn('h-9 rounded-lg text-[0.75rem] font-semibold ring-1', priority === p.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{p.label}</button>)}</div>
          </div>
        </div>
        {!editing && fee > 0 && (
          <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
            <Input label="Advance abhi (Rs)" inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums"
              error={adv > fee + 0.01 ? 'Charges se zyada' : undefined} hint={adv > 0 ? `Baqi ${formatPKR(Math.max(fee - adv, 0))} kapra lete waqt` : 'Marzi hai — khate me jama hota hai'} />
            {adv > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
          </div>
        )}
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} placeholder="Button customer ke paas hain…" hint="Marzi hai" />
      </div>
    </Modal>
  );
}
