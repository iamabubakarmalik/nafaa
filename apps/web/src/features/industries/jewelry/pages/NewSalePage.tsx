import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Save, Plus, Trash2, User, Phone, Search, Sparkles,
  Gem, X, Scale, Coins, ShieldCheck, Repeat, Calculator,
} from 'lucide-react';
import { jewelrySalesApi } from '../api/sales.api';
import { jewelryProductsApi } from '../api/products.api';
import { metalRatesApi } from '../api/metal-rates.api';
import { customersApi } from '@/api/customers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const CATEGORIES = [
  'RING', 'NECKLACE', 'EARRINGS', 'BANGLE', 'BRACELET', 'PENDANT', 'CHAIN',
  'NOSE_PIN', 'JHUMKA', 'CHOKER', 'MANGALSUTRA', 'KUNDAN_SET', 'BRIDAL_SET',
  'KADA', 'PAYAL', 'COIN', 'BAR', 'OTHER',
];

const METALS = [
  { value: 'GOLD', label: 'Gold', emoji: '🥇' },
  { value: 'SILVER', label: 'Silver', emoji: '🥈' },
  { value: 'PLATINUM', label: 'Platinum', emoji: '💠' },
  { value: 'ROSE_GOLD', label: 'Rose Gold', emoji: '🌹' },
  { value: 'WHITE_GOLD', label: 'White Gold', emoji: '⚪' },
];

const PURITIES = ['KARAT_24', 'KARAT_22', 'KARAT_21', 'KARAT_18', 'KARAT_14', 'SILVER_999', 'SILVER_925', 'PLATINUM_950'];

interface SaleItem {
  productId?: string;
  productName: string;
  category: string;
  metalType: string;
  purity: string;
  ratePerGram: number;
  grossWeight: number;
  netWeight: number;
  makingChargePerGram: number;
  makingChargeFixed: number;
  makingChargePct: number;
  wastagePct: number;
  polishCharges: number;
  hallmarkCharges: number;
  stoneValue: number;
  quantity: number;
  hallmarkNumber?: string;
  certificateNumber?: string;
}

