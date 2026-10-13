/**
 * Print a transfer as a delivery challan (what was sent, to go with the
 * goods) or a receiving slip (sent against what arrived), on A4 or thermal,
 * with or without rates, signature lines for the sender and the receiver,
 * the note and copies. A live preview shows exactly what prints; the
 * choices are remembered on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import type { StockTransfer } from '../api/transfers.api';
import { STATUS, dayTime, duration, lineName, lineRef, lineUnit, qty, shortValue } from './transferMeta';

type Kind = 'challan' | 'received';
interface Opts {
  kind: Kind;
  paper: ReceiptPaper;
  prices: boolean;
  signature: boolean;
  notes: boolean;
  logo: boolean;
  copies: number;
}

const STORE = 'nafaa-transfer-print';
const TITLES: Record<Kind, string> = { challan: 'DELIVERY CHALLAN', received: 'STOCK RECEIVED' };
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString('en-PK')}`;

function load(received: boolean): Opts {
  const base: Opts = { kind: received ? 'received' : 'challan', paper: 'A4', prices: true, signature: true, notes: true, logo: true, copies: 2 };
  try {
    const s = JSON.parse(localStorage.getItem(STORE) || 'null');
    return s ? { ...base, ...s, kind: received ? s.kind ?? 'received' : 'challan' } : base;
  } catch { return base; }
}

export function TransferPrintModal({ t, onClose }: { t: StockTransfer; onClose: () => void }) {
  const received = t.status === 'RECEIVED';
  const [o, setO] = useState<Opts>(() => load(received));
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const base = getReceiptSetup();
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: TITLES[o.kind], showStatus: false, showLogo: o.logo, showSignature: o.signature,
      payWhen: 'never' as const, showPayQr: false, showKhata: false, showSavings: false, showReviewQr: false,
      terms: '', footer: '', backPrint: 'none' as const, showCustomer: true, showItemDetails: true, showAmountInWords: o.prices,
    },
  }), [base, o]);

  const doc = useMemo<ReceiptDoc>(() => {
    const got = o.kind === 'received';
    const short = shortValue(t);
    const lines = t.items.map((i) => {
      const q = got ? i.receivedQty ?? 0 : i.quantity;
      return {
        name: lineName(i),
        qty: Number(q.toFixed(3)), unit: lineUnit(i), price: i.unitCost, total: Number((q * i.unitCost).toFixed(2)),
        details: [
          lineRef(i), i.notes ?? '',
          got && i.receivedQty < i.quantity ? `Bheje ${qty(i.quantity)}, aaye ${qty(i.receivedQty)} — kam ${qty(i.quantity - i.receivedQty)}` : '',
        ].filter(Boolean),
      };
    });
    const total = lines.reduce((s, l) => s + l.total, 0);
    return {
      saleNumber: t.transferNumber,
      date: new Date(t.transferredAt ?? t.createdAt),
      partyLabel: 'Maal kis branch ko',
      signLabels: ['Bhejne wala', 'Lene wala'],
      customerName: t.toShop.name,
      customerAddress: t.toShop.address ?? undefined,
      customerPhone: t.toShop.phone ?? undefined,
      branchName: t.fromShop.name,
      branchAddress: t.fromShop.address,
      branchPhone: t.fromShop.phone,
      cashierName: t.createdBy?.fullName,
      infoRows: [
        { label: 'Kahan se', value: t.fromShop.name, bold: true },
        { label: 'Kahan', value: t.toShop.name, bold: true },
        { label: 'Halat', value: STATUS[t.status].label },
        ...(t.receivedAt ? [{ label: 'Receive', value: `${dayTime(t.receivedAt)}${t.receivedBy ? ` · ${t.receivedBy.fullName}` : ''}` }] : []),
        ...(t.receivedAt ? [{ label: 'Waqt laga', value: duration(t.transferredAt ?? t.createdAt, t.receivedAt) }] : []),
        ...(t.cancelledAt ? [{ label: 'Cancel', value: `${dayTime(t.cancelledAt)}${t.cancelReason ? ` · ${t.cancelReason}` : ''}` }] : []),
      ],
      lines,
      subtotal: total,
      discount: 0,
      extraRows: got && short > 0 ? [{ label: 'Kam aaya (qeemat)', value: rs(short), bold: true }] : [],
      total,
      paid: total,
      paymentLabel: got ? 'Receive maal ki qeemat' : 'Bheje maal ki qeemat',
      hidePrices: !o.prices,
      footerNote: o.notes && t.notes ? t.notes : undefined,
      stamp: t.status === 'CANCELLED' ? 'CANCEL' : undefined,
    };
  }, [t, o]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  const Toggle = ({ k, label, hint }: { k: 'prices' | 'signature' | 'notes' | 'logo'; label: string; hint?: string }) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
      <input type="checkbox" checked={o[k]} onChange={(e) => set(k, e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span><span className="block text-sm text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Transfer print" description="Chunein aur saath preview dekhein; pasand is device par yaad rahegi"
      footer={<>
        <span className="mr-auto text-[0.75rem] text-slate-500">PDF chahiye to print me "Save as PDF" chunein</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={go} leftIcon={<Printer className="h-4 w-4" />}>Print{o.copies > 1 ? ` (${o.copies})` : ''}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kya hai</p>
            <div className="grid grid-cols-2 gap-1">
              {([['challan', 'Delivery challan'], ['received', 'Receiving slip']] as const).map(([k, l]) => (
                <button key={k} type="button" disabled={k === 'received' && !received} onClick={() => set('kind', k)} aria-pressed={o.kind === k}
                  className={cn('rounded-lg px-2 py-2 text-[0.8125rem] font-medium ring-1 transition disabled:opacity-40', o.kind === k ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-700 ring-slate-200')}>{l}</button>
              ))}
            </div>
            <p className="mt-1 text-[0.6875rem] text-slate-500">
              {o.kind === 'challan' ? 'Maal ke saath bhejein — lene wala gin kar dastkhat kare' : 'Jo maal asal me aaya, kami ke saath'}
              {!received && ' · Receiving slip maal aane ke baad'}
            </p>
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kaghaz</p>
            <Segmented label="Kaghaz" value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: 'A4', label: 'A4' }, { value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Slip par</p>
            <Toggle k="prices" label="Rates aur qeemat dikhayein" hint="Driver ya rider ke haath bhejna ho to chhupa dein" />
            <Toggle k="signature" label="Dastkhat ki jagah (A4)" hint="Bhejne wala aur lene wala" />
            <Toggle k="notes" label="Transfer ka note" />
            <Toggle k="logo" label="Logo" />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Copies</p>
            <Segmented label="Copies" value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">2 copies: ek bhejne wali branch, ek lene wali ke liye</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
