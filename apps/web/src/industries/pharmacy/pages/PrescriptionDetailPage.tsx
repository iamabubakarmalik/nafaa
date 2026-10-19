/**
 * One prescription: check it, hand the medicines over and take the money,
 * close what will not be given, and refill. Handing over bills a normal
 * sale (cash, card, split or udhaar on the patient's khata) from the chosen
 * batch; a same-formula medicine can be given instead of the written one.
 */

import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Ban, CheckCircle2, ClipboardCheck, ExternalLink, FileText, Image as ImageIcon, Package, Phone, Receipt, Repeat, Stethoscope, UserRound, Wallet,
} from 'lucide-react';
import { Button, Card, Input, Modal, PageShell, Skeleton, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { withManagerPin } from '@core/security/ManagerPin';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { PosCheckoutModal, type PosCheckoutResult } from '@modules/pos/components';
import { posBatchesApi, type PosBatch } from '@modules/pos/api/batches.api';
import { useProductCatalog, type PosItem } from '@modules/pos/engine';
import { prescriptionsApi, type Prescription, type PrescriptionItem } from '../api/prescriptions.api';
import { useMedicineFacts } from '../hooks/useMedicineFacts';
import { RX_STATUS, drName, shortDate } from '../lib/meta';

interface Draft { qty: string; price: string; productId: string; batchId: string }
const apiError = (e: unknown) => {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? (e as Error).message ?? 'Nahi hua';
};
const left = (it: PrescriptionItem) => Math.max(0, Number((it.prescribedQty - (it.dispensedQty ?? 0)).toFixed(3)));
const when = (v?: string | null) => (v ? new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');

function rxDoc(rx: Prescription): PrintDoc {
  return {
    title: `Nuskha ${rx.prescriptionNumber}`,
    subtitle: shortDate(rx.prescriptionDate ?? rx.createdAt),
    meta: [['Mareez', rx.patientName ?? ''], ['Doctor', drName(rx.doctorName) || '—'], ['Status', RX_STATUS[rx.status].label]],
    sections: [{
      kind: 'table', title: 'Dawaiyan',
      columns: [{ label: 'Dawai' }, { label: 'Dose' }, { label: 'Kitni', align: 'right' }, { label: 'Di', align: 'right' }],
      rows: rx.items.map((i) => [i.medicineName, [i.frequency, i.duration, i.instructions].filter(Boolean).join(' · '), `${i.prescribedQty} ${i.unit ?? ''}`, String(i.dispensedQty ?? 0)]),
    }],
  };
}

export default function PrescriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [discount, setDiscount] = useState('');
  const [pay, setPay] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const { data: rx, isLoading } = useQuery({ queryKey: ['prescription', id], queryFn: () => prescriptionsApi.getOne(id!), enabled: !!id });
  const { data: counter } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });
  const { data: customer } = useQuery({ queryKey: ['customer', rx?.customerId], queryFn: () => customersApi.get(rx!.customerId!), enabled: !!rx?.customerId });
  const { items: catalog } = useProductCatalog();
  const facts = useMedicineFacts();
  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const canDispense = !!rx && (rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED');
  const open = rx?.items.filter((i) => left(i) > 0) ?? [];
  const productIds = useMemo(() => [...new Set(open.map((i) => drafts[i.id!]?.productId || i.productId).filter(Boolean) as string[])], [open, drafts]);
  const { data: batches = [] } = useQuery({
    queryKey: ['rx-batches', shopId, productIds],
    queryFn: () => posBatchesApi.list(shopId!, productIds),
    enabled: canDispense && !!shopId && productIds.length > 0,
  });

  const draftOf = (it: PrescriptionItem): Draft => drafts[it.id!] ?? { qty: canDispense ? String(left(it)) : '', price: String(it.unitPrice ?? 0), productId: it.productId ?? '', batchId: '' };
  const setDraft = (it: PrescriptionItem, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [it.id!]: { ...draftOf(it), ...patch } }));
  const subsFor = (it: PrescriptionItem): PosItem[] => {
    const key = it.productId ? [...(facts.get(it.productId)?.saltIds ?? [])].sort().join('|') : '';
    if (!key) return [];
    return catalog.filter((p) => p.id !== it.productId && [...(facts.get(p.id)?.saltIds ?? [])].sort().join('|') === key && p.stock > 0);
  };

  const lines = open.map((it) => ({ it, d: draftOf(it) })).filter(({ d }) => Number(d.qty) > 0 && d.productId);
  const subtotal = lines.reduce((s, { d }) => s + Number(d.qty) * (Number(d.price) || 0), 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const total = Math.round((subtotal - disc) * 100) / 100;

  const refresh = () => ['prescription', 'prescriptions-page', 'pharmacy-dashboard', 'products-for-pos', 'products', 'customers', 'sales-history', 'rx-batches']
    .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const verify = useMutation({ mutationFn: () => prescriptionsApi.verify(id!), onSuccess: () => { toast.success('Nuskha check ho gaya — ab dawai dein'); refresh(); }, onError: (e) => toast.error(apiError(e)) });
  const reject = useMutation({
    mutationFn: () => prescriptionsApi.reject(id!, reason.trim()),
    onSuccess: () => { toast.success(rx?.status === 'PARTIALLY_DISPENSED' ? 'Baqi dawai band kar di' : 'Nuskha radd'); setRejecting(false); refresh(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const refill = useMutation({ mutationFn: () => prescriptionsApi.refill(id!), onSuccess: (n) => { toast.success(`Refill ${n.prescriptionNumber} ban gaya`); refresh(); navigate(`/pharmacy/prescriptions/${n.id}`); }, onError: (e) => toast.error(apiError(e)) });
  const dispense = useMutation({
    mutationFn: (d: PosCheckoutResult) => withManagerPin('Discount ya udhaar ke liye malik ka PIN', (managerPin) => prescriptionsApi.dispense(id!, {
      items: lines.map(({ it, d: x }) => ({
        itemId: it.id!, dispensedQty: Number(x.qty), unitPrice: Number(x.price) || 0,
        ...(x.productId !== it.productId && { productId: x.productId }), ...(x.batchId && { batchId: x.batchId }),
      })),
      paymentMethod: d.paymentMethod, paidAmount: Math.min(d.paidAmount, total), ...(d.payments && { payments: d.payments }),
      discount: disc || undefined, ...(managerPin && { managerPin }),
    }), 'discount'),
    onSuccess: (res) => {
      setPay(false); setDrafts({}); setDiscount('');
      toast.success(`Dawai de di · bill ${res.sale?.saleNumber ?? ''}`, res.sale ? { action: { label: 'Bill', onClick: () => window.open(`/sales/${res.sale!.id}/receipt?auto=1`, '_blank') } } : undefined);
      refresh();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const startPay = () => {
    if (!lines.length) { toast.error('Kam az kam ek dawai ki miqdaar likhein'); return; }
    const over = lines.find(({ it, d }) => Number(d.qty) > left(it) + 1e-9);
    if (over) { toast.error(`${over.it.medicineName}: sirf ${left(over.it)} baqi hai`); return; }
    if (!shopId) { toast.error('Upar se shop chunein'); return; }
    setPay(true);
  };

  if (isLoading || !rx) {
    return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  }
  const st = RX_STATUS[rx.status];
  const refillLeft = rx.refillsAllowed - rx.refillsUsed;

  return (
    <PageShell>
      {pay && (
        <PosCheckoutModal total={total} itemCount={lines.length} loading={dispense.isPending} initMode="full"
          customerName={customer?.name ?? rx.patientName} customerBalance={Number(customer?.balance ?? 0)} hasCustomer={!!rx.customerId}
          allowCredit={counter?.allowCredit ?? true} initMethod={(counter?.defaultPaymentMethod as PosCheckoutResult['paymentMethod']) || 'CASH'}
          onConfirm={(d) => dispense.mutate(d)} onClose={() => setPay(false)} />
      )}
      {rejecting && (
        <Modal open onClose={() => setRejecting(false)} size="md" title={rx.status === 'PARTIALLY_DISPENSED' ? 'Baqi dawai band karein' : 'Nuskha radd karein'}
          description={rx.status === 'PARTIALLY_DISPENSED' ? 'Jo dawai de chuke wo bill me rahegi; baqi nahi di jayegi.' : 'Koi dawai nahi di jayegi.'}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setRejecting(false)}>Wapas</Button><Button variant="danger" loading={reject.isPending} disabled={reason.trim().length < 3} onClick={() => reject.mutate()}>Haan, band karein</Button></div>}>
          <Textarea label="Wajah" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Jaise: mareez ke paas pehle se hai, doctor ki likhai saaf nahi" hint="Kam az kam 3 harf" />
        </Modal>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/pharmacy/prescriptions" aria-label="Wapas" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-bold text-slate-900">{rx.prescriptionNumber}</h1>
              <span className={cn('rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1', st.tone)}>{st.label}</span>
              {rx.type === 'REFILL' && <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[0.75rem] font-semibold text-violet-700 ring-1 ring-violet-200">Refill</span>}
            </div>
            <p className="text-[0.8125rem] text-slate-500">Aaya {when(rx.createdAt)}{rx.verifiedAt && ` · check ${when(rx.verifiedAt)}`}{rx.dispensedAt && ` · poori di ${when(rx.dispensedAt)}`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton doc={() => rxDoc(rx)} label="Print" size="sm" />
          {rx.sale && <Link to={`/sales/${rx.sale.id}/receipt`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />Aakhri bill</Link>}
          {rx.isRefillable && rx.type !== 'REFILL' && refillLeft > 0 && rx.status !== 'REJECTED' && rx.status !== 'PENDING' && (
            <Button size="sm" variant="secondary" loading={refill.isPending} onClick={() => refill.mutate()} leftIcon={<Repeat className="h-4 w-4" />}>Refill ({refillLeft} baqi)</Button>
          )}
          {(rx.status === 'PENDING' || rx.status === 'VERIFIED' || rx.status === 'PARTIALLY_DISPENSED') && (
            <Button size="sm" variant="critical" onClick={() => { setReason(''); setRejecting(true); }} leftIcon={<Ban className="h-4 w-4" />}>{rx.status === 'PARTIALLY_DISPENSED' ? 'Baqi band' : 'Radd'}</Button>
          )}
          {rx.status === 'PENDING' && <Button size="sm" loading={verify.isPending} onClick={() => verify.mutate()} leftIcon={<ClipboardCheck className="h-4 w-4" />}>Check ho gaya</Button>}
        </div>
      </div>

      {rx.status === 'PENDING' && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Pharmacist nuskha dekh kar "Check ho gaya" dabaye — phir dawai di ja sakti hai.</p>
      )}
      {rx.rejectionReason && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] text-rose-900 ring-1 ring-rose-200">Wajah: {rx.rejectionReason}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />Dawaiyan</span>}
            description={canDispense ? 'Abhi kitni deni hai likhein, batch aur rate dekh lein, phir paisa lein' : undefined}>
            <ul className="divide-y divide-slate-100">
              {rx.items.map((it) => {
                const d = draftOf(it);
                const rem = left(it);
                const product = d.productId ? byId.get(d.productId) : undefined;
                const myBatches = batches.filter((b: PosBatch) => b.productId === d.productId);
                const subs = canDispense && rem > 0 ? subsFor(it) : [];
                return (
                  <li key={it.id} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{it.medicineName}{it.isSubstituted && <span className="ml-1.5 text-[0.75rem] font-medium text-violet-700">({it.substituteFor} ki jagah)</span>}</p>
                        <p className="text-[0.75rem] text-slate-500">{[it.strength, it.frequency, it.duration, it.dose, it.instructions].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <div className="text-right text-[0.8125rem]">
                        <p className="tabular-nums text-slate-700">{Number((it.dispensedQty ?? 0).toFixed(3))} / {it.prescribedQty} {it.unit} di</p>
                        {rem > 0 ? <p className="font-semibold text-amber-700">{rem} baqi</p> : <p className="inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Poori</p>}
                      </div>
                    </div>
                    {canDispense && rem > 0 && (
                      !it.productId && !d.productId ? (
                        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[0.8125rem] text-slate-600">
                          Stock se nahi juri.
                          <select value="" onChange={(e) => { const p = byId.get(e.target.value); if (p) setDraft(it, { productId: p.id, price: String(p.price), batchId: '' }); }} className="ml-2 h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                            <option value="">Stock wali dawai chunein…</option>
                            {catalog.filter((p) => p.name.toLowerCase().includes(it.medicineName.toLowerCase().split(' ')[0] ?? '')).slice(0, 30).map((p) => <option key={p.id} value={p.id}>{p.name} · {formatPKR(p.price)}</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
                          <Input size="sm" label="Abhi dein" inputMode="decimal" value={d.qty} onChange={(e) => setDraft(it, { qty: e.target.value.replace(/[^\d.]/g, '') })}
                            error={Number(d.qty) > rem + 1e-9 ? `Sirf ${rem}` : undefined} />
                          <Input size="sm" label={`Rate / ${product?.unit ?? it.unit}`} inputMode="decimal" value={d.price} onChange={(e) => setDraft(it, { price: e.target.value.replace(/[^\d.]/g, '') })} />
                          <label className="block min-w-0">
                            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Batch</span>
                            <select value={d.batchId} onChange={(e) => setDraft(it, { batchId: e.target.value })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                              <option value="">{myBatches.length ? 'Jaldi expire wala pehle (khud)' : 'Batch nahi'}</option>
                              {myBatches.map((b) => {
                                const exp = b.expiryDate ? new Date(b.expiryDate) : null;
                                const gone = !!exp && exp.getTime() < Date.now();
                                return <option key={b.id} value={b.id}>{b.batchNumber} · {Number(b.quantity.toFixed(2))} · {exp ? (gone ? 'EXPIRED ' : 'exp ') + shortDate(b.expiryDate) : 'expiry nahi'}</option>;
                              })}
                            </select>
                          </label>
                          {(subs.length > 0 || d.productId !== it.productId) && (
                            <label className="block sm:col-span-3">
                              <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Dawai jo di ja rahi hai</span>
                              <select value={d.productId} onChange={(e) => { const p = byId.get(e.target.value); setDraft(it, { productId: e.target.value, price: String(p?.price ?? d.price), batchId: '' }); }}
                                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                                {it.productId && <option value={it.productId}>{byId.get(it.productId)?.name ?? it.medicineName} (likhi hui){(byId.get(it.productId)?.stock ?? 0) <= 0 ? ' — stock khatam' : ''}</option>}
                                {subs.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatPKR(p.price)} · same formula</option>)}
                              </select>
                            </label>
                          )}
                          {product && product.stock < Number(d.qty) && <p className="text-[0.75rem] font-medium text-rose-600 sm:col-span-3">Shelf par sirf {Number(product.stock.toFixed(2))} {product.unit}</p>}
                        </div>
                      )
                    )}
                  </li>
                );
              })}
            </ul>
            {canDispense && (
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div className="flex items-end gap-3">
                  <Input size="sm" label="Discount (Rs)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} wrapperClassName="w-32" />
                  <div className="pb-1 text-[0.8125rem] text-slate-600">Kul <strong className="text-[1.0625rem] tabular-nums text-slate-900">{formatPKR(total)}</strong>{disc > 0 && <span className="ml-1 text-slate-500">({formatPKR(subtotal)} − {formatPKR(disc)})</span>}</div>
                </div>
                <Button onClick={startPay} disabled={!lines.length} leftIcon={<Wallet className="h-4 w-4" />}>Paisa lein · dawai dein</Button>
              </div>
            )}
          </Card>

          {(rx.diagnosis || rx.notes || rx.imageUrls.length > 0) && (
            <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><FileText className="h-4 w-4 text-brand-600" />Nuskhe ki baqi baatein</span>}>
              <div className="space-y-2 text-[0.875rem]">
                {rx.diagnosis && <p><span className="text-slate-500">Bimari: </span>{rx.diagnosis}</p>}
                {rx.notes && <p><span className="text-slate-500">Note: </span>{rx.notes}</p>}
                {rx.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {rx.imageUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"><img src={u} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><ImageIcon className="h-5 w-5 text-slate-400" /></a>)}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-brand-600" />Mareez</span>}>
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Naam</dt><dd className="font-semibold">{rx.patientName || '—'}</dd></div>
              {rx.patientAge != null && <div className="flex justify-between gap-2"><dt className="text-slate-500">Umar</dt><dd>{rx.patientAge} saal</dd></div>}
              {rx.patientPhone && <div className="flex justify-between gap-2"><dt className="text-slate-500">Phone</dt><dd><a href={`tel:${rx.patientPhone}`} className="inline-flex items-center gap-1 text-brand-700"><Phone className="h-3.5 w-3.5" />{rx.patientPhone}</a></dd></div>}
              {rx.patientCnic && <div className="flex justify-between gap-2"><dt className="text-slate-500">CNIC</dt><dd className="font-mono">{rx.patientCnic}</dd></div>}
              {customer && <div className="flex justify-between gap-2 border-t border-slate-100 pt-1.5"><dt className="text-slate-500">Khata baqi</dt><dd className={cn('font-semibold tabular-nums', Number(customer.balance) > 0 ? 'text-amber-700' : 'text-slate-700')}>{formatPKR(Number(customer.balance ?? 0))}</dd></div>}
            </dl>
            {rx.customerId && <Link to={`/customers/${rx.customerId}`} className="mt-2 inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Customer kholein <ExternalLink className="h-3.5 w-3.5" /></Link>}
            {!rx.customerId && <p className="mt-2 text-[0.75rem] text-slate-500">Walk-in mareez — udhaar ke liye nuskha customer ke saath banayein.</p>}
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Stethoscope className="h-4 w-4 text-brand-600" />Doctor</span>}>
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Naam</dt><dd className="font-semibold">{drName(rx.doctorName) || '—'}</dd></div>
              {rx.doctorRegNumber && <div className="flex justify-between gap-2"><dt className="text-slate-500">PMDC</dt><dd className="font-mono">{rx.doctorRegNumber}</dd></div>}
              {rx.doctorSpeciality && <div className="flex justify-between gap-2"><dt className="text-slate-500">Specialist</dt><dd>{rx.doctorSpeciality}</dd></div>}
              {rx.hospitalName && <div className="flex justify-between gap-2"><dt className="text-slate-500">Hospital</dt><dd>{rx.hospitalName}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Nuskhe ki tareekh</dt><dd>{shortDate(rx.prescriptionDate ?? rx.createdAt)}</dd></div>
            </dl>
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-brand-600" />Hisaab</span>}>
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Ab tak ki dawai</dt><dd className="font-semibold tabular-nums">{formatPKR(rx.totalAmount)}</dd></div>
              {rx.sale && <div className="flex justify-between gap-2"><dt className="text-slate-500">Aakhri bill</dt><dd><Link to={`/sales/${rx.sale.id}/receipt`} target="_blank" className="font-mono text-brand-700">{rx.sale.saleNumber}</Link>{rx.sale.creditAmount > 0 && <span className="ml-1 text-amber-700">({formatPKR(rx.sale.creditAmount)} udhaar)</span>}</dd></div>}
              {rx.isRefillable && <div className="flex justify-between gap-2"><dt className="text-slate-500">Refill</dt><dd>{rx.refillsUsed}/{rx.refillsAllowed}{rx.nextRefillDate && ` · agla ${shortDate(rx.nextRefillDate)}`}</dd></div>}
            </dl>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
