/**
 * Changes one staff member's salary before it is saved: days / hours / tasks,
 * overtime, commission, the absent cut, bonuses and deductions with their
 * reasons, how much to pay now and a note. Shows the net pay as it changes.
 */

import { useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { PayLine, RunEdit, RunRow } from '../api/payroll.api';
import { applyEdit } from './calc';
import { SALARY_TYPE, qty } from './meta';

const ADD_CHIPS = ['Eid bonus', 'Inaam', 'Safar / kiraya', 'Khana'];
const CUT_CHIPS = ['Tor phor', 'Udhaar return', 'Late aana', 'Maal kam'];

const toNum = (v: string) => (v.trim() === '' ? undefined : Math.max(0, Number(v) || 0));

export function RowEditModal({ row, edit, canPayCommission, onSave, onClose }: {
  row: RunRow; edit?: RunEdit; canPayCommission: boolean; onSave: (e: RunEdit | undefined) => void; onClose: () => void;
}) {
  const p0 = row.preview;
  const [units, setUnits] = useState(edit?.units != null ? String(edit.units) : '');
  const [overtime, setOvertime] = useState(edit?.overtimePay != null ? String(edit.overtimePay) : '');
  const [skipAbsent, setSkipAbsent] = useState(!!edit?.skipAbsentCut);
  const [commission, setCommission] = useState(edit?.includeCommission !== false);
  const [adds, setAdds] = useState<PayLine[]>(edit?.adds ?? []);
  const [cuts, setCuts] = useState<PayLine[]>(edit?.cuts ?? []);
  const [pay, setPay] = useState(edit?.payAmount != null ? String(edit.payAmount) : '');
  const [note, setNote] = useState(edit?.note ?? '');

  const clean = (l: PayLine[]) => l.filter((x) => x.label.trim() && x.amount > 0).map((x) => ({ label: x.label.trim(), amount: Math.round(x.amount) }));
  const draft: RunEdit = {
    units: toNum(units), overtimePay: toNum(overtime), skipAbsentCut: skipAbsent || undefined,
    includeCommission: commission ? undefined : false, adds: clean(adds), cuts: clean(cuts),
    payAmount: toNum(pay), note: note.trim() || undefined,
  };
  const p = applyEdit(row, draft);
  const variable = p0.unitKind === 'days' || p0.unitKind === 'hours' || p0.unitKind === 'tasks';
  const unit = SALARY_TYPE[row.staff.salaryType].unit;
  const commissionAvailable = canPayCommission && !!row.commission && row.commission.earned > 0 && !row.commission.paidSeparately;
  const badLines = [...adds, ...cuts].some((x) => (x.label.trim() && !(x.amount > 0)) || (!x.label.trim() && x.amount > 0));
  const payTooMuch = draft.payAmount != null && draft.payAmount > p.net;

  const save = () => {
    const empty = draft.units == null && draft.overtimePay == null && !draft.skipAbsentCut && draft.includeCommission == null
      && !draft.adds?.length && !draft.cuts?.length && draft.payAmount == null && !draft.note;
    onSave(empty ? undefined : draft);
    onClose();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`${row.staff.fullName} — tankhwah badlein`}
      description={`${row.staff.designation} · ${SALARY_TYPE[row.staff.salaryType].label} · ${formatPKR(row.staff.baseSalary)}`}
      footer={<>
        <Button variant="ghost" className="mr-auto" onClick={() => { onSave(undefined); onClose(); }}>Sab wapas pehle jaisa</Button>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={save} disabled={badLines || payTooMuch || p.advanceTooBig}>Theek hai</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!badLines && !payTooMuch && !p.advanceTooBig) save(); }}>
        <div className="grid gap-4 sm:grid-cols-2">
          {variable && (
            <Input label={`Kitne ${unit}`} type="number" inputMode="decimal" min={0} value={units} onChange={(e) => setUnits(e.target.value)}
              placeholder={String(p0.units)} hint={`Hazri se ${qty(p0.units, unit)} · rate ${formatPKR(p0.rate)} — khali chhorein to hazri wala`} />
          )}
          <Input label="Overtime (Rs)" type="number" inputMode="numeric" min={0} value={overtime} onChange={(e) => setOvertime(e.target.value)}
            placeholder={String(p0.overtimePay)}
            hint={row.attendance.overtimeHours > 0 ? `${qty(Math.round(row.attendance.overtimeHours * 10) / 10, 'ghante')} × ${formatPKR(p0.hourRate)} — khali to yahi` : 'Hazri me overtime nahi — chahein to amount likhein'} />
          <Input label="Abhi kitna dena hai (Rs)" type="number" inputMode="numeric" min={0} value={pay} onChange={(e) => setPay(e.target.value)}
            placeholder={String(p.net)} error={payTooMuch ? `Banti tankhwah ${formatPKR(p.net)} se zyada nahi` : undefined}
            hint="Khali chhorein to poori. Kam likhein to baqi amount baad me de sakte hain" />
        </div>

        {(p0.absentCut > 0 || commissionAvailable) && (
          <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            {p0.absentCut > 0 && (
              <Switch checked={!skipAbsent} onChange={(e) => setSkipAbsent(!e.target.checked)}
                label={`Ghair hazri ki katauti (${formatPKR(p0.absentCut)})`}
                description={`${qty(p0.absentDays, 'din')} ghair hazir / bina tankhwah chhutti × ${formatPKR(p0.dayRate)} roz. Band karein to poori tankhwah milegi`} />
            )}
            {commissionAvailable && (
              <Switch checked={commission} onChange={(e) => setCommission(e.target.checked)}
                label={`Is mahine ki commission saath dein (${formatPKR(row.commission!.earned)})`}
                description="Commission page par bhi ada likhi jayegi. Band karein to wahan se alag deni hogi" />
            )}
          </div>
        )}

        <Lines title="Bonus / inaam" tone="emerald" icon={Plus} chips={ADD_CHIPS} lines={adds} onChange={setAdds}
          hint="Wajah zaroor likhein — payslip par yahi chhapti hai" />
        <Lines title="Katauti" tone="rose" icon={Minus} chips={CUT_CHIPS} lines={cuts} onChange={setCuts}
          hint="Advance khud kat jata hai — yahan sirf koi aur katauti" />

        <Textarea label="Note (marzi se)" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Masalan: 3 din ki chhutti approve thi" hint="Payslip aur record par dikhega" />

        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-2xl bg-white p-3 text-[0.8125rem] ring-1 ring-slate-200 sm:grid-cols-3">
          <Fact k="Asal tankhwah" v={formatPKR(p.basePay)} />
          <Fact k="+ Overtime" v={formatPKR(p.overtimePay)} />
          <Fact k="+ Commission" v={formatPKR(p.commission)} />
          <Fact k="+ Bonus" v={formatPKR(p.bonuses)} />
          <Fact k="− Ghair hazri" v={formatPKR(p.absentCut)} />
          <Fact k="− Advance" v={formatPKR(p.advance)} />
          <Fact k="− Katauti" v={formatPKR(p.otherCuts)} />
          <div className="col-span-2 flex items-baseline justify-between border-t border-slate-100 pt-2 sm:col-span-3">
            <dt className="font-semibold text-slate-700">Haath me (net)</dt>
            <dd className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(p.net)}</dd>
          </div>
        </dl>
        {p.advanceTooBig && <p className="rounded-xl bg-rose-50 px-3 py-2 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">Advance ki qist ({formatPKR(p.advance)}) baqi tankhwah se zyada hai. Bonus jorein ya Advance tab se advance cancel karke kam qist me dein.</p>}
        <button type="submit" hidden aria-hidden />
      </form>
    </Modal>
  );
}

