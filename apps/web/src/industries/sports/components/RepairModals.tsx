/**
 * Repair desk dialogs: receiving an item (estimate, advance, photos), and
 * one job with its next step. On delivery the repair charge and any parts
 * from stock (string, grip) become one bill; the advance on the customer's
 * khata is used up by it and anything unpaid stays on the khata.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CheckCircle2, MessageCircle, PackageCheck, PauseCircle, Play, Receipt, RotateCcw, Trash2, Wallet } from 'lucide-react';
import { Button, Input, Modal, Select, Skeleton, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { UploadDropzone } from '@core/components/uploads';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { withManagerPin } from '@core/security/ManagerPin';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PaymentMethodPicker, TakePaymentModal } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import { ProductPick, type PickedProduct } from '@industries/garments/components/ProductPick';
import { repairServicesApi, type RepairDetail, type RepairPart, type RepairStatus } from '../api/repair-services.api';
import { ITEM_TYPES, MONEY_KEYS, REPAIR_KEY, REPAIR_STATUS, REPAIR_TYPES, apiError, dayFull, opt, r2, waPhone } from './meta';
import { Line, StatusPill } from './ui';

const KEYS = [REPAIR_KEY, 'sports-repair-summary', 'sports-dashboard-overview', ...MONEY_KEYS];
const num = (s: string) => Number(s) || 0;
const clean = (s: string) => s.replace(/[^\d.]/g, '');

export function repairSlip(r: Pick<RepairDetail, 'serviceNumber' | 'customerName' | 'customerPhone' | 'itemType' | 'itemBrand' | 'itemDescription' | 'issue' | 'repairType' | 'receivedAt' | 'estimatedReadyAt' | 'estimatedCost' | 'advancePaid'>): PrintDoc {
  return {
    title: `Repair parchi ${r.serviceNumber}`,
    subtitle: `${r.itemType}${r.itemBrand ? ` · ${r.itemBrand}` : ''}`,
    meta: [['Customer', `${r.customerName} · ${r.customerPhone}`], ['Jama', dayFull(r.receivedAt)], ['Tayyar', r.estimatedReadyAt ? dayFull(r.estimatedReadyAt) : 'Bata denge']],
    sections: [
      { kind: 'rows', rows: [
        { label: 'Kaam', value: r.repairType || r.issue },
        { label: 'Haalat', value: r.itemDescription || '—' },
        { label: 'Andaza', value: formatPKR(r.estimatedCost) },
        { label: 'Advance', value: formatPKR(r.advancePaid) },
        { label: 'Baqi (andaza)', value: formatPKR(Math.max(r.estimatedCost - r.advancePaid, 0)), strong: true },
      ] },
    ],
    footer: 'Saman lene ke liye yeh parchi saath laayein.',
  };
}

export function NewRepairModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    customerName: '', customerPhone: '', itemType: ITEM_TYPES[0], itemBrand: '', itemDescription: '', issue: '', repairType: REPAIR_TYPES[0],
    estimatedCost: '', advancePaid: '', estimatedReadyAt: '', notes: '', photos: [] as string[],
  });
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tried, setTried] = useState(false);
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (f.customerName.trim().length < 2) e.customerName = 'Customer ka naam likhein';
    if (!/^[0-9+\-\s]{7,16}$/.test(f.customerPhone.trim())) e.customerPhone = 'Phone number sahi likhein (03001234567)';
    if (f.issue.trim().length < 2) e.issue = 'Kya kaam karna hai likhein';
    if (num(f.estimatedCost) > 0 && num(f.advancePaid) > num(f.estimatedCost)) e.advancePaid = 'Advance andaze se zyada nahi';
    return e;
  }, [f]);
  const save = useMutation({
    mutationFn: () => repairServicesApi.create({
      customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), itemType: f.itemType, itemBrand: opt(f.itemBrand),
      itemDescription: f.itemDescription.trim(), issue: f.issue.trim(), repairType: f.repairType, estimatedCost: num(f.estimatedCost),
      advancePaid: num(f.advancePaid) || undefined, paymentMethod: method, estimatedReadyAt: f.estimatedReadyAt || undefined,
      photosBeforeUrls: f.photos, notes: opt(f.notes),
    }),
    onSuccess: (r) => {
      toast.success(`Repair ${r.serviceNumber} jama — parchi print karein`);
      KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onCreated(r.id);
    },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    save.mutate();
  };
  const err = (k: string) => (tried ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="lg" title="Nayi repair" description="Saman jama karein, andaza aur advance likhein"
      footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button><Button className="flex-1" loading={save.isPending} onClick={submit}>Jama karein</Button></div>}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Customer" required value={f.customerName} error={err('customerName')} maxLength={80} placeholder="Ahmed" onChange={(e) => setF({ ...f, customerName: e.target.value })} />
        <Input label="Phone" required inputMode="tel" value={f.customerPhone} error={err('customerPhone')} placeholder="03001234567" onChange={(e) => setF({ ...f, customerPhone: e.target.value })} hint="Tayyar hone par WhatsApp" />
        <Select label="Kya cheez" value={f.itemType} onChange={(e) => setF({ ...f, itemType: e.target.value })} options={ITEM_TYPES.map((t) => ({ value: t, label: t }))} />
        <Input label="Brand" value={f.itemBrand} maxLength={60} placeholder="CA / Yonex" onChange={(e) => setF({ ...f, itemBrand: e.target.value })} hint="Marzi hai" />
        <Select label="Kaam" value={f.repairType} onChange={(e) => setF({ ...f, repairType: e.target.value })} options={REPAIR_TYPES.map((t) => ({ value: t, label: t }))} />
        <Input label="Tayyar kab" type="date" value={f.estimatedReadyAt} onChange={(e) => setF({ ...f, estimatedReadyAt: e.target.value })} hint="Customer ko yahi date batayein" />
        <Textarea wrapperClassName="sm:col-span-2" label="Masla / kya karna hai" required rows={2} value={f.issue} error={err('issue')} maxLength={500} placeholder="Handle dheela, grip nayi, tape" onChange={(e) => setF({ ...f, issue: e.target.value })} />
        <Input wrapperClassName="sm:col-span-2" label="Saman ki haalat" value={f.itemDescription} maxLength={300} placeholder="Toe par crack, sticker phata" onChange={(e) => setF({ ...f, itemDescription: e.target.value })} hint="Baad me jhagra na ho — jo nuqsan pehle se hai likhein" />
        <Input label="Andaza (Rs)" inputMode="decimal" value={f.estimatedCost} placeholder="0" onChange={(e) => setF({ ...f, estimatedCost: clean(e.target.value) })} hint="Deliver par asal charge likhenge" />
        <Input label="Advance (Rs)" inputMode="decimal" value={f.advancePaid} error={err('advancePaid')} placeholder="0" onChange={(e) => setF({ ...f, advancePaid: clean(e.target.value) })} hint="Customer ke khate me jama" />
        {num(f.advancePaid) > 0 && <PaymentMethodPicker className="sm:col-span-2" value={method} onChange={setMethod} label="Advance kaise mila" />}
        <div className="sm:col-span-2">
          <UploadDropzone purpose="repair-before" maxFiles={5} onUploaded={(recs: Array<{ url: string }>) => setF((x) => ({ ...x, photos: [...x.photos, ...recs.map((r) => r.url)] }))} hint="Saman ki photo — zyada se zyada 5" />
        </div>
      </form>
    </Modal>
  );
}

interface PartRow extends RepairPart { key: string; label: string }

export function RepairModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const q = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairServicesApi.getOne(id) });
  const r = q.data;
  const [mode, setMode] = useState<'complete' | 'deliver' | 'pay' | 'cancel' | null>(null);
  const [work, setWork] = useState({ workDone: '', charge: '' });
  const [parts, setParts] = useState<PartRow[]>([]);
  const [pick, setPick] = useState<PickedProduct | null>(null);
  const [paying, setPaying] = useState(false);

  const done = (msg: string) => {
    toast.success(msg);
    setMode(null); setPaying(false);
    KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const fail = (e: unknown) => toast.error(apiError(e));
  const step = useMutation({
    mutationFn: (v: { status: RepairStatus; workDone?: string; finalCost?: number }) => repairServicesApi.updateStatus(id, v),
    onSuccess: (x) => done(`${x.serviceNumber}: ${REPAIR_STATUS[x.status].label}`), onError: fail,
  });
  const deliver = useMutation({
    mutationFn: (v: { amount: number; method: string }) => repairServicesApi.updateStatus(id, {
      status: 'DELIVERED', workDone: opt(work.workDone), finalCost: num(work.charge),
      partsUsed: parts.map(({ productId, variantId, name, quantity, price }) => ({ productId, variantId, name, quantity, price })),
      paidNow: v.amount, paymentMethod: v.method,
    }),
    onSuccess: () => done('Deliver — bill ban gaya'), onError: fail,
  });
  const pay = useMutation({ mutationFn: (v: { amount: number; method: string }) => repairServicesApi.recordPayment(id, v.amount, v.method), onSuccess: () => done('Advance khate me jama'), onError: fail });
  const cancel = useMutation({ mutationFn: () => repairServicesApi.cancel(id), onSuccess: () => done('Repair cancel'), onError: fail });
  const refund = useMutation({ mutationFn: () => withManagerPin('Advance wapsi', (pin) => repairServicesApi.refund(id, pin), 'refund'), onSuccess: () => done('Advance cash me wapas'), onError: fail });

  const begin = (m: 'complete' | 'deliver') => {
    if (!r) return;
    setWork({ workDone: r.workDone ?? '', charge: String(r.finalCost || r.estimatedCost || '') });
    setMode(m);
  };
  const addPart = (p: PickedProduct | null) => {
    setPick(null);
    if (!p) return;
    setParts((ps) => [...ps, { key: `${p.productId}-${p.variantId ?? ''}-${ps.length}`, productId: p.productId, variantId: p.variantId, name: p.name, label: `${p.name}${p.variantName ? ` · ${p.variantName}` : ''}`, quantity: 1, price: p.price }]);
  };

  const partsTotal = r2(parts.reduce((s, p) => s + p.quantity * p.price, 0));
  const bill = r2(num(work.charge) + partsTotal);
  const due = r ? r2(Math.max(bill - r.advancePaid, 0)) : 0;
  const open = !!r && !['DELIVERED', 'CANCELLED'].includes(r.status);
  const held = r ? r2(r.advancePaid - r.refunded) : 0;
  const value = r ? r.finalCost || r.estimatedCost : 0;
  const wa = r && `https://wa.me/${waPhone(r.customerPhone)}?text=${encodeURIComponent(
    `Assalam o alaikum ${r.customerName}, aap ka ${r.itemType} (${r.serviceNumber}) ${r.status === 'COMPLETED' ? 'tayyar hai — le jayein' : `ka haal: ${REPAIR_STATUS[r.status].label}`}.${value ? ` Charge ${formatPKR(value)}, advance ${formatPKR(r.advancePaid)}.` : ''}`,
  )}`;

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={r ? `${r.serviceNumber} · ${r.itemType}${r.itemBrand ? ` ${r.itemBrand}` : ''}` : 'Repair'}
        description={r ? `${r.customerName} · ${r.customerPhone}` : undefined}
        footer={r && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <PrintButton doc={() => repairSlip(r)} label="Parchi" size="sm" />
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {r.sale && <Link to={receiptLink(r.sale.id)} className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />Bill {r.sale.saleNumber}</Link>}
            <span className="flex-1" />
            {open && !mode && <Button variant="ghost" size="sm" leftIcon={<Ban className="h-4 w-4" />} onClick={() => setMode('cancel')}>Cancel</Button>}
            {r.status === 'CANCELLED' && held > 0 && canRefund && <Button variant="danger" size="sm" leftIcon={<RotateCcw className="h-4 w-4" />} loading={refund.isPending} onClick={() => refund.mutate()}>Advance wapas ({formatPKR(held)})</Button>}
            {open && !mode && <Button variant="secondary" size="sm" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(true)}>Advance lein</Button>}
            {open && !mode && r.status === 'RECEIVED' && <Button variant="secondary" size="sm" leftIcon={<Play className="h-4 w-4" />} loading={step.isPending} onClick={() => step.mutate({ status: 'IN_PROGRESS' })}>Kaam shuru</Button>}
            {open && !mode && r.status === 'IN_PROGRESS' && <Button variant="secondary" size="sm" leftIcon={<PauseCircle className="h-4 w-4" />} loading={step.isPending} onClick={() => step.mutate({ status: 'ON_HOLD' })}>Rokein</Button>}
            {open && !mode && r.status === 'ON_HOLD' && <Button variant="secondary" size="sm" leftIcon={<Play className="h-4 w-4" />} loading={step.isPending} onClick={() => step.mutate({ status: 'IN_PROGRESS' })}>Dobara shuru</Button>}
            {open && !mode && r.status !== 'COMPLETED' && <Button variant="secondary" size="sm" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => begin('complete')}>Tayyar</Button>}
            {open && !mode && <Button size="sm" leftIcon={<PackageCheck className="h-4 w-4" />} onClick={() => begin('deliver')}>Deliver + bill</Button>}
          </div>
        )}>
        {!r ? <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div> : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-slate-600">
              <StatusPill tone={REPAIR_STATUS[r.status].tone}>{REPAIR_STATUS[r.status].label}</StatusPill>
              <span>Jama {dayFull(r.receivedAt)}</span>
              <span>· Tayyar {r.estimatedReadyAt ? dayFull(r.estimatedReadyAt) : 'tay nahi'}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
              <div className="space-y-2 text-[0.875rem]">
                <p><span className="text-slate-500">Kaam: </span><span className="font-medium text-slate-900">{r.repairType || '—'}</span></p>
                <p><span className="text-slate-500">Masla: </span>{r.issue}</p>
                {r.itemDescription && <p><span className="text-slate-500">Haalat: </span>{r.itemDescription}</p>}
                {r.workDone && <p><span className="text-slate-500">Kya kiya: </span>{r.workDone}</p>}
                {(r.partsUsed ?? []).length > 0 && <p><span className="text-slate-500">Parts: </span>{r.partsUsed!.map((p) => `${p.name ?? 'Part'} ×${p.quantity}`).join(', ')}</p>}
                {r.notes && <p className="whitespace-pre-line text-[0.8125rem] text-slate-500">{r.notes}</p>}
                {r.photosBeforeUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">{r.photosBeforeUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Saman" className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200" /></a>)}</div>
                )}
              </div>
              <div className="h-fit rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <Line label={r.finalCost ? 'Charge' : 'Andaza'} value={formatPKR(value)} />
                <Line label="Advance" value={formatPKR(r.advancePaid)} tone="text-emerald-700" />
                {r.refunded > 0 && <Line label="Wapas diya" value={formatPKR(r.refunded)} tone="text-rose-700" />}
                {open && <Line strong label="Baqi" value={formatPKR(Math.max(value - r.advancePaid, 0))} />}
              </div>
            </div>

            {(mode === 'complete' || mode === 'deliver') && (
              <div className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-brand-200">
                <p className="font-semibold text-slate-900">{mode === 'complete' ? 'Kaam mukammal' : 'Deliver aur bill'}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Kya kiya" value={work.workDone} placeholder="Nayi grip, handle bind" onChange={(e) => setWork({ ...work, workDone: e.target.value })} />
                  <Input label="Kaam ka charge (Rs)" inputMode="decimal" value={work.charge} onChange={(e) => setWork({ ...work, charge: clean(e.target.value) })} hint={mode === 'deliver' ? 'Parts neeche alag' : 'Customer ko yahi batayein'} />
                </div>
                {mode === 'deliver' && (
                  <>
                    <ProductPick value={pick} onChange={addPart} label="Stock se part (string, grip)" hint="Marzi hai — stock se nikal kar bill me lagega" />
                    {parts.map((p) => (
                      <div key={p.key} className="grid grid-cols-[minmax(0,1fr)_5rem_7rem_2rem] items-end gap-2">
                        <p className="truncate pb-2 text-[0.875rem] font-medium text-slate-900">{p.label}</p>
                        <Input label="Ginti" inputMode="decimal" value={String(p.quantity)} onChange={(e) => setParts((ps) => ps.map((x) => (x.key === p.key ? { ...x, quantity: num(clean(e.target.value)) } : x)))} />
                        <Input label="Rate" inputMode="decimal" value={String(p.price)} onChange={(e) => setParts((ps) => ps.map((x) => (x.key === p.key ? { ...x, price: num(clean(e.target.value)) } : x)))} />
                        <button type="button" aria-label="Hatayein" onClick={() => setParts((ps) => ps.filter((x) => x.key !== p.key))} className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <div className="rounded-xl bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                      <Line label="Kaam" value={formatPKR(num(work.charge))} />
                      {partsTotal > 0 && <Line label="Parts" value={formatPKR(partsTotal)} />}
                      <Line label="Advance" value={`- ${formatPKR(r.advancePaid)}`} />
                      <Line strong label="Ab lena hai" value={formatPKR(due)} />
                    </div>
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setMode(null)}>Wapas</Button>
                  {mode === 'complete'
                    ? <Button size="sm" loading={step.isPending} onClick={() => step.mutate({ status: 'COMPLETED', workDone: opt(work.workDone), finalCost: num(work.charge) })}>Tayyar karein</Button>
                    : <Button size="sm" disabled={bill < r.advancePaid - 0.01} onClick={() => setPaying(true)}>Payment aur bill</Button>}
                </div>
                {mode === 'deliver' && bill < r.advancePaid - 0.01 && <p className="text-[0.8125rem] text-rose-600">Bill advance ({formatPKR(r.advancePaid)}) se kam nahi ho sakta</p>}
              </div>
            )}
          </div>
        )}
      </Modal>

      {r && paying && mode === 'deliver' && (
        <TakePaymentModal title="Deliver aur bill" description={`Bill ${formatPKR(bill)} · advance ${formatPKR(r.advancePaid)}`} amount={due} max={due} allowZero
          hint="Jo na mile wo customer ke khate me udhaar" confirmLabel="Deliver karein" loading={deliver.isPending}
          onClose={() => setPaying(false)} onConfirm={(amount, method) => deliver.mutate({ amount, method })} />
      )}
      {r && paying && mode !== 'deliver' && (
        <TakePaymentModal title="Advance lein" description={`${r.serviceNumber}${value ? ` · charge ${formatPKR(value)}` : ''}`}
          amount={value ? Math.max(r2(value - r.advancePaid), 0) : 0} max={value ? Math.max(r2(value - r.advancePaid), 0) : undefined}
          hint="Customer ke khate me jama hoga" loading={pay.isPending} onClose={() => setPaying(false)} onConfirm={(amount, method) => pay.mutate({ amount, method })} />
      )}
      {r && mode === 'cancel' && (
        <Modal open onClose={() => setMode(null)} size="sm" title={`${r.serviceNumber} cancel karein?`}
          description={r.advancePaid > 0 ? `${formatPKR(r.advancePaid)} advance customer ke khate me rahega — chahein to baad me cash wapas karein.` : 'Saman wapas dein. Kuch delete nahi hota.'}
          footer={<div className="flex w-full gap-2"><Button variant="secondary" className="flex-1" onClick={() => setMode(null)}>Nahi</Button><Button variant="danger" className="flex-1" loading={cancel.isPending} onClick={() => cancel.mutate()}>Haan, cancel</Button></div>}>
          <p className="text-[0.875rem] text-slate-600">{r.customerName} · {r.itemType}</p>
        </Modal>
      )}
    </>
  );
}
