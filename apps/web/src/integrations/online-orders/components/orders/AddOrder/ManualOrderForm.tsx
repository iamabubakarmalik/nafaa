/**
 * The Add order form: source, customer, items, charges, COD or paid with an
 * optional advance, where to save it (Nafaa only, or Nafaa and a Shopify
 * store), replacement link and "accept right away".
 */

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { Alert, Button, Card, Checkbox, Input, Segmented, Select, Textarea } from '@/design-system/components';
import { BrandLogo, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, type AdvanceMethod, type SalesChannel } from '../../../api/online-orders.api';
import { orderBoardApi, type OrderSource } from '../../../api/order-board.api';
import { ItemsEditor, TotalsBox, subtotalOf, type ItemLine } from '../ItemsEditor';
import { useBoardRefresh } from '../useMoveOrder';
import { t } from '@core/i18n';

/** The order a replacement is sent for. */
export interface ReplacementInfo { id: string; number: string; customerName: string }

export interface ManualDraft {
  source: OrderSource;
  customer: { name: string; phone: string; address: string; city: string };
  items: ItemLine[];
  discount: number;
  deliveryFee: number;
  isCod: boolean;
  advance: number;
  advanceMethod: AdvanceMethod;
  weight: string;
  notes: string;
  target: string;
  accept: boolean;
}

export const emptyDraft = (): ManualDraft => ({
  source: 'WHATSAPP', customer: { name: '', phone: '', address: '', city: '' }, items: [], discount: 0, deliveryFee: 0,
  isCod: true, advance: 0, advanceMethod: 'JAZZCASH', weight: '', notes: '', target: 'NAFAA', accept: false,
});

export const SOURCES: Array<{ id: OrderSource; label: string; brand?: BrandName }> = [
  { id: 'MANUAL', label: t('Manual') },
  { id: 'WHATSAPP', label: 'WhatsApp', brand: 'whatsapp' },
  { id: 'INSTAGRAM', label: 'Instagram', brand: 'meta' },
  { id: 'FACEBOOK', label: 'Facebook', brand: 'meta' },
  { id: 'PHONE', label: t('Phone') },
  { id: 'TIKTOK', label: 'TikTok', brand: 'tiktok' },
];

const METHODS: Array<{ value: AdvanceMethod; label: string }> = [
  { value: 'JAZZCASH', label: 'JazzCash' }, { value: 'EASYPAISA', label: 'Easypaisa' }, { value: 'BANK', label: t('Bank') },
  { value: 'CASH', label: t('Cash') }, { value: 'OTHER', label: t('Doosra') },
];

