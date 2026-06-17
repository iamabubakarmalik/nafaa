import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftRight, Plus, Search, X, Building2, Package, Clock, Truck,
  CheckCircle2, XCircle, Calendar, Download, Eye, Trash2, Layers, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { shopsApi } from '@/api/shops.api';
import { productsApi, type Product } from '@/api/products.api';
import { transfersApi, type StockTransfer, type TransferStatus } from '@/api/transfers.api';
import { useAuthStore } from '@/store/auth.store';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import { TransferRollPicker } from '@/features/industries/carpet/components/TransferRollPicker';
import { TransferCartLine, type TransferLineItem } from '@/features/industries/carpet/components/TransferCartLine';
import type { CarpetRoll } from '@/features/industries/carpet/api/carpet-rolls.api';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

const formatDate = (v: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

const statusConfig: Record<TransferStatus, { label: string; tone: string; icon: any }> = {
  PENDING: { label: 'Pending', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: Truck },
  RECEIVED: { label: 'Received', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTransfer, setViewTransfer] = useState<StockTransfer | null>(null);

  // Form state
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<TransferLineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [rollPickerProduct, setRollPickerProduct] = useState<Product | null>(null);

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['stock-transfers'],
    queryFn: () => transfersApi.list(),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops-selector'],
    queryFn: shopsApi.list,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: () => productsApi.list({ page: 1, limit: 1000 }),
    enabled: createOpen,
  });

  const products = productsData?.items ?? [];

  const createMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      toast.success('Transfer created!', { description: 'Stock IN_TRANSIT marked' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
      resetForm();
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create failed'),
  });

  const receiveMutation = useMutation({
    mutationFn: transfersApi.receive,
    onSuccess: () => {
      toast.success('Transfer received!', { description: 'Stock added to destination shop' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
      setViewTransfer(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Receive failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: transfersApi.cancel,
    onSuccess: () => {
      toast.success('Transfer cancelled', { description: 'Stock returned to source' });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      setViewTransfer(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cancel failed'),
  });

  const resetForm = () => {
    setFromShopId(currentShopId || '');
    setToShopId('');
    setNotes('');
    setItems([]);
    setProductSearch('');
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const addProduct = (p: Product) => {
    if (!fromShopId) {
      toast.error('Pehle source shop select karein');
      return;
    }

    const isCarpet = CARPET_UNITS.has(p.unit);

    if (isCarpet) {
      // Carpet: open roll picker
      if (items.find((i) => i.productId === p.id)) {
        toast.error('Carpet product already added — uske rolls update karein');
        return;
      }
      setRollPickerProduct(p);
      setProductSearch('');
      return;
    }

    // Standard product
    if (items.find((i) => i.productId === p.id)) {
      toast.error('Already added');
      return;
    }
    setItems([
      ...items,
      {
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        quantity: 1,
        isCarpet: false,
        rolls: [],
      },
    ]);
    setProductSearch('');
  };

  const handleRollsSelected = (rolls: CarpetRoll[]) => {
    if (!rollPickerProduct) return;

    // Sum sqft for quantity field
    const totalSqft = rolls.reduce((s, r) => s + Number(r.remainingSqft), 0);

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === rollPickerProduct.id);
      if (existing) {
        // Add to existing carpet line
        const existingRollIds = new Set(existing.rolls.map((r) => r.id));
        const newRolls = rolls.filter((r) => !existingRollIds.has(r.id));
        const combined = [...existing.rolls, ...newRolls];
        const newTotal = combined.reduce((s, r) => s + Number(r.remainingSqft), 0);
        return prev.map((i) =>
          i.productId === rollPickerProduct.id
            ? { ...i, rolls: combined, quantity: newTotal }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: rollPickerProduct.id,
          productName: rollPickerProduct.name,
          unit: rollPickerProduct.unit,
          quantity: totalSqft,
          isCarpet: true,
          rolls,
        },
      ];
    });

    toast.success(`${rolls.length} roll${rolls.length !== 1 ? 's' : ''} added (${totalSqft.toFixed(2)} sqft)`);
    setRollPickerProduct(null);
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty < 0.01) return;
    setItems(items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const removeRollFromItem = (productId: string, rollId: string) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const newRolls = i.rolls.filter((r) => r.id !== rollId);
          const newTotal = newRolls.reduce((s, r) => s + Number(r.remainingSqft), 0);
          return { ...i, rolls: newRolls, quantity: newTotal };
        })
        .filter((i) => !i.isCarpet || i.rolls.length > 0), // drop carpet line if no rolls left
    );
  };

  const openMoreRolls = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) setRollPickerProduct(product);
  };

  const handleCreate = () => {
    if (!fromShopId) return toast.error('Source shop select karein');
    if (!toShopId) return toast.error('Destination shop select karein');
    if (fromShopId === toShopId) return toast.error('Source aur destination same nahi ho sakte');
    if (items.length === 0) return toast.error('At least 1 product add karein');

    // Validate carpet items have rolls
    const invalidCarpet = items.find((i) => i.isCarpet && i.rolls.length === 0);
    if (invalidCarpet) {
      return toast.error(`${invalidCarpet.productName}: Carpet mein rolls select karein`);
    }

    // Build payload — carpet items become multiple rows (one per roll)
    const payloadItems = items.flatMap((i) => {
      if (i.isCarpet) {
        return i.rolls.map((roll) => ({
          productId: i.productId,
          variantId: roll.variantId ?? undefined,
          carpetRollId: roll.id,
          quantity: Number(roll.remainingSqft),
          notes: i.notes,
        }));
      }
      return [{
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        notes: i.notes,
      }];
    });

    createMutation.mutate({
      fromShopId,
      toShopId,
      notes: notes.trim() || undefined,
      items: payloadItems,
    });
  };

  const filtered = useMemo(() => {
    let result = [...transfers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (t) =>
          t.transferNumber.toLowerCase().includes(q) ||
          t.fromShop?.name?.toLowerCase().includes(q) ||
          t.toShop?.name?.toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }
    return result;
  }, [transfers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: transfers.length,
    pending: transfers.filter((t) => t.status === 'PENDING').length,
    inTransit: transfers.filter((t) => t.status === 'IN_TRANSIT').length,
    received: transfers.filter((t) => t.status === 'RECEIVED').length,
  }), [transfers]);

  const filteredProducts = productSearch
    ? products.filter((p: any) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(productSearch.toLowerCase()),
      ).slice(0, 10)
    : [];

  const excludedRollIds = useMemo(
    () =>
      items
        .filter((i) => i.isCarpet && i.productId === rollPickerProduct?.id)
        .flatMap((i) => i.rolls.map((r) => r.id)),
    [items, rollPickerProduct],
  );

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Transfer #', 'From', 'To', 'Items', 'Status', 'Created'];
    const rows = filtered.map((t) => [
      t.transferNumber,
      t.fromShop?.name || '',
      t.toShop?.name || '',
      t.items?.length || 0,
      t.status,
      new Date(t.createdAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transfers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <>
      {rollPickerProduct && fromShopId && (
        <TransferRollPicker
          product={rollPickerProduct}
          fromShopId={fromShopId}
          excludeRollIds={excludedRollIds}
          onConfirm={handleRollsSelected}
          onClose={() => setRollPickerProduct(null)}
        />
      )}

      {/* CREATE MODAL */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">New Stock Transfer</h3>
                  <p className="text-xs text-slate-600">Move inventory between shops (carpet supports roll-level)</p>
                </div>
              </div>
              <button onClick={() => setCreateOpen(false)} className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Shop selectors */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">From Shop *</label>
                  <select
                    value={fromShopId}
                    onChange={(e) => setFromShopId(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select source...</option>
                    {shops.filter((s) => s.isActive).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (Main)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">To Shop *</label>
                  <select
                    value={toShopId}
                    onChange={(e) => setToShopId(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-medium focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select destination...</option>
                    {shops.filter((s) => s.isActive && s.id !== fromShopId).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.isMain ? ' (Main)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!fromShopId && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900">
                    <strong>Source shop select karein</strong> — phir products add karna shuru karein
                  </div>
                </div>
              )}

              {/* Product search */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Add Products</label>
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name or SKU..."
                    disabled={!fromShopId}
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
                  />
                </div>
                {filteredProducts.length > 0 && (
                  <div className="mt-1.5 rounded-xl border border-slate-200 bg-white max-h-48 overflow-y-auto shadow-lg">
                    {filteredProducts.map((p: any) => {
                      const isCarpet = CARPET_UNITS.has(p.unit);
                      return (
                        <button
                          key={p.id}
                          onClick={() => addProduct(p)}
                          className="w-full px-3 py-2 text-left hover:bg-cyan-50 border-b border-slate-100 last:border-0 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-bold text-slate-900 text-sm truncate flex-1">{p.name}</div>
                              {isCarpet && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                                  <Layers className="h-2.5 w-2.5" /> CARPET
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              {p.sku ? `${p.sku} • ` : ''}{p.stock} {p.unit}
                              {isCarpet && ' • Choose specific rolls'}
                            </div>
                          </div>
                          {isCarpet ? <Layers className="h-4 w-4 text-emerald-600 shrink-0" /> : <Plus className="h-4 w-4 text-cyan-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected items */}
              {items.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">No items yet</p>
                  <p className="text-xs text-slate-500 mt-1">Source shop choose karke products add karein</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Selected Items ({items.length})
                  </div>
                  {items.map((line) => (
                    <TransferCartLine
                      key={line.productId}
                      line={line}
                      onQuantityChange={
                        line.isCarpet ? undefined : (qty) => updateQty(line.productId, qty)
                      }
                      onRemove={() => removeItem(line.productId)}
                      onAddMoreRolls={
                        line.isCarpet ? () => openMoreRolls(line.productId) : undefined
                      }
                      onRemoveRoll={
                        line.isCarpet
                          ? (rollId) => removeRollFromItem(line.productId, rollId)
                          : undefined
                      }
                    />
                  ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for transfer, special instructions..."
                  rows={2}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold">
                {items.length > 0 && (
                  <>
                    {items.length} item{items.length !== 1 ? 's' : ''}
                    {items.some((i) => i.isCarpet) && (
                      <> • {items.filter((i) => i.isCarpet).reduce((s, i) => s + i.rolls.length, 0)} rolls</>
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCreateOpen(false)} className="h-10 px-4 rounded-xl border-2 border-slate-200 hover:bg-slate-100 text-sm font-bold text-slate-700">
                  Cancel
                </button>
                <Button
                  onClick={handleCreate}
                  loading={createMutation.isPending}
                  disabled={items.length === 0 || !fromShopId || !toShopId}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Truck className="h-4 w-4" /> Create Transfer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {viewTransfer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg font-mono">{viewTransfer.transferNumber}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {viewTransfer.fromShop?.name} → {viewTransfer.toShop?.name}
                </p>
              </div>
              <button onClick={() => setViewTransfer(null)} className="h-9 w-9 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-bold text-slate-500 uppercase">Status</div>
                  <div className="mt-1">
                    {(() => {
                      const cfg = statusConfig[viewTransfer.status];
                      const Icon = cfg.icon;
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.tone}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-bold text-slate-500 uppercase">Created</div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">{formatDate(viewTransfer.createdAt)}</div>
                </div>
                {viewTransfer.receivedAt && (
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <div className="text-xs font-bold text-emerald-700 uppercase">Received</div>
                    <div className="mt-1 font-bold text-emerald-900 text-sm">{formatDate(viewTransfer.receivedAt)}</div>
                  </div>
                )}
                {viewTransfer.createdBy && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="text-xs font-bold text-slate-500 uppercase">Created By</div>
                    <div className="mt-1 font-bold text-slate-900 text-sm">{viewTransfer.createdBy.fullName}</div>
                  </div>
                )}
              </div>

              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Items ({viewTransfer.items.length})</div>
                <div className="space-y-1.5">
                  {viewTransfer.items.map((it) => {
                    const hasRoll = !!it.carpetRoll;
                    return (
                      <div key={it.id} className={`rounded-xl border p-3 flex items-center gap-3 ${
                        hasRoll ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'
                      }`}>
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                          hasRoll ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700'
                        }`}>
                          {hasRoll ? <Layers className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{it.product.name}</div>
                          {hasRoll && it.carpetRoll && (
                            <div className="text-[11px] mt-0.5 font-mono font-bold text-emerald-700 flex items-center gap-1.5 flex-wrap">
                              <span>{it.carpetRoll.rollNumber}</span>
                              {it.carpetRoll.variant && (
                                <span className="font-sans text-violet-700">
                                  — {it.carpetRoll.variant.name}
                                </span>
                              )}
                            </div>
                          )}
                          {it.notes && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">{it.notes}</div>
                          )}
                        </div>
                        <div className="font-extrabold text-cyan-700">
                          {it.quantity.toFixed(it.quantity % 1 === 0 ? 0 : 2)} <span className="text-xs text-slate-500 font-normal">{it.product.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewTransfer.notes && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <div className="text-xs font-bold text-amber-800 uppercase mb-1">Notes</div>
                  <div className="text-sm text-amber-900">{viewTransfer.notes}</div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              {viewTransfer.status === 'IN_TRANSIT' && (
                <>
                  <button
                    onClick={() => {
                      if (confirm('Cancel this transfer? Stock will be returned to source.')) {
                        cancelMutation.mutate(viewTransfer.id);
                      }
                    }}
                    disabled={cancelMutation.isPending}
                    className="h-10 px-4 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 text-sm font-bold disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4 inline mr-1" /> Cancel
                  </button>
                  <Button
                    onClick={() => receiveMutation.mutate(viewTransfer.id)}
                    loading={receiveMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm Receive
                  </Button>
                </>
              )}
              {viewTransfer.status !== 'IN_TRANSIT' && (
                <button onClick={() => setViewTransfer(null)} className="h-10 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-sm font-bold text-slate-700">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN PAGE */}
      <div className="space-y-6">
        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-cyan-700 text-white p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-300" /> Multi-Shop Inventory
              </div>
              <h2 className="mt-3 text-3xl font-extrabold">Stock Transfers</h2>
              <p className="mt-2 text-sm text-white/80">
                Ek shop se doosri shop me stock transfer karein — carpet rolls bhi shop-to-shop move ho sakte hain.
              </p>
            </div>
            <Button onClick={openCreate} className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="h-4 w-4" /> New Transfer
            </Button>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} icon={ArrowLeftRight} color="cyan" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} color="amber" />
          <StatCard label="In Transit" value={stats.inTransit} icon={Truck} color="blue" />
          <StatCard label="Received" value={stats.received} icon={CheckCircle2} color="emerald" />
        </section>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500"
                placeholder="Search transfer #, shop name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            {filtered.length > 0 && (
              <button onClick={exportCSV} className="h-11 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
                <Download className="h-4 w-4" /> Export
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => setStatusFilter('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All</button>
            {(Object.entries(statusConfig) as [TransferStatus, any][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setStatusFilter(key)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 ${statusFilter === key ? cfg.tone + ' border shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                <cfg.icon className="h-3 w-3" /> {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">All Transfers</h3>
            <p className="text-sm text-slate-500">{filtered.length} of {transfers.length} transfers</p>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-100 to-cyan-200 flex items-center justify-center">
                <ArrowLeftRight className="h-9 w-9 text-cyan-600" />
              </div>
              <h4 className="mt-5 text-xl font-bold text-slate-900">
                {search || statusFilter !== 'all' ? 'No matches' : 'No transfers yet'}
              </h4>
              <p className="text-sm text-slate-500 mt-2">
                {search || statusFilter !== 'all' ? 'Try different filter' : 'Click "New Transfer" to create first one'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button onClick={openCreate} className="mt-4 bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4" /> Create First Transfer
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((t) => {
                const cfg = statusConfig[t.status];
                const Icon = cfg?.icon || Clock;
                const carpetRollCount = t.items.filter((i) => i.carpetRollId).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => setViewTransfer(t)}
                    className="w-full text-left px-6 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 text-white flex items-center justify-center shadow shrink-0">
                          <ArrowLeftRight className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 font-mono">{t.transferNumber}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg?.tone}`}>
                              <Icon className="h-2.5 w-2.5" /> {cfg?.label}
                            </span>
                            {carpetRollCount > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                                <Layers className="h-2.5 w-2.5" /> {carpetRollCount} rolls
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Building2 className="h-3 w-3" /> {t.fromShop?.name || '—'}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="inline-flex items-center gap-1 font-semibold">
                              <Building2 className="h-3 w-3" /> {t.toShop?.name || '—'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-0.5">
                              <Package className="h-2.5 w-2.5" /> {t.items?.length || 0} items
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" /> {formatDate(t.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-slate-400 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    cyan: 'from-cyan-500 to-cyan-700 shadow-cyan-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{value}</div>
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
