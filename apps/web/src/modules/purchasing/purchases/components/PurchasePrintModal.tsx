/**
 * Print a purchase the way it is needed: a purchase bill, an order for the
 * supplier (with or without rates) or a goods received note; A4 or thermal;
 * with the supplier's details and bank account, our payment accounts,
 * batch/expiry, note, terms and signatures. A live preview shows exactly
 * what prints; the choices are remembered on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { Purchase } from '../api/purchases.api';

type Kind = 'bill' | 'order' | 'grn';
interface Opts {
  kind: Kind;
  paper: ReceiptPaper;
  prices: boolean;
  supplier: boolean;
  supplierBank: boolean;
  ourAccounts: boolean;
  batch: boolean;
  notes: boolean;
  terms: boolean;
  signature: boolean;
  logo: boolean;
  copies: number;
}

const STORE = 'nafaa-purchase-print';
const TITLES: Record<Kind, string> = { bill: 'PURCHASE BILL', order: 'PURCHASE ORDER', grn: 'GOODS RECEIVED' };
const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function load(order: boolean): Opts {
  const base: Opts = { kind: order ? 'order' : 'bill', paper: 'A4', prices: !order, supplier: true, supplierBank: false, ourAccounts: false, batch: true, notes: true, terms: false, signature: true, logo: true, copies: 1 };
  try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); return s ? { ...base, ...s, kind: order ? 'order' : s.kind === 'order' ? 'bill' : s.kind, prices: order ? false : s.prices ?? true } : base; } catch { return base; }
}

export function PurchasePrintModal({ p, onClose }: { p: Purchase; onClose: () => void }) {
  const isOrder = p.status === 'PENDING';
  const [o, setO] = useState<Opts>(() => load(isOrder));
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const base = getReceiptSetup();
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: TITLES[o.kind], showStatus: o.kind === 'bill', showLogo: o.logo, showSignature: o.signature,
      payWhen: o.ourAccounts ? 'always' as const : 'never' as const, showPayQr: false, showKhata: false, showSavings: false,
      showReviewQr: false, terms: o.terms ? base.design.terms : '', footer: '', backPrint: 'none' as const, showCustomer: true,
      showItemDetails: true, showAmountInWords: o.prices,
    },
  }), [base, o]);

  const doc = useMemo<ReceiptDoc>(() => {
    const s = p.supplier as Purchase['supplier'] & { ntn?: string | null; bankName?: string | null; accountNumber?: string | null; iban?: string | null };
    const received = p.receivedValue ?? p.total;
    const amount = o.kind === 'order' ? p.total : received;
    const method = POS_PAYMENT_METHODS.find((m) => m.id === p.paymentMethod)?.label ?? p.paymentMethod;
    return {
      saleNumber: p.purchaseNumber,
      date: new Date(p.purchasedAt),
      partyLabel: 'Supplier',
      signLabels: o.kind === 'grn' ? ['Maal dene wala', 'Maal lene wala (dukaan)'] : ['Supplier ke dastkhat', 'Dukaan ki mohar / dastkhat'],
      customerName: p.supplier.name,
      customerPhone: o.supplier ? p.supplier.phone ?? undefined : undefined,
      customerAddress: o.supplier ? p.supplier.address ?? undefined : undefined,
      customerTaxId: o.supplier ? s.ntn ?? undefined : undefined,
      cashierName: p.createdBy?.fullName,
      branchName: p.shop?.name,
      infoRows: [
        ...(p.supplierInvoiceNo ? [{ label: 'Supplier bill #', value: p.supplierInvoiceNo }] : []),
        ...(o.kind === 'order' && p.expectedAt ? [{ label: 'Maal chahiye', value: day(p.expectedAt), bold: true }] : []),
        ...(p.dueDate && o.prices ? [{ label: 'Payment tak', value: day(p.dueDate) }] : []),
      ],
      lines: p.items.map((i) => {
        const r = i.conversionRate ?? 1;
        const base = i.product?.unit ?? i.ingredient?.unit ?? 'pcs';
        const qty = o.kind === 'grn' ? Number(((i.receivedQty ?? i.quantity * r) / r).toFixed(3)) : i.quantity;
        return {
          name: i.itemName || i.product?.name || i.ingredient?.name || 'Cheez',
          qty, unit: i.unitName ?? base, price: i.costPrice, total: Number((qty * i.costPrice).toFixed(2)),
          details: [
            r !== 1 ? `1 ${i.unitName} = ${Number(r.toFixed(3))} ${base}` : '',
            o.batch && i.batchNo ? `Batch ${i.batchNo}` : '', o.batch && i.expiryDate ? `Expiry ${day(i.expiryDate)}` : '',
          ].filter(Boolean),
        };
      }),
      subtotal: p.subtotal,
      discount: p.discount,
      extraRows: [
        ...((p.otherCharges ?? 0) > 0 ? [{ label: 'Kiraya / loading', value: `+Rs ${Math.round(p.otherCharges!).toLocaleString('en-PK')}` }] : []),
        ...((p.taxAmount ?? 0) > 0 ? [{ label: 'Tax', value: `+Rs ${Math.round(p.taxAmount!).toLocaleString('en-PK')}` }] : []),
        ...((p.returnedAmount ?? 0) > 0 && o.kind === 'bill' ? [{ label: 'Maal wapas', value: `−Rs ${Math.round(p.returnedAmount!).toLocaleString('en-PK')}` }] : []),
      ],
      total: amount,
      paid: o.kind === 'order' ? amount : p.paidAmount,
      paymentLabel: o.kind === 'order' ? 'Order ki amount' : `Diye (${method})`,
      hidePrices: !o.prices,
      footerNote: o.notes && p.notes ? p.notes : undefined,
      boxes: o.supplierBank && (s.bankName || s.accountNumber || s.iban)
        ? [{ title: 'Supplier ka bank', lines: [s.bankName, s.accountNumber && `A/C ${s.accountNumber}`, s.iban && `IBAN ${s.iban}`].filter(Boolean) as string[] }]
        : undefined,
      stamp: p.status === 'CANCELLED' ? 'CANCEL' : undefined,
    };
  }, [p, o]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  const Toggle = ({ k, label, hint }: { k: keyof Opts; label: string; hint?: string }) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
      <input type="checkbox" checked={!!o[k]} onChange={(e) => set(k, e.target.checked as never)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span><span className="block text-sm text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Print — kya chhape" description="Chunein aur saath preview dekhein; pasand is device par yaad rahegi"
      footer={<>
        <span className="mr-auto text-[0.75rem] text-slate-500">PDF chahiye to print me "Save as PDF" chunein</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={go} leftIcon={<Printer className="h-4 w-4" />}>Print{o.copies > 1 ? ` (${o.copies})` : ''}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kya hai</p>
            <div className="grid grid-cols-3 gap-1">
              {([['bill', 'Bill'], ['order', 'Order'], ['grn', 'Maal receiving']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setO((x) => ({ ...x, kind: k, prices: k === 'order' ? false : x.prices }))} aria-pressed={o.kind === k}
                  className={cn('rounded-lg px-2 py-2 text-[0.8125rem] font-medium ring-1 transition', o.kind === k ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200')}>{l}</button>
              ))}
            </div>
            <p className="mt-1 text-[0.6875rem] text-slate-500">{o.kind === 'order' ? 'Supplier ko bhejne ke liye — kya chahiye' : o.kind === 'grn' ? 'Jo maal asal me aaya, dastkhat ke saath' : 'Poora bill amount ke saath'}</p>
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kaghaz</p>
            <Segmented label="Kaghaz" value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: 'A4', label: 'A4' }, { value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Bill par</p>
            <Toggle k="prices" label="Rates aur amount" hint="Order bhejte waqt chhupa sakte hain" />
            <Toggle k="supplier" label="Supplier ka pata, phone, NTN" />
            <Toggle k="supplierBank" label="Supplier ka bank account" hint="Payment karne wale ke liye" />
            <Toggle k="ourAccounts" label="Hamare payment accounts" hint="Settings → Raseed wale accounts" />
            <Toggle k="batch" label="Batch aur expiry" />
            <Toggle k="notes" label="Bill ka note" />
            <Toggle k="terms" label="Shartein (Settings se)" />
            <Toggle k="signature" label="Dastkhat ki jagah (A4)" />
            <Toggle k="logo" label="Logo" />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Copies</p>
            <Segmented label="Copies" value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
