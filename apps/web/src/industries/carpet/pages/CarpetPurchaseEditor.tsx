/**
 * New carpet purchase. Roll goods are bought as rolls (design, width ×
 * length, cost and rate per sqft); each roll joins stock with the purchase
 * as its source. Rugs, underlay and other goods are bought by quantity.
 * Payment, discount and the supplier's balance follow the shared purchase.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, Layers, Package, Plus, Save, Trash2, Truck } from 'lucide-react';
import { Button, Card, Input, PageHero, PageShell, Select, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { productsApi, type Product } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { purchasesApi } from '@modules/purchasing/purchases/api/purchases.api';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useSaveKey } from '../hooks/usePageKeys';
import { AREA_UNITS, PIECES_KEY, ROLLS_KEY, SUMMARY_KEY, qtyInUnit, r2, realFt } from '../lib/meta';

interface RollRow { variantId: string; rollNumber: string; widthFt: string; widthInch: string; lengthFt: string; lengthInch: string; cost: string; rate: string; rack: string }
interface Line { key: number; product: Product; rolls: RollRow[]; qty: string; cost: string }

const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const digits = (v: string) => v.replace(/[^\d.]/g, '');
const cell = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
/** Products bought as rolls; a purchase makes rolls for area units only. */
const byRoll = (p: Product) => AREA_UNITS.has(p.unit.toLowerCase());
const rollSqft = (r: RollRow) => r2(realFt(n(r.widthFt), n(r.widthInch)) * realFt(n(r.lengthFt), n(r.lengthInch)));
const errText = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fb;
let seq = 0;

