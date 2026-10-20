/**
 * Dialog pieces shared by installations and repairs: putting a technician
 * and a date on a job, and looking up a sold unit by its serial number
 * (product, customer, warranty and AMC filled in from the register).
 */

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, CalendarClock, ShieldCheck, ShieldX } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { applianceSerialApi, type SerialWarrantyCheck } from '../api/serial-tracking.api';
import { SlotChips, TechSelect } from './ui';
import { dayOnly, todayKey } from './meta';

export function AssignModal({ title, initial, pending, onConfirm, onClose }: {
  title: string;
  initial: { technicianId?: string | null; date?: string | null; slot?: string | null };
  pending: boolean;
  onConfirm: (v: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => void;
  onClose: () => void;
}) {
  const [tech, setTech] = useState(initial.technicianId ?? '');
  const [date, setDate] = useState(initial.date?.slice(0, 10) ?? todayKey());
  const [slot, setSlot] = useState(initial.slot ?? '');
  const past = !!date && date < todayKey();
  return (
    <Modal open onClose={onClose} size="sm" title={title}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => tech && onConfirm({ technicianId: tech, scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined })}
          disabled={!tech || past} loading={pending} leftIcon={<CalendarClock className="h-4 w-4" />}>Laga dein</Button>
      </>}>
      <div className="space-y-4">
        <TechSelect value={tech} onChange={setTech} hint="Sirf active technician. Naya banda Technicians page par jorein." />
        <Input label="Kis din" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={past ? 'Guzri hui date nahi' : undefined} />
        <SlotChips value={slot} onChange={setSlot} />
      </div>
    </Modal>
  );
}

/** Serial number box that checks the register and reports warranty and AMC. */
export function SerialLookup({ value, onChange, onFound }: {
  value: string; onChange: (v: string) => void; onFound: (r: SerialWarrantyCheck) => void;
}) {
  const [code, setCode] = useState('');
  const q = useQuery({
    queryKey: ['appliance-warranty-check', code],
    queryFn: () => applianceSerialApi.warrantyCheck(code),
    enabled: code.length >= 3,
    staleTime: 60_000,
  });
  const r = q.data;
  const found = useRef(onFound);
  found.current = onFound;
  useEffect(() => { if (r?.found) found.current(r); }, [r]);
  return (
    <div>
      <div className="flex items-end gap-2">
        <Input wrapperClassName="flex-1" label="Serial number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Unit par likha number"
          leftIcon={<Barcode className="h-4 w-4" />} hint="Hamari dukaan se bika ho to product, customer aur warranty khud aa jati hai"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setCode(value.trim()); } }} />
        <Button type="button" variant="secondary" onClick={() => setCode(value.trim())} disabled={value.trim().length < 3} loading={q.isFetching}>Check</Button>
      </div>
      {r && code && (
        r.found && r.warranty ? (
          <p className={cn('mt-2 flex flex-wrap items-center gap-1.5 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', r.warranty.isValid ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}>
            {r.warranty.isValid ? <ShieldCheck className="h-4 w-4" /> : <ShieldX className="h-4 w-4" />}
            {r.serial?.product?.name ?? 'Unit'} — {!r.warranty.isValid ? 'warranty khatam' : r.warranty.daysRemaining > 0 && r.warranty.endDate ? `company warranty ${dayOnly(r.warranty.endDate)} tak` : 'company warranty khatam'}
            {r.warranty.shopValid && r.warranty.shopEndDate ? ` · dukaan warranty ${dayOnly(r.warranty.shopEndDate)} tak (kharcha dukaan ka)` : ''}
            {r.warranty.compressorValid && r.warranty.compressorEndDate ? ` · compressor ${dayOnly(r.warranty.compressorEndDate)} tak` : ''}
            {r.amc ? ` · AMC ${r.amc.contractNumber} (${r.amc.visitsLeft} visit baqi)` : ''}
          </p>
        ) : <p className="mt-2 text-[0.8125rem] text-slate-500">Ye serial register me nahi — product ka naam khud likhein.</p>
      )}
    </div>
  );
}
