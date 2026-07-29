import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Shield, CheckCircle2, AlertCircle, Clock, RefreshCw, X,
  QrCode, ExternalLink, ChevronRight,
} from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import { useFbrForSale } from '../hooks/useFbrForSale';
import { Button } from '@core/ui/Button';
import { Badge } from '@core/ui/Badge';
import { Modal } from '@core/ui/Modal';
import { cn } from '@core/lib/cn';

interface Props {
  saleId: string;
  compact?: boolean;
  className?: string;
}

/**
 * Universal FBR button — kisi bhi industry ke sale detail/list page pe drop karo.
 * - FBR disabled: kuch nahi dikhata
 * - No invoice yet: "Submit to FBR" + "Skip" buttons
 * - Submitted: green badge with FBR number + QR view
 * - Rejected: resubmit button + error message
 */
export function FbrSaleButton({ saleId, compact = false, className }: Props) {
  const qc = useQueryClient();
  const { data: status, isLoading } = useFbrForSale(saleId);
  const [showQr, setShowQr] = useState(false);
  const [showSkip, setShowSkip] = useState(false);
  const [skipReason, setSkipReason] = useState('');

  const submitMutation = useMutation({
    mutationFn: () => fbrApi.submit(saleId),
    onSuccess: (r: any) => {
      if (r?.success) toast.success('FBR submit ho gaya!');
      else toast.error(r?.errorMessage ?? 'Submit failed');
      qc.invalidateQueries({ queryKey: ['fbr-sale-status', saleId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  const skipMutation = useMutation({
    mutationFn: () => fbrApi.skip(saleId, skipReason || 'Manual skip'),
    onSuccess: () => {
      toast.success('Sale skip ho gayi FBR se');
      qc.invalidateQueries({ queryKey: ['fbr-sale-status', saleId] });
      setShowSkip(false);
      setSkipReason('');
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: () => fbrApi.submit(saleId, true),
    onSuccess: () => {
      toast.success('Resubmitted');
      qc.invalidateQueries({ queryKey: ['fbr-sale-status', saleId] });
    },
  });

  // FBR off — nothing to show
  if (isLoading || !status || !status.fbrEnabled) return null;

  const inv = status.invoice;

  // ─── Compact mode (for lists / rows) ───
  if (compact) {
    if (!inv) {
      return (
        <Button
          size="sm"
          variant="outline"
          className={cn('gap-1', className)}
          loading={submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          <Shield className="h-3 w-3" />
          FBR
        </Button>
      );
    }
    const bg =
      inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
        : inv.status === 'REJECTED'
          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
          : inv.status === 'MANUAL_SKIPPED'
            ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';

    return (
      <button
        onClick={() => inv.fbrQrCode && setShowQr(true)}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider',
          bg, className,
        )}
      >
        <Shield className="h-2.5 w-2.5" />
        FBR: {inv.status === 'ACKNOWLEDGED' ? 'OK' : inv.status.slice(0, 4)}
      </button>
    );
  }

  // ─── Full card ───
  return (
    <>
      <div className={cn(
        'rounded-2xl p-4 border-2 transition',
        !inv
          ? 'border-dashed border-slate-300 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
          : inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED'
            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
            : inv.status === 'REJECTED'
              ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20'
              : inv.status === 'MANUAL_SKIPPED'
                ? 'border-slate-300 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800'
                : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20',
        className,
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
            !inv ? 'bg-slate-200 dark:bg-neutral-800 text-slate-500'
              : inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED'
                ? 'bg-emerald-500 text-white'
                : inv.status === 'REJECTED'
                  ? 'bg-rose-500 text-white'
                  : inv.status === 'MANUAL_SKIPPED'
                    ? 'bg-slate-400 text-white'
                    : 'bg-amber-500 text-white',
          )}>
            {!inv ? <Shield className="h-5 w-5" />
              : inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED' ? <CheckCircle2 className="h-5 w-5" />
              : inv.status === 'REJECTED' ? <AlertCircle className="h-5 w-5" />
              : inv.status === 'MANUAL_SKIPPED' ? <X className="h-5 w-5" />
              : <Clock className="h-5 w-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-900 dark:text-white">
                FBR Tax
              </span>
              {status.environment === 'SANDBOX' && (
                <Badge size="xs" variant="warning">SANDBOX</Badge>
              )}
              {inv && (
                <Badge size="xs" variant={
                  inv.status === 'ACKNOWLEDGED' || inv.status === 'SUBMITTED' ? 'success'
                  : inv.status === 'REJECTED' ? 'danger'
                  : inv.status === 'MANUAL_SKIPPED' ? 'default'
                  : 'warning'
                }>
                  {inv.status}
                </Badge>
              )}
            </div>

            {!inv && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Ye sale FBR ko submit nahi hui. Manual mode active hai.
                {status.belowThreshold && ` (Threshold Rs ${status.threshold} se neeche)`}
              </p>
            )}

            {inv?.fbrInvoiceNumber && (
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span><b className="font-mono">FBR#:</b> {inv.fbrInvoiceNumber}</span>
                <span>Tax: <b>Rs {inv.taxAmount.toLocaleString()}</b></span>
                {inv.submittedAt && (
                  <span>{new Date(inv.submittedAt).toLocaleString('en-PK', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}</span>
                )}
              </div>
            )}

            {inv?.errorMessage && (
              <div className="mt-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/40 px-2 py-1 rounded">
                {inv.errorMessage}
              </div>
            )}

            {inv?.skippedReason && (
              <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 italic">
                Skipped: {inv.skippedReason}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {!inv && status.canSubmit && (
                <>
                  <Button
                    size="sm"
                    variant="gradient"
                    loading={submitMutation.isPending}
                    onClick={() => submitMutation.mutate()}
                    leftIcon={<Shield className="h-3.5 w-3.5" />}
                  >
                    Submit to FBR
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowSkip(true)}
                    leftIcon={<X className="h-3.5 w-3.5" />}
                  >
                    Skip
                  </Button>
                </>
              )}

              {inv?.fbrQrCode && (
                <Button size="sm" variant="outline" onClick={() => setShowQr(true)} leftIcon={<QrCode className="h-3.5 w-3.5" />}>
                  QR / Details
                </Button>
              )}

              {inv?.fbrVerificationUrl && (
                <a href={inv.fbrVerificationUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-black text-emerald-600 hover:underline">
                  Verify <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {inv && (inv.status === 'REJECTED' || inv.status === 'RETRY_QUEUED') && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={resubmitMutation.isPending}
                  onClick={() => resubmitMutation.mutate()}
                  leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {showQr && inv?.fbrQrCode && (
        <Modal open onClose={() => setShowQr(false)} title="FBR Invoice QR Code" size="sm">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-56 w-56 rounded-2xl bg-white p-4 shadow-lg">
              <img src={`data:image/png;base64,${inv.fbrQrCode}`} alt="FBR QR" className="w-full h-full" />
            </div>
            <div className="text-center">
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">FBR Invoice #</div>
              <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
                {inv.fbrInvoiceNumber}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center max-w-xs">
              Customer is QR ko scan karke sale FBR website pe verify kar sakta hai.
            </p>
          </div>
        </Modal>
      )}

      {/* Skip Modal */}
      {showSkip && (
        <Modal open onClose={() => setShowSkip(false)} title="Skip FBR Submission?" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowSkip(false)}>Cancel</Button>
              <Button variant="danger" loading={skipMutation.isPending} onClick={() => skipMutation.mutate()}>
                Skip Submission
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              <b>Yaad rakho:</b> Ye sale FBR ko report nahi hogi. Sirf tab skip karo agar aap ki policy ke hisaab se ye zaroori hai.
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1 block">
                Reason (optional)
              </label>
              <input
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                placeholder="e.g. Cash-only, private sale, staff meal..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
