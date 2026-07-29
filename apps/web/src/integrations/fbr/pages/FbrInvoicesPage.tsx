import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  FileText, CheckCircle2, AlertCircle, Clock, RefreshCw,
  ExternalLink, QrCode, Search, Filter, X, ChevronRight, Zap,
} from 'lucide-react';
import { fbrApi } from '../api/fbr.api';
import type { FbrInvoiceStatus } from '../api/fbr.types';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { Badge } from '@core/ui/Badge';
import { SkeletonCard } from '@core/ui/Skeleton';
import { Modal } from '@core/ui/Modal';
import { cn } from '@core/lib/cn';

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:        { label: 'Pending',        color: 'amber',   icon: Clock },
  SUBMITTING:     { label: 'Submitting',     color: 'blue',    icon: RefreshCw },
  SUBMITTED:      { label: 'Submitted',      color: 'blue',    icon: CheckCircle2 },
  ACKNOWLEDGED:   { label: 'Acknowledged',   color: 'emerald', icon: CheckCircle2 },
  REJECTED:       { label: 'Rejected',       color: 'rose',    icon: AlertCircle },
  RETRY_QUEUED:   { label: 'Retry Queued',   color: 'amber',   icon: RefreshCw },
  MANUAL_SKIPPED: { label: 'Skipped',        color: 'slate',   icon: X },
  CANCELLED:      { label: 'Cancelled',      color: 'slate',   icon: X },
};

const COLOR: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300',
  blue:    'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-300',
  amber:   'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300',
  rose:    'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300',
  slate:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
};

