/**
 * Asked at the counter before a narcotic / controlled medicine goes on the
 * bill: who prescribed it and who it is for. The answer is written on the
 * bill line, where the narcotic register reads it.
 */

import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { doctorsApi, type Doctor } from '../api/doctors.api';
import { formatCnic, type RxDetails } from '../lib/meta';

export function RxDetailsModal({ medicine, initial, onConfirm, onClose }: {
  medicine: string;
  initial?: Partial<RxDetails>;
  onConfirm: (d: RxDetails) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<RxDetails>({ doctorName: '', doctorRegNumber: '', patientName: '', patientCnic: '', ...initial });
  const [tried, setTried] = useState(false);
  const { data: doctors = [] } = useQuery({
    queryKey: ['pharmacy-doctors', 'active'],
    queryFn: () => doctorsApi.list({ isActive: true }).catch(() => [] as Doctor[]),
    staleTime: 5 * 60_000,
  });
  const set = (k: keyof RxDetails, v: string) => setD((x) => ({ ...x, [k]: v }));
  const pickDoctor = (name: string) => {
    const doc = doctors.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
    setD((x) => ({ ...x, doctorName: name, ...(doc && { doctorRegNumber: doc.registrationNumber }) }));
  };
  const errors = {
    doctorName: d.doctorName.trim().length < 2 ? 'Doctor ka naam likhein' : undefined,
    patientName: d.patientName.trim().length < 2 ? 'Mareez ka naam likhein' : undefined,
    patientCnic: d.patientCnic && d.patientCnic.replace(/\D/g, '').length !== 13 ? 'CNIC 13 hindsay ka hota hai' : undefined,
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (Object.values(errors).some(Boolean)) return;
    onConfirm(d);
  };

  return (
    <Modal open onClose={onClose} size="md" title={<span className="inline-flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-rose-600" />Register ke liye nuskha</span>}
      description={`${medicine} controlled dawai hai — doctor aur mareez ka naam register me likha jayega.`}
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Wapas</Button><Button type="submit" form="rx-details">Bill me daalein</Button></div>}>
      <form id="rx-details" onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Doctor ka naam" required autoFocus list="rx-doctors" value={d.doctorName} onChange={(e) => pickDoctor(e.target.value)}
            error={tried ? errors.doctorName : undefined} hint="Directory wale doctor ka PMDC khud aa jata hai" />
          <datalist id="rx-doctors">{doctors.map((x) => <option key={x.id} value={x.name}>{x.registrationNumber}</option>)}</datalist>
          <Input label="PMDC number" value={d.doctorRegNumber} onChange={(e) => set('doctorRegNumber', e.target.value)} placeholder="12345-P" hint="Nuskhe par likha hota hai" />
          <Input label="Mareez ka naam" required value={d.patientName} onChange={(e) => set('patientName', e.target.value)}
            error={tried ? errors.patientName : undefined} />
          <Input label="Mareez ka CNIC" inputMode="numeric" value={d.patientCnic} onChange={(e) => set('patientCnic', formatCnic(e.target.value))}
            placeholder="35202-1234567-1" error={tried ? errors.patientCnic : undefined} hint="Narcotic ke liye zaroor likhein" />
        </div>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Isi bill ki agli controlled dawai par yahi naam khud lag jayenge.</p>
      </form>
    </Modal>
  );
}
