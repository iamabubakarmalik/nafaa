/**
 * Register or edit a patient. Name is enough to start; phone, age and
 * gender are asked first because reception needs them for the token. The
 * patient also becomes a customer, so khata and bills follow them.
 */

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ShieldPlus } from 'lucide-react';
import { Button, Input, Modal, Segmented, Select, Switch, Textarea } from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { panelsApi } from '../api/panels.api';
import { patientsApi, type Patient, type PatientInput } from '../api/patients.api';
import { BLOOD_GROUPS, GENDERS, apiError, formatCnic } from '../lib/meta';

interface Draft {
  fullName: string; phonePrimary: string; gender: string; ageYears: string; dateOfBirth: string; fatherOrHusbandName: string; cnic: string;
  bloodGroup: string; allergies: string; chronicConditions: string; currentMedications: string; address: string; city: string;
  emergencyContactName: string; emergencyContactPhone: string; hasInsurance: boolean; insuranceProvider: string; insuranceNumber: string; panelId: string; notes: string;
}

const fromPatient = (p: Patient | null, name = ''): Draft => ({
  fullName: p?.fullName ?? name, phonePrimary: p?.phonePrimary ?? '', gender: p?.gender ?? '', ageYears: '', dateOfBirth: p?.dateOfBirth?.slice(0, 10) ?? '',
  fatherOrHusbandName: p?.fatherOrHusbandName ?? '', cnic: p?.cnic ?? '', bloodGroup: p?.bloodGroup ?? '', allergies: (p?.allergies ?? []).join(', '),
  chronicConditions: (p?.chronicConditions ?? []).join(', '), currentMedications: (p?.currentMedications ?? []).join(', '), address: p?.address ?? '', city: p?.city ?? '',
  emergencyContactName: p?.emergencyContactName ?? '', emergencyContactPhone: p?.emergencyContactPhone ?? '', hasInsurance: !!p?.hasInsurance,
  insuranceProvider: p?.insuranceProvider ?? '', insuranceNumber: p?.insuranceNumber ?? '', panelId: p?.panelId ?? '', notes: p?.notes ?? '',
});

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

