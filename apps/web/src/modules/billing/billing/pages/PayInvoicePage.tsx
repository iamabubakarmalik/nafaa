/**
 * Pay one Nafaa bill: card through Stripe when it is switched on, or a bank /
 * wallet transfer with a receipt screenshot that the Nafaa team approves.
 * Shows the paid, cancelled, under-review and rejected states. The payment
 * calls are unchanged from the earlier page.
 *
 * Keys: U upload receipt · S send · G guide · Esc back to billing.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Check, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, FileImage, GraduationCap,
  Image as ImageIcon, Lock, Rocket, Send, ShieldCheck, Upload, Wallet, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, Button, Card, Input, PageHero, PageShell, Skeleton, Textarea, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { billingApi, type PaymentProvider } from '@modules/billing/billing/api/billing.api';
import { stripeApi } from '@integrations/stripe/api/stripe.api';
import { INVOICE_STATUS, PROVIDER, daysText, daysUntil, formatDate } from '../components/helpers';
import { invoiceDoc } from '../components/print';
import { t } from '@core/i18n';

const providerOptions: PaymentProvider[] = ['MANUAL_BANK', 'JAZZCASH', 'EASYPAISA', 'NAYAPAY'];

export default function PayInvoicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const guide = usePageGuide();
  const canPay = usePermission(PERMISSIONS.BILLING_MANAGE);

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
  const [dragOver, setDragOver] = useState(false);

  const { data: invoice, isLoading: loadingInvoice, isError, refetch } = useQuery({
    queryKey: ['billing-invoice', id],
    queryFn: () => billingApi.invoice(id!),
    enabled: !!id,
  });
  const { data: bank } = useQuery({ queryKey: ['billing-bank-info'], queryFn: billingApi.bankInfo });
  const { data: stripeConfig } = useQuery({ queryKey: ['stripe-config'], queryFn: stripeApi.config });

  const submitMutation = useMutation({
    mutationFn: billingApi.submitPayment,
    onSuccess: () => {
      toast.success(t('Payment bhej di gayi'), { description: t('Nafaa team 24 ghante me check karegi. Notification aayegi.') });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['billing-payments'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      navigate('/billing');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || t('Payment nahi gayi')),
  });

  const stripeMutation = useMutation({
    mutationFn: (invoiceId: string) => stripeApi.checkout(invoiceId),
    onSuccess: (data) => { window.location.href = data.url; },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message || t('Card payment shuru nahi hui')),
  });

  const handleFileUpload = async (selected: File) => {
    if (selected.size > 10 * 1024 * 1024) {
      toast.error(t('File 10MB se bari nahi ho sakti'));
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
      toast.success(t('Receipt upload ho gayi'));
    } catch (e) {
      toast.error(t('Receipt upload nahi hui'), { description: (e as Error)?.message || t('Dobara koshish karein.') });
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

  const copy = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success(t('Copy ho gaya'));
  };

  const handleSubmit = () => {
    if (!invoice) return;
    if (!uploadId) {
      toast.error(t('Payment ka screenshot upload karein'));
      uploadRef.current?.click();
      return;
    }
    if (!payerName.trim()) {
      toast.error(t('Bhejne wale ka naam zaroori hai'));
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

  const steps = useMemo(() => [
    { label: t('Tareeqa chunein'), done: !!provider, icon: Wallet },
    { label: t('Receipt upload'), done: !!uploadUrl, icon: Upload },
    { label: t('Bhej dein'), done: !!uploadUrl && !!payerName.trim(), icon: Rocket },
  ], [provider, uploadUrl, payerName]);

  const pendingPayment = invoice?.payments?.find((p) => p.status === 'PENDING') ?? null;
  const canSubmit = !!invoice && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && !pendingPayment;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Escape') navigate('/billing');
      if (!canSubmit || !canPay) return;
      if (k === 'u' && !uploading) { e.preventDefault(); uploadRef.current?.click(); }
      if (k === 's' && uploadUrl && payerName.trim()) { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loadingInvoice) {
    return <PageShell><Skeleton className="h-44 rounded-3xl" /><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  }
  if (!invoice) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{isError ? t('Bill load nahi hua') : t('Ye bill nahi mila')}</p>
          <div className="mt-3 flex justify-center gap-2">
            {isError && <Button variant="secondary" onClick={() => refetch()}>{t('Dobara koshish')}</Button>}
            <Button variant="ghost" onClick={() => navigate('/billing')}>{t('Billing par wapas')}</Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const st = INVOICE_STATUS[invoice.status];
  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  // The API takes one receipt per bill at a time; show that before the form, not as an error after it.
  const lastRejected = !pendingPayment ? invoice.payments?.find((p) => p.status === 'REJECTED') ?? null : null;
  const days = daysUntil(invoice.dueDate);
  const current = PROVIDER[provider];

  const accountRows = (): Array<{ label: string; value?: string | null; copyKey?: string; big?: boolean }> => {
    if (!bank) return [];
    if (provider === 'MANUAL_BANK') return [
      { label: t('Bank'), value: bank.bank.name }, { label: t('Account title'), value: bank.bank.accountTitle },
      { label: t('Account number'), value: bank.bank.accountNumber, copyKey: 'acc' }, { label: t('IBAN'), value: bank.bank.iban, copyKey: 'iban' },
    ];
    if (provider === 'JAZZCASH') return [{ label: t('Account title'), value: bank.jazzcash.title }, { label: t('JazzCash number'), value: bank.jazzcash.number, copyKey: 'jc', big: true }];
    if (provider === 'EASYPAISA') return [{ label: t('Account title'), value: bank.easypaisa.title }, { label: t('EasyPaisa number'), value: bank.easypaisa.number, copyKey: 'ep', big: true }];
    return [
      { label: t('Account title'), value: bank.nayapay.title }, { label: t('NayaPay number'), value: bank.nayapay.number, copyKey: 'np', big: true },
      ...(bank.nayapay.handle ? [{ label: t('NayaPay handle'), value: `@${bank.nayapay.handle}`, copyKey: 'nph' }] : []),
    ];
  };

  return (
    <PageShell>
      {guide.isOpen && <PayGuide amount={invoice.amountDue} card={!!stripeConfig?.enabled} onClose={guide.close} />}

      <PageHero
        back="/billing"
        backLabel={t('Wapas (Esc)')}
        title={<span className="font-mono">{invoice.invoiceNumber}</span>}
        chip={<><st.icon />{st.label}</>}
        subtitle={(
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{t('{{value}} · Due {{dueDate}}', { value: invoice.subscription?.plan?.name || invoice.description || 'Subscription', dueDate: formatDate(invoice.dueDate) })}</span>
            {!isPaid && !isCancelled && (
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.75rem] font-semibold', days < 0 ? 'bg-rose-500/30 text-white' : 'bg-white/15 text-white')}>
                <Clock className="h-3.5 w-3.5" aria-hidden />{days < 0 ? t('{{days}} din der ho gayi', { days: Math.abs(days) }) : daysText(days)}
              </span>
            )}
          </span>
        )}
        actions={(
          <>
            <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={() => invoiceDoc(invoice)} label={t('Bill print')} /></span>
            <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroButton}><GraduationCap className="h-4 w-4" /> {' '}{t('Guide')}</button>
          </>
        )}
        stats={[{ label: isPaid ? t('Ada ho chuka') : t('Dena hai'), value: formatPKR(isPaid ? invoice.total : invoice.amountDue) }]}
      />

      {canSubmit && (
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={t('Payment ke qadam')}>
          {steps.map((s, i) => (
            <li key={s.label} className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-2.5', s.done ? 'border-success-200 bg-success-50' : 'border-slate-200 bg-white')}>
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', s.done ? 'bg-success-600 text-white' : 'bg-slate-100 text-slate-600')}>
                {s.done ? <Check className="h-4 w-4" aria-label={t('Ho gaya')} /> : <s.icon className="h-4 w-4" aria-hidden />}
              </span>
              <span className="min-w-0">
                <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">{t('Qadam {{value}}', { value: i + 1 })}</span>
                <span className={cn('block truncate text-[0.8125rem] font-semibold', s.done ? 'text-success-800' : 'text-slate-900')}>{s.label}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {isPaid && (
        <Card className="rounded-3xl">
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600"><CheckCircle2 className="h-7 w-7" /></span>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{t('Ye bill ada ho chuka hai')}</h2>
            <p className="text-[0.875rem] text-slate-500">{invoice.paidAt ? t('{{paidAt}} ko — plan chalu hai.', { paidAt: formatDate(invoice.paidAt) }) : t('Plan chalu hai.')}</p>
          </div>
        </Card>
      )}

      {isCancelled && <Alert tone="info" title={t('Ye bill cancel hai')}>{t('Is bill par payment nahi ho sakti. Naya plan Billing → Plans se lein.')}</Alert>}

      {pendingPayment && (
        <Card className="rounded-3xl">
          <div className="flex flex-col items-center py-6 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Clock className="h-7 w-7" /></span>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{t('Payment check ho rahi hai')}</h2>
            <p className="max-w-md text-[0.875rem] text-slate-500">
              {t('Aap ne {{amount}} ki receipt {{createdAt}} ko bheji thi. Nafaa team 24 ghante me dekhegi — approve hote hi plan chalu ho jayega.', { amount: formatPKR(pendingPayment.amount), createdAt: formatDate(pendingPayment.createdAt) })}
            </p>
            {pendingPayment.transactionId && <p className="mt-1 font-mono text-[0.75rem] font-semibold text-amber-700">{t('Ref: {{transactionId}}', { transactionId: pendingPayment.transactionId })}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {pendingPayment.upload?.url && <a href={pendingPayment.upload.url} target="_blank" rel="noreferrer"><Button variant="secondary"><ImageIcon className="h-4 w-4" /> {' '}{t('Receipt dekhein')}</Button></a>}
              <Link to="/billing"><Button variant="ghost">{t('Billing par wapas')}</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {lastRejected && (
        <Alert tone="danger" title={t('Pichli payment wapas ki gayi thi')} icon={<AlertTriangle className="h-4 w-4" />}>
          {t('Wajah: {{value}} Sahi receipt dobara upload karein — bill abhi khula hai.', { value: lastRejected.rejectionReason || 'Details check nahi ho saki.' })}
        </Alert>
      )}

      {canSubmit && !canPay && (
        <Alert tone="info" icon={<Lock className="h-4 w-4" />} title={t('Payment sirf malik bhej sakta hai')}>
          {t('Aap bill dekh aur print kar sakte hain. Payment bhejne ke liye billing ki permission chahiye.')}
        </Alert>
      )}

      {canSubmit && (
        <>
          {stripeConfig?.enabled && (
            <Card className="rounded-3xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CreditCard className="h-6 w-6" /></span>
                  <div>
                    <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Card se foran payment')}</h2>
                    <p className="text-[0.8125rem] text-slate-500">{t('Visa / Mastercard · plan khud chalu ho jayega')}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" /> {' '}{t('Stripe ke zariye mehfooz')}</p>
                  </div>
                </div>
                <Button size="lg" loading={stripeMutation.isPending} onClick={() => stripeMutation.mutate(invoice.id)}>
                  <CreditCard className="h-4 w-4" /> {' '}{t('{{amountDue}} card se', { amountDue: formatPKR(invoice.amountDue) })}
                </Button>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{stripeConfig?.enabled ? t('Ya bank / wallet se') : t('Bank / wallet se payment')}</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <Card className="rounded-3xl" title={t('1. Tareeqa chunein')}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {providerOptions.map((pid) => {
                    const m = PROVIDER[pid];
                    const active = provider === pid;
                    return (
                      <button key={pid} type="button" onClick={() => setProvider(pid)} aria-pressed={active}
                        className={cn('flex items-center gap-3 rounded-2xl p-3 text-start ring-1 transition', active ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300')}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-5 w-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[0.875rem] font-semibold text-slate-900">{m.label}</span>
                          <span className="block truncate text-[0.75rem] text-slate-500">{m.hint}</span>
                        </span>
                        {active && <Check className="h-4 w-4 text-brand-600" />}
                      </button>
                    );
                  })}
                </div>
              </Card>

              <Card className="rounded-3xl" title={t('2. {{label}} par bhejein', { label: current.label })} description={t('Poore {{amountDue}} bhejein, phir screenshot lein', { amountDue: formatPKR(invoice.amountDue) })}>
                {!bank ? <Skeleton className="h-28 rounded-2xl" /> : (
                  <dl className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                    {accountRows().map((r) => (
                      <div key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <dt className="text-[0.75rem] text-slate-500">{r.label}</dt>
                          <dd className={cn('break-all font-semibold text-slate-900', r.copyKey && 'font-mono', r.big ? 'text-lg' : 'text-[0.875rem]')}>{r.value || '—'}</dd>
                        </div>
                        {r.copyKey && r.value && (
                          <button type="button" onClick={() => copy(r.value!, r.copyKey!)} aria-label={t('{{label}} copy', { label: r.label })}
                            className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition', copied === r.copyKey ? 'bg-success-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100')}>
                            {copied === r.copyKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </Card>
            </div>

            <Card className="h-fit rounded-3xl" title={t('3. Payment ki details')} description={t('Nafaa team inhi se payment milati hai')}>
              <div className="space-y-3">
                <Input ref={nameRef} label={t('Bhejne wale ka naam')} required value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder={t('Ahmad Ali')} />
                <Input label={t('Phone')} value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="03001234567" hint={t('Approval ki khabar isi par aayegi')} inputMode="tel" />
                <Input label={t('Transaction / TID number')} value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder={t('TX-12345678')} hint={t('Bank ya wallet ka reference — check karne me sab se zyada kaam aata hai')} className="font-mono" />
                {provider === 'MANUAL_BANK' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label={t('Aap ka bank')} value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder={t('HBL, UBL, MCB…')} />
                    <Input label={t('Aap ka account number')} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="01234567890" />
                  </div>
                )}

                <div>
                  <p className="mb-1.5 flex items-center justify-between text-[0.8125rem] font-medium text-slate-800">
                    <span>{t('Payment ka screenshot / receipt')}{' '} <span className="text-rose-600">*</span></span>
                    {!uploadUrl && !uploading && <span className="hidden text-[0.6875rem] text-slate-400 sm:inline">{t('U dabayein')}</span>}
                  </p>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f && canPay) void handleFileUpload(f); }}
                    className={cn('relative rounded-2xl border-2 border-dashed p-5 text-center transition',
                      uploadUrl ? 'border-success-300 bg-success-50' : uploading ? 'border-blue-300 bg-blue-50' : dragOver ? 'border-brand-500 bg-brand-50' : 'border-slate-300 hover:border-brand-400')}>
                    {uploadUrl ? (
                      <div>
                        {filePreview ? <img src={filePreview} alt={t('Receipt')} className="mx-auto max-h-40 rounded-xl shadow" /> : <FileImage className="mx-auto h-10 w-10 text-success-600" />}
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-success-800"><Check className="h-4 w-4" /> {' '}{t('Upload ho gayi')}</p>
                        <p className="truncate text-[0.75rem] text-slate-600">{file?.name}</p>
                        <div className="mt-2 flex justify-center gap-3">
                          <a href={uploadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline"><ExternalLink className="h-3 w-3" /> {' '}{t('Dekhein')}</a>
                          <button type="button" onClick={removeFile} className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-rose-700 hover:underline"><X className="h-3 w-3" /> {' '}{t('Hatayein')}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className={cn('mx-auto h-10 w-10', uploading ? 'animate-pulse text-blue-600' : 'text-slate-400')} />
                        <p className="mt-2 text-[0.875rem] font-semibold text-slate-700">{uploading ? t('Upload ho rahi hai…') : dragOver ? t('Yahan chhor dein') : t('Screenshot upload karein')}</p>
                        <p className="text-[0.75rem] text-slate-500">{t('Click ya drag-drop · PNG, JPG ya PDF · 10MB tak')}</p>
                        <input ref={uploadRef} type="file" accept="image/*,application/pdf" disabled={uploading || !canPay} aria-label={t('Receipt upload')}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileUpload(f); }}
                          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
                      </>
                    )}
                  </div>
                </div>

                <Textarea label={t('Note (agar zaroorat ho)')} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Koi aur baat…')} />

                <Button fullWidth size="lg" loading={submitMutation.isPending || uploading} onClick={handleSubmit} disabled={!canPay || !uploadUrl || !payerName.trim()}>
                  <Send className="h-4 w-4" /> {' '}{t('Check ke liye bhejein')}
                </Button>
                <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] text-slate-600 ring-1 ring-slate-100">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {t('Nafaa team 24 ghante me approve ya wapas karegi aur notification aayegi. Receipt mehfooz rehti hai.')}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  );
}

function PayGuide({ amount, card, onClose }: { amount: number; card: boolean; onClose: () => void }) {
  return (
    <PageGuide title={t('Bill ki payment — aasaan tareeqa')} onClose={onClose}
      steps={[
        ...(card ? [{ icon: CreditCard, color: '#2563eb', title: t('Card se foran'), text: t('Visa / Mastercard se payment — plan usi waqt chalu ho jata hai, intezar nahi.') }] : []),
        { icon: Wallet, color: '#16a34a', title: t('Tareeqa chunein'), text: t('Bank transfer, JazzCash, EasyPaisa ya NayaPay. Account ki details saamne aa jayegi.') },
        { icon: Copy, color: '#7c3aed', title: t('Paise bhejein'), text: t('Number ya IBAN copy karein aur apni app se poore {{amount}} bhejein.', { amount: formatPKR(amount) }) },
        { icon: Upload, color: '#d97706', title: t('Screenshot upload'), text: t('Payment ka screenshot lein jis me TID, amount aur date nazar aaye, aur upload karein.') },
        { icon: Send, color: '#0891b2', title: t('Bhej dein'), text: t('Naam aur phone likh kar "Check ke liye bhejein" dabayein. 24 ghante me jawab.') },
      ]}
      tips={[
        t('Bilkul {{amount}} bhejein — kam ya zyada amount wapas ho sakti hai.', { amount: formatPKR(amount) }),
        t('TID zaroor likhein — payment milane me sab se zyada kaam aata hai.'),
        t('24 ghante se zyada ho jayein to Madad page se WhatsApp karein.'),
      ]}
      shortcuts={[['U', t('upload')], ['S', t('bhejein')], ['Esc', t('wapas')], ['G', t('guide')]]}
    />
  );
}
