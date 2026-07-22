import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Utensils, Bike, Car, Home, Package, Search, X,
  Plus, Minus, Trash2, User, Phone, MapPin, Users, MessageSquare,
  Sparkles, ArrowLeft, Save, ChefHat, Flame, Clock, Star,
  DollarSign, Percent, Award, CheckCircle2,
} from 'lucide-react';
import { ordersApi, type OrderMode, type OrderItem } from '../api/orders.api';
import { menuItemsApi } from '../api/menu-items.api';
import { modifiersApi, type ModifierGroup, type ModifierOption } from '../api/modifiers.api';
import { tablesApi } from '../api/tables.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const MODES: { value: OrderMode; label: string; icon: any; color: string }[] = [
  { value: 'DINE_IN', label: 'Dine-in', icon: Utensils, color: 'emerald' },
  { value: 'TAKEAWAY', label: 'Takeaway', icon: ShoppingBag, color: 'blue' },
  { value: 'DELIVERY', label: 'Delivery', icon: Bike, color: 'violet' },
  { value: 'DRIVE_THRU', label: 'Drive-thru', icon: Car, color: 'amber' },
  { value: 'ROOM_SERVICE', label: 'Room Service', icon: Home, color: 'pink' },
  { value: 'PICKUP', label: 'Pickup', icon: Package, color: 'cyan' },
];

interface CartItem extends OrderItem {
  cartId: string;
  menuItem?: any;
  selectedModifiers: Array<{
    modifierOptionId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
  }>;
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTableId = searchParams.get('tableId');

