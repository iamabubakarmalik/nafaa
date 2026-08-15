import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CreditCard, Building2, Smartphone, Upload, FileImage,
  Copy, Check, ArrowLeft, AlertCircle, Globe, Wallet, Zap,
  Sparkles, ShieldCheck, Receipt, Building, Image as ImageIcon,
  X, ExternalLink, AlertTriangle, Clock, GraduationCap,
  Printer, User as UserIcon, Hash, Calendar, CheckCircle2,
  Phone, FileText, ChevronRight, Rocket,
} from 'lucide-react';
import { billingApi, type PaymentProvider } from '@modules/billing/billing/api/billing.api';
import { stripeApi } from '@integrations/stripe/api/stripe.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { paymentProviderConfig, formatDate, getDaysUntilDue } from '../components/helpers';

/* ═════════════════════════════════════════════════════════════
   NAFAA PAY INVOICE — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌙 Dark mode complete
   🎓 Teacher modal — Payment methods + step-by-step guide
   ⌨️  C copy • U upload • T guide • S submit • Esc
   🎯 Progress stepper (1: method → 2: transfer → 3: submit)
   ⏱️ Live due date countdown
   🖼️ Drag-drop file upload with preview
   🖨️ Print invoice receipt (80mm thermal)
   ═════════════════════════════════════════════════════════════ */

const providerOptions: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'];

