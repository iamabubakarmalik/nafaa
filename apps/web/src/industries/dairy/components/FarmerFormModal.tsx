/** New or edited gawala: who, where, rate per litre, fat bonus and payment cycle. Ctrl+S saves. */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { farmersApi, type BillingCycle, type DairyFarmer, type FarmerInput } from '../api/farmers.api';
import { CYCLE, DAIRY_KEYS, cnicOk, errorText, numIn, phoneOk } from '../lib/meta';

export function FarmerFormModal({ farmer, onClose }: { farmer?: DairyFarmer; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: farmer?.name ?? '', fatherName: farmer?.fatherName ?? '', phone: farmer?.phone ?? '', cnic: farmer?.cnic ?? '',
    village: farmer?.village ?? '', address: farmer?.address ?? '', ratePerLiter: farmer?.ratePerLiter ? String(farmer.ratePerLiter) : '',
    fatBonusRate: farmer?.fatBonusRate ? String(farmer.fatBonusRate) : '', paymentCycle: (farmer?.paymentCycle ?? 'WEEKLY') as BillingCycle,
    buffaloCount: farmer?.buffaloCount ? String(farmer.buffaloCount) : '', cowCount: farmer?.cowCount ? String(farmer.cowCount) : '',
    notes: farmer?.notes ?? '', isActive: farmer?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const save = useMutation({
    mutationFn: () => {
      const body: Partial<FarmerInput> = {
        name: f.name.trim(), fatherName: f.fatherName.trim() || undefined, phone: f.phone.trim() || undefined, cnic: f.cnic.trim() || undefined,
        village: f.village.trim() || undefined, address: f.address.trim() || undefined, ratePerLiter: numIn(f.ratePerLiter) ?? 0,
        fatBonusRate: numIn(f.fatBonusRate) ?? 0, paymentCycle: f.paymentCycle, notes: f.notes.trim() || undefined,
        buffaloCount: numIn(f.buffaloCount) != null ? Math.round(numIn(f.buffaloCount)!) : undefined,
        cowCount: numIn(f.cowCount) != null ? Math.round(numIn(f.cowCount)!) : undefined,
        ...(farmer && { isActive: f.isActive }),
      };
      return farmersApi.save(farmer?.id, body);
    },
    onSuccess: (r) => {
      [DAIRY_KEYS.farmers, DAIRY_KEYS.farmer, 'dairy-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(farmer ? 'Gawala save' : `${r.name} jur gaye — ${r.farmerNumber}`);
      onClose();
    },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Naam likhein';
    if (!phoneOk(f.phone)) e.phone = 'Phone 10 se 15 hindse';
    if (!cnicOk(f.cnic)) e.cnic = 'CNIC 13 hindse';
    if (!((numIn(f.ratePerLiter) ?? 0) > 0)) e.ratePerLiter = 'Ek liter ka rate likhein';
    if ((numIn(f.fatBonusRate) ?? 0) < 0) e.fatBonusRate = 'Bonus manfi nahi ho sakta';
    setErrors(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return; }
    save.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={farmer ? `${farmer.name} — badlein` : 'Naya gawala'}
      description="Rate har entry par khud lagta hai; kisi din alag ho to entry par badal sakte hain"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naam *" autoFocus value={f.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
          <Input label="Walid ka naam" value={f.fatherName} onChange={(e) => set({ fatherName: e.target.value })} />
          <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} error={errors.phone} />
          <Input label="CNIC" value={f.cnic} onChange={(e) => set({ cnic: e.target.value })} error={errors.cnic} placeholder="35202-1234567-1" />
          <Input label="Gaon" value={f.village} onChange={(e) => set({ village: e.target.value })} />
          <Input label="Pata" value={f.address} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Rate (ek liter) *" inputMode="decimal" value={f.ratePerLiter} onChange={(e) => set({ ratePerLiter: e.target.value })} error={errors.ratePerLiter} />
          <Input label="Fat bonus (har point)" inputMode="decimal" value={f.fatBonusRate} onChange={(e) => set({ fatBonusRate: e.target.value })} error={errors.fatBonusRate} hint="6% se upar har point par, ek liter" />
          <Select label="Payment kab" value={f.paymentCycle} onChange={(e) => set({ paymentCycle: e.target.value as BillingCycle })} options={Object.entries(CYCLE).map(([value, label]) => ({ value, label }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Bhainsen" inputMode="numeric" value={f.buffaloCount} onChange={(e) => set({ buffaloCount: e.target.value })} />
          <Input label="Gayen" inputMode="numeric" value={f.cowCount} onChange={(e) => set({ cowCount: e.target.value })} />
        </div>
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
        {farmer && <Switch checked={f.isActive} onChange={(e) => set({ isActive: e.target.checked })} label="Chalu hai" description="Band gawale ki nayi entry nahi hoti; hisaab rehta hai" />}
      </form>
    </Modal>
  );
}
