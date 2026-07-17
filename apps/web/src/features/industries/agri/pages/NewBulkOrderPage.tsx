import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Package, X, Truck, MapPin, Calendar, Sprout, Tractor,
} from 'lucide-react';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { agriProductsApi } from '../api/products.api';
import { farmersApi } from '../api/farmers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const SEASONS = [
  { value: '', label: 'Select Season' },
  { value: 'KHARIF', label: '🌧️ Kharif' },
  { value: 'RABI', label: '❄️ Rabi' },
  { value: 'ZAID', label: '☀️ Zaid' },
  { value: 'ALL_SEASON', label: '🌍 All Season' },
];

const COMMON_CROPS = ['Wheat', 'Rice', 'Cotton', 'Sugarcane', 'Maize', 'Potato', 'Tomato', 'Onion', 'Chilli', 'Pulses', 'Fodder'];

const TRANSPORT_TYPES = ['Tractor Trolley', 'Truck', 'Pickup', 'Rickshaw', 'Bullock Cart', 'Self Pickup'];

interface OrderItem {
  productId?: string;
  productName: string;
  category?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  discount: number;
  batchNumber?: string;
}

export default function NewBulkOrderPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    farmerId: '',
    customerName: '',
    customerPhone: '',
    deliveryDate: '',
    season: '',
    cropTarget: '',
    landAreaAcres: '',
    isDelivery: false,
    deliveryAddress: '',
    deliveryCharges: 0,
    transportType: '',
    vehicleNumber: '',
    bulkDiscount: 0,
    taxAmount: 0,
    otherCharges: 0,
    isCredit: false,
    creditDueDate: '',
    advisorNotes: '',
    farmerNotes: '',
  });

  const [items, setItems] = useState<OrderItem[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [showFarmerPicker, setShowFarmerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);

  const { data: farmers = [] } = useQuery({
    queryKey: ['farmers-for-bulk-order', farmerSearch],
    queryFn: () => farmersApi.list({ search: farmerSearch || undefined }),
    enabled: showFarmerPicker,
  });

  const { data: agriProducts = [] } = useQuery({
    queryKey: ['agri-products-for-order'],
    queryFn: () => agriProductsApi.list({}),
    enabled: showProductPicker,
  });

  const subtotal = items.reduce((s, it) => s + (it.quantity * it.pricePerUnit) - it.discount, 0);
  const total = Math.max(subtotal + Number(form.deliveryCharges) + Number(form.taxAmount) + Number(form.otherCharges) - Number(form.bulkDiscount), 0);

  const createMutation = useMutation({
    mutationFn: () => bulkOrdersApi.create({
      ...form,
      landAreaAcres: form.landAreaAcres ? Number(form.landAreaAcres) : null,
      deliveryCharges: Number(form.deliveryCharges) || 0,
      bulkDiscount: Number(form.bulkDiscount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      items: items.filter((it) => it.productName && it.quantity > 0),
    }),
    onSuccess: (order) => {
      toast.success('Order ' + order.orderNumber + ' created');
      navigate('/agri/bulk-orders');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addProduct = (p: any) => {
    setItems([...items, {
      productId: p.productId,
      productName: p.product?.name || 'Product',
      category: p.category,
      quantity: 1,
      unit: p.packUnit || 'bag',
      pricePerUnit: p.product?.price ?? 0,
      discount: 0,
    }]);
    setShowProductPicker(false);
  };

  const addCustomItem = () => setItems([...items, { productName: '', quantity: 1, unit: 'bag', pricePerUnit: 0, discount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<OrderItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const canSubmit = items.length > 0 && (form.customerName || form.farmerId) && items.every((it) => it.productName && it.quantity > 0 && it.pricePerUnit > 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-900 to-cyan-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/agri/bulk-orders')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Bulk Order
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📦 Create Order</h1>
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
          {/* Farmer / Customer */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-teal-600" />
              Farmer / Customer
            </h3>
            {selectedFarmer ? (
              <div className="rounded-xl bg-teal-50 dark:bg-teal-950/30 border-2 border-teal-200 p-3 flex items-center gap-3">
                <Tractor className="h-5 w-5 text-teal-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{selectedFarmer.fullName}</div>
                  <div className="text-xs text-slate-600 font-bold">{selectedFarmer.farmerNumber} • {selectedFarmer.phone}</div>
                </div>
                <button onClick={() => { setSelectedFarmer(null); setForm({ ...form, farmerId: '', customerName: '', customerPhone: '' }); }} className="text-xs font-extrabold text-teal-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowFarmerPicker(!showFarmerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-teal-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Registered Farmer
                </button>
                {showFarmerPicker && (
                  <div className="rounded-xl border-2 border-teal-300 bg-teal-50/50 p-3 space-y-2">
                    <input autoFocus value={farmerSearch} onChange={(e) => setFarmerSearch(e.target.value)} placeholder="Search farmer name, phone, CNIC..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {farmers.map((f) => (
                        <button key={f.id} onClick={() => { setSelectedFarmer(f); setForm({ ...form, farmerId: f.id, customerName: f.fullName, customerPhone: f.phone }); setShowFarmerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <Tractor className="h-3.5 w-3.5 text-slate-400" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-extrabold truncate">{f.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-bold">{f.farmerNumber} • {f.village || f.district}</div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">{f.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name (if walk-in)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                </div>
              </>
            )}
          </section>

          {/* Crop & Season */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-600" />
              Crop & Season
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <select value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-green-500">
                {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input value={form.cropTarget} onChange={(e) => setForm({ ...form, cropTarget: e.target.value })} placeholder="Target crop" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-green-500" />
              <input type="number" step="0.1" value={form.landAreaAcres} onChange={(e) => setForm({ ...form, landAreaAcres: e.target.value })} placeholder="Land (acres)" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-green-500" />
            </div>
            <div className="flex flex-wrap gap-1">
              {COMMON_CROPS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, cropTarget: c })} className={
                  'px-2 py-1 rounded-lg text-xs font-extrabold border-2 ' +
                  (form.cropTarget === c ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-green-300')
                }>{c}</button>
              ))}
            </div>
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="h-4 w-4 text-teal-600" />
                Order Items ({items.length})
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={addCustomItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Custom
                </Button>
                <Button size="sm" onClick={() => setShowProductPicker(true)} className="bg-gradient-to-r from-teal-600 to-cyan-700">
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
                  <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-extrabold text-slate-600">Item #{i + 1}</span>
                      <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <input value={item.productName} onChange={(e) => updateItem(i, { productName: e.target.value })} placeholder="Product name (e.g. Urea Fertilizer 50kg)" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-teal-500" />
                    <div className="grid grid-cols-4 gap-2">
                      <input type="number" min="0.1" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} placeholder="Qty" className="h-10 rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                      <input value={item.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} placeholder="Unit" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold text-center focus:outline-none focus:border-teal-500" />
                      <input type="number" step="0.01" value={item.pricePerUnit} onChange={(e) => updateItem(i, { pricePerUnit: Number(e.target.value) })} placeholder="Price/unit" className="h-10 rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                      <input type="number" value={item.discount} onChange={(e) => updateItem(i, { discount: Number(e.target.value) })} placeholder="Disc" className="h-10 rounded-lg border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-rose-500" />
                    </div>
                    <input value={item.batchNumber || ''} onChange={(e) => updateItem(i, { batchNumber: e.target.value })} placeholder="Batch # (optional)" className="h-8 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-mono font-bold focus:outline-none focus:border-teal-500" />
                    <div className="text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                      = {formatPKR((item.quantity * item.pricePerUnit) - item.discount)}
                    </div>
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
                <div className="text-xs text-slate-500 font-semibold">Deliver to farmer's address</div>
              </div>
            </label>
            {form.isDelivery && (
              <div className="space-y-3 pl-8">
                <textarea rows={2} value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Delivery address..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500 resize-none" />
                <div className="grid sm:grid-cols-3 gap-2">
                  <input type="datetime-local" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                  <select value={form.transportType} onChange={(e) => setForm({ ...form, transportType: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                    <option value="">-- Transport --</option>
                    {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="Vehicle #" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Delivery Charges</label>
                  <input type="number" value={form.deliveryCharges} onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })} placeholder="0" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            )}
          </section>

          {/* Credit */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.isCredit} onChange={(e) => setForm({ ...form, isCredit: e.target.checked })} className="h-5 w-5 rounded" />
              <div className="flex-1">
                <div className="text-sm font-extrabold text-amber-700">Udhar / Credit Order</div>
                <div className="text-xs text-slate-500 font-semibold">Farmer will pay later</div>
              </div>
            </label>
            {form.isCredit && (
              <div className="pl-8">
                <label className="text-[10px] uppercase font-extrabold text-amber-700 mb-1 block">Credit Due Date</label>
                <input type="date" value={form.creditDueDate} onChange={(e) => setForm({ ...form, creditDueDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <textarea rows={2} value={form.advisorNotes} onChange={(e) => setForm({ ...form, advisorNotes: e.target.value })} placeholder="Advisor notes (what products farmer needs)..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-teal-500 resize-none" />
            <textarea rows={2} value={form.farmerNotes} onChange={(e) => setForm({ ...form, farmerNotes: e.target.value })} placeholder="Farmer's notes / special requests..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-slate-500 resize-none" />
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-teal-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Items</span><span className="font-bold tabular-nums">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
                {form.isDelivery && Number(form.deliveryCharges) > 0 && (
                  <div className="flex justify-between text-blue-300"><span>Delivery</span><span className="font-bold tabular-nums">+{formatPKR(Number(form.deliveryCharges))}</span></div>
                )}
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Bulk Discount</label>
                  <input type="number" value={form.bulkDiscount} onChange={(e) => setForm({ ...form, bulkDiscount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax</label>
                  <input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Other Charges</label>
                  <input type="number" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-teal-600 to-cyan-700">
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
            <div className="px-5 py-3 border-b bg-teal-50 dark:bg-teal-950/30 flex items-center justify-between">
              <h3 className="font-extrabold">Select Product</h3>
              <button onClick={() => setShowProductPicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-2 gap-2">
              {agriProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)} className="p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 hover:border-teal-500 hover:shadow-lg text-left">
                  <div className="font-extrabold text-sm truncate">{p.product?.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{p.category?.replace('_', ' ')}</div>
                  <div className="mt-1 text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.product?.price ?? 0)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
