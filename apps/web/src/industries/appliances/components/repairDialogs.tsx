/**
 * Repair (complaint) dialogs: logging a complaint with warranty and AMC
 * checked from the serial, the job card with every action, and closing the
 * job — what was wrong, what was done, charges and money taken. Closing
 * posts the job's bill; a warranty job can go on to a claim to the brand.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CalendarClock, CheckCircle2, MessageCircle, Printer, Receipt, Send, ShieldCheck, Star, Wallet, Wrench, XCircle,
} from 'lucide-react';
import { Button, Input, Modal, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { serviceRequestsApi, type ApplianceServiceStatus, type ServiceRequest, type ServiceRequestDetail } from '../api/service-requests.api';
import { warrantyClaimsApi } from '../api/warranty-claims.api';
import { printRepairJob } from '../receipt/appliancePrints';
import { AssignModal, SerialLookup } from './jobDialogs';
import { Chips, CustomerFields, PayModal, Pill, ReasonModal, SlotChips, TechSelect, emptyParty, partyErrors, type PartyDraft } from './ui';
import {
  AMC_KEY, CLAIM_KEY, MONEY_KEYS, PRIORITIES, REPAIR_TYPES, SERIAL_KEY, SERVICE_KEY, SERVICE_NEXT, SERVICE_OPEN, TECH_KEY, apiError, dateTime,
  dayOnly, issuesFor, money, priorityOf, serviceStatusOf, serviceTypeOf, slotLabel, todayKey, waLink,
} from './meta';

const refresh = (qc: ReturnType<typeof useQueryClient>) => [SERVICE_KEY, TECH_KEY, SERIAL_KEY, AMC_KEY, CLAIM_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
export const repairDue = (r: ServiceRequest) => r.dueAmount ?? (r.coveredUnderAmc || r.coveredUnderWarranty ? 0 : Math.max(Number(r.totalCharge) - Number(r.paidAmount), 0));

export function repairMessage(r: ServiceRequest, shop: string) {
  return [
    `Assalam o alaikum ${r.customerName},`,
    `${shop}: aap ke ${r.productName} ki shikayat ${r.requestNumber}`,
    r.status === 'COMPLETED' ? 'theek ho gayi. Shukriya!' : `Halat: ${serviceStatusOf(r.status).label}`,
    r.scheduledDate && r.status !== 'COMPLETED' ? `Technician ${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)} ko aayega${r.technicianName ? ` (${r.technicianName})` : ''}.` : '',
    repairDue(r) > 0 ? `Baqi: ${formatPKR(repairDue(r))}` : '',
  ].filter(Boolean).join('\n');
}

/* ── New complaint ── */
export function NewRepairModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: ServiceRequest) => void }) {
  const qc = useQueryClient();
  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [serial, setSerial] = useState('');
  const [serialId, setSerialId] = useState<string | undefined>();
  const [productId, setProductId] = useState<string | undefined>();
  const [category, setCategory] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [type, setType] = useState('REPAIR');
  const [priority, setPriority] = useState('NORMAL');
  const [issue, setIssue] = useState('');
  const [date, setDate] = useState(todayKey());
  const [slot, setSlot] = useState('');
  const [tech, setTech] = useState('');
  const [visit, setVisit] = useState('');
  const [warranty, setWarranty] = useState(false);
  const [amc, setAmc] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);
  const pErr = partyErrors(party);
  const errors = {
    ...pErr, product: product.trim().length < 2 ? 'Product ka naam likhein' : undefined,
    issue: issue.trim().length < 3 ? 'Kharabi likhein' : undefined, date: date && date < todayKey() ? 'Guzri hui date nahi' : undefined,
  };
  const bad = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: () => serviceRequestsApi.create({
      customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(), customerAddress: party.address.trim(), area: party.area.trim() || undefined,
      productId, productName: product.trim(), serialNumber: serial.trim() || undefined, serialTrackingId: serialId,
      serviceType: amc ? 'AMC_VISIT' : type, priority, reportedIssue: issue.trim(), scheduledDate: date || undefined, scheduledTimeSlot: slot || undefined,
      technicianId: tech || undefined, visitCharge: warranty || amc ? 0 : Number(visit) || 0, coveredUnderWarranty: warranty,
      coveredUnderAmc: !!amc, amcContractNumber: amc ?? undefined, internalNotes: notes.trim() || undefined,
    }),
    onSuccess: (r) => { toast.success(`Shikayat ${r.requestNumber} darj`); refresh(qc); onCreated(r); },
    onError: (e) => toast.error(apiError(e, 'Shikayat darj nahi hui')),
  });
  const submit = () => { setTried(true); if (!bad && !save.isPending) save.mutate(); };

  return (
    <Modal open onClose={onClose} size="lg" title="Nayi shikayat / repair" description="Serial likhein — warranty aur AMC khud check ho jati hai"
      footer={<>
        {tried && bad && <span className="mr-auto text-[0.8125rem] text-rose-700">Laal khane theek karein</span>}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} leftIcon={<Wrench className="h-4 w-4" />}>Darj karein</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } }}>
        <SerialLookup value={serial} onChange={(v) => { setSerial(v); setSerialId(undefined); setAmc(null); }} onFound={(r) => {
          const s = r.serial!;
          setSerialId(s.id); setProductId(s.productId); setProduct(s.product?.name ?? product); setCategory(s.product?.categoryType ?? null);
          setWarranty(!!r.warranty?.isValid);
          if (r.amc && r.amc.visitsLeft > 0) setAmc(r.amc.contractNumber);
          if (s.customerName && !party.name) setParty({ ...party, customerId: s.soldToCustomerId ?? undefined, name: s.customerName, phone: s.customerPhone ?? party.phone, address: s.deliveryAddress ?? party.address });
        }} />
        <Input label="Product" required value={product} onChange={(e) => { setProduct(e.target.value); setProductId(undefined); }} placeholder="Dawlance fridge 9175" error={tried ? errors.product : undefined} />
        <div>
          <Textarea label="Kya kharabi hai" required rows={2} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Cooling nahi kar raha" error={tried ? errors.issue : undefined} />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {issuesFor(category).map((x) => <button key={x} type="button" onClick={() => setIssue(x)} className="h-7 rounded-lg bg-slate-100 px-2 text-[0.75rem] text-slate-700 hover:bg-slate-200">{x}</button>)}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam</span><Chips options={REPAIR_TYPES.slice(0, 5).map((t) => ({ value: t, label: serviceTypeOf(t) }))} value={type} onChange={setType} /></div>
          <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitni jaldi</span><Chips options={PRIORITIES.map((p) => ({ value: p, label: priorityOf(p).label }))} value={priority} onChange={setPriority} /></div>
        </div>
        <CustomerFields value={party} onChange={setParty} errors={tried ? pErr : {}} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Visit ki date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
          <TechSelect value={tech} onChange={setTech} />
        </div>
        <SlotChips value={slot} onChange={setSlot} />
        <div className="space-y-3 rounded-xl p-3 ring-1 ring-slate-200">
          <Switch checked={warranty} onChange={(e) => setWarranty(e.target.checked)} label="Warranty me hai" description="Customer se paisa nahi; baad me company se claim karein" />
          {amc && <p className="flex items-center gap-1.5 text-[0.8125rem] text-violet-700"><ShieldCheck className="h-4 w-4" />AMC {amc} ki free visit lagegi. <button type="button" className="underline" onClick={() => setAmc(null)}>AMC na lagayein</button></p>}
          {!warranty && !amc && <Input label="Visit charge" inputMode="decimal" value={visit} onChange={(e) => setVisit(money(e.target.value))} placeholder="1000" hint="Mazdoori aur parts kaam ke baad likhein" />}
        </div>
        <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, customer sirf sham ko ghar" hint="Sirf dukaan ke liye" />
      </form>
    </Modal>
  );
}

