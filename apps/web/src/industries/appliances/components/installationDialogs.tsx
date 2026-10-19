/**
 * Installation dialogs: booking a visit (customer, unit, date, technician,
 * expected charges), the job card with every action on it, and finishing
 * the job — final charges, money taken, demo and the customer's rating.
 * Finishing posts the job's bill; money not taken goes on the customer's
 * khata.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, CheckCircle2, MessageCircle, Play, Printer, Receipt, ShieldCheck, Star, Wallet, XCircle,
} from 'lucide-react';
import { Button, Input, Modal, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { installationsApi, type Installation, type InstallationDetail } from '../api/installations.api';
import { printInstallationJob } from '../receipt/appliancePrints';
import { AssignModal, SerialLookup } from './jobDialogs';
import { Chips, CustomerFields, PayModal, Pill, ReasonModal, SlotChips, TechSelect, emptyParty, partyErrors, type PartyDraft } from './ui';
import {
  INSTALL_KEY, INSTALL_OPEN, INSTALL_TYPES, MONEY_KEYS, SERIAL_KEY, TECH_KEY, apiError, dateTime, dayOnly, installStatusOf, money,
  serviceTypeOf, slotLabel, todayKey, waLink,
} from './meta';

const refresh = (qc: ReturnType<typeof useQueryClient>) => [INSTALL_KEY, TECH_KEY, SERIAL_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
export const installDue = (i: Installation) => i.dueAmount ?? Math.max(Number(i.totalCharge) - Number(i.paidByCustomer), 0);

export function installMessage(i: Installation, shop: string) {
  return [
    `Assalam o alaikum ${i.customerName},`,
    `${shop}: aap ke ${i.productName} ki ${serviceTypeOf(i.serviceType).toLowerCase()} (${i.installationNumber})`,
    i.status === 'COMPLETED' ? 'mukammal ho gayi. Shukriya!' : i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)} ko hogi.` : 'ki date jald batayi jayegi.',
    i.technicianName && i.status !== 'COMPLETED' ? `Technician: ${i.technicianName}${i.technicianPhone ? ` (${i.technicianPhone})` : ''}` : '',
    installDue(i) > 0 ? `Baqi: ${formatPKR(installDue(i))}` : '',
  ].filter(Boolean).join('\n');
}

/* ── New booking ── */
export function NewInstallationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (i: Installation) => void }) {
  const qc = useQueryClient();
  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [product, setProduct] = useState('');
  const [type, setType] = useState('INSTALLATION');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [tech, setTech] = useState('');
  const [labor, setLabor] = useState('');
  const [visit, setVisit] = useState('');
  const [material, setMaterial] = useState('');
  const [warranty, setWarranty] = useState(false);
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const pErr = partyErrors(party);
  const errors = { ...pErr, product: product.trim().length < 2 ? 'Product ka naam likhein' : undefined, date: date && date < todayKey() ? 'Guzri hui date nahi' : undefined };
  const bad = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () => installationsApi.create({
      customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), customerAddress: party.address.trim(), area: party.area.trim() || undefined,
      productId, productName: product.trim(), serialNumber: serial.trim() || undefined, serialTrackingId: serialId,
      serviceType: type, scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined, technicianId: tech || undefined,
      laborCharge: Number(labor) || 0, visitCharge: Number(visit) || 0, materialsCharge: Number(material) || 0,
      covered_underWarranty: warranty, internalNotes: notes.trim() || undefined,
    }),
    onSuccess: (i) => { toast.success(`${i.installationNumber} book ho gayi`); refresh(qc); onCreated(i); },
    onError: (e) => toast.error(apiError(e, 'Booking nahi hui')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title="Nayi installation" description="Customer, unit, date aur technician — booking ke baad parchi print karein"
      footer={<>
        {tried && bad && <span className="mr-auto text-[0.8125rem] text-rose-700">Laal khane theek karein</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} leftIcon={<CalendarClock className="h-4 w-4" />}>Book karein</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <SerialLookup value={serial} onChange={(v) => { setSerial(v); setSerialId(undefined); }} onFound={(r) => {
          const s = r.serial!;
          setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product);
          if (s.product?.installationCharge && !labor) setLabor(String(s.product.installationCharge));
          if (r.warranty?.isValid) setWarranty(true);
          if (s.customerName && !party.name) setParty({ ...party, customerId: s.soldToCustomerId ?? undefined, name: s.customerName, phone: s.customerPhone ?? party.phone, address: s.deliveryAddress ?? party.address });
        }} />
        <Input label="Product" required value={product} onChange={(e) => { setProduct(e.target.value); setProductId(undefined); }} placeholder="Haier 1.5 ton inverter AC" error={tried ? errors.product : undefined} />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam</span>
          <Chips options={INSTALL_TYPES.map((t) => ({ value: t, label: serviceTypeOf(t) }))} value={type} onChange={setType} />
        </div>
        <CustomerFields value={party} onChange={setParty} errors={tried ? pErr : {}} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} hint="Khali chhorein to 'date baqi' me rahegi" />
          <TechSelect value={tech} onChange={setTech} />
        </div>
        <SlotChips value={slot} onChange={setSlot} />
        <div className="rounded-xl p-3 ring-1 ring-slate-200">
          <p className="text-[0.8125rem] font-semibold text-slate-800">Andazan charges</p>
          <p className="text-[0.75rem] text-slate-500">Kaam ke baad badal sakte hain. Bill kaam mukammal hone par banta hai.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Input label="Mazdoori" inputMode="decimal" value={labor} onChange={(e) => setLabor(money(e.target.value))} placeholder="3000" />
            <Input label="Visit" inputMode="decimal" value={visit} onChange={(e) => setVisit(money(e.target.value))} placeholder="0" />
            <Input label="Saman (pipe, stand)" inputMode="decimal" value={material} onChange={(e) => setMaterial(money(e.target.value))} placeholder="0" />
          </div>
          <Switch className="mt-3" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} label="Free installation (company / dukaan ki taraf se)" description="Customer se sirf wohi lein jo kaam ke waqt tay ho" />
        </div>
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Teesri manzil, lift nahi, outdoor chhat par" hint="Sirf dukaan ke liye" />
      </form>
    </Modal>
  );
}

