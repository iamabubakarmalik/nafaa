/**
 * Add or change one measurement record (naap) of a customer: the profile
 * name (own kameez, child's frock…), unit, the numbers grouped as a tailor
 * takes them, and fitting notes. Opened from the measurements page and from
 * a new stitching order.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ruler } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Modal, Segmented, Switch, Textarea } from '@/design-system/components';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { measurementsApi, type MeasureField, type MeasurementInput, type MeasurementProfile } from '../api/measurements.api';
import { CustomerField, emptyCustomer, type CustomerValue } from './fields';
import { MEASURE_KEY, MEASURE_LABELS, apiError, opt } from './meta';

const GROUPS: Array<{ title: string; fields: MeasureField[] }> = [
  { title: 'Upar (kameez / shirt)', fields: ['neck', 'shoulder', 'chest', 'bust', 'waist', 'hip', 'armhole', 'bicep', 'wrist', 'sleeveLength', 'shirtLength', 'kurtaLength', 'daman'] },
  { title: 'Neeche (shalwar / pant)', fields: ['shalwarLength', 'shalwarBottom', 'trouserLength', 'inseam', 'thigh', 'knee', 'bottom'] },
];
const NAMES = ['Default', 'Kameez shalwar', 'Pant shirt', 'Waistcoat', 'Bachay ka'];

type Nums = Partial<Record<MeasureField, string>>;

export function MeasurementModal({ profile, customer: fixed, onClose, onSaved }: {
  /** Existing record to change; left out, a new one. */
  profile?: MeasurementProfile | null;
  /** Customer chosen already (from an order). */
  customer?: CustomerValue;
  onClose: () => void;
  onSaved?: (m: MeasurementProfile) => void;
}) {
  const qc = useQueryClient();
  const [customer, setCustomer] = useState<CustomerValue>(fixed ?? emptyCustomer);
  const [name, setName] = useState(profile?.profileName ?? 'Default');
  const [unit, setUnit] = useState<'INCH' | 'CM'>(profile?.unit ?? 'INCH');
  const [nums, setNums] = useState<Nums>({});
  const [fitting, setFitting] = useState(profile?.fittingNotes ?? '');
  const [posture, setPosture] = useState(profile?.postureNotes ?? '');
  const [isDefault, setIsDefault] = useState(profile?.isDefault ?? false);

  useEffect(() => {
    if (!profile) return;
    const n: Nums = {};
    for (const g of GROUPS) for (const f of g.fields) if (profile[f] != null) n[f] = String(profile[f]);
    setNums(n);
    if (profile.customer) setCustomer({ customerId: profile.customer.id, name: profile.customer.name, phone: profile.customer.phone ?? '' });
  }, [profile]);

  const filled = Object.values(nums).filter((v) => v && Number(v) > 0).length;
  const bad = Object.entries(nums).find(([, v]) => v !== '' && v !== undefined && !(Number(v) >= 0 && Number(v) <= 300));
  const problem = !customer.customerId && !customer.name.trim() ? 'Customer chunein ya naam likhein'
    : !name.trim() ? 'Naap ka naam likhein'
      : bad ? `${MEASURE_LABELS[bad[0]]}: 0 se 300 tak likhein`
        : filled === 0 ? 'Kam az kam ek naap likhein' : null;

  const save = useMutation({
    mutationFn: async () => {
      if (problem) throw new Error(problem);
      let customerId = customer.customerId;
      // A walk-in gets a customer record so the naap stays with them.
      if (!customerId) customerId = (await customersApi.create({ name: customer.name.trim(), phone: opt(customer.phone) })).id;
      const body: MeasurementInput = { customerId, profileName: name.trim(), unit, fittingNotes: opt(fitting), postureNotes: opt(posture), isDefault };
      for (const g of GROUPS) for (const f of g.fields) { const v = nums[f]; if (v !== undefined && v !== '') body[f] = Number(v); }
      return profile ? measurementsApi.update(profile.id, body) : measurementsApi.create(body);
    },
    onSuccess: (m) => {
      toast.success(profile ? 'Naap badal gaya' : 'Naap save ho gaya');
      qc.invalidateQueries({ queryKey: [MEASURE_KEY] });
      onSaved?.(m);
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Naap save nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="xl" title={profile ? `Naap badlein — ${profile.profileName}` : 'Naya naap'}
      description="Inch ya cm me likhein. Jo naap nahi liya woh khali chhorein."
      footer={<>
        {problem && filled > 0 ? <p className="mr-auto text-[0.8125rem] text-amber-800">{problem}</p> : <p className="mr-auto text-[0.8125rem] text-slate-500">{filled} naap likhe</p>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} disabled={!!problem} onClick={() => save.mutate()} leftIcon={<Ruler className="h-4 w-4" />}>Save karein</Button>
      </>}>
      <div className="space-y-4">
        {!fixed && !profile && <CustomerField value={customer} onChange={setCustomer} />}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <Input label="Naap ka naam" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} hint="Ek customer ke kai naap ho sakte hain — apna, bachay ka, waistcoat ka" />
            <div className="mt-1.5 flex flex-wrap gap-1">
              {NAMES.map((n) => <button key={n} type="button" onClick={() => setName(n)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] font-medium text-slate-700 hover:bg-slate-200">{n}</button>)}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Unit</span>
            <Segmented value={unit} onChange={(v) => setUnit(v as 'INCH' | 'CM')} items={[{ value: 'INCH', label: 'Inch' }, { value: 'CM', label: 'CM' }]} />
          </div>
        </div>
        {GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="mb-2 text-[0.75rem] font-bold uppercase tracking-wide text-slate-500">{g.title}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
              {g.fields.map((f) => (
                <Input key={f} label={MEASURE_LABELS[f]} inputMode="decimal" size="sm" value={nums[f] ?? ''}
                  onChange={(e) => setNums((n) => ({ ...n, [f]: e.target.value.replace(/[^\d.]/g, '') }))}
                  className="text-right tabular-nums" rightIcon={<span className="text-[0.6875rem]">{unit === 'CM' ? 'cm' : 'in'}</span>} />
              ))}
            </div>
          </fieldset>
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <Textarea label="Fitting" value={fitting} onChange={(e) => setFitting(e.target.value)} rows={2} maxLength={2000} placeholder="Dheela pasand hai, collar ban…" hint="Karigar parchi par chhapta hai" />
          <Textarea label="Jism ke baare me" value={posture} onChange={(e) => setPosture(e.target.value)} rows={2} maxLength={2000} placeholder="Ek kandha neecha, pet aage…" hint="Marzi hai" />
        </div>
        <Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} label="Yeh customer ka main naap hai" description="Naye silai order me yahi pehle se chuna hoga" />
      </div>
    </Modal>
  );
}
