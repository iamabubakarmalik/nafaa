import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers, Search, X, Plus, Trash2, User, UserPlus,
  Scissors, Package, ArrowLeft, Sparkles, DollarSign,
  CheckCircle2, Ruler, ChevronDown, Camera, ScanLine,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { productsApi, type Product } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { salesApi, type PaymentMethod, type ServiceChargeItem } from '@/api/sales.api';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { CarpetRollPicker } from '@/features/pos/components/CarpetRollPicker';
import { CarpetCutPiecePicker } from '@/features/pos/components/CarpetCutPiecePicker';
import { carpetRollsApi, type CarpetRoll } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi, type CarpetCutPiece } from '../api/carpet-cut-pieces.api';
import { useSharedPosCart, cartLineId } from '@/features/pos/hooks/useSharedPosCart';

export default function CarpetPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [carpetPickerData, setCarpetPickerData] = useState<{ product: Product; preSelectedRoll?: CarpetRoll } | null>(null);
  const [cutPiecePickerData, setCutPiecePickerData] = useState<{ product: Product } | null>(null);
  const [showCustomerAdd, setShowCustomerAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [activeTab, setActiveTab] = useState<'rolls' | 'pieces' | 'accessories'>('rolls');

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    serviceCharges, setServiceCharges,
    subtotal, total, totalItems, effectivePaid, credit, clearCart,
  } = useSharedPosCart();

  const { data: productsData } = useQuery({
    queryKey: ['products-for-carpet-pos', search],
    queryFn: () => productsApi.list({ page: 1, limit: 200, search: search || undefined }),
  });
  const products = productsData?.items ?? [];

  const carpetProducts = useMemo(
    () => products.filter((p) => ['sqft', 'sqm', 'sqyd'].includes(p.unit)),
    [products],
  );
  const nonCarpetProducts = useMemo(
    () => products.filter((p) => !['sqft', 'sqm', 'sqyd'].includes(p.unit)),
    [products],
  );

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const { data: allRollsRaw } = useQuery({
    queryKey: ['carpet-rolls-available'],
    queryFn: () => carpetRollsApi.list({}),
    enabled: activeTab === 'rolls',
  });

  const { data: allCutPiecesRaw } = useQuery({
    queryKey: ['carpet-cut-pieces-available'],
    queryFn: () => carpetCutPiecesApi.list({}),
    enabled: activeTab === 'pieces',
  });

  const allRolls: any[] = Array.isArray(allRollsRaw)
    ? allRollsRaw
    : ((allRollsRaw as any)?.items ?? []);
  const allCutPieces: any[] = Array.isArray(allCutPiecesRaw)
    ? allCutPiecesRaw
    : ((allCutPiecesRaw as any)?.items ?? []);

  const filteredRolls = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allRolls;
    return allRolls.filter((r: any) =>
      r.rollNumber.toLowerCase().includes(q) ||
      r.product?.name.toLowerCase().includes(q) ||
      (r.color || '').toLowerCase().includes(q),
    );
  }, [allRolls, search]);

  const filteredCutPieces = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allCutPieces;
    return allCutPieces.filter((c: any) =>
      c.pieceCode.toLowerCase().includes(q) ||
      c.product?.name.toLowerCase().includes(q),
    );
  }, [allCutPieces, search]);

  const openRollCutFor = (roll: any) => {
    setCarpetPickerData({ product: roll.product, preSelectedRoll: roll });
  };

  const handleCarpetRollConfirm = (data: any) => {
    if (!carpetPickerData) return;
    const { product } = carpetPickerData;
    const { roll } = data;
    const wInchPart = data.customerWidthInch > 0 ? ` ${data.customerWidthInch}in` : '';
    const lInchPart = data.lengthInch > 0 ? ` ${data.lengthInch}in` : '';
    let note = `Cut from ${roll.rollNumber}: ${data.customerWidthFt}ft${wInchPart} × ${data.lengthFt}ft${lInchPart} = ${data.cutSqft.toFixed(2)} sqft`;
    if (data.isCustomRate) note += ` @ Rs ${data.pricePerSqft}/sqft (Custom)`;

    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      rollId: roll.id,
      rollNumber: roll.rollNumber,
      cutWidthFt: data.customerWidthFt,
      cutWidthInch: data.customerWidthInch,
      cutLengthFt: data.lengthFt,
      cutLengthInch: data.lengthInch,
      cutLengthReal: data.lengthReal,
      cutWidthReal: data.widthReal,
      cutSqft: data.cutSqft,
      createLeftover: data.createLeftover,
      rollCustomerWidthFt: data.widthReal,
      rollFullWidthFt: Number(roll.widthFt) + Number((roll as any).widthInch || 0) / 12,
      name: product.name,
      basePrice: data.pricePerSqft,
      wholesalePrice: (roll as any).wholesalePricePerSqft ?? null,
      stock: data.cutSqft,
      quantity: data.cutSqft,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      priceOverride: data.pricePerSqft,
      lineDiscount: 0,
      note,
    }]);

    toast.success(`${roll.rollNumber} → ${data.cutSqft.toFixed(2)} sqft added`);
    setCarpetPickerData(null);
  };

  const handleCutPieceSelect = (piece: CarpetCutPiece) => {
    if (!cutPiecePickerData) return;
    const { product } = cutPiecePickerData;
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      cutPieceId: piece.id,
      cutPieceCode: piece.pieceCode,
      cutSqft: (piece as any).totalSqft,
      name: product.name,
      basePrice: (piece as any).salePrice,
      wholesalePrice: null,
      stock: (piece as any).totalSqft,
      quantity: (piece as any).totalSqft,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      priceOverride: (piece as any).salePrice / Math.max((piece as any).totalSqft, 0.01),
      lineDiscount: 0,
      note: `Cut piece ${piece.pieceCode} • ${(piece as any).widthFt}ft × ${(piece as any).lengthFt}ft`,
    }]);
    toast.success(`Cut piece ${piece.pieceCode} added`);
    setCutPiecePickerData(null);
  };

  const addAccessoryToCart = (product: Product) => {
    if (product.stock <= 0) return toast.error('Out of stock');
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: product.id,
      name: product.name,
      variantImage: product.images?.[0]?.url,
      basePrice: product.price,
      wholesalePrice: product.wholesalePrice,
      stock: product.stock,
      quantity: 1,
      unit: product.unit,
      category: product.category,
      useWholesale: false,
      lineDiscount: 0,
    }]);
    toast.success(`${product.name} added`);
  };

  const handleBarcodeScan = async (code: string) => {
    setScannerOpen(false);
    if (!code.trim()) return;
    // Try roll number first
    const matchingRoll = allRolls.find((r: any) => r.rollNumber.toLowerCase() === code.toLowerCase().trim());
    if (matchingRoll) {
      openRollCutFor(matchingRoll);
      return;
    }
    // Try product barcode
    try {
      const product = await productsApi.byBarcode(code.trim());
      if (['sqft', 'sqm', 'sqyd'].includes(product.unit)) {
        setCarpetPickerData({ product });
      } else {
        addAccessoryToCart(product);
      }
    } catch {
      toast.error(`Barcode "${code}" not found`);
    }
  };

  const addCustomerMutation = useMutation({
    mutationFn: customersApi.create,
    onSuccess: (customer) => {
      toast.success(`${customer.name} added`);
      setCustomerId(customer.id);
      setShowCustomerAdd(false);
      setNewCustomer({ name: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => {
      if (!currentShopId) throw new Error('Shop required');
      return salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: effectivePaid,
        discount: Number(globalDiscount) || 0,
        serviceCharges,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
    },
    onSuccess: (sale) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls-available'] });
      queryClient.invalidateQueries({ queryKey: ['carpet-cut-pieces-available'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) return toast.error('Cart empty');
    if (!currentShopId) return toast.error('Select shop first');
    if (credit > 0 && !customerId) return toast.error('Customer required for credit');
    checkoutMutation.mutate();
  };

  const addServiceCharge = () => {
    setServiceCharges((prev) => [...prev, { type: 'CUSTOM', label: '', amount: 0 }]);
  };

  return (
    <>
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeScan} onClose={() => setScannerOpen(false)} />}

      {carpetPickerData && (
        <CarpetRollPicker
          product={carpetPickerData.product}
          preSelectedRoll={carpetPickerData.preSelectedRoll}
          onConfirm={handleCarpetRollConfirm}
          onClose={() => setCarpetPickerData(null)}
        />
      )}

      {cutPiecePickerData && (
        <CarpetCutPiecePicker
          product={cutPiecePickerData.product}
          onSelect={handleCutPieceSelect}
          onClose={() => setCutPiecePickerData(null)}
        />
      )}

      {showCustomerAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-extrabold">Quick Add Customer</h3>
              </div>
              <button onClick={() => setShowCustomerAdd(false)} className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <input autoFocus value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Customer name"
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-emerald-500" />
              <input value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="03XX..."
                className="h-12 w-full rounded-xl border-2 border-slate-200 px-4 text-base font-bold focus:outline-none focus:border-emerald-500" />
              <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-700"
                onClick={() => {
                  if (!newCustomer.name.trim()) return toast.error('Name required');
                  addCustomerMutation.mutate({ name: newCustomer.name.trim(), phone: newCustomer.phone.trim() || undefined });
                }}
                loading={addCustomerMutation.isPending}>
                Add Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
        {/* CARPET SIDE */}
        <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white">
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative px-5 py-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold border border-white/20">
                <Layers className="h-3 w-3 text-amber-300" />
                Carpet POS
              </div>
              <h2 className="mt-2 text-2xl font-extrabold">Rolls, Cut Pieces & Accessories</h2>
              <p className="text-xs text-white/80 font-semibold mt-1">
                Roll number scan karo, cut dimensions do, receipt bhi cut detail ke sath print hogi
              </p>
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roll #, piece code, product, color..."
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => setScannerOpen(true)}
                className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white flex items-center justify-center shadow-lg">
                <Camera className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveTab('rolls')}
                className={[
                  'flex-1 h-10 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-1',
                  activeTab === 'rolls' ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}>
                <Layers className="h-3.5 w-3.5" />
                Rolls ({allRolls.length})
              </button>
              <button onClick={() => setActiveTab('pieces')}
                className={[
                  'flex-1 h-10 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-1',
                  activeTab === 'pieces' ? 'bg-violet-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}>
                <Scissors className="h-3.5 w-3.5" />
                Cut Pieces ({allCutPieces.length})
              </button>
              <button onClick={() => setActiveTab('accessories')}
                className={[
                  'flex-1 h-10 rounded-xl text-sm font-extrabold transition inline-flex items-center justify-center gap-1',
                  activeTab === 'accessories' ? 'bg-amber-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}>
                <Package className="h-3.5 w-3.5" />
                Accessories
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
            {activeTab === 'rolls' && (
              filteredRolls.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Layers className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">No rolls</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {filteredRolls.map((roll: any) => (
                    <button key={roll.id} onClick={() => openRollCutFor(roll)}
                      className="group text-left rounded-2xl border-2 border-slate-200 hover:border-emerald-400 hover:shadow-lg bg-white overflow-hidden transition">
                      <div className="aspect-square bg-slate-100 overflow-hidden relative">
                        {roll.product?.images?.[0]?.url ? (
                          <img src={roll.product.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layers className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-extrabold font-mono">
                          {roll.rollNumber}
                        </div>
                        {roll.color && (
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold">
                            {roll.color}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem]">{roll.product?.name}</div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-xs font-extrabold text-emerald-700 tabular-nums">
                            {formatPKR(roll.salePricePerSqft || roll.product?.price || 0)}/sqft
                          </div>
                          <div className="text-[9px] font-bold text-slate-500">{Number(roll.remainingSqft || 0).toFixed(0)} sqft</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {activeTab === 'pieces' && (
              filteredCutPieces.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Scissors className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">No cut pieces</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {filteredCutPieces.map((piece: any) => (
                    <button key={piece.id}
                      onClick={() => {
                        setCutPiecePickerData({ product: piece.product });
                        // auto-select from list
                        setTimeout(() => handleCutPieceSelect(piece), 100);
                      }}
                      className="group text-left rounded-2xl border-2 border-slate-200 hover:border-violet-400 hover:shadow-lg bg-white overflow-hidden transition">
                      <div className="aspect-square bg-violet-50 relative">
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <Scissors className="h-8 w-8 text-violet-500 mb-1" />
                          <div className="text-xs font-mono font-extrabold text-violet-900">{piece.pieceCode}</div>
                          <div className="text-[10px] font-bold text-slate-600 mt-1">
                            {piece.widthFt}ft × {piece.lengthFt}ft
                          </div>
                          <div className="text-[10px] font-extrabold text-emerald-700 mt-0.5">
                            {piece.totalSqft.toFixed(1)} sqft
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem]">{piece.product?.name}</div>
                        <div className="text-sm font-extrabold text-emerald-700 tabular-nums mt-1">
                          {formatPKR(piece.salePrice || 0)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}

            {activeTab === 'accessories' && (
              nonCarpetProducts.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">No accessories</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {nonCarpetProducts.map((p) => (
                    <button key={p.id} onClick={() => addAccessoryToCart(p)}
                      disabled={p.stock <= 0}
                      className={[
                        'group text-left rounded-2xl border-2 overflow-hidden transition bg-white',
                        p.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-200'
                          : 'border-slate-200 hover:border-amber-400 hover:shadow-md',
                      ].join(' ')}>
                      <div className="aspect-square bg-slate-100 overflow-hidden">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="font-extrabold text-slate-900 text-xs line-clamp-2 min-h-[2rem]">{p.name}</div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                          <div className="text-[9px] font-bold text-slate-500">{p.stock} {p.unit}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </section>

        {/* CART SIDE */}
        <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Layers className="h-2.5 w-2.5" />
                  Carpet Cart
                </div>
                <div className="text-2xl font-extrabold tabular-nums mt-1">{cart.length} items</div>
                <div className="text-xs text-white/80 font-semibold">{formatPKRFull(total)}</div>
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (confirm('Clear cart?')) clearCart(); }}
                  className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-white text-xs font-extrabold border border-white/20">
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <User className="h-3 w-3 text-emerald-600" />
                  Customer
                </label>
                <button onClick={() => setShowCustomerAdd(true)}
                  className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  Add
                </button>
              </div>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500 appearance-none">
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.phone ? ` • ${c.phone}` : ''}</option>
                ))}
              </select>
            </div>

            <div className="p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
                  <Layers className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700">Empty cart</p>
                  <p className="text-xs text-slate-500 font-semibold mt-1">Click a roll or accessory to add</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.cartLineId} className={[
                    'rounded-xl border-2 p-3 space-y-2',
                    item.rollId ? 'border-emerald-200 bg-emerald-50/50'
                      : item.cutPieceId ? 'border-violet-200 bg-violet-50/50'
                      : 'border-slate-200 bg-white',
                  ].join(' ')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.rollId && <Layers className="h-3.5 w-3.5 text-emerald-600" />}
                          {item.cutPieceId && <Scissors className="h-3.5 w-3.5 text-violet-600" />}
                          <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                        </div>
                        {item.note && (
                          <div className="mt-1 text-[10px] font-mono text-emerald-700 bg-emerald-100 rounded px-1.5 py-0.5">
                            {item.note}
                          </div>
                        )}
                      </div>
                      <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                        className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-extrabold text-slate-600">
                        {item.rollId || item.cutPieceId ? `${item.quantity.toFixed(2)} ${item.unit} (locked)` : `${item.quantity} ${item.unit}`}
                      </div>
                      <div className="font-extrabold text-emerald-700 tabular-nums">
                        {formatPKR((item.priceOverride ?? item.basePrice) * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Service Charges */}
            {cart.length > 0 && (
              <div className="p-3 border-t border-slate-100 bg-orange-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-extrabold text-orange-700">Service Charges (Installation, Glue, etc.)</div>
                  <button onClick={addServiceCharge} className="text-xs font-extrabold text-orange-600 inline-flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                {serviceCharges.map((sc, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_auto] gap-1">
                    <input value={sc.label} onChange={(e) => {
                      const next = [...serviceCharges];
                      next[idx] = { ...next[idx], label: e.target.value };
                      setServiceCharges(next);
                    }} placeholder="Service name"
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-orange-500" />
                    <input type="number" value={sc.amount || ''} onChange={(e) => {
                      const next = [...serviceCharges];
                      next[idx] = { ...next[idx], amount: Number(e.target.value) };
                      setServiceCharges(next);
                    }} placeholder="Rs"
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold tabular-nums focus:outline-none focus:border-orange-500" />
                    <button onClick={() => setServiceCharges(serviceCharges.filter((_, i) => i !== idx))}
                      className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="JAZZCASH">JazzCash</option>
                  <option value="EASYPAISA">EasyPaisa</option>
                  <option value="BANK_TRANSFER">Bank</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(['FULL_PAYMENT', 'PARTIAL_CREDIT', 'FULL_CREDIT'] as const).map((m) => (
                  <button key={m} onClick={() => setSaleMode(m)}
                    className={[
                      'py-2 rounded-lg text-[10px] font-extrabold transition',
                      saleMode === m ? 'bg-emerald-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                    ].join(' ')}>
                    {m === 'FULL_PAYMENT' ? 'Full Pay' : m === 'PARTIAL_CREDIT' ? 'Partial' : 'Udhaar'}
                  </button>
                ))}
              </div>

              {saleMode === 'PARTIAL_CREDIT' && (
                <input type="number" placeholder="Paid amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
              )}

              <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {serviceCharges.reduce((s, c) => s + c.amount, 0) > 0 && (
                  <div className="flex justify-between text-orange-300">
                    <span>Services</span>
                    <span className="font-bold tabular-nums">+{formatPKR(serviceCharges.reduce((s, c) => s + c.amount, 0))}</span>
                  </div>
                )}
                {Number(globalDiscount) > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
                )}
                <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                  <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                  <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
                </div>
                {credit > 0 && (
                  <div className="flex justify-between text-amber-300 pt-1 border-t border-white/20 mt-1">
                    <span className="font-extrabold">Udhaar</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(credit)}</span>
                  </div>
                )}
              </div>

              <Button size="lg" className="w-full bg-gradient-to-r from-emerald-600 to-teal-700"
                onClick={handleCheckout} loading={checkoutMutation.isPending} disabled={!currentShopId}>
                <CheckCircle2 className="h-5 w-5" />
                Complete Sale
              </Button>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
