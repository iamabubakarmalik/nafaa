/**
 * Prints one person's commission slip through the receipt engine: A4 or
 * thermal, with or without the rule working and signature lines, with a live
 * preview. Choices are remembered on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import type { CommissionDetail } from '../api/commission.api';
import { PAY, periodLabel } from './meta';
import { lineBase, returnText } from './print';

interface Opts { paper: ReceiptPaper; working: boolean; signature: boolean; logo: boolean; copies: number }

const STORE = 'nafaa-commission-slip-print';

function load(): Opts {
  const base: Opts = { paper: '80', working: true, signature: true, logo: true, copies: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return base; }
}

export function StatementPrintModal({ d, onClose }: { d: CommissionDetail; onClose: () => void }) {
  const [o, setO] = useState<Opts>(load);
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const base = getReceiptSetup();
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: 'COMMISSION SLIP', showStatus: false, showLogo: o.logo, showSignature: o.signature,
      payWhen: 'never' as const, showPayQr: false, showKhata: false, showSavings: false, showReviewQr: false, showBarcode: false,
      terms: '', footer: '', backPrint: 'none' as const, showCustomer: true, showItemDetails: true, showAmountInWords: true,
    },
  }), [base, o]);

  const doc = useMemo<ReceiptDoc>(() => {
    const earnedOnSales = d.lines.reduce((a, l) => a + l.amount + l.returnAmount, 0);
    const takenBack = d.lines.reduce((a, l) => a + l.returnAmount, 0);
    const paid = d.paidAmount ?? 0;
    return {
      saleNumber: `COM-${d.period}`,
      date: d.paidAt ? new Date(d.paidAt) : new Date(),
      partyLabel: 'Banda',
      signLabels: ['Lene wale ke dastkhat', 'Dene wale ke dastkhat'],
      customerName: d.name,
      infoRows: [
        { label: 'Mahina', value: periodLabel(d.period), bold: true },
        ...(d.staff?.designation ? [{ label: 'Kaam', value: d.staff.designation }] : []),
        { label: 'Bill', value: String(d.bills) },
        { label: 'Asal sale', value: formatPKR(d.sale) },
      ],
      lines: d.lines.length
        ? d.lines.map((l) => ({
          name: l.label, qty: 1, unit: '', price: l.amount + l.returnAmount, total: l.amount + l.returnAmount,
          details: o.working ? [lineBase(l)] : undefined,
        }))
        : [{ name: 'Is mahine koi commission nahi', qty: 1, unit: '', price: 0, total: 0 }],
      subtotal: earnedOnSales,
      discount: 0,
      extraRows: takenBack ? [{ label: `Return par wapas (${d.lines.filter((l) => l.returnAmount).map(returnText).join(', ')})`, value: `−Rs ${Math.round(takenBack).toLocaleString('en-PK')}` }] : undefined,
      total: d.earned,
      paid,
      paymentLabel: paid ? 'Ada hua' : 'Abhi ada nahi',
      stamp: d.payStatus === 'full' ? undefined : PAY[d.payStatus].label.toUpperCase(),
    };
  }, [d, o.working]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  const Toggle = ({ k, label, hint }: { k: 'working' | 'signature' | 'logo'; label: string; hint?: string }) => (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
      <input type="checkbox" checked={o[k]} onChange={(ev) => set(k, ev.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
      <span><span className="block text-sm text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</span>
    </label>
  );

  return (
    <Modal open onClose={onClose} size="xl" title="Commission slip" description="Bande ko dene ke liye — dastkhat ke saath file me rakhein"
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
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Slip par</p>
            <Toggle k="working" label="Hisab kaise bana" hint="Har rule ke neeche sale × rate" />
            <Toggle k="signature" label="Dastkhat ki jagah" hint="Lene aur dene wale dono (A4)" />
            <Toggle k="logo" label="Logo" />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Copies</p>
            <Segmented label="Copies" value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">2 copies: ek bande ko, ek apni file me</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
