/**
 * Lab order forms: a new order (tests from the clinic's price list or typed
 * in) and the results sheet (sample taken, result per test with unit and
 * normal range, abnormal mark), used on the visit page and the Lab page.
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FlaskConical, Plus, Printer, Trash2 } from 'lucide-react';
import { Button, Input, Modal, Segmented, Select, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { COMMON_TESTS, URGENCY_LEVELS } from '../api/constants';
import { doctorsApi } from '../api/doctors.api';
import { labOrdersApi, type LabOrder } from '../api/lab-orders.api';
import type { Patient } from '../api/patients.api';
import { clinicServicesApi } from '../api/services.api';
import { apiError, drName, r2 } from '../lib/meta';
import { printLabReport } from '../lib/print';
import { PatientPicker } from './PatientPicker';

interface TestDraft { testName: string; price: string }

export function NewLabOrderModal({ patient: fixedPatient, doctorId: fixedDoctor, encounterId, onClose, onSaved }: {
  patient?: Patient | null;
  doctorId?: string;
  encounterId?: string;
  onClose: () => void;
  onSaved: (o: LabOrder) => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(fixedPatient ?? null);
  const [doctorId, setDoctorId] = useState(fixedDoctor ?? '');
  const [tests, setTests] = useState<TestDraft[]>([]);
  const [custom, setCustom] = useState('');
  const [labName, setLabName] = useState('');
  const [urgency, setUrgency] = useState<string>('ROUTINE');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  const { data: doctors = [] } = useQuery({ queryKey: ['clinic-doctors', 'active'], queryFn: () => doctorsApi.list({ active: 'true' }), enabled: !fixedDoctor });
  const { data: priced = [] } = useQuery({
    queryKey: ['clinic-services', 'lab-prices'],
    queryFn: async () => (await clinicServicesApi.list({ active: true })).filter((s) => ['LAB_TEST', 'IMAGING', 'DIAGNOSTIC'].includes(s.category)),
    staleTime: 5 * 60_000,
  });
  const priceOf = (name: string) => priced.find((s) => (s.product?.name ?? s.name ?? '').toLowerCase() === name.toLowerCase())?.basePrice;
  const choices = [...new Set([...priced.map((s) => (s.product?.name ?? s.name) as string).filter(Boolean), ...COMMON_TESTS])];
  const has = (n: string) => tests.some((t) => t.testName.toLowerCase() === n.toLowerCase());
  const toggle = (n: string) => setTests((x) => (has(n) ? x.filter((t) => t.testName.toLowerCase() !== n.toLowerCase()) : [...x, { testName: n, price: String(priceOf(n) ?? '') }]));
  const total = r2(tests.reduce((s, t) => s + (Number(t.price) || 0), 0));

  const errors = {
    patient: !patient ? 'Mareez chunein' : undefined,
    doctor: !doctorId ? 'Doctor chunein' : undefined,
    tests: !tests.length ? 'Kam se kam ek test chunein' : tests.some((t) => Number(t.price) < 0) ? 'Rate manfi nahi' : undefined,
  };
  const save = useMutation({
    mutationFn: () => labOrdersApi.create({
      patientId: patient!.id, doctorId, encounterId, labName: labName.trim() || undefined, urgency, notes: notes.trim() || undefined,
      tests: tests.map((t) => ({ testName: t.testName.trim(), price: r2(Number(t.price) || 0) })),
    }),
    onSuccess: (o) => { toast.success(`${o.orderNumber} ban gaya`); onSaved(o); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title="Naya lab order" description="Test chunein; rate clinic ki price list se aata hai, badal bhi sakte hain"
      footer={<div className="flex items-center justify-between gap-2"><span className="text-[0.875rem]">Kul: <b className="tabular-nums">{formatPKR(total)}</b></span>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="lab-form" loading={save.isPending}>Save (Ctrl+S)</Button></div></div>}>
      <form id="lab-form" onSubmit={submit} className="space-y-4"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        {!fixedPatient && <PatientPicker value={patient} onChange={setPatient} error={tried ? errors.patient : undefined} />}
        {!fixedDoctor && (
          <Select label="Doctor" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Kis doctor ne likha" error={tried ? errors.doctor : undefined}
            options={doctors.map((d) => ({ value: d.id, label: drName(d) }))} />
        )}
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Test</span>
          <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
            {choices.map((n) => (
              <button key={n} type="button" onClick={() => toggle(n)} aria-pressed={has(n)}
                className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', has(n) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{n}</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input aria-label="Apna test" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Koi aur test likhein" wrapperClassName="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom.trim() && !has(custom.trim())) { toggle(custom.trim()); setCustom(''); } } }} />
            <Button variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { if (custom.trim() && !has(custom.trim())) { toggle(custom.trim()); setCustom(''); } }}>Jorein</Button>
          </div>
        </div>
        {tests.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
            {tests.map((t, i) => (
              <li key={t.testName} className="flex items-center gap-2 px-3 py-2">
                <FlaskConical className="h-4 w-4 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium">{t.testName}</span>
                <Input aria-label="Rate" inputMode="decimal" size="sm" value={t.price} placeholder="Rate" wrapperClassName="w-28"
                  onChange={(e) => setTests((x) => x.map((y, j) => (j === i ? { ...y, price: e.target.value } : y)))} />
                <button type="button" aria-label="Hatayein" onClick={() => setTests((x) => x.filter((_, j) => j !== i))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
        {tried && errors.tests && <p className="text-xs font-medium text-rose-600">{errors.tests}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Lab ka naam" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Apni lab ya Chughtai, Excel…" hint="Bahar bheja ho to us lab ka naam" />
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitni jaldi</span>
            <Segmented<string> value={urgency} onChange={setUrgency} label="Kitni jaldi" items={URGENCY_LEVELS.map((u) => ({ value: u.value, label: u.label }))} />
          </div>
        </div>
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Khaali pait, subah 8 baje…" />
      </form>
    </Modal>
  );
}

interface ResultDraft { result: string; unit: string; referenceRange: string; isAbnormal: boolean; isCritical: boolean }

export function LabResultsModal({ order, patient, doctor, onClose, onSaved }: {
  order: LabOrder;
  patient?: Parameters<typeof printLabReport>[1];
  doctor?: Parameters<typeof printLabReport>[2];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Record<string, ResultDraft>>(() => Object.fromEntries(order.tests.map((t) => [t.id!, {
    result: t.result ?? '', unit: t.unit ?? '', referenceRange: t.referenceRange ?? '', isAbnormal: !!t.isAbnormal, isCritical: !!t.isCritical,
  }])));
  const [by, setBy] = useState(order.tests.find((t) => t.performedBy)?.performedBy ?? '');
  const set = (id: string, patch: Partial<ResultDraft>) => setRows((x) => ({ ...x, [id]: { ...x[id], ...patch } }));

  const status = useMutation({
    mutationFn: (s: LabOrder['status']) => labOrdersApi.updateStatus(order.id, s),
    onSuccess: () => { toast.success('Status badal gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const save = useMutation({
    mutationFn: async () => {
      const changed = order.tests.filter((t) => rows[t.id!].result.trim() && (rows[t.id!].result !== (t.result ?? '') || rows[t.id!].unit !== (t.unit ?? '') || rows[t.id!].referenceRange !== (t.referenceRange ?? '') || rows[t.id!].isAbnormal !== !!t.isAbnormal || rows[t.id!].isCritical !== !!t.isCritical || by !== (t.performedBy ?? '')));
      for (const t of changed) {
        const r = rows[t.id!];
        await labOrdersApi.recordResult(t.id!, { result: r.result.trim(), unit: r.unit.trim() || undefined, referenceRange: r.referenceRange.trim() || undefined, isAbnormal: r.isAbnormal, isCritical: r.isCritical, performedBy: by.trim() || undefined });
      }
      return changed.length;
    },
    onSuccess: (n) => { toast.success(n ? `${n} result save` : 'Kuch nahi badla'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const filled = { ...order, tests: order.tests.map((t) => ({ ...t, ...rows[t.id!], performedBy: by || t.performedBy })) };

  return (
    <Modal open onClose={onClose} size="xl" title={`${order.orderNumber} — results`} description="Har test ka result, unit aur normal range; ghair-mamooli ko nishan lagayein"
      footer={<div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {order.status === 'ORDERED' && <Button variant="secondary" loading={status.isPending} onClick={() => status.mutate('SAMPLE_COLLECTED')}>Sample le liya</Button>}
          <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => void printLabReport(filled, patient, doctor)}>Report print</Button>
        </div>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="lab-results" loading={save.isPending}>Save (Ctrl+S)</Button></div>
      </div>}>
      <form id="lab-results" onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        {order.tests.map((t) => {
          const r = rows[t.id!];
          return (
            <div key={t.id} className={cn('rounded-xl p-3 ring-1', r.isCritical ? 'bg-rose-50 ring-rose-200' : r.isAbnormal ? 'bg-amber-50 ring-amber-200' : 'ring-slate-200')}>
              <p className="mb-2 text-[0.9375rem] font-semibold text-slate-900">{t.testName}</p>
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1.4fr]">
                <Input aria-label="Result" value={r.result} onChange={(e) => set(t.id!, { result: e.target.value })} placeholder="Result" />
                <Input aria-label="Unit" value={r.unit} onChange={(e) => set(t.id!, { unit: e.target.value })} placeholder="Unit (mg/dL)" />
                <Input aria-label="Normal range" value={r.referenceRange} onChange={(e) => set(t.id!, { referenceRange: e.target.value })} placeholder="Normal (70–110)" />
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                <Switch size="sm" checked={r.isAbnormal} onChange={(e) => set(t.id!, { isAbnormal: e.target.checked })} label="Ghair-mamooli (H/L)" />
                <Switch size="sm" checked={r.isCritical} onChange={(e) => set(t.id!, { isCritical: e.target.checked })} label="Critical (doctor ko foran batayein)" />
              </div>
            </div>
          );
        })}
        <Input label="Test kis ne kiya" value={by} onChange={(e) => setBy(e.target.value)} placeholder="Lab technician ka naam" />
      </form>
    </Modal>
  );
}
