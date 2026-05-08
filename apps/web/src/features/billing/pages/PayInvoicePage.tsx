import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CreditCard, Building2, Smartphone, Upload, FileImage,
  Copy, Check, ArrowLeft, AlertCircle, Globe,
} from 'lucide-react';
import { billingApi, type PaymentProvider } from '@/api/billing.api';
import { stripeApi } from '@/api/stripe.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

export default function PayInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<PaymentProvider>('MANUAL_BANK');
  const [transactionId, setTransactionId] = useState('');
  const [payerName, setPayerName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: invoice } = useQuery({
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
      toast.success('Payment submitted! Admin review karega aur approve karega.');
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      navigate('/billing');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Submit fail'),
  });

  const stripeMutation = useMutation({
    mutationFn: (invoiceId: string) => stripeApi.checkout(invoiceId),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Stripe checkout fail'),
  });

  const handleFileUpload = async (selected: File) => {
    setFile(selected);
    setUploading(true);
    try {
      const result = await billingApi.uploadFile(selected, 'payment-receipt');
      setUploadId(result.id);
      setUploadUrl(result.url);
      toast.success('Receipt uploaded');
    } catch {
      toast.error('Upload fail ho gaya');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied!');
  };

  const handleSubmit = () => {
    if (!invoice) return;
    if (provider === 'MANUAL_BANK' && !uploadId) {
      return toast.error('Bank transfer ke liye payment screenshot upload karein');
    }
    if (!payerName.trim()) return toast.error('Payer name likhein');

    submitMutation.mutate({
      invoiceId: invoice.id,
      amount: invoice.amountDue,
      provider,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      transactionId: transactionId.trim() || undefined,
      payerName: payerName.trim(),
      uploadId: uploadId || undefined,
      notes: notes.trim() || undefined,
    });
  };

  if (!invoice) {
    return <div className="p-6 text-slate-500">Loading invoice...</div>;
  }

  const isPaid = invoice.status === 'PAID';

  return (
    <div className="space-y-6">
      <Link to="/billing" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" />
        Back to Billing
      </Link>

      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <CreditCard className="h-3.5 w-3.5" />
              Pay Invoice
            </div>
            <h2 className="mt-3 text-3xl font-bold">{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-white/80">{invoice.description}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/70">Amount Due</div>
            <div className="text-4xl font-bold">{formatPKR(invoice.amountDue)}</div>
          </div>
        </div>
      </section>

      {isPaid ? (
        <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-8 text-center">
          <Check className="h-16 w-16 text-emerald-600 mx-auto" />
          <h3 className="mt-4 text-2xl font-bold text-emerald-900">Already Paid!</h3>
          <p className="mt-2 text-emerald-700">This invoice has been paid in full.</p>
        </div>
      ) : (
        <>
          {stripeConfig?.enabled && (
            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-violet-700 text-white p-6 shadow-soft">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Globe className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Pay with Card (Instant)</h3>
                    <p className="text-sm text-white/80 mt-1">
                      Visa / Master / international cards • Auto-activate
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  loading={stripeMutation.isPending}
                  onClick={() => stripeMutation.mutate(invoice.id)}
                  className="bg-white text-slate-900 hover:bg-slate-100"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay {formatPKR(invoice.amountDue)} Now
                </Button>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-slate-500 my-3">— OR —</div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 mb-4">Manual Payment Method</h3>
                <div className="space-y-2">
                  {[
                    { id: 'MANUAL_BANK', label: 'Bank Transfer', icon: Building2, desc: 'Bank account, IBAN, screenshot upload' },
                    { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone, desc: 'Send to JazzCash number' },
                    { id: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone, desc: 'Send to EasyPaisa number' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const active = provider === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setProvider(m.id as PaymentProvider)}
                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition text-left ${
                          active ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                          active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-900">{m.label}</div>
                          <div className="text-xs text-slate-500">{m.desc}</div>
                        </div>
                        {active && <Check className="h-5 w-5 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-white border-2 border-brand-200 p-6">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-brand-700" />
                  Send Payment To
                </h3>

                {provider === 'MANUAL_BANK' && bank && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Bank Name</div>
                      <div className="font-semibold text-slate-900">{bank.bankName}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Account Title</div>
                      <div className="font-semibold text-slate-900">{bank.accountTitle}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Account Number</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-semibold text-slate-900">{bank.accountNumber}</div>
                        <button
                          onClick={() => copyToClipboard(bank.accountNumber, 'acc')}
                          className="text-brand-700 hover:bg-brand-100 rounded p-1"
                        >
                          {copied === 'acc' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">IBAN</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-semibold text-slate-900 text-xs">{bank.iban}</div>
                        <button
                          onClick={() => copyToClipboard(bank.iban, 'iban')}
                          className="text-brand-700 hover:bg-brand-100 rounded p-1"
                        >
                          {copied === 'iban' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {provider === 'JAZZCASH' && bank && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">JazzCash Number</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-semibold text-slate-900 text-lg">{bank.jazzcash}</div>
                        <button
                          onClick={() => copyToClipboard(bank.jazzcash, 'jc')}
                          className="text-brand-700 hover:bg-brand-100 rounded p-1"
                        >
                          {copied === 'jc' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {provider === 'EASYPAISA' && bank && (
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">EasyPaisa Number</div>
                      <div className="flex items-center gap-2">
                        <div className="font-mono font-semibold text-slate-900 text-lg">{bank.easypaisa}</div>
                        <button
                          onClick={() => copyToClipboard(bank.easypaisa, 'ep')}
                          className="text-brand-700 hover:bg-brand-100 rounded p-1"
                        >
                          {copied === 'ep' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    Payment Rs <strong>{formatPKR(invoice.amountDue)}</strong> ka karna hai.
                    Phir niche details aur screenshot upload karein.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-900">Submit Payment Details</h3>

              <Input
                label="Your Name (Payer)"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Ahmad Ali"
              />

              <Input
                label="Transaction / Reference ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="TX-12345678"
                hint="Bank transfer ka reference number"
              />

              {provider === 'MANUAL_BANK' && (
                <>
                  <Input
                    label="Aap ka Bank Name"
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Receipt / Screenshot
                </label>
                <div
                  className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition ${
                    uploadUrl ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-brand-400'
                  }`}
                >
                  {uploadUrl ? (
                    <div>
                      <FileImage className="h-10 w-10 text-emerald-600 mx-auto" />
                      <div className="mt-2 text-sm font-semibold text-emerald-900">Uploaded!</div>
                      <div className="text-xs text-slate-500 mt-1">{file?.name}</div>
                      <a
                        href={uploadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-700 hover:underline mt-1 inline-block"
                      >
                        View
                      </a>
                      <button
                        onClick={() => {
                          setFile(null);
                          setUploadId(null);
                          setUploadUrl(null);
                        }}
                        className="block mt-2 text-xs text-rose-600 hover:underline mx-auto"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-400 mx-auto" />
                      <div className="mt-2 text-sm font-medium text-slate-700">
                        {uploading ? 'Uploading...' : 'Click to upload screenshot'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">PNG, JPG ya PDF (max 10MB)</div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </>
                  )}
                </div>
              </div>

              <Input
                label="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional info"
              />

              <Button
                className="w-full"
                size="lg"
                loading={submitMutation.isPending || uploading}
                onClick={handleSubmit}
              >
                <Upload className="h-4 w-4" />
                Submit Payment for Approval
              </Button>

              <div className="text-xs text-slate-500 text-center">
                Admin 24 hours mein payment review karega aur approve ya reject karega.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
