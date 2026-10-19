/**
 * One delivery challan: print for the driver, the vehicle, the trip
 * (loaded, left, reached) and what actually reached the site. A short
 * delivery puts the rest back on the bill for the next challan.
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, GraduationCap, MapPin, MessageCircle, PackageCheck, Phone, Receipt, Truck, UserRound } from 'lucide-react';
import {
  Button, Card, Input, Modal, PageHero, PageShell, Select, Skeleton, Table, TBody, THead, Td, Textarea, Th, Tr, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { HeroBack } from '@core/components/HeroBack';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { deliveriesApi, type Delivery, type DeliveryStatus, type VehicleType } from '../api/deliveries.api';
import type { Unit } from '../api/products.api';
import { CHALLAN_STATUS, OPEN_CHALLAN, UNIT_LABEL, VEHICLES, errorText, qty, shortDate, vehicleLabel } from '../lib/meta';

const NEXT: Partial<Record<DeliveryStatus, { to: DeliveryStatus; label: string }>> = {
  PENDING: { to: 'LOADED', label: 'Load ho gaya' },
  SCHEDULED: { to: 'LOADED', label: 'Load ho gaya' },
  LOADED: { to: 'DISPATCHED', label: 'Gaari nikal gayi' },
};

function challanDoc(d: Delivery): PrintDoc {
  const done = !OPEN_CHALLAN.includes(d.status);
  return {
    title: `Delivery challan ${d.deliveryNumber}`,
    subtitle: d.customerName,
    meta: [
      ['Tareekh', shortDate(d.scheduledDate ?? d.createdAt)], ...(d.saleNumber ? [['Bill', d.saleNumber] as [string, string]] : []),
      ['Gaari', [vehicleLabel(d.vehicleType), d.vehicleNumber].filter(Boolean).join(' ')], ...(d.driverName ? [['Driver', [d.driverName, d.driverPhone].filter(Boolean).join(' ')] as [string, string]] : []),
    ],
    sections: [
      { kind: 'text', title: 'Pata', text: [d.deliveryAddress, d.customerPhone && `Phone: ${d.customerPhone}`, d.siteContactPhone && `Site: ${d.siteContactPhone}`].filter(Boolean).join('\n') },
      {
        kind: 'table', title: 'Maal',
        columns: [{ label: '#', wideOnly: true }, { label: 'Item' }, { label: 'Quantity', align: 'right' }, ...(done ? [{ label: 'Pohancha', align: 'right' as const }] : [])],
        rows: d.items.map((i, n) => [String(n + 1), i.itemName, `${qty(i.orderedQty)} ${UNIT_LABEL[i.unit as Unit] ?? ''}`, ...(done ? [qty(i.deliveredQty)] : [])]),
      },
      ...(d.driverInstructions ? [{ kind: 'text' as const, title: 'Hidayat', text: d.driverInstructions }] : []),
      { kind: 'text', title: 'Wusool', text: 'Maal poora aur theek mila.\n\nNaam: ____________________   Dastakhat: ____________________' },
    ],
    footer: 'Ye challan sirf maal ke liye hai — paise ka hisaab bill par.',
  };
}

export default function DeliveryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const canMove = usePermission(PERMISSIONS.POS_USE);
  const [vehicle, setVehicle] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [cancel, setCancel] = useState(false);

  const { data: d, isLoading } = useQuery({ queryKey: ['hardware-delivery', id], queryFn: () => deliveriesApi.getOne(id), enabled: !!id });
  const done = (msg: string) => () => {
    ['hardware-delivery', 'hardware-deliveries', 'hardware-bill-lines', 'hardware-sale-challans', 'hardware-deliveries-summary', 'hardware-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    toast.success(msg);
  };
  const move = useMutation({
    mutationFn: (s: DeliveryStatus) => deliveriesApi.updateStatus(id, s),
    onSuccess: (r) => done(CHALLAN_STATUS[r.status].label)(),
    onError: (e) => toast.error(errorText(e, 'Status nahi badla')),
  });

  if (isLoading || !d) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></PageShell>;

  const st = CHALLAN_STATUS[d.status];
  const open = canMove && OPEN_CHALLAN.includes(d.status);
  const next = NEXT[d.status];
  const value = d.items.reduce((s, i) => s + i.orderedQty * i.unitPrice, 0);
  const short = d.items.filter((i) => i.deliveredQty < i.orderedQty);
  const waText = encodeURIComponent(`Challan ${d.deliveryNumber}\n${d.customerName}\n${d.deliveryAddress}\n\n${d.items.map((i) => `• ${i.itemName} — ${qty(i.orderedQty)}`).join('\n')}`);
  const waTo = (d.driverPhone ?? d.customerPhone ?? '').replace(/\D/g, '').replace(/^0/, '92');

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Challan — safar" onClose={guide.close}
          steps={[
            { icon: Truck, color: '#7c3aed', title: 'Gaari', text: 'Gaari, number aur driver likhein. Print kar ke driver ko dein — wusool ke dastakhat isi par.' },
            { icon: PackageCheck, color: '#16a34a', title: 'Pohanch gaya', text: 'Har item ka jitna site par utra wo likhein. Toota hua alag. Kam utra to baqi maal agle challan me.' },
            { icon: Ban, color: '#e11d48', title: 'Cancel', text: 'Safar na hua to wajah likh kar cancel karein — maal bill par wapas baqi ho jata hai.' },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero title={<HeroBack to="/hardware/deliveries" label="Challan">{d.deliveryNumber}</HeroBack>} chip={st.label}
        meta={`${d.customerName} · ${shortDate(d.createdAt)}`}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => challanDoc(d)} label="Print" /></span>
          {waTo && <a href={`https://wa.me/${waTo}?text=${waText}`} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" />WhatsApp</a>}
          {open && <button type="button" onClick={() => setVehicle(true)} className={heroButton}><Truck className="h-4 w-4" />Gaari</button>}
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {open && <button type="button" onClick={() => setConfirm(true)} className={heroPrimaryButton}><PackageCheck className="h-4 w-4" />Pohanch gaya</button>}
        </>}
        stats={[
          { label: 'Items', value: String(d.items.length) },
          { label: 'Maal ki value', value: formatPKR(value) },
          { label: 'Kiraya / mazdoori', value: formatPKR(d.totalCharges) },
        ]} />

      {d.status === 'PARTIALLY_DELIVERED' && short.length > 0 && d.saleId && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-orange-50 px-4 py-3 text-orange-900 ring-1 ring-orange-200">
          <PackageCheck className="h-4 w-4" /><span className="text-[0.875rem] font-medium">{short.map((i) => `${i.itemName} (${qty(i.orderedQty - i.deliveredQty)})`).join(', ')} nahi pohancha — bill par baqi hai</span>
          <Link to={`/hardware/deliveries/new?sale=${d.saleId}`} className="ml-auto text-[0.8125rem] font-semibold hover:underline">Baqi ka challan →</Link>
        </div>
      )}
      {d.status === 'CANCELLED' && <div className="rounded-2xl bg-slate-100 px-4 py-3 text-[0.875rem] text-slate-700">Cancel: {d.cancellationReason || '—'}</div>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card flush title="Maal">
          <Table minWidth="32rem">
            <THead><Tr><Th>Item</Th><Th align="right">Challan</Th><Th align="right">Pohancha</Th><Th align="right">Toota</Th></Tr></THead>
            <TBody>
              {d.items.map((i) => (
                <Tr key={i.id}>
                  <Td className="font-medium text-slate-900">{i.itemName}</Td>
                  <Td align="right" className="tabular-nums">{qty(i.orderedQty)} {UNIT_LABEL[i.unit as Unit] ?? ''}</Td>
                  <Td align="right" className="tabular-nums">{open ? '—' : qty(i.deliveredQty)}</Td>
                  <Td align="right" className="tabular-nums">{i.damagedQty ? qty(i.damagedQty) : '—'}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>

        <aside className="space-y-4">
          <Card title="Kahan">
            <dl className="space-y-2 text-[0.875rem]">
              <div className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><dd>{d.deliveryAddress}</dd></div>
              {d.customerPhone && <div className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><a href={`tel:${d.customerPhone}`} className="text-brand-700">{d.customerPhone}</a></div>}
              {d.siteContactPhone && <div className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><span>Site: <a href={`tel:${d.siteContactPhone}`} className="text-brand-700">{d.siteContactPhone}</a></span></div>}
              {d.project && <div className="text-slate-600">Site: <Link to={`/hardware/projects/${d.project.id}`} className="font-medium text-brand-700 hover:underline">{d.project.name}</Link></div>}
              {d.saleNumber && <div className="flex gap-2"><Receipt className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /><Link to={`/sales?q=${encodeURIComponent(d.saleNumber)}`} className="font-medium text-brand-700 hover:underline">Bill {d.saleNumber}</Link></div>}
            </dl>
          </Card>
          <Card title="Gaari">
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between"><dt className="text-slate-500">Gaari</dt><dd>{[vehicleLabel(d.vehicleType), d.vehicleNumber].filter(Boolean).join(' · ')}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Driver</dt><dd>{[d.driverName, d.driverPhone].filter(Boolean).join(' · ') || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Tareekh</dt><dd>{d.scheduledDate ? `${shortDate(d.scheduledDate)} ${d.scheduledTime ?? ''}` : '—'}</dd></div>
              {d.receivedByName && <div className="flex justify-between"><dt className="text-slate-500">Wusool</dt><dd>{d.receivedByName}</dd></div>}
              {d.issueReported && <div className="text-rose-700">Masla: {d.issueReported}</div>}
            </dl>
            {open && (
              <div className="mt-3 grid gap-2">
                {next && <Button variant="secondary" loading={move.isPending} leftIcon={<Truck className="h-4 w-4" />} onClick={() => move.mutate(next.to)}>{next.label}</Button>}
                <Button variant="ghost" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setCancel(true)}>Cancel karein</Button>
              </div>
            )}
            {d.status === 'DELIVERED' && <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />{shortDate(d.deliveredAt)} ko pohancha</p>}
          </Card>
        </aside>
      </div>

      {vehicle && <VehicleModal d={d} onClose={() => setVehicle(false)} onDone={done('Gaari save ho gayi')} />}
      {confirm && <ConfirmModal d={d} onClose={() => setConfirm(false)} onDone={done('Delivery darj ho gayi')} />}
      {cancel && <CancelModal d={d} onClose={() => setCancel(false)} onDone={done('Challan cancel — maal bill par baqi')} />}
    </PageShell>
  );
}

function VehicleModal({ d, onClose, onDone }: { d: Delivery; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({
    vehicleType: d.vehicleType, vehicleNumber: d.vehicleNumber ?? '', driverName: d.driverName ?? '', driverPhone: d.driverPhone ?? '',
    scheduledDate: d.scheduledDate?.slice(0, 10) ?? '', scheduledTime: d.scheduledTime ?? '',
  });
  const save = useMutation({
    mutationFn: () => deliveriesApi.assignVehicle(d.id, { ...v, scheduledDate: v.scheduledDate || undefined }),
    onSuccess: () => { onDone(); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="Gaari aur driver"
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Gaari" value={v.vehicleType} onChange={(e) => setV({ ...v, vehicleType: e.target.value as VehicleType })} options={VEHICLES} />
        <Input label="Gaari number" value={v.vehicleNumber} onChange={(e) => setV({ ...v, vehicleNumber: e.target.value })} />
        <Input label="Driver" value={v.driverName} onChange={(e) => setV({ ...v, driverName: e.target.value })} />
        <Input label="Driver phone" inputMode="tel" value={v.driverPhone} onChange={(e) => setV({ ...v, driverPhone: e.target.value })} />
        <Input label="Tareekh" type="date" value={v.scheduledDate} onChange={(e) => setV({ ...v, scheduledDate: e.target.value })} />
        <Input label="Waqt" type="time" value={v.scheduledTime} onChange={(e) => setV({ ...v, scheduledTime: e.target.value })} />
      </div>
    </Modal>
  );
}

function ConfirmModal({ d, onClose, onDone }: { d: Delivery; onClose: () => void; onDone: () => void }) {
  const [rows, setRows] = useState(() => Object.fromEntries(d.items.map((i) => [i.id!, { delivered: i.orderedQty, damaged: 0 }])));
  const [receiver, setReceiver] = useState('');
  const [issue, setIssue] = useState('');
  const bad = d.items.find((i) => (rows[i.id!].delivered + rows[i.id!].damaged) > i.orderedQty + 1e-6 || rows[i.id!].delivered < 0 || rows[i.id!].damaged < 0);
  const nothing = d.items.every((i) => rows[i.id!].delivered <= 0);
  const save = useMutation({
    mutationFn: () => deliveriesApi.confirmDelivery(d.id, {
      receivedByName: receiver.trim() || undefined, issueReported: issue.trim() || undefined,
      deliveredItems: d.items.map((i) => ({ itemId: i.id!, deliveredQty: rows[i.id!].delivered, damagedQty: rows[i.id!].damaged })),
    }),
    onSuccess: () => { onDone(); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Darj nahi hua')),
  });
  const num = (v: string) => Number(v.replace(/[^\d.]/g, '')) || 0;
  return (
    <Modal open onClose={onClose} size="lg" title="Site par kitna pohancha?" description="Jitna utra wo likhein. Kam utra to baqi bill par agle challan ke liye rehta hai."
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button loading={save.isPending} disabled={!!bad || nothing} onClick={() => save.mutate()}>Darj karein</Button></>}>
      <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {d.items.map((i) => (
          <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_6rem_6rem] items-center gap-2 p-3">
            <div className="min-w-0"><p className="truncate font-medium">{i.itemName}</p><p className="text-[0.75rem] text-slate-500">Challan: {qty(i.orderedQty)}</p></div>
            <Input aria-label="Pohancha" label="Pohancha" size="sm" inputMode="decimal" value={String(rows[i.id!].delivered)} onChange={(e) => setRows({ ...rows, [i.id!]: { ...rows[i.id!], delivered: num(e.target.value) } })} />
            <Input aria-label="Toota" label="Toota" size="sm" inputMode="decimal" value={String(rows[i.id!].damaged)} onChange={(e) => setRows({ ...rows, [i.id!]: { ...rows[i.id!], damaged: num(e.target.value) } })} />
          </li>
        ))}
      </ul>
      {bad && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{bad.itemName}: pohancha + toota challan se zyada hai</p>}
      {nothing && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">Kuch nahi pohancha to challan cancel karein</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label="Kis ne liya" value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Munshi / customer" />
        <Textarea label="Koi masla" rows={1} value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Raasta band, maal kam" />
      </div>
    </Modal>
  );
}

function CancelModal({ d, onClose, onDone }: { d: Delivery; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => deliveriesApi.cancel(d.id, reason.trim()),
    onSuccess: () => { onDone(); onClose(); },
    onError: (e) => toast.error(errorText(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${d.deliveryNumber} cancel karein?`} description="Challan record me rehta hai; maal bill par dobara bhejne ke liye baqi ho jata hai."
      footer={<><Button variant="secondary" onClick={onClose}>Wapas</Button><Button variant="danger" loading={save.isPending} disabled={reason.trim().length < 3} onClick={() => save.mutate()}>Cancel karein</Button></>}>
      <Textarea label="Wajah" required rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer ne mana kiya, gaari kharab…" hint="Kam se kam 3 harf" />
    </Modal>
  );
}