export default function PayInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const nameRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [provider, setProvider] = useState<PaymentProvider>('MANUAL_BANK');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: invoice, isLoading: loadingInvoice } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => billingApi.invoice(id!),
    enabled: !!id,
  });

  const { data: bank } = useQuery({
    queryKey: ['billing-bank-info'],
    queryFn: billingApi.bankInfo,
  });

  const { data: stripeConfig } = useQuery({
    queryKey: ['stripe-config'],
    queryFn: stripeApi.config,
  });

  const submitMutation = useMutation({
    mutationFn: billingApi.submitPayment,
    onSuccess: () => {
      toast.success('Payment submit ho gayi!', {
        description: 'Admin 24 hours me review karega. Notification aayegi.',
      });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      navigate('/billing');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Submit fail'),
  });

  const stripeMutation = useMutation({
    mutationFn: (invoiceId: string) => stripeApi.checkout(invoiceId),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Stripe fail'),
  });

  const handleFileUpload = async (selected: File) => {
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File 10MB se zyada nahi ho sakti');
      return;
    }
    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
    setUploading(true);
    try {
      const result = await billingApi.uploadFile(selected, 'payment-receipt');
      setUploadId(result.id);
      setUploadUrl(result.url);
      toast.success('Receipt upload ho gayi!');
    } catch {
      toast.error('Upload fail — try again');
      setFile(null);
      setFilePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
    setUploadId(null);
    setUploadUrl(null);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copy ho gaya!');
  };

  const handleSubmit = () => {
    if (!invoice) return;
    if (!uploadId) {
      toast.error('Payment screenshot upload karo');
      uploadRef.current?.click();
      return;
    }
    if (!payerName.trim()) {
      toast.error('Aap ka naam zaroori hai');
      nameRef.current?.focus();
      return;
    }
    submitMutation.mutate({
      invoiceId: invoice.id,
      amount: invoice.amountDue,
      provider,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      transactionId: transactionId.trim() || undefined,
      payerName: payerName.trim(),
      payerPhone: payerPhone.trim() || undefined,
      uploadId,
      notes: notes.trim() || undefined,
    });
  };

  /* 🧾 Thermal receipt (invoice) */
  const printInvoice = () => {
    if (!invoice) return;
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Invoice ${invoice.invoiceNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm 3mm; margin: 0; color: #000; font-size: 11px; line-height: 1.3; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 14px; }
  .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .value { text-align: right; font-weight: 700; word-break: break-word; }
  .amount-box { border: 2px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 4px 0; }
  @media print { body { padding: 3mm 2mm; } }
</style></head><body>
  <div class="center bold big">Nafaa POS</div>
  <div class="center" style="font-size: 9px;">Subscription Invoice</div>
  <div class="divider"></div>
  <div class="center"><span class="badge">${invoice.status}</span></div>
  <div class="row"><span>Invoice #:</span><span class="value">${invoice.invoiceNumber}</span></div>
  <div class="row"><span>Date:</span><span class="value">${formatDate(invoice.createdAt)}</span></div>
  ${invoice.dueDate ? `<div class="row"><span>Due:</span><span class="value">${formatDate(invoice.dueDate)}</span></div>` : ''}
  <div class="divider"></div>
  <div class="bold">Description:</div>
  <div style="margin: 3px 0; word-break: break-word;">${invoice.subscription?.plan?.name || invoice.description || 'Subscription'}</div>
  <div class="amount-box">
    <div style="font-size: 10px;">AMOUNT DUE</div>
    <div class="huge">${formatPKR(invoice.amountDue)}</div>
  </div>
  <div class="center" style="font-size: 9px; margin-top: 8px;">Please pay before due date.<br/>* * * SHUKRIYA * * *</div>
  <div class="center" style="font-size: 8px; margin-top: 6px;">Printed: ${new Date().toLocaleString('en-PK')}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 200); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=380,height=700');
    if (!w) return toast.error('Popup blocked');
    w.document.write(html); w.document.close();
  };

  // Progress stepper
  const steps = useMemo(() => {
    const s1 = !!provider;
    const s2 = !!uploadUrl;
    const s3 = !!uploadUrl && !!payerName.trim();
    return { s1, s2, s3, completed: [s1, s2, s3].filter(Boolean).length };
  }, [provider, uploadUrl, payerName]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (e.key.toLowerCase() === 'u' && !uploading) { e.preventDefault(); uploadRef.current?.click(); }
      if (e.key.toLowerCase() === 's' && uploadUrl && payerName.trim()) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, uploading, uploadUrl, payerName]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (loadingInvoice) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Invoice not found</h3>
        <Link to="/billing" className="mt-4 inline-flex items-center gap-1 text-brand-700 dark:text-brand-400 hover:underline font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);
  const isOverdue = daysUntilDue < 0;

  const renderPaymentDetails = () => {
    if (!bank) return null;
    if (provider === 'MANUAL_BANK') {
      return (
        <div className="space-y-3 text-sm">
          <DetailRow label="Bank Name" value={bank.bank.name} />
          <DetailRow label="Account Title" value={bank.bank.accountTitle} />
          <CopyRow label="Account Number" value={bank.bank.accountNumber} copyKey="acc" copied={copied} onCopy={copyToClipboard} mono />
          <CopyRow label="IBAN" value={bank.bank.iban} copyKey="iban" copied={copied} onCopy={copyToClipboard} mono />
        </div>
      );
    }
    if (provider === 'JAZZCASH') {
      return (
        <div className="space-y-3 text-sm">
          <DetailRow label="Account Title" value={bank.jazzcash.title} />
          <CopyRow label="JazzCash Number" value={bank.jazzcash.number} copyKey="jc" copied={copied} onCopy={copyToClipboard} mono large />
        </div>
      );
    }
    if (provider === 'EASYPAISA') {
      return (
        <div className="space-y-3 text-sm">
          <DetailRow label="Account Title" value={bank.easypaisa.title} />
          <CopyRow label="EasyPaisa Number" value={bank.easypaisa.number} copyKey="ep" copied={copied} onCopy={copyToClipboard} mono large />
        </div>
      );
    }
    if (provider === 'NAYAPAY') {
      return (
        <div className="space-y-3 text-sm">
          <DetailRow label="Account Title" value={bank.nayapay.title} />
          <CopyRow label="NayaPay Number" value={bank.nayapay.number} copyKey="np" copied={copied} onCopy={copyToClipboard} mono large />
          {bank.nayapay.handle && (
            <CopyRow label="NayaPay Handle" value={`@${bank.nayapay.handle}`} copyKey="nph" copied={copied} onCopy={copyToClipboard} />
          )}
        </div>
      );
    }
    return null;
  };

  const currentProvider = paymentProviderConfig[provider];

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <PayTeacher onClose={() => setShowTeacher(false)} amount={invoice.amountDue} />}

      {/* Back nav */}
      <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
        <Link to="/billing" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-brand-700 dark:hover:text-brand-400 font-extrabold transition">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTeacher(true)}
            className="h-10 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <GraduationCap className="h-4 w-4" /> Guide
          </button>
          <button
            onClick={printInvoice}
            className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 dark:from-slate-950 dark:via-brand-950 dark:to-brand-900 text-white p-5 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Pay Invoice
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold font-mono">{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-white/85 font-semibold">{invoice.description || invoice.subscription?.plan?.name}</p>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 text-xs text-white/80 font-semibold rounded-lg bg-white/10 backdrop-blur px-2.5 py-1">
                <Clock className="h-3 w-3" />
                Due: {formatDate(invoice.dueDate)}
              </div>
              {daysUntilDue > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/30 border border-amber-400/40 px-2.5 py-1 text-[10px] font-extrabold text-amber-100">
                  ⏱️ {daysUntilDue} din baaki
                </span>
              )}
              {isOverdue && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/30 border border-rose-400/40 px-2.5 py-1 text-[10px] font-extrabold text-rose-100 animate-pulse">
                  ⚠️ {Math.abs(daysUntilDue)} din overdue
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-white/70 font-extrabold uppercase tracking-widest">Amount Due</div>
            <div className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-1">
              {formatPKR(invoice.amountDue)}
            </div>
          </div>
        </div>

        {/* Progress stepper */}
        {!isPaid && !isCancelled && (
          <div className="relative mt-5 grid grid-cols-3 gap-2">
            {[
              { n: 1, label: 'Method', done: steps.s1, icon: Wallet },
              { n: 2, label: 'Upload Proof', done: steps.s2, icon: Upload },
              { n: 3, label: 'Submit', done: steps.s3, icon: Rocket },
            ].map((s) => {
              const StepIcon = s.icon;
              return (
                <div key={s.n} className={`rounded-xl p-2.5 border-2 backdrop-blur-md transition ${
                  s.done ? 'bg-emerald-500/30 border-emerald-400/50' : 'bg-white/10 border-white/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                      s.done ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white/70'
                    }`}>
                      {s.done ? <Check className="h-4 w-4" /> : <StepIcon className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/70">Step {s.n}</div>
                      <div className="text-xs font-extrabold text-white truncate">{s.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Already paid */}
      {isPaid && (
        <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 p-8 text-center shadow-lg">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
            <Check className="h-10 w-10" />
          </div>
          <h3 className="mt-5 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">Already Paid! 🎉</h3>
          <p className="mt-2 text-emerald-700 dark:text-emerald-300 font-semibold">
            Ye invoice paid ho chuki hai. Aap ka plan active hai.
          </p>
          {invoice.paidAt && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-extrabold">
              Paid on: {formatDate(invoice.paidAt)}
            </p>
          )}
        </div>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <div className="rounded-2xl sm:rounded-3xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700 p-8 text-center">
          <X className="h-16 w-16 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="mt-4 text-xl font-extrabold text-slate-900 dark:text-white">Invoice Cancelled</h3>
          <p className="mt-2 text-slate-600 dark:text-slate-400 font-semibold">Ye invoice cancel kar di gayi hai.</p>
        </div>
      )}

      {!isPaid && !isCancelled && (
        <>
          {/* ═══ STRIPE INSTANT PAY ═══ */}
          {stripeConfig?.enabled && (
            <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 text-white p-5 sm:p-7 shadow-2xl shadow-blue-500/30">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl pointer-events-none" />
              <div className="absolute top-3 right-3">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-900 text-[9px] font-extrabold uppercase tracking-wider shadow-lg">
                  ⚡ Recommended
                </span>
              </div>

              <div className="relative flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl ring-2 ring-white/30 shrink-0">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold">Pay with Card — Instant ⚡</h3>
                    <p className="text-xs sm:text-sm text-white/85 mt-1 font-semibold">
                      Visa / Master / international cards • Plan auto-activate hoga
                    </p>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-extrabold text-white/90">
                      <ShieldCheck className="h-3 w-3" />
                      Secure • 256-bit SSL • Powered by Stripe
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  loading={stripeMutation.isPending}
                  onClick={() => stripeMutation.mutate(invoice.id)}
                  className="bg-white text-slate-900 hover:bg-slate-50 shadow-xl font-extrabold"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay {formatPKR(invoice.amountDue)}
                </Button>
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="relative flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              {stripeConfig?.enabled ? '— Or Manual Payment —' : 'Manual Payment'}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* ═══ MANUAL PAYMENT GRID ═══ */}
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            {/* LEFT */}
            <div className="space-y-4">
              {/* Method picker */}
              <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
                <h3 className="font-extrabold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  Step 1 — Payment Method Chuno
                </h3>
                <div className="grid sm:grid-cols-2 gap-2">
                  {providerOptions.map((id) => {
                    const m = paymentProviderConfig[id];
                    const Icon = m.icon;
                    const active = provider === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setProvider(id)}
                        className={`group relative flex items-center gap-3 p-3 rounded-2xl border-2 transition text-left ${
                          active
                            ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/15 ring-2 ring-brand-200 dark:ring-brand-500/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow'
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-xl ${active ? m.bgClass : 'bg-slate-100 dark:bg-slate-700'} ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'} flex items-center justify-center shadow shrink-0 transition`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm">{m.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{m.description}</div>
                        </div>
                        {active && (
                          <div className="h-5 w-5 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Account details */}
              <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-transparent shadow-lg ${currentProvider.bgClass} text-white`}>
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl pointer-events-none" />

                <div className="relative p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <currentProvider.icon className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-widest font-extrabold opacity-90">
                      Step 2 — Payment Yahan Bhejo
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl mb-4">{currentProvider.label}</h3>

                  <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-inner">
                    {renderPaymentDetails()}
                  </div>

                  <div className="mt-4 rounded-xl bg-white/15 backdrop-blur-md border-2 border-white/30 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                    <div className="text-xs font-semibold">
                      <strong className="text-amber-300 tabular-nums">Total {formatPKR(invoice.amountDue)}</strong> bhejo. Screenshot lo aur niche upload karo.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Step 3 — Transaction Details</h3>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  Aap ka Naam (Payer) *
                </label>
                <input
                  ref={nameRef}
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Ahmad Ali"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  Phone Number
                </label>
                <input
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="+923001234567"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 -center gap-1.5">
                  <Hash className="h-3.5 w-3.5" />
                  Transaction / TID Number
                </label>
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="TX-12345678"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-mono font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition"
                />
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                  Bank/wallet ka reference number
                </div>
              </div>

              {provider === 'MANUAL_BANK' && (
                <>
                  <Input
                    label="Aap ka Bank"
                    value={bankName}
                    onChange={(e: any) => setBankName(e.target.value)}
                    placeholder="HBL, UBL, MCB, etc."
                  />
                  <Input
                    label="Aap ka Account Number"
                    value={accountNumber}
                    onChange={(e: any) => setAccountNumber(e.target.value)}
                    placeholder="01234567890"
                  />
                </>
              )}

              {/* File upload with drag-drop */}
              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-2 items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <FileImage className="h-3.5 w-3.5" />
                    Payment Screenshot / Receipt <span className="text-rose-600">*</span>
                  </span>
                  {!uploadUrl && !uploading && (
                    <span className="text-[10px] text-slate-400 font-bold">Press U to upload</span>
                  )}
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                  className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                    uploadUrl
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10'
                      : uploading
                        ? 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10'
                        : dragOver
                          ? 'border-brand-500 dark:border-brand-400 bg-brand-50 dark:bg-brand-500/15 scale-[1.01]'
                          : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-500/5'
                  }`}
                >
                  {uploadUrl ? (
                    <div>
                      {filePreview ? (
                        <div className="relative inline-block">
                          <img src={filePreview} alt="Receipt preview" className="max-h-40 rounded-xl shadow-md" />
                        </div>
                      ) : (
                        <FileImage className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                      )}
                      <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
                        <Check className="h-4 w-4" />
                        Upload Successful
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-semibold truncate">{file?.name}</div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <a
                          href={uploadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-700 dark:text-brand-400 hover:underline font-extrabold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                        <button
                          onClick={removeFile}
                          className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-extrabold inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {uploading ? (
                        <>
                          <div className="h-12 w-12 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center animate-pulse">
                            <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="mt-3 text-sm font-extrabold text-blue-900 dark:text-blue-200">Uploading...</div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-slate-400 dark:text-slate-500 mx-auto" />
                          <div className="mt-2 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                            {dragOver ? '🎯 Drop here!' : 'Screenshot upload karo'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                            Click ya drag-drop • PNG, JPG ya PDF • Max 10MB
                          </div>
                        </>
                      )}
                      <input
                        ref={uploadRef}
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional info..."
                  className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition resize-none"
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 shadow-xl shadow-brand-500/30 font-extrabold h-12"
                size="lg"
                loading={submitMutation.isPending || uploading}
                onClick={handleSubmit}
                disabled={!uploadUrl || !payerName.trim()}
              >
                <Upload className="h-4 w-4" />
                Submit for Approval
                <Sparkles className="h-3.5 w-3.5" />
              </Button>

              <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-900 dark:text-blue-200 font-semibold leading-relaxed">
                  Admin <strong>24 hours</strong> me review karega aur approve/reject karega. Notification aayegi. Receipt safely store hoti hai — kabhi delete nahi hoti.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   PAY TEACHER MODAL
   ═════════════════════════════════════════════════════════════ */
function PayTeacher({ onClose, amount }: { onClose: () => void; amount: number }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-brand-200 dark:border-brand-500/30 bg-gradient-to-r from-brand-50 to-emerald-50 dark:from-brand-500/15 dark:to-emerald-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-brand-900 dark:text-brand-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Pay Invoice — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Payment 2 tareeqon se ho sakti hai:</strong> Instant card payment (Stripe) ya manual bank transfer/wallet (JazzCash/EasyPaisa/NayaPay/Bank). Dono verified aur safe.
          </p>

          {/* Instant vs Manual */}
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Kaunsa Method Choose Karein?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                ⚡ <strong>Instant (Stripe Card):</strong> Visa/Master card use karo → payment turant hoti hai, plan seedha activate. Best for urgency.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                🏦 <strong>Manual Bank:</strong> Bank transfer / online banking. Fees kam, but review time 24hrs. IBAN copy karo, app se transfer karo.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-500/30 p-2">
                📱 <strong>JazzCash / EasyPaisa / NayaPay:</strong> Mobile wallet — Pakistan me sabse popular. Number copy karo, app se send karo.
              </div>
            </div>
          </div>

          {/* 3-step process */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Manual Payment — 3 Steps
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>1️⃣ Method Chuno:</strong> JazzCash/EasyPaisa/NayaPay/Bank me se ek pick karo. Account details show ho jayenge.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>2️⃣ Paisay Bhejo:</strong> Account number/IBAN copy karo. Apne bank/wallet app se <strong className="text-emerald-700 dark:text-emerald-400">{formatPKR(amount)}</strong> transfer karo.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                <strong>3️⃣ Screenshot Upload:</strong> Payment ka screenshot lo, upload karo. Apna naam + phone likho. Submit dabao.
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 space-y-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1 mb-1">
              <AlertTriangle className="h-3 w-3" /> Common Issues
            </div>
            <TipRow><strong>Screenshot nahi upload ho raha?</strong> File 10MB se kam honi chahiye. PNG/JPG/PDF format work karta hai.</TipRow>
            <TipRow><strong>Payment reject ho gayi?</strong> Rejection reason padho — usually wrong TID ya blurry screenshot. Dobara try karo.</TipRow>
            <TipRow><strong>Amount thoda kam bheja?</strong> Exactly <strong>{formatPKR(amount)}</strong> bhejo — kam/zyada reject ho jata hai.</TipRow>
            <TipRow><strong>24hrs se zyada ho gaye?</strong> Support ko WhatsApp karo — kabhi kabhi weekends pe delay hota hai.</TipRow>
          </div>

          {/* Pro tips */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📸 Full screenshot lo</strong> — TID, amount, date, recipient sab dikhna chahiye.</TipRow>
            <TipRow><strong>🔢 TID zaroor likho</strong> — verification me sabse important hota hai.</TipRow>
            <TipRow><strong>📱 Phone number sahi do</strong> — approval/rejection notification aayegi.</TipRow>
            <TipRow><strong>💾 Receipt file me rakho</strong> — tax audit ya dispute ke waqt kaam ata hai.</TipRow>
            <TipRow><strong>⚡ Emergency me Stripe</strong> — plan foran chalu karna ho to card se pay karo, no wait.</TipRow>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            💡 <strong>Pro tip:</strong> Payment karne ke baad "Billing" page pe payment ki status track karo — Pending → Approved hote hi plan auto-activate.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 font-extrabold shadow-lg shadow-brand-500/40 h-12"
            onClick={onClose}
          >
            <ShieldCheck className="h-4 w-4" /> Samajh Gaya — Pay Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">{label}</div>
      <div className="font-extrabold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function CopyRow({ label, value, copyKey, copied, onCopy, mono, large }: {
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (v: string, k: string) => void;
  mono?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-extrabold">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className={`font-extrabold text-slate-900 ${mono ? 'font-mono' : ''} ${large ? 'text-lg' : 'text-sm'} break-all`}>
          {value}
        </div>
        <button
          onClick={() => onCopy(value, copyKey)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center transition shadow-sm shrink-0 ${
            copied === copyKey
              ? 'bg-emerald-600 text-white'
              : 'bg-brand-100 hover:bg-brand-200 text-brand-700'
          }`}
        >
          {copied === copyKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}
