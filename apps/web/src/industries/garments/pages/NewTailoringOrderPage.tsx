import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Scissors, X, Ruler, Camera, Calendar, Zap, Package, Palette,
} from 'lucide-react';
import { tailoringApi } from '../api/tailoring.api';
import { measurementsApi } from '../api/measurements.api';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

const CATEGORY_OPTIONS = [
  { value: 'KURTA', label: 'Kurta', emoji: '👘' },
  { value: 'SHALWAR_KAMEEZ', label: 'Shalwar Kameez', emoji: '👗' },
  { value: 'THREE_PIECE', label: '3-Piece Suit', emoji: '🧥' },
  { value: 'SUIT', label: 'Suit', emoji: '🤵' },
  { value: 'SHIRT', label: 'Shirt', emoji: '👔' },
  { value: 'TROUSER', label: 'Trouser', emoji: '👖' },
  { value: 'ABAYA', label: 'Abaya', emoji: '🧕' },
  { value: 'LEHENGA', label: 'Lehenga', emoji: '💃' },
  { value: 'FROCK', label: 'Frock', emoji: '👗' },
  { value: 'MAXI', label: 'Maxi', emoji: '👗' },
  { value: 'GOWN', label: 'Gown', emoji: '👗' },
  { value: 'WAISTCOAT', label: 'Waistcoat', emoji: '🦺' },
  { value: 'OTHER', label: 'Other', emoji: '👔' },
];

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: 'bg-slate-500', emoji: '🐢' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-500', emoji: '📌' },
  { value: 'HIGH', label: 'High', color: 'bg-amber-500', emoji: '⚡' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-600', emoji: '🔥' },
];

interface OrderItem {
  garmentName: string;
  categoryType: string;
  quantity: number;
  fabricMeters?: number;
  fabricCost: number;
  stitchingCost: number;
  embroideryCost: number;
  accessoryCost: number;
  size: string;
  colorName: string;
  designNotes: string;
  referenceImageUrls: string[];
}

