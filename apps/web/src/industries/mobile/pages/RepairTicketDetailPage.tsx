// apps/web/src/industries/mobile/pages/RepairTicketDetailPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Smartphone, User, Wrench, Stethoscope, Package, DollarSign,
  Banknote, Plus, Trash2, CheckCircle2, AlertCircle, ShieldCheck, MessageCircle,
  Printer, Calendar, Copy, Download, GraduationCap, X, Zap,
  Clock, FileText, Share2, AlertTriangle, Sparkles,
  Keyboard, ChevronRight, Timer, RefreshCw,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import {
  repairsApi,
  type RepairStatus,
  REPAIR_STATUS_LABELS,
  VALID_STATUS_TRANSITIONS,
} from '../api/repairs.api';
import { RepairStatusBadge } from '../components/repairs/RepairStatusBadge';
import { RepairPriorityBadge } from '../components/repairs/RepairPriorityBadge';
import { RepairStatusTimeline } from '../components/repairs/RepairStatusTimeline';
import { DiagnoseModal } from '../components/repairs/DiagnoseModal';
import { AddPartModal } from '../components/repairs/AddPartModal';
import { AddPaymentModal } from '../components/repairs/AddPaymentModal';

/* ═════════════════════════════════════════════════════════════
   NAFAA REPAIR TICKET DETAIL — FULL BEST v3
   ─────────────────────────────────────────────────────────────
   ✅ Dark toggle HATA DIYA — app ka global theme (dark: classes)
   🐛 FIXED: READY_FOR_PICKUP → READY (WhatsApp pickup msg ab kaam karega)
   🐛 FIXED: QuickBtn dynamic classes (Tailwind compile nahi hota tha)
   🖨️ Thermal 80mm receipt + A4 PDF report (popup — tested working)
   ⌨️ Shortcuts: D diagnose • A part • P payment • W WhatsApp • R refresh
   ═════════════════════════════════════════════════════════════ */

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const formatDateOnly = (iso: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(iso));

const timeSince = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (h < 1) return 'Abhi liya';
  if (h < 24) return `${h}h pehle`;
  if (d < 30) return `${d}d pehle`;
  return `${Math.floor(d / 30)}mo pehle`;
};

/** ✅ REAL open statuses (tumhare API ke) */
const OPEN_STATUSES: RepairStatus[] = [
  'RECEIVED', 'DIAGNOSED', 'AWAITING_APPROVAL', 'AWAITING_PARTS', 'IN_PROGRESS',
];
const CLOSED_STATUSES: RepairStatus[] = ['READY', 'DELIVERED', 'CANCELLED', 'UNREPAIRABLE'];