  const [mode, setMode] = useState<OrderMode>(preselectedTableId ? 'DINE_IN' : 'DINE_IN');
  const [tableId, setTableId] = useState<string>(preselectedTableId ?? '');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [numberOfGuests, setNumberOfGuests] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [modifierPickerItem, setModifierPickerItem] = useState<any>(null);
  const [discount, setDiscount] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [serviceChargePct, setServiceChargePct] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [packagingFee, setPackagingFee] = useState(0);
  const [tip, setTip] = useState(0);

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items-order', search],
    queryFn: () => menuItemsApi.list({ available: true, search: search || undefined }),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables-available'],
    queryFn: () => tablesApi.list({ status: 'AVAILABLE' }),
    enabled: mode === 'DINE_IN',
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-order'],
    queryFn: () => customersApi.list({ limit: 500 }),
  });

  const customers = customersData?.items ?? [];

  // Cart totals
  const subtotal = cart.reduce((sum, item) => {
    const modTotal = item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment * m.quantity, 0);
    return sum + (item.basePrice! + modTotal) * item.quantity;
  }, 0);
  const svc = subtotal * (serviceChargePct / 100);
  const tax = (subtotal + svc) * (taxPct / 100);
  const total = Math.max(subtotal + svc + tax + deliveryFee + packagingFee + tip - discount, 0);

  const addToCart = async (menuItem: any) => {
    // If has required modifiers, open picker
    if (menuItem.modifiers?.some((m: any) => m.modifierGroup?.isRequired)) {
      setModifierPickerItem(menuItem);
      return;
    }
    // Add directly
    setCart((prev) => [
      ...prev,
      {
        cartId: 'c' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        productId: menuItem.productId,
        quantity: 1,
        unit: menuItem.product?.unit || 'piece',
        basePrice: menuItem.product?.price ?? 0,
        product: menuItem.product,
        menuItem,
        selectedModifiers: [],
      },
    ]);
    toast.success(menuItem.product?.name + ' added');
  };

  const updateQty = (cartId: string, qty: number) => {
    if (qty < 1) return removeItem(cartId);
    setCart(cart.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)));
  };

  const removeItem = (cartId: string) => setCart(cart.filter((i) => i.cartId !== cartId));

  const updateInstruction = (cartId: string, note: string) => {
    setCart(cart.map((i) => (i.cartId === cartId ? { ...i, specialInstructions: note } : i)));
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const items = cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        unit: c.unit,
        basePrice: c.basePrice,
        specialInstructions: c.specialInstructions,
        modifiers: c.selectedModifiers.map((m) => ({
          modifierOptionId: m.modifierOptionId,
          quantity: m.quantity,
        })),
      }));

      return ordersApi.create({
        mode,
        tableId: mode === 'DINE_IN' ? tableId || undefined : undefined,
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerAddress: customerAddress || undefined,
        deliveryAddress: mode === 'DELIVERY' ? deliveryAddress : undefined,
        deliveryNotes: mode === 'DELIVERY' ? deliveryNotes : undefined,
        numberOfGuests: mode === 'DINE_IN' ? numberOfGuests : undefined,
        specialRequests: specialRequests || undefined,
        serviceChargePct,
        taxPct,
        discount,
        deliveryFee: mode === 'DELIVERY' ? deliveryFee : 0,
        packagingFee: mode !== 'DINE_IN' ? packagingFee : 0,
        tip,
        items,
      });
    },
    onSuccess: (order) => {
      toast.success('Order ' + order.orderNumber + ' created!');
      navigate('/restaurant/orders/' + order.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Order failed'),
  });

  const canSubmit = cart.length > 0 && (mode !== 'DINE_IN' || tableId) && (mode !== 'DELIVERY' || (customerName && deliveryAddress));

  return (
    <div className="grid xl:grid-cols-[1fr_460px] gap-4 h-[calc(100dvh-7rem)]">
      {/* MENU SIDE */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/restaurant/orders')}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  New Order
                </div>
                <h2 className="text-lg font-extrabold mt-1">Create Order</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Picker */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/30">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={
                    'p-2 rounded-xl border-2 text-center transition ' +
                    (active
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 shadow'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-orange-300')
                  }
                >
                  <Icon className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-[10px] font-extrabold">{m.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {menuItems.map((mi) => {
              const p = mi.product;
              return (
                <button
                  key={mi.id}
                  onClick={() => addToCart(mi)}
                  className={
                    'group relative text-left rounded-2xl border-2 overflow-hidden transition-all bg-white dark:bg-neutral-800 ' +
                    (mi.chefSpecial ? 'border-amber-400 hover:border-amber-500' : 'border-slate-200 dark:border-neutral-700 hover:border-orange-400') +
                    ' hover:shadow-lg hover:-translate-y-0.5'
                  }
                >
                  <div className="aspect-square bg-slate-100 dark:bg-neutral-900 overflow-hidden relative">
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
                    <div className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2 leading-tight min-h-[2rem]">{p?.name}</div>
                    <div className="mt-1 text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(p?.price ?? 0)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CART SIDE */}
      <aside className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden flex flex-col">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white shrink-0 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/70">Order Cart</div>
              <div className="text-2xl font-extrabold tabular-nums">{cart.length} items</div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-rose-500/40 text-[11px] font-extrabold"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Customer + Options */}
        <div className="p-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/30 space-y-2 max-h-56 overflow-y-auto">
          {mode === 'DINE_IN' && (
            <>
              <div>
                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-600 block mb-1">Table *</label>
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} {t.tableName ? '(' + t.tableName + ')' : ''} • {t.capacity} seats
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-600 block mb-1">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                  className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-orange-500"
                />
              </div>
            </>
          )}

          {(mode === 'TAKEAWAY' || mode === 'DELIVERY' || mode === 'PICKUP') && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Customer Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Name"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03XX..."
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {mode === 'DELIVERY' && (
                <>
                  <div>
                    <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Delivery Address *</label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Full address"
                      className="w-full rounded-lg border-2 border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 px-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Delivery Notes</label>
                    <input
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Landmark, gate code..."
                      className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="text-[9px] uppercase font-extrabold text-slate-600 block mb-1">Special Requests</label>
            <input
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="Any preferences..."
              className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800/50 border-2 border-dashed border-slate-200 dark:border-neutral-700 p-8 text-center">
              <ShoppingBag className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">Empty cart</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Click menu items to add</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartLine
                key={item.cartId}
                item={item}
                onQty={(q) => updateQty(item.cartId, q)}
                onRemove={() => removeItem(item.cartId)}
                onInstruction={(n) => updateInstruction(item.cartId, n)}
              />
            ))
          )}
        </div>

        {/* Checkout */}
        {cart.length > 0 && (
          <div className="border-t-2 border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/30 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input type="number" placeholder="Discount" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />
              <input type="number" placeholder="Tax %" value={taxPct || ''} onChange={(e) => setTaxPct(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />
              <input type="number" placeholder="Service %" value={serviceChargePct || ''} onChange={(e) => setServiceChargePct(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />
              {mode === 'DELIVERY' && <input type="number" placeholder="Delivery fee" value={deliveryFee || ''} onChange={(e) => setDeliveryFee(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />}
              {mode !== 'DINE_IN' && <input type="number" placeholder="Packaging" value={packagingFee || ''} onChange={(e) => setPackagingFee(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />}
              <input type="number" placeholder="Tip" value={tip || ''} onChange={(e) => setTip(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 font-bold tabular-nums" />
            </div>

            <div className="rounded-xl bg-gradient-to-br from-slate-950 to-emerald-900 text-white p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
              {svc > 0 && <div className="flex justify-between"><span className="text-white/70">Service</span><span className="font-bold tabular-nums">{formatPKR(svc)}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(tax)}</span></div>}
              {deliveryFee > 0 && <div className="flex justify-between"><span className="text-white/70">Delivery</span><span className="font-bold tabular-nums">{formatPKR(deliveryFee)}</span></div>}
              {packagingFee > 0 && <div className="flex justify-between"><span className="text-white/70">Packaging</span><span className="font-bold tabular-nums">{formatPKR(packagingFee)}</span></div>}
              {tip > 0 && <div className="flex justify-between text-amber-300"><span>Tip</span><span className="font-bold tabular-nums">{formatPKR(tip)}</span></div>}
              {discount > 0 && <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(discount)}</span></div>}
              <div className="pt-1 mt-1 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-2xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-orange-600 to-red-700"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSubmit}
            >
              <CheckCircle2 className="h-5 w-5" />
              Place Order
            </Button>
          </div>
        )}
      </aside>

      {modifierPickerItem && (
        <ModifierPicker
          menuItem={modifierPickerItem}
          onConfirm={(selected: any[]) => {
            const modTotal = selected.reduce((s: number, m: any) => s + m.priceAdjustment * m.quantity, 0);
            setCart((prev) => [...prev, {
              cartId: 'c' + Date.now(),
              productId: modifierPickerItem.productId,
              quantity: 1,
              unit: modifierPickerItem.product?.unit || 'piece',
              basePrice: modifierPickerItem.product?.price ?? 0,
              product: modifierPickerItem.product,
              menuItem: modifierPickerItem,
              selectedModifiers: selected,
            }]);
            toast.success(modifierPickerItem.product?.name + ' added with modifiers');
            setModifierPickerItem(null);
          }}
          onClose={() => setModifierPickerItem(null)}
        />
      )}
    </div>
  );
}

function CartLine({ item, onQty, onRemove, onInstruction }: {
  item: any;
  onQty: (q: number) => void;
  onRemove: () => void;
  onInstruction: (note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const modTotal = item.selectedModifiers.reduce((s: number, m: any) => s + m.priceAdjustment * m.quantity, 0);
  const lineTotal = (item.basePrice + modTotal) * item.quantity;

  return (
    <div className="rounded-xl bg-white dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{item.product?.name}</div>
          {item.selectedModifiers.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {item.selectedModifiers.map((m: any, i: number) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[9px] font-extrabold">
                  {m.optionName}
                  {m.priceAdjustment !== 0 && ' (' + (m.priceAdjustment > 0 ? '+' : '') + formatPKR(m.priceAdjustment) + ')'}
                </span>
              ))}
            </div>
          )}
          {item.specialInstructions && (
            <div className="mt-1 text-[10px] italic text-amber-700 dark:text-amber-400">📝 {item.specialInstructions}</div>
          )}
        </div>
        <button onClick={onRemove} className="h-7 w-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="inline-flex items-center bg-slate-100 dark:bg-neutral-900 rounded-lg overflow-hidden">
          <button onClick={() => onQty(item.quantity - 1)} className="h-8 w-8 hover:bg-slate-200 font-extrabold">−</button>
          <span className="h-8 w-10 flex items-center justify-center text-sm font-extrabold tabular-nums">{item.quantity}</span>
          <button onClick={() => onQty(item.quantity + 1)} className="h-8 w-8 bg-orange-600 text-white hover:bg-orange-700 font-extrabold">+</button>
        </div>
        <button
          onClick={() => setShowNote(!showNote)}
          className="text-[10px] font-extrabold text-blue-600 hover:text-blue-700"
        >
          <MessageSquare className="h-3 w-3 inline mr-0.5" />
          {showNote ? 'Hide' : 'Note'}
        </button>
        <div className="text-right">
          <div className="font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKR(lineTotal)}</div>
        </div>
      </div>

      {showNote && (
        <input
          value={item.specialInstructions || ''}
          onChange={(e) => onInstruction(e.target.value)}
          placeholder="e.g. Less oil, extra spicy..."
          className="mt-2 h-8 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
}

function ModifierPicker({ menuItem, onConfirm, onClose }: {
  menuItem: any;
  onConfirm: (selected: Array<{ modifierOptionId: string; optionName: string; quantity: number; priceAdjustment: number }>) => void;
  onClose: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const groups = menuItem.modifiers?.map((mm: any) => mm.modifierGroup).filter(Boolean) ?? [];

  const toggle = (groupId: string, optionId: string, maxSel: number) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const already = current.includes(optionId);
      if (already) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (maxSel === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const canConfirm = groups.every((g: any) => {
    const sel = selections[g.id] || [];
    if (g.isRequired && sel.length < g.minSelections) return false;
    return true;
  });

  const handleConfirm = () => {
    const selected: any[] = [];
    for (const g of groups) {
      const sel = selections[g.id] || [];
      for (const optId of sel) {
        const opt = g.options.find((o: any) => o.id === optId);
        if (opt) selected.push({
          modifierOptionId: opt.id,
          optionName: opt.name,
          quantity: 1,
          priceAdjustment: opt.priceAdjustment || 0,
        });
      }
    }
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-extrabold text-white/70">Customize</div>
            <h3 className="font-extrabold text-lg">{menuItem.product?.name}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {groups.map((g: any) => {
            const sel = selections[g.id] || [];
            return (
              <div key={g.id} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">{g.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">
                      {g.isRequired ? 'Required' : 'Optional'} • Choose {g.minSelections}-{g.maxSelections}
                    </div>
                  </div>
                  <span className={
                    'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ' +
                    (g.isRequired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')
                  }>
                    {sel.length}/{g.maxSelections}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {g.options?.filter((o: any) => o.isActive).map((opt: any) => {
                    const active = sel.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => toggle(g.id, opt.id, g.maxSelections)}
                        className={
                          'p-2 rounded-lg border-2 text-left text-xs font-extrabold transition ' +
                          (active
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 shadow'
                            : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-orange-300')
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            {opt.emoji && <span>{opt.emoji}</span>}
                            {opt.name}
                          </span>
                          {opt.priceAdjustment !== 0 && (
                            <span className={opt.priceAdjustment > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {opt.priceAdjustment > 0 ? '+' : ''}{formatPKR(opt.priceAdjustment)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            <Plus className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  );
}
