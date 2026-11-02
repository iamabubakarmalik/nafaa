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
import { t, Trans } from '@core/i18n';

export const RAW_CATEGORIES = [
  { value: 'FLOUR', label: t('Aata / Maida'), emoji: '🌾' },
  { value: 'SUGAR', label: t('Cheeni'), emoji: '🍬' },
  { value: 'DAIRY', label: t('Doodh / Cream'), emoji: '🥛' },
  { value: 'EGG', label: t('Anday'), emoji: '🥚' },
  { value: 'FAT', label: t('Ghee / Oil'), emoji: '🫒' },
  { value: 'CHOCOLATE', label: t('Chocolate'), emoji: '🍫' },
  { value: 'FRUIT', label: t('Phal / Nuts'), emoji: '🍓' },
  { value: 'FLAVOR', label: t('Flavour'), emoji: '🧪' },
  { value: 'DECORATION', label: t('Sajawat'), emoji: '✨' },
  { value: 'PACKAGING', label: t('Packing'), emoji: '📦' },
  { value: 'GENERAL', label: t('Aur koi'), emoji: '🧺' },
];
export const rawCategoryOf = (v?: string) => RAW_CATEGORIES.find((c) => c.value === v) ?? { value: v ?? 'GENERAL', label: v || t('Aur koi'), emoji: '🧺' };
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
    onSuccess: () => { toast.success(editing ? t('Save ho gaya') : t('Saamaan jur gaya')); qc.invalidateQueries({ queryKey: [RAW_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Save nahi hua'))),
  });
  const bad = !f.name.trim() || !(Number(f.costPerUnit) > 0);
  return (
    <Modal open onClose={onClose} size="lg" title={editing ? t('{{name}} — badlein', { name: item!.name }) : t('Naya saamaan')} description={t('Maida, cheeni, makhan — jo bikta nahi magar banane me lagta hai')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button disabled={bad} loading={save.isPending} onClick={() => save.mutate()}>{editing ? t('Save karein') : t('Jorein')}</Button></>}>
      <div className="space-y-4">
        <Input label={t('Naam')} required value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder={t('Maida, cheeni, makhan…')} data-autofocus />
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Type')}</span>
          <div className="flex flex-wrap gap-1.5">
            {RAW_CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => set({ category: c.value })}
                className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', f.category === c.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{c.emoji} {c.label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label={t('Naap')} value={f.unit} onChange={(e) => set({ unit: e.target.value })} options={UNITS.map((u) => ({ value: u, label: u }))} hint={t('Isi naap me khareeda aur recipe me likha jata hai')} />
          <Input label={t('Ek {{unit}} ka rate', { unit: f.unit })} required inputMode="decimal" value={f.costPerUnit} onChange={(e) => set({ costPerUnit: digits(e.target.value) })} hint={editing ? t('"Maal aaya" par khud badalta hai') : t('Abhi ka bhao')} />
          {!editing && <Input label={t('Abhi kitna hai')} inputMode="decimal" value={f.currentStock} onChange={(e) => set({ currentStock: digits(e.target.value) })} hint={t('Gudaam me ginti')} />}
          <Input label={t('Kam se kam')} inputMode="decimal" value={f.minStock} onChange={(e) => set({ minStock: digits(e.target.value) })} hint={t('Itna reh jaye to list me peela')} />
          <Input label={t('Mangwane ki had')} inputMode="decimal" value={f.reorderLevel} onChange={(e) => set({ reorderLevel: digits(e.target.value) })} hint={t('Khali ho to \'kam se kam\' chalega')} />
          <Input label={t('Kitne din chalta hai')} inputMode="numeric" value={f.shelfLifeDays} onChange={(e) => set({ shelfLifeDays: e.target.value.replace(/\D/g, '') })} hint={t('Marzi hai')} />
        </div>
        {editing && <p className="text-[0.75rem] text-slate-500">{t('Stock yahan se nahi badalta — "Maal aaya" ya "Gin kar theek" se badlein, taake record me wajah bhi aaye.')}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label={t('Brand')} value={f.brand} onChange={(e) => set({ brand: e.target.value })} placeholder={t('Sunridge')} hint={t('Marzi hai')} />
          <Input label={t('Supplier')} value={f.supplierName} onChange={(e) => set({ supplierName: e.target.value })} hint={t('Jis se aata hai')} />
          <Input label={t('Supplier ka WhatsApp')} inputMode="tel" value={f.supplierPhone} onChange={(e) => set({ supplierPhone: e.target.value })} placeholder="03001234567" hint={t('List seedha isi par jayegi')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Switch checked={f.requiresRefrigeration} onChange={(e) => set({ requiresRefrigeration: e.target.checked })} label={t('Fridge me rakhna hai')} />
          <Switch checked={f.isCritical} onChange={(e) => set({ isCritical: e.target.checked })} label={t('Is ke bagair kaam nahi chalta')} description={t('Khatam hone par sab se upar')} />
        </div>
        <Textarea label={t('Note')} value={f.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} maxLength={500} />
      </div>
    </Modal>
  );
}

const PAY_WAYS = [
  { id: 'CASH', label: t('Cash'), icon: Banknote },
  { id: 'BANK_TRANSFER', label: t('Bank'), icon: Building2 },
  { id: 'CARD', label: t('Card'), icon: CreditCard },
  { id: 'JAZZCASH', label: t('JazzCash'), icon: Smartphone },
  { id: 'EASYPAISA', label: t('EasyPaisa'), icon: Smartphone },
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
    purchase: { title: t('Maal aaya'), icon: ArrowDownToLine, btn: t('Darj karein') },
    waste: { title: t('Waste hua'), icon: Trash2, btn: t('Waste likhein') },
    adjust: { title: t('Gin kar theek karein'), icon: Scale, btn: t('Theek karein') },
  }[mode];

  const save = useMutation({
    mutationFn: () => {
      if (mode === 'purchase') {
        return ingredientsApi.purchase(item.id, { quantity: n, costPerUnit: Number(rate) || 0, vendorName: vendor.trim() || undefined, supplierId: supplierId || undefined, paymentMethod: payWay, paidAmount: paid, shopId: shopId || undefined });
      }
      if (mode === 'waste') return ingredientsApi.waste(item.id, { quantity: n, reason: reason.trim() });
      return ingredientsApi.adjust(item.id, { newStock: Number(newStock) || 0, reason: reason.trim() });
    },
    onSuccess: () => { toast.success(t('Darj ho gaya')); qc.invalidateQueries({ queryKey: [RAW_KEY] }); qc.invalidateQueries({ queryKey: ['purchases'] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Nahi ho saka'))),
  });
  const bad = mode === 'adjust' ? newStock === '' || !reason.trim()
    : mode === 'purchase' ? n <= 0 || !(Number(rate) > 0) || paid > total || (owe > 0 && !supplierId)
      : n <= 0 || !reason.trim();
  const rateChanged = mode === 'purchase' && rate !== '' && Math.abs(Number(rate) - item.costPerUnit) > 0.001;

  return (
    <Modal open onClose={onClose} size="md" title={meta.title} description={t('{{name}} · abhi {{currentStock}} {{unit}}', { name: item.name, currentStock: fmtQty(item.currentStock), unit: item.unit })}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button variant={mode === 'waste' ? 'danger' : 'primary'} disabled={bad} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<meta.icon className="h-4 w-4" />}>{meta.btn}</Button></>}>
      <div className="space-y-3">
        {mode === 'adjust'
          ? <Input label={t('Gin kar kitna nikla ({{unit}})', { unit: item.unit })} inputMode="decimal" value={newStock} onChange={(e) => setNewStock(digits(e.target.value))} size="lg" className="text-center text-xl font-bold tabular-nums" data-autofocus
              hint={newStock !== '' ? t('Farq: {{fmtQty}} {{unit}}', { fmtQty: fmtQty((Number(newStock) || 0) - item.currentStock), unit: item.unit }) : undefined} />
          : <Input label={t('Kitna ({{unit}})', { unit: item.unit })} inputMode="decimal" value={qty} onChange={(e) => setQty(digits(e.target.value))} size="lg" className="text-center text-xl font-bold tabular-nums" data-autofocus
              hint={mode === 'waste' && n > item.currentStock ? t('Stock sirf {{currentStock}} hai — 0 ho jayega', { currentStock: fmtQty(item.currentStock) }) : undefined} />}

        {mode === 'purchase' && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Ek {{unit}} kitne ka aaya', { unit: item.unit })} inputMode="decimal" value={rate} onChange={(e) => setRate(digits(e.target.value))} />
              <Input label={t('Kahan se aaya')} value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder={t('Supplier / dukaan')} />
            </div>
            {rateChanged && (
              <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{t('Rate {{costPerUnit}} se {{formatPKR}} ho raha hai. Recipe wali cheezon ki cost "Recipe aur cost" tab me dobara dekh lein.', { costPerUnit: formatPKR(item.costPerUnit), formatPKR: formatPKR(Number(rate)) })}
              </p>
            )}
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-slate-900"><Wallet className="h-4 w-4 text-brand-600" />{t('Paisa kaise diya')}<span className="ms-auto tabular-nums">{formatPKR(total)}</span></div>
              <div className="grid grid-cols-3 gap-1.5">
                {([['FULL', t('Poora diya')], ['PARTIAL', t('Kuch diya')], ['UDHAAR', t('Poora udhaar')]] as const).map(([v, l]) => <Button key={v} size="sm" variant={payMode === v ? 'primary' : 'secondary'} onClick={() => setPayMode(v)}>{l}</Button>)}
              </div>
              {payMode === 'PARTIAL' && <Input label={t('Abhi kitna diya')} inputMode="decimal" value={paidNow} onChange={(e) => setPaidNow(digits(e.target.value))} error={paid > total ? t('Kul rakam se zyada nahi') : undefined} />}
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
              {owe > 0 && <Select label={t('Kis supplier se udhaar')} required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                options={[{ value: '', label: t('Supplier chunein…') }, ...suppliers.map((s) => ({ value: s.id, label: `${s.name}${Number(s.outstandingDue) > 0 ? t(' — {{amount}} dena hai', { amount: formatPKR(Number(s.outstandingDue)) }) : ''}` }))]}
                hint={t('Baad me pata rahe kis ko dena hai')} />}
              <p className="text-[0.75rem] text-slate-600">
                {paid > 0 && owe > 0 ? <Trans text="Supplier ka {{bill}} banega: diya hua paisa {{where}}, baqi supplier ke {{khata}} me." values={{ bill: <b>{t('bill')}</b>, where: payWay === 'CASH' ? t('galle se ghatega') : t('darj hoga'), khata: <b>{t('khate')}</b> }} />
                  : owe > 0 ? <Trans text="Poori rakam supplier ke {{khata}} me jayegi — galle par asar nahi." values={{ khata: <b>{t('khate')}</b> }} />
                    : payWay === 'CASH' ? <Trans text="Supplier ka {{bill}} banega aur cash galle se khud ghatega." values={{ bill: <b>{t('bill')}</b> }} /> : <Trans text="Supplier ka {{bill}} banega. Cash nahi diya, is liye galle par asar nahi." values={{ bill: <b>{t('bill')}</b> }} />}
              </p>
            </div>
          </>
        )}

        {(mode === 'waste' || mode === 'adjust') && (
          <div>
            <Input label={t('Wajah')} required value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === 'waste' ? t('Kharab ho gaya, gir gaya, keera lag gaya…') : t('Mahine ki ginti me farq')} />
            {mode === 'waste' && <div className="mt-1.5 flex flex-wrap gap-1.5">{[t('Kharab ho gaya'), t('Gir gaya'), t('Expire ho gaya'), t('Keera lag gaya')].map((r) => <Button key={r} size="xs" variant={reason === r ? 'primary' : 'secondary'} onClick={() => setReason(r)}>{r}</Button>)}</div>}
            {mode === 'waste' && n > 0 && <p className="mt-2 text-[0.75rem] text-rose-700">{t('Nuqsaan: {{formatPKR}}', { formatPKR: formatPKR(n * item.costPerUnit) })}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  PURCHASE: { label: t('Maal aaya'), tone: 'text-success-700' },
  CONSUMPTION: { label: t('Istemal'), tone: 'text-slate-700' },
  WASTE: { label: t('Waste'), tone: 'text-rose-700' },
  ADJUSTMENT: { label: t('Ginti'), tone: 'text-violet-700' },
};
export const kindOf = (k: string) => KIND_LABEL[k] ?? { label: k, tone: 'text-slate-700' };

export function HistoryModal({ item, onClose }: { item: Ingredient; onClose: () => void }) {
  const q = useQuery({ queryKey: [RAW_KEY, 'history', item.id], queryFn: () => ingredientsApi.transactions(item.id) });
  const rows = (q.data ?? []) as Array<{ id: string; transactionType: string; quantity: number; unit: string; totalCost?: number | null; reason?: string | null; notes?: string | null; createdAt: string }>;
  return (
    <Modal open onClose={onClose} size="lg" title={t('{{name}} — record', { name: item.name })} description={t('Abhi {{currentStock}} {{unit}} · aakhri 100 cheezein', { currentStock: fmtQty(item.currentStock), unit: item.unit })}>
      {q.isLoading ? <p className="py-8 text-center text-sm text-slate-500">{t('Load ho raha hai…')}</p> : !rows.length ? <p className="py-8 text-center text-sm text-slate-500">{t('Abhi koi record nahi')}</p> : (
        <ul className="divide-y divide-slate-100 text-[0.8125rem]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-2">
              <span className={cn('w-16 shrink-0 font-semibold', kindOf(r.transactionType).tone)}>{kindOf(r.transactionType).label}</span>
              <span className="min-w-0 flex-1 text-slate-700">{r.reason || r.notes || '—'}<span className="block text-[0.6875rem] text-slate-400">{dateTime(r.createdAt)}</span></span>
              <span className="shrink-0 text-end tabular-nums">{r.quantity > 0 && r.transactionType === 'ADJUSTMENT' ? '+' : ''}{fmtQty(r.quantity)} {r.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