export default function FbrInvoicesPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<FbrInvoiceStatus | ''>('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fbr-invoices', status],
    queryFn: () => fbrApi.listInvoices({ status: status || undefined, limit: 100 }),
  });

  const bulkMutation = useMutation({
    mutationFn: (params: any) => fbrApi.bulkSubmit(params),
    onSuccess: (r) => {
      toast.success(`${r.success}/${r.total} submitted`, {
        description: r.failed > 0 ? `${r.failed} failed — check logs` : undefined,
        duration: 6000,
      });
      qc.invalidateQueries({ queryKey: ['fbr-invoices'] });
    },
  });

  const retryMutation = useMutation({
    mutationFn: fbrApi.retryPending,
    onSuccess: (r) => {
      toast.success(`${r.results.filter((x) => x.success).length}/${r.retried} retry ho gaye`);
      qc.invalidateQueries({ queryKey: ['fbr-invoices'] });
    },
  });

  const items = data?.items ?? [];
  const filtered = search
    ? items.filter((i) =>
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        i.fbrInvoiceNumber?.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-600" />
            FBR Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Har FBR-submitted sale ka record — status, QR code, verification link
          </p>
        </div>
        <Button
          variant="outline"
          loading={retryMutation.isPending}
          onClick={() => retryMutation.mutate()}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Retry Pending
        </Button>
        <Button
          variant="gradient"
          loading={bulkMutation.isPending}
          onClick={() => {
            const dateFrom = window.prompt('From date (YYYY-MM-DD):', new Date(Date.now() - 7 * 86400 * 1000).toISOString().slice(0, 10));
            if (!dateFrom) return;
            const dateTo = window.prompt('To date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
            if (!dateTo) return;
            bulkMutation.mutate({ dateFrom, dateTo, onlyPending: true });
          }}
          leftIcon={<Zap className="h-4 w-4" />}
        >
          Bulk Submit
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="h-10 px-3 rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm font-bold"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, m]) => (
            <option key={k} value={k}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <SkeletonCard />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-neutral-900 p-12 text-center border border-dashed border-slate-300 dark:border-neutral-700">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <div className="font-black text-slate-900 dark:text-white">No invoices yet</div>
          <p className="text-sm text-slate-500 mt-1">
            Sales complete karo aur FBR ko submit karo — records yahan aa jayenge
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const meta = STATUS_META[inv.status];
            const Icon = meta.icon;
            return (
              <button
                key={inv.id}
                onClick={() => setSelectedId(inv.id)}
                className="w-full p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className={cn('h-10 w-10 rounded-xl border flex items-center justify-center shrink-0', COLOR[meta.color])}>
                    <Icon className={cn('h-5 w-5', inv.status === 'SUBMITTING' && 'animate-spin')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 dark:text-white">{inv.invoiceNumber}</span>
                      <Badge className={COLOR[meta.color]} size="xs">{meta.label}</Badge>
                      {inv.fbrInvoiceNumber && (
                        <span className="text-[11px] font-mono text-slate-500">
                          FBR: {inv.fbrInvoiceNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span>Total: <b className="text-slate-900 dark:text-white">Rs {inv.totalAmount.toLocaleString()}</b></span>
                      <span>Tax: <b className="text-slate-900 dark:text-white">Rs {inv.taxAmount.toLocaleString()}</b></span>
                      <span>{new Date(inv.createdAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {inv.errorMessage && (
                      <div className="mt-1.5 text-[11px] text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded truncate">
                        {inv.errorMessage}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 self-center group-hover:translate-x-1 transition" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedId && <InvoiceDetailModal id={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function InvoiceDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: invoice } = useQuery({
    queryKey: ['fbr-invoice', id],
    queryFn: () => fbrApi.getInvoice(id),
  });

  const resubmitMutation = useMutation({
    mutationFn: () => fbrApi.submit(invoice!.saleId, true),
    onSuccess: () => {
      toast.success('Resubmitted');
      qc.invalidateQueries({ queryKey: ['fbr-invoice', id] });
      qc.invalidateQueries({ queryKey: ['fbr-invoices'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  });

  if (!invoice) return null;
  const meta = STATUS_META[invoice.status];

  return (
    <Modal open onClose={onClose} title={`Invoice ${invoice.invoiceNumber}`} size="lg">
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-800 dark:to-neutral-900 flex items-center gap-4">
          <Badge className={COLOR[meta.color]} size="sm">{meta.label}</Badge>
          {invoice.fbrInvoiceNumber && (
            <div className="text-xs">
              <span className="text-slate-500">FBR #:</span>{' '}
              <span className="font-black font-mono">{invoice.fbrInvoiceNumber}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricBox label="Total" value={`Rs ${invoice.totalAmount.toLocaleString()}`} />
          <MetricBox label="Tax" value={`Rs ${invoice.taxAmount.toLocaleString()}`} />
          <MetricBox label="Net" value={`Rs ${invoice.netAmount.toLocaleString()}`} />
        </div>

        {invoice.fbrQrCode && (
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 flex items-center gap-4">
            <div className="h-24 w-24 rounded-xl bg-white p-2 shrink-0">
              <img src={`data:image/png;base64,${invoice.fbrQrCode}`} alt="FBR QR" className="w-full h-full" />
            </div>
            <div className="flex-1">
              <div className="font-black text-sm text-slate-900 dark:text-white">FBR Verified QR Code</div>
              <p className="text-xs text-slate-500 mt-1">Customer is QR ko scan karke sale verify kar sakta hai</p>
              {invoice.fbrVerificationUrl && (
                <a
                  href={invoice.fbrVerificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Verify on FBR site <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {invoice.errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
            <div className="font-black text-sm text-rose-700 dark:text-rose-400 mb-1">Error</div>
            <div className="text-xs text-rose-600 dark:text-rose-400 font-mono">{invoice.errorMessage}</div>
          </div>
        )}

        {invoice.skippedReason && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="font-black text-sm text-amber-700 dark:text-amber-400 mb-1">Skipped Reason</div>
            <div className="text-xs text-amber-700 dark:text-amber-400">{invoice.skippedReason}</div>
          </div>
        )}

        <div className="text-xs text-slate-500 space-y-1">
          <div><b>Retry Count:</b> {invoice.retryCount}</div>
          {invoice.submittedAt && <div><b>Submitted:</b> {new Date(invoice.submittedAt).toLocaleString('en-PK')}</div>}
          {invoice.acknowledgedAt && <div><b>Acknowledged:</b> {new Date(invoice.acknowledgedAt).toLocaleString('en-PK')}</div>}
        </div>

        {(invoice.status === 'REJECTED' || invoice.status === 'RETRY_QUEUED') && (
          <Button
            variant="gradient"
            fullWidth
            loading={resubmitMutation.isPending}
            onClick={() => resubmitMutation.mutate()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Resubmit to FBR
          </Button>
        )}
      </div>
    </Modal>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-800 text-center">
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{value}</div>
    </div>
  );
}
