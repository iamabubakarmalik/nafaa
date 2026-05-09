import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Truck,
  Plus,
  Trash2,
  Minus,
  Receipt,
  Wallet,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { productsApi } from '@/api/products.api';
import { purchasesApi } from '@/api/purchases.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function PurchasesPage() {
  const queryClient = useQueryClient();

  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-for-purchase'],
    queryFn: () => suppliersApi.list({ page: 1, limit: 100 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: () => productsApi.list({ page: 1, limit: 100 }),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases-list'],
    queryFn: purchasesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: purchasesApi.summary,
  });

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      toast.success('Purchase save ho gayi, stock update ho gaya');
      setCart([]);
      setSelectedProductId('');
      setQty('1');
      setCost('');
      setDiscount('');
      setPaidAmount('');
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['purchases-list'] });
      queryClient.invalidateQueries({ queryKey: ['purchases-summary'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-purchase'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Purchase save nahi hui');
    },
  });

  const suppliers = suppliersData?.items ?? [];
  const products = productsData?.items ?? [];

  const subtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.quantity * l.costPrice, 0),
    [cart],
  );
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) {
      toast.error('Product select karein');
      return;
    }

    const quantity = Number(qty || 0);
    const costPrice = Number(cost || 0);

    if (quantity <= 0) {
      toast.error('Quantity 1 ya zyada honi chahiye');
      return;
    }
    if (costPrice <= 0) {
      toast.error('Cost price likhein');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === product.id
            ? {
                ...l,
                quantity: l.quantity + quantity,
                costPrice,
              }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          quantity,
          costPrice,
        },
      ];
    });

    setSelectedProductId('');
    setQty('1');
    setCost('');
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const decreaseQty = (productId: string) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, quantity: l.quantity - 1 } : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const increaseQty = (productId: string) => {
    setCart((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
  };

  const handleSave = () => {
    if (!supplierId) {
      toast.error('Supplier select karein');
      return;
    }
    if (cart.length === 0) {
      toast.error('Kam se kam ek product add karein');
      return;
    }

    createMutation.mutate({
      supplierId,
      paymentMethod,
      discount: discountValue,
      paidAmount: Number(paidAmount || total),
      notes: notes.trim() || undefined,
      items: cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        costPrice: l.costPrice,
      })),
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Truck className="h-3.5 w-3.5" />
              Stock IN
            </div>
            <h2 className="mt-3 text-3xl font-bold">Purchases</h2>
            <p className="mt-2 text-sm text-white/75">
              Suppliers se maal kharido — stock automatically increase ho jayega.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj ki Purchases</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.todayPurchases ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Aaj Orders</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {summary?.todayCount ?? 0}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Is Mahine</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.monthPurchases ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Total Purchases</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatPKR(summary?.totalPurchases ?? 0)}
              </div>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Naya Purchase</h3>
            <p className="text-sm text-slate-500">Supplier select karke products add karein</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Supplier</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="CASH">Cash</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="EASYPAISA">EasyPaisa</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="grid sm:grid-cols-[1fr_120px_140px_auto] gap-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Product select...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock: {p.stock})
                  </option>
                ))}
              </select>
              <Input
                type="number"
                placeholder="Qty"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <Input
                type="number"
                placeholder="Cost"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
              <Button onClick={addToCart} variant="secondary">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500">Abhi cart khaali hai</div>
              ) : (
                cart.map((line) => (
                  <div key={line.productId} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{line.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(line.costPrice)} × {line.quantity} {line.unit}
                        </div>
                      </div>
                      <div className="font-semibold text-slate-900">
                        {formatPKR(line.costPrice * line.quantity)}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(line.productId)}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{line.quantity}</span>
                        <button
                          onClick={() => increaseQty(line.productId)}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeLine(line.productId)}
                        className="text-red-600 hover:bg-red-50 rounded-lg p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Discount"
              type="number"
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
            <Input
              label="Paid Amount"
              type="number"
              placeholder={String(total)}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
            />
            <Input
              label="Notes"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">{formatPKR(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Discount</span>
              <span className="font-medium text-slate-900">{formatPKR(discountValue)}</span>
            </div>
            <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
              <span className="font-semibold text-slate-900">Total</span>
              <span className="font-bold text-slate-900">{formatPKR(total)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleSave}
            loading={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            Save Purchase
          </Button>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Recent Purchases</h3>
            <p className="text-sm text-slate-500">Latest 50 received purchases</p>
          </div>

          {purchases.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Truck className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi purchase nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Pehla purchase save karte hi yahan nazar aayegi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <div key={p.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900">{p.purchaseNumber}</div>
                      <div className="text-xs text-slate-500">
                        {p.supplier.name} • {formatDate(p.purchasedAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{formatPKR(p.total)}</div>
                      <div className="text-xs text-slate-500">{p.paymentMethod}</div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {p.items.length} item(s) • Status: {p.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
