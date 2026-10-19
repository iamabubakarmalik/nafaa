/**
 * Adds or changes a customer's vehicle: number plate, company/model/year,
 * owner (linked to the khata by phone), meter, and paper dates (insurance,
 * token tax, fitness) that drive the reminders.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, Select, Textarea } from '@/design-system/components';
import type { CustomerVehicle, FuelType, VehicleInput } from '../api/customer-vehicles.api';
import { vehicleMakesApi } from '../api/vehicle-makes.api';
import { vehicleModelsApi, type VehicleType } from '../api/vehicle-models.api';
import { FUEL, MAKES_KEY, MODELS_KEY, VEHICLE_TYPES, digits, plate, vehicleTypeOf } from './meta';

const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function VehicleFormModal({ vehicle, pending, onSave, onClose }: {
  vehicle?: CustomerVehicle | null;
  pending: boolean;
  onSave: (v: VehicleInput) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    reg: vehicle?.registrationNumber ?? '', makeId: vehicle?.makeId ?? '', makeName: vehicle?.makeName ?? '', modelId: vehicle?.modelId ?? '', modelName: vehicle?.modelName ?? '',
    type: (vehicle?.vehicleType as VehicleType) ?? 'CAR', year: vehicle?.year ? String(vehicle.year) : '', color: vehicle?.color ?? '', fuel: vehicle?.fuelType ?? 'PETROL',
    odometer: vehicle?.odometerKm ? String(vehicle.odometerKm) : '', owner: vehicle?.ownerName ?? '', phone: vehicle?.ownerPhone ?? '', cnic: vehicle?.ownerCnic ?? '',
    chassis: vehicle?.chassisNumber ?? '', engine: vehicle?.engineNumber ?? '', insurer: vehicle?.insuranceProvider ?? '', insurance: day(vehicle?.insuranceExpiry),
    token: day(vehicle?.tokenTaxExpiry), fitness: day(vehicle?.fitnessExpiry), notes: vehicle?.notes ?? '',
  });
  const [touched, setTouched] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const makes = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: [MODELS_KEY, f.makeId], queryFn: () => vehicleModelsApi.list({ makeId: f.makeId, active: true }), enabled: !!f.makeId, staleTime: 5 * 60_000 });

  const errors: Record<string, string> = {};
  if (plate(f.reg).length < 3) errors.reg = 'Gaari ka number likhein';
  if (f.year && (Number(f.year) < 1950 || Number(f.year) > new Date().getFullYear() + 1)) errors.year = 'Saal sahi likhein';
  if (f.phone && digits(f.phone).length < 10) errors.phone = 'Phone poora likhein';
  const err = (k: string) => (touched ? errors[k] : undefined);

  const submit = () => {
    setTouched(true);
    if (Object.keys(errors).length || pending) return;
    const t = (v: string) => v.trim() || undefined;
    const keep = (v: string) => (vehicle ? v.trim() : t(v));
    onSave({
      registrationNumber: plate(f.reg), makeId: t(f.makeId), makeName: t(f.makeName), modelId: t(f.modelId), modelName: t(f.modelName), vehicleType: f.type,
      year: f.year ? Number(f.year) : undefined, color: keep(f.color), fuelType: f.fuel as FuelType, odometerKm: f.odometer ? Number(f.odometer) : undefined,
      ownerName: keep(f.owner), ownerPhone: keep(f.phone), ownerCnic: keep(f.cnic), chassisNumber: keep(f.chassis), engineNumber: keep(f.engine),
      insuranceProvider: keep(f.insurer), insuranceExpiry: vehicle ? f.insurance : t(f.insurance), tokenTaxExpiry: vehicle ? f.token : t(f.token),
      fitnessExpiry: vehicle ? f.fitness : t(f.fitness), notes: keep(f.notes),
    });
  };

  return (
    <Modal open onClose={onClose} size="lg" title={vehicle ? `Gaari badlein — ${vehicle.registrationNumber}` : 'Nayi gaari darj karein'}
      description="Malik ka phone likhein to gaari us ke khata se jur jati hai"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={pending}>{vehicle ? 'Save' : 'Darj karein'}</Button>
      </>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Gaari ka number" required value={f.reg} onChange={(e) => set({ reg: e.target.value.toUpperCase() })} autoFocus placeholder="LEA-1234" error={err('reg')} />
          <Select label="Gaari ki type" value={f.type} onChange={(e) => set({ type: e.target.value as VehicleType })} options={VEHICLE_TYPES.map((v) => ({ value: v, label: vehicleTypeOf(v) }))} />
          <Select label="Fuel" value={f.fuel} onChange={(e) => set({ fuel: e.target.value as FuelType })} options={FUEL} />
          <Select label="Company" value={f.makeId} placeholder={f.makeName && !f.makeId ? f.makeName : 'Chunein'}
            onChange={(e) => set({ makeId: e.target.value, makeName: makes.data?.find((m) => m.id === e.target.value)?.name ?? '', modelId: '', modelName: '' })}
            options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <Select label="Model" value={f.modelId} disabled={!f.makeId} placeholder={f.modelName && !f.modelId ? f.modelName : 'Chunein'}
            onChange={(e) => { const m = models.data?.find((x) => x.id === e.target.value); set({ modelId: e.target.value, modelName: m?.name ?? '', ...(m && { type: m.vehicleType }) }); }}
            options={(models.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
          <Input label="Saal" inputMode="numeric" value={f.year} onChange={(e) => set({ year: digits(e.target.value).slice(0, 4) })} placeholder="2016" error={err('year')} />
          <Input label="Rang" value={f.color} onChange={(e) => set({ color: e.target.value })} placeholder="Safed" />
          <Input label="Meter (km)" inputMode="numeric" value={f.odometer} onChange={(e) => set({ odometer: digits(e.target.value) })} placeholder="84500" />
          <Input label="Chassis number" value={f.chassis} onChange={(e) => set({ chassis: e.target.value.toUpperCase() })} hint="Marzi hai" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Malik ka naam" value={f.owner} onChange={(e) => set({ owner: e.target.value })} placeholder="Bilal Ahmad" />
          <Input label="Phone" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="03001234567" error={err('phone')} hint="Reminder WhatsApp isi par" />
          <Input label="CNIC" inputMode="numeric" value={f.cnic} onChange={(e) => set({ cnic: e.target.value })} hint="Marzi hai" />
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Insurance company" value={f.insurer} onChange={(e) => set({ insurer: e.target.value })} placeholder="Adamjee" />
          <Input label="Insurance khatam" type="date" value={f.insurance} onChange={(e) => set({ insurance: e.target.value })} />
          <Input label="Token tax khatam" type="date" value={f.token} onChange={(e) => set({ token: e.target.value })} />
          <Input label="Fitness khatam" type="date" value={f.fitness} onChange={(e) => set({ fitness: e.target.value })} hint="Commercial gaari" />
        </div>
        <Textarea label="Note" rows={2} value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Customer hamesha synthetic oil leta hai…" />
      </form>
    </Modal>
  );
}