function Variants({ productId, value, onChange }: { productId: string; value: string; onChange: (v: string) => void }) {
  const { data = [] } = useQuery({ queryKey: ['carpet-roll-variants', productId], queryFn: () => productVariantsApi.list(productId) });
  const active = data.filter((v) => v.isActive);
  if (!active.length) return <span className="text-[0.75rem] text-slate-400">—</span>;
  return (
    <select aria-label="Design" value={value} onChange={(e) => onChange(e.target.value)} className={cell}>
      <option value="">Design</option>
      {active.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
    </select>
  );
}

export default function CarpetPurchaseEditor() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopId = useShopParam();
  const guide = usePageGuide();
  const [supplierId, setSupplierId] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [discount, setDiscount] = useState('');
  const [paid, setPaid] = useState('');
  const [invoice, setInvoice] = useState('');
  const [notes, setNotes] = useState('');
  const [pick, setPick] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);

  const { data: suppliers } = useQuery({ queryKey: ['suppliers', 'carpet-purchase'], queryFn: () => suppliersApi.list({ status: 'active', limit: 500, sort: 'name' }) });
  const { data: products } = useQuery({ queryKey: ['carpet-roll-products'], queryFn: () => productsApi.list({ limit: 1000, isActive: true }), staleTime: 60_000 });

  const blankRoll = (p: Product): RollRow => ({ variantId: '', rollNumber: '', widthFt: '12', widthInch: '', lengthFt: '', lengthInch: '', cost: p.unit === 'sqft' && p.costPrice ? String(p.costPrice) : '', rate: p.unit === 'sqft' && p.price ? String(p.price) : '', rack: '' });
  const add = (id: string) => {
    const p = products?.items.find((x) => x.id === id);
    if (!p) return;
    setLines((ls) => [...ls, { key: ++seq, product: p, rolls: byRoll(p) ? [blankRoll(p)] : [], qty: '1', cost: p.costPrice ? String(p.costPrice) : '' }]);
    setPick('');
  };
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const setRoll = (l: Line, i: number, patch: Partial<RollRow>) => setLine(l.key, { rolls: l.rolls.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  const lineTotal = (l: Line) => (byRoll(l.product) ? r2(l.rolls.reduce((s, r) => s + rollSqft(r) * n(r.cost), 0)) : r2(n(l.qty) * n(l.cost)));
  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const total = Math.max(r2(subtotal - n(discount)), 0);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!supplierId) e.push('Supplier chunein');
    if (!lines.length) e.push('Kam se kam ek cheez daalein');
    for (const l of lines) {
      if (byRoll(l.product)) {
        if (!l.rolls.length) e.push(`${l.product.name}: roll daalein`);
        l.rolls.forEach((r, i) => {
          if (!(rollSqft(r) > 0)) e.push(`${l.product.name} roll ${i + 1}: chaurai aur lambai likhein`);
          else if (n(r.widthInch) >= 12 || n(r.lengthInch) >= 12) e.push(`${l.product.name} roll ${i + 1}: inch 12 se kam`);
          else if (!(n(r.cost) > 0)) e.push(`${l.product.name} roll ${i + 1}: cost / sqft likhein`);
        });
      } else if (!(n(l.qty) > 0) || !(n(l.cost) >= 0)) e.push(`${l.product.name}: quantity likhein`);
    }
    if (n(discount) > subtotal) e.push('Discount bill se zyada hai');
    if (paid && n(paid) > total) e.push('Diya gaya paisa bill se zyada hai');
    return e;
  }, [supplierId, lines, discount, paid, subtotal, total]);

  const save = async () => {
    setTried(true);
    if (errors.length || saving) { if (errors.length) toast.error(errors[0]); return; }
    setSaving(true);
    try {
      const p = await purchasesApi.create({
        supplierId, paymentMethod: method, shopId, discount: n(discount) || undefined, paidAmount: paid ? n(paid) : undefined,
        supplierInvoiceNo: invoice.trim() || undefined, notes: notes.trim() || undefined,
        items: lines.map((l) => {
          if (!byRoll(l.product)) return { productId: l.product.id, quantity: n(l.qty), costPrice: n(l.cost) };
          // Quantity in the product's own unit (sq meter, sq gaz or sqft).
          const qty = r2(l.rolls.reduce((s, r) => s + qtyInUnit(l.product.unit, realFt(n(r.widthFt), n(r.widthInch)), realFt(n(r.lengthFt), n(r.lengthInch))), 0));
          return {
            productId: l.product.id, quantity: qty, costPrice: qty > 0 ? r2(lineTotal(l) / qty) : 0,
            rolls: l.rolls.map((r) => ({
              variantId: r.variantId || undefined, rollNumber: r.rollNumber.trim() || undefined, widthFt: n(r.widthFt), widthInch: n(r.widthInch),
              lengthFt: r2(realFt(n(r.lengthFt), n(r.lengthInch))), costPerSqft: n(r.cost), salePricePerSqft: n(r.rate) || undefined, rackNumber: r.rack.trim() || undefined,
            })),
          };
        }),
      });
      for (const k of [ROLLS_KEY, PIECES_KEY, SUMMARY_KEY, 'purchases', 'products', 'suppliers']) void qc.invalidateQueries({ queryKey: [k] });
      toast.success(`Purchase ${p.purchaseNumber} save — rolls stock me aa gaye`);
      navigate(`/purchases/${p.id}`);
    } catch (e) { toast.error(errText(e, 'Purchase save nahi hui')); } finally { setSaving(false); }
  };
  useSaveKey(() => void save());

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Carpet purchase — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Truck, color: '#0891b2', title: 'Supplier', text: 'Supplier chunein. Jitna abhi diya woh likhein — baqi supplier ke khate me chala jata hai.' },
            { icon: Layers, color: '#059669', title: 'Rolls', text: 'Har roll ki chaurai, lambai, design aur cost / sqft. Rate likhein to counter par wahi lagega.' },
            { icon: Package, color: '#7c3aed', title: 'Baqi maal', text: 'Rug, underlay, gripper quantity se aate hain.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}
      <PageHero title="Nayi carpet purchase" chip={<><Truck />Supplier se maal</>} meta="Rolls naap ke saath, baqi maal quantity se"
        actions={<>
          <button type="button" onClick={() => navigate('/purchases')} className={heroButton}>Purchases</button>
          <button type="button" onClick={guide.open} title="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[{ label: 'Rolls', value: String(lines.reduce((s, l) => s + l.rolls.length, 0)) }, { label: 'Sqft', value: String(r2(lines.reduce((s, l) => s + l.rolls.reduce((a, r) => a + rollSqft(r), 0), 0))) }, { label: 'Bill', value: formatPKR(total) }]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card className="rounded-3xl" title="Maal" description="Carpet chunein — roll goods par rolls ki line khulti hai">
            <Select value={pick} onChange={(e) => add(e.target.value)} placeholder="Product chunein…" options={(products?.items ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))} />
          </Card>
          {lines.map((l) => (
            <Card key={l.key} className="rounded-3xl" title={l.product.name} description={byRoll(l.product) ? `${l.rolls.length} roll · ${r2(l.rolls.reduce((s, r) => s + rollSqft(r), 0))} sqft · ${formatPKR(lineTotal(l))}` : formatPKR(lineTotal(l))}
              actions={<button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}>
              {byRoll(l.product) ? (
                <div className="space-y-2">
                  {l.rolls.map((r, i) => (
                    <div key={i} className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-50 p-2 sm:grid-cols-5 xl:grid-cols-10">
                      <div className="col-span-2"><Variants productId={l.product.id} value={r.variantId} onChange={(v) => setRoll(l, i, { variantId: v })} /></div>
                      <input aria-label="Roll number" value={r.rollNumber} onChange={(e) => setRoll(l, i, { rollNumber: e.target.value })} placeholder="Roll #" className={cell} />
                      <input aria-label="Chaurai ft" inputMode="decimal" value={r.widthFt} onChange={(e) => setRoll(l, i, { widthFt: digits(e.target.value) })} placeholder="Chaurai ft" className={cell} />
                      <input aria-label="Chaurai inch" inputMode="decimal" value={r.widthInch} onChange={(e) => setRoll(l, i, { widthInch: digits(e.target.value) })} placeholder="in" className={cell} />
                      <input aria-label="Lambai ft" inputMode="decimal" value={r.lengthFt} onChange={(e) => setRoll(l, i, { lengthFt: digits(e.target.value) })} placeholder="Lambai ft" className={cell} />
                      <input aria-label="Lambai inch" inputMode="decimal" value={r.lengthInch} onChange={(e) => setRoll(l, i, { lengthInch: digits(e.target.value) })} placeholder="in" className={cell} />
                      <input aria-label="Cost per sqft" inputMode="decimal" value={r.cost} onChange={(e) => setRoll(l, i, { cost: digits(e.target.value) })} placeholder="Cost/sqft" className={cell} />
                      <input aria-label="Rate per sqft" inputMode="decimal" value={r.rate} onChange={(e) => setRoll(l, i, { rate: digits(e.target.value) })} placeholder="Rate/sqft" className={cell} />
                      <div className="flex items-center gap-1">
                        <span className="flex-1 text-right text-[0.75rem] tabular-nums text-slate-600">{rollSqft(r)}</span>
                        <button type="button" aria-label="Roll hatayein" onClick={() => setLine(l.key, { rolls: l.rolls.filter((_, j) => j !== i) })} className="text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setLine(l.key, { rolls: [...l.rolls, l.rolls.length ? { ...l.rolls[l.rolls.length - 1], rollNumber: '' } : blankRoll(l.product)] })} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-[0.8125rem] font-semibold text-brand-700"><Plus className="h-3.5 w-3.5" />Roll</button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                  <Input label={`Quantity (${l.product.unit})`} inputMode="decimal" value={l.qty} onChange={(e) => setLine(l.key, { qty: digits(e.target.value) })} />
                  <Input label="Cost (ek ki)" inputMode="decimal" value={l.cost} onChange={(e) => setLine(l.key, { cost: digits(e.target.value) })} />
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="h-fit rounded-3xl lg:sticky lg:top-4" title="Bill aur payment">
          <div className="space-y-3">
            <Select label="Supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Supplier chunein" error={tried && !supplierId ? 'Supplier chunein' : undefined}
              options={(suppliers?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} />
            <Input label="Supplier ka bill number" value={invoice} onChange={(e) => setInvoice(e.target.value)} />
            <Select label="Payment" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={POS_PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))} />
            <Input label="Discount" inputMode="decimal" value={discount} onChange={(e) => setDiscount(digits(e.target.value))} />
            <Input label="Abhi diya" inputMode="decimal" value={paid} onChange={(e) => setPaid(digits(e.target.value))} placeholder={String(total)} hint="Khaali = poora diya; kam likhein to baqi supplier ke khate me" />
            <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="rounded-xl bg-slate-50 p-3 text-[0.875rem]">
              <div className="flex justify-between text-slate-600"><span>Maal</span><span className="tabular-nums">{formatPKR(subtotal)}</span></div>
              <div className="mt-1 flex justify-between text-[1.0625rem] font-bold text-slate-900"><span>Total</span><span className="tabular-nums">{formatPKR(total)}</span></div>
              {paid !== '' && n(paid) < total && <div className="flex justify-between text-amber-700"><span>Supplier ka baqi</span><span className="tabular-nums">{formatPKR(total - n(paid))}</span></div>}
            </div>
            {tried && errors.length > 0 && <p className="text-[0.8125rem] font-medium text-rose-600">{errors[0]}</p>}
            <Button className="w-full" onClick={() => void save()} loading={saving}><Save className="h-4 w-4" />Save (Ctrl+S)</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
