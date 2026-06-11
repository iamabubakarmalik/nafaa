import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, ShoppingCart, Trash2, Plus, Minus, Receipt, ScanLine, Camera,
  Package, User, CreditCard, Banknote, Smartphone, Building2, X,
  CheckCircle2, AlertCircle, Sparkles, Wallet, Zap, BookOpen,
  TrendingUp, TrendingDown, Calendar, Phone, Star, History,
  HandCoins, ArrowDownCircle, ArrowUpCircle, Info,
} from 'lucide-react';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod } from '@/api/sales.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';

type CartItem = {
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  unit: string;
  category?: { name: string; color: string } | null;
};

type SaleMode = 'FULL_PAYMENT' | 'PARTIAL_CREDIT' | 'FULL_CREDIT';

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: any; color: string; bg: string }> = {
  CASH: { label: 'Cash', icon: Banknote, color: '#16a34a', bg: 'bg-emerald-50 border-emerald-300' },
  CARD: { label: 'Card', icon: CreditCard, color: '#2563eb', bg: 'bg-blue-50 border-blue-300' },
  JAZZCASH: { label: 'JazzCash', icon: Smartphone, color: '#f97316', bg: 'bg-orange-50 border-orange-300' },
  EASYPAISA: { label: 'EasyPaisa', icon: Zap, color: '#22c55e', bg: 'bg-green-50 border-green-300' },
  BANK_TRANSFER: { label: 'Bank', icon: Building2, color: '#7c3aed', bg: 'bg-violet-50 border-violet-300' },
};

