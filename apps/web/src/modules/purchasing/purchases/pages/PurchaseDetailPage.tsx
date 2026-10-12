/**
 * One purchase or order: what was ordered, received and sent back in the
 * unit it was bought in, money, and the actions that fit its state — receive
 * an order (all or part), return goods, cancel, print (A4 purchase bill or
 * order) and send the order to the supplier on WhatsApp.
 */

import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Ban, MessageCircle, PackageCheck, Phone, Printer, RotateCcw, Wheat } from 'lucide-react';
import { Button, Modal } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { renderReceipt } from '@core/receipt/html';
import { printHtml } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { purchasesApi, type Purchase, type PurchaseItem } from '../api/purchases.api';
import { STATUS } from './PurchasesListPage';

export interface PurchaseDetailConfig {
  /** Extra under a line, e.g. electronics serial entry. */
  itemExtra?: (args: { item: PurchaseItem; purchase: Purchase }) => ReactNode;
}

const money = (n: number) => formatPKR(n);
const q3 = (n: number) => Number((n ?? 0).toFixed(3)).toLocaleString('en-PK');
const rate = (i: PurchaseItem) => i.conversionRate || 1;
const left = (i: PurchaseItem) => Math.max((i.baseQuantity ?? i.quantity) - (i.receivedQty ?? 0), 0);
const canReturn = (i: PurchaseItem) => Math.max((i.receivedQty ?? 0) - (i.returnedQty ?? 0), 0);
const nameOf = (i: PurchaseItem) => i.itemName || i.product?.name || i.ingredient?.name || 'Cheez';
const baseUnit = (i: PurchaseItem) => i.product?.unit ?? i.ingredient?.unit ?? 'pcs';
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function PurchaseDetailPage({ config = {} }: { config?: PurchaseDetailConfig }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canEdit = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const [modal, setModal] = useState<'receive' | 'return' | 'cancel' | null>(null);
  const q = useQuery({ queryKey: ['purchase', id], queryFn: () => purchasesApi.getOne(id!), enabled: !!id });
  const p = q.data;

  const refresh = () => {
    ['purchase', 'purchase-list', 'purchases-summary', 'suppliers', 'product-catalog', 'products', 'purchase-sources', 'dashboard-overview']
      .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  if (q.isLoading) return <div className="flex justify-center py-24"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" /></div>;
  if (!p) return <div className="py-20 text-center"><p className="font-semibold text-slate-900">Kharidari nahi mili</p><Button className="mt-4" variant="secondary" onClick={() => navigate('/purchases')}>Wapas</Button></div>;

  const st = STATUS[p.status];
  const open = p.status === 'PENDING' || p.status === 'PARTIAL';
  const received = p.receivedValue ?? (p.status === 'RECEIVED' ? p.total : 0);
  const credit = Math.max(received - p.paidAmount, 0);
  const isOrder = p.status === 'PENDING';

  const print = () => {
    const setup = getReceiptSetup();
    const doc = {
      saleNumber: p.purchaseNumber,
      date: new Date(p.purchasedAt),
      customerName: p.supplier.name,
      customerPhone: p.supplier.phone ?? undefined,
      customerAddress: p.supplier.address ?? undefined,
      cashierName: p.createdBy?.fullName,
      branchName: p.shop?.name,
      infoRows: [
        ...(p.supplierInvoiceNo ? [{ label: 'Supplier bill #', value: p.supplierInvoiceNo }] : []),
        ...(p.expectedAt ? [{ label: 'Maal aana hai', value: day(p.expectedAt) }] : []),
      ],
      lines: p.items.map((i) => ({
        name: nameOf(i), qty: i.quantity, unit: i.unitName ?? baseUnit(i), price: i.costPrice, total: i.total,
        details: [rate(i) !== 1 ? `= ${q3(i.baseQuantity ?? i.quantity * rate(i))} ${baseUnit(i)}` : '', i.batchNo ? `Batch ${i.batchNo}` : '', i.expiryDate ? `Expiry ${day(i.expiryDate)}` : ''].filter(Boolean),
      })),
      subtotal: p.subtotal,
      discount: p.discount,
      extraRows: [
        ...((p.otherCharges ?? 0) > 0 ? [{ label: 'Kiraya / loading', value: `+${money(p.otherCharges!)}` }] : []),
        ...((p.taxAmount ?? 0) > 0 ? [{ label: 'Tax', value: `+${money(p.taxAmount!)}` }] : []),
        ...((p.returnedAmount ?? 0) > 0 ? [{ label: 'Maal wapas', value: `−${money(p.returnedAmount!)}` }] : []),
      ],
      total: p.total,
      paid: isOrder ? p.total : p.paidAmount,
      paymentLabel: `Diye (${POS_PAYMENT_METHODS.find((m) => m.id === p.paymentMethod)?.label ?? p.paymentMethod})`,
    };
    const design = { ...setup.design, a4Title: isOrder ? 'PURCHASE ORDER' : 'PURCHASE BILL', showStatus: !isOrder, payWhen: 'never' as const, showKhata: false, showSavings: false, backPrint: 'none' as const, showBarcode: true };
    printHtml(renderReceipt(doc, { ...setup, design }, { paper: 'A4' }));
  };

  const whatsapp = () => {
    const lines = [
      `*Order — ${p.purchaseNumber}*`, `${getReceiptSetup().shop.name}`, '',
      ...p.items.map((i, n) => `${n + 1}. ${nameOf(i)} — ${q3(i.quantity)} ${i.unitName ?? baseUnit(i)}`),
      '', p.expectedAt ? `Maal ${day(p.expectedAt)} tak bhej dein.` : 'Maal jaldi bhej dein.', 'Shukriya!',
    ];
    const phone = (p.supplier.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-10">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
        <div className="mr-auto min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-slate-900">
            {p.purchaseNumber}<span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-medium ring-1', st.tone)}>{st.label}</span>
          </h1>
          <p className="text-[0.8125rem] text-slate-500">{day(p.purchasedAt)}{p.shop?.name ? ` · ${p.shop.name}` : ''}{p.createdBy?.fullName ? ` · ${p.createdBy.fullName}` : ''}</p>
        </div>
        <Button variant="secondary" onClick={print} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
        {open && <Button variant="secondary" onClick={whatsapp} leftIcon={<MessageCircle className="h-4 w-4 text-emerald-600" />}>Order bhejein</Button>}
        {canEdit && open && <Button onClick={() => setModal('receive')} leftIcon={<PackageCheck className="h-4 w-4" />}>Maal aaya</Button>}
      </div>

      {p.status === 'CANCELLED' && <p className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">Cancel {day(p.cancelledAt)}{p.cancelReason ? ` — ${p.cancelReason}` : ''}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-slate-50 text-left text-[0.75rem] uppercase tracking-wide text-slate-500">
              <tr><th className="px-3 py-2">Cheez</th><th className="px-3 py-2 text-right">Miqdar</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Raqam</th><th className="px-3 py-2 text-right">Halat</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {p.items.map((i) => {
                const r = rate(i);
                const got = (i.receivedQty ?? 0) / r;
                const back = (i.returnedQty ?? 0) / r;
                return (
                  <tr key={i.id} className="align-top">
                    <td className="px-3 py-2.5">
                      <p className="flex items-center gap-1.5 font-medium text-slate-900">{i.ingredientId && <Wheat className="h-3.5 w-3.5 text-amber-600" />}{nameOf(i)}</p>
                      <p className="text-[0.75rem] text-slate-500">
                        {r !== 1 && `1 ${i.unitName} = ${q3(r)} ${baseUnit(i)} · `}{i.batchNo && `Batch ${i.batchNo} · `}{i.expiryDate && `Expiry ${day(i.expiryDate)}`}
                      </p>
                      {config.itemExtra?.({ item: i, purchase: p })}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{q3(i.quantity)} {i.unitName}{r !== 1 && <span className="block text-[0.75rem] text-slate-500">{q3(i.baseQuantity ?? i.quantity * r)} {baseUnit(i)}</span>}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(i.costPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{money(i.total)}</td>
                    <td className="px-3 py-2.5 text-right text-[0.75rem]">
                      {p.status !== 'RECEIVED' && p.status !== 'CANCELLED' && <span className="block text-slate-600">Aaya {q3(got)} / {q3(i.quantity)}</span>}
                      {back > 0 && <span className="block text-amber-700">Wapas {q3(back)}</span>}
                      {p.status === 'RECEIVED' && !back && <span className="text-emerald-600">Poora aaya</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside className="space-y-3">
          <Link to={`/suppliers/${p.supplier.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300">
            <p className="text-[0.75rem] text-slate-500">Supplier</p>
            <p className="font-semibold text-slate-900">{p.supplier.name}</p>
            {p.supplier.phone && <p className="mt-0.5 flex items-center gap-1 text-[0.8125rem] text-slate-600"><Phone className="h-3.5 w-3.5" /> {p.supplier.phone}</p>}
            {p.supplierInvoiceNo && <p className="mt-1 text-[0.8125rem] text-slate-600">Supplier ka bill # {p.supplierInvoiceNo}</p>}
            <p className="mt-2 text-[0.8125rem] font-medium text-brand-700">Khata aur adaigi →</p>
          </Link>

          <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <KV k="Cheezein" v={money(p.subtotal)} />
            {p.discount > 0 && <KV k="Discount" v={`−${money(p.discount)}`} />}
            {(p.otherCharges ?? 0) > 0 && <KV k="Kiraya / loading" v={`+${money(p.otherCharges!)}`} />}
            {(p.taxAmount ?? 0) > 0 && <KV k="Tax" v={`+${money(p.taxAmount!)}`} />}
            <div className="flex justify-between rounded-xl bg-slate-900 px-3 py-2 text-white"><span className="font-semibold">{isOrder ? 'Order' : 'Kul bill'}</span><span className="font-bold tabular-nums">{money(p.total)}</span></div>
            {p.status === 'PARTIAL' && <KV k="Ab tak maal aaya" v={money(received)} />}
            {!isOrder && <KV k="Diye" v={money(p.paidAmount)} />}
            {!isOrder && credit > 0 && <KV k="Udhaar par" v={money(credit)} tone="text-rose-600" />}
            {(p.returnedAmount ?? 0) > 0 && <KV k="Maal wapas" v={money(p.returnedAmount!)} tone="text-amber-700" />}
            {p.dueDate && credit > 0 && <KV k="Dena hai tak" v={day(p.dueDate)} />}
            {p.notes && <p className="border-t border-slate-100 pt-2 text-[0.8125rem] text-slate-600">{p.notes}</p>}
          </div>

          {canEdit && p.status !== 'CANCELLED' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-2">
              {(p.status === 'RECEIVED' || p.status === 'PARTIAL') && (
                <button type="button" onClick={() => setModal('return')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><RotateCcw className="h-4 w-4 text-amber-600" /> Maal wapas karein</button>
              )}
              {!(p.returnedAmount ?? 0) && (
                <button type="button" onClick={() => setModal('cancel')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-rose-700 hover:bg-rose-50"><Ban className="h-4 w-4" /> {isOrder ? 'Order cancel' : 'Bill cancel'}</button>
              )}
            </div>
          )}

          {!!p.carpetRolls?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">Rolls ({p.carpetRolls.length})</p>
              {p.carpetRolls.map((r) => (
                <div key={r.id} className="flex justify-between gap-2 border-t border-slate-100 py-1.5 text-[0.8125rem] first:border-0">
                  <span className="min-w-0 truncate text-slate-700">{r.rollNumber}{r.variant?.name ? ` · ${r.variant.name}` : ''} · {r.widthFt}ft{r.widthInch ? ` ${r.widthInch}in` : ''} × {r.originalLengthFt}ft</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{Number(r.remainingSqft.toFixed(1))}/{Number(r.originalSqft.toFixed(1))} sqft</span>
                </div>
              ))}
            </div>
          )}

          {!!p.returns?.length && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">Wapsi</p>
              {p.returns.map((r) => (
                <div key={r.id} className="flex justify-between border-t border-slate-100 py-1.5 text-[0.8125rem] first:border-0">
                  <span className="text-slate-600">{r.returnNumber} · {day(r.createdAt)}{r.reason ? ` · ${r.reason}` : ''}</span>
                  <span className="font-medium tabular-nums text-amber-700">{money(r.total)}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      {modal === 'receive' && <ReceiveModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'return' && <ReturnModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
      {modal === 'cancel' && <CancelModal p={p} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh(); }} />}
    </div>
  );
}

function KV({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return <div className="flex justify-between"><span className="text-slate-500">{k}</span><span className={cn('font-medium tabular-nums', tone ?? 'text-slate-900')}>{v}</span></div>;
}

/** Quantity per line in its own unit, limited to `max`. */
function QtyLines({ p, max, qty, setQty }: { p: Purchase; max: (i: PurchaseItem) => number; qty: Record<string, number>; setQty: (v: Record<string, number>) => void }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {p.items.filter((i) => max(i) > 0).map((i) => {
        const m = max(i) / rate(i);
        return (
          <li key={i.id} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{nameOf(i)}</p>
              <p className="text-[0.75rem] text-slate-500">Zyada se zyada {q3(m)} {i.unitName}</p>
            </div>
            <input type="number" min={0} max={m} step="any" value={qty[i.id] ?? ''} placeholder="0" aria-label={`${nameOf(i)} miqdar`}
              onChange={(e) => setQty({ ...qty, [i.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), m) })}
              className="h-9 w-24 rounded-lg border border-slate-200 px-2 text-right text-sm font-semibold tabular-nums outline-none focus:border-brand-500" />
            <span className="w-12 text-[0.75rem] text-slate-500">{i.unitName}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ReceiveModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(p.items.map((i) => [i.id, left(i) / rate(i)])));
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>(p.paymentMethod ?? 'CASH');
  const [close, setClose] = useState(false);
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.receive(p.id, {
      items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })),
      paidAmount: Number(paid) || 0, paymentMethod: method, close,
    }),
    onSuccess: (r) => { toast.success(r.status === 'RECEIVED' ? 'Maal aa gaya — order mukammal' : 'Itna maal aa gaya — baqi baad me'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Maal aaya" description="Jitna aaya utna likhein; baqi order khula rahega"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={mut.isPending} onClick={() => mut.mutate()} disabled={value <= 0 && !close}>Stock me daalein</Button></>}>
      <QtyLines p={p} max={left} qty={qty} setQty={setQty} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3 text-sm"><p className="text-slate-500">Is maal ki qeemat</p><p className="text-xl font-bold tabular-nums">{money(value)}</p></div>
        <div>
          <label className="text-[0.75rem] text-slate-500">Abhi kitne diye
            <input type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="0 = udhaar"
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-right text-sm outline-none focus:border-brand-500" />
          </label>
          <div className="mt-2 flex flex-wrap gap-1">
            {POS_PAYMENT_METHODS.map((m) => (
              <button key={m.id} type="button" onClick={() => setMethod(m.id)} aria-pressed={method === m.id}
                className={cn('rounded-lg px-2 py-1 text-[0.75rem] ring-1', method === m.id ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200')}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={close} onChange={(e) => setClose(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Baqi maal nahi aayega — order band karein
      </label>
    </Modal>
  );
}

function ReturnModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const factor = p.subtotal > 0 ? p.total / p.subtotal : 1;
  const value = p.items.reduce((s, i) => s + (qty[i.id] ?? 0) * i.costPrice * factor, 0);
  const mut = useMutation({
    mutationFn: () => purchasesApi.returnGoods(p.id, { items: Object.entries(qty).filter(([, v]) => v > 0).map(([itemId, quantity]) => ({ itemId, quantity })), reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(`${money(value)} ka maal wapas — supplier ka khata kam ho gaya`); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Supplier ko maal wapas" description="Stock kam hoga aur supplier ko dena (khata) utna ghat jayega"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={mut.isPending} disabled={value <= 0} onClick={() => mut.mutate()} leftIcon={<RotateCcw className="h-4 w-4" />}>Wapas karein · {money(value)}</Button></>}>
      <QtyLines p={p} max={canReturn} qty={qty} setQty={setQty} />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['Kharab maal', 'Ghalat maal aaya', 'Expiry qareeb', 'Zyada aa gaya'].map((r) => (
          <button key={r} type="button" onClick={() => setReason(r)} className={cn('rounded-full px-3 py-1 text-[0.8125rem] ring-1', reason === r ? 'bg-amber-600 text-white ring-amber-600' : 'text-slate-600 ring-slate-200')}>{r}</button>
        ))}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah" aria-label="Wajah" maxLength={200}
        className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-amber-500" />
    </Modal>
  );
}

function CancelModal({ p, onClose, onDone }: { p: Purchase; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const isOrder = p.status === 'PENDING';
  const mut = useMutation({
    mutationFn: () => purchasesApi.cancel(p.id, reason.trim()),
    onSuccess: () => { toast.success(isOrder ? 'Order cancel' : 'Bill cancel — stock aur khata wapas'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi hua'),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={isOrder ? 'Order cancel karein?' : 'Bill cancel karein?'}
      description={isOrder ? 'Stock par koi asar nahi.' : `Aaya hua maal stock se nikal jayega aur supplier ka khata ulat jayega.${p.paidAmount > 0 ? ` Diye hue ${money(p.paidAmount)} supplier se wapas lene honge.` : ''}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={mut.isPending} disabled={!reason.trim()} onClick={() => mut.mutate()}>Cancel karein</Button></>}>
      <input data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah likhein" aria-label="Wajah" maxLength={200}
        className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-rose-500" />
    </Modal>
  );
}