export default function RepairTicketDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const [showDiagnoseModal, setShowDiagnoseModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { data: ticket, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['repair-ticket', id],
    queryFn: () => repairsApi.getOne(id!),
    enabled: !!id,
  });

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (showTeacher) { setShowTeacher(false); return; }
        if (showDiagnoseModal || showPartModal || showPaymentModal) return; // modals apna Esc handle karte hain
        return;
      }
      if (e.ctrlKey || e.metaKey) return;
      if (e.key === 'd') setShowDiagnoseModal(true);
      if (e.key === 'a') setShowPartModal(true);
      if (e.key === 'p') setShowPaymentModal(true);
      if (e.key === 'w') handleWhatsApp();
      if (e.key === 'r') refetch();
      if (e.key === 't') setShowTeacher((v) => !v);
      if (e.key === '?' && e.shiftKey) setShowShortcuts((v) => !v);
      if (e.key === 'i' && ticket) {
        navigator.clipboard.writeText(ticket.ticketNumber);
        toast.success('Ticket # copy ho gaya');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket, showTeacher, showShortcuts, showDiagnoseModal, showPartModal, showPaymentModal]);

  const statusMutation = useMutation({
    mutationFn: (toStatus: RepairStatus) => repairsApi.updateStatus(id!, { toStatus }),
    onSuccess: () => {
      toast.success('✓ Status update ho gaya');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['repair-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Status update fail hua'),
  });

  const removePartMutation = useMutation({
    mutationFn: (partId: string) => repairsApi.removePart(id!, partId),
    onSuccess: () => {
      toast.success('Part hata diya');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', id] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Part remove fail hua'),
  });

  /* ─── Age & overdue flags (FIXED status names) ─── */
  const age = useMemo(() => {
    if (!ticket) return 0;
    return Math.floor((Date.now() - new Date(ticket.receivedAt).getTime()) / 3600000);
  }, [ticket]);

  const isOpen = ticket ? OPEN_STATUSES.includes(ticket.status) : false;
  const isOverdue = isOpen && age > 48;
  const isUrgent = isOpen && age > 24 && age <= 48;
  const readyOverdue = !!ticket?.estimatedReadyAt
    && new Date(ticket.estimatedReadyAt).getTime() < Date.now()
    && !!ticket && !CLOSED_STATUSES.includes(ticket.status);

  /* ─── WhatsApp (FIXED: READY not READY_FOR_PICKUP) ─── */
  const handleWhatsApp = () => {
    if (!ticket) return;
    if (!ticket.customerPhone) return toast.error('Customer ka phone number nahi hai');
    const phone = ticket.customerPhone.replace(/\D/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    const lines = [
      `*🔧 Repair Update — ${ticket.ticketNumber}*`,
      ``,
      `Device: ${ticket.deviceBrand} ${ticket.deviceModel}`,
      `Status: *${REPAIR_STATUS_LABELS[ticket.status]}*`,
    ];
    if (ticket.totalCost > 0) {
      lines.push(``, `Total: ${formatPKR(ticket.totalCost)}`);
      lines.push(`Paid: ${formatPKR(ticket.paidAmount)}`);
      if (ticket.balanceDue > 0) lines.push(`*Balance: ${formatPKR(ticket.balanceDue)}*`);
    }
    if (ticket.status === 'READY') {
      lines.push(``, `✅ Aap ka phone READY hai — pickup kar sakte hain!`);
    }
    if (ticket.warrantyEnds) {
      lines.push(`Warranty: ${formatDateOnly(ticket.warrantyEnds)} tak (same fault)`);
    }
    lines.push(``, `Shukriya! 🙏`, `_Powered by Nafaa POS_`);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  /* ─── Thermal 80mm receipt (popup — working) ─── */
  const printThermal = () => {
    if (!ticket) return;
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ticket.ticketNumber}</title>
<style>
@page { size: 80mm auto; margin: 3mm; }
body { font-family: 'Courier New', monospace; font-size: 11px; width: 74mm; margin: 0; padding: 2mm; color: #000; }
.center { text-align: center; } .bold { font-weight: bold; } .big { font-size: 14px; }
.divider { border-top: 1px dashed #000; margin: 4px 0; }
.row { display: flex; justify-content: space-between; margin: 2px 0; }
table { width: 100%; border-collapse: collapse; }
td { padding: 2px 0; font-size: 10px; }
</style></head><body>
<div class="center bold big">REPAIR RECEIPT</div>
<div class="center">Nafaa Mobile</div>
<div class="center">${ticket.ticketNumber}</div>
<div class="center">${formatDate(ticket.receivedAt)}</div>
<div class="divider"></div>
<div class="bold">CUSTOMER</div>
<div>${ticket.customerName}</div>
<div>${ticket.customerPhone}</div>
${ticket.customerCnic ? `<div>CNIC: ${ticket.customerCnic}</div>` : ''}
<div class="divider"></div>
<div class="bold">DEVICE</div>
<div>${ticket.deviceBrand} ${ticket.deviceModel}</div>
${ticket.deviceColor ? `<div>Color: ${ticket.deviceColor}</div>` : ''}
${ticket.imei1 ? `<div>IMEI: ${ticket.imei1}</div>` : ''}
<div>SIM: ${ticket.hasSimCard ? 'YES' : 'NO'} · MC: ${ticket.hasMemoryCard ? 'YES' : 'NO'}</div>
${ticket.passcode ? `<div class="bold">Passcode: ${ticket.passcode}</div>` : ''}
<div class="divider"></div>
<div class="bold">ISSUE</div>
<div>${ticket.reportedIssue}</div>
${ticket.diagnosedIssue ? `<div class="divider"></div><div class="bold">DIAGNOSIS</div><div>${ticket.diagnosedIssue}</div>` : ''}
<div class="divider"></div>
${(ticket.parts?.length ?? 0) > 0 ? `
<div class="bold">PARTS</div>
<table>${ticket.parts?.map((p) => `<tr><td>${p.partName} x${p.quantity}</td><td style="text-align:right">Rs ${p.totalPrice.toLocaleString()}</td></tr>`).join('')}</table>
<div class="divider"></div>
` : ''}
<div class="row"><span>Parts:</span><span>Rs ${ticket.partsCost.toLocaleString()}</span></div>
<div class="row"><span>Labor:</span><span>Rs ${ticket.laborCost.toLocaleString()}</span></div>
${ticket.discount > 0 ? `<div class="row"><span>Discount:</span><span>-Rs ${ticket.discount.toLocaleString()}</span></div>` : ''}
<div class="row big bold"><span>TOTAL:</span><span>Rs ${ticket.totalCost.toLocaleString()}</span></div>
<div class="row"><span>Paid:</span><span>Rs ${ticket.paidAmount.toLocaleString()}</span></div>
${ticket.balanceDue > 0 ? `<div class="row bold"><span>Balance:</span><span>Rs ${ticket.balanceDue.toLocaleString()}</span></div>` : ''}
<div class="divider"></div>
<div class="center">Status: ${REPAIR_STATUS_LABELS[ticket.status]}</div>
${ticket.warrantyEnds ? `<div class="center">Warranty: ${formatDateOnly(ticket.warrantyEnds)}</div>` : ''}
<div class="divider"></div>
<div class="center">Shukriya!</div>
<div class="center" style="font-size: 9px">Repair warranty sirf same fault ke liye</div>
<div class="center" style="font-size: 9px; margin-top: 4px">Powered by Nafaa POS</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=380,height=700');
    if (!w) return toast.error('Popup blocked — browser me allow karo');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  /* ─── A4 PDF report (popup — working) ─── */
  const downloadPDF = () => {
    if (!ticket) return;
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Repair ${ticket.ticketNumber}</title>
<style>
body { font-family: -apple-system, Arial, sans-serif; padding: 32px; color: #0f172a; max-width: 800px; margin: 0 auto; }
h1 { margin: 0; color: #b45309; font-size: 28px; }
.header { display: flex; justify-content: space-between; border-bottom: 3px solid #b45309; padding-bottom: 16px; margin-bottom: 24px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 16px 0; }
.card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
h3 { margin: 0 0 8px; color: #b45309; font-size: 13px; text-transform: uppercase; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 12px; }
th { background: #fef3c7; }
.total { background: #059669; color: white; padding: 16px; border-radius: 8px; margin-top: 16px; }
.badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; background: #fed7aa; color: #9a3412; }
.footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #64748b; text-align: center; }
@media print { body { padding: 16px; } }
</style></head><body>
<div class="header">
  <div>
    <h1>REPAIR REPORT</h1>
    <div style="font-family: monospace; font-size: 16px; margin-top: 4px;">${ticket.ticketNumber}</div>
    <div style="color: #64748b; font-size: 12px; margin-top: 2px;">${formatDate(ticket.receivedAt)}</div>
  </div>
  <div style="text-align: right;">
    <div class="badge">${REPAIR_STATUS_LABELS[ticket.status]}</div>
    <div style="margin-top: 6px; font-size: 12px;">Priority: ${ticket.priority}</div>
  </div>
</div>

<div class="grid">
  <div class="card">
    <h3>Customer</h3>
    <div><strong>${ticket.customerName}</strong></div>
    <div>${ticket.customerPhone}</div>
    ${ticket.customerCnic ? `<div>CNIC: ${ticket.customerCnic}</div>` : ''}
    ${ticket.customerAddress ? `<div style="font-size: 11px; color: #64748b;">${ticket.customerAddress}</div>` : ''}
  </div>
  <div class="card">
    <h3>Device</h3>
    <div><strong>${ticket.deviceBrand} ${ticket.deviceModel}</strong></div>
    ${ticket.deviceColor ? `<div>Color: ${ticket.deviceColor}</div>` : ''}
    ${ticket.imei1 ? `<div>IMEI 1: ${ticket.imei1}</div>` : ''}
    ${ticket.imei2 ? `<div>IMEI 2: ${ticket.imei2}</div>` : ''}
    <div>SIM: ${ticket.hasSimCard ? '✓' : '✗'} · Memory: ${ticket.hasMemoryCard ? '✓' : '✗'}</div>
    ${ticket.passcode ? `<div style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-top: 4px;">🔒 Passcode: ${ticket.passcode}</div>` : ''}
  </div>
</div>

<div class="card"><h3>Reported Issue</h3><div>${ticket.reportedIssue}</div></div>

${ticket.diagnosedIssue ? `
<div class="card" style="background: #eef2ff; margin-top: 12px;">
  <h3 style="color: #4338ca;">Diagnosis</h3>
  <div><strong>${ticket.diagnosedIssue}</strong></div>
  ${ticket.diagnosisNotes ? `<div style="margin-top: 6px; font-size: 12px;">${ticket.diagnosisNotes}</div>` : ''}
  ${ticket.recommendedActions ? `<div style="margin-top: 6px; font-size: 12px;"><em>Recommended:</em> ${ticket.recommendedActions}</div>` : ''}
</div>` : ''}

${(ticket.parts?.length ?? 0) > 0 ? `
<h3 style="color: #059669; margin-top: 20px;">Parts Used</h3>
<table>
  <thead><tr><th>Part</th><th>Source</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${ticket.parts?.map((p) => `<tr><td><strong>${p.partName}</strong>${p.partNumber ? `<div style="font-size:10px;color:#64748b">${p.partNumber}</div>` : ''}</td><td>${p.source || '—'}</td><td style="text-align:right">${p.quantity}</td><td style="text-align:right">${formatPKR(p.unitPrice)}</td><td style="text-align:right"><strong>${formatPKR(p.totalPrice)}</strong></td></tr>`).join('')}</tbody>
</table>` : ''}

<div class="total">
  <div style="display: flex; justify-content: space-between; font-size: 12px;">
    <span>Parts Cost:</span><span>${formatPKR(ticket.partsCost)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 12px;">
    <span>Labor Cost:</span><span>${formatPKR(ticket.laborCost)}</span>
  </div>
  ${ticket.discount > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 12px;"><span>Discount:</span><span>-${formatPKR(ticket.discount)}</span></div>` : ''}
  <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.3); margin-top: 8px;">
    <span>TOTAL:</span><span>${formatPKR(ticket.totalCost)}</span>
  </div>
  <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
    <span>Paid:</span><span>${formatPKR(ticket.paidAmount)}</span>
  </div>
  ${ticket.balanceDue > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; background: #fbbf24; color: #78350f; padding: 8px; border-radius: 4px; margin-top: 8px;"><span>Balance Due:</span><span>${formatPKR(ticket.balanceDue)}</span></div>` : ''}
</div>

${(ticket.payments?.length ?? 0) > 0 ? `
<h3 style="color: #059669; margin-top: 20px;">Payment History</h3>
<table>
  <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th style="text-align:right">Amount</th></tr></thead>
  <tbody>${ticket.payments?.map((p) => `<tr><td>${formatDate(p.paidAt)}</td><td>${p.paymentMethod}</td><td>${p.reference || '—'}</td><td style="text-align:right"><strong>${formatPKR(p.amount)}</strong></td></tr>`).join('')}</tbody>
</table>` : ''}

${ticket.warrantyEnds ? `<div class="card" style="background: #ecfdf5; margin-top: 16px;"><h3 style="color: #047857;">Repair Warranty</h3><div>Valid until <strong>${formatDateOnly(ticket.warrantyEnds)}</strong></div><div style="font-size: 11px; color: #64748b; margin-top: 4px;">Warranty sirf same fault ke liye. Physical/water damage covered nahi.</div></div>` : ''}

<div class="footer">
  Generated ${formatDate(new Date().toISOString())} · Nafaa Mobile POS<br/>
  This is a computer-generated document.
</div>

<script>window.onload = () => window.print();</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (!w) return toast.error('Popup blocked — browser me allow karo');
    w.document.write(html);
    w.document.close();
    toast.success('PDF preview khul gaya');
  };

  const copyShareLink = () => {
    if (!ticket) return;
    const url = `${window.location.origin}/repair-tickets/${ticket.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copy ho gaya');
  };

  /* ─── Loading / Not found ─── */
  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <div className="inline-block h-10 w-10 rounded-full border-4 border-orange-200 dark:border-orange-500/30 border-t-orange-600 dark:border-t-orange-400 animate-spin" />
        <p className="text-xs font-extrabold text-slate-500 dark:text-slate-400">Ticket load ho raha hai...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-16 text-center">
        <div className="mx-auto h-16 w-16 rounded-3xl bg-rose-100 dark:bg-rose-500/15 flex items-center justify-center mb-3">
          <AlertCircle className="h-8 w-8 text-rose-500" />
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Ticket nahi mila</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Shayad delete ho gaya ho ya link galat hai</p>
        <Link to="/repair-tickets" className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-orange-600 dark:text-orange-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Wapis Repairs
        </Link>
      </div>
    );
  }

  const allowedTransitions = VALID_STATUS_TRANSITIONS[ticket.status] || [];
  const progressPct = ticket.totalCost > 0 ? Math.min((ticket.paidAmount / ticket.totalCost) * 100, 100) : 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ TOP BAR ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <Link
          to="/repair-tickets"
          className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-extrabold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
        >
          <ArrowLeft className="h-4 w-4" /> Wapis Repairs
        </Link>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition disabled:opacity-50"
            title="Refresh (R)"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-300 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Shortcuts (Shift+?)"
          >
            <Keyboard className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
          <button
            onClick={() => setShowTeacher(true)}
            className="h-10 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
          >
            <GraduationCap className="h-4 w-4" /> Guide
          </button>
          <button
            onClick={copyShareLink}
            className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            onClick={handleWhatsApp}
            className="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </button>
          <button
            onClick={printThermal}
            className="h-10 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition"
          >
            <Printer className="h-4 w-4" /> Receipt
          </button>
          <button
            onClick={downloadPDF}
            className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* ═══ OVERDUE BANNER ═══ */}
      {(isOverdue || readyOverdue) && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-3.5 flex items-center gap-3 print:hidden flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/40 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 text-sm font-semibold text-rose-900 dark:text-rose-200 min-w-0">
            <strong>Overdue!</strong>{' '}
            {isOverdue && `Ye ticket ${age} ghante purana hai — customer se rabta karo.`}
            {readyOverdue && ' Estimated ready time nikal gaya.'}
          </div>
          <button
            onClick={handleWhatsApp}
            className="px-3.5 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-md transition shrink-0"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Now
          </button>
        </div>
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 dark:from-slate-950 dark:via-orange-950 dark:to-amber-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-orange-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Wrench className="h-3.5 w-3.5 text-amber-300" /> Repair Ticket
              {isUrgent && (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase animate-pulse">
                  Urgent
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-mono break-all">{ticket.ticketNumber}</h1>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(ticket.ticketNumber);
                  toast.success('Copy ho gaya');
                }}
                className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition"
                title="Copy ticket # (I)"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-xs sm:text-sm text-white/90 font-semibold flex-wrap">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> {formatDate(ticket.receivedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-3.5 w-3.5" /> {timeSince(ticket.receivedAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Smartphone className="h-3.5 w-3.5" />
                {ticket.deviceBrand} {ticket.deviceModel}
              </span>
              {ticket.customerName && (
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {ticket.customerName}
                </span>
              )}
            </div>
          </div>
          <div className="text-right space-y-2 shrink-0">
            <RepairStatusBadge status={ticket.status} size="lg" />
            <div className="block"><RepairPriorityBadge priority={ticket.priority} size="lg" /></div>
          </div>
        </div>

        {/* Payment progress */}
        {ticket.totalCost > 0 && (
          <div className="mt-4 relative">
            <div className="flex justify-between text-xs mb-1.5 font-bold">
              <span className="text-white/80">Payment Progress</span>
              <span className="tabular-nums">{progressPct.toFixed(0)}% • {formatPKR(ticket.paidAmount)} / {formatPKR(ticket.totalCost)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/15 overflow-hidden border border-white/20">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* ═══ QUICK STATUS ACTIONS ═══ */}
      {allowedTransitions.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 print:hidden">
          <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Next Status
          </div>
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((status) => (
              <button
                key={status}
                onClick={() => {
                  if (confirm(`"${REPAIR_STATUS_LABELS[status]}" mein move karna hai?`)) {
                    statusMutation.mutate(status);
                  }
                }}
                disabled={statusMutation.isPending}
                className="px-3.5 py-2.5 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 hover:from-orange-100 hover:to-amber-100 dark:hover:from-orange-500/20 dark:hover:to-amber-500/20 text-orange-900 dark:text-orange-200 text-xs font-extrabold transition disabled:opacity-50 inline-flex items-center gap-1.5 border-2 border-orange-200 dark:border-orange-500/40 active:scale-95"
              >
                <ChevronRight className="h-3.5 w-3.5" /> {REPAIR_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ KPI STRIP ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi label="Age" value={`${age}h`} icon={Clock} tone={isOverdue ? 'rose' : isUrgent ? 'amber' : 'blue'} />
        <Kpi label="Parts" value={String(ticket.parts?.length || 0)} icon={Package} tone="emerald" />
        <Kpi label="Payments" value={String(ticket.payments?.length || 0)} icon={Banknote} tone="violet" />
        <Kpi label="Balance" value={formatPKR(ticket.balanceDue)} icon={DollarSign} tone={ticket.balanceDue > 0 ? 'amber' : 'emerald'} />
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div className="grid xl:grid-cols-[1fr_400px] gap-4 items-start">
        {/* Main column */}
        <div className="space-y-4">
          {/* Device + Customer */}
          <div className="grid sm:grid-cols-2 gap-3">
            <InfoCard title="Device" icon={Smartphone}>
              <Row label="Brand" value={ticket.deviceBrand} />
              <Row label="Model" value={ticket.deviceModel} />
              {ticket.deviceColor && <Row label="Color" value={ticket.deviceColor} />}
              {ticket.imei1 && <Row label="IMEI 1" value={ticket.imei1} mono copy />}
              {ticket.imei2 && <Row label="IMEI 2" value={ticket.imei2} mono copy />}
              {ticket.serialNumber && <Row label="Serial" value={ticket.serialNumber} mono copy />}
              <Row label="SIM" value={ticket.hasSimCard ? '✓ Yes' : '✗ No'} />
              <Row label="Memory Card" value={ticket.hasMemoryCard ? '✓ Yes' : '✗ No'} />
              {ticket.passcode && (
                <Row label="Passcode" value={`🔒 ${ticket.passcode}`} mono highlight />
              )}
            </InfoCard>

            <InfoCard title="Customer" icon={User}>
              <Row label="Name" value={ticket.customerName} />
              <Row label="Phone" value={ticket.customerPhone} mono copy />
              {ticket.customerCnic && <Row label="CNIC" value={ticket.customerCnic} mono copy />}
              {ticket.customerAddress && <Row label="Address" value={ticket.customerAddress} />}
              {ticket.customer && (
                <Link
                  to={`/customers/${ticket.customer.id}`}
                  className="text-xs text-violet-700 dark:text-violet-300 font-extrabold hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <ChevronRight className="h-3 w-3" /> Customer profile dekho
                </Link>
              )}
            </InfoCard>
          </div>

          {/* Issue & Diagnosis */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                  <Stethoscope className="h-4.5 w-4.5 h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">Issue & Diagnosis</h3>
              </div>
              <Button
                onClick={() => setShowDiagnoseModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-violet-700 font-extrabold shadow-lg shadow-indigo-500/30"
              >
                <Stethoscope className="h-4 w-4" />
                {ticket.diagnosedIssue ? 'Edit Diagnosis' : 'Diagnose Karo'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3">
                <div className="text-[10px] uppercase font-extrabold text-blue-700 dark:text-blue-300 mb-1">
                  Customer Ne Kaha
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-line">
                  {ticket.reportedIssue}
                </div>
              </div>

              {ticket.diagnosedIssue ? (
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/30 p-3">
                  <div className="text-[10px] uppercase font-extrabold text-indigo-700 dark:text-indigo-300">
                    Technician Diagnosis
                  </div>
                  <div className="text-sm text-slate-900 dark:text-white mt-1 whitespace-pre-line font-bold">
                    {ticket.diagnosedIssue}
                  </div>
                  {ticket.diagnosisNotes && (
                    <div className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {ticket.diagnosisNotes}
                    </div>
                  )}
                  {ticket.recommendedActions && (
                    <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-500/20">
                      <div className="text-[10px] uppercase font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" /> Recommended
                      </div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-line">
                        {ticket.recommendedActions}
                      </div>
                    </div>
                  )}
                  {ticket.estimatedCost > 0 && (
                    <div className="mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-500/20 flex justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-400">Estimate diya:</span>
                      <span className="font-extrabold text-indigo-700 dark:text-indigo-300 tabular-nums">
                        {formatPKR(ticket.estimatedCost)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-5 text-center">
                  <Stethoscope className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Ab tak diagnose nahi hua —{' '}
                    <button className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline" onClick={() => setShowDiagnoseModal(true)}>
                      abhi karo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Parts */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  Parts Used{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                    ({ticket.parts?.length || 0})
                  </span>
                </h3>
              </div>
              <Button
                onClick={() => setShowPartModal(true)}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/30"
              >
                <Plus className="h-4 w-4" /> Add Part
              </Button>
            </div>

            {(ticket.parts?.length ?? 0) === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
                <Package className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Koi part add nahi hua — labor-only repair hai ya parts baad me add karo
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {ticket.parts?.map((part) => (
                  <div
                    key={part.id}
                    className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-3 flex items-center justify-between gap-3 hover:shadow-md transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {part.partName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap font-semibold">
                        <span className="tabular-nums">
                          {part.quantity} × {formatPKR(part.unitPrice)}
                        </span>
                        {part.source && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[9px] font-extrabold">
                            {part.source}
                          </span>
                        )}
                        {part.partNumber && (
                          <span className="font-mono text-[10px]">#{part.partNumber}</span>
                        )}
                      </div>
                      {part.product && (
                        <div className="text-[10px] text-violet-700 dark:text-violet-300 font-extrabold mt-0.5 inline-flex items-center gap-1">
                          <Package className="h-2.5 w-2.5" /> Inventory se liya
                        </div>
                      )}
                      {part.notes && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                          {part.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(part.totalPrice)}
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`"${part.partName}" hatana hai?`))
                            removePartMutation.mutate(part.id);
                        }}
                        disabled={removePartMutation.isPending}
                        className="mt-1 h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center ml-auto transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Status Timeline</h3>
            </div>
            <RepairStatusTimeline logs={ticket.statusLog || []} />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Pricing summary */}
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 dark:from-emerald-500/10 dark:via-slate-900/80 dark:to-blue-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 shadow-sm p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200">Pricing Summary</h3>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Parts Cost</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(ticket.partsCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Labor Cost</span>
                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">{formatPKR(ticket.laborCost)}</span>
              </div>
              {ticket.discount > 0 && (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="font-semibold">Discount</span>
                  <span className="font-extrabold tabular-nums">−{formatPKR(ticket.discount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t-2 border-emerald-200 dark:border-emerald-500/30">
                <span className="font-extrabold text-slate-900 dark:text-white">Total</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-300 text-lg tabular-nums">
                  {formatPKR(ticket.totalCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Paid</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatPKR(ticket.paidAmount)}
                </span>
              </div>
              {ticket.balanceDue > 0 && (
                <div className="rounded-xl bg-amber-100 dark:bg-amber-500/15 border-2 border-amber-300 dark:border-amber-500/40 px-3 py-2 flex justify-between">
                  <span className="font-extrabold text-amber-900 dark:text-amber-200">Balance Due</span>
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 tabular-nums">
                    {formatPKR(ticket.balanceDue)}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={() => setShowPaymentModal(true)}
              className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/30"
              disabled={ticket.balanceDue <= 0 && ticket.totalCost === 0}
            >
              <Banknote className="h-4 w-4" /> Payment Record Karo
            </Button>
          </div>

          {/* Payment history */}
          {(ticket.payments?.length ?? 0) > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-2.5 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Payment History
              </h3>
              <div className="space-y-2">
                {ticket.payments?.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(p.amount)}
                      </div>
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                        {p.paymentMethod} · {formatDate(p.paidAt)}
                        {p.reference && ` · Ref: ${p.reference}`}
                      </div>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warranty */}
          {ticket.warrantyEnds && (
            <div className="rounded-2xl bg-teal-50 dark:bg-teal-500/10 border-2 border-teal-200 dark:border-teal-500/30 p-3.5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-extrabold text-teal-700 dark:text-teal-300">
                    Repair Warranty
                  </div>
                  <div className="text-sm font-extrabold text-teal-900 dark:text-teal-200">
                    {formatDateOnly(ticket.warrantyEnds)} tak
                  </div>
                  <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold mt-0.5">
                    Sirf same fault ke liye
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Estimated ready */}
          {ticket.estimatedReadyAt && (
            <div className={`rounded-2xl border-2 p-3.5 ${
              readyOverdue
                ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
                : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  readyOverdue
                    ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                    : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                }`}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className={`text-[10px] uppercase font-extrabold ${
                    readyOverdue ? 'text-rose-700 dark:text-rose-300' : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    Ready Estimated {readyOverdue && '⚠️'}
                  </div>
                  <div className={`text-sm font-extrabold ${
                    readyOverdue ? 'text-rose-900 dark:text-rose-200' : 'text-blue-900 dark:text-blue-200'
                  }`}>
                    {formatDate(ticket.estimatedReadyAt)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Technician */}
          {ticket.technicianName && (
            <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3.5">
              <div className="text-[10px] uppercase font-extrabold text-violet-700 dark:text-violet-300">
                Assigned Technician
              </div>
              <div className="text-sm font-extrabold text-violet-900 dark:text-violet-200 mt-1 flex items-center gap-1.5">
                👨‍🔧 {ticket.technicianName}
              </div>
            </div>
          )}

          {/* Quick actions — FIXED static tone classes */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3.5 print:hidden">
            <div className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 mb-2 tracking-wider">
              Quick Actions
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <QuickBtn icon={Stethoscope} label="Diagnose" onClick={() => setShowDiagnoseModal(true)} tone="indigo" hint="D" />
              <QuickBtn icon={Package} label="Add Part" onClick={() => setShowPartModal(true)} tone="emerald" hint="A" />
              <QuickBtn icon={Banknote} label="Payment" onClick={() => setShowPaymentModal(true)} tone="green" hint="P" />
              <QuickBtn icon={MessageCircle} label="WhatsApp" onClick={handleWhatsApp} tone="cyan" hint="W" />
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ MODALS ═══ */}
      {showDiagnoseModal && (
        <DiagnoseModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          initialEstimate={ticket.estimatedCost}
          initialDiagnosed={ticket.diagnosedIssue ?? undefined}
          initialNotes={ticket.diagnosisNotes ?? undefined}
          initialRecommendations={ticket.recommendedActions ?? undefined}
          onClose={() => setShowDiagnoseModal(false)}
        />
      )}
      {showPartModal && (
        <AddPartModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          onClose={() => setShowPartModal(false)}
        />
      )}
      {showPaymentModal && (
        <AddPaymentModal
          ticketId={ticket.id}
          ticketNumber={ticket.ticketNumber}
          balanceDue={ticket.balanceDue}
          customerName={ticket.customerName}
          onClose={() => setShowPaymentModal(false)}
        />
      )}

      {showTeacher && <TeacherModal onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function InfoCard({ title, icon: Icon, children }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, copy, highlight }: any) {
  return (
    <div
      className={`flex justify-between gap-2 text-xs items-center px-1.5 py-1 rounded-lg ${
        highlight ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30' : ''
      }`}
    >
      <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">{label}</span>
      <span className="flex items-center gap-1 min-w-0">
        <span className={`font-extrabold text-slate-900 dark:text-white truncate ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        {copy && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(String(value));
              toast.success('Copy ho gaya');
            }}
            className="h-5 w-5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center flex-shrink-0 transition"
          >
            <Copy className="h-2.5 w-2.5 text-slate-500" />
          </button>
        )}
      </span>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, tone = 'blue' }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-600 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/30',
    violet: 'from-violet-500 to-fuchsia-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-3.5 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">{label}</div>
        <div className="font-extrabold text-slate-900 dark:text-white text-lg truncate tabular-nums">{value}</div>
      </div>
    </div>
  );
}

/** ✅ FIXED — static Tailwind classes (dynamic bg-${tone} compile nahi hota) */
const QUICK_TONES: Record<string, string> = {
  indigo: 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-500/40',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-500/40',
  green: 'bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-500/40',
  cyan: 'bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-500/40',
};

function QuickBtn({ icon: Icon, label, onClick, tone, hint }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-xl border-2 text-[10px] font-extrabold transition flex flex-col items-center gap-1 relative active:scale-95 ${QUICK_TONES[tone]}`}
    >
      <Icon className="h-4 w-4" />
      {label}
      {hint && (
        <kbd className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 font-mono font-bold">
          {hint}
        </kbd>
      )}
    </button>
  );
}

function TeacherModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col border-2 border-amber-300 dark:border-amber-500/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/15 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 font-extrabold">
                Guide
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Repair Ticket Kaise Chalayein?</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-sm">
          <Step
            n={1}
            title="Diagnose karo"
            body="Customer ka bataya issue check karo. Technician diagnosis add kare — parts cost + labor cost alag likho. Auto-calc se total ban jayega."
            tips={['Quick presets se time bachao (LCD, Battery, etc.)', 'Estimated cost customer ko WhatsApp karo confirm ke liye']}
          />
          <Step
            n={2}
            title="Parts add karo"
            body="Jo part chahiye add karo — inventory se liya, bahar se laya, ya customer provided. Inventory wala stock auto-manage hota hai."
            tips={['Own stock select karo to inventory apne aap ghatega', 'Margin lock karo — parts pe profit bhi kamao']}
          />
          <Step
            n={3}
            title="Status update karo"
            body="Received → Diagnosed → In Progress → Ready → Delivered. Har change pe customer ko WhatsApp update bhejo (W key)."
            tips={['48h+ purana ticket red alert ho jata hai', 'Ready hone par foran customer ko call/WhatsApp karo']}
          />
          <Step
            n={4}
            title="Payment lo & warranty do"
            body="Partial ya full payment record karo. Delivery pe full payment lo, warranty date confirm karo (same fault only)."
            tips={['Thermal 80mm receipt print karo har transaction par', 'PDF report record ke liye save kar lo']}
          />
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 text-xs font-semibold text-blue-900 dark:text-blue-200">
            <strong>💡 Pro Tip:</strong> Passcode 🔒 field sensitive hai — sirf technician ke liye. Delivery ke baad clear kar do.
          </div>
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-right">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg shadow-amber-500/30">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, body, tips }: any) {
  return (
    <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3.5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-md">
          {n}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{body}</div>
          {tips && (
            <ul className="mt-2 space-y-1">
              {tips.map((t: string, i: number) => (
                <li key={i} className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500 flex-shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [
    ['D', 'Diagnose modal'],
    ['A', 'Add Part'],
    ['P', 'Add Payment'],
    ['W', 'WhatsApp customer'],
    ['R', 'Refresh'],
    ['T', 'Guide'],
    ['I', 'Copy ticket #'],
    ['Shift + ?', 'Shortcuts'],
    ['Esc', 'Band karo'],
  ];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 font-mono text-xs font-extrabold text-slate-700 dark:text-slate-200">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