export function PatientFormModal({ patient, initialName, onClose, onSaved }: {
  patient: Patient | null;
  initialName?: string;
  onClose: () => void;
  onSaved: (p: Patient) => void;
}) {
  const [d, setD] = useState<Draft>(() => fromPatient(patient, /^\d/.test(initialName ?? '') ? '' : initialName));
  const [tried, setTried] = useState(false);
  const [more, setMore] = useState(!!patient);
  const [dupOk, setDupOk] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const canSeePanels = usePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const { data: panels } = useQuery({ queryKey: ['clinic-panels', 'active'], queryFn: () => panelsApi.list(), enabled: canSeePanels });
  const panelOptions = panels?.items ?? [];

  const phone = d.phonePrimary.replace(/\D/g, '');
  const errors: Partial<Record<keyof Draft, string>> = {
    fullName: d.fullName.trim().length < 2 ? 'Mareez ka naam likhein' : undefined,
    phonePrimary: phone && (phone.length < 10 || phone.length > 13) ? 'Phone 03xx-xxxxxxx' : undefined,
    cnic: d.cnic && d.cnic.replace(/\D/g, '').length !== 13 ? 'CNIC 13 hindsay ka hota hai' : undefined,
    ageYears: d.ageYears && !(Number(d.ageYears) >= 0 && Number(d.ageYears) <= 130) ? 'Umar sahi likhein' : undefined,
    dateOfBirth: d.dateOfBirth && new Date(d.dateOfBirth) > new Date() ? 'Aage ki tareekh nahi' : undefined,
  };

  const panelNext = d.hasInsurance ? d.panelId : '';
  const save = useMutation({
    mutationFn: () => {
      // Editing sends empty text so a cleared field is cleared; a new record leaves it out.
      const opt = (v: string) => (patient ? v.trim() : v.trim() || undefined);
      const pick = (v: string) => (v || (patient ? '' : undefined));
      const body: PatientInput = {
        fullName: d.fullName.trim(), phonePrimary: patient ? phone : phone || undefined, gender: pick(d.gender) as Patient['gender'],
        ...(d.dateOfBirth ? { dateOfBirth: d.dateOfBirth } : d.ageYears ? { ageYears: d.ageYears } : {}),
        fatherOrHusbandName: opt(d.fatherOrHusbandName), cnic: opt(d.cnic), bloodGroup: pick(d.bloodGroup) as Patient['bloodGroup'],
        allergies: list(d.allergies), chronicConditions: list(d.chronicConditions), currentMedications: list(d.currentMedications),
        address: opt(d.address), city: opt(d.city), emergencyContactName: opt(d.emergencyContactName),
        emergencyContactPhone: opt(d.emergencyContactPhone), hasInsurance: d.hasInsurance,
        insuranceProvider: opt(d.insuranceProvider), insuranceNumber: opt(d.insuranceNumber), notes: opt(d.notes),
        // Sent only when changed, so a record on a panel that was switched off still saves.
        ...(panelNext !== (patient?.panelId ?? '') && { panelId: panelNext || null }),
        ...(dupOk && { allowDuplicate: true }),
      };
      return patient ? patientsApi.update(patient.id, body) : patientsApi.create(body);
    },
    onSuccess: (p) => { toast.success(patient ? 'Record update ho gaya' : `${p.fullName} registered — ${p.mrn}`); onSaved(p); },
    onError: (e) => {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 409 && !patient) setDupOk(true);
      toast.error(apiError(e));
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    save.mutate();
  };
  const err = (k: keyof Draft) => (tried ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="lg" title={patient ? `${patient.fullName} — record badlein` : 'Naya mareez'}
      description={patient ? `${patient.mrn} · khata aur bill isi naam se` : 'Naam kaafi hai; phone se agli dafa foran mil jata hai'}
      footer={<div className="flex items-center justify-between gap-2">
        {!more ? <button type="button" onClick={() => setMore(true)} className="text-[0.8125rem] font-semibold text-brand-700">+ Mazeed (CNIC, allergy, panel…)</button> : <span />}
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="patient-form" loading={save.isPending}>{dupOk ? 'Phir bhi save karein' : 'Save (Ctrl+S)'}</Button></div>
      </div>}>
      <form id="patient-form" onSubmit={submit} className="grid gap-3 sm:grid-cols-2"
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); e.currentTarget.requestSubmit(); } }}>
        <Input label="Naam" required autoFocus value={d.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Saima Bibi" error={err('fullName')} />
        <Input label="Phone" inputMode="tel" value={d.phonePrimary} onChange={(e) => set('phonePrimary', e.target.value)} placeholder="03xx-xxxxxxx" error={err('phonePrimary')} hint="Isi se agli dafa dhoondein" />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Jins</span>
          <Segmented<string> value={d.gender} onChange={(v) => set('gender', v)} label="Jins" items={GENDERS.map((g) => ({ value: g.value, label: g.label }))} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Umar (saal)" inputMode="numeric" value={d.ageYears} onChange={(e) => set('ageYears', e.target.value)} placeholder="34" disabled={!!d.dateOfBirth} error={err('ageYears')} />
          <Input label="Ya paidaish" type="date" value={d.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} error={err('dateOfBirth')} />
        </div>
        <Input label="Walid / shohar ka naam" value={d.fatherOrHusbandName} onChange={(e) => set('fatherOrHusbandName', e.target.value)} />
        <Input label="Allergy" value={d.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="Penicillin, Sulfa" hint="Comma laga kar; nuskhe par laal likhi aati hai" leftIcon={<AlertTriangle className="h-4 w-4 text-rose-500" />} />
        {more && (
          <>
            <Input label="CNIC" inputMode="numeric" value={d.cnic} onChange={(e) => set('cnic', formatCnic(e.target.value))} placeholder="35202-1234567-1" error={err('cnic')} />
            <Select label="Blood group" value={d.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)} placeholder="Maloom nahi" options={BLOOD_GROUPS.map((b) => ({ value: b.value, label: b.label }))} />
            <Input label="Purani bimari" value={d.chronicConditions} onChange={(e) => set('chronicConditions', e.target.value)} placeholder="Sugar, BP" hint="Comma laga kar" />
            <Input label="Jo dawai chal rahi hai" value={d.currentMedications} onChange={(e) => set('currentMedications', e.target.value)} placeholder="Metformin 500" />
            <Input label="Pata" value={d.address} onChange={(e) => set('address', e.target.value)} />
            <Input label="Shehar" value={d.city} onChange={(e) => set('city', e.target.value)} />
            <Input label="Emergency rabta" value={d.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} placeholder="Naam" />
            <Input label="Emergency phone" inputMode="tel" value={d.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
            <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <Switch checked={d.hasInsurance} onChange={(e) => set('hasInsurance', e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><ShieldPlus className="h-4 w-4 text-brand-600" />Panel / insurance wala mareez</span>}
                description="Company ka naam aur card number — fees khata me rakh kar company se wasool karein" />
              {d.hasInsurance && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {panelOptions.length > 0 && (
                    <Select label="Panel (company khata)" value={d.panelId} wrapperClassName="sm:col-span-2"
                      onChange={(e) => { const id = e.target.value; setD((x) => ({ ...x, panelId: id, insuranceProvider: x.insuranceProvider || (panelOptions.find((o) => o.id === id)?.name ?? '') })); }}
                      options={[{ value: '', label: 'Koi nahi — mareez khud deta hai' }, ...panelOptions.map((o) => ({ value: o.id, label: o.name }))]}
                      hint="Panel chunein to fees company ke khata me jati hai" />
                  )}
                  <Input label="Company / panel" value={d.insuranceProvider} onChange={(e) => set('insuranceProvider', e.target.value)} placeholder="State Life, Sehat Card…" />
                  <Input label="Card number" value={d.insuranceNumber} onChange={(e) => set('insuranceNumber', e.target.value)} />
                </div>
              )}
            </div>
            <Textarea label="Note" rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} wrapperClassName="sm:col-span-2" />
          </>
        )}
      </form>
    </Modal>
  );
}
