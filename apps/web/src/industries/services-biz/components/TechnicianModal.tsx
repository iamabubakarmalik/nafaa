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
import { t as tr } from '@core/i18n';

const COMMISSION: Array<{ value: CommissionType; label: string }> = [
  { value: 'PERCENTAGE', label: tr('Kaam ka %') }, { value: 'FIXED', label: tr('Har job fixed') }, { value: 'BOTH', label: tr('Dono') }, { value: 'NONE', label: tr('Koi nahi') },
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
  if (!staffId) errors.staff = tr('Staff chunein');
  if (end <= start) errors.end = tr('Chhutti ka waqt aane ke baad rakhein');
  if (['PERCENTAGE', 'BOTH'].includes(ctype) && !(Number(pct) >= 0 && Number(pct) <= 100)) errors.pct = tr('0 se 100 tak');
  if (!days.length) errors.days = tr('Kam az kam ek din');
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
    <Modal open onClose={onClose} size="lg" title={tech ? tr('Technician — {{value}}', { value: tech.staff?.fullName ?? '' }) : tr('Naya technician')} description={tr('Staff HR me bana hona chahiye; yahan us ka kaam aur commission')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button onClick={submit} disabled={bad} loading={pending}>{tr('Save')}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          {tech ? <Input label={tr('Staff')} value={tech.staff?.fullName ?? ''} disabled /> : (
            <Select label={tr('Staff')} required value={staffId} onChange={(e) => setStaffId(e.target.value)} placeholder={tr('Chunein')} error={staffId ? undefined : errors.staff}
              options={staff.map((s) => ({ value: s.id, label: `${s.fullName}${s.staffNumber ? ` (${s.staffNumber})` : ''}` }))}
              hint={staffQ.data && !staff.length ? tr('HR → Staff me banda jorein') : undefined} />
          )}
          <Select label={tr('Darja')} value={level} onChange={(e) => setLevel(e.target.value as TechLevel)} options={LEVELS.map((l) => ({ value: l, label: levelOf(l) }))} />
          <Select label={tr('Hunar')} value={skill} onChange={(e) => setSkill(e.target.value)} placeholder={tr('Har kaam')} options={TRADES.map((t) => ({ value: t, label: tradeOf(t) }))} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Kaam ke din')}</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())}
                className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', days.includes(i) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{d}</button>
            ))}
          </div>
          {errors.days && <p className="mt-1 text-[0.8125rem] text-rose-600">{errors.days}</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Aane ka waqt')} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label={tr('Chhutti ka waqt')} type="time" value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end} />
          <Input label={tr('Ek waqt me kitni jobs')} inputMode="numeric" value={maxJobs} onChange={(e) => setMaxJobs(digits(e.target.value).slice(0, 2))} />
        </div>
        <Input label={tr('Kin areas me jata hai')} value={areas} onChange={(e) => setAreas(e.target.value)} placeholder={tr('DHA, Gulberg, Model Town')} hint={tr('Comma laga kar — sahi area wala technician pehle aata hai')} />
        <div className="rounded-xl p-3 ring-1 ring-slate-200">
          <span className="mb-1.5 block text-[0.8125rem] font-semibold text-slate-800">{tr('Commission (bill hui job par)')}</span>
          <div className="flex flex-wrap gap-1.5">
            {COMMISSION.map((c) => (
              <button key={c.value} type="button" aria-pressed={ctype === c.value} onClick={() => setCtype(c.value)}
                className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', ctype === c.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200')}>{c.label}</button>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {['PERCENTAGE', 'BOTH'].includes(ctype) && <Input label={tr('Kaam ka %')} inputMode="decimal" value={pct} onChange={(e) => setPct(money(e.target.value))} error={errors.pct} hint={tr('Visit + labour par, parts par nahi')} />}
            {['FIXED', 'BOTH'].includes(ctype) && <Input label={tr('Har job (Rs)')} inputMode="decimal" value={fixed} onChange={(e) => setFixed(money(e.target.value))} />}
            <Input label={tr('Mahana tankhwah (Rs)')} inputMode="decimal" value={salary} onChange={(e) => setSalary(money(e.target.value))} hint={tr('Payroll HR se hota hai')} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('CNIC')} value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" hint={tr('Marzi hai')} />
          <Input label={tr('Bike / gaari number')} value={vehicle} onChange={(e) => setVehicle(e.target.value.toUpperCase())} hint={tr('Marzi hai')} />
        </div>
      </form>
    </Modal>
  );
}
