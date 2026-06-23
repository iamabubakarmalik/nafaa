import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CreditCard, Building2, Smartphone, Upload, FileImage,
  Copy, Check, ArrowLeft, AlertCircle, Globe, Wallet, Zap,
  Sparkles, ShieldCheck, Receipt, Building, Image as ImageIcon,
  X, ExternalLink, AlertTriangle, Clock,
} from 'lucide-react';
import { billingApi, type PaymentProvider } from '@/api/billing.api';
import { stripeApi } from '@/api/stripe.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { paymentProviderConfig, formatDate } from '../components/helpers';

const providerOptions: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'];

export default function PayInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      toast.success('Payment submit ho gayi! Admin 24 hours mein review karega.');
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

    // Preview for images
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
    if (!uploadId) return toast.error('Payment screenshot upload karein');
    if (!payerName.trim()) return toast.error('Aap ka naam zaroori hai');

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

  if (loadingInvoice) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
        <div className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
        <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-slate-900">Invoice not found</h3>
        <Link to="/billing" className="mt-4 inline-flex items-center gap-1 text-brand-700 hover:underline font-bold">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
      </div>
    );
  }

  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';

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
    <div className="space-y-6">
      <Link to="/billing" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-brand-700 font-bold transition">
        <ArrowLeft className="h-4 w-4" /> Back to Billing
      </Link>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/15">
              <Receipt className="h-3.5 w-3.5 text-amber-300" />
              Pay Invoice
            </div>
            <h2 className="mt-3 text-3xl font-extrabold font-mono">{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-white/80">{invoice.description || invoice.subscription?.plan?.name}</p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/70 font-semibold">
              <Clock className="h-3 w-3" />
              Due: {formatDate(invoice.dueDate)}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm text-white/70 font-bold">Amount Due</div>
            <div className="text-4xl sm:text-5xl font-extrabold tabular-nums leading-none mt-1">
              {formatPKR(invoice.amountDue)}
            </div>
          </div>
        </div>
      </section>

      {/* Already paid */}
      {isPaid && (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-8 text-center shadow-lg">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40">
            <Check className="h-10 w-10" />
          </div>
          <h3 className="mt-5 text-2xl font-extrabold text-emerald-900">Already Paid! 🎉</h3>
          <p className="mt-2 text-emerald-700 font-semibold">
            Ye invoice paid ho chuki hai. Aap ka plan active hai.
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-bold">
            Paid on: {formatDate(invoice.paidAt)}
          </p>
        </div>
      )}

      {/* Cancelled */}
      {isCancelled && (
        <div className="rounded-3xl bg-slate-50 border-2 border-slate-300 p-8 text-center">
          <X className="h-16 w-16 text-slate-400 mx-auto" />
          <h3 className="mt-4 text-xl font-bold text-slate-900">Invoice Cancelled</h3>
          <p className="mt-2 text-slate-600 font-semibold">Ye invoice cancel kar di gayi hai.</p>
        </div>
      )}

      {!isPaid && !isCancelled && (
        <>
          {/* ═══ STRIPE INSTANT PAY (Featured) ═══ */}
          {stripeConfig?.enabled && (
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-violet-600 to-purple-700 text-white p-6 sm:p-7 shadow-2xl shadow-blue-500/30">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-900 text-[9px] font-extrabold uppercase tracking-wider">
                  ⚡ Recommended
                </span>
              </div>

              <div className="relative flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl ring-2 ring-white/30 shrink-0">
                    <Globe className="h-8 w-8 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold">Pay with Card — Instant ⚡</h3>
                    <p className="text-xs sm:text-sm text-white/85 mt-1 font-semibold">
                      Visa / Master / international cards • Plan auto-activate
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
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              {stripeConfig?.enabled ? '— Or Manual Payment —' : 'Manual Payment'}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* ═══ MANUAL PAYMENT GRID ═══ */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* LEFT: Payment method + Account details */}
            <div className="space-y-4">
              {/* Method picker */}
              <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6">
                <h3 className="font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-brand-600" />
                  Choose Payment Method
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
                            ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-xl ${active ? m.bgClass : 'bg-slate-100'} ${active ? 'text-white' : 'text-slate-600'} flex items-center justify-center shadow shrink-0 transition`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-slate-900 text-sm">{m.label}</div>
                          <div className="text-[10px] text-slate-500 font-bold truncate">{m.description}</div>
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
              <div className={`relative overflow-hidden rounded-3xl border-2 shadow-lg ${currentProvider.bgClass} text-white`}>
                <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />

                <div className="relative p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <currentProvider.icon className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">
                      Payment Yahan Bhejein
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl mb-4">{currentProvider.label}</h3>

                  <div className="bg-white text-slate-900 rounded-2xl p-4 shadow-inner">
                    {renderPaymentDetails()}
                  </div>

                  <div className="mt-4 rounded-xl bg-white/15 backdrop-blur border-2 border-white/30 p-3 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                    <div className="text-xs font-semibold">
                      <strong className="text-amber-300">Total {formatPKR(invoice.amountDue)}</strong> bhejein. Niche transaction details aur screenshot upload karein.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Transaction form */}
            <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-6 space-y-4 h-fit">
              <div className="flex items-center gap-2 mb-2">
                <FileImage className="h-5 w-5 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">Transaction Details</h3>
              </div>

              <Input
                label="Aap ka Naam (Payer) *"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Ahmad Ali"
              />

              <Input
                label="Aap ka Phone Number"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="+923001234567"
              />

              <Input
                label="Transaction / TID Number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="TX-12345678"
                hint="Bank/wallet ka reference number"
              />

              {provider === 'MANUAL_BANK' && (
                <>
                  <Input
                    label="Aap ka Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="HBL, UBL, MCB, etc."
                  />
                  <Input
                    label="Aap ka Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="01234567890"
                  />
                </>
              )}

              {/* File upload */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Payment Screenshot / Receipt <span className="text-rose-600">*</span>
                </label>
                <div className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all ${
                  uploadUrl
                    ? 'border-emerald-300 bg-emerald-50'
                    : uploading
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-300 hover:border-brand-400 hover:bg-brand-50/30'
                }`}>
                  {uploadUrl ? (
                    <div>
                      {filePreview ? (
                        <div className="relative inline-block">
                          <img src={filePreview} alt="Receipt preview" className="max-h-32 rounded-xl shadow-md" />
                        </div>
                      ) : (
                        <FileImage className="h-12 w-12 text-emerald-600 mx-auto" />
                      )}
                      <div className="mt-2 inline-flex items-center gap-1.5 text-sm font-extrabold text-emerald-900">
                        <Check className="h-4 w-4" />
                        Upload Successful
                      </div>
                      <div className="text-xs text-slate-600 mt-1 font-semibold truncate">{file?.name}</div>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <a
                          href={uploadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-700 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                        <button
                          onClick={removeFile}
                          className="text-xs text-rose-600 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {uploading ? (
                        <>
                          <div className="h-12 w-12 mx-auto rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
                            <Upload className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="mt-3 text-sm font-extrabold text-blue-900">Uploading...</div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-slate-400 mx-auto" />
                          <div className="mt-2 text-sm font-extrabold text-slate-700">
                            Screenshot upload karein
                          </div>
                          <div className="text-xs text-slate-500 mt-1 font-semibold">
                            PNG, JPG ya PDF • Max 10MB
                          </div>
                        </>
                      )}
                      <input
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

              <Input
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional info..."
              />

              <Button
                className="w-full bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 shadow-xl shadow-brand-500/30"
                size="lg"
                loading={submitMutation.isPending || uploading}
                onClick={handleSubmit}
                disabled={!uploadUrl || !payerName.trim()}
              >
                <Upload className="h-4 w-4" />
                Submit for Approval
                <Sparkles className="h-3.5 w-3.5" />
              </Button>

              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-900 font-bold leading-relaxed">
                  Admin <strong>24 hours</strong> mein review karega aur approve/reject karega. Receipt safely store hoti hai.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{label}</div>
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
      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <div className={`font-extrabold text-slate-900 ${mono ? 'font-mono' : ''} ${large ? 'text-lg' : 'text-sm'}`}>
          {value}
        </div>
        <button
          onClick={() => onCopy(value, copyKey)}
          className={`h-7 w-7 rounded-lg flex items-center justify-center transition shadow-sm ${
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
