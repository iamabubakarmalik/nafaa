/**
 * Add or edit a field technician: contact, area, what he can fit or repair,
 * visit rate and commission. Turning one off keeps his old jobs and pay.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { Button, Input, Modal, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { techniciansApi, type Technician } from '../api/technicians.api';
import type { ApplianceCategoryType } from '../api/products.api';
import { CATEGORY_META, TECH_KEY, apiError, cnicOk, digits, money, phoneOk } from './meta';

const SKILLS: Array<{ label: string; types: ApplianceCategoryType[] }> = [
  { label: 'AC', types: ['AIR_CONDITIONER_SPLIT', 'AIR_CONDITIONER_INVERTER', 'AIR_CONDITIONER_WINDOW'] },
  { label: 'Fridge / freezer', types: ['REFRIGERATOR', 'DEEP_FREEZER'] },
  { label: 'Washing machine', types: ['WASHING_MACHINE_TOP_LOAD', 'WASHING_MACHINE_FRONT_LOAD', 'WASHING_MACHINE_TWIN_TUB'] },
  { label: 'TV / LED', types: ['LED_TV', 'SMART_TV'] },
  { label: 'Geyser', types: ['GEYSER_ELECTRIC', 'GEYSER_GAS'] },
  { label: 'Kitchen', types: ['MICROWAVE_OVEN', 'GAS_STOVE', 'CHIMNEY'] },
  { label: 'Solar / UPS', types: ['SOLAR_PANEL', 'SOLAR_INVERTER', 'UPS'] },
];
const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Jumma', 'Hafta'];

export function TechnicianForm({ tech, onClose }: { tech?: Technician | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(tech?.employeeCode ?? `T-${String(Date.now()).slice(-4)}`);
  const [name, setName] = useState(tech?.name ?? '');
  const [phone, setPhone] = useState(tech?.phone ?? '');
  const [cnic, setCnic] = useState(tech?.cnic ?? '');
  const [address, setAddress] = useState(tech?.address ?? '');
  const [zone, setZone] = useState(tech?.currentZone ?? '');
  const [cats, setCats] = useState<ApplianceCategoryType[]>(tech?.categoriesExpertise ?? []);
  const [brands, setBrands] = useState((tech?.brandsExpertise ?? []).join(', '));
  const [years, setYears] = useState(tech?.experienceYears != null ? String(tech.experienceYears) : '');
  const [days, setDays] = useState<number[]>(tech?.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const [start, setStart] = useState(tech?.workStartTime ?? '09:00');
  const [end, setEnd] = useState(tech?.workEndTime ?? '18:00');
  const [visit, setVisit] = useState(tech ? String(Number(tech.visitChargeRate) || '') : '');
  const [commission, setCommission] = useState(tech ? String(Number(tech.commissionPct) || '') : '');
  const [active, setActive] = useState(tech?.isActive ?? true);
  const [notes, setNotes] = useState(tech?.notes ?? '');
  const [tried, setTried] = useState(false);

  const errors = {
    code: code.trim() ? undefined : 'Code likhein',
    name: name.trim().length < 2 ? 'Naam likhein' : undefined,
    phone: phoneOk(phone) ? undefined : 'Sahi mobile number (03xx-xxxxxxx)',
    cnic: cnicOk(cnic) ? undefined : 'CNIC 13 hindse',
    commission: Number(commission) > 100 ? '100% se zyada nahi' : undefined,
  };
  const bad = Object.values(errors).some(Boolean);
  const has = (s: (typeof SKILLS)[number]) => s.types.every((t) => cats.includes(t));
  const toggle = (s: (typeof SKILLS)[number]) => setCats(has(s) ? cats.filter((c) => !s.types.includes(c)) : [...new Set([...cats, ...s.types])]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        employeeCode: code.trim(), name: name.trim(), phone: phone.trim(), cnic: cnic.trim() || undefined, address: address.trim() || undefined,
        currentZone: zone.trim() || undefined, categoriesExpertise: cats, brandsExpertise: brands.split(',').map((b) => b.trim()).filter(Boolean),
        experienceYears: years ? Number(years) : undefined, workingDays: days, workStartTime: start, workEndTime: end,
        visitChargeRate: Number(visit) || 0, commissionPct: Number(commission) || 0, isActive: active, notes: notes.trim() || undefined,
      };
      return tech ? techniciansApi.update(tech.id, body) : techniciansApi.create(body);
    },
    onSuccess: () => { toast.success(tech ? 'Technician update' : 'Technician jur gaya'); qc.invalidateQueries({ queryKey: [TECH_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title={tech ? `${tech.name} — badlein` : 'Naya technician'} description="Fitting aur repair par jane wala banda"
      footer={<>
        {tried && bad && <span className="mr-auto text-[0.8125rem] text-rose-700">Laal khane theek karein</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} leftIcon={<UserPlus className="h-4 w-4" />}>Save (Ctrl+S)</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr]">
          <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} error={tried ? errors.code : undefined} hint="Apna number" />
          <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Imran" error={tried ? errors.name : undefined} />
          <Input label="Phone" required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" error={tried || phone ? errors.phone : undefined} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="CNIC" value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" error={errors.cnic} hint="Marzi hai" />
          <Input label="Ilaqa" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Johar Town" hint="Qareeb ke kaam isi ko" />
          <Input label="Tajurba (saal)" inputMode="numeric" value={years} onChange={(e) => setYears(digits(e.target.value))} />
        </div>
        <Input label="Ghar ka pata" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kya kaam karta hai</span>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => <button key={s.label} type="button" aria-pressed={has(s)} onClick={() => toggle(s)} className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', has(s) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{s.label}</button>)}
          </div>
          {cats.length > 0 && <p className="mt-1 text-[0.75rem] text-slate-500">{cats.map((c) => CATEGORY_META[c]?.label ?? c).join(', ')}</p>}
        </div>
        <Input label="Brands" value={brands} onChange={(e) => setBrands(e.target.value)} placeholder="Haier, Gree, Dawlance" hint="Comma laga kar" />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam ke din</span>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={days.includes(i)} onClick={() => setDays(days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort())} className={cn('h-9 rounded-lg px-3 text-[0.8125rem] ring-1', days.includes(i) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{d}</button>)}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Shuru" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          <Input label="Chhutti" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          <Input label="Visit rate" inputMode="decimal" value={visit} onChange={(e) => setVisit(money(e.target.value))} placeholder="1000" />
          <Input label="Commission %" inputMode="decimal" value={commission} onChange={(e) => setCommission(money(e.target.value))} placeholder="10" error={errors.commission} hint="Har mukammal kaam ke bill par" />
        </div>
        <Switch checked={active} onChange={(e) => setActive(e.target.checked)} label="Active" description="Band ho to naye kaam me nahi aata; purana record rehta hai" />
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
    </Modal>
  );
}
