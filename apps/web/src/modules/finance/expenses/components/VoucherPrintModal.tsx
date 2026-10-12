/**
 * Prints one expense as a payment voucher through the receipt engine: A4 or
 * thermal, with or without the note and signature lines, with a live preview.
 * Choices are remembered on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import type { Expense } from '../api/expenses.api';
import { STATUS, catOf, methodOf } from './meta';

interface Opts { paper: ReceiptPaper; notes: boolean; signature: boolean; logo: boolean; copies: number }

const STORE = 'nafaa-expense-voucher-print';

function load(): Opts {
  const base: Opts = { paper: '80', notes: true, signature: true, logo: true, copies: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return base; }
}

export function VoucherPrintModal({ expense: e, onClose }: { expense: Expense; onClose: () => void }) {
  const [o, setO] = useState<Opts>(load);
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const base = getReceiptSetup();
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: 'EXPENSE VOUCHER', showStatus: false, showLogo: o.logo, showSignature: o.signature,
      payWhen: 'never' as const, showPayQr: false, showKhata: false, showSavings: false, showReviewQr: false, showBarcode: false,
      terms: '', footer: '', backPrint: 'none' as const, showCustomer: true, showItemDetails: true, showAmountInWords: true,
    },
  }), [base, o]);

  const doc = useMemo<ReceiptDoc>(() => {
    const cat = catOf(e);
    const method = methodOf(e.paymentMethod).label;
    const paid = e.status === 'PAID';
    return {
      saleNumber: e.expenseNumber,
      date: new Date(e.expenseDate),
      partyLabel: 'Kharcha',
      signLabels: ['Lene wale ke dastkhat', 'Dene wale ke dastkhat'],
      customerName: e.title,
      cashierName: e.createdBy?.fullName,
      branchName: e.shop?.name,
      infoRows: [
        { label: 'Category', value: cat.name },
        { label: 'Haal', value: STATUS[e.status].label, bold: !paid },
      ],
      lines: [{
        name: e.title, qty: 1, unit: '', price: e.amount, total: e.amount,
        details: o.notes && e.description ? [e.description] : undefined,
      }],
      subtotal: e.amount,
      discount: 0,
      total: e.amount,
      paid: paid ? e.amount : 0,
      paymentLabel: paid ? `Diye (${method})` : 'Abhi diye nahi',
      stamp: e.status === 'CANCELLED' ? 'CANCEL' : e.status === 'PENDING' ? 'BAQI' : undefined,
    };
  }, [e, o.notes]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  const Toggle = ({ k, label, hint }: { k: 'notes' | 'signature' | 'logo'; label: string; hint?: string }) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
      <input type="checkbox" checked={o[k]} onChange={(ev) => set(k, ev.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span><span className="block text-sm text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Voucher print" description="Kharche ki parchi — dastkhat ke saath file me rakhein"
      footer={<>
        <span className="mr-auto hidden text-[0.75rem] text-slate-500 sm:inline">PDF chahiye to print me "Save as PDF" chunein</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button onClick={go} leftIcon={<Printer className="h-4 w-4" />}>Print{o.copies > 1 ? ` (${o.copies})` : ''}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kaghaz</p>
            <Segmented label="Kaghaz" value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: 'A4', label: 'A4' }, { value: '80', label: '80mm' }, { value: '58', label: '58mm' }]} />
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Voucher par</p>
            <Toggle k="notes" label="Tafseel / note" hint="Kharche ke saath likhi baat" />
            <Toggle k="signature" label="Dastkhat ki jagah" hint="Lene aur dene wale dono ke liye (A4)" />
            <Toggle k="logo" label="Logo" />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Copies</p>
            <Segmented label="Copies" value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">2 copies: ek lene wale ko, ek apni file me</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
