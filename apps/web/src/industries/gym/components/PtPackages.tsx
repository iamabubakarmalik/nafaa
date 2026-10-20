/**
 * PT packages: a block of personal training sessions sold together. The
 * package is billed when sold (unpaid part on the member's khata); each
 * session booked from it counts as used once it is done. Used by the
 * Personal training page (Packages tab) and the member page.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Package, Plus, Wallet } from 'lucide-react';
import { Badge, Button, Input, Modal, Select, Table, TBody, Td, Textarea, Th, THead, Tr, type BadgeVariant } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { ptApi, type PtPackage, type PtPackageStatus } from '../api/personal-training.api';
import { trainersApi } from '../api/trainers.api';
import { MemberPicker, type PickedMember } from './MemberPicker';
import { EmptyList, ListSkeleton, LoadFailed, Pager, Panel } from './ui';
import { GYM_KEYS, MONEY_KEYS, apiError, dateOf, num, opt, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

export const PACKAGE_STATUS: Record<PtPackageStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: 'Chal raha', variant: 'success' },
  COMPLETED: { label: 'Sab sessions ho gaye', variant: 'info' },
  EXPIRED: { label: 'Waqt khatam', variant: 'warning' },
  CANCELLED: { label: 'Cancel', variant: 'default' },
};

export function usePackageRefresh() {
  const qc = useQueryClient();
  return () => [GYM_KEYS.ptPackages, GYM_KEYS.pt, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/** Packages list with paging; `memberId` limits it to one member. */
export function PackagesPanel({ search, status, memberId, onSell }: { search?: string; status?: string; memberId?: string; onSell?: () => void }) {
  const can = useGymCan();
  const [page, setPage] = useState(1);
  const [cancel, setCancel] = useState<PtPackage | null>(null);
  const q = useQuery({
    queryKey: [GYM_KEYS.ptPackages, search, status, memberId, page],
    queryFn: () => ptApi.packages({ search: search || undefined, status: status || undefined, memberId, page, limit: 25 }),
    placeholderData: (p) => p,
  });
  const rows = q.data?.items ?? [];
  if (q.isLoading) return <ListSkeleton />;
  if (q.isError) return <LoadFailed what="PT packages" retry={() => q.refetch()} />;
  if (!rows.length) {
    return (
      <EmptyList icon={Package} title="Koi PT package nahi" text="Kai sessions ek saath bechein (jaise 12 sessions). Bill abhi banta hai, sessions baad me book hote hain.">
        {can.bill && can.book && onSell && <Button onClick={onSell} leftIcon={<Plus className="h-4 w-4" />}>Package bechein</Button>}
      </EmptyList>
    );
  }
  return (
    <>
      <Panel>
        <Table minWidth="50rem">
          <THead><Tr><Th>Package</Th>{!memberId && <Th>Member</Th>}<Th>Sessions</Th><Th align="right">Qeemat</Th><Th>Kab tak</Th><Th>Haal</Th><Th /></Tr></THead>
          <TBody>{rows.map((p) => {
            const st = PACKAGE_STATUS[p.status];
            const owed = p.sale && p.sale.status !== 'VOIDED' ? p.sale.creditAmount : 0;
            return (
              <Tr key={p.id}>
                <Td><p className="font-medium text-slate-900">{p.packageNumber}</p><p className="text-[0.75rem] text-slate-500">{p.trainer?.name ?? 'Koi bhi trainer'}{p.sale ? ` · ${p.sale.saleNumber}` : ''}</p></Td>
                {!memberId && <Td>{p.member ? <Link to={`/gym/members/${p.member.id}`} className="font-medium text-slate-900 hover:underline">{p.member.customer?.name ?? p.member.memberNumber}</Link> : '—'}</Td>}
                <Td>
                  <p className="tabular-nums text-slate-900">{p.sessionsUsed} / {p.sessionsTotal} ho gaye</p>
                  <p className="text-[0.75rem] text-slate-500">{p.sessionsLeft} baqi{p.sessionsBooked ? ` · ${p.sessionsBooked} booked` : ''}</p>
                </Td>
                <Td align="right" className="tabular-nums">{formatPKR(p.price)}{owed > 0 && <p className="text-[0.6875rem] text-amber-700">{formatPKR(owed)} khate me</p>}</Td>
                <Td>{p.endDate ? dateOf(p.endDate) : '—'}</Td>
                <Td><Badge size="xs" variant={st.variant}>{st.label}</Badge></Td>
                <Td align="right">{can.book && p.status === 'ACTIVE' && <Button size="sm" variant="ghost" leftIcon={<Ban className="h-3.5 w-3.5" />} onClick={() => setCancel(p)}>Cancel</Button>}</Td>
              </Tr>
            );
          })}</TBody>
        </Table>
      </Panel>
      <Pager page={q.data?.page ?? 1} pages={q.data?.pages ?? 1} onPage={setPage} />
      {cancel && <CancelPackageModal pkg={cancel} onClose={() => setCancel(null)} />}
    </>
  );
}

