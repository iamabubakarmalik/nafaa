/**
 * Right-side drawer listing offline sales and other changes that are still
 * waiting to upload, with a retry-all action and per-item delete.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Badge, Button, EmptyState, IconButton, confirmDialog, type BadgeVariant } from '@/design-system/components';
import { X, RefreshCw, Trash2, AlertTriangle, Clock, CheckCircle2, Package } from 'lucide-react';
import { db, type PendingSale, type SyncQueueItem } from '@core/lib/offline/db';
import { uploadPendingChanges } from '@core/lib/offline/syncEngine';
import { toast } from 'sonner';
import { t } from '@core/i18n';

interface Props {
  open: boolean;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  CREATE_PRODUCT: t('Product banaya'),
  UPDATE_PRODUCT: t('Product update'),
  DELETE_PRODUCT: t('Product delete'),
  TOGGLE_PRODUCT_ACTIVE: t('Product active toggle'),
  TOGGLE_PRODUCT_FEATURED: t('Product featured toggle'),
  CREATE_CUSTOMER: t('Customer banaya'),
  UPDATE_CUSTOMER: t('Customer update'),
  DELETE_CUSTOMER: t('Customer delete'),
  PAYMENT_CUSTOMER: t('Customer payment'),
  CREATE_EXPENSE: t('Expense banaya'),
  DELETE_EXPENSE: t('Expense delete'),
  UPDATE_PRODUCT_STOCK: t('Stock update'),
  CREATE_LEDGER: t('Ledger entry'),
  OTHER: t('Other change'),
};

export function PendingSalesDrawer({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);

  // Poll the local database while the drawer is open.
  useEffect(() => {
    if (!open) return;
    let mounted = true;

    const load = async () => {
      const [sales, queue] = await Promise.all([
        db.pendingSales.where('status').anyOf('pending', 'failed', 'syncing').reverse().sortBy('createdAt'),
        db.syncQueue.where('status').anyOf('pending', 'failed', 'syncing').reverse().sortBy('createdAt'),
      ]);
      if (!mounted) return;
      setPendingSales(sales);
      setQueueItems(queue);
    };

    void load();
    const interval = setInterval(load, 2000);
    return () => { mounted = false; clearInterval(interval); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleRetryAll = async () => {
    if (!navigator.onLine) {
      toast.error(t('Pehle online ho jao'));
      return;
    }
    setBusy(true);
    try {
      const result = await uploadPendingChanges();
      const total = result.salesSynced + result.queueSynced;
      if (total > 0) toast.success(t('{{total}} items sync ho gaye', { total }));
      else if (result.failed > 0) toast.error(t('{{failed}} items fail ho rahe hain', { failed: result.failed }));
      else toast.info(t('Kuch sync nahi hua'));
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!(await confirmDialog({ title: t('Yeh pending sale delete kar dein?'), danger: true }))) return;
    await db.pendingSales.delete(id);
    toast.success(t('Sale hataa di gayi'));
  };

  const handleDeleteQueueItem = async (id: string) => {
    if (!(await confirmDialog({ title: t('Yeh pending change delete kar dein?'), danger: true }))) return;
    await db.syncQueue.delete(id);
    toast.success(t('Change hata diya gaya'));
  };

  if (!open) return null;

  const salesCount = pendingSales.length;
  const queueCount = queueItems.length;
  const totalCount = salesCount + queueCount;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={t('Pending changes')} className="relative flex w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">{t('Pending Changes')}</h2>
            <p className="text-[0.75rem] text-slate-500">{t('{{totalCount}} items sync ke liye taiyar', { totalCount })}</p>
          </div>
          <IconButton label={t('Band karein')} onClick={onClose}><X className="h-5 w-5" /></IconButton>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 p-3">
          <Button fullWidth onClick={handleRetryAll} disabled={busy || totalCount === 0 || !navigator.onLine}
            leftIcon={<RefreshCw className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}>
            {busy ? t('Sync ho raha hai…') : t('Sabko Sync Karo')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <EmptyState className="h-full" icon={<CheckCircle2 className="h-6 w-6 text-success-600" />} title={t('Sab kuch synced hai')} description={t('Koi pending change nahi')} />
          ) : (
            <div className="space-y-4 p-3">
              {salesCount > 0 && (
                <section>
                  <h3 className="mb-2 px-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Sales ({{salesCount}})', { salesCount })}</h3>
                  <div className="space-y-2">
                    {pendingSales.map((sale) => (
                      <PendingSaleCard key={sale.id} sale={sale} onDelete={() => handleDeleteSale(sale.id)} />
                    ))}
                  </div>
                </section>
              )}
              {queueCount > 0 && (
                <section>
                  <h3 className="mb-2 px-1 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{t('Other Changes ({{queueCount}})', { queueCount })}</h3>
                  <div className="space-y-2">
                    {queueItems.map((item) => (
                      <QueueItemCard key={item.id} item={item} onDelete={() => handleDeleteQueueItem(item.id)} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const STATUS_TONE: Record<string, BadgeVariant> = { pending: 'warning', syncing: 'info', failed: 'danger', synced: 'success' };
const STATUS_ICON: Record<string, ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  syncing: <RefreshCw className="h-3 w-3 animate-spin" />,
  failed: <AlertTriangle className="h-3 w-3" />,
  synced: <CheckCircle2 className="h-3 w-3" />,
};

function SyncError({ children }: { children: ReactNode }) {
  return <div className="mt-2 rounded-lg bg-rose-50 px-2 py-1 text-[0.6875rem] text-rose-700 ring-1 ring-inset ring-rose-200">{children}</div>;
}

function PendingSaleCard({ sale, onDelete }: { sale: PendingSale; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[0.75rem] font-bold text-slate-800">{sale.saleNumber}</span>
            <Badge size="xs" variant={STATUS_TONE[sale.status] ?? 'default'} className="gap-1">{STATUS_ICON[sale.status]}{sale.status}</Badge>
          </div>
          <p className="mt-0.5 text-[0.75rem] text-slate-500">{new Date(sale.createdAt).toLocaleString()}</p>
        </div>
        <IconButton label={t('Delete')} size="sm" onClick={onDelete} className="text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></IconButton>
      </div>

      <div className="space-y-1 text-[0.75rem] text-slate-700">
        {sale.customerSnapshot && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">{t('Customer:')}</span>
            <span className="truncate font-medium">{sale.customerSnapshot.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3 text-slate-400" />
          <span className="text-slate-500">{t('{{count}} items', { count: sale.itemsSnapshot.length })}</span>
          <span className="mx-1 text-slate-300">•</span>
          <span className="font-semibold text-slate-800">Rs {sale.total.toFixed(0)}</span>
          <span className="text-slate-500">({sale.paymentMethod})</span>
        </div>
      </div>

      {sale.syncError && (
        <SyncError><strong>{t('Error:')}</strong> {sale.syncError}{sale.retryCount > 0 && <span className="ms-1">{t('({{retryCount}} tries)', { retryCount: sale.retryCount })}</span>}</SyncError>
      )}
    </div>
  );
}

function QueueItemCard({ item, onDelete }: { item: SyncQueueItem; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{typeLabels[item.type] || item.type}</span>
            <Badge size="xs" variant={STATUS_TONE[item.status] ?? 'default'}>{item.status}</Badge>
          </div>
          <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-slate-500">{item.method} {item.endpoint}</p>
          <p className="mt-0.5 text-[0.6875rem] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
          {item.syncError && <SyncError>{item.syncError}{item.retryCount > 0 && t(' ({{retryCount}} tries)', { retryCount: item.retryCount })}</SyncError>}
        </div>
        <IconButton label={t('Delete')} size="sm" onClick={onDelete} className="text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></IconButton>
      </div>
    </div>
  );
}