export default function NewSalePage() {
  const navigate = useNavigate();

  const [form, setForm] = useState<any>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerCnic: '',
    customerAddress: '',
    gstAmount: 0,
    otherCharges: 0,
    discount: 0,
    paidAmount: 0,
    paymentMethod: 'CASH',
    exchangeMetalGrams: 0,
    exchangeMetalPurity: '',
    exchangeValue: 0,
    hallmarkVerified: false,
    hasCertificate: false,
    customerNotes: '',
    internalNotes: '',
  });

  const [items, setItems] = useState<SaleItem[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const { data: rates = [] } = useQuery({
    queryKey: ['metal-rates-for-sale'],
    queryFn: () => metalRatesApi.current(),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers-for-jewelry-sale', customerSearch],
    queryFn: () => customersApi.list({ limit: 50, search: customerSearch || undefined }),
    enabled: showCustomerPicker,
  });

  const { data: jewelryProducts = [] } = useQuery({
    queryKey: ['jewelry-products-for-sale'],
    queryFn: () => jewelryProductsApi.list({}),
    enabled: showProductPicker,
  });

  const getRate = (metalType: string, purity: string) => {
    return rates.find((r) => r.metalType === metalType && r.purity === purity)?.ratePerGram ?? 0;
  };

  // Calculate totals
  let subtotal = 0;
  let totalWeight = 0;
  const itemCalcs = items.map((it) => {
    const metalValue = it.netWeight * it.ratePerGram;
    const makingCharge = (it.makingChargePerGram * it.netWeight) + it.makingChargeFixed + (metalValue * it.makingChargePct / 100);
    const wastageValue = (it.wastagePct / 100) * metalValue;
    const itemTotal = (metalValue + makingCharge + wastageValue + it.polishCharges + it.hallmarkCharges + it.stoneValue) * it.quantity;
    subtotal += itemTotal;
    totalWeight += it.netWeight * it.quantity;
    return { metalValue, makingCharge, wastageValue, itemTotal };
  });

  const total = Math.max(subtotal + Number(form.gstAmount) + Number(form.otherCharges) - Number(form.discount) - Number(form.exchangeValue), 0);

  const createMutation = useMutation({
    mutationFn: () => jewelrySalesApi.create({
      ...form,
      gstAmount: Number(form.gstAmount) || 0,
      otherCharges: Number(form.otherCharges) || 0,
      discount: Number(form.discount) || 0,
      paidAmount: Number(form.paidAmount) || 0,
      exchangeMetalGrams: Number(form.exchangeMetalGrams) || 0,
      exchangeValue: Number(form.exchangeValue) || 0,
      exchangeMetalPurity: form.exchangeMetalPurity || undefined,
      items: items.filter((it) => it.productName && it.netWeight > 0),
    }),
    onSuccess: (sale) => {
      toast.success('Sale ' + sale.invoiceNumber + ' created');
      navigate('/jewelry/sales');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const addProduct = (p: any) => {
    const rate = getRate(p.metalType, p.purity);
    setItems([...items, {
      productId: p.productId,
      productName: p.product?.name || 'Item',
      category: p.category,
      metalType: p.metalType,
      purity: p.purity,
      ratePerGram: rate,
      grossWeight: p.grossWeight,
      netWeight: p.netWeight,
      makingChargePerGram: p.makingChargePerGram,
      makingChargeFixed: p.makingChargeFixed,
      makingChargePct: p.makingChargePct,
      wastagePct: p.wastagePct,
      polishCharges: p.polishCharge,
      hallmarkCharges: p.hallmarkCharge,
      stoneValue: 0,
      quantity: 1,
      hallmarkNumber: p.hallmarkNumber,
      certificateNumber: p.certificateNumber,
    }]);
    setShowProductPicker(false);
  };

  const addCustomItem = () => setItems([...items, {
    productName: '', category: 'RING', metalType: 'GOLD', purity: 'KARAT_22',
    ratePerGram: getRate('GOLD', 'KARAT_22'),
    grossWeight: 0, netWeight: 0,
    makingChargePerGram: 0, makingChargeFixed: 0, makingChargePct: 0,
    wastagePct: 0, polishCharges: 0, hallmarkCharges: 0, stoneValue: 0, quantity: 1,
  }]);

  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const updateItem = (i: number, patch: Partial<SaleItem>) => {
    const newItems = items.map((it, idx) => {
      if (idx !== i) return it;
      const updated = { ...it, ...patch };
      // Auto-fetch rate when metal/purity changes
      if (patch.metalType || patch.purity) {
        updated.ratePerGram = getRate(updated.metalType, updated.purity);
      }
      return updated;
    });
    setItems(newItems);
  };

  const canSubmit = items.length > 0 && (form.customerName || form.customerId) && items.every((it) => it.productName && it.netWeight > 0 && it.ratePerGram > 0);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-yellow-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/jewelry/sales')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                New Jewelry Sale
              </div>
              <h1 className="mt-1 text-2xl font-extrabold">💎 Create Sale</h1>
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} className="bg-white text-slate-900 hover:bg-slate-100">
            <Save className="h-4 w-4" />
            Create Sale
          </Button>
        </div>
      </section>

      {/* Current Rates Bar */}
      {rates.length > 0 && (
        <section className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-extrabold inline-flex items-center gap-1">
              <Coins className="h-4 w-4" /> Live Rates (per gram)
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {rates.slice(0, 6).map((r) => (
              <div key={r.id} className="rounded-lg bg-white/15 backdrop-blur border border-white/20 px-3 py-1.5 text-xs">
                <span className="font-bold">{r.metalType.replace('_', ' ')} {r.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K:</span>
                <span className="ml-1 font-extrabold tabular-nums">Rs {r.ratePerGram.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          {/* Customer */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="h-4 w-4 text-amber-600" />
              Customer
            </h3>
            {form.customerId ? (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 p-3 flex items-center gap-3">
                <User className="h-5 w-5 text-amber-600" />
                <div className="flex-1">
                  <div className="font-extrabold">{form.customerName}</div>
                  {form.customerPhone && <div className="text-xs text-slate-600 font-bold">{form.customerPhone}</div>}
                </div>
                <button onClick={() => setForm({ ...form, customerId: '', customerName: '', customerPhone: '', customerCnic: '' })} className="text-xs font-extrabold text-amber-600 hover:underline">Change</button>
              </div>
            ) : (
              <>
                <button onClick={() => setShowCustomerPicker(!showCustomerPicker)} className="w-full h-11 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-sm font-extrabold text-slate-600 hover:border-amber-400">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search Customer
                </button>
                {showCustomerPicker && (
                  <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 space-y-2">
                    <input autoFocus value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search..." className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
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
                  <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name *" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                  <input value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="Phone" className="h-11 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                </div>
              </>
            )}
            <input value={form.customerCnic} onChange={(e) => setForm({ ...form, customerCnic: e.target.value })} placeholder="CNIC (for high-value sales)" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
          </section>

          {/* Items */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Gem className="h-4 w-4 text-amber-600" />
                Items ({items.length})
              </h3>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={addCustomItem}>
                  <Plus className="h-3.5 w-3.5" />
                  Custom
                </Button>
                <Button size="sm" onClick={() => setShowProductPicker(true)} className="bg-gradient-to-r from-amber-600 to-yellow-700">
                  <Gem className="h-3.5 w-3.5" />
                  From Catalog
                </Button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <Gem className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">No items added</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, i) => {
                  const calc = itemCalcs[i];
                  return (
                    <div key={i} className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-amber-700">Item #{i + 1}</span>
                        <button onClick={() => removeItem(i)} className="h-6 w-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <input value={item.productName} onChange={(e) => updateItem(i, { productName: e.target.value })} placeholder="Item name (e.g. Gold Ring)" className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />

                      <div className="grid sm:grid-cols-3 gap-2">
                        <select value={item.category} onChange={(e) => updateItem(i, { category: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-amber-500">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                        </select>
                        <select value={item.metalType} onChange={(e) => updateItem(i, { metalType: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-amber-500">
                          {METALS.map((m) => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                        </select>
                        <select value={item.purity} onChange={(e) => updateItem(i, { purity: e.target.value })} className="h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs font-bold focus:outline-none focus:border-amber-500">
                          {PURITIES.map((p) => <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
                        </select>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-blue-700 mb-0.5 block">Rate/g</label>
                          <input type="number" value={item.ratePerGram} onChange={(e) => updateItem(i, { ratePerGram: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-slate-600 mb-0.5 block">Gross (g)</label>
                          <input type="number" step="0.01" value={item.grossWeight} onChange={(e) => updateItem(i, { grossWeight: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-emerald-700 mb-0.5 block">Net (g)</label>
                          <input type="number" step="0.01" value={item.netWeight} onChange={(e) => updateItem(i, { netWeight: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-slate-600 mb-0.5 block">Qty</label>
                          <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-sm font-extrabold tabular-nums text-center focus:outline-none focus:border-amber-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-purple-700 mb-0.5 block">Making/g</label>
                          <input type="number" value={item.makingChargePerGram} onChange={(e) => updateItem(i, { makingChargePerGram: Number(e.target.value) })} placeholder="0" className="h-9 w-full rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/30 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-purple-700 mb-0.5 block">Making %</label>
                          <input type="number" step="0.1" value={item.makingChargePct} onChange={(e) => updateItem(i, { makingChargePct: Number(e.target.value) })} placeholder="0" className="h-9 w-full rounded-lg border-2 border-purple-200 bg-purple-50 dark:bg-purple-950/30 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                          <label className="text-[9px] uppercase font-extrabold text-orange-700 mb-0.5 block">Wastage %</label>
                          <input type="number" step="0.1" value={item.wastagePct} onChange={(e) => updateItem(i, { wastagePct: Number(e.target.value) })} placeholder="0" className="h-9 w-full rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/30 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-orange-500" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={item.stoneValue} onChange={(e) => updateItem(i, { stoneValue: Number(e.target.value) })} placeholder="Stone value" className="h-9 w-full rounded-lg border-2 border-cyan-200 bg-cyan-50 dark:bg-cyan-950/30 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                        <input value={item.hallmarkNumber || ''} onChange={(e) => updateItem(i, { hallmarkNumber: e.target.value })} placeholder="Hallmark #" className="h-9 w-full rounded-lg border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500" />
                      </div>

                      {/* Live calculation display */}
                      <div className="rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-950/40 border-2 border-amber-300 p-2 space-y-0.5 text-xs">
                        <div className="flex justify-between font-bold"><span>Metal:</span><span className="tabular-nums">{formatPKR(calc.metalValue)}</span></div>
                        <div className="flex justify-between font-bold"><span>Making:</span><span className="tabular-nums">{formatPKR(calc.makingCharge)}</span></div>
                        <div className="flex justify-between font-bold"><span>Wastage:</span><span className="tabular-nums">{formatPKR(calc.wastageValue)}</span></div>
                        <div className="flex justify-between font-extrabold text-emerald-800 border-t border-amber-300 pt-1 mt-1">
                          <span>Total (×{item.quantity}):</span>
                          <span className="tabular-nums">{formatPKR(calc.itemTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Exchange */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="h-4 w-4 text-violet-600" />
              Old Gold Exchange (optional)
            </h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Grams</label>
                <input type="number" step="0.01" value={form.exchangeMetalGrams} onChange={(e) => setForm({ ...form, exchangeMetalGrams: e.target.value })} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-violet-700 mb-1 block">Purity</label>
                <select value={form.exchangeMetalPurity} onChange={(e) => setForm({ ...form, exchangeMetalPurity: e.target.value })} className="h-11 w-full rounded-xl border-2 border-violet-300 bg-violet-50 dark:bg-violet-950/30 px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                  <option value="">-- Select --</option>
                  {PURITIES.map((p) => <option key={p} value={p}>{p.replace('KARAT_', '').replace('SILVER_', 'S')}K</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-extrabold text-emerald-700 mb-1 block">Exchange Value (Rs)</label>
                <input type="number" value={form.exchangeValue} onChange={(e) => setForm({ ...form, exchangeValue: e.target.value })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </section>

          {/* Verification */}
          <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.hallmarkVerified ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-neutral-700')}>
                <input type="checkbox" checked={form.hallmarkVerified} onChange={(e) => setForm({ ...form, hallmarkVerified: e.target.checked })} className="h-4 w-4 rounded" />
                <ShieldCheck className={'h-4 w-4 ' + (form.hallmarkVerified ? 'text-emerald-600' : 'text-slate-400')} />
                <span className="text-sm font-extrabold">Hallmark Verified</span>
              </label>
              <label className={'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ' + (form.hasCertificate ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 dark:border-neutral-700')}>
                <input type="checkbox" checked={form.hasCertificate} onChange={(e) => setForm({ ...form, hasCertificate: e.target.checked })} className="h-4 w-4 rounded" />
                <ShieldCheck className={'h-4 w-4 ' + (form.hasCertificate ? 'text-blue-600' : 'text-slate-400')} />
                <span className="text-sm font-extrabold">Has Certificate</span>
              </label>
            </div>
            <textarea rows={2} value={form.customerNotes} onChange={(e) => setForm({ ...form, customerNotes: e.target.value })} placeholder="Customer notes..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
          </section>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-amber-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3 flex items-center gap-1">
                <Calculator className="h-3 w-3" />
                Live Calculation
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Items</span><span className="font-bold tabular-nums">{items.length}</span></div>
                <div className="flex justify-between"><span className="text-white/70">Total Weight</span><span className="font-bold tabular-nums">{totalWeight.toFixed(2)}g</span></div>
                <div className="flex justify-between"><span className="text-white/70">Subtotal</span><span className="font-bold tabular-nums">{formatPKR(subtotal)}</span></div>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">GST</label>
                  <input type="number" value={form.gstAmount} onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Other Charges</label>
                  <input type="number" value={form.otherCharges} onChange={(e) => setForm({ ...form, otherCharges: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Discount</label>
                  <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-amber-400" />
                </div>
                {Number(form.exchangeValue) > 0 && (
                  <div className="flex justify-between text-violet-300 text-xs pt-1">
                    <span>Exchange:</span>
                    <span className="font-bold tabular-nums">-{formatPKR(Number(form.exchangeValue))}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(total)}</span>
              </div>
              <div className="mt-3 space-y-2">
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Paid Now</label>
                  <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} placeholder="0" className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-extrabold tabular-nums text-white placeholder-white/40 focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-extrabold text-white/70 mb-0.5 block">Payment Method</label>
                  <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="h-9 w-full rounded-lg bg-white/10 border border-white/20 px-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-400">
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="BANK">BANK</option>
                    <option value="MIXED">MIXED</option>
                  </select>
                </div>
              </div>
            </div>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!canSubmit} size="lg" className="w-full bg-gradient-to-r from-amber-600 to-yellow-700">
              <Save className="h-5 w-5" />
              Create Sale
            </Button>
          </div>
        </aside>
      </div>

      {showProductPicker && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
              <h3 className="font-extrabold">Select Jewelry Product</h3>
              <button onClick={() => setShowProductPicker(false)} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid sm:grid-cols-2 gap-2">
              {jewelryProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)} className="p-3 rounded-xl border-2 border-slate-200 dark:border-neutral-700 hover:border-amber-500 hover:shadow-lg text-left">
                  <div className="font-extrabold text-sm truncate">{p.product?.name}</div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase">{p.metalType} • {p.purity.replace('KARAT_', '').replace('SILVER_', 'S')}K</div>
                  <div className="mt-1 text-xs font-extrabold text-slate-700">Net: {p.netWeight.toFixed(2)}g</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
