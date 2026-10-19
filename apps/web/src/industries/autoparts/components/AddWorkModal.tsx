/**
 * Adds work to a job: labour done in the workshop (fixed amount, or hours ×
 * rate, credited to a mechanic) or work sent outside (painter, machine
 * shop, rewinding) with its cost and what is added on top.
 */

import { useState } from 'react';
import { Hammer, Truck } from 'lucide-react';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { MechanicProfile } from '../api/mechanics.api';
import type { ExternalInput, LaborInput } from '../api/workshop-jobs.api';
import { money } from './meta';

const LABOUR = ['Oil change', 'Tuning', 'Brake service', 'Clutch ka kaam', 'Suspension', 'AC gas', 'Wiring', 'Engine ka kaam', 'Alignment', 'Washing'];
const OUTSIDE = ['Painter', 'Denter', 'Machine shop', 'Rewinding', 'Radiator wala', 'Glass wala'];

export function AddWorkModal({ kind, mechanics, defaultMechanicId, pending, onLabour, onOutside, onClose }: {
  kind: 'labour' | 'outside';
  mechanics: MechanicProfile[];
  defaultMechanicId?: string | null;
  pending: boolean;
  onLabour: (v: LaborInput) => void;
  onOutside: (v: ExternalInput) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(kind);
  const [desc, setDesc] = useState('');
  const [byHour, setByHour] = useState(false);
  const [hours, setHours] = useState('1');
  const [amount, setAmount] = useState('');
  const [mechanicId, setMechanicId] = useState(defaultMechanicId ?? '');
  const [vendor, setVendor] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [cost, setCost] = useState('');
  const [markup, setMarkup] = useState('');

  const h = byHour ? Number(hours) || 0 : 1;
  const rate = Number(amount) || 0;
  const labourTotal = h * rate;
  const outsideTotal = (Number(cost) || 0) + (Number(markup) || 0);
  const valid = desc.trim().length > 1 && (tab === 'labour' ? h > 0 && rate >= 0 : (Number(cost) || 0) >= 0);

  const submit = () => {
    if (!valid || pending) return;
    if (tab === 'labour') onLabour({ description: desc.trim(), hours: h, ratePerHour: rate, mechanicId: mechanicId || undefined });
    else onOutside({ description: desc.trim(), vendorName: vendor.trim() || undefined, vendorPhone: vendorPhone.trim() || undefined, cost: Number(cost) || 0, markup: Number(markup) || 0 });
  };

  return (
    <Modal open onClose={onClose} size="md" title={tab === 'labour' ? 'Mazdoori jorein' : 'Bahar ka kaam jorein'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} disabled={!valid} loading={pending}>Jorein — {formatPKR(tab === 'labour' ? labourTotal : outsideTotal)}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
          {([['labour', 'Workshop ka kaam', Hammer], ['outside', 'Bahar bheja', Truck]] as const).map(([id, label, Icon]) => (
            <button key={id} type="button" role="radio" aria-checked={tab === id} onClick={() => { setTab(id); setDesc(''); }}
              className={cn('inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-[0.8125rem] font-semibold', tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
        <div>
          <Input label="Kya kaam" required value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus placeholder={tab === 'labour' ? 'Brake service' : 'Bumper paint'} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {(tab === 'labour' ? LABOUR : OUTSIDE).map((x) => (
              <button key={x} type="button" onClick={() => setDesc(tab === 'labour' ? x : `${x}: `)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{x}</button>
            ))}
          </div>
        </div>
        {tab === 'labour' ? (
          <>
            <div className={cn('grid gap-3', byHour ? 'sm:grid-cols-2' : '')}>
              {byHour && <Input label="Ghante" inputMode="decimal" value={hours} onChange={(e) => setHours(money(e.target.value))} />}
              <Input label={byHour ? 'Rate (ek ghante ka)' : 'Mazdoori (Rs)'} inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} placeholder="0" className="text-right tabular-nums" />
            </div>
            <button type="button" onClick={() => setByHour(!byHour)} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">
              {byHour ? 'Seedhi amount likhein' : 'Ghante ke hisaab se'}
            </button>
            <Select label="Mechanic" value={mechanicId} onChange={(e) => setMechanicId(e.target.value)} placeholder="Koi nahi"
              options={mechanics.map((m) => ({ value: m.id, label: m.staff?.fullName ?? 'Mechanic' }))} hint="Mazdoori isi ke kaam me ginti hoti hai (commission ke liye)" />
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Kis ke paas" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Akram painter" />
              <Input label="Us ka phone" inputMode="tel" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="Marzi hai" />
              <Input label="Us ko kitna dena hai" inputMode="decimal" value={cost} onChange={(e) => setCost(money(e.target.value))} placeholder="0" hint="Ye aap ki cost hai" />
              <Input label="Upar se apna" inputMode="decimal" value={markup} onChange={(e) => setMarkup(money(e.target.value))} placeholder="0" hint="Customer se cost + ye lena hai" />
            </div>
            <p className="text-[0.75rem] text-slate-500">Bahar wale ko jab paisa dein to Expense me “Bahar ka kaam” likhein — galla aur profit dono theek rehte hain.</p>
          </>
        )}
      </form>
    </Modal>
  );
}
