/**
 * Specialty records on the patient page: dental chart entries (switched off,
 * never deleted), antenatal visits and physio sessions. Each list has an
 * "add" dialog with checked inputs and Ctrl+S.
 */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, Input, Modal, Select, Skeleton, Table, TBody, THead, Td, Th, Tr, Textarea } from '@/design-system/components';
import { doctorsApi } from '../api/doctors.api';
import { specialtyApi } from '../api/specialty.api';
import { apiError, dayBounds, dayKey, drName, shortDate } from '../lib/meta';

const TOOTH_CONDITIONS = ['Caries (keera)', 'Filling', 'Root canal', 'Crown', 'Missing', 'Extraction', 'Scaling', 'Bridge', 'Implant', 'Sensitive', 'Healthy'];

/** Form dialog shared by the three record types. */
function RecordModal({ title, busy, onClose, onSubmit, children }: { title: string; busy: boolean; onClose: () => void; onSubmit: () => void; children: ReactNode }) {
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit(); };
  return (
    <Modal open onClose={onClose} size="lg" title={title}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="record-form" loading={busy}>Save (Ctrl+S)</Button></div>}>
      <form id="record-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-3"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        {children}
      </form>
    </Modal>
  );
}

function Header({ text, canAdd, onAdd }: { text: string; canAdd: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-4 sm:px-5">
      <p className="text-[0.8125rem] text-slate-500">{text}</p>
      {canAdd && <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={onAdd}>Naya</Button>}
    </div>
  );
}

const Loading = () => <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>;
const useDoctors = () => useQuery({ queryKey: ['clinic-doctors', 'active'], queryFn: () => doctorsApi.list({ active: 'true' }) }).data ?? [];
const numOrUndef = (v: string) => (v.trim() === '' ? undefined : Number(v));