/* ── Finish ── */
function CompleteModal({ job, onClose }: { job: Installation; onClose: () => void }) {
  const qc = useQueryClient();
  const [labor, setLabor] = useState(String(Number(job.laborCharge) || ''));
  const [visit, setVisit] = useState(String(Number(job.visitCharge) || ''));
  const [material, setMaterial] = useState(String(Number(job.materialsCharge) || ''));
  const [covered, setCovered] = useState(job.covered_underWarranty);
  const advance = Number(job.paidByCustomer) || 0;
  const total = (Number(labor) || 0) + (Number(visit) || 0) + (Number(material) || 0);
  const owed = covered ? 0 : Math.max(total - advance, 0);
  const [now, setNow] = useState(String(owed || ''));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [demo, setDemo] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [checks, setChecks] = useState({ hasProperElectricConnection: true, wallSpaceAvailable: true, hasProperPlumbing: true, drainageAvailable: true });
  const taken = Number(now) || 0;
  const paid = advance + taken;
  const tooMuch = paid > total + 0.01;
  const left = covered ? 0 : Math.max(total - paid, 0);
  const noName = left > 0 && !job.customerId && !job.customerName;

  const save = useMutation({
    mutationFn: () => installationsApi.complete(job.id, {
      laborCharge: Number(labor) || 0, visitCharge: Number(visit) || 0, materialsCharge: Number(material) || 0,
      covered_underWarranty: covered, paidByCustomer: paid, paymentMethod: method, demoGiven: demo,
      customerRating: rating || undefined, customerFeedback: feedback.trim() || undefined, ...checks,
    }),
    onSuccess: () => { toast.success(`${job.installationNumber} mukammal — bill ban gaya`); refresh(qc); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Mukammal nahi hui')),
  });

  return (
    <Modal open onClose={onClose} size="md" title={`Kaam mukammal — ${job.installationNumber}`} description={`${job.productName} · ${job.customerName}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => !tooMuch && !noName && save.mutate()} disabled={tooMuch || noName} loading={save.isPending} leftIcon={<Receipt className="h-4 w-4" />}>
          {left > 0 ? `Mukammal — ${formatPKR(left)} khata me` : 'Mukammal karein'}
        </Button>
      </>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Mazdoori" inputMode="decimal" value={labor} onChange={(e) => setLabor(money(e.target.value))} />
          <Input label="Visit" inputMode="decimal" value={visit} onChange={(e) => setVisit(money(e.target.value))} />
          <Input label="Saman" inputMode="decimal" value={material} onChange={(e) => setMaterial(money(e.target.value))} hint="Pipe, stand, wire" />
        </div>
        <Switch checked={covered} onChange={(e) => setCovered(e.target.checked)} label="Free installation (warranty)" description="Bill sirf us paise ka banega jo customer ne diya; saman ki cost Profit me kharch ki tarah aayegi" />
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">Kul kaam</dt><dd className="font-semibold tabular-nums">{formatPKR(total)}</dd></div>
          {advance > 0 && <div className="flex justify-between"><dt className="text-slate-500">Pehle mila (advance)</dt><dd className="tabular-nums">{formatPKR(advance)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="font-medium text-slate-700">Customer se lena</dt><dd className="text-lg font-bold tabular-nums">{formatPKR(owed)}</dd></div>
        </dl>
        <Input label="Abhi kitna liya" inputMode="decimal" value={now} onChange={(e) => setNow(money(e.target.value))} error={tooMuch ? 'Kul kaam se zyada nahi le sakte' : undefined} />
        {taken > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        {left > 0 && <p className={cn('flex items-start gap-1.5 rounded-xl px-3 py-2 text-[0.8125rem] ring-1', noName ? 'bg-rose-50 text-rose-900 ring-rose-200' : 'bg-amber-50 text-amber-900 ring-amber-200')}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{formatPKR(left)} {job.customerName} ke khata me udhaar likha jayega.</p>}
        <div className="grid gap-2 rounded-xl p-3 ring-1 ring-slate-200 sm:grid-cols-2">
          <Switch checked={checks.hasProperElectricConnection} onChange={(e) => setChecks({ ...checks, hasProperElectricConnection: e.target.checked })} label="Bijli ka point theek" />
          <Switch checked={checks.wallSpaceAvailable} onChange={(e) => setChecks({ ...checks, wallSpaceAvailable: e.target.checked })} label="Jagah theek thi" />
          <Switch checked={checks.hasProperPlumbing} onChange={(e) => setChecks({ ...checks, hasProperPlumbing: e.target.checked })} label="Paani / pipe theek" />
          <Switch checked={checks.drainageAvailable} onChange={(e) => setChecks({ ...checks, drainageAvailable: e.target.checked })} label="Paani nikalne ki jagah" />
          <Switch checked={demo} onChange={(e) => setDemo(e.target.checked)} label="Customer ko chala kar dikhaya (demo)" />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Customer ki rating</span>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(rating === n ? 0 : n)} aria-label={`${n} star`} className="rounded-lg p-1 hover:bg-amber-50">
              <Star className={cn('h-6 w-6', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />
            </button>
          ))}</div>
        </div>
        <Input label="Customer ne kya kaha" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Marzi hai" />
      </div>
    </Modal>
  );
}

type Dialog = 'assign' | 'reschedule' | 'cancel' | 'fail' | 'pay' | 'complete' | null;

/* ── Job card ── */
export function InstallationCard({ id, shopName, canManage, onClose }: { id: string; shopName: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [INSTALL_KEY, 'one', id], queryFn: () => installationsApi.getOne(id) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [newDate, setNewDate] = useState(todayKey());
  const done = (msg: string) => { toast.success(msg); refresh(qc); setDialog(null); };
  const fail = (e: unknown) => toast.error(apiError(e, 'Nahi hua'));
  const assign = useMutation({ mutationFn: (v: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => installationsApi.assignTechnician(id, v), onSuccess: () => done('Technician lag gaya'), onError: fail });
  const status = useMutation({ mutationFn: (v: { status: 'IN_PROGRESS' | 'CANCELLED' | 'FAILED'; cancellationReason?: string }) => installationsApi.updateStatus(id, v), onSuccess: () => done('Halat badal gayi'), onError: fail });
  const resched = useMutation({ mutationFn: () => installationsApi.reschedule(id, { newDate }), onSuccess: () => done('Nayi date lag gayi'), onError: fail });
  const pay = useMutation({ mutationFn: (v: { amount: number; paymentMethod: string; note?: string }) => installationsApi.addPayment(id, v), onSuccess: () => done('Paisa mil gaya'), onError: fail });

  const i = q.data as InstallationDetail | undefined;
  const open = !!i && INSTALL_OPEN.includes(i.status);
  const due = i ? installDue(i) : 0;
  const wa = i ? waLink(i.customerPhone, installMessage(i, shopName)) : undefined;

  return (
    <Modal open onClose={onClose} size="lg" title={i ? `${i.installationNumber} — ${i.productName}` : 'Installation'} description={i ? `${serviceTypeOf(i.serviceType)} · ${i.customerName} · ${i.customerPhone}` : undefined}
      footer={i && <>
        <Button variant="ghost" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printInstallationJob(i, shopName)}>Parchi</Button>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        <span className="flex-1" />
        {canManage && due > 0 && i.status !== 'CANCELLED' && i.status !== 'FAILED' && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>{i.status === 'COMPLETED' ? 'Baqi lein' : 'Advance lein'}</Button>}
        {canManage && open && i.status !== 'IN_PROGRESS' && <Button variant="secondary" leftIcon={<Play className="h-4 w-4" />} loading={status.isPending} onClick={() => status.mutate({ status: 'IN_PROGRESS' })}>Kaam shuru</Button>}
        {canManage && open && <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog('complete')}>Mukammal</Button>}
      </>}>
      {!i ? <Skeleton className="h-60 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill meta={installStatusOf(i.status)} />
            {i.isOverdue && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700 ring-1 ring-rose-200">Date guzar gayi</span>}
            {i.covered_underWarranty && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck className="h-3 w-3" />Free / warranty</span>}
          </div>
          <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
            <Row k="Pata" v={[i.customerAddress, i.area, i.city].filter(Boolean).join(', ')} />
            <Row k="Serial" v={i.serialNumber} />
            <Row k="Date" v={i.scheduledDate ? `${dayOnly(i.scheduledDate)} ${slotLabel(i.scheduledTimeSlot)}` : 'Abhi tay nahi'} />
            <Row k="Technician" v={i.technicianName ? `${i.technicianName}${i.technicianPhone ? ` · ${i.technicianPhone}` : ''}` : 'Abhi nahi laga'} />
            {i.completedAt && <Row k="Mukammal" v={dateTime(i.completedAt)} />}
            {i.cancellationReason && <Row k="Wajah" v={i.cancellationReason} />}
            {i.serial?.warrantyEndDate && <Row k="Warranty" v={`${dayOnly(i.serial.warrantyEndDate)} tak`} />}
            {i.customerRating ? <Row k="Rating" v={`${i.customerRating} / 5${i.customerFeedback ? ` — ${i.customerFeedback}` : ''}`} /> : null}
          </dl>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Money k="Mazdoori" v={i.laborCharge} /><Money k="Visit" v={i.visitCharge} /><Money k="Saman" v={i.materialsCharge} />
            <Money k={due > 0 ? 'Baqi' : 'Mila'} v={due > 0 ? due : i.paidByCustomer} tone={due > 0 ? 'text-amber-700' : 'text-emerald-700'} />
          </dl>
          {i.status === 'COMPLETED' && <p className="text-[0.8125rem] text-slate-600">Bill <Link className="font-semibold text-brand-700 hover:underline" to={`/sales?search=${encodeURIComponent(i.installationNumber)}`}>{i.installationNumber}</Link> Sales, galla aur khata me hai. Galat ho to Sales se void karein — kaam dobara khul jayega.</p>}
          {canManage && open && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="secondary" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => setDialog('assign')}>{i.technicianId ? 'Technician / date badlein' : 'Technician lagayein'}</Button>
              {i.scheduledDate && <Button size="sm" variant="secondary" onClick={() => setDialog('reschedule')}>Nayi date</Button>}
              {i.status === 'IN_PROGRESS' && <Button size="sm" variant="ghost" onClick={() => setDialog('fail')}>Nahi lag saka</Button>}
              <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setDialog('cancel')}>Cancel</Button>
            </div>
          )}
          {i.internalNotes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{i.internalNotes}</pre>}
          {i.history?.length > 0 && (
            <div>
              <p className="text-[0.8125rem] font-semibold text-slate-800">Is customer ke pichle kaam</p>
              <ul className="mt-1 divide-y divide-slate-100 text-[0.8125rem]">
                {i.history.slice(0, 5).map((h) => <li key={h.id} className="flex justify-between py-1.5"><span>{h.installationNumber} · {h.productName}</span><span className="text-slate-500">{installStatusOf(h.status).label} · {dayOnly(h.completedAt ?? h.scheduledDate)}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {i && dialog === 'assign' && <AssignModal title="Technician aur date" initial={{ technicianId: i.technicianId, date: i.scheduledDate, slot: i.scheduledTimeSlot }} pending={assign.isPending} onConfirm={(v) => assign.mutate(v)} onClose={() => setDialog(null)} />}
      {i && dialog === 'reschedule' && (
        <Modal open onClose={() => setDialog(null)} size="sm" title="Nayi date" footer={<><Button variant="secondary" onClick={() => setDialog(null)}>Rehne dein</Button><Button disabled={!newDate || newDate < todayKey()} loading={resched.isPending} onClick={() => resched.mutate()}>Date badlein</Button></>}>
          <Input label="Nayi date" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} error={newDate < todayKey() ? 'Guzri hui date nahi' : undefined} />
        </Modal>
      )}
      {i && dialog === 'cancel' && <ReasonModal title="Installation cancel karein" confirm="Cancel karein" pending={status.isPending} presets={['Customer ne mana kar diya', 'Customer khud lagwayega', 'Bill wapas hua']} onConfirm={(r) => status.mutate({ status: 'CANCELLED', cancellationReason: r })} onClose={() => setDialog(null)} />}
      {i && dialog === 'fail' && <ReasonModal title="Nahi lag saka" confirm="Darj karein" pending={status.isPending} presets={['Bijli ka point nahi', 'Jagah nahi', 'Unit kharab nikla', 'Customer ghar par nahi']} onConfirm={(r) => status.mutate({ status: 'FAILED', cancellationReason: r })} onClose={() => setDialog(null)} />}
      {i && dialog === 'pay' && <PayModal title={`Paisa lein — ${i.installationNumber}`} description={i.status === 'COMPLETED' ? 'Bill ka udhaar kam hoga' : 'Advance khata me jama hoga, bill banne par us me lag jayega'} due={due} pending={pay.isPending} onConfirm={(v) => pay.mutate(v)} onClose={() => setDialog(null)} />}
      {i && dialog === 'complete' && <CompleteModal job={i} onClose={() => setDialog(null)} />}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 text-slate-900">{v || '—'}</dd></div>;
}
function Money({ k, v, tone = 'text-slate-900' }: { k: string; v: number; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className={cn('font-bold tabular-nums', tone)}>{formatPKR(Number(v) || 0)}</dd></div>;
}