export default function PosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [saleMode, setSaleMode] = useState<SaleMode>('FULL_PAYMENT');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-pos'],
    queryFn: () => productsApi.list({ page: 1, limit: 100 }),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ page: 1, limit: 200 }),
  });

  // Customer detail query (for full credit summary)
  const { data: customerDetail } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customersApi.get(customerId),
    enabled: !!customerId,
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

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q),
    );
  }, [customers, customerSearch]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const total = subtotal;

  // Sale mode logic — auto-calculate paid amount based on mode
  const effectivePaid = useMemo(() => {
    if (saleMode === 'FULL_PAYMENT') return total;
    if (saleMode === 'FULL_CREDIT') return 0;
    return Number(paidAmount || 0); // PARTIAL_CREDIT
  }, [saleMode, total, paidAmount]);

  const change = Math.max(effectivePaid - total, 0);
  const credit = Math.max(total - effectivePaid, 0);
  const isCreditSale = credit > 0;

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Customer credit summary calculations
  const customerCreditSummary = useMemo(() => {
    if (!customerDetail) return null;
    const sales = (customerDetail as any).sales || [];
    const today = new Date().toDateString();

    const todaySales = sales.filter((s: any) => new Date(s.createdAt).toDateString() === today);
    const todayCredit = todaySales.reduce((sum: number, s: any) => sum + (s.creditAmount || 0), 0);
    const todayPaid = todaySales.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0);
    const todayTotal = todaySales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    return {
      currentBalance: customerDetail.balance || 0,
      todaySalesCount: todaySales.length,
      todayCredit,
      todayPaid,
      todayTotal,
      totalSales: sales.length,
      lastSaleDate: sales[0]?.createdAt,
    };
  }, [customerDetail]);

  const checkoutMutation = useMutation({
    mutationFn: salesApi.create,
    onSuccess: (sale) => {
      const msg = isCreditSale
        ? `Sale + ${formatPKR(credit)} udhaar khata mein add ho gaya ✅`
        : `Sale complete! • ${sale.saleNumber}`;
      toast.success(msg, {
        description: `Total: ${formatPKR(total)}`,
      });
      setCart([]);
      setCustomerId('');
      setPaymentMethod('CASH');
      setPaidAmount('');
      setSaleMode('FULL_PAYMENT');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-pos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
      barcodeRef.current?.focus();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Checkout fail ho gaya');
    },
  });

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
          category: product.category,
        },
      ];
    });
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    try {
      const product = await productsApi.byBarcode(code.trim());
      addToCart(product);
      toast.success(`${product.name} added`);
    } catch {
      toast.error(`Barcode "${code}" se koi product nahi mila`);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleBarcodeScan(barcodeInput.trim());
    setBarcodeInput('');
  };

  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Auto-switch sale mode based on customer selection
  useEffect(() => {
    if (!customerId && (saleMode === 'PARTIAL_CREDIT' || saleMode === 'FULL_CREDIT')) {
      setSaleMode('FULL_PAYMENT');
      setPaidAmount('');
    }
  }, [customerId]);

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
    if (isCreditSale && !customerId) {
      toast.error('Udhaar/Khata ke liye customer select karna zaroori hai');
      return;
    }
    if (saleMode === 'PARTIAL_CREDIT' && effectivePaid >= total) {
      toast.error('Partial mein paid amount total se kam honi chahiye');
      return;
    }
    checkoutMutation.mutate({
      customerId: customerId || undefined,
      paymentMethod,
      paidAmount: effectivePaid,
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  };

  const quickAmounts = useMemo(() => {
    const amts = new Set([total, 500, 1000, 2000, 5000, 10000].filter((n) => n > 0 && n < total));
    return Array.from(amts).slice(0, 4);
  }, [total]);

  const formatRelative = (date?: string) => {
    if (!date) return 'Never';
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'Abhi';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-PK');
  };

  return (
    <>
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div className="grid xl:grid-cols-[1.5fr_460px] gap-6">
        {/* ============== PRODUCTS SIDE ============== */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <ShoppingCart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">POS Counter</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Fast billing for Pakistani shops
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-[320px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
                  placeholder="Search by name, SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Barcode Input */}
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine className="h-5 w-5 text-brand-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={barcodeRef}
                  className="h-12 w-full rounded-2xl border-2 border-brand-300 bg-gradient-to-br from-brand-50 to-white pl-11 pr-4 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition placeholder:text-brand-400/70"
                  placeholder="Barcode scan ya likhein..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" size="lg" className="px-5">
                Add
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => setScannerOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 px-5"
              >
                <Camera className="h-4 w-4" />
                Camera
              </Button>
            </form>
          </div>

          {/* Products Grid */}
          {productsLoading ? (
            <div className="p-6 grid sm:grid-cols-2 2xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6">
              <div className="h-20 w-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Package className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900">Koi product nahi mila</h3>
              <p className="mt-1 text-sm text-slate-500 text-center max-w-xs">
                {search ? `"${search}" se match nahi hua` : 'Pehle products add karein'}
              </p>
            </div>
          ) : (
            <div
              className="p-6 grid sm:grid-cols-2 2xl:grid-cols-3 gap-3 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 320px)' }}
            >
              {filteredProducts.map((product) => {
                const inCart = cart.find((c) => c.productId === product.id);
                const outOfStock = product.stock <= 0;
                const lowStock = product.stock > 0 && product.stock <= 5;

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`group relative text-left rounded-2xl border-2 transition-all p-4 ${
                      outOfStock
                        ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                        : inCart
                        ? 'border-brand-500 bg-gradient-to-br from-brand-50 to-white shadow-md shadow-brand-500/20'
                        : 'border-slate-200 bg-white hover:border-brand-400 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-brand-500/40 ring-4 ring-white">
                        {inCart.quantity}
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                        <Package className="h-5 w-5 text-brand-700" />
                      </div>
                      {outOfStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                          OUT
                        </span>
                      ) : lowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          LOW
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3">
                      <div className="font-bold text-slate-900 text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 truncate font-mono">
                        {product.sku || product.barcode || 'No SKU'}
                      </div>
                    </div>

                    {product.category && (
                      <span
                        className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                        style={{ backgroundColor: product.category.color }}
                      >
                        {product.category.name}
                      </span>
                    )}

                    <div className="mt-3 flex items-end justify-between">
                      <div className="text-lg font-bold text-slate-900">{formatPKR(product.price)}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {product.stock} {product.unit}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ============== CART SIDE ============== */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Cart Header */}
          <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-950 to-brand-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Receipt className="h-3 w-3" />
                  Cart
                </div>
                <h3 className="mt-2 text-2xl font-bold">{totalItems} items</h3>
                <p className="text-xs text-white/70 mt-0.5">{cart.length} unique products</p>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* ============== CUSTOMER SELECTION + CREDIT SUMMARY ============== */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Customer / Khata
              </label>

              <div className="relative">
                <User className="h-4 w-4 text-violet-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none"
                >
                  <option value="">🚶 Walk-in Customer (No Tracking)</option>
                  {filteredCustomers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone ? ` • ${customer.phone}` : ''}
                      {customer.balance > 0 ? ` • Udhaar: ${formatPKR(customer.balance)}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* === BEAUTIFUL CUSTOMER CREDIT SUMMARY === */}
              {selectedCustomer && customerCreditSummary && (
                <div className="rounded-2xl bg-gradient-to-br from-violet-50 via-white to-amber-50 border-2 border-violet-200 overflow-hidden">
                  {/* Customer header */}
                  <div className="p-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate text-sm">{selectedCustomer.name}</div>
                        {selectedCustomer.phone && (
                          <div className="text-[10px] text-white/80 flex items-center gap-1">
                            <Phone className="h-2.5 w-2.5" />
                            {selectedCustomer.phone}
                          </div>
                        )}
                      </div>
                      {customerCreditSummary.currentBalance > 0 && (
                        <div className="text-right">
                          <div className="text-[9px] text-white/70 font-semibold uppercase">Total Udhaar</div>
                          <div className="text-base font-extrabold text-amber-300">
                            {formatPKR(customerCreditSummary.currentBalance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Today's stats */}
                  <div className="grid grid-cols-3 divide-x divide-violet-100">
                    <div className="p-2.5 text-center">
                      <div className="text-[9px] text-slate-500 font-bold uppercase">Aaj Sales</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {customerCreditSummary.todaySalesCount}
                      </div>
                    </div>
                    <div className="p-2.5 text-center bg-emerald-50/40">
                      <div className="text-[9px] text-emerald-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowDownCircle className="h-2.5 w-2.5" />
                        Aaj Paid
                      </div>
                      <div className="text-xs font-extrabold text-emerald-700 mt-0.5">
                        {formatPKR(customerCreditSummary.todayPaid)}
                      </div>
                    </div>
                    <div className="p-2.5 text-center bg-amber-50/40">
                      <div className="text-[9px] text-amber-700 font-bold uppercase flex items-center justify-center gap-0.5">
                        <ArrowUpCircle className="h-2.5 w-2.5" />
                        Aaj Udhaar
                      </div>
                      <div className="text-xs font-extrabold text-amber-700 mt-0.5">
                        {formatPKR(customerCreditSummary.todayCredit)}
                      </div>
                    </div>
                  </div>

                  {/* Footer with last visit */}
                  <div className="px-3 py-2 bg-white/60 border-t border-violet-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <History className="h-2.5 w-2.5" />
                      Last visit: <span className="font-bold text-slate-700">{formatRelative(customerCreditSummary.lastSaleDate)}</span>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Star className="h-2.5 w-2.5 text-amber-500" />
                      <span className="font-bold text-slate-700">{customerCreditSummary.totalSales}</span> sales
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items */}
            <div className="p-4 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center">
                    <ShoppingCart className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-3 font-bold text-slate-700">Cart khaali hai</p>
                  <p className="text-xs text-slate-500 mt-1">Products select karein ya barcode scan karein</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-slate-200 bg-white p-3 hover:border-brand-300 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-sm line-clamp-1">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {formatPKR(item.price)} × {item.quantity} {item.unit}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-rose-600 hover:bg-rose-50 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="inline-flex items-center gap-1 bg-slate-50 rounded-xl p-1">
                        <button
                          onClick={() => decreaseQty(item.productId)}
                          className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => increaseQty(item.productId)}
                          disabled={item.quantity >= item.stock}
                          className="h-7 w-7 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white flex items-center justify-center transition"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 text-base">
                        {formatPKR(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ============== BOTTOM: PAYMENT + SALE MODE ============== */}
          {cart.length > 0 && (
            <div className="border-t border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 space-y-3">
              {/* === SALE MODE TOGGLE (CASH / PARTIAL / FULL UDHAAR) === */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" />
                  Sale Mode
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setSaleMode('FULL_PAYMENT');
                      setPaidAmount('');
                    }}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition ${
                      saleMode === 'FULL_PAYMENT'
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <Banknote className={`h-4 w-4 ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${saleMode === 'FULL_PAYMENT' ? 'text-emerald-700' : 'text-slate-500'}`}>
                      Full Cash
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!customerId) {
                        toast.error('Pehle customer select karein');
                        return;
                      }
                      setSaleMode('PARTIAL_CREDIT');
                      setPaidAmount(String(Math.floor(total / 2)));
                    }}
                    disabled={!customerId}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition ${
                      saleMode === 'PARTIAL_CREDIT'
                        ? 'border-amber-500 bg-amber-50 shadow-sm'
                        : !customerId
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <HandCoins className={`h-4 w-4 ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${saleMode === 'PARTIAL_CREDIT' ? 'text-amber-700' : 'text-slate-500'}`}>
                      Partial
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (!customerId) {
                        toast.error('Pehle customer select karein');
                        return;
                      }
                      setSaleMode('FULL_CREDIT');
                      setPaidAmount('0');
                    }}
                    disabled={!customerId}
                    className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border-2 transition ${
                      saleMode === 'FULL_CREDIT'
                        ? 'border-rose-500 bg-rose-50 shadow-sm'
                        : !customerId
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <BookOpen className={`h-4 w-4 ${saleMode === 'FULL_CREDIT' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-bold ${saleMode === 'FULL_CREDIT' ? 'text-rose-700' : 'text-slate-500'}`}>
                      Full Udhaar
                    </span>
                  </button>
                </div>
                {!customerId && (saleMode === 'FULL_PAYMENT') && (
                  <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Udhaar/Khata ke liye customer select karein
                  </p>
                )}
              </div>

              {/* Payment Method (only for non-full-credit) */}
              {saleMode !== 'FULL_CREDIT' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(Object.keys(paymentMethodConfig) as PaymentMethod[]).map((m) => {
                      const cfg = paymentMethodConfig[m];
                      const Icon = cfg.icon;
                      const active = paymentMethod === m;
                      return (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition ${
                            active
                              ? `${cfg.bg} shadow-sm`
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" style={{ color: active ? cfg.color : '#94a3b8' }} />
                          <span className={`text-[10px] font-bold ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                            {cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Paid Amount (only in PARTIAL_CREDIT mode) */}
              {saleMode === 'PARTIAL_CREDIT' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Paid Amount (Rest goes to Khata)
                    </label>
                  </div>
                  <div className="relative">
                    <Wallet className="h-4 w-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0"
                      max={total - 1}
                      className="h-12 w-full rounded-xl border-2 border-amber-300 bg-amber-50 pl-9 pr-4 text-base font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    />
                  </div>
                  {quickAmounts.length > 0 && (
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {quickAmounts.map((amt, idx) => (
                        <button
                          key={`${idx}-${amt}`}
                          onClick={() => setPaidAmount(String(amt))}
                          className="py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-[10px] font-bold text-amber-800 transition"
                        >
                          {formatPKR(amt)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* === BIG TOTALS SUMMARY === */}
              <div className={`rounded-2xl p-4 space-y-2 text-white ${
                saleMode === 'FULL_CREDIT'
                  ? 'bg-gradient-to-br from-rose-700 to-rose-900'
                  : saleMode === 'PARTIAL_CREDIT'
                  ? 'bg-gradient-to-br from-amber-700 to-orange-900'
                  : 'bg-gradient-to-br from-slate-950 to-brand-900'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70">Subtotal</span>
                  <span className="font-semibold">{formatPKR(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-base font-bold">Total</span>
                  <span className="text-2xl font-extrabold">{formatPKR(total)}</span>
                </div>

                {saleMode !== 'FULL_CREDIT' && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <ArrowDownCircle className="h-3 w-3" />
                      Paid Now
                    </span>
                    <span className="font-bold text-emerald-300">{formatPKR(effectivePaid)}</span>
                  </div>
                )}

                {change > 0 && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      Change Wapis
                    </span>
                    <span className="font-bold text-emerald-300">{formatPKR(change)}</span>
                  </div>
                )}

                {credit > 0 && (
                  <div className="flex items-center justify-between text-base pt-2 border-t border-white/20 bg-white/5 -mx-4 -mb-4 px-4 py-3">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      Khata mein Add
                    </span>
                    <span className="font-extrabold text-amber-300 text-xl">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              {/* Future balance projection */}
              {credit > 0 && customerCreditSummary && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <p className="text-xs text-rose-800 font-semibold">
                    Sale ke baad <span className="font-extrabold">{selectedCustomer?.name}</span> ka total udhaar:{' '}
                    <span className="font-extrabold">
                      {formatPKR(customerCreditSummary.currentBalance + credit)}
                    </span>
                  </p>
                </div>
              )}

              {credit > 0 && !customerId && (
                <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-amber-900 font-bold">Customer required for credit</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      Udhaar track karne ke liye customer select karein
                    </p>
                  </div>
                </div>
              )}

              <Button
                className={`w-full ${
                  saleMode === 'FULL_CREDIT'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : saleMode === 'PARTIAL_CREDIT'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : ''
                }`}
                size="lg"
                onClick={handleCheckout}
                loading={checkoutMutation.isPending}
                disabled={isCreditSale && !customerId}
              >
                <CheckCircle2 className="h-5 w-5" />
                {saleMode === 'FULL_CREDIT'
                  ? `Add to Khata • ${formatPKR(total)}`
                  : saleMode === 'PARTIAL_CREDIT'
                  ? `Confirm Sale (${formatPKR(credit)} udhaar)`
                  : `Complete Sale • ${formatPKR(total)}`}
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}