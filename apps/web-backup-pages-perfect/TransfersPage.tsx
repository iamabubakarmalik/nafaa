import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRightLeft, Plus, Building2, Trash2, Minus,
  CheckCircle2, XCircle, Clock, PackageCheck,
} from 'lucide-react';
import { transfersApi, type TransferStatus } from '@/api/transfers.api';
import { shopsApi } from '@/api/shops.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  stock: number;
  quantity: number;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const statusConfig: Record<TransferStatus, { label: string; tone: string; icon: any }> = {
  PENDING: { label: 'Pending', tone: 'bg-slate-100 text-slate-700', icon: Clock },
  IN_TRANSIT: { label: 'In Transit', tone: 'bg-amber-100 text-amber-700', icon: ArrowRightLeft },
  RECEIVED: { label: 'Received', tone: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', tone: 'bg-rose-100 text-rose-700', icon: XCircle },
};

export default function TransfersPage() {
  const queryClient = useQueryClient();
  const [fromShopId, setFromShopId] = useState('');
  const [toShopId, setToShopId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [cart, setCart] = useState<CartLine[]>([]);

  const { data: shops = [] } = useQuery({
    queryKey: ['shops-for-transfer'],
    queryFn: shopsApi.list,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-transfer'],
    queryFn: () => productsApi.list({ page: 1, limit: 200 }),
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers'],
    queryFn: transfersApi.list,
  });

  const createMutation = useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      toast.success('Transfer created — stock dispatched');
      setFromShopId('');
      setToShopId('');
      setNotes('');
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Transfer fail'),
  });

  const receiveMutation = useMutation({
    mutationFn: transfersApi.receive,
    onSuccess: () => {
      toast.success('Transfer received — stock added');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: transfersApi.cancel,
    onSuccess: () => {
      toast.success('Transfer cancelled');
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const products = productsData?.items ?? [];

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return toast.error('Product select karein');
    const quantity = Number(qty || 0);
    if (quantity <= 0) return toast.error('Valid quantity');

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          stock: product.stock,
          quantity,
        },
      ];
    });

    setSelectedProductId('');
    setQty('1');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-cyan-900 to-cyan-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Multi-Shop Inventory
          </div>
          <h2 className="mt-3 text-3xl font-bold">Stock Transfers</h2>
          <p className="mt-2 text-sm text-white/80">
            Ek shop se doosri shop mein stock transfer karein.
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <h3 className="text-xl font-bold text-slate-900">Naya Transfer</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">From Shop</label>
              <select
                value={fromShopId}
                onChange={(e) => setFromShopId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select source...</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">To Shop</label>
              <select
                value={toShopId}
                onChange={(e) => setToShopId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select destination...</option>
                {shops.filter((s) => s.id !== fromShopId).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid sm:grid-cols-[1fr_120px_auto] gap-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
              >
                <option value="">Product select...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock: {p.stock})
                  </option>
                ))}
              </select>
              <Input type="number" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
              <Button onClick={addToCart} variant="secondary">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-auto">
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500">Cart abhi khaali hai</div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{line.name}</div>
                      <div className="text-xs text-slate-500">Available: {line.stock} {line.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((l) =>
                              l.productId === line.productId
                                ? { ...l, quantity: Math.max(1, l.quantity - 1) }
                                : l,
                            ),
                          )
                        }
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-semibold">{line.quantity}</span>
                      <button
                        onClick={() =>
                          setCart((prev) =>
                            prev.map((l) =>
                              l.productId === line.productId
                                ? { ...l, quantity: Math.min(l.stock, l.quantity + 1) }
                                : l,
                            ),
                          )
                        }
                        className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setCart((prev) => prev.filter((l) => l.productId !== line.productId))}
                        className="text-rose-600 hover:bg-rose-50 rounded-lg p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Input
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for transfer"
          />

          <Button
            className="w-full"
            size="lg"
            loading={createMutation.isPending}
            onClick={() => {
              if (!fromShopId || !toShopId) return toast.error('Source aur destination select karein');
              if (cart.length === 0) return toast.error('Kam se kam ek product add karein');
              createMutation.mutate({
                fromShopId,
                toShopId,
                notes: notes.trim() || undefined,
                items: cart.map((l) => ({
                  productId: l.productId,
                  quantity: l.quantity,
                })),
              });
            }}
          >
            <ArrowRightLeft className="h-4 w-4" />
            Create Transfer
          </Button>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Transfer History</h3>
            <p className="text-sm text-slate-500">Last 50 transfers</p>
          </div>

          {transfers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <ArrowRightLeft className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No transfers yet</h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {transfers.map((t) => {
                const cfg = statusConfig[t.status];
                const Icon = cfg.icon;
                return (
                  <div key={t.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{t.transferNumber}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.tone}`}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                        <div className="text-sm text-slate-700 mt-1 flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          <span>{t.fromShop.name}</span>
                          <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                          <span>{t.toShop.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {t.items.length} item(s) • {formatDate(t.createdAt)}
                        </div>
                      </div>

                      {t.status === 'IN_TRANSIT' && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => receiveMutation.mutate(t.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          >
                            <PackageCheck className="h-3 w-3 inline mr-1" />
                            Receive
                          </button>
                          <button
                            onClick={() => cancelMutation.mutate(t.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pl-1 text-xs text-slate-600 space-y-0.5">
                      {t.items.slice(0, 3).map((item) => (
                        <div key={item.id}>
                          • {item.product.name}: {item.quantity} {item.product.unit}
                        </div>
                      ))}
                      {t.items.length > 3 && (
                        <div className="text-slate-500">+ {t.items.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
