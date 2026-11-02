/**
 * Prints a salary slip or an advance voucher through the receipt engine: A4
 * or thermal, with the earnings, every deduction with its reason, what was
 * paid and from where, and signature lines. Choices are remembered on this
 * device.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Button, Checkbox, Modal, Segmented, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { ReceiptPreview } from '@core/receipt/ReceiptPreview';
import { printReceipt } from '@core/receipt/print';
import { getReceiptSetup } from '@core/receipt/setup';
import type { ReceiptDoc, ReceiptLineDoc, ReceiptPaper } from '@core/receipt/types';
import { payrollApi, type RecordDetail } from '../api/payroll.api';
import { METHOD_LABEL, PAYROLL_KEY, SALARY_TYPE, STATUS, dayTime, qty } from './meta';
import { t } from '@core/i18n';

interface Opts { paper: ReceiptPaper; bank: boolean; signature: boolean; logo: boolean; copies: number }

const STORE = 'nafaa-payslip-print';

function load(): Opts {
  const base: Opts = { paper: 'A4', bank: true, signature: true, logo: true, copies: 1 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { return base; }
}

export function PayslipPrintModal({ recordId, onClose }: { recordId: string; onClose: () => void }) {
  const [o, setO] = useState<Opts>(load);
  const set = <K extends keyof Opts>(k: K, v: Opts[K]) => setO((x) => ({ ...x, [k]: v }));
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(o)); } catch { /* storage blocked */ } }, [o]);
  const q = useQuery({ queryKey: [PAYROLL_KEY, 'record', recordId], queryFn: () => payrollApi.record(recordId) });
  const r = q.data;

  const base = getReceiptSetup();
  const advance = r?.kind === 'advance';
  const setup = useMemo(() => ({
    shop: base.shop,
    design: {
      ...base.design,
      a4Title: advance ? t('ADVANCE VOUCHER') : t('SALARY SLIP'), showStatus: false, showLogo: o.logo, showSignature: o.signature,
      payWhen: 'never' as const, showPayQr: false, showKhata: false, showSavings: false, showReviewQr: false, showBarcode: false,
      terms: '', footer: '', backPrint: 'none' as const, showCustomer: true, showItemDetails: true, showAmountInWords: true,
    },
  }), [base, o, advance]);

  const doc = useMemo<ReceiptDoc | null>(() => (r ? slipDoc(r, o.bank) : null), [r, o.bank]);
  const go = () => { if (doc) { printReceipt(doc, { paper: o.paper, setup, copies: o.copies }); onClose(); } };

  const Toggle = ({ k, label, hint }: { k: 'bank' | 'signature' | 'logo'; label: string; hint?: string }) => (
    <Checkbox checked={o[k]} onChange={(ev) => set(k, ev.target.checked)} label={label} description={hint}
      className="rounded-lg px-1.5 py-1.5 hover:bg-slate-50" />
  );

  return (
    <Modal open onClose={onClose} size="xl" title={advance ? t('Advance voucher') : t('Payslip print')}
      description={r ? `${r.paymentNumber} · ${r.staff.fullName} · ${r.monthLabel}` : t('Load ho raha hai…')}
      footer={<>
        <span className="me-auto hidden text-[0.75rem] text-slate-500 sm:inline">{t('PDF chahiye to print me "Save as PDF" chunein')}</span>
        <Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button onClick={go} disabled={!doc} leftIcon={<Printer className="h-4 w-4" />}>{t('Print{{value}}', { value: o.copies > 1 ? ` (${o.copies})` : '' })}</Button>
      </>}>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Kaghaz')}</p>
            <Segmented label={t('Kaghaz')} value={o.paper} onChange={(v) => set('paper', v as ReceiptPaper)} items={[{ value: 'A4', label: t('A4') }, { value: '80', label: t('80mm') }, { value: '58', label: t('58mm') }]} />
          </div>
          <div>
            <p className="mb-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Slip par')}</p>
            <Toggle k="bank" label={t('Bank account')} hint={t('Staff ka bank / IBAN, agar likha ho')} />
            <Toggle k="signature" label={t('Dastkhat ki jagah')} hint={t('Staff aur malik dono ke liye (A4)')} />
            <Toggle k="logo" label={t('Logo')} />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Copies')}</p>
            <Segmented label={t('Copies')} value={String(o.copies)} onChange={(v) => set('copies', Number(v))} items={[{ value: '1', label: '1' }, { value: '2', label: '2' }]} />
            <p className="mt-1 text-[0.6875rem] text-slate-500">{t('2 copies: ek staff ko, ek apni file me')}</p>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 p-3">
          {doc ? <ReceiptPreview doc={doc} setup={setup} paper={o.paper} zoom={o.paper === 'A4' ? 0.62 : 1} />
            : q.isError ? <p className="py-16 text-center text-sm text-slate-500">{t('Record load nahi hua')}</p>
              : <Skeleton className="mx-auto h-96 w-72 rounded-xl" />}
        </div>
      </div>
    </Modal>
  );
}

