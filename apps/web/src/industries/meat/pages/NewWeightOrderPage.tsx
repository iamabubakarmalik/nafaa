/**
 * New or changed weight order: customer (or a walk-in name and phone), the
 * cuts with kg and rate, when it is needed, pickup or delivery, discount and
 * an advance. Money already received stays as it is when an order changes.
 *
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Building2, GraduationCap, Package, Save, Scissors, Trash2, Truck, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Card, PageHero, PageShell, Skeleton, Switch, Textarea, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { wholesaleApi } from '../api/wholesale.api';
import { weightOrdersApi, type OrderInput } from '../api/weight-orders.api';
import { CustomerPick, ItemPick, type PickedCustomer } from '../components/pickers';
import { MethodPicker } from '../components/money';
import { FormRow, inputBox, usePageKeys, useSaveKey } from '../components/ui';
import { KEYS, apiError, decimal, kg, type PayMethod } from '../lib/meta';

interface Line { productId: string; name: string; kg: string; rate: string; note: string; unit: string }

const CUT_STYLES = ['Karahi cut', 'Biryani cut', 'Qorma cut', 'Boti', 'Bina haddi', 'Qeema (do dafa)', 'Poora (bina kaate)'];
const OCCASIONS = ['Eid', 'Shadi', 'Restaurant roz ka', 'Dawat', 'Aqeeqa'];

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function NewWeightOrderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const editId = params.get('id');

  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [neededBy, setNeededBy] = useState('');
  const [isDelivery, setIsDelivery] = useState(false);
  const [address, setAddress] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState('');
  const [discount, setDiscount] = useState('');
  const [occasion, setOccasion] = useState('');
  const [cuttingStyle, setCuttingStyle] = useState('');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [tried, setTried] = useState(false);

  const existing = useQuery({ queryKey: [KEYS.orders, 'one', editId], queryFn: () => weightOrdersApi.getOne(editId!), enabled: !!editId, staleTime: 0 });
  useEffect(() => {
    const o = existing.data;
    if (!o) return;
    setCustomer(o.customerId ? { id: o.customerId, name: o.customerName ?? 'Customer', phone: o.customerPhone ?? null, balance: 0 } : null);
    setName(o.customerName ?? ''); setPhone(o.customerPhone ?? '');
    setLines(o.items.map((i) => ({ productId: i.productId ?? '', name: i.productName, kg: String(i.requestedKg), rate: String(i.pricePerKg), note: i.cuttingInstructions ?? '', unit: 'kg' })));
    setNeededBy(toLocalInput(o.neededBy)); setIsDelivery(o.isDelivery); setAddress(o.deliveryAddress ?? '');
    setDeliveryCharges(o.deliveryCharges ? String(o.deliveryCharges) : ''); setDiscount(o.discount ? String(o.discount) : '');
    setOccasion(o.occasion ?? ''); setCuttingStyle(o.cuttingStyle ?? ''); setNotes(o.specialInstructions ?? '');
  }, [existing.data]);

  // A restaurant account brings its delivery address and discount.
  const account = useQuery({ queryKey: [KEYS.wholesale, 'by-customer', customer?.id], queryFn: () => wholesaleApi.byCustomer(customer!.id).catch(() => null), enabled: !!customer?.id && !editId });
  useEffect(() => {
    const a = account.data;
    if (!a?.isActive) return;
    if (a.requiresDelivery) setIsDelivery(true);
    if (a.deliveryAddress) setAddress((v) => v || a.deliveryAddress!);
    if (!occasion) setOccasion('Restaurant roz ka');
  }, [account.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = lines.reduce((s, l) => s + (Number(l.kg) || 0) * (Number(l.rate) || 0), 0);
  const accDiscount = account.data?.isActive ? Math.round((subtotal * account.data.discountPct) / 100) : 0;
  const total = Math.max(subtotal + (Number(deliveryCharges) || 0) - (Number(discount) || 0), 0);
  const paid = existing.data?.paidAmount ?? 0;

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!customer && !name.trim() && !phone.trim()) e.customer = 'Customer chunein ya naam / phone likhein';
    if (phone.trim() && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) e.phone = 'Phone theek likhein (03xx-xxxxxxx)';
    if (!lines.length) e.lines = 'Kam se kam ek item jorein';
    lines.forEach((l, i) => {
      if (!(Number(l.kg) > 0)) e[`kg${i}`] = 'Kg likhein';
      if (!(Number(l.rate) > 0)) e[`rate${i}`] = 'Rate likhein';
    });
    if (isDelivery && !address.trim()) e.address = 'Delivery ka pata likhein';
    if ((Number(discount) || 0) > subtotal + (Number(deliveryCharges) || 0)) e.discount = 'Discount order se zyada nahi ho sakta';
    if (!editId && (Number(advance) || 0) > total + 0.005) e.advance = `Advance order (${formatPKR(total)}) se zyada nahi ho sakta`;
    if (editId && total + 0.005 < paid) e.total = `${formatPKR(paid)} advance mil chuka — order is se kam nahi ho sakta`;
    return e;
  }, [customer, name, phone, lines, isDelivery, address, discount, subtotal, deliveryCharges, advance, total, editId, paid]);
  const show = (k: string) => (tried ? errors[k] : undefined);

  const save = useMutation({
    mutationFn: () => {
      const body: OrderInput = {
        customerId: customer?.id ?? null, customerName: customer?.name ?? (name.trim() || undefined), customerPhone: (customer?.phone ?? phone.trim()) || undefined,
        neededBy: neededBy ? new Date(neededBy).toISOString() : null, isDelivery, deliveryAddress: isDelivery ? address.trim() : undefined,
        deliveryCharges: isDelivery ? Number(deliveryCharges) || 0 : 0, discount: Number(discount) || 0,
        occasion: occasion.trim() || undefined, cuttingStyle: cuttingStyle.trim() || undefined, specialInstructions: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, requestedKg: Number(l.kg), pricePerKg: Number(l.rate), cuttingInstructions: l.note.trim() || undefined })),
      };
      if (editId) return weightOrdersApi.update(editId, body);
      return weightOrdersApi.create({ ...body, advance: Number(advance) || 0, paymentMethod: method });
    },
    onSuccess: (o) => {
      toast.success(editId ? `${o.orderNumber} badal diya` : `Order ${o.orderNumber} ban gaya`);
      [KEYS.orders, 'cash-register', 'khata', 'customers', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate('/meat/weight-orders');
    },
    onError: (e) => toast.error(apiError(e, 'Order save nahi hua')),
  });
  const submit = () => {
    setTried(true);
    const first = Object.values(errors)[0];
    if (first) { toast.error(first); return; }
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);
  usePageKeys({ g: guide.open });

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (editId && existing.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;

  return (
    <PageShell>
      <PageHero
        title={editId ? `Order ${existing.data?.orderNumber ?? ''} badlein` : 'Naya wazan wala order'}
        chip={<><Package /> Order</>}
        meta="Kitne kg, kaunsa cut, kab chahiye — advance abhi lein, bill dete waqt banega"
        actions={<>
          <button type="button" onClick={() => navigate('/meat/weight-orders')} className={heroButton}><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Orders</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={submit} disabled={save.isPending} title="Save (Ctrl+S)" className={heroPrimaryButton}><Save className="h-4 w-4" /> Save</button>
        </>}
        stats={[{ label: 'Kul', value: formatPKR(total) }, { label: 'Wazan', value: kg(lines.reduce((s, l) => s + (Number(l.kg) || 0), 0)) }, { label: 'Items', value: lines.length }]}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <Card title="Customer" description="Purana customer chunein — khata usi ka. Naya ho to naam aur phone kaafi hai">
            <div className="space-y-3">
              <CustomerPick value={customer} onChange={setCustomer} error={!customer ? show('customer') : undefined} />
              {!customer && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormRow label="Ya naam (walk-in)"><input value={name} onChange={(e) => setName(e.target.value)} className={inputBox} placeholder="Ahmed sahab" maxLength={120} /></FormRow>
                  <FormRow label="Phone" error={show('phone')} hint="Tayyar hone par isi par batayein"><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={inputBox} placeholder="03xx-xxxxxxx" aria-invalid={!!show('phone')} /></FormRow>
                </div>
              )}
              {account.data?.isActive && (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
                  <Building2 className="h-4 w-4" />{account.data.businessName} — wholesale account{account.data.discountPct ? `, ${account.data.discountPct}% discount (${formatPKR(accDiscount)})` : ''}
                  {account.data.discountPct > 0 && <button type="button" className="ml-auto font-semibold hover:underline" onClick={() => setDiscount(String(accDiscount))}>Lagayein</button>}
                </p>
              )}
            </div>
          </Card>

          <Card title="Kya chahiye" description="Rate aaj ka lagta hai; is order ke liye badal sakte hain">
            <div className="space-y-3">
              <ItemPick onPick={(i) => setLines((ls) => [...ls, { productId: i.id, name: i.name, kg: '', rate: String(i.price), note: '', unit: i.unit }])} exclude={lines.map((l) => l.productId)} placeholder="Item dhoondein: boneless, qeema, raan…" error={show('lines')} />
              {lines.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                  {lines.map((l, i) => (
                    <li key={l.productId} className="grid gap-2 p-3 sm:grid-cols-[1fr_6.5rem_7rem_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{l.name}</p>
                        <input value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} maxLength={300} placeholder="Hidayat: chhoti boti, charbi alag…" className="mt-1 h-9 w-full rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <FormRow label={`Kitne ${l.unit}`} error={show(`kg${i}`)}><input autoFocus={!l.kg && i === lines.length - 1} inputMode="decimal" value={l.kg} onChange={(e) => setLine(i, { kg: decimal(e.target.value) })} className={cn(inputBox, 'text-right font-semibold tabular-nums')} aria-invalid={!!show(`kg${i}`)} /></FormRow>
                      <FormRow label="Rate" error={show(`rate${i}`)}><input inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: decimal(e.target.value) })} className={cn(inputBox, 'text-right tabular-nums')} aria-invalid={!!show(`rate${i}`)} /></FormRow>
                      <div className="flex items-center gap-2 sm:pt-7">
                        <span className="w-24 text-right font-semibold tabular-nums">{formatPKR((Number(l.kg) || 0) * (Number(l.rate) || 0))}</span>
                        <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <FormRow label="Cutting kaisi" hint="Sab items par — har line ki apni hidayat bhi likh sakte hain">
                <div className="flex flex-wrap gap-1.5">
                  {CUT_STYLES.map((c) => <button key={c} type="button" onClick={() => setCuttingStyle(cuttingStyle === c ? '' : c)} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium ring-1', cuttingStyle === c ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}><Scissors className="mr-1 inline h-3 w-3" />{c}</button>)}
                </div>
              </FormRow>
            </div>
          </Card>

          <Card title="Kab aur kahan">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormRow label="Kab chahiye" hint="Isi se Aaj dene aur Late ka pata chalta hai"><input type="datetime-local" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={inputBox} /></FormRow>
                <FormRow label="Mauqa (marzi)">
                  <input value={occasion} onChange={(e) => setOccasion(e.target.value)} list="meat-occasions" maxLength={120} className={inputBox} placeholder="Eid, shadi…" />
                  <datalist id="meat-occasions">{OCCASIONS.map((o) => <option key={o} value={o} />)}</datalist>
                </FormRow>
              </div>
              <Switch checked={isDelivery} onChange={(e) => setIsDelivery(e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><Truck className="h-4 w-4" />Ghar / restaurant par delivery</span>} />
              {isDelivery && (
                <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
                  <FormRow label="Pata" error={show('address')}><input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={1000} className={inputBox} placeholder="Ghar #, gali, mohalla" aria-invalid={!!show('address')} /></FormRow>
                  <FormRow label="Delivery charge"><input inputMode="decimal" value={deliveryCharges} onChange={(e) => setDeliveryCharges(decimal(e.target.value))} className={cn(inputBox, 'text-right')} placeholder="0" /></FormRow>
                </div>
              )}
              <Textarea label="Note (marzi)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Subah 9 baje se pehle, gate par call karein…" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card title="Hisaab">
            <dl className="space-y-1.5 text-[0.875rem]">
              <div className="flex justify-between"><dt className="text-slate-600">Items</dt><dd className="tabular-nums">{formatPKR(subtotal)}</dd></div>
              {isDelivery && <div className="flex justify-between"><dt className="text-slate-600">Delivery</dt><dd className="tabular-nums">{formatPKR(Number(deliveryCharges) || 0)}</dd></div>}
              <div className="flex items-center justify-between gap-2"><dt className="text-slate-600">Discount</dt>
                <dd><input inputMode="decimal" aria-label="Discount" value={discount} onChange={(e) => setDiscount(decimal(e.target.value))} placeholder="0" className="h-9 w-28 rounded-lg bg-slate-100 px-2 text-right tabular-nums outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" /></dd></div>
              {show('discount') && <p className="text-[0.75rem] font-medium text-rose-600">{show('discount')}</p>}
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(total)}</dd></div>
              {show('total') && <p className="text-[0.75rem] font-medium text-rose-600">{show('total')}</p>}
            </dl>
          </Card>
          {editId ? (
            <Card title="Paisa">
              <p className="text-[0.875rem] text-slate-700">Mil chuka: <strong className="tabular-nums">{formatPKR(paid)}</strong></p>
              <p className="mt-1 text-[0.75rem] text-slate-500">Mazeed advance orders ki list se "Paisa mila" se lein.</p>
            </Card>
          ) : (
            <Card title="Advance" description="Abhi jo mila — aaj ke galle aur customer ke khate me jata hai">
              <div className="space-y-2">
                <input inputMode="decimal" aria-label="Advance" value={advance} onChange={(e) => setAdvance(decimal(e.target.value))} placeholder="0" aria-invalid={!!show('advance')}
                  className={cn(inputBox, 'text-center text-xl font-bold tabular-nums')} />
                {show('advance') && <p className="text-[0.75rem] font-medium text-rose-600">{show('advance')}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {[0.5, 1].map((f) => total > 0 && <Button key={f} size="sm" variant="secondary" onClick={() => setAdvance(String(Math.round(total * f)))}>{f === 1 ? 'Poora' : 'Aadha'} {formatPKR(Math.round(total * f))}</Button>)}
                </div>
                {(Number(advance) || 0) > 0 && <MethodPicker value={method} onChange={setMethod} />}
              </div>
            </Card>
          )}
          <Button className="w-full" size="lg" loading={save.isPending} onClick={submit} leftIcon={<Save className="h-4 w-4" />}>{editId ? 'Badlav save karein' : 'Order save karein'} <span className="ml-1 text-xs opacity-80">Ctrl+S</span></Button>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title="Naya order" onClose={guide.close}
          steps={[
            { icon: Package, color: '#7c3aed', title: 'Customer aur items', text: 'Customer chunein ya naam / phone likhein. Item dhoond kar kg likhein — rate aaj ka aata hai, is order ke liye badal sakte hain.' },
            { icon: Truck, color: '#0891b2', title: 'Kab aur delivery', text: 'Kab chahiye likhein; delivery ho to pata aur charge. Restaurant account ka pata khud aa jata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Jo paisa abhi mila likhein — cash, card ya JazzCash. Ye khate me jama hota hai aur bill me kat jata hai.' },
          ]}
          tips={['Asal wazan tolne ke baad orders ki list me "Wazan" se likhein.', 'Ctrl+S se save.']}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
