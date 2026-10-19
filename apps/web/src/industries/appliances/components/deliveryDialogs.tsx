/**
 * Heavy delivery dialogs: booking a trip (address, floor, lift, charges),
 * the trip card (vehicle and driver, dispatch, arrival, hand-over with the
 * receiver's name and CNIC, money at the door), cancel and failed trips.
 * The delivered trip posts its own bill unless the counter bill already
 * charged for delivery.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, MapPin, MessageCircle, Navigation, Truck, Wallet, XCircle } from 'lucide-react';
import { Button, Input, Modal, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { deliveriesApi, type ApplianceDelivery, type DeliveryDetail } from '../api/deliveries.api';
import { CustomerFields, PayModal, Pill, ReasonModal, SlotChips, emptyParty, partyErrors, type PartyDraft } from './ui';
import { DELIVERY_KEY, DELIVERY_OPEN, INSTALL_KEY, MONEY_KEYS, apiError, cnicOk, dateTime, dayOnly, deliveryStatusOf, digits, money, slotLabel, todayKey, waLink } from './meta';

const refresh = (qc: ReturnType<typeof useQueryClient>) => [DELIVERY_KEY, INSTALL_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

export function deliveryMessage(d: ApplianceDelivery, shop: string) {
  return [
    `Assalam o alaikum ${d.customerName},`,
    `${shop}: aap ka saman (${d.deliveryNumber})`,
    d.status === 'DELIVERED' ? 'pohancha diya gaya. Shukriya!' : d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)} ko pohanchega.` : 'jald pohanchega.',
    d.driverName && d.status !== 'DELIVERED' ? `Driver: ${d.driverName}${d.driverPhone ? ` (${d.driverPhone})` : ''}${d.vehicleNumber ? ` · gaari ${d.vehicleNumber}` : ''}` : '',
    (d.dueAmount ?? 0) > 0 ? `Delivery charges baqi: ${formatPKR(d.dueAmount ?? 0)}` : '',
  ].filter(Boolean).join('\n');
}

/* ── New trip ── */
export function NewDeliveryModal({ onClose, onCreated }: { onClose: () => void; onCreated: (d: ApplianceDelivery) => void }) {
  const qc = useQueryClient();
  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [floor, setFloor] = useState('');
  const [lift, setLift] = useState(false);
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [charge, setCharge] = useState('');
  const [loading, setLoading] = useState('');
  const [unloading, setUnloading] = useState('');
  const [floorCharge, setFloorCharge] = useState('');
  const [install, setInstall] = useState(false);
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const pErr = partyErrors(party);
  const dateBad = !!date && date < todayKey();
  const bad = Object.values(pErr).some(Boolean) || dateBad;
  const total = [charge, loading, unloading, floorCharge].reduce((s, v) => s + (Number(v) || 0), 0);

  const save = useMutation({
    mutationFn: () => deliveriesApi.create({
      customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), deliveryAddress: party.address.trim(), area: party.area.trim() || undefined,
      floorNumber: floor ? Number(floor) : undefined, hasLift: lift, scheduledDate: date || undefined, scheduledSlot: slot || undefined,
      deliveryCharge: Number(charge) || 0, loadingCharge: Number(loading) || 0, unloadingCharge: Number(unloading) || 0, floorCharge: Number(floorCharge) || 0,
      requiresInstallation: install, notes: notes.trim() || undefined,
    }),
    onSuccess: (d) => { toast.success(`Delivery ${d.deliveryNumber} book`); refresh(qc); onCreated(d); },
    onError: (e) => toast.error(apiError(e, 'Delivery book nahi hui')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title="Nayi delivery" description="Bill ke saath delivery POS par bhi book hoti hai — yahan alag trip likhein"
      footer={<>
        <span className="mr-auto text-[0.8125rem] text-slate-600">Charges: <strong className="tabular-nums">{formatPKR(total)}</strong></span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} leftIcon={<Truck className="h-4 w-4" />}>Book karein</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <CustomerFields value={party} onChange={setParty} errors={tried ? pErr : {}} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Manzil (floor)" inputMode="numeric" value={floor} onChange={(e) => setFloor(digits(e.target.value))} placeholder="0 = ground" />
          <Switch className="sm:col-span-2 sm:mt-6" checked={lift} onChange={(e) => setLift(e.target.checked)} label="Lift hai" description="Na ho to helper zyada lagenge" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={dateBad ? 'Guzri hui date nahi' : undefined} />
          <SlotChips value={slot} onChange={setSlot} />
        </div>
        <div className="rounded-xl p-3 ring-1 ring-slate-200">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Charges</p>
          <p className="text-[0.75rem] text-slate-500">Free delivery ho to khali chhorein. Delivery hone par in ka bill banta hai.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-4">
            <Input label="Gaari" inputMode="decimal" value={charge} onChange={(e) => setCharge(money(e.target.value))} placeholder="1500" />
            <Input label="Load" inputMode="decimal" value={loading} onChange={(e) => setLoading(money(e.target.value))} placeholder="0" />
            <Input label="Utarna" inputMode="decimal" value={unloading} onChange={(e) => setUnloading(money(e.target.value))} placeholder="0" />
            <Input label="Manzil" inputMode="decimal" value={floorCharge} onChange={(e) => setFloorCharge(money(e.target.value))} placeholder="0" />
          </div>
        </div>
        <Switch checked={install} onChange={(e) => setInstall(e.target.checked)} label="Installation bhi karni hai" description="Saman pohanchne ke baad Installations me booking yaad dilayi jayegi" />
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gali tang hai, chhoti gaari bhejein" hint="Driver ke liye" />
      </form>
    </Modal>
  );
}

function VehicleModal({ d, pending, onConfirm, onClose }: { d: ApplianceDelivery; pending: boolean; onConfirm: (v: { vehicleNumber: string; driverName: string; driverPhone?: string; helperCount?: number; scheduledDate?: string; scheduledSlot?: string }) => void; onClose: () => void }) {
  const [vehicle, setVehicle] = useState(d.vehicleNumber ?? '');
  const [driver, setDriver] = useState(d.driverName ?? '');
  const [phone, setPhone] = useState(d.driverPhone ?? '');
  const [helpers, setHelpers] = useState(String(d.helperCount ?? ''));
  const [date, setDate] = useState(d.scheduledDate?.slice(0, 10) ?? todayKey());
  const [slot, setSlot] = useState(d.scheduledSlot ?? '');
  const ok = vehicle.trim().length >= 3 && driver.trim().length >= 2 && !(date && date < todayKey());
  return (
    <Modal open onClose={onClose} size="sm" title="Gaari aur driver"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={pending} onClick={() => onConfirm({ vehicleNumber: vehicle.trim().toUpperCase(), driverName: driver.trim(), driverPhone: phone.trim() || undefined, helperCount: Number(helpers) || undefined, scheduledDate: date || undefined, scheduledSlot: slot || undefined })}>Laga dein</Button></>}>
      <div className="space-y-3">
        <Input label="Gaari ka number" value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="LES-1234" autoFocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Driver" value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="Aslam" />
          <Input label="Driver ka phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" />
        </div>
        <Input label="Helper kitne" inputMode="numeric" value={helpers} onChange={(e) => setHelpers(digits(e.target.value))} placeholder="2" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <SlotChips value={slot} onChange={setSlot} />
      </div>
    </Modal>
  );
}

