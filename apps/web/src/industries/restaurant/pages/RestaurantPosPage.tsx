import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Utensils, ShoppingBag, Bike, Car, Home, Package,
  ChefHat, Users, Crown, Wind, Baby, Search, X, Plus, Trash2,
  Star, Flame, Clock, CheckCircle2, ArrowLeft, ArrowRight,
  Sparkles, MessageSquare, ReceiptText, Send, Save,
  DollarSign, ChevronRight, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { tablesApi, type RestaurantTable, type TableStatus } from '../api/tables.api';
import { menuItemsApi } from '../api/menu-items.api';
import { ordersApi, type OrderMode, type OrderItem } from '../api/orders.api';
import { kotApi } from '../api/kot.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { salesApi, type PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { RestaurantModifierPicker } from '@industries/restaurant/pos-extensions/RestaurantModifierPicker';
import { useSharedPosCart, cartLineId } from '@modules/pos/hooks/useSharedPosCart';
import { FbrModeIndicator } from '@integrations/fbr/components/FbrModeIndicator';

const MODES: { value: OrderMode; label: string; icon: any; gradient: string; desc: string }[] = [
  { value: 'DINE_IN', label: 'Dine-in', icon: Utensils, gradient: 'from-emerald-500 to-green-700', desc: 'Guest bench pe hain' },
  { value: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag, gradient: 'from-blue-500 to-cyan-700', desc: 'Pack & go' },
  { value: 'DELIVERY', label: 'Delivery', icon: Bike, gradient: 'from-violet-500 to-purple-700', desc: 'Rider ke through' },
  { value: 'DRIVE_THRU', label: 'Drive-thru', icon: Car, gradient: 'from-amber-500 to-orange-700', desc: 'Gari se pickup' },
  { value: 'ROOM_SERVICE', label: 'Room Service', icon: Home, gradient: 'from-pink-500 to-rose-700', desc: 'Kamre mein' },
  { value: 'PICKUP', label: 'Pickup', icon: Package, gradient: 'from-cyan-500 to-teal-700', desc: 'Counter se pickup' },
];

