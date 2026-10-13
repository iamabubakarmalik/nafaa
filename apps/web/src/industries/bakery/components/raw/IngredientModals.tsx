/**
 * Raw-material dialogs: add or edit a material, goods received (with how
 * the money was paid or owed), waste, a counted correction, and the
 * movement history of one material.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, ArrowDownToLine, Banknote, Building2, CreditCard, Scale, Smartphone, Trash2, Wallet } from 'lucide-react';
import { Button, Input, Modal, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { ingredientsApi, type Ingredient } from '../../api/ingredients.api';
import { RAW_KEY, apiError, dateTime, fmtQty } from '../meta';

export const RAW_CATEGORIES = [
  { value: 'FLOUR', label: 'Aata / Maida', emoji: '🌾' },
  { value: 'SUGAR', label: 'Cheeni', emoji: '🍬' },
  { value: 'DAIRY', label: 'Doodh / Cream', emoji: '🥛' },
  { value: 'EGG', label: 'Anday', emoji: '🥚' },
  { value: 'FAT', label: 'Ghee / Oil', emoji: '🫒' },
  { value: 'CHOCOLATE', label: 'Chocolate', emoji: '🍫' },
  { value: 'FRUIT', label: 'Phal / Nuts', emoji: '🍓' },
  { value: 'FLAVOR', label: 'Flavour', emoji: '🧪' },
  { value: 'DECORATION', label: 'Sajawat', emoji: '✨' },
  { value: 'PACKAGING', label: 'Packing', emoji: '📦' },
  { value: 'GENERAL', label: 'Aur koi', emoji: '🧺' },
];
export const rawCategoryOf = (v?: string) => RAW_CATEGORIES.find((c) => c.value === v) ?? { value: v ?? 'GENERAL', label: v || 'Aur koi', emoji: '🧺' };
const UNITS = ['kg', 'gram', 'litre', 'ml', 'packet', 'dozen', 'piece', 'bag', 'tin', 'bottle'];

const digits = (v: string) => v.replace(/[^\d.]/g, '');

export function IngredientForm({ item, onClose }: { item: Ingredient | null; onClose: () => void }) {
  const qc = useQueryClient();
  const editing = !!item;
  const [f, setF] = useState({
    name: item?.name ?? '', category: item?.category ?? 'GENERAL', unit: item?.unit ?? 'kg', costPerUnit: item ? String(item.costPerUnit) : '',
    currentStock: '', minStock: item ? String(item.minStock ?? '') : '', reorderLevel: item?.reorderLevel != null ? String(item.reorderLevel) : '',
    brand: item?.brand ?? '', supplierName: item?.supplierName ?? '', supplierPhone: item?.supplierPhone ?? '', shelfLifeDays: item?.shelfLifeDays != null ? String(item.shelfLifeDays) : '',
    requiresRefrigeration: item?.requiresRefrigeration ?? false, isCritical: item?.isCritical ?? false, notes: item?.notes ?? '',
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const save = useMutation({
    mutationFn: () => {
      const body: Partial<Ingredient> = {
        name: f.name.trim(), category: f.category, unit: f.unit, costPerUnit: Number(f.costPerUnit) || 0, minStock: Number(f.minStock) || 0,
        reorderLevel: f.reorderLevel === '' ? undefined : Number(f.reorderLevel), brand: f.brand.trim() || undefined,
        supplierName: f.supplierName.trim() || undefined, supplierPhone: f.supplierPhone.trim() || undefined,
        shelfLifeDays: f.shelfLifeDays === '' ? undefined : Number(f.shelfLifeDays), requiresRefrigeration: f.requiresRefrigeration, isCritical: f.isCritical,
        notes: f.notes.trim() || undefined,
      };
      return editing ? ingredientsApi.update(item!.id, body) : ingredientsApi.create({ ...body, currentStock: Number(f.currentStock) || 0 });
    },
    onSuccess: () => { toast.success(editing ? 'Save ho gaya' : 'Saamaan jur gaya'); qc.invalidateQueries({ queryKey: [RAW_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const bad = !f.name.trim() || !(Number(f.costPerUnit) > 0);
  return (
    <Modal open onClose={onClose} size="lg" title={editing ? `${item!.name} — badlein` : 'Naya saamaan'} description="Maida, cheeni, makhan — jo bikta nahi magar banane me lagta hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button disabled={bad} loading={save.isPending} onClick={() => save.mutate()}>{editing ? 'Save karein' : 'Jorein'}</Button></>}>
      <div className="space-y-4">
        <Input label="Naam" required value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Maida, cheeni, makhan…" data-autofocus />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Qisam</span>
          <div className="flex flex-wrap gap-1.5">
            {RAW_CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => set({ category: c.value })}
                className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', f.category === c.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{c.emoji} {c.label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Naap" value={f.unit} onChange={(e) => set({ unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: u }))} hint="Isi naap me khareeda aur recipe me likha jata hai" />
          <Input label={`Ek ${f.unit} ka rate`} required inputMode="decimal" value={f.costPerUnit} onChange={(e) => set({ costPerUnit: digits(e.target.value) })} hint={editing ? '"Maal aaya" par khud badalta hai' : 'Abhi ka bhao'} />
          {!editing && <Input label="Abhi kitna hai" inputMode="decimal" value={f.currentStock} onChange={(e) => set({ currentStock: digits(e.target.value) })} hint="Gudaam me ginti" />}
          <Input label="Kam se kam" inputMode="decimal" value={f.minStock} onChange={(e) => set({ minStock: digits(e.target.value) })} hint="Itna reh jaye to list me peela" />
          <Input label="Mangwane ki had" inputMode="decimal" value={f.reorderLevel} onChange={(e) => set({ reorderLevel: digits(e.target.value) })} hint="Khali ho to 'kam se kam' chalega" />
          <Input label="Kitne din chalta hai" inputMode="numeric" value={f.shelfLifeDays} onChange={(e) => set({ shelfLifeDays: e.target.value.replace(/\D/g, '') })} hint="Marzi hai" />
        </div>
        {editing && <p className="text-[0.75rem] text-slate-500">Stock yahan se nahi badalta — "Maal aaya" ya "Gin kar theek" se badlein, taake record me wajah bhi aaye.</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Brand" value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder="Sunridge" hint="Marzi hai" />
          <Input label="Supplier" value={f.supplierName} onChange={(e) => set({ supplierName: e.target.value })} hint="Jis se aata hai" />
          <Input label="Supplier ka WhatsApp" inputMode="tel" value={f.supplierPhone} onChange={(e) => set({ supplierPhone: e.target.value })} placeholder="03001234567" hint="List seedha isi par jayegi" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Switch checked={f.requiresRefrigeration} onChange={(e) => set({ requiresRefrigeration: e.target.checked })} label="Fridge me rakhna hai" />
          <Switch checked={f.isCritical} onChange={(e) => set({ isCritical: e.target.checked })} label="Is ke bagair kaam nahi chalta" description="Khatam hone par sab se upar" />
        </div>
        <Textarea label="Note" value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} maxLength={500} />
      </div>
    </Modal>
  );
}

const PAY_WAYS = [
  { id: 'CASH', label: 'Cash', icon: Banknote },
  { id: 'BANK_TRANSFER', label: 'Bank', icon: Building2 },
  { id: 'CARD', label: 'Card', icon: CreditCard },
  { id: 'JAZZCASH', label: 'JazzCash', icon: Smartphone },
  { id: 'EASYPAISA', label: 'EasyPaisa', icon: Smartphone },
];

export type StockMode = 'purchase' | 'waste' | 'adjust';

export function StockModal({ item, mode, onClose }: { item: Ingredient; mode: StockMode; onClose: () => void }) {
  const qc = useQueryClient();
  const shopId = useShopParam();
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState(String(item.costPerUnit || ''));
  const [vendor, setVendor] = useState(item.lastVendorName ?? item.supplierName ?? '');
  const [reason, setReason] = useState('');
  const [newStock, setNewStock] = useState(String(item.currentStock ?? 0));
  const [payWay, setPayWay] = useState('CASH');
  const [payMode, setPayMode] = useState<'FULL' | 'PARTIAL' | 'UDHAAR'>('FULL');
  const [paidNow, setPaidNow] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const suppliersQ = useQuery({ queryKey: ['suppliers-for-ingredient'], queryFn: () => suppliersApi.list({ limit: 500, status: 'active' }), enabled: mode === 'purchase' });
  const suppliers = ((suppliersQ.data as { items?: Array<{ id: string; name: string; outstandingDue?: number }> } | undefined)?.items ?? []);

  const n = Number(qty) || 0;
  const total = Math.round(n * (Number(rate) || 0) * 100) / 100;
  const paid = payMode === 'FULL' ? total : payMode === 'UDHAAR' ? 0 : Number(paidNow) || 0;
  const owe = Math.max(total - paid, 0);
  const meta = {
    purchase: { title: 'Maal aaya', icon: ArrowDownToLine, btn: 'Darj karein' },
    waste: { title: 'Waste hua', icon: Trash2, btn: 'Waste likhein' },
    adjust: { title: 'Gin kar theek karein', icon: Scale, btn: 'Theek karein' },
  }[mode];

  const save = useMutation({
    mutationFn: () => {
      if (mode === 'purchase') {
        return ingredientsApi.purchase(item.id, { quantity: n, costPerUnit: Number(rate) || 0, vendorName: vendor.trim() || undefined, supplierId: supplierId || undefined, paymentMethod: payWay, paidAmount: paid, shopId: shopId || undefined });
      }
      if (mode === 'waste') return ingredientsApi.waste(item.id, { quantity: n, reason: reason.trim() });
      return ingredientsApi.adjust(item.id, { newStock: Number(newStock) || 0, reason: reason.trim() });
    },
    onSuccess: () => { toast.success('Darj ho gaya'); qc.invalidateQueries({ queryKey: [RAW_KEY] }); qc.invalidateQueries({ queryKey: ['purchases'] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi ho saka')),
  });
  const bad = mode === 'adjust' ? newStock === '' || !reason.trim()
    : mode === 'purchase' ? n <= 0 || !(Number(rate) > 0) || paid > total || (owe > 0 && !supplierId)
      : n <= 0 || !reason.trim();
  const rateChanged = mode === 'purchase' && rate !== '' && Math.abs(Number(rate) - item.costPerUnit) > 0.001;

  return (
    <Modal open onClose={onClose} size="md" title={meta.title} description={`${item.name} · abhi ${fmtQty(item.currentStock)} ${item.unit}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant={mode === 'waste' ? 'danger' : 'primary'} disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<meta.icon className="h-4 w-4" />}>{meta.btn}</Button></>}>
      <div className="space-y-3">
        {mode === 'adjust'
          ? <Input label={`Gin kar kitna nikla (${item.unit})`} inputMode="decimal" value={newStock} onChange={(e) => setNewStock(digits(e.target.value))} size="lg" className="text-center text-xl font-bold tabular-nums" data-autofocus
              hint={newStock !== '' ? `Farq: ${fmtQty((Number(newStock) || 0) - item.currentStock)} ${item.unit}` : undefined} />
          : <Input label={`Kitna (${item.unit})`} inputMode="decimal" value={qty} onChange={(e) => setQty(digits(e.target.value))} size="lg" className="text-center text-xl font-bold tabular-nums" data-autofocus
              hint={mode === 'waste' && n > item.currentStock ? `Stock sirf ${fmtQty(item.currentStock)} hai — 0 ho jayega` : undefined} />}

        {mode === 'purchase' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={`Ek ${item.unit} kitne ka aaya`} inputMode="decimal" value={rate} onChange={(e) => setRate(digits(e.target.value))} />
              <Input label="Kahan se aaya" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Supplier / dukaan" />
            </div>
            {rateChanged && (
              <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Rate {formatPKR(item.costPerUnit)} se {formatPKR(Number(rate))} ho raha hai. Recipe wali cheezon ki cost "Recipe aur cost" tab me dobara dekh lein.
              </p>
            )}
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900"><Wallet className="h-4 w-4 text-brand-600" />Paisa kaise diya<span className="ml-auto tabular-nums">{formatPKR(total)}</span></div>
              <div className="grid grid-cols-3 gap-1.5">
                {([['FULL', 'Poora diya'], ['PARTIAL', 'Kuch diya'], ['UDHAAR', 'Poora udhaar']] as const).map(([v, l]) => <Button key={v} size="sm" variant={payMode === v ? 'primary' : 'secondary'} onClick={() => setPayMode(v)}>{l}</Button>)}
              </div>
              {payMode === 'PARTIAL' && <Input label="Abhi kitna diya" inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(digits(e.target.value))} error={paid > total ? 'Kul rakam se zyada nahi' : undefined} />}
              {paid > 0 && (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
                  {PAY_WAYS.map((w) => (
                    <button key={w.id} type="button" onClick={() => setPayWay(w.id)}
                      className={cn('inline-flex h-9 items-center justify-center gap-1 rounded-lg text-[0.75rem] font-semibold ring-1', payWay === w.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200')}>
                      <w.icon className="h-3.5 w-3.5" />{w.label}
                    </button>
                  ))}
                </div>
              )}
              {owe > 0 && <Select label="Kis supplier se udhaar" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                options={[{ value: '', label: 'Supplier chunein…' }, ...suppliers.map((s) => ({ value: s.id, label: `${s.name}${Number(s.outstandingDue) > 0 ? ` — ${formatPKR(Number(s.outstandingDue))} dena hai` : ''}` }))]}
                hint="Baad me pata rahe kis ko dena hai" />}
              <p className="text-[0.75rem] text-slate-600">
                {paid > 0 && owe > 0 ? <>Supplier ka <b>bill</b> banega: diya hua paisa{payWay === 'CASH' ? ' galle se ghatega' : ' darj hoga'}, baqi supplier ke <b>khate</b> me.</>
                  : owe > 0 ? <>Poori rakam supplier ke <b>khate</b> me jayegi — galle par asar nahi.</>
                    : payWay === 'CASH' ? <>Supplier ka <b>bill</b> banega aur cash galle se khud ghatega.</> : <>Supplier ka <b>bill</b> banega. Cash nahi diya, is liye galle par asar nahi.</>}
              </p>
            </div>
          </>
        )}

        {(mode === 'waste' || mode === 'adjust') && (
          <div>
            <Input label="Wajah" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === 'waste' ? 'Kharab ho gaya, gir gaya, keera lag gaya…' : 'Mahine ki ginti me farq'} />
            {mode === 'waste' && <div className="mt-1.5 flex flex-wrap gap-1.5">{['Kharab ho gaya', 'Gir gaya', 'Expire ho gaya', 'Keera lag gaya'].map((r) => <Button key={r} size="xs" variant={reason === r ? 'primary' : 'secondary'} onClick={() => setReason(r)}>{r}</Button>)}</div>}
            {mode === 'waste' && n > 0 && <p className="mt-2 text-[0.75rem] text-rose-700">Nuqsaan: {formatPKR(n * item.costPerUnit)}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  PURCHASE: { label: 'Aaya', tone: 'text-success-700' },
  CONSUMPTION: { label: 'Istemal', tone: 'text-slate-700' },
  WASTE: { label: 'Waste', tone: 'text-rose-700' },
  ADJUSTMENT: { label: 'Ginti', tone: 'text-violet-700' },
};
export const kindOf = (k: string) => KIND_LABEL[k] ?? { label: k, tone: 'text-slate-700' };

export function HistoryModal({ item, onClose }: { item: Ingredient; onClose: () => void }) {
  const q = useQuery({ queryKey: [RAW_KEY, 'history', item.id], queryFn: () => ingredientsApi.transactions(item.id) });
  const rows = (q.data ?? []) as Array<{ id: string; transactionType: string; quantity: number; unit: string; totalCost?: number | null; reason?: string | null; notes?: string | null; createdAt: string }>;
  return (
    <Modal open onClose={onClose} size="lg" title={`${item.name} — record`} description={`Abhi ${fmtQty(item.currentStock)} ${item.unit} · aakhri 100 cheezein`}>
      {q.isLoading ? <p className="py-8 text-center text-sm text-slate-500">Load ho raha hai…</p> : !rows.length ? <p className="py-8 text-center text-sm text-slate-500">Abhi koi record nahi</p> : (
        <ul className="divide-y divide-slate-100 text-[0.8125rem]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2">
              <span className={cn('w-16 shrink-0 font-semibold', kindOf(r.transactionType).tone)}>{kindOf(r.transactionType).label}</span>
              <span className="min-w-0 flex-1 text-slate-700">{r.reason || r.notes || '—'}<span className="block text-[0.6875rem] text-slate-400">{dateTime(r.createdAt)}</span></span>
              <span className="shrink-0 text-right tabular-nums">{r.quantity > 0 && r.transactionType === 'ADJUSTMENT' ? '+' : ''}{fmtQty(r.quantity)} {r.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