function ConfirmModal({ d, onClose }: { d: DeliveryDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const due = d.dueAmount ?? Math.max(Number(d.totalCharge) - Number(d.paidAmount ?? 0), 0);
  const [name, setName] = useState(d.customerName);
  const [cnic, setCnic] = useState('');
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const n = Number(amount) || 0;
  const tooMuch = n > due + 0.01;
  const save = useMutation({
    mutationFn: () => deliveriesApi.confirm(d.id, { receivedByName: name.trim(), receivedByCnic: cnic.trim() || undefined, paidAmount: n || undefined, paymentMethod: method }),
    onSuccess: () => { toast.success(`${d.deliveryNumber} de diya`); refresh(qc); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Confirm nahi hua')),
  });
  const ok = name.trim().length >= 2 && cnicOk(cnic) && !tooMuch;
  return (
    <Modal open onClose={onClose} size="sm" title={`Saman de diya — ${d.deliveryNumber}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={!ok} loading={save.isPending} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => save.mutate()}>Confirm karein</Button></>}>
      <div className="space-y-3">
        <Input label="Kis ne liya" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Us ka CNIC" value={cnic} onChange={(e) => setCnic(e.target.value)} placeholder="35202-1234567-1" error={!cnicOk(cnic) ? '13 hindse likhein' : undefined} hint="Marzi hai — mehnga saman ho to zaroor likhein" />
        {d.chargedAtCounter ? <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Delivery charges counter ke bill me le liye gaye.</p> : due > 0 ? <>
          <Input label="Driver ne kitna liya" inputMode="decimal" value={amount} onChange={(e) => setAmount(money(e.target.value))} error={tooMuch ? `Sirf ${formatPKR(due)} baqi` : undefined} hint={`Charges baqi ${formatPKR(due)} — jo na mile khata me jayega`} />
          {n > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        </> : null}
      </div>
    </Modal>
  );
}

type Dialog = 'vehicle' | 'confirm' | 'pay' | 'cancel' | 'fail' | null;

export function DeliveryCard({ id, shopName, canManage, onClose }: { id: string; shopName: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [DELIVERY_KEY, 'one', id], queryFn: () => deliveriesApi.getOne(id) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const done = (msg: string) => { toast.success(msg); refresh(qc); setDialog(null); };
  const fail = (e: unknown) => toast.error(apiError(e, 'Nahi hua'));
  const vehicle = useMutation({ mutationFn: (v: Parameters<typeof deliveriesApi.assignVehicle>[1]) => deliveriesApi.assignVehicle(id, v), onSuccess: () => done('Gaari lag gayi'), onError: fail });
  const status = useMutation({ mutationFn: (v: { status: string; notes?: string }) => deliveriesApi.updateStatus(id, v), onSuccess: () => done('Halat badal gayi'), onError: fail });
  const pay = useMutation({ mutationFn: (v: { amount: number; paymentMethod: string; note?: string }) => deliveriesApi.addPayment(id, v), onSuccess: () => done('Paisa mil gaya'), onError: fail });
  const d = q.data;
  const open = !!d && DELIVERY_OPEN.includes(d.status);
  const due = d?.dueAmount ?? 0;
  const wa = d ? waLink(d.customerPhone, deliveryMessage(d, shopName)) : undefined;
  const map = d ? `https://www.google.com/maps/search/${encodeURIComponent([d.deliveryAddress, d.area, d.city].filter(Boolean).join(', '))}` : '';

  return (
    <Modal open onClose={onClose} size="lg" title={d ? `${d.deliveryNumber} — ${d.customerName}` : 'Delivery'} description={d ? `${d.customerPhone} · ${[d.deliveryAddress, d.area].filter(Boolean).join(', ')}` : undefined}
      footer={d && <>
        <a href={map} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"><MapPin className="h-4 w-4" />Map</a>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        <span className="flex-1" />
        {canManage && due > 0 && d.status === 'DELIVERED' && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>Baqi lein</Button>}
        {canManage && (d.status === 'PENDING' || d.status === 'SCHEDULED') && <Button variant="secondary" leftIcon={<Truck className="h-4 w-4" />} onClick={() => setDialog('vehicle')}>{d.vehicleNumber ? 'Gaari badlein' : 'Gaari lagayein'}</Button>}
        {canManage && d.status === 'SCHEDULED' && <Button leftIcon={<Navigation className="h-4 w-4" />} loading={status.isPending} onClick={() => status.mutate({ status: 'DISPATCHED' })}>Nikal gaya</Button>}
        {canManage && d.status === 'DISPATCHED' && <Button loading={status.isPending} onClick={() => status.mutate({ status: 'ARRIVED' })}>Pohanch gaya</Button>}
        {canManage && (d.status === 'ARRIVED' || d.status === 'DISPATCHED') && <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog('confirm')}>De diya</Button>}
      </>}>
      {!d ? <Skeleton className="h-52 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill meta={deliveryStatusOf(d.status)} />
            {d.requiresInstallation && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] text-blue-700 ring-1 ring-blue-200">Installation bhi</span>}
            {d.sale && <Link to={`/sales/${d.sale.id}`} className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-700 hover:underline">Bill {d.sale.saleNumber}</Link>}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
            <Row k="Date" v={d.scheduledDate ? `${dayOnly(d.scheduledDate)} ${slotLabel(d.scheduledSlot)}` : 'Abhi tay nahi'} />
            <Row k="Manzil" v={d.floorNumber != null ? `${d.floorNumber}${d.hasLift ? ' · lift hai' : ' · lift nahi'}` : undefined} />
            <Row k="Gaari" v={d.vehicleNumber ? `${d.vehicleNumber} · ${d.driverName ?? ''}${d.driverPhone ? ` (${d.driverPhone})` : ''}${d.helperCount ? ` · ${d.helperCount} helper` : ''}` : 'Abhi nahi lagi'} />
            {d.dispatchedAt && <Row k="Nikla" v={dateTime(d.dispatchedAt)} />}
            {d.deliveredAt && <Row k="Diya" v={`${dateTime(d.deliveredAt)}${d.receivedByName ? ` · ${d.receivedByName}` : ''}`} />}
            {d.serials?.length ? <Row k="Serial" v={d.serials.map((s) => s.serialNumber).join(', ')} /> : null}
            {d.installation && <Row k="Installation" v={`${d.installation.installationNumber} · ${d.installation.status}`} />}
          </dl>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Money k="Gaari" v={d.deliveryCharge} /><Money k="Load / utarna" v={Number(d.loadingCharge) + Number(d.unloadingCharge)} /><Money k="Manzil" v={d.floorCharge} />
            <Money k={due > 0 ? 'Baqi' : 'Kul'} v={due > 0 ? due : d.totalCharge} tone={due > 0 ? 'text-amber-700' : 'text-slate-900'} />
          </dl>
          {d.chargedAtCounter && <p className="text-[0.8125rem] text-slate-600">Delivery charges counter ke bill me liye gaye — alag bill nahi banega.</p>}
          {d.requiresInstallation && d.status === 'DELIVERED' && !d.installation && <p className="rounded-xl bg-blue-50 px-3 py-2 text-[0.8125rem] text-blue-800 ring-1 ring-blue-200">Installation abhi book nahi hui. <Link className="font-semibold underline" to="/appliances/installations?new=1">Book karein</Link></p>}
          {canManage && open && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {d.status !== 'PENDING' && d.status !== 'SCHEDULED' && <Button size="sm" variant="ghost" onClick={() => setDialog('fail')}>Nahi de sake</Button>}
              <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setDialog('cancel')}>Cancel</Button>
            </div>
          )}
          {d.notes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{d.notes}</pre>}
        </div>
      )}
      {d && dialog === 'vehicle' && <VehicleModal d={d} pending={vehicle.isPending} onConfirm={(v) => vehicle.mutate(v)} onClose={() => setDialog(null)} />}
      {d && dialog === 'confirm' && <ConfirmModal d={d} onClose={() => setDialog(null)} />}
      {d && dialog === 'pay' && <PayModal title={`Delivery charges — ${d.deliveryNumber}`} due={due} pending={pay.isPending} onConfirm={(v) => pay.mutate(v)} onClose={() => setDialog(null)} />}
      {d && dialog === 'cancel' && <ReasonModal title="Delivery cancel" confirm="Cancel karein" pending={status.isPending} presets={['Customer khud le gaya', 'Bill wapas hua', 'Customer ne mana kar diya']} onConfirm={(x) => status.mutate({ status: 'CANCELLED', notes: x })} onClose={() => setDialog(null)} />}
      {d && dialog === 'fail' && <ReasonModal title="Nahi de sake" confirm="Darj karein" pending={status.isPending} presets={['Customer ghar par nahi', 'Pata ghalat', 'Saman upar nahi ja saka']} onConfirm={(x) => status.mutate({ status: 'FAILED', notes: x })} onClose={() => setDialog(null)} />}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 text-slate-900">{v || '—'}</dd></div>;
}
function Money({ k, v, tone = 'text-slate-900' }: { k: string; v: number; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className={cn('font-bold tabular-nums', tone)}>{formatPKR(Number(v) || 0)}</dd></div>;
}
