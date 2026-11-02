/**
 * Prints a return slip in the shop's bill design: what came back, at what
 * rate, how the money went back (khata and hand), the original bill and the
 * reason. A live preview shows what prints; paper and copies are remembered
 * on this device.
 */

import { useEffect, useMemo, useState } from 'react';
import { Printer } from 'lucide-react';
import { Button, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptPaper } from '@core/receipt/types';
import type { ReturnRow } from '../api/returns.api';
import { methodLabel, qtyText } from './meta';
import { t } from '@core/i18n';

interface Opts { paper: ReceiptPaper; copies: number; reason: boolean; signature: boolean }

const STORE = 'nafaa-return-slip';
const day = (v: string) => new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });

function load(fallback: ReceiptPaper): Opts {
  const base: Opts = { paper: fallback, copies: 1, reason: true, signature: true };
  try { return { ...base, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return base; }
}

export function ReturnSlipModal({ r, onClose }: { r: ReturnRow; onClose: () => void }) {
  const base = getReceiptSetup();
  const [o, setO] = useState<Opts>(() => load(base.design.paper));
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);

  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: t('RETURN KI PARCHI'), showStatus: false, showSignature: o.signature, payWhen: 'never' as const, showPayQr: false,
      showKhata: false, showSavings: false, showReviewQr: false, showBarcode: false, backPrint: 'none' as const, showCustomer: true,
    },
  }), [base, o.signature]);

  const doc = useMemo<ReceiptDoc>(() => ({
    saleNumber: r.returnNumber,
    date: new Date(r.returnedAt),
    stamp: t('WAPSI'),
    branchName: r.shop?.name,
    customerName: r.sale.customer?.name ?? t('Walk-in'),
    customerPhone: r.sale.customer?.phone ?? undefined,
    cashierName: r.createdBy?.fullName,
    partyLabel: t('Customer'),
    signLabels: [t('Customer ke dastkhat'), t('Dukaan ki mohar / dastkhat')],
    infoRows: [
      { label: t('Asal bill'), value: `${r.sale.saleNumber} · ${day(r.sale.soldAt)}`, bold: true },
      ...(o.reason && r.reason ? [{ label: t('Wajah'), value: t(r.reason) }] : []),
      ...(r.approvedBy ? [{ label: t('Approval'), value: r.approvedBy }] : []),
    ],
    lines: r.items.map((i) => ({
      name: i.variant ? `${i.name} · ${i.variant}` : i.name,
      qty: i.quantity,
      unit: i.unit,
      price: i.refundPrice,
      total: i.total,
      details: [
        ...i.units,
        i.writtenOffQty > 0 ? t('{{writtenOffQty}} kharab — stock me nahi', { writtenOffQty: qtyText(i.writtenOffQty) }) : '',
      ].filter(Boolean),
    })),
    subtotal: r.refundAmount,
    discount: 0,
    total: r.refundAmount,
    paid: r.refundAmount,
    paymentLabel: t('Return ({{refundMethod}})', { refundMethod: methodLabel(r.refundMethod) }),
    boxes: r.khataAmount > 0 ? [{
      title: t('Paisa kaise wapas'),
      lines: [t('Khate se kam: {{khataAmount}}', { khataAmount: formatPKR(r.khataAmount) }), t('Haath me diye: {{payout}}', { payout: formatPKR(r.payout) })],
    }] : undefined,
    footerNote: o.reason && r.notes ? r.notes : undefined,
  }), [r, o.reason]);

  const go = () => { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); };

  return (
    <Modal open onClose={onClose} size="xl" title={t('Return ki parchi — {{returnNumber}}', { returnNumber: r.returnNumber })} description={t('Kaghaz chunein aur saath preview dekhein; pasand is device par yaad rahegi')}
      footer={<>
        <span className="me-auto text-[0.75rem] text-slate-500">{t('PDF chahiye to print me "Save as PDF" chunein')}</span>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={go} leftIcon={<Printer className="h-4 w-4" />}>{t('Print{{value}}', { value: o.copies > 1 ? ` (${o.copies})` : '' })}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Kaghaz')}</p>
            <Segmented label={t('Kaghaz')} value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: '80', label: t('80mm') }, { value: '58', label: t('58mm') }, { value: 'A4', label: t('A4') }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">{t('Counter par aam tor par 80mm. File ke liye A4.')}</p>
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Parchi par')}</p>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={o.reason} onChange={(e) => set('reason', e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
              <span className="text-sm text-slate-800">{t('Wajah aur note')}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={o.signature} onChange={(e) => set('signature', e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
              <span><span className="block text-sm text-slate-800">{t('Dastkhat ki jagah')}</span><span className="block text-[0.6875rem] text-slate-500">{t('A4 par — customer se paise milne ka saboot')}</span></span>
            </label>
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Copies')}</p>
            <Segmented label={t('Copies')} value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">{t('2 copies: ek customer ko, ek dukaan ke record me.')}</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
        </div>
      </div>
    </Modal>
  );
}
