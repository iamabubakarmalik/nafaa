import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Receipt,
  ScanLine,
  Camera,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  unit: string;
};

export default function PosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 100 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 100 }),
  });

  const checkoutMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      toast.success(`Sale complete ho gayi • ${sale.saleNumber}`);
      setCart([]);
      setCustomerId('');
      setPaymentMethod('CASH');
      setPaidAmount('');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      barcodeRef.current?.focus();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Checkout fail ho gaya');
    },
  });

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q),
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const total = subtotal;
  const paid = Number(paidAmount || 0);
  const change = Math.max(paid - total, 0);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error(`${product.name} stock mein nahi hai`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error('Available stock se zyada add nahi kar sakte');
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          quantity: 1,
          unit: product.unit,
        },
      ];
    });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;

    try {
      const product = await productsApi.findByBarcode(code.trim());
      addToCart(product);
      toast.success(`${product.name} added`);
    } catch (err: any) {
      toast.error(`Barcode "${code}" se koi product nahi mila`);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScan(barcodeInput.trim());
    setBarcodeInput('');
  };

  // Auto-focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  const increaseQty = (productId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? item.quantity < item.stock
            ? { ...item, quantity: item.quantity + 1 }
            : item
          : item,
      ),
    );
  };

  const decreaseQty = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart khaali hai');
      return;
    }

    if (paid < total) {
      toast.error('Paid amount kam hai');
      return;
    }

    checkoutMutation.mutate({
      customerId: customerId || undefined,
      paymentMethod,
      paidAmount: paid,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div className="grid xl:grid-cols-[1.2fr_420px] gap-6">
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">POS Counter</h2>
                <p className="text-sm text-slate-500">Fast billing for Pakistani shops</p>
              </div>

              <div className="relative w-full sm:w-[320px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Search product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="h-4 w-4 text-brand-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeRef}
                  className="h-12 w-full rounded-xl border-2 border-brand-200 bg-brand-50/50 pl-10 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  placeholder="Barcode scan karein ya likhein..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="lg">
                Add
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => setScannerOpen(true)}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Camera className="h-4 w-4" />
                Camera
              </Button>
            </form>
          </div>

          {productsLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading products...</div>
          ) : (
            <div className="p-6 grid sm:grid-cols-2 2xl:grid-cols-3 gap-4 max-h-[calc(100vh-380px)] overflow-y-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="text-left rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-soft hover:border-brand-300 transition p-4 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">{product.name}</div>
                      <div className="text-xs text-slate-500 mt-1 truncate">
                        {product.sku || product.barcode || 'No SKU'}
                      </div>
                      {product.category && (
                        <span
                          className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                          style={{ backgroundColor: product.category.color }}
                        >
                          {product.category.name}
                        </span>
                      )}
                    </div>
                    <div className="rounded-xl bg-brand-100 text-brand-700 h-9 w-9 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition">
                      <ShoppingCart className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-lg font-bold text-slate-900">{formatPKR(product.price)}</div>
                    <div className="text-xs text-slate-500">
                      Stock: <span className="font-medium">{product.stock}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Cart</h3>
              <p className="text-sm text-slate-500">{cart.length} items</p>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
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

            <div className="space-y-3 max-h-[280px] overflow-auto pr-1">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-500">
                  Cart abhi khaali hai
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.productId} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(item.price)} × {item.quantity}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-600 hover:bg-red-50 rounded-lg p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => decreaseQty(item.productId)}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => increaseQty(item.productId)}
                          className="h-8 w-8 rounded-lg border border-slate-200 flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="font-semibold text-slate-900">
                        {formatPKR(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">{formatPKR(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">{formatPKR(total)}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Paid Amount</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Change</span>
                <span className="font-medium text-emerald-700">{formatPKR(change)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                loading={checkoutMutation.isPending}
              >
                Complete Sale
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
