/**
 * Right after an appliance bill is saved: book the installation for units
 * that need fitting, the home delivery, and — for a bill on udhaar — a
 * monthly qist plan with a guarantor. Each part is optional; the bill is
 * already complete without them.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, HardHat, ShieldCheck, Truck } from 'lucide-react';
import { Button, Input, Modal, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import type { PosSavedSale } from '@modules/pos/engine';
import type { ApplianceProductProfile } from '../api/products.api';
import { installationsApi } from '../api/installations.api';
import { deliveriesApi } from '../api/deliveries.api';
import { qistApi } from '../api/qist.api';
import { SlotChips, TechSelect } from '../components/ui';
import { DELIVERY_KEY, INSTALL_KEY, addMonths, apiError, catMeta, cnicOk, digits, money, phoneOk, todayKey, addDays } from '../components/meta';
import type { PickedUnit } from './config';

const COUNTS = [3, 6, 9, 12, 18, 24];

export function AfterSale({ sale, lines, units, profiles, onClose }: {
  sale: PosSavedSale;
  lines: Array<{ productId: string; name: string; qty: number }>;
  units: PickedUnit[];
  profiles: Map<string, ApplianceProductProfile>;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canJobs = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const canQist = usePermission(PERMISSIONS.KHATA_MANAGE);
  const fit = useMemo(() => lines.filter((l) => profiles.get(l.productId)?.requiresInstallation), [lines, profiles]);
  const heavy = lines.some((l) => catMeta(profiles.get(l.productId)?.categoryType).heavy);
  const credit = Number(sale.creditAmount) || 0;
  const total = Number(sale.total) || 0;
  const offerQist = canQist && credit > 0 && !!sale.customer;

  const [name, setName] = useState(sale.customer?.name ?? '');
  const [phone, setPhone] = useState(sale.customer?.phone ?? '');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [doFit, setDoFit] = useState(canJobs && fit.length > 0);
  const [fitDate, setFitDate] = useState(addDays(todayKey(), 1));
  const [fitSlot, setFitSlot] = useState('');
  const [tech, setTech] = useState('');
  const [doTrip, setDoTrip] = useState(canJobs && heavy);
  const [tripDate, setTripDate] = useState(todayKey());
  const [tripSlot, setTripSlot] = useState('');
  const [floor, setFloor] = useState('');
  const [lift, setLift] = useState(false);
  const [tripCharge, setTripCharge] = useState('');
  const [doQist, setDoQist] = useState(offerQist);
  const [count, setCount] = useState(6);
  const [start, setStart] = useState(addMonths(todayKey(), 1));
  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gCnic, setGCnic] = useState('');
  const [gAddress, setGAddress] = useState('');

  const needParty = doFit || doTrip;
  const problems = [
    needParty && name.trim().length < 2 ? 'Customer ka naam likhein' : '',
    needParty && !phoneOk(phone) ? 'Customer ka sahi phone likhein' : '',
    needParty && address.trim().length < 5 ? 'Poora pata likhein' : '',
    doQist && gName.trim().length < 2 ? 'Zamin ka naam likhein' : '',
    doQist && gPhone && !phoneOk(gPhone) ? 'Zamin ka sahi phone' : '',
    doQist && (!gCnic.trim() || !cnicOk(gCnic)) ? 'Zamin ka CNIC 13 hindse' : '',
    doQist && gPhone && phoneOk(gPhone) && digits(gPhone).slice(-10) === digits(sale.customer?.phone ?? '').slice(-10) ? 'Zamin customer khud nahi ho sakta' : '',
    doQist && start < todayKey() ? 'Pehli qist aaj se pehle nahi' : '',
  ].filter(Boolean);

  const save = useMutation({
    mutationFn: async () => {
      const party = { customerId: sale.customer?.id, customerName: name.trim(), customerPhone: phone.trim() };
      const done: string[] = [];
      let planId: string | null = null;
      if (doFit) {
        const left = [...units];
        for (const l of fit) {
          const p = profiles.get(l.productId)!;
          for (let n = 0; n < Math.max(Math.floor(l.qty), 1); n++) {
            const at = left.findIndex((u) => u.productId === l.productId);
            const unit = at >= 0 ? left.splice(at, 1)[0] : undefined;
            await installationsApi.create({
              ...party, customerAddress: address.trim(), area: area.trim() || undefined, saleId: sale.id, productId: l.productId, productName: l.name,
              serialNumber: unit?.serialNumber, serialTrackingId: unit?.serialId, serviceType: 'INSTALLATION', scheduledDate: fitDate, scheduledTimeSlot: fitSlot || undefined,
              technicianId: tech || undefined, laborCharge: p.installationCovered ? 0 : Number(p.installationCharge) || 0, covered_underWarranty: p.installationCovered,
            });
          }
        }
        done.push('installation');
      }
      if (doTrip) {
        await deliveriesApi.create({
          ...party, deliveryAddress: address.trim(), area: area.trim() || undefined, saleId: sale.id, serialTrackingIds: units.map((u) => u.serialId),
          floorNumber: floor ? Number(floor) : undefined, hasLift: lift, scheduledDate: tripDate, scheduledSlot: tripSlot || undefined,
          deliveryCharge: Number(tripCharge) || 0, requiresInstallation: doFit,
        });
        done.push('delivery');
      }
      if (doQist && sale.customer) {
        const plan = await qistApi.create({
          saleId: sale.id, customerId: sale.customer.id, customerName: sale.customer.name, customerPhone: sale.customer.phone ?? undefined,
          totalAmount: total, downPayment: Math.max(total - credit, 0), installmentCount: count, startDate: start,
        });
        try {
          await qistApi.setGuarantor(plan.id, {
            guarantorName: gName.trim(), guarantorPhone: gPhone.replace(/[\s-]/g, '') || undefined, guarantorCnic: gCnic.trim(), guarantorAddress: gAddress.trim() || undefined,
          });
        } catch (e) {
          toast.error(apiError(e, `Plan ${plan.planNumber} ban gaya, zamin save nahi hua — Qist plans me plan khol kar zamin likhein`));
        }
        planId = plan.id;
        done.push('qist plan');
      }
      return { done, planId };
    },
    onSuccess: ({ done, planId }) => {
      if (done.length) {
        toast.success(`${done.join(', ')} book ho gaya`, planId
          ? { action: { label: 'Iqrarnama', onClick: () => navigate(`/emi-plans/${planId}`) }, duration: 10_000 }
          : undefined);
      }
      [INSTALL_KEY, DELIVERY_KEY, 'emi-plans', 'emi-stats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Booking nahi hui — Installations / Deliveries se dobara karein')),
  });

  const any = doFit || doTrip || doQist;
  return (
    <Modal open onClose={onClose} size="lg" title={`Bill ${sale.saleNumber} — aage kya?`} description="Fitting, delivery aur qist yahin book karein; zaroorat na ho to band karein"
      footer={<>
        {problems.length > 0 && any && <span className="mr-auto text-[0.8125rem] text-amber-800">{problems[0]}</span>}
        <Button variant="secondary" onClick={onClose}>Abhi nahi</Button>
        <Button onClick={() => save.mutate()} disabled={!any || problems.length > 0} loading={save.isPending} leftIcon={<CalendarClock className="h-4 w-4" />}>Book karein</Button>
      </>}>
      <div className="space-y-4">
        {(canJobs && (fit.length > 0 || heavy)) && (
          <div className="grid gap-3 rounded-xl p-3 ring-1 ring-slate-200 sm:grid-cols-2">
            <Input label="Customer" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" />
            <Input wrapperClassName="sm:col-span-2" label="Ghar ka pata" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House 12, Street 4, Johar Town" />
            <Input label="Ilaqa" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
        )}

        {canJobs && fit.length > 0 && (
          <Section icon={HardHat} on={doFit} onToggle={setDoFit} title="Installation" hint={fit.map((l) => `${l.name}${l.qty > 1 ? ` × ${l.qty}` : ''}`).join(', ')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Kis din" type="date" value={fitDate} onChange={(e) => setFitDate(e.target.value)} />
              <TechSelect value={tech} onChange={setTech} />
            </div>
            <SlotChips value={fitSlot} onChange={setFitSlot} />
            <p className="text-[0.75rem] text-slate-500">
              {fit.map((l) => { const p = profiles.get(l.productId)!; return p.installationCovered ? `${l.name}: free` : `${l.name}: ${formatPKR(Number(p.installationCharge) || 0)}`; }).join(' · ')} — kaam ke baad bill banega.
            </p>
          </Section>
        )}

        {canJobs && (
          <Section icon={Truck} on={doTrip} onToggle={setDoTrip} title="Ghar delivery" hint={heavy ? 'Bhari saman — gaari aur helper' : 'Customer khud le ja raha ho to band rakhein'}>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Kis din" type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} />
              <Input label="Manzil" inputMode="numeric" value={floor} onChange={(e) => setFloor(digits(e.target.value))} placeholder="0" />
              <Input label="Delivery charge" inputMode="decimal" value={tripCharge} onChange={(e) => setTripCharge(money(e.target.value))} placeholder="0" hint="Bill me liya ho to 0" />
            </div>
            <SlotChips value={tripSlot} onChange={setTripSlot} />
            <Switch checked={lift} onChange={(e) => setLift(e.target.checked)} label="Lift hai" />
          </Section>
        )}

        {offerQist && (
          <Section icon={ShieldCheck} on={doQist} onToggle={setDoQist} title="Qist plan" hint={`Udhaar ${formatPKR(credit)} — mahine war qistein`}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTS.map((c) => <button key={c} type="button" onClick={() => setCount(c)} className={cn('h-9 rounded-lg px-3 text-[0.8125rem] font-semibold ring-1', count === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>{c} mahine</button>)}
            </div>
            <p className="text-[0.8125rem] text-slate-700">{count} qist × <strong>{formatPKR(Math.round((credit / count) * 100) / 100)}</strong> · advance {formatPKR(Math.max(total - credit, 0))}</p>
            <Input label="Pehli qist" type="date" value={start} onChange={(e) => setStart(e.target.value)} hint="Har mahine isi tareekh ko" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Zamin (guarantor)" required value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Naam" />
              <Input label="Zamin ka phone" inputMode="tel" value={gPhone} onChange={(e) => setGPhone(e.target.value)} placeholder="0300-1234567" />
              <Input label="Zamin ka CNIC" required value={gCnic} onChange={(e) => setGCnic(e.target.value)} placeholder="35202-1234567-1" />
              <Input wrapperClassName="sm:col-span-3" label="Zamin ka pata" value={gAddress} onChange={(e) => setGAddress(e.target.value)} placeholder="Ghar ya dukaan ka pata" hint="Iqrarnama par chhapta hai" />
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function Section({ icon: Icon, on, onToggle, title, hint, children }: { icon: typeof Truck; on: boolean; onToggle: (v: boolean) => void; title: string; hint: string; children: ReactNode }) {
  return (
    <div className={cn('space-y-3 rounded-xl p-3 ring-1', on ? 'ring-brand-300' : 'ring-slate-200')}>
      <Switch checked={on} onChange={(e) => onToggle(e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><Icon className="h-4 w-4 text-brand-600" />{title}</span>} description={hint} />
      {on && children}
    </div>
  );
}