export function ManualOrderForm({ draft, onChange, shopify, replacement, money, onCreated }: {
  draft: ManualDraft;
  onChange: (d: ManualDraft) => void;
  shopify: SalesChannel[];
  replacement?: ReplacementInfo | null;
  money: (n: number) => string;
  onCreated: (id: string, number: string, accepted: boolean) => void;
}) {
  const refresh = useBoardRefresh();
  const [tried, setTried] = useState(false);
  const d = draft;
  const set = <K extends keyof ManualDraft>(k: K, v: ManualDraft[K]) => onChange({ ...d, [k]: v });
  const setCustomer = (k: keyof ManualDraft['customer'], v: string) => onChange({ ...d, customer: { ...d.customer, [k]: v } });
  const subtotal = useMemo(() => subtotalOf(d.items), [d.items]);
  const total = Math.max(0, subtotal - d.discount + d.deliveryFee);

  const problems = [
    !d.customer.name.trim() && t('Customer ka naam likhein'),
    d.customer.phone.replace(/\D/g, '').length < 10 && t('Sahi phone number likhein'),
    !d.items.length && t('Kam se kam ek cheez jorein'),
    d.items.some((i) => !i.productId) && t('Har cheez ko Nafaa product se jorein'),
    d.items.some((i) => !(i.quantity > 0)) && t('Qty 0 se zyada honi chahiye'),
    d.isCod && d.advance > total && t('Advance total se zyada hai'),
  ].filter(Boolean) as string[];

  const save = useMutation({
    mutationFn: () => orderBoardApi.createManual({
      source: d.source,
      target: d.target,
      customer: { name: d.customer.name.trim(), phone: d.customer.phone.trim(), address: d.customer.address.trim() || undefined, city: d.customer.city.trim() || undefined },
      items: d.items.map((i) => ({ productId: i.productId!, variantId: i.variantId ?? null, quantity: Number(i.quantity), price: Number(i.price) })),
      discount: d.discount || undefined,
      deliveryFee: d.deliveryFee || undefined,
      isCod: d.isCod,
      advance: d.isCod && d.advance > 0 ? { amount: d.advance, method: d.advanceMethod } : undefined,
      weightKg: d.weight ? Number(d.weight) : undefined,
      notes: d.notes.trim() || undefined,
      replacementOf: replacement?.id,
      accept: d.accept,
    }),
    onSuccess: (r) => {
      const o = r.order;
      refresh(o.id);
      if (d.accept && !r.accepted) toast.error(t('Order ban gaya magar accept nahi hua: {{error}}', { error: r.acceptError ?? '' }), { duration: 10_000 });
      if (r.advanceError) toast.error(t('Advance save nahi hua: {{error}}', { error: r.advanceError }), { duration: 10_000 });
      if (r.sync && !r.sync.ok) toast.error(t('{{channel}} par nahi bana: {{message}}', { channel: r.sync.channel, message: r.sync.message }), { duration: 10_000 });
      onCreated(o.id, String(o.externalOrderNumber ?? o.externalOrderId ?? ''), r.accepted);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Order nahi bana'))),
  });
  const submit = () => { setTried(true); if (!problems.length) save.mutate(); };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-4">
        <Card title={t('Order kahan se aaya?')}>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s.id} type="button" onClick={() => set('source', s.id)} aria-pressed={d.source === s.id}
                className={cn('inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1 transition',
                  d.source === s.id ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                {s.brand && <BrandLogo name={s.brand} size={18} />}{s.label}
              </button>
            ))}
          </div>
        </Card>
        {replacement && (
          <Alert tone="info" title={t('Replacement order')}>{t('Ye order #{{no}} ({{name}}) ke badle me ja raha hai. Dono aapas me jure rahenge.', { no: replacement.number, name: replacement.customerName })}</Alert>
        )}
        <Card title={t('Customer')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label={t('Naam')} value={d.customer.name} onChange={(e) => setCustomer('name', e.target.value)} required />
            <Input label={t('Phone')} value={d.customer.phone} onChange={(e) => setCustomer('phone', e.target.value)} inputMode="tel" placeholder="03xx xxxxxxx" required />
            <Input label={t('Shehar')} value={d.customer.city} onChange={(e) => setCustomer('city', e.target.value)} />
            <Input label={t('Address')} value={d.customer.address} onChange={(e) => setCustomer('address', e.target.value)} wrapperClassName="sm:col-span-2" />
          </div>
        </Card>
        <Card title={t('Cheezein')}>
          <ItemsEditor items={d.items} onChange={(items) => set('items', items)} money={money} requireProduct />
        </Card>
        <Card title={t('Note')}>
          <Textarea rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder={t('Order ke saath note (slip par chhapta hai)')} />
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card title={t('Paisa')}>
          <Segmented value={d.isCod ? 'COD' : 'PAID'} onChange={(v) => set('isCod', v === 'COD')} className="w-full [&>button]:flex-1"
            items={[{ value: 'COD', label: t('COD') }, { value: 'PAID', label: t('Paid') }]} />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input type="number" min={0} label={t('Discount')} value={d.discount} onChange={(e) => set('discount', Math.max(0, Number(e.target.value)))} />
            <Input type="number" min={0} label={t('Delivery charges')} value={d.deliveryFee} onChange={(e) => set('deliveryFee', Math.max(0, Number(e.target.value)))} />
            {d.isCod && <>
              <Input type="number" min={0} label={t('Advance mila')} value={d.advance} onChange={(e) => set('advance', Math.max(0, Number(e.target.value)))} />
              <Select label={t('Kaise mila')} value={d.advanceMethod} onChange={(e) => set('advanceMethod', e.target.value as AdvanceMethod)} options={METHODS} disabled={!d.advance} />
            </>}
            <Input type="number" min={0} step="0.1" label={t('Wazan (kg)')} value={d.weight} onChange={(e) => set('weight', e.target.value)} placeholder="0.5" wrapperClassName="col-span-2" />
          </div>
          <div className="mt-4"><TotalsBox subtotal={subtotal} discount={d.discount} deliveryFee={d.deliveryFee} money={money} advance={d.isCod ? d.advance : 0} /></div>
        </Card>
        <Card title={t('Kahan save ho?')}>
          <div className="space-y-1.5">
            {[{ id: 'NAFAA', label: t('Sirf Nafaa'), hint: t('Order sirf yahan banega') }, ...shopify.map((s) => ({ id: s.id, label: t('Nafaa + {{store}}', { store: s.displayName }), hint: t('Shopify par bhi order banega') }))].map((x) => (
              <label key={x.id} className={cn('flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 ring-1', d.target === x.id ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200')}>
                <input type="radio" name="target" className="mt-1" checked={d.target === x.id} onChange={() => set('target', x.id)} />
                <span><span className="block text-[0.875rem] font-medium text-slate-900">{x.label}</span><span className="block text-[0.75rem] text-slate-500">{x.hint}</span></span>
              </label>
            ))}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <Checkbox checked={d.accept} onChange={(e) => set('accept', e.target.checked)} label={t('Accept bhi kar dein')} description={t('Bill abhi ban jayega aur stock kam ho jayega')} />
          </div>
          {tried && problems.length > 0 && (
            <ul className="mt-3 space-y-0.5 text-[0.75rem] text-rose-600">{problems.map((p) => <li key={p}>• {p}</li>)}</ul>
          )}
          <Button className="mt-4 w-full" leftIcon={<Save className="h-4 w-4" />} loading={save.isPending} onClick={submit}>{t('Order banayein')}</Button>
        </Card>
      </div>
    </div>
  );
}
