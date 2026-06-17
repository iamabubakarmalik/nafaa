import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Truck, Plus, Trash2, Minus, Receipt, Wallet, CalendarDays,
  TrendingUp, Search, X, Package, Building2, Download, Calendar,
  Banknote, CreditCard, Smartphone, Building, Zap, Layers, AlertTriangle,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { productsApi } from '@/api/products.api';
import { purchasesApi, type PurchaseRollPayload } from '@/api/purchases.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';
import {
  PurchaseRollsInput,
  rollsToPayload,
  calculateRollsTotal,
  type PurchaseRoll,
} from '@/features/industries/carpet/components/PurchaseRollsInput';

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd']);

type CartLine = {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
  costPrice: number;
  isCarpet: boolean;
  rolls: PurchaseRoll[];
  expanded: boolean;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatQty = (q: number) => q.toFixed(q % 1 === 0 ? 0 : 2);

const paymentIcons: any = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building,
};

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [historySearch, setHistorySearch] = useState('');

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers-for-purchase'],
    queryFn: () => suppliersApi.list({ page: 1, limit: 200 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-purchase'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ['purchases-list'],
    queryFn: purchasesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['purchases-summary'],
    queryFn: purchasesApi.summary,
  });

  const suppliers = suppliersData?.items ?? [];
  const products = productsData?.items ?? [];

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [products, productSearch]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const isSelectedCarpet = selectedProduct ? CARPET_UNITS.has(selectedProduct.unit) : false;

  const filteredPurchases = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter((p: any) =>
      p.purchaseNumber.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q)
    );
  }, [purchases, historySearch]);

  const subtotal = useMemo(() => cart.reduce((sum, l) => sum + l.quantity * l.costPrice, 0), [cart]);
  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);

  // Validate cart — check carpet rolls
  const cartValidation = useMemo(() => {
    const issues: string[] = [];
    cart.forEach((line) => {
      if (line.isCarpet) {
        if (line.rolls.length === 0) {
          issues.push(`${line.name}: Kam se kam 1 roll add karein`);
          return;
        }
        // Check each roll has valid dimensions
        const invalidRolls = line.rolls.filter(
          (r) => Number(r.widthFt) <= 0 || Number(r.lengthFt) <= 0,
        );
        if (invalidRolls.length > 0) {
          issues.push(`${line.name}: ${invalidRolls.length} rolls mein dimensions missing`);
        }
      }
    });
    return { valid: issues.length === 0, issues };
  }, [cart]);

  const createMutation = useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: (data: any) => {
      const rollCount = Object.values(data.createdRollsByItem || {}).flat().length;
      toast.success('Purchase saved', {
        description: rollCount > 0
          ? `Stock updated + ${rollCount} carpet rolls created`
          : 'Stock automatically update ho gaya',
      });
      setCart([]);
      setSelectedProductId('');
      setProductSearch('');
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
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-summary'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Purchase fail'),
  });

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return toast.error('Product select karein');
    const isCarpet = CARPET_UNITS.has(product.unit);

    const quantity = Number(qty || 0);
    const costPrice = Number(cost || 0);

    // For carpet: only cost is required (qty comes from rolls)
    if (isCarpet) {
      if (costPrice <= 0) return toast.error('Cost price required (per sqft)');
    } else {
      if (quantity <= 0) return toast.error('Quantity required');
      if (costPrice <= 0) return toast.error('Cost price required');
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        // For carpet: don't merge, each entry is unique
        if (isCarpet) {
          toast.error('Carpet product already added — uske rolls update karein');
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id
            ? { ...l, quantity: l.quantity + quantity, costPrice }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          // For carpet: quantity = 0 initially, will auto-update from rolls
          quantity: isCarpet ? 0 : quantity,
          costPrice,
          isCarpet,
          rolls: [],
          expanded: isCarpet, // auto-expand for carpet
        },
      ];
    });

    setSelectedProductId('');
    setProductSearch('');
    setQty('1');
    setCost('');
    toast.success(`${product.name} added${isCarpet ? ' — neeche rolls add karein' : ''}`);
  };

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId));

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const updated = { ...l, ...patch };
        // Auto-sync quantity from rolls for carpet products
        if (updated.isCarpet && patch.rolls !== undefined) {
          const totalSqft = calculateRollsTotal(patch.rolls);
          updated.quantity = Number(totalSqft.toFixed(2));
        }
        return updated;
      }),
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.productId === productId
            ? { ...l, quantity: Math.max(0.01, l.quantity + delta) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const handleSave = () => {
    if (!supplierId) return toast.error('Supplier select karein');
    if (cart.length === 0) return toast.error('Items add karein');

    if (!cartValidation.valid) {
      toast.error(cartValidation.issues[0]);
      return;
    }

    createMutation.mutate({
      supplierId,
      shopId: currentShopId ?? undefined,
      paymentMethod,
      discount: discountValue,
      paidAmount: Number(paidAmount || total),
      notes: notes.trim() || undefined,
      items: cart.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        costPrice: l.costPrice,
        rolls: l.isCarpet ? rollsToPayload(l.rolls) : undefined,
      })),
    });
  };

  const exportCSV = () => {
    if (filteredPurchases.length === 0) return toast.error('No data');
    const headers = ['Purchase #', 'Supplier', 'Items', 'Total', 'Payment', 'Status', 'Date'];
    const rows = filteredPurchases.map((p: any) => [
      p.purchaseNumber, p.supplier?.name || '', p.items?.length || 0,
      p.total.toFixed(2), p.paymentMethod, p.status,
      new Date(p.purchasedAt).toLocaleString('en-PK'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-orange-700 text-white p-6 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Truck className="h-3.5 w-3.5 text-amber-300" /> Stock IN
          </div>
          <h2 className="mt-3 text-3xl font-extrabold">Purchases</h2>
          <p className="mt-2 text-sm text-white/80">
            Suppliers se maal kharido — stock automatic increase, supplier ledger auto-update.
            Carpet products mein roll-by-roll entry support hai.
          </p>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Aaj ki Purchases" value={formatPKR(summary?.todayPurchases ?? 0)} icon={TrendingUp} color="orange" hint="Today" isText />
        <StatCard label="Aaj ke Orders" value={summary?.todayCount ?? 0} icon={Receipt} color="blue" hint="Order count" />
        <StatCard label="Is Mahine" value={formatPKR(summary?.monthPurchases ?? 0)} icon={CalendarDays} color="violet" hint="Monthly" isText />
        <StatCard label="Total Purchases" value={formatPKR(summary?.totalPurchases ?? 0)} icon={Wallet} color="amber" hint="Lifetime" isText />
      </section>

      <section className="grid xl:grid-cols-[1.2fr_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center shadow">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">New Purchase</h3>
              <p className="text-sm text-slate-500">Supplier select karke products add karein</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.contactPerson ? ` (${s.contactPerson})` : ''}</option>
                ))}
              </select>
              {suppliers.length === 0 && (
                <Link to="/suppliers/new" className="text-xs text-orange-700 font-bold hover:underline mt-1 inline-block">
                  + Pehle supplier add karein
                </Link>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30"
              >
                <option value="CASH">💵 Cash</option>
                <option value="JAZZCASH">📱 JazzCash</option>
                <option value="EASYPAISA">⚡ EasyPaisa</option>
                <option value="CARD">💳 Card</option>
                <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/30 p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Add Product</label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setSelectedProductId(''); }}
                  placeholder="Search product..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                {productSearch && (
                  <button onClick={() => { setProductSearch(''); setSelectedProductId(''); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                <div className="mt-2 max-h-[180px] overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredProducts.map((p) => {
                    const isCarpet = CARPET_UNITS.has(p.unit);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedProductId(p.id); setProductSearch(p.name); setCost(String(p.costPrice || '')); }}
                        className="w-full px-3 py-2 text-left hover:bg-orange-50 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-sm text-slate-900 truncate flex-1">{p.name}</div>
                          {isCarpet && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                              <Layers className="h-2.5 w-2.5" /> CARPET
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Stock: <span className="font-bold text-emerald-700">{formatQty(p.stock)} {p.unit}</span>
                          {p.costPrice > 0 && <> • Cost: <span className="font-bold">{formatPKR(p.costPrice)}</span></>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedProduct && (
              <>
                <div className="rounded-xl bg-white border border-orange-200 p-3">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-sm text-slate-900 flex-1">{selectedProduct.name}</div>
                    {isSelectedCarpet && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                        <Layers className="h-2.5 w-2.5" /> CARPET
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Current stock: <span className="font-bold text-emerald-700">{formatQty(selectedProduct.stock)} {selectedProduct.unit}</span>
                  </div>
                  {isSelectedCarpet && (
                    <div className="mt-2 text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                      💡 Carpet add karne ke baad neeche roll-by-roll details enter karein
                    </div>
                  )}
                </div>
                {isSelectedCarpet ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Default Cost / sqft (PKR) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        placeholder="72"
                        className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50/50 px-3 text-sm font-bold"
                      />
                      <div className="text-[9px] text-emerald-700 font-bold mt-0.5">
                        Rolls mein override kar saktay hain
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addToCart} variant="secondary" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Plus className="h-4 w-4" /> Add & Enter Rolls
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">
                        Qty * ({selectedProduct.unit})
                      </label>
                      <input type="number" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Cost (PKR) *</label>
                      <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold" />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addToCart} variant="secondary" className="w-full">
                        <Plus className="h-4 w-4" /> Add
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-700">Cart empty</div>
                <div className="text-xs text-slate-500 mt-1">Upar se products add karein</div>
              </div>
            ) : (
              cart.map((line) => (
                <div key={line.productId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-slate-900 truncate">{line.name}</div>
                          {line.isCarpet && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-700">
                              <Layers className="h-2.5 w-2.5" /> CARPET
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatPKR(line.costPrice)} × {formatQty(line.quantity)} {line.unit}
                        </div>
                        {line.isCarpet && line.rolls.length > 0 && (
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            {line.rolls.length} roll{line.rolls.length !== 1 ? 's' : ''} • {calculateRollsTotal(line.rolls).toFixed(2)} sqft
                          </div>
                        )}
                      </div>
                      <div className="font-extrabold text-orange-700 shrink-0">
                        {formatPKR(line.costPrice * line.quantity)}
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      {line.isCarpet ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
                          <Layers className="h-3 w-3 text-emerald-700" />
                          <span className="text-[10px] font-bold text-emerald-800">
                            Auto: {formatQty(line.quantity)} {line.unit} from rolls
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 rounded-lg p-1">
                          <button onClick={() => updateQty(line.productId, -1)} className="h-7 w-7 rounded-md bg-white border border-slate-200 flex items-center justify-center">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-12 text-center font-bold text-sm">{formatQty(line.quantity)}</span>
                          <button onClick={() => updateQty(line.productId, 1)} className="h-7 w-7 rounded-md bg-orange-600 text-white flex items-center justify-center">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        {line.isCarpet && (
                          <button
                            onClick={() => updateLine(line.productId, { expanded: !line.expanded })}
                            className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold"
                          >
                            <Layers className="h-3 w-3" />
                            {line.rolls.length > 0 ? `${line.rolls.length} rolls` : 'Add rolls'}
                            {line.expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                        <button onClick={() => removeLine(line.productId)} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Carpet rolls expanded section */}
                  {line.isCarpet && line.expanded && (
                    <div className="border-t border-slate-200 p-3">
                      <PurchaseRollsInput
                        productId={line.productId}
                        productName={line.name}
                        defaultCostPerSqft={line.costPrice}
                        rolls={line.rolls}
                        onChange={(rolls) => updateLine(line.productId, { rolls })}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {!cartValidation.valid && cart.length > 0 && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-900">
                <AlertTriangle className="h-4 w-4" /> Cart mein issues hain
              </div>
              {cartValidation.issues.map((issue, i) => (
                <div key={i} className="text-xs text-rose-800 font-semibold">• {issue}</div>
              ))}
            </div>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Discount (PKR)" type="number" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <Input label="Paid Amount" type="number" placeholder={String(total)} value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            <Input label="Notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-bold">Subtotal</span>
              <span className="font-bold text-slate-900">{formatPKR(subtotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-700 font-bold">Discount</span>
                <span className="font-bold text-amber-700">-{formatPKR(discountValue)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t-2 border-orange-200">
              <span className="text-lg font-extrabold text-slate-900">Total</span>
              <span className="text-2xl font-extrabold text-orange-700">{formatPKR(total)}</span>
            </div>
          </div>

          <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="lg"
            onClick={handleSave}
            loading={createMutation.isPending}
            disabled={cart.length === 0 || !supplierId || !cartValidation.valid}
          >
            <Plus className="h-4 w-4" />
            Save Purchase • {formatPKR(total)}
          </Button>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recent Purchases</h3>
                <p className="text-sm text-slate-500">{filteredPurchases.length} of {purchases.length}</p>
              </div>
              {filteredPurchases.length > 0 && (
                <button onClick={exportCSV} className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search purchase # or supplier..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <h4 className="text-lg font-bold text-slate-900">{historySearch ? 'No matches' : 'No purchases yet'}</h4>
              <p className="text-xs text-slate-500 mt-1">{historySearch ? 'Different search try karein' : 'First purchase save karte hi yahan dikhega'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
              {filteredPurchases.map((p: any) => {
                const PayIcon = paymentIcons[p.paymentMethod] || CreditCard;
                return (
                  <Link
                    key={p.id}
                    to={`/purchases/${p.id}`}
                    className="block px-6 py-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                          <Truck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 font-mono text-sm">{p.purchaseNumber}</div>
                          <div className="text-xs text-slate-600 inline-flex items-center gap-1 mt-0.5 font-semibold">
                            <Building2 className="h-3 w-3" />
                            {p.supplier?.name || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(p.purchasedAt)}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-0.5">
                              <Package className="h-2.5 w-2.5" />
                              {p.items?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-orange-700">{formatPKR(p.total)}</div>
                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          <PayIcon className="h-2.5 w-2.5" />
                          {p.paymentMethod}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, hint, isText }: any) {
  const colors: any = {
    orange: 'from-orange-500 to-orange-700 shadow-orange-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-xl truncate' : 'text-2xl'}`}>{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
