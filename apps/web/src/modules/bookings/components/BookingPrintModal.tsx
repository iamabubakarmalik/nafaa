/**
 * Print a booking slip through the receipt engine: thermal or A4, with or
 * without rates, the payment history, notes, pickup date and the shop's
 * terms. A live preview shows exactly what prints; choices are remembered
 * on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { Booking } from '../api/bookings.api';
import { STATUS, dayText, itemLabel } from './meta';

interface Opts {
  paper: ReceiptPaper;
  prices: boolean;
  payments: boolean;
  notes: boolean;
  terms: boolean;
  signature: boolean;
  copies: number;
}

const STORE = 'nafaa-booking-print';
const method = (m: string) => POS_PAYMENT_METHODS.find((x) => x.id === m)?.label ?? m;
const money = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

function load(): Opts {
  const base: Opts = { paper: '80', prices: true, payments: true, notes: true, terms: true, signature: false, copies: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return base; }
}

/** The slip as a receipt document, for the preview and the print. */
function bookingReceipt(b: Booking, o: Pick<Opts, 'prices' | 'payments' | 'notes'>): ReceiptDoc {
  const paid = b.totalPaid - b.totalRefunded;
  const pays = (b.payments ?? []).slice().reverse();
  return {
    saleNumber: b.bookingNumber,
    date: new Date(b.createdAt),
    stamp: b.status === 'CANCELLED' || b.status === 'EXPIRED' ? 'CANCEL' : 'BOOKING',
    branchName: b.shop?.name,
    customerName: b.customer?.name,
    customerPhone: b.customer?.phone ?? undefined,
    cashierName: b.createdBy?.fullName,
    partyLabel: 'Customer',
    signLabels: ['Customer ke dastkhat', 'Dukaan ki mohar / dastkhat'],
    infoRows: [
      { label: 'Haal', value: STATUS[b.status].label },
      ...(b.expectedPickupAt ? [{ label: 'Pickup', value: dayText(b.expectedPickupAt), bold: true }] : []),
      ...(b.expiresAt ? [{ label: 'Aakhri din', value: dayText(b.expiresAt) }] : []),
      ...(b.sale ? [{ label: 'Bill', value: b.sale.saleNumber }] : []),
    ],
    lines: (b.items ?? []).map((i) => ({
      name: itemLabel(i),
      qty: i.quantity,
      unit: i.product?.unit ?? 'pcs',
      price: i.price,
      total: i.total,
      discount: i.lineDiscount || undefined,
      note: i.note ?? undefined,
      details: [i.imei ? `IMEI ${i.imei.imei1}` : '', i.cutPiece ? `Piece ${i.cutPiece.pieceCode}` : '', i.roll ? `Roll ${i.roll.rollNumber}` : ''].filter(Boolean),
    })),
    subtotal: b.subtotal,
    discount: b.discount,
    extraRows: [
      ...(b.serviceChargesBreakdown ?? []).map((c) => ({ label: c.label, value: `+${money(Number(c.amount))}` })),
      ...(b.totalRefunded > 0 ? [{ label: 'Wapas diya', value: `−${money(b.totalRefunded)}` }] : []),
    ],
    total: b.total,
    paid,
    paymentLabel: b.status === 'CONVERTED' ? `Diya (${method(b.paymentMethod)})` : 'Advance diya',
    hidePrices: !o.prices,
    footerNote: o.notes && b.notes ? b.notes : undefined,
    boxes: o.payments && pays.length
      ? [{ title: 'Payments', lines: pays.map((p) => `${new Date(p.paidAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · ${p.type === 'REFUND' ? 'Return' : p.type === 'ADVANCE' ? 'Advance' : 'Mazeed'} · ${method(p.paymentMethod)} · ${p.type === 'REFUND' ? '−' : ''}${money(p.amount)}`) }]
      : undefined,
  };
}

export function BookingPrintModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const [o, setO] = useState<Opts>(load);
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const base = getReceiptSetup();
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: 'BOOKING SLIP', showStatus: false, showSignature: o.signature, showKhata: false, showSavings: false,
      showReviewQr: false, showBarcode: true, terms: o.terms ? base.design.terms : '', backPrint: 'none' as const,
      showCustomer: true, showAmountInWords: false,
    },
  }), [base, o]);
  const doc = useMemo(() => bookingReceipt(booking, o), [booking, o]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  const Toggle = ({ k, label, hint }: { k: 'prices' | 'payments' | 'notes' | 'terms' | 'signature'; label: string; hint?: string }) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
      <input type="checkbox" checked={o[k]} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span><span className="block text-sm text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Booking slip print" description="Customer ko slip dein; pasand is device par yaad rahegi"
      footer={<>
        <span className="mr-auto text-[0.75rem] text-slate-500">PDF chahiye to print me "Save as PDF" chunein</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={go} leftIcon={<Printer className="h-4 w-4" />}>Print{o.copies > 1 ? ` (${o.copies})` : ''}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kaghaz</p>
            <Segmented label="Kaghaz" value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: '80', label: '80mm' }, { value: '58', label: '58mm' }, { value: 'A4', label: 'A4' }]} />
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Slip par</p>
            <Toggle k="prices" label="Rates aur amount" hint="Karigar ki copy me chhupa sakte hain" />
            <Toggle k="payments" label="Payments ki list" hint="Kab kitna advance aaya" />
            <Toggle k="notes" label="Customer ka note" />
            <Toggle k="terms" label="Shartein (Settings se)" />
            <Toggle k="signature" label="Dastkhat ki jagah (A4)" />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Copies</p>
            <Segmented label="Copies" value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">2 copies: ek customer ki, ek dukaan ki</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