export function SellPackageModal({ member: preset, onClose }: { member?: PickedMember | null; onClose: () => void }) {
  const can = useGymCan();
  const refresh = usePackageRefresh();
  const trainersQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'list', false], queryFn: () => trainersApi.list() });
  const [member, setMember] = useState<PickedMember | null>(preset ?? null);
  const [trainerId, setTrainerId] = useState('');
  const [sessions, setSessions] = useState('12');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [startDate, setStartDate] = useState(todayInput());
  const [validDays, setValidDays] = useState('90');
  const [notes, setNotes] = useState('');
  const total = Number(price) || 0;
  const amount = paid === '' ? total : Number(paid) || 0;
  const count = Number(sessions) || 0;
  const error = !member ? 'Member chunein'
    : !(count >= 1 && count <= 200) ? 'Sessions 1 se 200 tak'
      : !(total >= 1) ? 'Package ki qeemat likhein'
        : amount > total ? `Package sirf ${formatPKR(total)} ka hai`
          : !(Number(validDays) >= 1) ? 'Kitne din chalega, likhein' : undefined;
  const save = useMutation({
    mutationFn: () => ptApi.sellPackage({
      memberId: member!.id, trainerId: trainerId || undefined, sessions: count, price: total, paidAmount: amount, paymentMethod: method,
      startDate, validDays: Number(validDays), notes: opt(notes),
    }),
    onSuccess: (p) => { toast.success(`${p.packageNumber} bik gaya — bill Sales me`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Package nahi bika')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="PT package bechein" description="Bill abhi banta hai; jo paisa na mile woh member ke khate me"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error || !can.bill} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bechein</Button></>}>
      <div className="space-y-3">
        {!can.bill && <p className="text-[0.8125rem] text-amber-800">Bill banane ke liye POS ki permission chahiye.</p>}
        {preset ? <MemberPicker value={member} onChange={() => undefined} /> : <MemberPicker value={member} onChange={setMember} autoFocus />}
        <Select label="Trainer" value={trainerId} onChange={(e) => setTrainerId(e.target.value)}
          options={[{ value: '', label: 'Koi bhi trainer' }, ...(trainersQ.data ?? []).map((t) => ({ value: t.id, label: t.staff?.fullName ?? t.trainerNumber }))]}
          hint="Trainer chuna to sessions sirf usi ke saath book honge" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Sessions" inputMode="numeric" value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ''))} hint="Jaise 12 ya 24" />
          <Input label="Package ki qeemat (Rs)" inputMode="decimal" value={price} onChange={(e) => setPrice(num(e.target.value))}
            hint={count > 0 && total > 0 ? `Ek session ${formatPKR(Math.round(total / count))}` : 'Poore package ki'} />
          <Input label="Kab se" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Kitne din chalega" inputMode="numeric" value={validDays} onChange={(e) => setValidDays(e.target.value.replace(/\D/g, ''))} hint="Is ke baad bache sessions khatam" />
        </div>
        <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))} className="text-right font-semibold tabular-nums"
          hint={amount < total ? `${formatPKR(total - amount)} member ke khate me udhaar` : 'Poora paisa'} error={amount > total ? `Package sirf ${formatPKR(total)} ka hai` : undefined} />
        {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} hint="Marzi hai" />
      </div>
    </Modal>
  );
}

function CancelPackageModal({ pkg, onClose }: { pkg: PtPackage; onClose: () => void }) {
  const refresh = usePackageRefresh();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => ptApi.cancelPackage(pkg.id, opt(reason)),
    onSuccess: () => { toast.success('Package cancel — booked sessions bhi cancel'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Cancel · ${pkg.packageNumber}`}
      description={pkg.sale ? `Paisa wapas karna ho to Sales me bill ${pkg.sale.saleNumber} ka Return karein — package khud cancel ho jayega.` : undefined}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>Cancel karein</Button></>}>
      <Textarea label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} hint="Paisa is se wapas nahi hota" />
    </Modal>
  );
}