/* ── Close the job ── */
function CompleteModal({ job, onClose }: { job: ServiceRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [diag, setDiag] = useState(job.diagnosedIssue ?? '');
  const [work, setWork] = useState(job.workDone ?? '');
  const [visit, setVisit] = useState(String(Number(job.visitCharge) || ''));
  const [labor, setLabor] = useState(String(Number(job.laborCharge) || ''));
  const [parts, setParts] = useState(String(Number(job.partsCharge) || ''));
  const [warranty, setWarranty] = useState(job.coveredUnderWarranty);
  const covered = warranty || job.coveredUnderAmc;
  const advance = Number(job.paidAmount) || 0;
  const total = (Number(visit) || 0) + (Number(labor) || 0) + (Number(parts) || 0);
  const owed = covered ? 0 : Math.max(total - advance, 0);
  const [now, setNow] = useState(String(owed || ''));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [follow, setFollow] = useState('');
  const [rating, setRating] = useState(0);
  const taken = Number(now) || 0;
  const tooMuch = advance + taken > total + 0.01;
  const left = covered ? 0 : Math.max(total - advance - taken, 0);
  const noWork = work.trim().length < 3;

  const save = useMutation({
    mutationFn: () => serviceRequestsApi.complete(job.id, {
      diagnosedIssue: diag.trim() || undefined, workDone: work.trim(), visitCharge: Number(visit) || 0, laborCharge: Number(labor) || 0, partsCharge: Number(parts) || 0,
      coveredUnderWarranty: warranty, paidAmount: advance + taken, paymentMethod: method,
      requiresFollowUp: !!follow, followUpDate: follow || undefined, customerRating: rating || undefined,
    }),
    onSuccess: () => { toast.success(`${job.requestNumber} theek ho gaya — bill ban gaya`); refresh(qc); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Band nahi hua')),
  });

  return (
    <Modal open onClose={onClose} size="md" title={`Kaam mukammal — ${job.requestNumber}`} description={`${job.productName} · ${job.reportedIssue}`}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={() => !tooMuch && !noWork && save.mutate()} disabled={tooMuch || noWork} loading={save.isPending} leftIcon={<Receipt className="h-4 w-4" />}>
          {left > 0 ? `Mukammal — ${formatPKR(left)} khata me` : 'Mukammal karein'}
        </Button>
      </>}>
      <div className="space-y-4">
        <Input label="Asal kharabi" value={diag} onChange={(e) => setDiag(e.target.value)} placeholder="Capacitor jal gaya tha" />
        <Textarea label="Kya kaam kiya" required rows={2} value={work} onChange={(e) => setWork(e.target.value)} placeholder="Capacitor badla, gas check ki" error={work && noWork ? 'Kaam likhein' : undefined} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Visit" inputMode="decimal" value={visit} onChange={(e) => setVisit(money(e.target.value))} />
          <Input label="Mazdoori" inputMode="decimal" value={labor} onChange={(e) => setLabor(money(e.target.value))} />
          <Input label="Parts" inputMode="decimal" value={parts} onChange={(e) => setParts(money(e.target.value))} hint="Parts ki qeemat" />
        </div>
        {!job.coveredUnderAmc && <Switch checked={warranty} onChange={(e) => setWarranty(e.target.checked)} label="Warranty me" description="Customer se kuch nahi; parts ka kharcha company se claim karein" />}
        {job.coveredUnderAmc && <p className="rounded-xl bg-violet-50 px-3 py-2 text-[0.8125rem] text-violet-800 ring-1 ring-violet-200">AMC {job.amcContractNumber} me — customer se kuch nahi, ek free visit kam hogi.</p>}
        <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.875rem]">
          <div className="flex justify-between"><dt className="text-slate-500">Kul kaam</dt><dd className="font-semibold tabular-nums">{formatPKR(total)}</dd></div>
          {advance > 0 && <div className="flex justify-between"><dt className="text-slate-500">Pehle mila</dt><dd className="tabular-nums">{formatPKR(advance)}</dd></div>}
          <div className="flex justify-between border-t border-slate-200 pt-1"><dt className="font-medium text-slate-700">Customer se lena</dt><dd className="text-lg font-bold tabular-nums">{formatPKR(owed)}</dd></div>
        </dl>
        {!covered && <>
          <Input label="Abhi kitna liya" inputMode="decimal" value={now} onChange={(e) => setNow(money(e.target.value))} error={tooMuch ? 'Kul kaam se zyada nahi' : undefined} />
          {taken > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
          {left > 0 && <p className="flex items-start gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{formatPKR(left)} {job.customerName} ke khata me udhaar.</p>}
        </>}
        <Input label="Dobara dekhna hai (follow-up)" type="date" value={follow} onChange={(e) => setFollow(e.target.value)} hint="Khali chhorein agar zaroorat nahi" />
        <div className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-slate-700">Rating</span>
          {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} star`} onClick={() => setRating(rating === n ? 0 : n)}><Star className={cn('h-5 w-5', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} /></button>)}
        </div>
      </div>
    </Modal>
  );
}

type Dialog = 'assign' | 'cancel' | 'pay' | 'complete' | 'unresolved' | null;

/* ── Job card ── */
export function RepairCard({ id, shopName, canManage, onClose }: { id: string; shopName: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: [SERVICE_KEY, 'one', id], queryFn: () => serviceRequestsApi.getOne(id) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const done = (msg: string) => { toast.success(msg); refresh(qc); setDialog(null); };
  const fail = (e: unknown) => toast.error(apiError(e, 'Nahi hua'));
  const assign = useMutation({ mutationFn: (v: { technicianId: string; scheduledDate?: string; scheduledTimeSlot?: string }) => serviceRequestsApi.assignTechnician(id, v), onSuccess: () => done('Technician lag gaya'), onError: fail });
  const status = useMutation({ mutationFn: (v: { status: string; notes?: string }) => serviceRequestsApi.updateStatus(id, { status: v.status as ApplianceServiceStatus, notes: v.notes }), onSuccess: () => done('Halat badal gayi'), onError: fail });
  const cancel = useMutation({ mutationFn: (reason: string) => serviceRequestsApi.cancel(id, { reason }), onSuccess: () => done('Shikayat cancel'), onError: fail });
  const pay = useMutation({ mutationFn: (v: { amount: number; paymentMethod: string; note?: string }) => serviceRequestsApi.addPayment(id, v), onSuccess: () => done('Paisa mil gaya'), onError: fail });
  const claim = useMutation({ mutationFn: () => warrantyClaimsApi.fromService(id), onSuccess: (c) => done(`Claim ${c.claimNumber} ban gaya — Warranty claims me bhejein`), onError: fail });

  const r = q.data as ServiceRequestDetail | undefined;
  const open = !!r && SERVICE_OPEN.includes(r.status);
  const due = r ? repairDue(r) : 0;
  const wa = r ? waLink(r.customerPhone, repairMessage(r, shopName)) : undefined;

  return (
    <Modal open onClose={onClose} size="lg" title={r ? `${r.requestNumber} — ${r.productName}` : 'Shikayat'} description={r ? `${r.customerName} · ${r.customerPhone}` : undefined}
      footer={r && <>
        <Button variant="ghost" leftIcon={<Printer className="h-4 w-4" />} onClick={() => printRepairJob(r, shopName)}>Parchi</Button>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        <span className="flex-1" />
        {canManage && due > 0 && r.status !== 'CANCELLED' && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>{r.status === 'COMPLETED' ? 'Baqi lein' : 'Advance lein'}</Button>}
        {canManage && r.status === 'COMPLETED' && r.coveredUnderWarranty && !r.warrantyClaimNumber && <Button variant="secondary" leftIcon={<Send className="h-4 w-4" />} loading={claim.isPending} onClick={() => claim.mutate()}>Company se claim</Button>}
        {canManage && open && <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setDialog('complete')}>Mukammal</Button>}
      </>}>
      {!r ? <Skeleton className="h-60 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill meta={serviceStatusOf(r.status)} />
            {r.priority !== 'NORMAL' && <Pill meta={priorityOf(r.priority)} />}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">{serviceTypeOf(r.serviceType)}</span>
            {r.coveredUnderWarranty && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200"><ShieldCheck className="h-3 w-3" />Warranty</span>}
            {r.coveredUnderAmc && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 ring-1 ring-violet-200">AMC {r.amcContractNumber}</span>}
            {r.warrantyClaimNumber && <Link to="/appliances/warranty-claims" className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.6875rem] font-medium text-blue-700 ring-1 ring-blue-200">Claim {r.warrantyClaimNumber}</Link>}
          </div>
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] text-amber-900 ring-1 ring-amber-200"><strong>Shikayat:</strong> {r.reportedIssue}</p>
          <dl className="grid gap-x-6 gap-y-2 text-[0.875rem] sm:grid-cols-2">
            <Row k="Pata" v={[r.customerAddress, r.area, r.city].filter(Boolean).join(', ')} />
            <Row k="Serial" v={r.serialNumber} />
            <Row k="Darj" v={dateTime(r.requestedAt)} />
            <Row k="Visit" v={r.scheduledDate ? `${dayOnly(r.scheduledDate)} ${slotLabel(r.scheduledTimeSlot)}` : 'Abhi tay nahi'} />
            <Row k="Technician" v={r.technicianName ? `${r.technicianName}${r.technicianPhone ? ` · ${r.technicianPhone}` : ''}` : 'Abhi nahi laga'} />
            {r.diagnosedIssue && <Row k="Asal kharabi" v={r.diagnosedIssue} />}
            {r.workDone && <Row k="Kya kiya" v={r.workDone} />}
            {r.completedAt && <Row k="Mukammal" v={dateTime(r.completedAt)} />}
            {r.followUpDate && <Row k="Follow-up" v={dayOnly(r.followUpDate)} />}
          </dl>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Money k="Visit" v={r.visitCharge} /><Money k="Mazdoori" v={r.laborCharge} /><Money k="Parts" v={r.partsCharge} />
            <Money k={due > 0 ? 'Baqi' : 'Mila'} v={due > 0 ? due : r.paidAmount} tone={due > 0 ? 'text-amber-700' : 'text-emerald-700'} />
          </dl>
          {r.amc && <p className="text-[0.8125rem] text-violet-700">AMC {r.amc.contractNumber}: {Math.max(r.amc.freeVisitsAllowed - r.amc.freeVisitsUsed, 0)} free visit baqi · {dayOnly(r.amc.expiryDate)} tak</p>}
          {r.status === 'COMPLETED' && <p className="text-[0.8125rem] text-slate-600">Bill <Link className="font-semibold text-brand-700 hover:underline" to={`/sales?search=${encodeURIComponent(r.requestNumber)}`}>{r.requestNumber}</Link> Sales, galla aur khata me hai. Galat ho to Sales se void karein — kaam dobara khul jayega.</p>}
          {canManage && open && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="secondary" leftIcon={<CalendarClock className="h-4 w-4" />} onClick={() => setDialog('assign')}>{r.technicianId ? 'Technician / date badlein' : 'Technician lagayein'}</Button>
              {(SERVICE_NEXT[r.status] ?? []).filter((s) => s !== 'UNRESOLVED').map((s) => (
                <Button key={s} size="sm" variant="secondary" loading={status.isPending && status.variables?.status === s} onClick={() => status.mutate({ status: s })}>{serviceStatusOf(s).label}</Button>
              ))}
              {(SERVICE_NEXT[r.status] ?? []).includes('UNRESOLVED') && <Button size="sm" variant="ghost" onClick={() => setDialog('unresolved')}>Theek nahi hua</Button>}
              <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setDialog('cancel')}>Cancel</Button>
            </div>
          )}
          {r.internalNotes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{r.internalNotes}</pre>}
          {r.history?.length > 0 && (
            <div>
              <p className="text-[0.8125rem] font-semibold text-slate-800">Is customer / unit ki pichli shikayatein</p>
              <ul className="mt-1 divide-y divide-slate-100 text-[0.8125rem]">
                {r.history.slice(0, 5).map((h) => <li key={h.id} className="flex justify-between gap-2 py-1.5"><span className="truncate">{h.requestNumber} · {h.reportedIssue}</span><span className="shrink-0 text-slate-500">{serviceStatusOf(h.status).label} · {dayOnly(h.completedAt ?? h.requestedAt)}</span></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {r && dialog === 'assign' && <AssignModal title="Technician aur date" initial={{ technicianId: r.technicianId, date: r.scheduledDate, slot: r.scheduledTimeSlot }} pending={assign.isPending} onConfirm={(v) => assign.mutate(v)} onClose={() => setDialog(null)} />}
      {r && dialog === 'cancel' && <ReasonModal title="Shikayat cancel" confirm="Cancel karein" pending={cancel.isPending} presets={['Customer ne mana kar diya', 'Khud theek ho gaya', 'Dobara darj ho gayi']} onConfirm={(x) => cancel.mutate(x)} onClose={() => setDialog(null)} />}
      {r && dialog === 'unresolved' && <ReasonModal title="Theek nahi hua" confirm="Darj karein" pending={status.isPending} presets={['Part nahi mila', 'Company service center bhejna hai', 'Customer ne repair nahi karwaya']} onConfirm={(x) => status.mutate({ status: 'UNRESOLVED', notes: x })} onClose={() => setDialog(null)} />}
      {r && dialog === 'pay' && <PayModal title={`Paisa lein — ${r.requestNumber}`} description={r.status === 'COMPLETED' ? 'Bill ka udhaar kam hoga' : 'Advance khata me jama, bill banne par lag jayega'} due={due} pending={pay.isPending} onConfirm={(v) => pay.mutate(v)} onClose={() => setDialog(null)} />}
      {r && dialog === 'complete' && <CompleteModal job={r} onClose={() => setDialog(null)} />}
    </Modal>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  return <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">{k}</dt><dd className="min-w-0 text-slate-900">{v || '—'}</dd></div>;
}
function Money({ k, v, tone = 'text-slate-900' }: { k: string; v: number; tone?: string }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className={cn('font-bold tabular-nums', tone)}>{formatPKR(Number(v) || 0)}</dd></div>;
}
