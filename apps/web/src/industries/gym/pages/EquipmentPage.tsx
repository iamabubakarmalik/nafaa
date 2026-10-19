/**
 * Machines: treadmills, cycles, racks and weights, with where they stand,
 * when the next service is due and what repairs cost. A repair paid now is
 * written as an expense (cash from the drawer), so it shows in the day book
 * and profit.
 *
 * Keys: N new machine · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Activity, AlertTriangle, Filter, GraduationCap, Pencil, Plus, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Badge, Button, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch,
  Table, TBody, Td, Textarea, Th, THead, Tr, heroIconButton, heroPrimaryButton, type BadgeVariant,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { equipmentApi, type Equipment, type EquipmentCategory, type EquipmentStatus } from '../api/equipment.api';
import { EmptyList, ListSkeleton, LoadFailed, Panel } from '../components/ui';
import { GYM_KEYS, apiError, dateOf, daysLeft, num, opt } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

const CATS: Array<{ value: EquipmentCategory; label: string }> = [
  { value: 'CARDIO', label: 'Cardio (treadmill, cycle)' }, { value: 'STRENGTH', label: 'Strength' }, { value: 'MACHINES', label: 'Machines' },
  { value: 'FREE_WEIGHTS', label: 'Dumbbell / plates' }, { value: 'FUNCTIONAL', label: 'Functional' }, { value: 'CROSSFIT', label: 'CrossFit' },
  { value: 'BOXING', label: 'Boxing' }, { value: 'YOGA_MAT', label: 'Yoga mat' }, { value: 'ACCESSORIES', label: 'Accessories' }, { value: 'OTHER', label: 'Doosra' },
];
const STATUS: Record<EquipmentStatus, { label: string; variant: BadgeVariant }> = {
  AVAILABLE: { label: 'Theek', variant: 'success' }, IN_USE: { label: 'Istemal me', variant: 'info' }, MAINTENANCE: { label: 'Service me', variant: 'warning' },
  OUT_OF_ORDER: { label: 'Kharab', variant: 'danger' }, RESERVED: { label: 'Rakha hua', variant: 'default' }, RETIRED: { label: 'Hata diya', variant: 'default' },
};
const catLabel = (c: string) => CATS.find((x) => x.value === c)?.label ?? c;

export default function EquipmentPage() {
  const can = useGymCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [edit, setEdit] = useState<Equipment | 'new' | null>(null);
  const [service, setService] = useState<Equipment | null>(null);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const q = useQuery({ queryKey: [GYM_KEYS.equipment, query, category, status], queryFn: () => equipmentApi.list({ search: query || undefined, category: category || undefined, status: status || undefined }), placeholderData: (p) => p });
  const sQ = useQuery({ queryKey: [GYM_KEYS.equipment, 'summary'], queryFn: equipmentApi.summary });
  const rows = q.data ?? [];
  const s = sQ.data;
  const total = (s?.byCategory ?? []).reduce((x, c) => x + c._count._all, 0);
  const st = (k: EquipmentStatus) => s?.byStatus.find((x) => x.status === k)?._count._all ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.machines) { e.preventDefault(); setEdit('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title="Machines"
        chip={<><Activity /> Gym</>}
        meta="Kaunsi machine theek hai, kis ki service aa gayi"
        busy={q.isFetching && !q.isLoading}
        loading={sQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.machines && <button type="button" onClick={() => setEdit('new')} title="Nayi machine (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi machine</button>}
        </>}
        stats={[{ label: 'Machines', value: total }, { label: 'Service aa gayi', value: s?.needsMaintenance ?? 0 }, { label: 'Kharab', value: st('OUT_OF_ORDER') }]}
      />

      <KpiRow cols={3}>
        {sQ.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Activity} color="#16a34a" label="Theek" value={st('AVAILABLE') + st('IN_USE')} onClick={() => setStatus(status === 'AVAILABLE' ? '' : 'AVAILABLE')} active={status === 'AVAILABLE'} />
          <KpiCard icon={Wrench} color={(s?.needsMaintenance ?? 0) ? '#d97706' : '#64748b'} label="Service aa gayi" value={s?.needsMaintenance ?? 0} hint="Date guzar gayi" />
          <KpiCard icon={AlertTriangle} color="#e11d48" label="Kharab / service me" value={st('OUT_OF_ORDER') + st('MAINTENANCE')} onClick={() => setStatus(status === 'OUT_OF_ORDER' ? '' : 'OUT_OF_ORDER')} active={status === 'OUT_OF_ORDER'} />
        </>}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, brand, EQ number ya serial…" />}
        chips={category || status ? <>
          {category && <FilterChip onRemove={() => setCategory('')}>{catLabel(category)}</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{STATUS[status as EquipmentStatus]?.label}</FilterChip>}
        </> : undefined}
        onClear={() => { setCategory(''); setStatus(''); setSearch(''); }}>
        <FilterMenu icon={Filter} label={category ? catLabel(category) : 'Category'} value={category} active={!!category} onChange={setCategory} options={[{ value: '', label: 'Sab' }, ...CATS]} />
        <FilterMenu icon={Wrench} label={status ? STATUS[status as EquipmentStatus].label : 'Haal'} value={status} active={!!status} onChange={setStatus}
          options={[{ value: '', label: 'Sab' }, ...(Object.keys(STATUS) as EquipmentStatus[]).filter((k) => k !== 'RETIRED').map((k) => ({ value: k, label: STATUS[k].label }))]} />
      </FilterBar>

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what="Machines" retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={Activity} title="Koi machine nahi" text="Machines likhein taake service ki date yaad rahe aur repair ka kharcha hisaab me aaye.">
          {can.machines && <Button onClick={() => setEdit('new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi machine</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="48rem">
            <THead><Tr><Th>Machine</Th><Th>Category</Th><Th>Haal</Th><Th>Agli service</Th><Th align="right">Repair kharcha</Th><Th /></Tr></THead>
            <TBody>{rows.map((e) => {
              const due = e.nextMaintenanceDate ? daysLeft(e.nextMaintenanceDate) : null;
              return (
                <Tr key={e.id}>
                  <Td><p className="font-medium text-slate-900">{e.name}</p><p className="text-[0.75rem] text-slate-500">{e.equipmentNumber}{e.brand ? ` · ${e.brand}` : ''}{e.roomName ? ` · ${e.roomName}` : ''}</p></Td>
                  <Td>{catLabel(e.category)}</Td>
                  <Td><Badge size="xs" variant={STATUS[e.status].variant}>{STATUS[e.status].label}</Badge></Td>
                  <Td>{e.nextMaintenanceDate ? <>{dateOf(e.nextMaintenanceDate)}{due != null && due <= 0 && <div><Badge size="xs" variant="warning">Service aa gayi</Badge></div>}</> : '—'}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(e.totalMaintenanceCost)}</Td>
                  <Td align="right">{can.machines && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="secondary" leftIcon={<Wrench className="h-3.5 w-3.5" />} onClick={() => setService(e)}>Service</Button>
                      <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(e)}>Badlein</Button>
                    </div>
                  )}</Td>
                </Tr>
              );
            })}</TBody>
          </Table>
        </Panel>
      )}

      {edit && <MachineModal machine={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
      {service && <ServiceModal machine={service} onClose={() => setService(null)} />}

      {guide.isOpen && (
        <PageGuide title="Machines — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Machine', text: 'Naam, category aur kitne din baad service. Number khud banta hai (EQ-0001).' },
            { icon: Wrench, color: '#d97706', title: 'Service', text: 'Service ya repair ho to "Service" dabayein. Paisa abhi diya to kharcha ban jata hai — cash drawer se nikalta hai.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Kharab', text: 'Machine kharab ho to Haal "Kharab" karein taake members ko bata sakein.' },
          ]}
          shortcuts={[['N', 'nayi machine'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function MachineModal({ machine, onClose }: { machine: Equipment | null; onClose: () => void }) {
  const qc = useQueryClient();
  const d = (v?: string | null) => (v ? v.slice(0, 10) : '');
  const [f, setF] = useState({
    name: machine?.name ?? '', category: (machine?.category ?? 'CARDIO') as EquipmentCategory, status: (machine?.status ?? 'AVAILABLE') as EquipmentStatus,
    brand: machine?.brand ?? '', model: machine?.model ?? '', serialNumber: machine?.serialNumber ?? '', roomName: machine?.roomName ?? '',
    purchaseDate: d(machine?.purchaseDate), purchasePrice: machine?.purchasePrice != null ? String(machine.purchasePrice) : '', vendorName: machine?.vendorName ?? '',
    warrantyExpiry: d(machine?.warrantyExpiry), maintenanceIntervalDays: machine?.maintenanceIntervalDays ? String(machine.maintenanceIntervalDays) : '90',
    nextMaintenanceDate: d(machine?.nextMaintenanceDate), notes: machine?.notes ?? '',
  });
  const [retire, setRetire] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const error = f.name.trim().length < 2 ? 'Machine ka naam likhein' : undefined;
  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: f.name.trim(), category: f.category, status: f.status, brand: opt(f.brand), model: opt(f.model), serialNumber: opt(f.serialNumber), roomName: opt(f.roomName),
        purchaseDate: opt(f.purchaseDate), purchasePrice: f.purchasePrice ? Number(f.purchasePrice) : undefined, vendorName: opt(f.vendorName), warrantyExpiry: opt(f.warrantyExpiry),
        maintenanceIntervalDays: Number(f.maintenanceIntervalDays) || undefined, nextMaintenanceDate: opt(f.nextMaintenanceDate), notes: opt(f.notes),
      };
      return machine ? equipmentApi.update(machine.id, body) : equipmentApi.create(body);
    },
    onSuccess: () => { toast.success('Machine save ho gayi'); qc.invalidateQueries({ queryKey: [GYM_KEYS.equipment] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const remove = useMutation({
    mutationFn: () => equipmentApi.remove(machine!.id),
    onSuccess: () => { toast.success('Machine hata di — record rehta hai'); qc.invalidateQueries({ queryKey: [GYM_KEYS.equipment] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title={machine ? `${machine.name} — badlein` : 'Nayi machine'}
      footer={<>
        {machine && (retire
          ? <Button variant="danger" className="mr-auto" loading={remove.isPending} onClick={() => remove.mutate()}>Haan, hata dein</Button>
          : <Button variant="ghost" className="mr-auto" onClick={() => setRetire(true)}>Bech di / hata di</Button>)}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input wrapperClassName="sm:col-span-2" label="Naam" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Treadmill 1" maxLength={120} />
        <Select label="Category" value={f.category} onChange={(e) => set('category', e.target.value as EquipmentCategory)} options={CATS} />
        <Select label="Haal" value={f.status} onChange={(e) => set('status', e.target.value as EquipmentStatus)} options={(Object.keys(STATUS) as EquipmentStatus[]).filter((k) => k !== 'RETIRED').map((k) => ({ value: k, label: STATUS[k].label }))} />
        <Input label="Brand" value={f.brand} onChange={(e) => set('brand', e.target.value)} hint="Marzi hai" />
        <Input label="Model" value={f.model} onChange={(e) => set('model', e.target.value)} hint="Marzi hai" />
        <Input label="Serial number" value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} hint="Warranty claim ke liye" />
        <Input label="Kamra / jagah" value={f.roomName} onChange={(e) => set('roomName', e.target.value)} placeholder="Cardio hall" />
        <Input label="Kis se li" value={f.vendorName} onChange={(e) => set('vendorName', e.target.value)} hint="Marzi hai" />
        <Input label="Kab li" type="date" value={f.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} />
        <Input label="Qeemat (Rs)" inputMode="decimal" value={f.purchasePrice} onChange={(e) => set('purchasePrice', num(e.target.value))} hint="Sirf record — kharcha nahi banta" />
        <Input label="Warranty kab tak" type="date" value={f.warrantyExpiry} onChange={(e) => set('warrantyExpiry', e.target.value)} />
        <Input label="Har kitne din service" inputMode="numeric" value={f.maintenanceIntervalDays} onChange={(e) => set('maintenanceIntervalDays', e.target.value.replace(/\D/g, ''))} />
        <Input label="Agli service" type="date" value={f.nextMaintenanceDate} onChange={(e) => set('nextMaintenanceDate', e.target.value)} />
        <Textarea wrapperClassName="sm:col-span-3" label="Note" value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={2} maxLength={2000} hint="Marzi hai" />
      </div>
    </Modal>
  );
}

function ServiceModal({ machine, onClose }: { machine: Equipment; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useGymCan();
  const [cost, setCost] = useState('');
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [next, setNext] = useState('');
  const [notes, setNotes] = useState('');
  const amount = Number(cost) || 0;
  const save = useMutation({
    mutationFn: () => equipmentApi.maintenance(machine.id, { cost: amount, notes: opt(notes), nextDate: opt(next), paid: paid && amount > 0, paymentMethod: method }),
    onSuccess: () => { toast.success(paid && amount > 0 ? 'Service likhi gayi · kharcha bana' : 'Service likhi gayi'); [GYM_KEYS.equipment, 'expenses', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Service · ${machine.name}`} description="Service ke baad machine 'Theek' ho jati hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={paid && amount > 0 && !can.expense} onClick={() => save.mutate()} leftIcon={<Wrench className="h-4 w-4" />}>Save</Button></>}>
      <div className="space-y-3">
        <Input label="Kharcha (Rs)" inputMode="decimal" value={cost} onChange={(e) => setCost(num(e.target.value))} placeholder="0" className="text-right font-semibold tabular-nums" />
        {amount > 0 && <Switch checked={paid} onChange={(e) => setPaid(e.target.checked)} label="Paisa abhi diya" description={can.expense ? 'Kharcha banega — cash drawer se' : 'Kharcha likhne ki permission nahi'} />}
        {amount > 0 && paid && <PaymentMethodPicker value={method} onChange={setMethod} label="Kahan se diya" />}
        <Input label="Agli service" type="date" value={next} onChange={(e) => setNext(e.target.value)} hint={machine.maintenanceIntervalDays ? `Khali chhorein to ${machine.maintenanceIntervalDays} din baad` : 'Marzi hai'} />
        <Textarea label="Kya kiya" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="Belt badli, oil diya" />
      </div>
    </Modal>
  );
}
