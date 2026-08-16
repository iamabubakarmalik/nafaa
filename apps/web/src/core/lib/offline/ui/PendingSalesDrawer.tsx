import { useEffect, useState } from 'react';
import { X, RefreshCw, Trash2, AlertTriangle, Clock, CheckCircle2, Package } from 'lucide-react';
import { db, type PendingSale, type SyncQueueItem } from '@core/lib/offline/db';
import { uploadPendingChanges } from '@core/lib/offline/syncEngine';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const typeLabels: Record<string, string> = {
  CREATE_PRODUCT: 'Product banaya',
  UPDATE_PRODUCT: 'Product update',
  DELETE_PRODUCT: 'Product delete',
  TOGGLE_PRODUCT_ACTIVE: 'Product active toggle',
  TOGGLE_PRODUCT_FEATURED: 'Product featured toggle',
  CREATE_CUSTOMER: 'Customer banaya',
  UPDATE_CUSTOMER: 'Customer update',
  DELETE_CUSTOMER: 'Customer delete',
  PAYMENT_CUSTOMER: 'Customer payment',
  CREATE_EXPENSE: 'Expense banaya',
  DELETE_EXPENSE: 'Expense delete',
  UPDATE_PRODUCT_STOCK: 'Stock update',
  CREATE_LEDGER: 'Ledger entry',
  OTHER: 'Other change',
};

export function PendingSalesDrawer({ open, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);

  // Poll Dexie while open (simple, no external hooks)
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
      toast.error('Pehle online ho jao');
      return;
    }
    setBusy(true);
    try {
      const result = await uploadPendingChanges();
      const total = result.salesSynced + result.queueSynced;
      if (total > 0) toast.success(`${total} items sync ho gaye`);
      else if (result.failed > 0) toast.error(`${result.failed} items fail ho rahe hain`);
      else toast.info('Kuch sync nahi hua');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!confirm('Yeh pending sale delete kar dein?')) return;
    await db.pendingSales.delete(id);
    toast.success('Sale hataa di gayi');
  };

  const handleDeleteQueueItem = async (id: string) => {
    if (!confirm('Yeh pending change delete kar dein?')) return;
    await db.syncQueue.delete(id);
    toast.success('Change hata diya gaya');
  };

  if (!open) return null;

  const salesCount = pendingSales.length;
  const queueCount = queueItems.length;
  const totalCount = salesCount + queueCount;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="p-4 border-b bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Pending Changes</h2>
            <p className="text-xs text-slate-500">{totalCount} items sync ke liye taiyar</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b bg-slate-50 flex gap-2">
          <button
            onClick={handleRetryAll}
            disabled={busy || totalCount === 0 || !navigator.onLine}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
            {busy ? 'Sync ho raha hai…' : 'Sabko Sync Karo'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">
              <CheckCircle2 className="w-14 h-14 mb-3 text-emerald-300" />
              <p className="text-sm font-medium">Sab kuch synced hai 🎉</p>
              <p className="text-xs mt-1">Koi pending change nahi</p>
            </div>
          ) : (
            <div className="p-3 space-y-4">
              {salesCount > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 px-1">
                    Sales ({salesCount})
                  </h3>
                  <div className="space-y-2">
                    {pendingSales.map((sale) => (
                      <PendingSaleCard key={sale.id} sale={sale} onDelete={() => handleDeleteSale(sale.id)} />
                    ))}
                  </div>
                </section>
              )}
              {queueCount > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 px-1">
                    Other Changes ({queueCount})
                  </h3>
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
      </div>
    </div>
  );
}

function PendingSaleCard({ sale, onDelete }: { sale: PendingSale; onDelete: () => void }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    syncing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const icons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-3 h-3" />,
    syncing: <RefreshCw className="w-3 h-3 animate-spin" />,
    failed: <AlertTriangle className="w-3 h-3" />,
    synced: <CheckCircle2 className="w-3 h-3" />,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800 truncate">{sale.saleNumber}</span>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${statusStyles[sale.status]}`}>
              {icons[sale.status]}
              {sale.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{new Date(sale.createdAt).toLocaleString()}</p>
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition shrink-0" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="text-xs space-y-1 text-slate-700">
        {sale.customerSnapshot && (
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Customer:</span>
            <span className="font-medium truncate">{sale.customerSnapshot.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Package className="w-3 h-3 text-slate-400" />
          <span className="text-slate-500">{sale.itemsSnapshot.length} items</span>
          <span className="mx-1 text-slate-300">•</span>
          <span className="font-semibold text-slate-800">Rs {sale.total.toFixed(0)}</span>
          <span className="text-slate-500">({sale.paymentMethod})</span>
        </div>
      </div>

      {sale.syncError && (
        <div className="mt-2 text-[10px] bg-rose-50 border border-rose-200 rounded px-2 py-1 text-rose-700">
          <strong>Error:</strong> {sale.syncError}
          {sale.retryCount > 0 && <span className="ml-1">({sale.retryCount} tries)</span>}
        </div>
      )}
    </div>
  );
}

function QueueItemCard({ item, onDelete }: { item: SyncQueueItem; onDelete: () => void }) {
  const statusStyles: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    syncing: 'bg-blue-50 text-blue-700 border-blue-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">{typeLabels[item.type] || item.type}</span>
            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${statusStyles[item.status]}`}>
              {item.status}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">{item.method} {item.endpoint}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{new Date(item.createdAt).toLocaleString()}</p>
          {item.syncError && (
            <div className="mt-1.5 text-[10px] bg-rose-50 border border-rose-200 rounded px-2 py-1 text-rose-700">
              {item.syncError}
              {item.retryCount > 0 && ` (${item.retryCount} tries)`}
            </div>
          )}
        </div>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
