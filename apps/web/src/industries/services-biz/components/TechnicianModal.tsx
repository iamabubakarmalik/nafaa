/**
 * Makes an HR staff member a technician, or changes one: level and skill,
 * working days and hours, areas served, and pay terms (commission on the
 * work part of each billed job, a fixed amount per job, or both).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import type { CommissionType, TechLevel, Technician, TechnicianInput } from '../api/technicians.api';
import { DAYS, LEVELS, TRADES, digits, levelOf, money, tradeOf } from './meta';

const COMMISSION: Array<{ value: CommissionType; label: string }> = [
  { value: 'PERCENTAGE', label: 'Kaam ka %' }, { value: 'FIXED', label: 'Har job fixed' }, { value: 'BOTH', label: 'Dono' }, { value: 'NONE', label: 'Koi nahi' },
];

export function TechnicianModal({ tech, taken, pending, onSave, onClose }: {
  tech?: Technician | null;
  /** Staff ids that already have a profile. */
  taken: string[];
  pending: boolean;
  onSave: (v: TechnicianInput) => void;
  onClose: () => void;
}) {
  const staffQ = useQuery({ queryKey: ['staff', 'active'], queryFn: () => staffApi.list({ status: 'ACTIVE' }), enabled: !tech, staleTime: 60_000 });
  const [staffId, setStaffId] = useState(tech?.staffId ?? '');
  const [level, setLevel] = useState<TechLevel>(tech?.level ?? 'JUNIOR');
  const [skill, setSkill] = useState(tech?.primarySkill ?? '');
  const [areas, setAreas] = useState((tech?.serviceAreas ?? []).join(', '));
  const [days, setDays] = useState<number[]>(tech?.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState(tech?.workStartTime ?? '09:00');
  const [end, setEnd] = useState(tech?.workEndTime ?? '18:00');
  const [ctype, setCtype] = useState<CommissionType>(tech?.commissionType ?? 'PERCENTAGE');
  const [pct, setPct] = useState(tech?.commissionPct ? String(tech.commissionPct) : '');
  const [fixed, setFixed] = useState(tech?.fixedPerJob ? String(tech.fixedPerJob) : '');
  const [salary, setSalary] = useState(tech?.monthlySalary ? String(tech.monthlySalary) : '');
  const [maxJobs, setMaxJobs] = useState(String(tech?.maxOngoingJobs ?? 3));
  const [cnic, setCnic] = useState(tech?.cnicNumber ?? '');
  const [vehicle, setVehicle] = useState(tech?.vehicleNumber ?? '');

  const staff = (staffQ.data ?? []).filter((s) => !taken.includes(s.id));
  const errors: Record<string, string> = {};
  if (!staffId) errors.staff = 'Staff chunein';
  if (end <= start) errors.end = 'Chhutti ka waqt aane ke baad rakhein';
  if (['PERCENTAGE', 'BOTH'].includes(ctype) && !(Number(pct) >= 0 && Number(pct) <= 100)) errors.pct = '0 se 100 tak';
  if (!days.length) errors.days = 'Kam az kam ek din';
  const bad = Object.keys(errors).length > 0;

  const submit = () => {
    if (bad || pending) return;
    onSave({
      staffId, level, primarySkill: skill || undefined, serviceAreas: areas.split(',').map((a) => a.trim()).filter(Boolean), workingDays: days,
      workStartTime: start, workEndTime: end, commissionType: ctype, commissionPct: ['PERCENTAGE', 'BOTH'].includes(ctype) ? Number(pct) || 0 : 0,
      fixedPerJob: ['FIXED', 'BOTH'].includes(ctype) ? Number(fixed) || 0 : 0, monthlySalary: Number(salary) || 0, maxOngoingJobs: Number(maxJobs) || 1,
      cnicNumber: cnic.trim() || undefined, vehicleNumber: vehicle.trim() || undefined,
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={tech ? `Technician — ${tech.staff?.fullName ?? ''}` : 'Naya technician'} description="Staff HR me bana hona chahiye; yahan us ka kaam aur commission"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={bad} loading={pending}>Save</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          {tech ? <Input label="Staff" value={tech.staff?.fullName ?? ''} disabled /> : (
            <Select label="Staff" required value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder="Chunein" error={staffId ? undefined : errors.staff}
              options={staff.map((s) => ({ value: s.id, label: `${s.fullName}${s.staffNumber ? ` (${s.staffNumber})` : ''}` }))}
              hint={staffQ.data && !staff.length ? 'HR → Staff me banda jorein' : undefined} />
          )}
          <Select label="Darja" value={level} onChange={(e) => setLevel(e.target.value as TechLevel)} options={LEVELS.map((l) => ({ value: l, label: levelOf(l) }))} />
          <Select label="Hunar" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="Har kaam" options={TRADES.map((t) => ({ value: t, label: tradeOf(t) }))} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam ke din</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', days.includes(i) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{d}</button>
            ))}
          </div>
          {errors.days && <p className="mt-1 text-[0.8125rem] text-rose-600">{errors.days}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Aane ka waqt" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Chhutti ka waqt" type="time" value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end} />
          <Input label="Ek waqt me kitni jobs" inputMode="numeric" value={maxJobs} onChange={(e) => setMaxJobs(digits(e.target.value).slice(0, 2))} />
        </div>
        <Input label="Kin areas me jata hai" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="DHA, Gulberg, Model Town" hint="Comma laga kar — sahi area wala technician pehle aata hai" />
        <div className="rounded-xl p-3 ring-1 ring-slate-200">
          <span className="mb-1.5 block text-[0.8125rem] font-semibold text-slate-800">Commission (bill hui job par)</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMISSION.map((c) => (
              <button key={c.value} type="button" aria-pressed={ctype === c.value} onClick={() => setCtype(c.value)}
                className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', ctype === c.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>{c.label}</button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {['PERCENTAGE', 'BOTH'].includes(ctype) && <Input label="Kaam ka %" inputMode="decimal" value={pct} onChange={(e) => setPct(money(e.target.value))} error={errors.pct} hint="Visit + labour par, parts par nahi" />}
            {['FIXED', 'BOTH'].includes(ctype) && <Input label="Har job (Rs)" inputMode="decimal" value={fixed} onChange={(e) => setFixed(money(e.target.value))} />}
            <Input label="Mahana tankhwah (Rs)" inputMode="decimal" value={salary} onChange={(e) => setSalary(money(e.target.value))} hint="Payroll HR se hota hai" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="CNIC" value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" hint="Marzi hai" />
          <Input label="Bike / gaari number" value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} hint="Marzi hai" />
        </div>
      </form>
    </Modal>
  );
}