export default function NewTailoringOrderPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerNotes: '',
    measurementProfileId: '',
    priority: 'NORMAL',
    promisedDate: '',
    designInstructions: '',
    designReferenceUrls: [] as string[],
    internalNotes: '',
    discount: 0,
    taxAmount: 0,
  });

  const [items, setItems] = useState<OrderItem[]>([{
    garmentName: '',
    categoryType: 'KURTA',
    quantity: 1,
    fabricMeters: 0,
    fabricCost: 0,
    stitchingCost: 0,
    embroideryCost: 0,
    accessoryCost: 0,
    size: '',
    colorName: '',
    designNotes: '',
    referenceImageUrls: [],
  }]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-tailoring', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: customerMeasurements = [] } = useQuery({
    queryKey: ['customer-measurements', form.customerId],
    queryFn: () => measurementsApi.byCustomer(form.customerId),
    enabled: !!form.customerId,
  });

  // Totals
  const subtotal = items.reduce((sum, it) => {
    const q = it.quantity || 1;
    return sum + (it.stitchingCost + it.embroideryCost + it.accessoryCost) * q + it.fabricCost;
  }, 0);
  const stitchingTotal = items.reduce((s, it) => s + (it.stitchingCost || 0) * (it.quantity || 1), 0);
  const embroideryTotal = items.reduce((s, it) => s + (it.embroideryCost || 0) * (it.quantity || 1), 0);
  const fabricTotal = items.reduce((s, it) => s + (it.fabricCost || 0), 0);
  const accessoryTotal = items.reduce((s, it) => s + (it.accessoryCost || 0) * (it.quantity || 1), 0);
  const total = Math.max(subtotal + Number(form.taxAmount || 0) - Number(form.discount || 0), 0);

  const createMutation = useMutation({
    mutationFn: () => tailoringApi.create({
      ...form,
      discount: Number(form.discount) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      items: items.filter((it) => it.garmentName.trim()).map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        fabricMeters: it.fabricMeters ? Number(it.fabricMeters) : undefined,
        fabricCost: Number(it.fabricCost) || 0,
        stitchingCost: Number(it.stitchingCost) || 0,
        embroideryCost: Number(it.embroideryCost) || 0,
        accessoryCost: Number(it.accessoryCost) || 0,
      })),
    }),
    onSuccess: (order) => {
      toast.success('Order ' + order.orderNumber + ' created');
      navigate('/garments/tailoring/' + order.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addItem = () => setItems([...items, {
    garmentName: '', categoryType: 'KURTA', quantity: 1,
    fabricMeters: 0, fabricCost: 0, stitchingCost: 0, embroideryCost: 0, accessoryCost: 0,
    size: '', colorName: '', designNotes: '', referenceImageUrls: [],
  }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<OrderItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const canSubmit = items.some((it) => it.garmentName.trim() && it.quantity > 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-violet-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-purple-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/garments/tailoring')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Tailoring Order
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">✂️ Custom Stitching Order</h1>
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
          {/* Customer section */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-purple-600" />
              Customer Information
            </h3>

            {form.customerId ? (
              <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <div className="font-extrabold text-slate-900 dark:text-white">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button
                  onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', measurementProfileId: '' })}
                  className="text-xs font-extrabold text-purple-600 hover:underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowCustomerPicker(!showCustomerPicker)}
                  className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 dark:border-neutral-600 bg-slate-50 dark:bg-neutral-800 text-sm font-extrabold text-slate-600 hover:border-purple-400"
                >
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Customer
                </button>

                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-purple-300 bg-purple-50/50 p-3 space-y-2">
                    <input
                      autoFocus
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer name or phone..."
                      className="h-10 w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
                    />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(customersData?.items ?? []).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '' });
                            setShowCustomerPicker(false);
                            setCustomerSearch('');
                          }}
                          className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white dark:hover:bg-neutral-800 text-left"
                        >
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    placeholder="Customer name (or walk-in)"
                    className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
                  />
                  <input
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="Phone"
                    className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </>
            )}

            {/* Measurement picker */}
            {form.customerId && customerMeasurements.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Measurement Profile</label>
                <select
                  value={form.measurementProfileId}
                  onChange={(e) => setForm({ ...form, measurementProfileId: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- No measurement --</option>
                  {customerMeasurements.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.profileName} {m.isDefault ? '(Default)' : ''} • {m.unit}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              rows={2}
              value={form.customerNotes}
              onChange={(e) => setForm({ ...form, customerNotes: e.target.value })}
              placeholder="Customer's notes or special requests..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none"
            />
          </section>

          {/* Priority + Delivery */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-2 block">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setForm({ ...form, priority: p.value })}
                    className={
                      'p-2 rounded-xl border-2 text-center transition ' +
                      (form.priority === p.value ? p.color + ' border-transparent text-white shadow' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-purple-300')
                    }
                  >
                    <div className="text-xl">{p.emoji}</div>
                    <div className="text-[10px] font-extrabold mt-0.5">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Promised Delivery Date</label>
              <input
                type="date"
                value={form.promisedDate}
                onChange={(e) => setForm({ ...form, promisedDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
              />
            </div>
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="h-4 w-4 text-purple-600" />
                Garments ({items.length})
              </h3>
              <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-purple-600 to-violet-700">
                <Plus className="h-3.5 w-3.5" />
                Add Garment
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-600">Garment #{i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Type *</label>
                    <div className="flex flex-wrap gap-1">
                      {CATEGORY_OPTIONS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => updateItem(i, { categoryType: c.value, garmentName: item.garmentName || c.label })}
                          className={
                            'px-2 py-1 rounded-lg text-xs font-extrabold border-2 transition ' +
                            (item.categoryType === c.value ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 hover:border-purple-300')
                          }
                        >
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-6 gap-2">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Garment Name *</label>
                      <input
                        value={item.garmentName}
                        onChange={(e) => updateItem(i, { garmentName: e.target.value })}
                        placeholder="e.g. Chikankari Kurta"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-purple-700 mb-0.5 block">Qty</label>
                      <input
                        type="number" step="1" min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                        className="h-10 w-full rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Size</label>
                      <input
                        value={item.size}
                        onChange={(e) => updateItem(i, { size: e.target.value })}
                        placeholder="M / 40"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">Color</label>
                      <input
                        value={item.colorName}
                        onChange={(e) => updateItem(i, { colorName: e.target.value })}
                        placeholder="Pink"
                        className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Costs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <CostInput label="Fabric" value={item.fabricCost} onChange={(v: number) => updateItem(i, { fabricCost: v })} color="cyan" />
                    <CostInput label="Stitching" value={item.stitchingCost} onChange={(v: number) => updateItem(i, { stitchingCost: v })} color="purple" />
                    <CostInput label="Embroidery" value={item.embroideryCost} onChange={(v: number) => updateItem(i, { embroideryCost: v })} color="fuchsia" />
                    <CostInput label="Accessories" value={item.accessoryCost} onChange={(v: number) => updateItem(i, { accessoryCost: v })} color="amber" />
                  </div>

                  <textarea
                    rows={2}
                    value={item.designNotes}
                    onChange={(e) => updateItem(i, { designNotes: e.target.value })}
                    placeholder="Design details, embroidery pattern, special requests..."
                    className="w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-purple-500 resize-none"
                  />

                  <div className="pt-1 border-t border-slate-200 dark:border-neutral-700 flex justify-between text-sm">
                    <span className="text-slate-600 font-bold">Line Total:</span>
                    <span className="font-extrabold text-emerald-700 tabular-nums">
                      {formatPKR(((item.stitchingCost || 0) + (item.embroideryCost || 0) + (item.accessoryCost || 0)) * (item.quantity || 1) + (item.fabricCost || 0))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Design references */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="h-4 w-4 text-fuchsia-600" />
              Design References
            </h3>
            {form.designReferenceUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {form.designReferenceUrls.map((url: string, i: number) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm({ ...form, designReferenceUrls: form.designReferenceUrls.filter((_: any, idx: number) => idx !== i) })}
                      className="absolute top-1 right-1 h-5 w-5 rounded bg-rose-600 text-white flex items-center justify-center"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <UploadDropzone
              onUploaded={(records) => {
                const urls = Array.isArray(records)
                  ? records.map((r: any) => r.url || r).filter(Boolean)
                  : [(records as any)?.url || records];
                setForm({ ...form, designReferenceUrls: [...form.designReferenceUrls, ...urls] });
              }}
            />
            <textarea
              rows={3}
              value={form.designInstructions}
              onChange={(e) => setForm({ ...form, designInstructions: e.target.value })}
              placeholder="Overall design instructions..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500 resize-none"
            />
            <textarea
              rows={2}
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
              placeholder="Internal notes (only visible to staff)..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-slate-500 resize-none"
            />
          </section>
        </div>

        {/* Sticky sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-purple-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Order Summary</div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Fabric</span><span className="font-bold tabular-nums">{formatPKR(fabricTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Stitching</span><span className="font-bold tabular-nums">{formatPKR(stitchingTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Embroidery</span><span className="font-bold tabular-nums">{formatPKR(embroideryTotal)}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Accessories</span><span className="font-bold tabular-nums">{formatPKR(accessoryTotal)}</span></div>
                <div className="pt-2 border-t border-white/20 flex justify-between">
                  <span className="text-white/70 font-bold">Subtotal</span>
                  <span className="font-extrabold tabular-nums text-cyan-300">{formatPKR(subtotal)}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount (Rs)</label>
                  <input
                    type="number"
                    value={form.discount}
                    onChange={(e) => setForm({ ...form, discount: e.target.value })}
                    placeholder="0"
                    className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Tax (Rs)</label>
                  <input
                    type="number"
                    value={form.taxAmount}
                    onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
                    placeholder="0"
                    className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!canSubmit}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-violet-700"
            >
              <Save className="h-5 w-5" />
              Create Order
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CostInput({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 focus:border-cyan-500',
    purple: 'border-purple-200 bg-purple-50 dark:bg-purple-950/30 focus:border-purple-500',
    fuchsia: 'border-fuchsia-200 bg-fuchsia-50 dark:bg-fuchsia-950/30 focus:border-fuchsia-500',
    amber: 'border-amber-200 bg-amber-50 dark:bg-amber-950/30 focus:border-amber-500',
  };
  return (
    <div>
      <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-0.5 block">{label}</label>
      <input
        type="number" step="0.01" min="0"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="0"
        className={'h-10 w-full rounded-lg border-2 px-2 text-sm font-extrabold tabular-nums focus:outline-none ' + colors[color]}
      />
    </div>
  );
}