function slipDoc(r: RecordDetail, bank: boolean): ReceiptDoc {
  const s = r.staff;
  const type = SALARY_TYPE[s.salaryType];
  const method = METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod;
  const paidOut = r.money.filter((m) => !m.back);
  const bankRow = bank && (s.iban || s.accountNumber) ? [{ label: t('Bank'), value: [s.bankName, s.iban || s.accountNumber].filter(Boolean).join(' · ') }] : [];
  const common = {
    saleNumber: r.paymentNumber,
    date: new Date(r.paidAt ?? r.createdAt),
    partyLabel: t('Staff'),
    signLabels: [t('Staff ke dastkhat'), t('Malik / manager')] as [string, string],
    customerName: `${s.fullName} (${s.staffNumber})`,
    customerPhone: s.phone,
    cashierName: r.paidBy ?? undefined,
    branchName: s.shop?.name,
    stamp: r.status === 'CANCELLED' ? t('CANCEL') : r.balanceAmount > 0.5 ? t('BAQI') : undefined,
    boxes: paidOut.length ? [{ title: t('Payment'), lines: r.money.map((m) => `${dayTime(m.at)} · ${m.from} · ${m.back ? 'wapas ' : ''}${formatPKR(m.amount)}`) }] : undefined,
  };

  if (r.kind === 'advance') {
    const total = r.related.filter((x) => x.status !== 'CANCELLED').reduce((a, x) => a + x.paidAmount, 0) || r.paidAmount;
    return {
      ...common,
      infoRows: [
        { label: t('Ohda'), value: s.designation },
        { label: t('Qisten'), value: r.related.map((x) => `${x.label} ${formatPKR(x.paidAmount)}`).join(' · ') || r.monthLabel },
        ...bankRow,
      ],
      lines: [{ name: 'Advance', qty: 1, unit: '', price: total, total, details: r.note ? [r.note] : undefined }],
      subtotal: total,
      discount: 0,
      total,
      paid: total,
      paymentLabel: t('Diye ({{method}})', { method }),
      footerNote: t('Ye amount upar likhe mahinon ki tankhwah se kategi.'),
    };
  }

  const lines: ReceiptLineDoc[] = [];
  const unitKind = s.salaryType === 'DAILY' ? 'din' : s.salaryType === 'HOURLY' ? 'ghante' : s.salaryType === 'PER_TASK' ? 'kaam' : '';
  if (r.baseSalary > 0) {
    const units = s.salaryType === 'HOURLY' ? r.hoursWorked : r.daysWorked;
    lines.push(unitKind && units > 0
      ? { name: `Tankhwah (${qty(units, unitKind)})`, qty: units, unit: '', price: Math.round((r.baseSalary / units) * 100) / 100, total: r.baseSalary }
      : { name: 'Mahana tankhwah', qty: 1, unit: '', price: r.baseSalary, total: r.baseSalary });
  }
  if (r.overtimePay > 0) lines.push({ name: 'Overtime', qty: 1, unit: '', price: r.overtimePay, total: r.overtimePay });
  if (r.commissionEarned > 0) lines.push({ name: 'Commission', qty: 1, unit: '', price: r.commissionEarned, total: r.commissionEarned });
  r.adds.forEach((a) => lines.push({ name: a.label, qty: 1, unit: '', price: a.amount, total: a.amount }));
  if (!lines.length) lines.push({ name: 'Tankhwah', qty: 1, unit: '', price: 0, total: 0 });

  const minus = (v: number) => `- ${formatPKR(v)}`;
  const cuts = [
    ...(r.leaveDeduction > 0 ? [{ label: t('Ghair hazri / bina tankhwah chhutti'), value: minus(r.leaveDeduction) }] : []),
    ...(r.advances > 0 ? [{ label: t('Advance ki qist'), value: minus(r.advances) }] : []),
    ...(r.lateDeduction > 0 ? [{ label: t('Late'), value: minus(r.lateDeduction) }] : []),
    ...r.cuts.map((c) => ({ label: c.label, value: minus(c.amount) })),
  ];
  return {
    ...common,
    infoRows: [
      { label: t('Mahina'), value: r.monthLabel, bold: true },
      { label: t('Ohda'), value: s.designation },
      { label: t('Type'), value: type.label },
      ...(s.salaryType === 'MONTHLY' || s.salaryType === 'HYBRID' ? [{ label: t('Kaam ke din'), value: qty(r.daysWorked, 'din') }] : []),
      ...bankRow,
      ...(r.note ? [{ label: t('Note'), value: r.note }] : []),
    ],
    lines,
    subtotal: r.grossAmount,
    discount: 0,
    extraRows: cuts.length ? cuts : undefined,
    total: r.netAmount,
    paid: r.paidAmount,
    paymentLabel: r.paidAmount > 0 ? t('Diye ({{method}})', { method }) : t('Abhi diye nahi'),
    footerNote: r.status === 'CANCELLED' ? t('Ye tankhwah cancel ho chuki hai.') : r.balanceAmount > 0.5 ? t('Baqi: {{balanceAmount}} — {{label}}', { balanceAmount: formatPKR(r.balanceAmount), label: STATUS[r.status].label }) : undefined,
  };
}