const TABLE_STATUS_CONFIG: Record<TableStatus, { bg: string; border: string; text: string; label: string }> = {
  AVAILABLE: { bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-700', label: 'Available' },
  OCCUPIED: { bg: 'bg-rose-500', border: 'border-rose-400', text: 'text-rose-700', label: 'Occupied' },
  RESERVED: { bg: 'bg-amber-500', border: 'border-amber-400', text: 'text-amber-700', label: 'Reserved' },
  CLEANING: { bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-700', label: 'Cleaning' },
  OUT_OF_SERVICE: { bg: 'bg-slate-500', border: 'border-slate-400', text: 'text-slate-700', label: 'Out' },
};

type Screen = 'mode' | 'tables' | 'menu';

export default function RestaurantPosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);

  const [screen, setScreen] = useState<Screen>('mode');
  const [mode, setMode] = useState<OrderMode>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(2);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [modifierPickerItem, setModifierPickerItem] = useState<any>(null);
  const [notePickerLine, setNotePickerLine] = useState<string | null>(null);
  const [taxPct, setTaxPct] = useState(0);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [packagingFee, setPackagingFee] = useState(0);
  const [tip, setTip] = useState(0);

  const {
    cart, setCart, customerId, setCustomerId,
    paymentMethod, setPaymentMethod, paidAmount, setPaidAmount,
    saleMode, setSaleMode, globalDiscount, setGlobalDiscount,
    total: cartSubtotal, totalItems, clearCart,
  } = useSharedPosCart();

  const { data: tables = [] } = useQuery({
    queryKey: ['restaurant-tables-pos'],
    queryFn: () => tablesApi.list(),
    enabled: mode === 'DINE_IN',
    refetchInterval: 30_000,
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-pos'],
    queryFn: () => menuItemsApi.list({ available: true }),
    enabled: screen === 'menu',
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-pos'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });
  const customers = customersData?.items ?? [];

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const cats: { id: string; name: string; color: string }[] = [];
    for (const mi of menuItems) {
      const cat = (mi as any).product?.category;
      if (cat?.id && !seen.has(cat.id)) {
        seen.add(cat.id);
        cats.push({ id: cat.id, name: cat.name, color: cat.color || '#64748b' });
      }
    }
    return cats;
  }, [menuItems]);

  const filteredMenuItems = useMemo(() => {
    let list = menuItems;
    if (categoryFilter !== 'all') {
      list = list.filter((mi: any) => mi.product?.categoryId === categoryFilter);
    }
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((mi: any) =>
        mi.product?.name.toLowerCase().includes(q) ||
        mi.product?.sku?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [menuItems, search, categoryFilter]);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const svc = cartSubtotal * (serviceChargePct / 100);
  const tax = (cartSubtotal + svc) * (taxPct / 100);
  const total = Math.max(cartSubtotal + svc + tax + deliveryFee + packagingFee + tip - (Number(globalDiscount) || 0), 0);
  const remainingToPay = saleMode === 'FULL_PAYMENT' ? total : saleMode === 'FULL_CREDIT' ? 0 : Number(paidAmount || 0);
  const changeAmount = Math.max(remainingToPay - total, 0);

  const addMenuItemToCart = async (menuItem: any) => {
    const hasRequiredMod = menuItem.modifiers?.some((mm: any) => mm.modifierGroup?.isRequired);
    if (hasRequiredMod) {
      setModifierPickerItem(menuItem);
      return;
    }
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: menuItem.productId,
      name: menuItem.product?.name || 'Item',
      variantImage: menuItem.imageUrl || menuItem.product?.images?.[0]?.url,
      basePrice: menuItem.product?.price ?? 0,
      wholesalePrice: null,
      stock: menuItem.product?.stock ?? 999,
      quantity: 1,
      unit: menuItem.product?.unit || 'plate',
      category: menuItem.product?.category,
      useWholesale: false,
      lineDiscount: 0,
      spiceLevel: menuItem.spiceLevel,
    }]);
    toast.success(`${menuItem.product?.name} added`);
  };

  const handleModifierConfirm = (mods: any[]) => {
    if (!modifierPickerItem) return;
    const mi = modifierPickerItem;
    const modTotal = mods.reduce((s, m) => s + (m.priceAdjustment || 0) * (m.quantity || 1), 0);
    setCart((prev) => [...prev, {
      cartLineId: cartLineId(),
      productId: mi.productId,
      name: mi.product?.name || 'Item',
      variantImage: mi.imageUrl || mi.product?.images?.[0]?.url,
      basePrice: (mi.product?.price ?? 0) + modTotal,
      wholesalePrice: null,
      stock: mi.product?.stock ?? 999,
      quantity: 1,
      unit: mi.product?.unit || 'plate',
      category: mi.product?.category,
      useWholesale: false,
      lineDiscount: 0,
      spiceLevel: mi.spiceLevel,
      modifiers: mods,
    }]);
    toast.success(`${mi.product?.name} added with modifiers`);
    setModifierPickerItem(null);
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const items: OrderItem[] = cart.map((c) => ({
        productId: c.productId,
        variantId: c.variantId,
        quantity: c.quantity,
        unit: c.unit,
        basePrice: c.basePrice,
        specialInstructions: c.specialInstructions,
        modifiers: c.modifiers?.map((m) => ({
          modifierOptionId: m.modifierOptionId,
          quantity: m.quantity,
        })),
      }));

      const order = await ordersApi.create({
        mode,
        tableId: mode === 'DINE_IN' ? selectedTableId || undefined : undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        deliveryAddress: mode === 'DELIVERY' ? deliveryAddress : undefined,
        deliveryNotes: mode === 'DELIVERY' ? deliveryNotes : undefined,
        numberOfGuests: mode === 'DINE_IN' ? numberOfGuests : undefined,
        specialRequests: specialRequests || undefined,
        serviceChargePct,
        taxPct,
        discount: Number(globalDiscount) || 0,
        deliveryFee: mode === 'DELIVERY' ? deliveryFee : 0,
        packagingFee: mode !== 'DINE_IN' ? packagingFee : 0,
        tip,
        items,
      });
      return order;
    },
    onSuccess: async (order) => {
      toast.success(`Order ${order.orderNumber} created`);
      try {
        await kotApi.create({
          orderId: order.id,
          itemIds: order.items?.map((it: any) => it.id) || [],
        });
        toast.success('KOT sent to kitchen');
      } catch { /* KOT failure non-fatal */ }
      queryClient.invalidateQueries({ queryKey: ['restaurant-orders'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-tables-pos'] });
      navigate(`/restaurant/orders/${order.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Order failed'),
  });

  const completeAndPayMutation = useMutation({
    mutationFn: async () => {
      if (!currentShopId) throw new Error('Shop required');
      const order = await createOrderMutation.mutateAsync();
      const sale = await salesApi.create({
        shopId: currentShopId,
        customerId: customerId || undefined,
        paymentMethod,
        paidAmount: remainingToPay,
        discount: Number(globalDiscount) || 0,
        items: cart.map((c) => ({
          productId: c.productId,
          variantId: c.variantId,
          quantity: c.quantity,
          priceOverride: c.priceOverride,
          lineDiscount: c.lineDiscount,
          useWholesale: c.useWholesale,
          note: c.note,
        })),
      });
      return { order, sale };
    },
    onSuccess: ({ sale }) => {
      window.open(`/sales/${sale.id}/receipt?auto=1`, '_blank');
      clearCart();
      resetFlow();
    },
  });

  const resetFlow = () => {
    setScreen('mode');
    setSelectedTableId('');
    setNumberOfGuests(2);
    setCustomerName('');
    setCustomerPhone('');
    setDeliveryAddress('');
    setDeliveryNotes('');
    setSpecialRequests('');
    setSearch('');
    setCategoryFilter('all');
    setTaxPct(0);
    setServiceChargePct(0);
    setDeliveryFee(0);
    setPackagingFee(0);
    setTip(0);
  };

  const canProceedFromMode = mode === 'DINE_IN' || (mode === 'DELIVERY' ? (customerName && deliveryAddress) : true);
  const canProceedFromTables = !!selectedTableId;

  // ─── SCREEN A: Mode Picker ────────────────────────
  if (screen === 'mode') {
    return (
      <div className="min-h-[calc(100dvh-7rem)] flex flex-col">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white p-6 shadow-2xl mb-6">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ChefHat className="h-3.5 w-3.5 text-amber-300" />
              Restaurant POS
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Naya Order</h1>
            <p className="mt-2 text-sm text-white/80">Order mode select karein — customer kis tarah order kar raha hai?</p>
          </div>
        </section>

        <div className="flex-1 space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={[
                    'rounded-3xl border-4 p-6 text-left transition-all',
                    active
                      ? 'border-orange-500 bg-orange-50 shadow-xl scale-[1.02]'
                      : 'border-slate-200 bg-white hover:border-orange-300 hover:shadow-lg',
                  ].join(' ')}
                >
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${m.gradient} text-white flex items-center justify-center shadow-lg mb-3`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="font-extrabold text-slate-900 text-lg">{m.label}</div>
                  <div className="text-xs text-slate-600 font-semibold mt-1">{m.desc}</div>
                  {active && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-orange-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {mode === 'DELIVERY' && (
            <section className="rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
              <h3 className="font-extrabold text-violet-900 text-lg flex items-center gap-2">
                <Bike className="h-5 w-5" />
                Delivery Details (required)
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Customer Name *</label>
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Phone</label>
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03XX..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Delivery Address *</label>
                <textarea rows={2} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Full address with landmark"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Notes</label>
                <input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Gate code, floor, etc."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
              </div>
            </section>
          )}

          {(mode === 'TAKEAWAY' || mode === 'PICKUP') && (
            <section className="rounded-3xl border-2 border-slate-200 bg-white p-5 space-y-3">
              <h3 className="font-extrabold text-slate-900 text-base">Customer Info (optional)</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="03XX..."
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
              </div>
            </section>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-600 to-red-700"
            disabled={!canProceedFromMode}
            onClick={() => setScreen(mode === 'DINE_IN' ? 'tables' : 'menu')}
          >
            Next: {mode === 'DINE_IN' ? 'Select Table' : 'Choose Menu'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN B: Table Grid (dine-in only) ──────────
  if (screen === 'tables') {
    const grouped = tables.reduce((acc, t) => {
      const s = t.section || 'Main';
      if (!acc[s]) acc[s] = [];
      acc[s].push(t);
      return acc;
    }, {} as Record<string, RestaurantTable[]>);

    return (
      <div className="min-h-[calc(100dvh-7rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setScreen('mode')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Guests</div>
            <div className="inline-flex items-center bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setNumberOfGuests(Math.max(1, numberOfGuests - 1))} className="h-10 w-10 hover:bg-slate-100 font-extrabold">−</button>
              <span className="h-10 w-12 flex items-center justify-center font-extrabold tabular-nums">{numberOfGuests}</span>
              <button onClick={() => setNumberOfGuests(numberOfGuests + 1)} className="h-10 w-10 hover:bg-slate-100 font-extrabold text-orange-600">+</button>
            </div>
          </div>
        </div>

        <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-teal-700 text-white p-5 mb-4 shadow-xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold">
            <Utensils className="h-3 w-3" />
            Select Table
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">Choose a Table for {numberOfGuests} guest{numberOfGuests !== 1 ? 's' : ''}</h2>
        </section>

        <div className="flex-1 space-y-6">
          {Object.entries(grouped).map(([section, sectionTables]) => (
            <section key={section}>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{section}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {sectionTables.map((table) => {
                  const cfg = TABLE_STATUS_CONFIG[table.status];
                  const isSelectable = table.status === 'AVAILABLE';
                  const active = selectedTableId === table.id;
                  return (
                    <button
                      key={table.id}
                      disabled={!isSelectable}
                      onClick={() => setSelectedTableId(table.id)}
                      className={[
                        'rounded-2xl border-4 p-3 transition text-center',
                        active ? 'border-orange-500 bg-orange-50 shadow-lg scale-105'
                          : isSelectable ? cfg.border + ' bg-white hover:shadow-md hover:scale-[1.02]'
                          : cfg.border + ' bg-slate-50 opacity-50 cursor-not-allowed',
                      ].join(' ')}
                    >
                      <div className={'absolute -top-1 -right-1 h-3 w-3 rounded-full ' + cfg.bg} />
                      <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{table.tableNumber}</div>
                      <div className="text-xs font-bold text-slate-600 mt-0.5 truncate">{table.tableName || '—'}</div>
                      <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-500">
                        <Users className="h-2.5 w-2.5" />
                        {table.capacity}
                      </div>
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {table.isVip && <Crown className="h-2.5 w-2.5 text-amber-500" />}
                        {table.isAcRoom && <Wind className="h-2.5 w-2.5 text-cyan-500" />}
                        {table.isFamilyArea && <Baby className="h-2.5 w-2.5 text-pink-500" />}
                      </div>
                      {!isSelectable && (
                        <div className={'mt-1 text-[9px] font-extrabold uppercase ' + cfg.text}>
                          {cfg.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 pt-4 border-t border-slate-200">
          <div className="text-sm text-slate-600 font-semibold">
            {selectedTable && (
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Selected: <strong>Table {selectedTable.tableNumber}</strong>
                {selectedTable.tableName && ` (${selectedTable.tableName})`}
              </span>
            )}
          </div>
          <Button
            size="lg"
            className="bg-gradient-to-r from-orange-600 to-red-700"
            disabled={!canProceedFromTables}
            onClick={() => setScreen('menu')}
          >
            Next: Menu
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── SCREEN C: Menu + Cart ────────────────────────
  return (
    <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
      {modifierPickerItem && (
        <RestaurantModifierPicker
          productId={modifierPickerItem.productId}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierPickerItem(null)}
        />
      )}

      {/* MENU SIDE */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
          <div className="relative px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen(mode === 'DINE_IN' ? 'tables' : 'mode')}
                className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <ChefHat className="h-2.5 w-2.5 text-amber-300" />
                  {MODES.find((m) => m.value === mode)?.label}
                  {selectedTable && ` • Table ${selectedTable.tableNumber}`}
                </div>
                <h2 className="text-lg font-extrabold leading-tight mt-0.5">Menu</h2>
              </div>
            </div>
            <div className="text-xs font-extrabold text-white/80">
              {filteredMenuItems.length} items
            </div>
          </div>
        </div>

        <div className="shrink-0 px-4 py-3 bg-slate-50/80 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-orange-500" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded hover:bg-slate-100 flex items-center justify-center">
                <X className="h-3.5 w-3.5 text-slate-500" />
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button onClick={() => setCategoryFilter('all')}
                className={[
                  'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold transition',
                  categoryFilter === 'all' ? 'bg-orange-600 text-white shadow' : 'bg-white border border-slate-200 text-slate-700',
                ].join(' ')}>
                All ({menuItems.length})
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
                  className={[
                    'shrink-0 px-3 h-8 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border transition',
                    categoryFilter === cat.id ? 'text-white shadow' : 'bg-white text-slate-700',
                  ].join(' ')}
                  style={{
                    backgroundColor: categoryFilter === cat.id ? cat.color : '#fff',
                    borderColor: categoryFilter === cat.id ? cat.color : '#e2e8f0',
                  }}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredMenuItems.map((mi: any) => {
              const p = mi.product;
              const inCart = cart.filter((c) => c.productId === p?.id).reduce((s, c) => s + c.quantity, 0);
              return (
                <button
                  key={mi.id}
                  onClick={() => addMenuItemToCart(mi)}
                  className={[
                    'group relative text-left rounded-2xl border-2 overflow-hidden transition-all bg-white',
                    inCart > 0 ? 'border-orange-500 shadow-lg ring-2 ring-orange-200'
                      : mi.chefSpecial ? 'border-amber-400 hover:shadow-lg'
                      : 'border-slate-200 hover:border-orange-400 hover:shadow-lg hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  {inCart > 0 && (
                    <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-orange-600 text-white text-xs font-extrabold flex items-center justify-center shadow-xl ring-2 ring-white z-10">
                      {inCart}
                    </div>
                  )}
                  <div className="aspect-square bg-slate-100 overflow-hidden relative">
                    {mi.imageUrl || p?.images?.[0]?.url ? (
                      <img src={mi.imageUrl || p?.images?.[0]?.url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    {mi.chefSpecial && (
                      <div className="absolute top-1 right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow">
                        <Star className="h-3 w-3 fill-white text-white" />
                      </div>
                    )}
                    {mi.isSpicy && (
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-extrabold inline-flex items-center gap-0.5">
                        <Flame className="h-2 w-2" />
                        {mi.spiceLevel}
                      </div>
                    )}
                    {mi.prepTimeMinutes && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[8px] font-extrabold inline-flex items-center gap-0.5">
                        <Clock className="h-2 w-2" />
                        {mi.prepTimeMinutes}m
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="font-extrabold text-slate-900 text-xs line-clamp-2 leading-tight min-h-[2rem]">{p?.name}</div>
                    <div className="mt-1 text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p?.price ?? 0)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CART SIDE */}
      <aside className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <ReceiptText className="h-2.5 w-2.5 text-amber-300" />
                Order Cart
              </div>
              <div className="text-2xl font-extrabold tabular-nums mt-1">{totalItems.toFixed(0)} items</div>
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

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/30">
          {cart.length === 0 ? (
            <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-8 text-center">
              <ChefHat className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">Empty cart</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Click menu items to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.cartLineId} className="rounded-xl bg-white border-2 border-slate-200 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">{item.name}</div>
                    {item.modifiers && item.modifiers.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.modifiers.map((m, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[9px] font-extrabold">
                            {m.optionName}
                            {m.priceAdjustment !== 0 && ` (${m.priceAdjustment > 0 ? '+' : ''}${formatPKR(m.priceAdjustment)})`}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.specialInstructions && (
                      <div className="mt-1 text-[10px] italic text-amber-700">📝 {item.specialInstructions}</div>
                    )}
                    {item.spiceLevel && item.spiceLevel !== 'NONE' && (
                      <div className="text-[10px] font-extrabold text-red-600">🌶️ {item.spiceLevel}</div>
                    )}
                  </div>
                  <button onClick={() => setCart((prev) => prev.filter((c) => c.cartLineId !== item.cartLineId))}
                    className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden">
                    <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: Math.max(0.01, c.quantity - 1) } : c))}
                      className="h-8 w-8 hover:bg-slate-200 font-extrabold">−</button>
                    <span className="h-8 w-10 flex items-center justify-center text-sm font-extrabold tabular-nums">{item.quantity}</span>
                    <button onClick={() => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, quantity: c.quantity + 1 } : c))}
                      className="h-8 w-8 bg-orange-600 text-white hover:bg-orange-700 font-extrabold">+</button>
                  </div>
                  <button onClick={() => setNotePickerLine(notePickerLine === item.cartLineId ? null : item.cartLineId)}
                    className="text-[10px] font-extrabold text-blue-600 inline-flex items-center gap-0.5">
                    <MessageSquare className="h-3 w-3" />
                    {notePickerLine === item.cartLineId ? 'Hide' : 'Note'}
                  </button>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.basePrice * item.quantity)}</div>
                  </div>
                </div>
                {notePickerLine === item.cartLineId && (
                  <input value={item.specialInstructions || ''}
                    onChange={(e) => setCart((prev) => prev.map((c) => c.cartLineId === item.cartLineId ? { ...c, specialInstructions: e.target.value } : c))}
                    placeholder="e.g. Less oil, extra spicy..."
                    className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-semibold focus:outline-none focus:border-blue-500" />
                )}
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <input value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Overall special request..."
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:border-orange-500" />

            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="number" placeholder="Discount" value={globalDiscount} onChange={(e) => setGlobalDiscount(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              <input type="number" placeholder="Tax %" value={taxPct || ''} onChange={(e) => setTaxPct(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              <input type="number" placeholder="Service %" value={serviceChargePct || ''} onChange={(e) => setServiceChargePct(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              {mode === 'DELIVERY' && (
                <input type="number" placeholder="Delivery fee" value={deliveryFee || ''} onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              )}
              {mode !== 'DINE_IN' && (
                <input type="number" placeholder="Packaging" value={packagingFee || ''} onChange={(e) => setPackagingFee(Number(e.target.value))}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
              )}
              <input type="number" placeholder="Tip" value={tip || ''} onChange={(e) => setTip(Number(e.target.value))}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 font-bold tabular-nums" />
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(cartSubtotal)}</span></div>
              {svc > 0 && <div className="flex justify-between"><span className="text-white/70">Service</span><span className="font-bold tabular-nums">{formatPKR(svc)}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(tax)}</span></div>}
              {(deliveryFee > 0 || packagingFee > 0 || tip > 0) && (
                <>
                  {deliveryFee > 0 && <div className="flex justify-between"><span className="text-white/70">Delivery</span><span className="font-bold tabular-nums">{formatPKR(deliveryFee)}</span></div>}
                  {packagingFee > 0 && <div className="flex justify-between"><span className="text-white/70">Packaging</span><span className="font-bold tabular-nums">{formatPKR(packagingFee)}</span></div>}
                  {tip > 0 && <div className="flex justify-between text-amber-300"><span>Tip</span><span className="font-bold tabular-nums">{formatPKR(tip)}</span></div>}
                </>
              )}
              {Number(globalDiscount) > 0 && (
                <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(Number(globalDiscount))}</span></div>
              )}
              <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <FbrModeIndicator saleTotal={total} className="mb-2" />
                <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => createOrderMutation.mutate()}
                loading={createOrderMutation.isPending}
                className="border-2 border-orange-300"
              >
                <Send className="h-4 w-4" />
                Send to Kitchen
              </Button>
              <Button
                size="lg"
                className="bg-gradient-to-r from-emerald-600 to-emerald-700"
                onClick={() => completeAndPayMutation.mutate()}
                loading={completeAndPayMutation.isPending}
                disabled={!currentShopId}
              >
                <DollarSign className="h-4 w-4" />
                Pay & Print
              </Button>
            </div>
            <p className="text-[10px] text-slate-500 font-semibold text-center">
              "Send to Kitchen" — order create + KOT print (customer bench pe payment)
              <br />
              "Pay & Print" — complete + payment + receipt (immediate close)
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
