import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Package, X, Weight, Truck, MapPin, Calendar,
} from 'lucide-react';
import { weightOrdersApi } from '../api/weight-orders.api';
import { meatProductsApi } from '../api/products.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

const OCCASIONS = [
  { value: '', label: 'Regular' },
  { value: 'EID_UL_ADHA', label: '🌙 Eid ul Adha' },
  { value: 'EID_UL_FITR', label: '🌙 Eid ul Fitr' },
  { value: 'AQEEQA', label: '👶 Aqeeqa' },
  { value: 'WALIMA', label: '💒 Walima' },
  { value: 'DAWAT', label: '🍽️ Dawat' },
  { value: 'RAMADAN', label: '🕌 Ramadan' },
];

interface OrderItem {
  productId?: string;
  productName: string;
  cutCategory?: string;
  requestedKg: number;
  pricePerKg: number;
  cuttingInstructions?: string;
  packagingNotes?: string;
}

export default function NewWeightOrderPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    neededBy: '',
    scheduledDelivery: '',
    isDelivery: false,
    deliveryAddress: '',
    deliveryCharges: 0,
    occasion: '',
    specialInstructions: '',
    cuttingStyle: '',
    packagingPref: '',
    numberOfPackets: '',
    taxAmount: 0,
    discount: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-meat-order', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: meatProducts = [] } = useQuery({
    queryKey: ['meat-products-for-order'],
    queryFn: () => meatProductsApi.list({}),
    enabled: showProductPicker,
  });

  const subtotal = items.reduce((s, it) => s + (it.requestedKg * it.pricePerKg), 0);
  const total = Math.max(subtotal + Number(form.deliveryCharges) + Number(form.taxAmount) - Number(form.discount), 0);

  const createMutation = useMutation({
    mutationFn: () => weightOrdersApi.create({
      ...form,
      deliveryCharges: Number(form.deliveryCharges) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      discount: Number(form.discount) || 0,
      numberOfPackets: form.numberOfPackets ? Number(form.numberOfPackets) : undefined,
      items: items.filter((it) => it.productName && it.requestedKg > 0),
    }),
    onSuccess: (order) => {
      toast.success('Order ' + order.orderNumber + ' created');
      navigate('/meat/weight-orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addProduct = (product: any) => {
    setItems([...items, {
      productId: product.productId,
      productName: product.product?.name || 'Meat',
      cutCategory: product.cutCategory,
      requestedKg: 1,
      pricePerKg: product.pricePerKg,
    }]);
    setShowProductPicker(false);
  };

  const addCustomItem = () => setItems([...items, { productName: '', requestedKg: 1, pricePerKg: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<OrderItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const canSubmit = items.length > 0 && (form.customerName || form.customerId) && items.every((it) => it.productName && it.requestedKg > 0 && it.pricePerKg > 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-orange-900 to-red-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/meat/weight-orders')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Order
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📦 Weight Order</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Create Order
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-orange-600" />
              Customer
            </h3>
            {form.customerId ? (
              <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border-2 border-orange-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-orange-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '' })} className="text-xs font-extrabold text-orange-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-orange-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Customer
                </button>
                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-orange-300 bg-orange-50/50 p-3 space-y-2">
                    <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(customersData?.items ?? []).map((c) => (
                        <button key={c.id} onClick={() => { setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '' }); setShowCustomerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
                </div>
              </>
            )}
          </section>

          {/* Occasion */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-600" />
              Occasion
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {OCCASIONS.map((o) => (
                <button key={o.value} onClick={() => setForm({ ...form, occasion: o.value })} className={
                  'p-3 rounded-xl border-2 text-xs font-extrabold transition ' +
                  (form.occasion === o.value ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300')
                }>{o.label}</button>
              ))}
            </div>
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                Order Items ({items.length})
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={addCustomItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Custom
                </Button>
                <Button size="sm" onClick={() => setShowProductPicker(true)} className="bg-gradient-to-r from-orange-600 to-red-700">
                  <Package className="h-3.5 w-3.5" />
                  Add Product
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Package className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">No items added</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-slate-600">Item #{i + 1}</span>
                      <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <input value={item.productName} onChange={(e) => updateItem(i, { productName: e.target.value })} placeholder="Product/cut name (e.g. Mutton Ran)" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-blue-700 mb-0.5 block">Weight (kg)</label>
                        <input type="number" step="0.1" min="0.1" value={item.requestedKg} onChange={(e) => updateItem(i, { requestedKg: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Price/kg</label>
                        <input type="number" step="0.01" value={item.pricePerKg} onChange={(e) => updateItem(i, { pricePerKg: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Total</label>
                        <div className="h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 px-2 flex items-center justify-center text-sm font-extrabold text-emerald-800 tabular-nums">
                          {formatPKR(item.requestedKg * item.pricePerKg)}
                        </div>
                      </div>
                    </div>

                    <textarea rows={2} value={item.cuttingInstructions || ''} onChange={(e) => updateItem(i, { cuttingInstructions: e.target.value })} placeholder="Cutting instructions (e.g. medium pieces, boti size...)" className="w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-orange-500 resize-none" />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Delivery */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isDelivery} onChange={(e) => setForm({ ...form, isDelivery: e.target.checked })} className="h-5 w-5 rounded" />
              <Truck className={'h-5 w-5 ' + (form.isDelivery ? 'text-blue-600' : 'text-slate-400')} />
              <div className="flex-1">
                <div className="text-sm font-extrabold">Home Delivery</div>
                <div className="text-xs text-slate-500 font-semibold">Deliver to customer's address</div>
              </div>
            </label>
            {form.isDelivery && (
              <div className="space-y-3 pl-8">
                <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Scheduled Delivery</label>
                    <input type="datetime-local" value={form.scheduledDelivery} onChange={(e) => setForm({ ...form, scheduledDelivery: e.target.value })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Delivery Charges</label>
                    <input type="number" value={form.deliveryCharges} onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })} placeholder="0" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Preparation */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              Preparation
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input value={form.cuttingStyle} onChange={(e) => setForm({ ...form, cuttingStyle: e.target.value })} placeholder="Cutting style" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
              <input value={form.packagingPref} onChange={(e) => setForm({ ...form, packagingPref: e.target.value })} placeholder="Packaging preference" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500" />
              <input type="number" value={form.numberOfPackets} onChange={(e) => setForm({ ...form, numberOfPackets: e.target.value })} placeholder="No. of packets" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-purple-500" />
            </div>
            <textarea rows={2} value={form.specialInstructions} onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })} placeholder="Special instructions..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none" />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-orange-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Items</span><span className="font-bold tabular-nums">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Total kg</span><span className="font-bold tabular-nums">{items.reduce((s, it) => s + it.requestedKg, 0).toFixed(1)}kg</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {form.isDelivery && Number(form.deliveryCharges) > 0 && (
                  <div className="flex justify-between text-blue-300"><span>Delivery</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.deliveryCharges))}</span></div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-orange-600 to-red-700">
              <Save className="h-5 w-5" />
              Create Order
            </Button>
          </div>
        </aside>
      </div>

      {/* Product picker modal */}
      {showProductPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b bg-orange-50 dark:bg-orange-950/30 flex items-center justify-between">
              <h3 className="font-extrabold">Select Meat Product</h3>
              <button onClick={() => setShowProductPicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-2 gap-2">
              {meatProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)} className="p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 hover:border-orange-500 hover:shadow-lg text-left">
                  <div className="font-extrabold text-sm truncate">{p.product?.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{p.animalType} • {p.cutCategory?.replace('_', ' ')}</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.pricePerKg)}/kg</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