export function DentalRecords({ patientId, canManage }: { patientId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const doctors = useDoctors();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ toothNumber: '', condition: '', surface: '', treatment: '', doctorId: '', notes: '', performedAt: dayKey() });
  const [tried, setTried] = useState(false);
  const q = useQuery({ queryKey: ['clinic-dental', patientId], queryFn: () => specialtyApi.dental(patientId) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['clinic-dental', patientId] });
  const tooth = Number(f.toothNumber);
  const errors = {
    toothNumber: !f.toothNumber.trim() ? 'Daant ka number' : !(tooth >= 11 && tooth <= 85 && tooth % 10 >= 1 && tooth % 10 <= 8) ? 'FDI number (11–48, bachay 51–85)' : undefined,
    condition: !f.condition.trim() ? 'Halat likhein' : undefined,
  };
  const add = useMutation({
    mutationFn: () => specialtyApi.addDental({
      patientId, toothNumber: f.toothNumber.trim(), condition: f.condition.trim(), surface: f.surface.trim() || undefined, treatment: f.treatment.trim() || undefined,
      doctorId: f.doctorId || undefined, notes: f.notes.trim() || undefined, performedAt: dayBounds(f.performedAt).from,
    }),
    onSuccess: () => { toast.success(`Daant ${f.toothNumber} likh diya`); setAdding(false); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const off = useMutation({
    mutationFn: (id: string) => specialtyApi.removeDental(id),
    onSuccess: () => { toast.success('Entry hata di — record me mehfooz hai'); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const open = () => { setF({ toothNumber: '', condition: '', surface: '', treatment: '', doctorId: doctors[0]?.id ?? '', notes: '', performedAt: dayKey() }); setTried(false); setAdding(true); };
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div>
      {adding && (
        <RecordModal title="Daant ka record" busy={add.isPending} onClose={() => setAdding(false)}
          onSubmit={() => { setTried(true); if (!Object.values(errors).some(Boolean)) add.mutate(); }}>
          <Input label="Daant no. (FDI)" required autoFocus inputMode="numeric" value={f.toothNumber} onChange={(e) => set('toothNumber', e.target.value)} placeholder="36" error={tried ? errors.toothNumber : undefined} />
          <Input label="Halat" required list="tooth-conditions" value={f.condition} onChange={(e) => set('condition', e.target.value)} placeholder="Caries" error={tried ? errors.condition : undefined} />
          <datalist id="tooth-conditions">{TOOTH_CONDITIONS.map((c) => <option key={c} value={c} />)}</datalist>
          <Input label="Surface" value={f.surface} onChange={(e) => set('surface', e.target.value)} placeholder="O, M, D…" />
          <Input label="Ilaaj" value={f.treatment} onChange={(e) => set('treatment', e.target.value)} placeholder="Composite filling" wrapperClassName="sm:col-span-2" />
          <Input label="Tareekh" type="date" value={f.performedAt} onChange={(e) => set('performedAt', e.target.value || dayKey())} />
          <Select label="Doctor" value={f.doctorId} onChange={(e) => set('doctorId', e.target.value)} placeholder="—" options={doctors.map((d) => ({ value: d.id, label: drName(d) }))} />
          <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} wrapperClassName="sm:col-span-2" />
        </RecordModal>
      )}
      <Header text="Har daant ka halat aur ilaaj (FDI numbering)" canAdd={canManage} onAdd={open} />
      {q.isLoading ? <Loading /> : !q.data?.length ? <EmptyState title="Daant ka koi record nahi" /> : (
        <Table minWidth="40rem">
          <THead><Tr><Th>Daant</Th><Th>Halat</Th><Th>Ilaaj</Th><Th>Tareekh</Th><Th align="right" /></Tr></THead>
          <TBody>
            {q.data.map((r) => (
              <Tr key={r.id}>
                <Td><Badge variant="info">{r.toothNumber}</Badge>{r.surface && <span className="ml-1 text-[0.75rem] text-slate-500">{r.surface}</span>}</Td>
                <Td className="font-medium text-slate-900">{r.condition}</Td>
                <Td>{r.treatment ?? '—'}{r.notes && <p className="max-w-xs truncate text-[0.75rem] text-slate-500">{r.notes}</p>}</Td>
                <Td className="whitespace-nowrap">{shortDate(r.performedAt)}<p className="text-[0.75rem] text-slate-500">{drName(doctors.find((d) => d.id === r.doctorId))}</p></Td>
                <Td align="right">{canManage && <button type="button" onClick={() => off.mutate(r.id)} title="Hatayein" aria-label="Hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export function AncRecords({ patientId, canManage }: { patientId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const blank = { gestationWeeks: '', weightKg: '', bpSystolic: '', bpDiastolic: '', fundalHeightCm: '', fetalHeartRate: '', fetalPosition: '', urineProtein: '', edema: '', advice: '', nextVisitDate: '', visitDate: dayKey() };
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  const q = useQuery({ queryKey: ['clinic-anc', patientId], queryFn: () => specialtyApi.anc(patientId) });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const range = (v: string, min: number, max: number) => (v.trim() !== '' && !(Number(v) >= min && Number(v) <= max) ? `${min}–${max}` : undefined);
  const errors = {
    gestationWeeks: range(f.gestationWeeks, 0, 45), weightKg: range(f.weightKg, 20, 250), bpSystolic: range(f.bpSystolic, 50, 260),
    bpDiastolic: range(f.bpDiastolic, 30, 180), fetalHeartRate: range(f.fetalHeartRate, 60, 220), fundalHeightCm: range(f.fundalHeightCm, 0, 60),
  };
  const add = useMutation({
    mutationFn: () => specialtyApi.addAnc({
      patientId,
      gestationWeeks: numOrUndef(f.gestationWeeks), weightKg: numOrUndef(f.weightKg), bpSystolic: numOrUndef(f.bpSystolic), bpDiastolic: numOrUndef(f.bpDiastolic),
      fundalHeightCm: numOrUndef(f.fundalHeightCm), fetalHeartRate: numOrUndef(f.fetalHeartRate), fetalPosition: f.fetalPosition.trim() || undefined,
      urineProtein: f.urineProtein.trim() || undefined, edema: f.edema.trim() || undefined, advice: f.advice.trim() || undefined,
      nextVisitDate: f.nextVisitDate ? dayBounds(f.nextVisitDate).from : undefined, visitDate: dayBounds(f.visitDate).from,
    }),
    onSuccess: () => { toast.success('ANC visit likh di'); setAdding(false); qc.invalidateQueries({ queryKey: ['clinic-anc', patientId] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  return (
    <div>
      {adding && (
        <RecordModal title="Hamal ki visit (ANC)" busy={add.isPending} onClose={() => setAdding(false)}
          onSubmit={() => { setTried(true); if (!Object.values(errors).some(Boolean)) add.mutate(); }}>
          <Input label="Hafte" inputMode="numeric" autoFocus value={f.gestationWeeks} onChange={(e) => set('gestationWeeks', e.target.value)} placeholder="24" error={err('gestationWeeks')} />
          <Input label="Wazan (kg)" inputMode="decimal" value={f.weightKg} onChange={(e) => set('weightKg', e.target.value)} error={err('weightKg')} />
          <Input label="Tareekh" type="date" value={f.visitDate} onChange={(e) => set('visitDate', e.target.value || dayKey())} />
          <Input label="BP upar" inputMode="numeric" value={f.bpSystolic} onChange={(e) => set('bpSystolic', e.target.value)} placeholder="120" error={err('bpSystolic')} />
          <Input label="BP neeche" inputMode="numeric" value={f.bpDiastolic} onChange={(e) => set('bpDiastolic', e.target.value)} placeholder="80" error={err('bpDiastolic')} />
          <Input label="Bachay ki dhadkan" inputMode="numeric" value={f.fetalHeartRate} onChange={(e) => set('fetalHeartRate', e.target.value)} placeholder="140" error={err('fetalHeartRate')} />
          <Input label="Fundal height (cm)" inputMode="decimal" value={f.fundalHeightCm} onChange={(e) => set('fundalHeightCm', e.target.value)} error={err('fundalHeightCm')} />
          <Input label="Bachay ki position" value={f.fetalPosition} onChange={(e) => set('fetalPosition', e.target.value)} placeholder="Cephalic" />
          <Input label="Urine protein" value={f.urineProtein} onChange={(e) => set('urineProtein', e.target.value)} placeholder="Nil, +, ++" />
          <Input label="Sujan" value={f.edema} onChange={(e) => set('edema', e.target.value)} placeholder="Nahi" />
          <Input label="Agli visit" type="date" value={f.nextVisitDate} onChange={(e) => set('nextVisitDate', e.target.value)} />
          <Textarea label="Mashwara" rows={2} value={f.advice} onChange={(e) => set('advice', e.target.value)} wrapperClassName="sm:col-span-3" />
        </RecordModal>
      )}
      <Header text="Hamal ke dauran har visit: hafte, BP, wazan, bachay ki dhadkan" canAdd={canManage} onAdd={() => { setF(blank); setTried(false); setAdding(true); }} />
      {q.isLoading ? <Loading /> : !q.data?.length ? <EmptyState title="Koi ANC visit nahi" /> : (
        <Table minWidth="48rem">
          <THead><Tr><Th>Visit</Th><Th align="right">Hafte</Th><Th align="right">BP</Th><Th align="right">Wazan</Th><Th align="right">Dhadkan</Th><Th>Mashwara</Th></Tr></THead>
          <TBody>
            {q.data.map((v) => (
              <Tr key={v.id}>
                <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">#{v.visitNumber} · {shortDate(v.visitDate)}</p>{v.nextVisitDate && <p className="text-[0.75rem] text-slate-500">Agli: {shortDate(v.nextVisitDate)}</p>}</Td>
                <Td align="right">{v.gestationWeeks ?? '—'}</Td>
                <Td align="right">{v.bpSystolic ? `${v.bpSystolic}/${v.bpDiastolic ?? '-'}` : '—'}</Td>
                <Td align="right">{v.weightKg ? `${v.weightKg} kg` : '—'}</Td>
                <Td align="right">{v.fetalHeartRate ?? '—'}</Td>
                <Td className="max-w-xs truncate">{v.advice ?? '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}

export function PhysioRecords({ patientId, canManage }: { patientId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const doctors = useDoctors();
  const [adding, setAdding] = useState(false);
  const blank = { therapistId: '', painScore: '', durationMin: '', totalSessionsPrescribed: '', modalitiesUsed: '', exercisesPerformed: '', progressNotes: '', homeExercises: '', nextSessionDate: '', sessionDate: dayKey() };
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  const q = useQuery({ queryKey: ['clinic-physio', patientId], queryFn: () => specialtyApi.physio(patientId) });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const errors = {
    therapistId: !f.therapistId ? 'Therapist chunein' : undefined,
    painScore: f.painScore.trim() !== '' && !(Number.isInteger(Number(f.painScore)) && Number(f.painScore) >= 0 && Number(f.painScore) <= 10) ? '0–10' : undefined,
    durationMin: f.durationMin.trim() !== '' && !(Number(f.durationMin) > 0) ? 'Minute likhein' : undefined,
  };
  const split = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
  const add = useMutation({
    mutationFn: () => specialtyApi.addPhysio({
      patientId, therapistId: f.therapistId, painScore: numOrUndef(f.painScore), durationMin: numOrUndef(f.durationMin),
      totalSessionsPrescribed: numOrUndef(f.totalSessionsPrescribed), modalitiesUsed: split(f.modalitiesUsed), exercisesPerformed: split(f.exercisesPerformed),
      progressNotes: f.progressNotes.trim() || undefined, homeExercises: f.homeExercises.trim() || undefined,
      nextSessionDate: f.nextSessionDate ? dayBounds(f.nextSessionDate).from : undefined, sessionDate: dayBounds(f.sessionDate).from,
    }),
    onSuccess: () => { toast.success('Session likh diya'); setAdding(false); qc.invalidateQueries({ queryKey: ['clinic-physio', patientId] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const err = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  return (
    <div>
      {adding && (
        <RecordModal title="Physio session" busy={add.isPending} onClose={() => setAdding(false)}
          onSubmit={() => { setTried(true); if (!Object.values(errors).some(Boolean)) add.mutate(); }}>
          <Select label="Therapist" required value={f.therapistId} onChange={(e) => set('therapistId', e.target.value)} placeholder="Chunein" options={doctors.map((d) => ({ value: d.id, label: drName(d) }))} error={err('therapistId')} />
          <Input label="Dard (0–10)" inputMode="numeric" autoFocus value={f.painScore} onChange={(e) => set('painScore', e.target.value)} error={err('painScore')} />
          <Input label="Minute" inputMode="numeric" value={f.durationMin} onChange={(e) => set('durationMin', e.target.value)} placeholder="30" error={err('durationMin')} />
          <Input label="Machine / ilaaj" value={f.modalitiesUsed} onChange={(e) => set('modalitiesUsed', e.target.value)} placeholder="TENS, Heat" hint="Comma laga kar" wrapperClassName="sm:col-span-2" />
          <Input label="Kul sessions" inputMode="numeric" value={f.totalSessionsPrescribed} onChange={(e) => set('totalSessionsPrescribed', e.target.value)} placeholder="10" />
          <Input label="Exercise" value={f.exercisesPerformed} onChange={(e) => set('exercisesPerformed', e.target.value)} placeholder="Knee extension, SLR" hint="Comma laga kar" wrapperClassName="sm:col-span-2" />
          <Input label="Tareekh" type="date" value={f.sessionDate} onChange={(e) => set('sessionDate', e.target.value || dayKey())} />
          <Textarea label="Farq / progress" rows={2} value={f.progressNotes} onChange={(e) => set('progressNotes', e.target.value)} wrapperClassName="sm:col-span-2" />
          <Input label="Agla session" type="date" value={f.nextSessionDate} onChange={(e) => set('nextSessionDate', e.target.value)} />
          <Textarea label="Ghar ki exercise" rows={2} value={f.homeExercises} onChange={(e) => set('homeExercises', e.target.value)} wrapperClassName="sm:col-span-3" />
        </RecordModal>
      )}
      <Header text="Har session: dard, ilaaj, exercise aur farq" canAdd={canManage} onAdd={() => { setF({ ...blank, therapistId: doctors[0]?.id ?? '' }); setTried(false); setAdding(true); }} />
      {q.isLoading ? <Loading /> : !q.data?.length ? <EmptyState title="Koi physio session nahi" /> : (
        <Table minWidth="48rem">
          <THead><Tr><Th>Session</Th><Th align="right">Dard</Th><Th>Ilaaj</Th><Th>Farq</Th><Th>Therapist</Th></Tr></THead>
          <TBody>
            {q.data.map((s) => (
              <Tr key={s.id}>
                <Td className="whitespace-nowrap"><p className="font-semibold text-slate-900">#{s.sessionNumber}{s.totalSessionsPrescribed ? ` / ${s.totalSessionsPrescribed}` : ''} · {shortDate(s.sessionDate)}</p>{s.durationMin && <p className="text-[0.75rem] text-slate-500">{s.durationMin} min</p>}</Td>
                <Td align="right">{s.painScore ?? '—'}</Td>
                <Td className="max-w-xs"><p className="truncate">{s.modalitiesUsed.join(', ') || '—'}</p>{Array.isArray(s.exercisesPerformed) && s.exercisesPerformed.length > 0 && <p className="truncate text-[0.75rem] text-slate-500">{s.exercisesPerformed.join(', ')}</p>}</Td>
                <Td className="max-w-xs truncate">{s.progressNotes ?? '—'}</Td>
                <Td>{drName(doctors.find((d) => d.id === s.therapistId)) || '—'}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