function Lines({ title, tone, icon: Icon, chips, lines, onChange, hint }: {
  title: string; tone: 'emerald' | 'rose'; icon: typeof Plus; chips: string[]; lines: PayLine[]; onChange: (l: PayLine[]) => void; hint: string;
}) {
  const set = (i: number, patch: Partial<PayLine>) => onChange(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.8125rem] font-medium text-slate-700">{title}</p>
        <Button size="sm" variant="ghost" leftIcon={<Icon className="h-4 w-4" />} onClick={() => onChange([...lines, { label: '', amount: 0 }])} disabled={lines.length >= 12}>Line</Button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button key={c} type="button" onClick={() => onChange([...lines, { label: c, amount: 0 }])} disabled={lines.length >= 12}
            className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition', tone === 'emerald' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100')}>
            + {c}
          </button>
        ))}
      </div>
      {lines.length > 0 && (
        <ul className="mt-2 space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2">
              <Input aria-label="Wajah" wrapperClassName="flex-1" value={l.label} maxLength={60} placeholder="Wajah" onChange={(e) => set(i, { label: e.target.value })} />
              <Input aria-label="Amount" wrapperClassName="w-32" type="number" inputMode="numeric" min={0} value={l.amount ? String(l.amount) : ''} placeholder="Amount"
                onChange={(e) => set(i, { amount: Number(e.target.value) || 0 })} />
              <button type="button" aria-label="Hatayein" onClick={() => onChange(lines.filter((_, j) => j !== i))} className="mt-2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium tabular-nums text-slate-900">{v}</dd></div>;
}
