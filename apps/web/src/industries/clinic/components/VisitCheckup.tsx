/**
 * The doctor's side of a visit: vitals taken at the desk, then complaint,
 * examination, diagnosis, advice and the follow-up date. One Save (Ctrl+S)
 * stores both; vitals outside normal ranges are marked as they are typed.
 */

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, CalendarClock, ClipboardList, Save } from 'lucide-react';
import { Button, Card, Input, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { AptDetail } from '../api/appointments.api';
import { encountersApi, type Encounter } from '../api/encounters.api';
import { vitalsApi, type Vitals } from '../api/vitals.api';
import { apiError, dayKey, shortDate } from '../lib/meta';

type VitalKey = 'bpSystolic' | 'bpDiastolic' | 'pulseRate' | 'temperatureF' | 'spo2' | 'respiratoryRate' | 'weightKg' | 'heightCm' | 'bloodSugar';
const VITALS: Array<{ k: VitalKey; label: string; unit: string; ok: [number, number] }> = [
  { k: 'bpSystolic', label: 'BP upar', unit: 'mmHg', ok: [90, 140] },
  { k: 'bpDiastolic', label: 'BP neeche', unit: 'mmHg', ok: [60, 90] },
  { k: 'pulseRate', label: 'Pulse', unit: '/min', ok: [60, 100] },
  { k: 'temperatureF', label: 'Bukhar', unit: '°F', ok: [97, 99.5] },
  { k: 'spo2', label: 'SpO2', unit: '%', ok: [95, 100] },
  { k: 'respiratoryRate', label: 'Saans', unit: '/min', ok: [12, 20] },
  { k: 'weightKg', label: 'Wazan', unit: 'kg', ok: [0, 500] },
  { k: 'heightCm', label: 'Qad', unit: 'cm', ok: [0, 300] },
  { k: 'bloodSugar', label: 'Sugar', unit: 'mg/dL', ok: [70, 180] },
];

type NoteKey = 'subjective' | 'objective' | 'provisionalDiagnosis' | 'finalDiagnosis' | 'advice' | 'followUpAdvice' | 'referredTo';
const FOLLOW = [3, 5, 7, 14, 30];

export function VisitCheckup({ apt, canEdit, onSaved }: { apt: AptDetail; canEdit: boolean; onSaved: () => void }) {
  const [v, setV] = useState<Record<VitalKey, string>>(() => Object.fromEntries(VITALS.map(({ k }) => [k, apt.vitals?.[k] != null ? String(apt.vitals[k]) : ''])) as Record<VitalKey, string>);
  const e0 = apt.encounter;
  const [n, setN] = useState<Record<NoteKey, string>>({
    subjective: e0?.subjective ?? apt.chiefComplaint ?? '', objective: e0?.objective ?? '', provisionalDiagnosis: e0?.provisionalDiagnosis ?? '',
    finalDiagnosis: e0?.finalDiagnosis ?? '', advice: e0?.advice ?? '', followUpAdvice: e0?.followUpAdvice ?? '', referredTo: e0?.referredTo ?? '',
  });
  const [follow, setFollow] = useState(e0?.followUpDate ? e0.followUpDate.slice(0, 10) : '');
  const setNote = (k: NoteKey, val: string) => setN((x) => ({ ...x, [k]: val }));

  const vitalsChanged = VITALS.some(({ k }) => v[k] !== (apt.vitals?.[k] != null ? String(apt.vitals[k]) : ''));
  const bad = (k: VitalKey) => { const x = Number(v[k]); const r = VITALS.find((y) => y.k === k)!.ok; return v[k] !== '' && Number.isFinite(x) && (x < r[0] || x > r[1]); };

  const save = useMutation({
    mutationFn: async () => {
      if (vitalsChanged) {
        const body: Partial<Vitals> = {};
        for (const { k } of VITALS) (body as Record<string, number | null>)[k] = v[k] === '' ? null : Number(v[k]);
        await vitalsApi.record(apt.id, body);
      }
      const body: Partial<Encounter> = { ...Object.fromEntries(Object.entries(n).map(([k, val]) => [k, val.trim() || null])), followUpDate: follow || undefined } as Partial<Encounter>;
      if (!follow && e0?.followUpDate) (body as Record<string, unknown>).followUpDate = null;
      return encountersApi.upsert(apt.id, body);
    },
    onSuccess: () => { toast.success('Checkup save ho gaya'); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const wrong = VITALS.find(({ k }) => v[k] !== '' && !Number.isFinite(Number(v[k])));
    if (wrong) { toast.error(`${wrong.label}: sirf number likhein`); return; }
    save.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]"
      onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
      <Card title={<span className="inline-flex items-center gap-1.5"><Activity className="h-4 w-4 text-brand-600" />Vitals</span>} description={apt.vitals ? `Liye: ${shortDate(apt.vitals.recordedAt)}` : 'Desk par nurse likhe'}>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-5 sm:pb-5">
          {VITALS.map(({ k, label, unit }) => (
            <Input key={k} label={label} inputMode="decimal" size="sm" value={v[k]} disabled={!canEdit}
              onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))} rightIcon={<span className="text-[0.6875rem] text-slate-400">{unit}</span>}
              className={cn(bad(k) && 'bg-rose-50 font-semibold text-rose-700')} />
          ))}
          {apt.vitals?.bmi && <p className="col-span-2 text-[0.8125rem] text-slate-600">BMI: <b>{apt.vitals.bmi}</b></p>}
        </div>
      </Card>

      <Card title={<span className="inline-flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-brand-600" />Checkup</span>} description="Jo yahan likhein wohi nuskhe par chhapta hai"
        actions={canEdit && <Button type="submit" size="sm" loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>Save (Ctrl+S)</Button>}>
        <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 sm:pb-5">
          <Textarea label="Shikayat (history)" rows={3} value={n.subjective} disabled={!canEdit} onChange={(e) => setNote('subjective', e.target.value)} placeholder="3 din se bukhar, sir dard…" />
          <Textarea label="Muaina (examination)" rows={3} value={n.objective} disabled={!canEdit} onChange={(e) => setNote('objective', e.target.value)} placeholder="Gala surkh, chest clear…" />
          <Input label="Andaza (provisional diagnosis)" value={n.provisionalDiagnosis} disabled={!canEdit} onChange={(e) => setNote('provisionalDiagnosis', e.target.value)} placeholder="Viral fever" />
          <Input label="Diagnosis (final)" value={n.finalDiagnosis} disabled={!canEdit} onChange={(e) => setNote('finalDiagnosis', e.target.value)} placeholder="Typhoid" hint="Nuskhe aur mareez ki history me yahi dikhta hai" />
          <Textarea label="Hidayat" rows={2} value={n.advice} disabled={!canEdit} onChange={(e) => setNote('advice', e.target.value)} placeholder="Pani zyada piyen, aaram karein" wrapperClassName="sm:col-span-2" />
          <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><CalendarClock className="h-4 w-4 text-brand-600" />Dobara kab aayein</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {FOLLOW.map((d) => {
                const key = dayKey(new Date(Date.now() + d * 86_400_000));
                return (
                  <button key={d} type="button" disabled={!canEdit} onClick={() => setFollow(follow === key ? '' : key)}
                    className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-semibold ring-1', follow === key ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{d} din</button>
                );
              })}
              <Input aria-label="Follow-up tareekh" type="date" size="sm" value={follow} disabled={!canEdit} onChange={(e) => setFollow(e.target.value)} wrapperClassName="w-40" />
              {follow && <button type="button" onClick={() => setFollow('')} className="text-[0.75rem] font-semibold text-rose-600">Hatayein</button>}
            </div>
            <Input wrapperClassName="mt-2" aria-label="Follow-up note" size="sm" value={n.followUpAdvice} disabled={!canEdit} onChange={(e) => setNote('followUpAdvice', e.target.value)} placeholder="Report le kar aayein" />
          </div>
          <Input label="Refer kiya (kahan)" value={n.referredTo} disabled={!canEdit} onChange={(e) => setNote('referredTo', e.target.value)} placeholder="Mayo Hospital, cardiologist" />
        </div>
      </Card>
    </form>
  );
}
