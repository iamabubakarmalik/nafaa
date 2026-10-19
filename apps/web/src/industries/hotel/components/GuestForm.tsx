/** Guest profile form (new and edit) in a dialog; Ctrl+S saves. */

import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { guestsApi, type HotelGuest } from '../api/guests.api';
import { ID_TYPES, apiError, cnicOk, formatCnic, phoneOk } from './meta';

export function GuestForm({ guest, onClose, onDone }: { guest: HotelGuest | null; onClose: () => void; onDone: (g: HotelGuest) => void }) {
  const [f, setF] = useState({
    firstName: guest?.firstName ?? '', lastName: guest?.lastName ?? '', phone: guest?.phone ?? '', altPhone: guest?.altPhone ?? '', email: guest?.email ?? '',
    idType: guest?.idType ?? 'CNIC', idNumber: guest?.idNumber ?? '', nationality: guest?.nationality ?? 'Pakistani', city: guest?.city ?? '', address: guest?.address ?? '',
    companyName: guest?.companyName ?? '', designation: guest?.designation ?? '', gender: guest?.gender ?? '', specialRequests: guest?.specialRequests ?? '', notes: guest?.notes ?? '',
    isVIP: guest?.isVIP ?? false,
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const errors = {
    firstName: !f.firstName.trim() ? 'Naam likhein' : null,
    phone: !phoneOk(f.phone) ? 'Phone sahi likhein (kam az kam 10 hindse)' : null,
    idNumber: f.idNumber.trim() && f.idType === 'CNIC' && !cnicOk(f.idNumber) ? 'CNIC 13 hindson ka hota hai' : null,
  };
  const first = Object.values(errors).find(Boolean);
  const go = useMutation({
    mutationFn: () => {
      const body = { ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: f.phone.trim(), idNumber: f.idNumber.trim(), gender: f.gender || undefined };
      return guest ? guestsApi.update(guest.id, body) : guestsApi.create(body);
    },
    onSuccess: (g) => { toast.success(guest ? 'Guest save ho gaya' : `${g.fullName} jur gaya (${g.guestNumber})`); onDone(g); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!first) go.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const err = (k: keyof typeof errors) => (tried ? errors[k] ?? undefined : undefined);
  return (
    <Modal open onClose={onClose} size="lg" title={guest ? `${guest.fullName} badlein` : 'Naya guest'} description="Ctrl+S se save"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={go.isPending} onClick={submit}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input data-autofocus label="Naam" required value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={err('firstName')} />
        <Input label="Khandani naam" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} />
        <Input label="Phone" required inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} error={err('phone')} placeholder="0300 1234567" />
        <Input label="Doosra phone" inputMode="tel" value={f.altPhone} onChange={(e) => set('altPhone', e.target.value)} />
        <Select label="ID" value={f.idType} onChange={(e) => set('idType', e.target.value)} options={ID_TYPES.map((t) => ({ value: t.id, label: t.label }))} />
        <Input label="ID number" value={f.idNumber} onChange={(e) => set('idNumber', f.idType === 'CNIC' ? formatCnic(e.target.value) : e.target.value.toUpperCase())} error={err('idNumber')} hint="Police record ke liye" placeholder="35202-1234567-1" />
        <Input label="Shehar" value={f.city} onChange={(e) => set('city', e.target.value)} />
        <Input label="Qaumiyat" value={f.nationality} onChange={(e) => set('nationality', e.target.value)} />
        <Input wrapperClassName="sm:col-span-2" label="Pata" value={f.address} onChange={(e) => set('address', e.target.value)} />
        <Input label="Company" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} hint="Company ke guest — bookings me nazar aata hai" />
        <Input label="Ohda" value={f.designation} onChange={(e) => set('designation', e.target.value)} />
        <Select label="Jins" value={f.gender} onChange={(e) => set('gender', e.target.value)} options={[{ value: '', label: '—' }, { value: 'MALE', label: 'Mard' }, { value: 'FEMALE', label: 'Aurat' }]} />
        <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        <Textarea wrapperClassName="sm:col-span-2" rows={2} label="Pasand / farmaish" value={f.specialRequests} onChange={(e) => set('specialRequests', e.target.value)} placeholder="Neeche wali manzil, bina mirch ka khana…" />
        <Textarea wrapperClassName="sm:col-span-2" rows={2} label="Andar ka note" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        <Switch checked={f.isVIP} onChange={(e) => set('isVIP', e.target.checked)} label="VIP guest" description="List me sitara lagta hai" />
      </div>
    </Modal>
  );
}
