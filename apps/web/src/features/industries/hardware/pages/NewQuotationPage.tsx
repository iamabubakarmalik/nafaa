import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Sparkles, FileText, X,
  Search, Package, DollarSign, Calendar,
} from 'lucide-react';
import { quotationsApi } from '../api/quotations.api';
import { projectsApi } from '../api/projects.api';
import { productsApi } from '@/api/products.api';
import { customersApi } from '@/api/customers.api';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { toast } from 'sonner';

const UNITS = ['BAG', 'KG', 'TON', 'PIECE', 'DOZEN', 'CARTON', 'METER', 'FEET', 'SQFT', 'SQMETER', 'CUBIC_FEET', 'LITER', 'BUNDLE', 'ROLL', 'SHEET', 'BOX', 'SET', 'TRIP'];

interface QItem {
  productId?: string;
  itemName: string;
  itemDescription: string;
  brand: string;
  specifications: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  discountPct: number;
}

export default function NewQuotationPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    projectId: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    validityDays: 15,
    discount: 0,
    discountPct: 0,
    taxAmount: 0,
    taxPct: 17,
    deliveryCharges: 0,
    laborCharges: 0,
    otherCharges: 0,
    paymentTerms: '50% advance, 50% before delivery',
    deliveryTerms: 'Delivery within 3-5 working days',
    warrantyTerms: 'Standard warranty as per brand',
    specialTerms: '',
    customerNotes: '',
    internalNotes: '',
  });

  const [items, setItems] = useState<QItem[]>([{
    itemName: '', itemDescription: '', brand: '', specifications: '',
    quantity: 1, unit: 'PIECE', unitPrice: 0, discount: 0, discountPct: 0,
  }]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-quotation', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-quotation', productSearch],
    queryFn: () => productsApi.list({ limit: 30, search: productSearch || undefined }),
    enabled: showProductPicker !== null,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-quotation'],
    queryFn: () => projectsApi.list({ active: true }),
  });

  const subtotal = items.reduce((s, it) => {
    const base = it.quantity * it.unitPrice;
    const disc = it.discount || (it.discountPct ? (base * it.discountPct) / 100 : 0);
    return s + Math.max(base - disc, 0);
  }, 0);

  const overallDiscount = Number(form.discount) || (Number(form.discountPct) ? (subtotal * Number(form.discountPct)) / 100 : 0);
  const taxCalc = Number(form.taxAmount) || (Number(form.taxPct) ? ((subtotal - overallDiscount) * Number(form.taxPct)) / 100 : 0);
  const total = Math.max(subtotal - overallDiscount + taxCalc + Number(form.deliveryCharges) + Number(form.laborCharges) + Number(form.otherCharges), 0);

  const createMutation = useMutation({
    mutationFn: () => quotationsApi.create({
      ...form,
      projectId: form.projectId || undefined,
      customerId: form.customerId || undefined,
      validityDays: Number(form.validityDays) || 15,
      discount: Number(form.discount) || 0,
      discountPct: Number(form.discountPct) || 0,
      taxAmount: Number(form.taxAmount) || 0,
      taxPct: Number(form.taxPct) || 0,
      deliveryCharges: Number(form.deliveryCharges) || 0,
      laborCharges: Number(form.laborCharges) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      items: items.filter((it) => it.itemName.trim()).map((it) => ({
        ...it,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        discountPct: Number(it.discountPct) || 0,
      })),
    }),
    onSuccess: (q) => {
      toast.success('Quotation ' + q.quotationNumber + ' created');
      navigate('/hardware/quotations/' + q.id);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addItem = () => setItems([...items, { itemName: '', itemDescription: '', brand: '', specifications: '', quantity: 1, unit: 'PIECE', unitPrice: 0, discount: 0, discountPct: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, patch: Partial<QItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));

  const pickProduct = (i: number, p: any) => {
    updateItem(i, {
      productId: p.id,
      itemName: p.name,
      brand: p.brand?.name || '',
      unitPrice: p.price,
    });
    setShowProductPicker(null);
    setProductSearch('');
  };

  const canSubmit = items.some((it) => it.itemName.trim()) && form.customerName.trim();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-violet-900 to-purple-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hardware/quotations')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Quotation
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">📄 Create Estimate</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Create Quotation
          </Button>
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Customer & Project */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold flex items-center gap-2"><User className="h-4 w-4 text-violet-600" />Customer & Project</h3>

            {form.customerId ? (
              <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-violet-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', customerEmail: '' })} className="text-xs font-extrabold text-violet-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-violet-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Existing Customer
                </button>
                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-violet-300 bg-violet-50/50 p-3 space-y-2">
                    <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold" />
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {(customersData?.items ?? []).map((c) => (
                        <button key={c.id} onClick={() => { setForm({ ...form, customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerEmail: (c as any).email || '' }); setShowCustomerPicker(false); }} className="w-full px-3 py-2 flex items-center gap-2 rounded hover:bg-white text-left">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-extrabold flex-1 truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                </div>
                <input value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder="Email" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <textarea rows={2} value={form.customerAddress} onChange={(e) => setForm({ ...form, customerAddress: e.target.value })} placeholder="Billing address" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
              </>
            )}

            {projects.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Link to Project</label>
                <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                  <option value="">-- No project --</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.projectNumber} • {p.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Validity (days)</label>
              <input type="number" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            </div>
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold flex items-center gap-2"><Package className="h-4 w-4 text-violet-600" />Items ({items.length})</h3>
              <Button size="sm" onClick={addItem} className="bg-gradient-to-r from-violet-600 to-purple-700">
                <Plus className="h-3.5 w-3.5" />Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-800/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-extrabold text-slate-600">Item #{i + 1}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setShowProductPicker(i)} className="h-7 px-2 rounded bg-violet-100 text-violet-700 text-[10px] font-extrabold hover:bg-violet-200 inline-flex items-center gap-1">
                        <Package className="h-3 w-3" />Pick Product
                      </button>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="h-7 w-7 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    <input value={item.itemName} onChange={(e) => updateItem(i, { itemName: e.target.value })} placeholder="Item name *" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                    <input value={item.brand} onChange={(e) => updateItem(i, { brand: e.target.value })} placeholder="Brand" className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />
                  </div>

                  <input value={item.specifications} onChange={(e) => updateItem(i, { specifications: e.target.value })} placeholder="Specifications (grade, size, model...)" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-bold focus:outline-none focus:border-violet-500" />

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[9px] uppercase font-extrabold text-slate-500">Qty</label>
                      <input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-violet-500" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-extrabold text-slate-500">Unit</label>
                      <select value={item.unit} onChange={(e) => updateItem(i, { unit: e.target.value })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-1 text-xs font-bold focus:outline-none focus:border-violet-500">
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-extrabold text-emerald-700">Unit Price</label>
                      <input type="number" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-extrabold text-rose-700">Disc %</label>
                      <input type="number" step="0.1" value={item.discountPct} onChange={(e) => updateItem(i, { discountPct: Number(e.target.value), discount: 0 })} className="h-10 w-full rounded-lg border-2 border-rose-200 bg-rose-50 dark:bg-rose-950/30 px-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-rose-500" />
                    </div>
                  </div>

                  <div className="text-right text-sm font-extrabold text-emerald-700 tabular-nums">
                    = {formatPKR(Math.max(item.quantity * item.unitPrice - (item.discount || (item.quantity * item.unitPrice * item.discountPct) / 100), 0))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Terms */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold">📋 Terms & Conditions</h3>
            <textarea rows={2} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} placeholder="Payment terms..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.deliveryTerms} onChange={(e) => setForm({ ...form, deliveryTerms: e.target.value })} placeholder="Delivery terms..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.warrantyTerms} onChange={(e) => setForm({ ...form, warrantyTerms: e.target.value })} placeholder="Warranty terms..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.specialTerms} onChange={(e) => setForm({ ...form, specialTerms: e.target.value })} placeholder="Special terms" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
            <textarea rows={2} value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} placeholder="Notes visible to customer" className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500 resize-none" />
          </section>
        </div>

        {/* Summary sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-violet-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase font-extrabold text-white/70 mb-3">💰 Summary</div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Items</span><span className="font-bold tabular-nums">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" value={form.discountPct} onChange={(e) => setForm({ ...form, discountPct: e.target.value, discount: 0 })} placeholder="Disc %" className="h-9 rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40" />
                  <input type="number" value={form.taxPct} onChange={(e) => setForm({ ...form, taxPct: e.target.value, taxAmount: 0 })} placeholder="Tax %" className="h-9 rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40" />
                </div>
                <input type="number" value={form.deliveryCharges} onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })} placeholder="Delivery charges" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40" />
                <input type="number" value={form.laborCharges} onChange={(e) => setForm({ ...form, laborCharges: e.target.value })} placeholder="Labor charges" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40" />
                <input type="number" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} placeholder="Other charges" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40" />
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>

            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-violet-600 to-purple-700">
              <Save className="h-5 w-5" />
              Create Quotation
            </Button>
          </div>
        </aside>
      </div>

      {/* Product picker */}
      {showProductPicker !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-violet-50 dark:bg-violet-950/30 flex items-center justify-between">
              <h3 className="font-extrabold">Pick Product for Item #{showProductPicker + 1}</h3>
              <button onClick={() => setShowProductPicker(null)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3">
              <input autoFocus value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products..." className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {(productsData?.items ?? []).map((p: any) => (
                <button key={p.id} onClick={() => pickProduct(showProductPicker, p)} className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-slate-50 text-left">
                  <Package className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold truncate">{p.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">Stock: {p.stock}</div>
                  </div>
                  <div className="text-sm font-extrabold text-emerald-700 tabular-nums">{formatPKR(p.price)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
