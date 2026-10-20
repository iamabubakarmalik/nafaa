/**
 * One live animal: photos, facts, health record and money. From here the
 * shop holds it for a customer, writes a vaccine or vet visit (a fee paid
 * now is a shop expense), sends it to the counter to sell, or closes the
 * record when it goes back or dies (its cost becomes a loss).
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, CalendarClock, HeartPulse, Home, Pencil, Plus, ShieldCheck, ShoppingCart, Skull, Stethoscope, Tag, Undo2, Wallet,
} from 'lucide-react';
import { Button, Card, Input, Modal, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { liveAnimalsApi, type PetLiveAnimal, type PetSaleStatus } from '../api/live-animals.api';
import { ConfirmModal, Empty, Info, Pill } from '../components/ui';
import { useSaveKey } from '../hooks/usePageKeys';
import { ANIMAL_STATUS, MONEY_KEYS, PAY_METHODS, PET_KEYS, ageText, dayKey, daysFromToday, errorText, longDate, numIn, shortDate, speciesLabel } from '../lib/meta';

const RECORD_TYPES = [
  { value: 'VACCINATION', label: 'Vaccine' }, { value: 'DEWORMING', label: 'Deworming' }, { value: 'VET_VISIT', label: 'Doctor visit' },
  { value: 'TREATMENT', label: 'Ilaj' }, { value: 'OTHER', label: 'Aur' },
];
const typeLabel = (v: string) => RECORD_TYPES.find((t) => t.value === v)?.label ?? v;

export default function LiveAnimalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sales: money, cost: costMoney, costHidden } = useMasked();
  const canEdit = usePermission(PERMISSIONS.PRODUCTS_EDIT);
  const canSell = usePermission(PERMISSIONS.POS_USE);
  const [photo, setPhoto] = useState(0);
  const [dialog, setDialog] = useState<'record' | 'reserve' | 'DECEASED' | 'RETURNED' | null>(null);

  const q = useQuery({ queryKey: [PET_KEYS.animal, id], queryFn: () => liveAnimalsApi.getOne(id!), enabled: !!id });
  const a = q.data;
  const refresh = () => [PET_KEYS.animal, PET_KEYS.animals, 'petshop-pos-animals', 'petshop-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const reserve = useMutation({
    mutationFn: (name?: string) => liveAnimalsApi.reserve(id!, name),
    onSuccess: () => { refresh(); setDialog(null); toast.success('Rok liya — counter par "Rok liya" dikhega'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const unreserve = useMutation({
    mutationFn: () => liveAnimalsApi.unreserve(id!),
    onSuccess: () => { refresh(); toast.success('Dobara bikne ke liye'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });
  const close = useMutation({
    mutationFn: ({ status, reason }: { status: PetSaleStatus; reason?: string }) => liveAnimalsApi.updateStatus(id!, { status, reason }),
    onSuccess: (r) => { refresh(); setDialog(null); toast.success(r.status === 'DECEASED' ? 'Likh diya — cost loss me gayi' : 'Record band — counter se hat gaya'); },
    onError: (e) => toast.error(errorText(e, 'Nahi hua')),
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-2xl" /><Skeleton className="h-80 rounded-2xl" /></div></PageShell>;
  if (!a) return <PageShell><Empty icon={HeartPulse} title="Ye janwar nahi mila" action={<Button variant="secondary" onClick={() => navigate('/petshop/live-animals')}>Wapas</Button>} /></PageShell>;

  const onSale = a.status === 'AVAILABLE' || a.status === 'RESERVED';
  const inStore = daysFromToday(a.acquiredDate);
  const title = a.name || a.breed || speciesLabel(a.species);
  const history = [...(a.medicalHistory ?? [])].reverse();
  const nextDue = history.map((h) => h.nextDueDate).filter((v): v is string => !!v).sort()[0];

  const card = (): PrintDoc => ({
    title: `${title} (${a.animalNumber})`, subtitle: [speciesLabel(a.species), a.breed, ageText(a.ageMonths)].filter(Boolean).join(' · '),
    meta: [['Rate', money(a.askingPrice)], ['Vaccine', a.isVaccinated ? 'Haan' : 'Nahi'], ['Deworm', a.isDewormed ? 'Haan' : 'Nahi']],
    sections: [
      { kind: 'rows', title: 'Janwar', rows: [
        { label: 'Jins', value: a.gender || '—' }, { label: 'Rang', value: a.color || '—' }, { label: 'Wazan', value: a.weightKg ? `${a.weightKg} kg` : '—' },
        { label: 'Vaccine', value: a.vaccinationDetails || (a.isVaccinated ? 'Haan' : 'Nahi') }, { label: 'Deworming', value: a.dewormingDetails || (a.isDewormed ? 'Haan' : 'Nahi') },
      ] },
      ...(history.length ? [{ kind: 'table' as const, title: 'Sehat record', columns: [{ label: 'Date' }, { label: 'Kya' }, { label: 'Agli baar' }], rows: history.map((h) => [shortDate(h.at), `${typeLabel(h.type)}: ${h.description}`, h.nextDueDate ? shortDate(h.nextDueDate) : '—']) }] : []),
    ],
  });

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate('/petshop/live-animals')} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{title} <span className="font-mono text-[0.875rem] font-normal text-white/70">{a.animalNumber}</span></h1>
          <p className="text-[0.8125rem] text-white/75">{[speciesLabel(a.species), a.breed, a.gender, ageText(a.ageMonths)].filter(Boolean).join(' · ')}</p>
        </div>
        <Pill tone={ANIMAL_STATUS[a.status]?.tone ?? ''}>{ANIMAL_STATUS[a.status]?.label}</Pill>
        <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={card} label="Card print" /></span>
        {canEdit && onSale && <Link to={`/petshop/live-animals/${a.id}/edit`} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-3 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><Pencil className="h-4 w-4" />Badlein</Link>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl" flush>
            <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-t-2xl bg-amber-50 text-6xl">
              {a.imageUrls?.[photo] ? <img src={a.imageUrls[photo]} alt={title} className="h-full w-full object-cover" /> : speciesLabel(a.species).split(' ')[0]}
            </div>
            {a.imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {a.imageUrls.map((u, i) => <button key={u} type="button" onClick={() => setPhoto(i)} className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2', i === photo ? 'ring-brand-600' : 'ring-transparent')}><img src={u} alt="" className="h-full w-full object-cover" /></button>)}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-600" />Paisa</span>}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label={a.status === 'SOLD' ? 'Bika' : 'Rate'} value={money(a.status === 'SOLD' ? a.soldPrice ?? 0 : a.askingPrice)} />
              {!costHidden && <Stat label="Cost" value={costMoney(a.costPrice ?? 0)} />}
              {!costHidden && <Stat label="Profit" value={costMoney((a.status === 'SOLD' ? a.soldPrice ?? 0 : a.askingPrice) - (a.costPrice ?? 0))} tone={(a.status === 'SOLD' ? a.soldPrice ?? 0 : a.askingPrice) >= (a.costPrice ?? 0) ? 'text-emerald-700' : 'text-rose-700'} />}
              <Stat label="Dukaan me" value={inStore === null ? '—' : `${-inStore} din`} tone={inStore !== null && -inStore > 60 && onSale ? 'text-amber-700' : undefined} />
            </div>
            {a.status === 'SOLD' && <p className="mt-3 text-[0.8125rem] text-slate-600">{longDate(a.soldAt)}{a.soldToCustomerName ? ` · ${a.soldToCustomerName}` : ''}</p>}
            {onSale && canSell && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/pos" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.875rem] font-semibold text-brand-fg hover:bg-brand-700"><ShoppingCart className="h-4 w-4" />Counter par bechein</Link>
                {a.status === 'AVAILABLE'
                  ? <Button variant="secondary" onClick={() => setDialog('reserve')}><Tag className="h-4 w-4" />Rok lein</Button>
                  : <Button variant="secondary" loading={unreserve.isPending} onClick={() => unreserve.mutate()}><Undo2 className="h-4 w-4" />Rokna khatam</Button>}
              </div>
            )}
            {onSale && canSell && <p className="mt-2 text-[0.75rem] text-slate-500">Counter par "Janwar" filter me {a.animalNumber} ka card dabayein — bill banta hai.</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={ShieldCheck} title="Vaccine / deworming">
              <p className={a.isVaccinated ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{a.isVaccinated ? 'Vaccine lagi' : 'Vaccine nahi lagi'}</p>
              {a.vaccinationDetails && <p className="whitespace-pre-line text-[0.8125rem] text-slate-600">{a.vaccinationDetails}</p>}
              <p className={a.isDewormed ? 'mt-1 font-semibold text-emerald-700' : 'mt-1 font-semibold text-amber-700'}>{a.isDewormed ? 'Deworming hui' : 'Deworming baqi'}</p>
              {nextDue && <p className="mt-1 inline-flex items-center gap-1 text-[0.8125rem] text-slate-700"><CalendarClock className="h-3.5 w-3.5" />Agli baar {shortDate(nextDue)}</p>}
            </Info>
            <Info icon={Home} title="Dukaan me">
              <p className="text-slate-800">{a.currentCage ? `Cage ${a.currentCage}` : 'Cage nahi likha'}</p>
              {a.feedingSchedule && <p className="text-[0.8125rem] text-slate-600">Khana: {a.feedingSchedule}</p>}
              {a.specialNeeds && <p className="text-[0.8125rem] text-slate-600">{a.specialNeeds}</p>}
              {(a.sourceType || a.sourceName) && <p className="text-[0.8125rem] text-slate-500">{[a.sourceType, a.sourceName].filter(Boolean).join(' · ')} · {shortDate(a.acquiredDate)}</p>}
            </Info>
          </div>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Stethoscope className="h-4 w-4 text-brand-600" />Sehat record</span>}
            actions={canEdit && a.status !== 'DECEASED' ? <Button size="sm" variant="secondary" onClick={() => setDialog('record')}><Plus className="h-4 w-4" />Record likhein</Button> : undefined}>
            {history.length === 0 ? <p className="text-[0.875rem] text-slate-500">Abhi koi record nahi. Vaccine, deworming ya doctor visit yahan likhein.</p> : (
              <ul className="divide-y divide-slate-100">
                {history.map((h, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{typeLabel(h.type)} <span className="font-normal text-slate-500">· {shortDate(h.at)}</span></p>
                      <p className="text-[0.8125rem] text-slate-600">{h.description}{h.vetName ? ` · ${h.vetName}` : ''}</p>
                      {h.nextDueDate && <p className="text-[0.75rem] text-slate-500">Agli baar: {shortDate(h.nextDueDate)}</p>}
                    </div>
                    {!!h.cost && <span className="shrink-0 text-[0.8125rem] tabular-nums text-slate-700">{costMoney(h.cost)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {(a.healthNotes || a.notes) && <Card className="rounded-2xl"><p className="whitespace-pre-line text-[0.875rem] text-slate-600">{[a.healthNotes, a.notes].filter(Boolean).join('\n\n')}</p></Card>}

          {canEdit && onSale && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setDialog('RETURNED')}><Undo2 className="h-4 w-4" />Wapas gaya</Button>
              <Button variant="secondary" size="sm" onClick={() => setDialog('DECEASED')}><Skull className="h-4 w-4" />Mar gaya</Button>
            </div>
          )}
        </div>
      </div>

      {dialog === 'record' && <RecordModal animal={a} onClose={() => setDialog(null)} onSaved={() => { refresh(); setDialog(null); }} />}
      {dialog === 'reserve' && <ReserveModal busy={reserve.isPending} onSubmit={(name) => reserve.mutate(name)} onClose={() => setDialog(null)} />}
      {(dialog === 'DECEASED' || dialog === 'RETURNED') && (
        <CloseModal kind={dialog} cost={costHidden ? null : a.costPrice ?? 0} money={costMoney} busy={close.isPending}
          onSubmit={(reason) => close.mutate({ status: dialog, reason })} onClose={() => setDialog(null)} />
      )}
    </PageShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
      <p className="text-[0.75rem] text-slate-500">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums text-slate-900', tone)}>{value}</p>
    </div>
  );
}

function RecordModal({ animal, onClose, onSaved }: { animal: PetLiveAnimal; onClose: () => void; onSaved: () => void }) {
  const canExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const [type, setType] = useState('VACCINATION');
  const [description, setDescription] = useState('');
  const [vetName, setVetName] = useState('');
  const [cost, setCost] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [paidNow, setPaidNow] = useState(false);
  const [method, setMethod] = useState('CASH');
  const [touched, setTouched] = useState(false);
  const fee = numIn(cost);
  const errors: string[] = [];
  if (!description.trim()) errors.push('Kya kiya — likhein');
  if (cost && !(fee !== null && fee >= 0)) errors.push('Fees sahi likhein');
  if (nextDueDate && nextDueDate < dayKey()) errors.push('Agli date aage ki ho');
  const save = useMutation({
    mutationFn: () => liveAnimalsApi.addMedicalRecord(animal.id, {
      type, description: description.trim(), vetName: vetName.trim() || undefined, cost: fee ?? undefined, nextDueDate: nextDueDate || undefined,
      ...(paidNow && fee && fee > 0 && { paidNow: true, paymentMethod: method }),
    }),
    onSuccess: () => { toast.success(paidNow && fee ? 'Record likha — fees kharche me gayi' : 'Record likh diya'); onSaved(); },
    onError: (e) => toast.error(errorText(e, 'Record save nahi hua')),
  });
  const submit = () => { setTouched(true); if (errors.length) { toast.error(errors[0]); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  return (
    <Modal open onClose={onClose} size="md" title="Sehat record" description={`${animal.name || animal.breed || ''} ${animal.animalNumber}`}
      footer={<>{touched && errors[0] && <p className="mr-auto text-[0.8125rem] text-amber-800">{errors[0]}</p>}<Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={submit}>Save karein</Button></>}>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Select label="Kya hua" value={type} onChange={(e) => setType(e.target.value)} options={RECORD_TYPES} />
        <Input label="Doctor (marzi)" value={vetName} onChange={(e) => setVetName(e.target.value)} />
        <div className="sm:col-span-2"><Input label="Tafseel" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="DHPP pehli dose, Ivermectin…" /></div>
        <Input label="Fees (Rs, marzi)" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
        <Input label="Agli dose kab (marzi)" type="date" min={dayKey()} value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} hint="Yaad dilane ke liye" />
        {!!fee && fee > 0 && canExpense && (
          <div className="space-y-2 sm:col-span-2">
            <Switch label="Fees abhi di (kharche me likhein)" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
            {paidNow && <Select label="Kahan se di" value={method} onChange={(e) => setMethod(e.target.value)} options={PAY_METHODS} hint={method === 'CASH' ? 'Drawer ke cash se' : 'Us account se'} />}
          </div>
        )}
      </form>
    </Modal>
  );
}

function ReserveModal({ busy, onSubmit, onClose }: { busy: boolean; onSubmit: (name?: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title="Kisi ke liye rok lein" description="Counter par card par 'Rok liya' aata hai"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={busy} onClick={() => onSubmit(name.trim() || undefined)}>Rok lein</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(name.trim() || undefined); }}>
        <Input label="Kis ke liye (marzi)" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer ka naam aur phone" hint="Advance lena ho to customer ke Khata me jama karein" />
      </form>
    </Modal>
  );
}

function CloseModal({ kind, cost, money, busy, onSubmit, onClose }: {
  kind: 'DECEASED' | 'RETURNED'; cost: number | null; money: (n: number) => string; busy: boolean; onSubmit: (reason?: string) => void; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const dead = kind === 'DECEASED';
  return (
    <ConfirmModal title={dead ? 'Janwar mar gaya?' : 'Janwar wapas gaya?'} cta={dead ? 'Haan, likhein' : 'Haan, wapas'} danger busy={busy} onClose={onClose}
      onConfirm={() => onSubmit(reason.trim() || undefined)}
      text={<div className="space-y-3">
        <p>{dead ? `Counter se hat jayega${cost !== null ? ` aur ${money(cost)} cost loss me jayegi` : ' aur cost loss me jayegi'}.` : 'Counter se hat jayega (breeder ko wapas ya kisi aur wajah se). Record rehta hai.'}</p>
        <Textarea label="Wajah (marzi)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>} />
  );
}
