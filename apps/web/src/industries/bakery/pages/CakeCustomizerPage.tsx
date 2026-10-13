/**
 * Book or change a cake order on one page: customer, the cake (size, shape,
 * flavour, cream, diet), design notes with the cake photo and reference
 * pictures, the occasion, pickup or delivery time and place, and the price
 * with advance and balance. After booking: WhatsApp confirmation and the
 * printed order slip. Opens for editing at /bakery/cake-orders/:id/edit.
 *
 * Keys: Ctrl+Enter save · Esc back.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Cake, CheckCircle2, ChefHat, Clock, Heart, ImagePlus, MessageCircle, Package, Palette, PartyPopper,
  Phone, Printer, Search, Sparkles, Truck, User, Wallet, X,
} from 'lucide-react';
import { Button, Card, Input, Kbd, Modal, PageShell, Select, Skeleton, Switch, Textarea } from '@/design-system/components';
import { UploadDropzone } from '@core/components/uploads';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { cakeOrdersApi, type CakeOrder } from '../api/cake-orders.api';
import type { BakerySize, CakeFlavor, CakeShape, CreamType } from '../api/products.api';
import { CREAMS, FLAVORS, OCCASIONS, SHAPES, SIZES } from '../api/constants';
import { cakeMessage, printCakeSlip } from '../components/orderSlip';
import { CAKE_KEY, DELIVERY, apiError, dateTime, fromLocalInput, isClosed, isDelivery, toLocalInput, waLink } from '../components/meta';

interface Draft {
  customerId: string; customerName: string; customerPhone: string; customerEmail: string;
  productId: string; productName: string;
  size: BakerySize; customWeightKg: string; shape: CakeShape; customShapeDesc: string; numberOfTiers: string; numberOrLetter: string;
  flavor: CakeFlavor; customFlavorDesc: string; creamType: CreamType | '';
  isEggless: boolean; isSugarFree: boolean; isVegan: boolean; allergies: string[]; dietaryNotes: string;
  messageOnCake: string; messageColor: string; hasPhotoOnCake: boolean; photoUrl: string; hasEdibleImage: boolean;
  designReferenceUrls: string[]; designInstructions: string; colorTheme: string; primaryColor: string; secondaryColor: string;
  decorativeItems: string[]; candlesRequired: string; candleType: string; cakeStand: boolean; cakeKnife: boolean;
  occasion: string; celebrantName: string; celebrantAge: string; eventDate: string; eventTime: string; eventVenue: string;
  deliveryType: string; neededBy: string; deliveryAddress: string; deliveryLandmark: string; deliveryCharges: string;
  basePrice: string; customizationCharges: string; photoCakeCharges: string; taxAmount: string; discount: string;
  advanceRequired: string; advancePaid: string; confirmed: boolean;
  specialInstructions: string; internalNotes: string;
}

const EMPTY: Draft = {
  customerId: '', customerName: '', customerPhone: '', customerEmail: '', productId: '', productName: '',
  size: 'TWO_POUND', customWeightKg: '', shape: 'ROUND', customShapeDesc: '', numberOfTiers: '2', numberOrLetter: '',
  flavor: 'CHOCOLATE', customFlavorDesc: '', creamType: 'WHIPPED_CREAM',
  isEggless: false, isSugarFree: false, isVegan: false, allergies: [], dietaryNotes: '',
  messageOnCake: '', messageColor: '', hasPhotoOnCake: false, photoUrl: '', hasEdibleImage: false,
  designReferenceUrls: [], designInstructions: '', colorTheme: '', primaryColor: '', secondaryColor: '',
  decorativeItems: [], candlesRequired: '', candleType: '', cakeStand: false, cakeKnife: false,
  occasion: 'BIRTHDAY', celebrantName: '', celebrantAge: '', eventDate: '', eventTime: '', eventVenue: '',
  deliveryType: 'SELF_PICKUP', neededBy: '', deliveryAddress: '', deliveryLandmark: '', deliveryCharges: '',
  basePrice: '', customizationCharges: '', photoCakeCharges: '', taxAmount: '', discount: '',
  advanceRequired: '', advancePaid: '', confirmed: true, specialInstructions: '', internalNotes: '',
};

const QUICK_SIZES: BakerySize[] = ['HALF_POUND', 'ONE_POUND', 'TWO_POUND', 'THREE_POUND', 'FIVE_POUND', 'ONE_KG', 'TWO_KG', 'CUSTOM'];
const DECORATIONS = ['Phool', 'Fondant figure', 'Sprinkles', 'Chocolate drip', 'Taaza phal', 'Gold leaf', 'Topper', 'Macarons', 'Pearls', 'Ghubbare'];
const ALLERGIES = ['Nuts', 'Mungphali', 'Doodh', 'Gluten', 'Soya'];
const TIER_SHAPES: CakeShape[] = ['TIER_2', 'TIER_3', 'TIER_4', 'TIER_5'];
const num = (v: string) => Number(v) || 0;
const digitsOnly = (v: string) => v.replace(/[^\d.]/g, '');
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Common due times: this evening, tomorrow morning and evening, day after. */
function quickTimes() {
  const at = (days: number, h: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, 0, 0, 0); return d; };
  return [
    { label: 'Aaj shaam 7', d: at(0, 19) },
    { label: 'Kal subah 11', d: at(1, 11) },
    { label: 'Kal shaam 7', d: at(1, 19) },
    { label: 'Parson shaam 7', d: at(2, 19) },
  ].filter((x) => x.d.getTime() > Date.now() + 30 * 60_000);
}

function fromOrder(o: CakeOrder): Draft {
  const s = (v?: string | number | null) => (v == null ? '' : String(v));
  return {
    ...EMPTY,
    customerId: s(o.customerId), customerName: o.customerName, customerPhone: o.customerPhone, customerEmail: s(o.customerEmail),
    productId: s(o.productId), productName: s(o.productName),
    size: o.size, customWeightKg: s(o.customWeightKg), shape: o.shape, customShapeDesc: s(o.customShapeDesc), numberOfTiers: s(o.numberOfTiers || 1), numberOrLetter: s(o.numberOrLetter),
    flavor: o.flavor, customFlavorDesc: s(o.customFlavorDesc), creamType: o.creamType ?? '',
    isEggless: o.isEggless, isSugarFree: o.isSugarFree, isVegan: o.isVegan, allergies: o.allergies ?? [], dietaryNotes: s(o.dietaryNotes),
    messageOnCake: s(o.messageOnCake), messageColor: s(o.messageColor), hasPhotoOnCake: o.hasPhotoOnCake, photoUrl: s(o.photoUrl), hasEdibleImage: o.hasEdibleImage,
    designReferenceUrls: o.designReferenceUrls ?? [], designInstructions: s(o.designInstructions), colorTheme: s(o.colorTheme), primaryColor: s(o.primaryColor), secondaryColor: s(o.secondaryColor),
    decorativeItems: o.decorativeItems ?? [], candlesRequired: o.candlesRequired ? String(o.candlesRequired) : '', candleType: s(o.candleType), cakeStand: o.cakeStand, cakeKnife: o.cakeKnife,
    occasion: o.occasion || 'OTHER', celebrantName: s(o.celebrantName), celebrantAge: o.celebrantAge ? String(o.celebrantAge) : '',
    eventDate: o.eventDate ? o.eventDate.slice(0, 10) : '', eventTime: s(o.eventTime), eventVenue: s(o.eventVenue),
    deliveryType: o.deliveryType, neededBy: toLocalInput(o.neededBy), deliveryAddress: s(o.deliveryAddress), deliveryLandmark: s(o.deliveryLandmark),
    deliveryCharges: o.deliveryCharges ? String(o.deliveryCharges) : '',
    basePrice: o.basePrice ? String(o.basePrice) : '', customizationCharges: o.customizationCharges ? String(o.customizationCharges) : '',
    photoCakeCharges: o.photoCakeCharges ? String(o.photoCakeCharges) : '', taxAmount: o.taxAmount ? String(o.taxAmount) : '', discount: o.discount ? String(o.discount) : '',
    advanceRequired: String(o.advanceRequired ?? ''), advancePaid: '', confirmed: !['DRAFT', 'QUOTED'].includes(o.status),
    specialInstructions: s(o.specialInstructions), internalNotes: s(o.internalNotes),
  };
}

export default function CakeCustomizerPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Bakery';
  const lock = useRef(false);
  useReceiptSetup();

  const orderQ = useQuery({ queryKey: [CAKE_KEY, 'one', id], queryFn: () => cakeOrdersApi.getOne(id!), enabled: editing });
  const [f, setF] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<CakeOrder | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { if (orderQ.data && !loaded) { setF(fromOrder(orderQ.data)); setLoaded(true); } }, [orderQ.data, loaded]);

  const total = Math.max(num(f.basePrice) + num(f.customizationCharges) + num(f.photoCakeCharges) + (isDelivery(f.deliveryType) ? num(f.deliveryCharges) : 0) + num(f.taxAmount) - num(f.discount), 0);
  const alreadyPaid = editing ? Number(orderQ.data?.paidAmount || 0) : 0;
  const advanceNow = editing ? 0 : num(f.advancePaid);
  const advanceAsk = f.advanceRequired === '' ? Math.round(total * 0.5) : num(f.advanceRequired);
  const balance = Math.max(total - alreadyPaid - advanceNow, 0);
  const due = f.neededBy ? new Date(fromLocalInput(f.neededBy)) : null;

  const problems = useMemo(() => {
    const out: string[] = [];
    if (editing && orderQ.data && isClosed(orderQ.data.status)) out.push('De diya ya cancel order badla nahi ja sakta');
    if (!f.customerName.trim()) out.push('Customer ka naam likhein');
    if (f.customerPhone.replace(/\D/g, '').length < 10) out.push('Customer ka poora phone number likhein');
    if (f.size === 'CUSTOM' && !(num(f.customWeightKg) > 0)) out.push('Apne size ka wazan (kg) likhein');
    if (!due) out.push('Cake kab chahiye — date aur waqt chunein');
    else if (!editing && due.getTime() < Date.now() - 5 * 60_000) out.push('Yeh waqt guzar chuka — aage ka waqt chunein');
    if (!(num(f.basePrice) > 0)) out.push('Cake ki qeemat likhein');
    if (isDelivery(f.deliveryType) && !f.deliveryAddress.trim()) out.push('Pahunchane ka pata likhein');
    if (advanceNow > total) out.push('Advance kul rakam se zyada nahi ho sakta');
    if (editing && total + 0.005 < alreadyPaid) out.push(`${formatPKR(alreadyPaid)} pehle mil chuka — kul rakam is se kam nahi ho sakti`);
    return out;
  }, [f, editing, orderQ.data, due, total, advanceNow, alreadyPaid]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const opt = (v: string) => v.trim();
      const body: Record<string, unknown> = {
        customerId: f.customerId || undefined, customerName: f.customerName.trim(), customerPhone: f.customerPhone.trim(), customerEmail: opt(f.customerEmail),
        productId: f.productId || undefined, productName: opt(f.productName),
        size: f.size, customWeightKg: f.size === 'CUSTOM' ? num(f.customWeightKg) : undefined,
        shape: f.shape, customShapeDesc: f.shape === 'CUSTOM_SHAPE' ? opt(f.customShapeDesc) : '',
        numberOfTiers: TIER_SHAPES.includes(f.shape) ? Math.max(Math.round(num(f.numberOfTiers)), 2) : 1,
        numberOrLetter: ['NUMBER', 'LETTER'].includes(f.shape) ? opt(f.numberOrLetter) : '',
        flavor: f.flavor, customFlavorDesc: f.flavor === 'CUSTOM_FLAVOR' ? opt(f.customFlavorDesc) : '', creamType: f.creamType || undefined,
        isEggless: f.isEggless, isSugarFree: f.isSugarFree, isVegan: f.isVegan, allergies: f.allergies, dietaryNotes: opt(f.dietaryNotes),
        messageOnCake: opt(f.messageOnCake), messageColor: opt(f.messageColor),
        hasPhotoOnCake: f.hasPhotoOnCake, photoUrl: f.hasPhotoOnCake ? f.photoUrl : '', hasEdibleImage: f.hasPhotoOnCake && f.hasEdibleImage,
        designReferenceUrls: f.designReferenceUrls, designInstructions: opt(f.designInstructions),
        colorTheme: opt(f.colorTheme), primaryColor: opt(f.primaryColor), secondaryColor: opt(f.secondaryColor), decorativeItems: f.decorativeItems,
        candlesRequired: num(f.candlesRequired) > 0 ? Math.round(num(f.candlesRequired)) : undefined, candleType: opt(f.candleType),
        cakeStand: f.cakeStand, cakeKnife: f.cakeKnife,
        occasion: f.occasion, celebrantName: opt(f.celebrantName), celebrantAge: num(f.celebrantAge) > 0 ? Math.round(num(f.celebrantAge)) : undefined,
        eventDate: f.eventDate || '', eventTime: opt(f.eventTime), eventVenue: opt(f.eventVenue),
        deliveryType: f.deliveryType, neededBy: fromLocalInput(f.neededBy),
        deliveryTime: due ? `${String(due.getHours()).padStart(2, '0')}:${String(due.getMinutes()).padStart(2, '0')}` : '',
        deliveryAddress: isDelivery(f.deliveryType) ? opt(f.deliveryAddress) : '', deliveryLandmark: isDelivery(f.deliveryType) ? opt(f.deliveryLandmark) : '',
        deliveryCharges: isDelivery(f.deliveryType) ? num(f.deliveryCharges) : 0,
        basePrice: num(f.basePrice), customizationCharges: num(f.customizationCharges), photoCakeCharges: num(f.photoCakeCharges),
        taxAmount: num(f.taxAmount), discount: num(f.discount), advanceRequired: advanceAsk,
        specialInstructions: opt(f.specialInstructions), internalNotes: opt(f.internalNotes),
      };
      if (editing) return cakeOrdersApi.update(id!, body);
      return cakeOrdersApi.create({ ...body, advancePaid: advanceNow, status: f.confirmed || advanceNow > 0 ? 'CONFIRMED' : 'QUOTED' });
    },
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: [CAKE_KEY] });
      if (editing) { toast.success('Order save ho gaya'); navigate(`/bakery/cake-orders/${o.id}`); return; }
      toast.success(`Order ${o.orderNumber} ban gaya`);
      setSaved(o);
    },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { if (lock.current || save.isPending || saved) return; lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && orderQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><Skeleton className="h-[40rem] rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (editing && !orderQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Yeh order nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/bakery/cake-orders')}>Orders par wapas</Button></div></PageShell>;

  const tiered = TIER_SHAPES.includes(f.shape);
  const delivers = isDelivery(f.deliveryType);

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${orderQ.data?.orderNumber} — badlein` : 'Naya cake order'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Jo badalna hai badlein — mila hua paisa yahan se nahi badalta' : 'Customer, cake, design, waqt aur advance — sab ek safhe par'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <CustomerCard f={f} set={set} />

          <Card className="rounded-2xl" title={<T icon={Cake}>Cake</T>} description="Size, shakal, flavour aur cream">
            <div className="space-y-4">
              <ProductPicker productId={f.productId} productName={f.productName}
                onPick={(p) => setF((x) => ({ ...x, productId: p?.id ?? '', productName: p?.name ?? '', basePrice: x.basePrice || (p?.price ? String(p.price) : '') }))} />
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Size</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SIZES.map((s) => <Chip key={s} on={f.size === s} onClick={() => set('size', s)}>{SIZES.find((x) => x.value === s)?.label ?? s}</Chip>)}
                  <select value={QUICK_SIZES.includes(f.size) ? '' : f.size} onChange={(e) => e.target.value && set('size', e.target.value as BakerySize)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] text-slate-700" aria-label="Aur size">
                    <option value="">Aur size…</option>
                    {SIZES.filter((s) => !QUICK_SIZES.includes(s.value)).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                {f.size === 'CUSTOM' && <Input className="mt-2" label="Wazan (kg)" inputMode="decimal" value={f.customWeightKg} onChange={(e) => set('customWeightKg', digitsOnly(e.target.value))} placeholder="2.5" hint="Kitne kilo ka cake" wrapperClassName="mt-2 max-w-xs" />}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Shakal" value={f.shape} onChange={(e) => set('shape', e.target.value as CakeShape)} options={SHAPES.map((s) => ({ value: s.value, label: `${s.emoji} ${s.label}` }))} />
                <Select label="Cream" value={f.creamType} onChange={(e) => set('creamType', e.target.value as CreamType | '')} options={[{ value: '', label: '—' }, ...CREAMS.map((c) => ({ value: c.value, label: `${c.emoji} ${c.label}` }))]} />
                {f.shape === 'CUSTOM_SHAPE' && <Input label="Kaisi shakal" value={f.customShapeDesc} onChange={(e) => set('customShapeDesc', e.target.value)} placeholder="Car, guitar, kitaab…" wrapperClassName="sm:col-span-2" />}
                {['NUMBER', 'LETTER'].includes(f.shape) && <Input label={f.shape === 'NUMBER' ? 'Kaunsa number' : 'Kaunsa harf'} value={f.numberOrLetter} onChange={(e) => set('numberOrLetter', e.target.value)} placeholder={f.shape === 'NUMBER' ? '25' : 'A'} />}
                {tiered && <Input label="Kitni manzil" inputMode="numeric" value={f.numberOfTiers} onChange={(e) => set('numberOfTiers', e.target.value.replace(/\D/g, ''))} hint="2 se 5" />}
              </div>
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Flavour</span>
                <div className="flex flex-wrap gap-1.5">
                  {FLAVORS.map((x) => <Chip key={x.value} on={f.flavor === x.value} onClick={() => set('flavor', x.value)}>{x.emoji} {x.label}</Chip>)}
                </div>
                {f.flavor === 'CUSTOM_FLAVOR' && <Input label="Kaunsa flavour" value={f.customFlavorDesc} onChange={(e) => set('customFlavorDesc', e.target.value)} wrapperClassName="mt-2" />}
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><Heart className="h-4 w-4 text-rose-500" />Parhez aur allergy</p>
                <div className="flex flex-wrap gap-1.5">
                  <Chip on={f.isEggless} onClick={() => set('isEggless', !f.isEggless)}>Anday ke bagair</Chip>
                  <Chip on={f.isSugarFree} onClick={() => set('isSugarFree', !f.isSugarFree)}>Cheeni ke bagair</Chip>
                  <Chip on={f.isVegan} onClick={() => set('isVegan', !f.isVegan)}>Vegan</Chip>
                  {ALLERGIES.map((a) => <Chip key={a} tone="rose" on={f.allergies.includes(a)} onClick={() => set('allergies', toggle(f.allergies, a))}>Allergy: {a}</Chip>)}
                </div>
                <Input size="sm" value={f.dietaryNotes} onChange={(e) => set('dietaryNotes', e.target.value)} placeholder="Koi aur baat — maslan kam meetha" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Palette}>Design</T>} description="Kitchen parchi par yahi chhapta hai">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Input label="Cake par kya likhna hai" value={f.messageOnCake} onChange={(e) => set('messageOnCake', e.target.value)} maxLength={100} placeholder="Happy Birthday Ali" hint={`${f.messageOnCake.length}/100 — spelling customer se dobara poochein`} />
                <Input label="Likhai ka rang" value={f.messageColor} onChange={(e) => set('messageColor', e.target.value)} placeholder="Sunehri, safaid…" />
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <Switch checked={f.hasPhotoOnCake} onChange={(e) => set('hasPhotoOnCake', e.target.checked)} label="Photo cake" description="Customer ki photo cake par chhapni hai" />
                {f.hasPhotoOnCake && (
                  <div className="mt-3 space-y-2">
                    {f.photoUrl ? (
                      <div className="relative h-32 w-32 overflow-hidden rounded-xl ring-1 ring-slate-200">
                        <img src={f.photoUrl} alt="Cake ki photo" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => set('photoUrl', '')} aria-label="Photo hatayein" className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-rose-600 text-white"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <UploadDropzone multiple={false} maxFiles={1} purpose="product-image" hint="Customer ki di hui photo" onUploaded={(r) => r[0]?.url && set('photoUrl', r[0].url)} />
                    )}
                    <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700"><input type="checkbox" checked={f.hasEdibleImage} onChange={(e) => set('hasEdibleImage', e.target.checked)} className="h-4 w-4 accent-brand-600" />Edible print (khane wala kaghaz)</label>
                  </div>
                )}
              </div>
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><ImagePlus className="h-4 w-4" />Design ki misaal (photos)</span>
                {f.designReferenceUrls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {f.designReferenceUrls.map((u, i) => (
                      <div key={u} className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-slate-200">
                        <img src={u} alt={`Misaal ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => set('designReferenceUrls', f.designReferenceUrls.filter((x) => x !== u))} aria-label="Hatayein" className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-rose-600 text-white"><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {f.designReferenceUrls.length < 6 && <UploadDropzone maxFiles={6 - f.designReferenceUrls.length} purpose="product-image" hint="Customer ne jo design dikhaya — WhatsApp se save kar ke yahan daalein" onUploaded={(r) => set('designReferenceUrls', [...f.designReferenceUrls, ...r.map((x) => x.url).filter(Boolean)].slice(0, 6))} />}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Theme" value={f.colorTheme} onChange={(e) => set('colorTheme', e.target.value)} placeholder="Frozen, cricket…" />
                <Input label="Pehla rang" value={f.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} placeholder="Gulabi" />
                <Input label="Doosra rang" value={f.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)} placeholder="Safaid" />
              </div>
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Sajawat</span>
                <div className="flex flex-wrap gap-1.5">{[...DECORATIONS, ...f.decorativeItems.filter((d) => !DECORATIONS.includes(d))].map((d) => <Chip key={d} on={f.decorativeItems.includes(d)} onClick={() => set('decorativeItems', toggle(f.decorativeItems, d))}>{d}</Chip>)}</div>
              </div>
              <Textarea label="Design ki details" value={f.designInstructions} onChange={(e) => set('designInstructions', e.target.value)} rows={3} maxLength={2000} placeholder="Upar 3 gulab, side par sunehri moti, neeche naam…" hint="Jitna saaf likhenge, utni kam ghalti" />
              <div className="grid gap-3 sm:grid-cols-4">
                <Input label="Mombatti" inputMode="numeric" value={f.candlesRequired} onChange={(e) => set('candlesRequired', e.target.value.replace(/\D/g, ''))} placeholder="0" />
                <Input label="Kaisi mombatti" value={f.candleType} onChange={(e) => set('candleType', e.target.value)} placeholder="Number, sparkler" wrapperClassName="sm:col-span-3" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={f.cakeStand} onClick={() => set('cakeStand', !f.cakeStand)}>Cake stand</Chip>
                <Chip on={f.cakeKnife} onClick={() => set('cakeKnife', !f.cakeKnife)}>Chhuri</Chip>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={PartyPopper}>Mauqa</T>} description="Kis ke liye aur kab ka function">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">{OCCASIONS.map((o) => <Chip key={o.value} on={f.occasion === o.value} onClick={() => set('occasion', o.value)}>{o.emoji} {o.label}</Chip>)}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Kis ke liye" value={f.celebrantName} onChange={(e) => set('celebrantName', e.target.value)} placeholder="Ali" hint="Jis ki salgirah / shadi hai" />
                <Input label="Umar" inputMode="numeric" value={f.celebrantAge} onChange={(e) => set('celebrantAge', e.target.value.replace(/\D/g, ''))} placeholder="5" hint="Birthday ho to" />
                <Input label="Function ki date" type="date" value={f.eventDate} onChange={(e) => set('eventDate', e.target.value)} hint="Marzi hai" />
                <Input label="Function ka waqt" type="time" value={f.eventTime} onChange={(e) => set('eventTime', e.target.value)} hint="Marzi hai" />
                <Input label="Jagah" value={f.eventVenue} onChange={(e) => set('eventVenue', e.target.value)} placeholder="Ghar, hall ka naam" wrapperClassName="sm:col-span-2" hint="Marzi hai" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Truck}>Kab aur kaise</T>} description="Isi waqt ke hisaab se list me Aaj / Late aata hai">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {DELIVERY.map((d) => (
                  <button key={d.id} type="button" onClick={() => set('deliveryType', d.id)}
                    className={cn('flex items-start gap-2 rounded-xl p-2.5 text-left ring-1 transition', f.deliveryType === d.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                    <d.icon className={cn('mt-0.5 h-4 w-4 shrink-0', f.deliveryType === d.id ? 'text-brand-700' : 'text-slate-500')} />
                    <span><span className="block text-[0.8125rem] font-semibold text-slate-900">{d.label}</span><span className="block text-[0.6875rem] text-slate-500">{d.hint}</span></span>
                  </button>
                ))}
              </div>
              <Input label={delivers ? 'Kab pahunchana hai' : 'Customer kab lega'} required type="datetime-local" value={f.neededBy} onChange={(e) => set('neededBy', e.target.value)}
                hint={due ? dateTime(due.toISOString()) : 'Date aur waqt dono'} />
              <div className="flex flex-wrap gap-1.5">{quickTimes().map((t) => <Chip key={t.label} on={f.neededBy === toLocalInput(t.d.toISOString())} onClick={() => set('neededBy', toLocalInput(t.d.toISOString()))}><Clock className="h-3 w-3" />{t.label}</Chip>)}</div>
              {delivers && (
                <>
                  <Textarea label="Pata" required value={f.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} rows={2} placeholder="Ghar #, gali, mohalla" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input label="Nishani" value={f.deliveryLandmark} onChange={(e) => set('deliveryLandmark', e.target.value)} placeholder="Masjid ke saamne" />
                    <Input label="Delivery charges" inputMode="decimal" value={f.deliveryCharges} onChange={(e) => set('deliveryCharges', digitsOnly(e.target.value))} placeholder="0" />
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Qeemat aur advance</T>} description="Kul rakam khud jurti hai">
            <div className="space-y-3">
              <Input label="Cake ki qeemat" required inputMode="decimal" value={f.basePrice} onChange={(e) => set('basePrice', digitsOnly(e.target.value))} size="lg" className="text-right text-lg font-bold tabular-nums" placeholder="0" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Design / sajawat" inputMode="decimal" value={f.customizationCharges} onChange={(e) => set('customizationCharges', digitsOnly(e.target.value))} placeholder="0" />
                <Input label="Photo cake" inputMode="decimal" value={f.photoCakeCharges} onChange={(e) => set('photoCakeCharges', digitsOnly(e.target.value))} placeholder="0" />
                <Input label="Tax" inputMode="decimal" value={f.taxAmount} onChange={(e) => set('taxAmount', digitsOnly(e.target.value))} placeholder="0" />
                <Input label="Discount" inputMode="decimal" value={f.discount} onChange={(e) => set('discount', digitsOnly(e.target.value))} placeholder="0" />
              </div>
              <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
                <Row k="Cake" v={formatPKR(num(f.basePrice))} />
                {num(f.customizationCharges) > 0 && <Row k="Design" v={`+${formatPKR(num(f.customizationCharges))}`} />}
                {num(f.photoCakeCharges) > 0 && <Row k="Photo cake" v={`+${formatPKR(num(f.photoCakeCharges))}`} />}
                {delivers && num(f.deliveryCharges) > 0 && <Row k="Delivery" v={`+${formatPKR(num(f.deliveryCharges))}`} />}
                {num(f.taxAmount) > 0 && <Row k="Tax" v={`+${formatPKR(num(f.taxAmount))}`} />}
                {num(f.discount) > 0 && <Row k="Discount" v={`−${formatPKR(num(f.discount))}`} />}
                <Row k="Kul" v={formatPKR(total)} strong />
              </dl>
              <div>
                <Input label="Kitna advance chahiye" inputMode="decimal" value={f.advanceRequired} onChange={(e) => set('advanceRequired', digitsOnly(e.target.value))} placeholder={String(Math.round(total * 0.5))} hint="Khali chhorein to aadha" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">{[0, 25, 50, 100].map((p) => <Chip key={p} on={f.advanceRequired !== '' && num(f.advanceRequired) === Math.round((total * p) / 100)} onClick={() => set('advanceRequired', String(Math.round((total * p) / 100)))}>{p}%</Chip>)}</div>
              </div>
              {editing ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Ab tak mila: <b className="tabular-nums text-slate-900">{formatPKR(alreadyPaid)}</b>. Naya paisa order ke safhe par "Paisa mila" se likhein.</p>
              ) : (
                <>
                  <Input label="Abhi advance mila" inputMode="decimal" value={f.advancePaid} onChange={(e) => set('advancePaid', digitsOnly(e.target.value))} placeholder="0"
                    className="text-right font-semibold tabular-nums" hint={advanceNow > 0 && advanceNow < advanceAsk ? `${formatPKR(advanceAsk - advanceNow)} advance abhi kam hai` : 'Customer ne abhi kitna diya'} />
                  <div className="flex flex-wrap gap-1.5">
                    {[advanceAsk, total].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => <Chip key={v} on={num(f.advancePaid) === v} onClick={() => set('advancePaid', String(v))}>{v === total ? 'Poora' : 'Advance'} {formatPKR(v)}</Chip>)}
                  </div>
                  {advanceNow <= 0 && <Switch checked={f.confirmed} onChange={(e) => set('confirmed', e.target.checked)} label="Order pakka hai" description={f.confirmed ? 'Bina advance ke bhi pakka' : 'Sirf rate bataya — abhi pakka nahi'} />}
                </>
              )}
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                <span className="text-[0.8125rem] font-medium text-brand-900">Lete waqt baqi</span>
                <span className="text-lg font-bold tabular-nums text-brand-900">{formatPKR(balance)}</span>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title="Note">
            <div className="space-y-3">
              <Textarea label="Customer ke liye" value={f.specialInstructions} onChange={(e) => set('specialInstructions', e.target.value)} rows={2} maxLength={1000} placeholder="Delivery se pehle call karein" hint="Parchi par chhapta hai" />
              <Textarea label="Sirf andar ke liye" value={f.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} rows={2} maxLength={1000} placeholder="Purana customer — achi sajawat" hint="Kahin nahi chhapta" />
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (f.customerName || f.basePrice || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">Kul <b className="tabular-nums text-slate-900">{formatPKR(total)}</b>{advanceNow > 0 ? <> · advance {formatPKR(advanceNow)}</> : null} · baqi <b className="tabular-nums text-slate-900">{formatPKR(balance)}</b></p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending} disabled={!!saved}>{editing ? 'Save karein' : 'Order banayein'}</Button>
      </div>

      {saved && <SavedModal o={saved} shopName={shopName} onClose={() => navigate(`/bakery/cake-orders/${saved.id}`)} onAnother={() => { setSaved(null); setF(EMPTY); window.scrollTo({ top: 0 }); }} />}
    </PageShell>
  );
}

function CustomerCard({ f, set }: { f: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void }) {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const t = setTimeout(() => setQuery(term.trim()), 250); return () => clearTimeout(t); }, [term]);
  const found = useQuery({ queryKey: ['customers', 'cake-pick', query], queryFn: () => customersApi.list({ limit: 8, search: query }), enabled: query.length >= 2 });
  return (
    <Card className="rounded-2xl" title={<T icon={User}>Customer</T>} description="Purana customer ho to dhoond lein — naam aur phone khud bhar jayenge">
      <div className="space-y-3">
        {f.customerId ? (
          <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
            <User className="h-4 w-4 text-brand-700" />
            <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-900">{f.customerName} <span className="text-slate-500">· {f.customerPhone}</span></span>
            <button type="button" onClick={() => set('customerId', '')} className="text-[0.75rem] font-semibold text-brand-700 hover:underline">Alag customer</button>
          </div>
        ) : (
          <div>
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Purana customer — naam ya phone…" leftIcon={<Search className="h-4 w-4" />} />
            {query.length >= 2 && (found.data?.items ?? []).length > 0 && (
              <ul className="mt-1.5 divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
                {(found.data?.items ?? []).map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => { set('customerId', c.id); set('customerName', c.name); set('customerPhone', c.phone ?? ''); set('customerEmail', c.email ?? ''); setTerm(''); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.8125rem] hover:bg-slate-50">
                      <User className="h-3.5 w-3.5 text-slate-400" /><span className="flex-1 truncate font-medium text-slate-900">{c.name}</span><span className="text-slate-500">{c.phone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Naam" required value={f.customerName} onChange={(e) => set('customerName', e.target.value)} placeholder="Ayesha Khan" disabled={!!f.customerId} />
          <Input label="Phone" required inputMode="tel" value={f.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} placeholder="03001234567" leftIcon={<Phone className="h-4 w-4" />} hint="WhatsApp tasdeeq isi par jati hai" disabled={!!f.customerId} />
          <Input label="Email" type="email" value={f.customerEmail} onChange={(e) => set('customerEmail', e.target.value)} hint="Marzi hai" wrapperClassName="sm:col-span-2" />
        </div>
      </div>
    </Card>
  );
}

interface PickProduct { id: string; name: string; price?: number; isActive?: boolean }

function ProductPicker({ productId, productName, onPick }: { productId: string; productName: string; onPick: (p: PickProduct | null) => void }) {
  const [term, setTerm] = useState('');
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000, enabled: term.length > 0 });
  const t = term.trim().toLowerCase();
  const options = ((productsQ.data?.items ?? []) as PickProduct[]).filter((p) => p.isActive !== false && p.name.toLowerCase().includes(t)).slice(0, 8);
  if (productId) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
        <Package className="h-4 w-4 text-slate-500" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-slate-700">Maal se jura: <b className="text-slate-900">{productName}</b> — dete waqt is ka stock ghatega</span>
        <button type="button" onClick={() => onPick(null)} aria-label="Jor hatayein" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div>
      <Input size="sm" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Maal se jorein (marzi) — jaise 'Chocolate cake 2 pound'" leftIcon={<Search className="h-4 w-4" />}
        hint="Jorne se bill bante waqt stock khud ghatta hai; na jorein to bhi chalega" />
      {t && options.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {options.map((p) => <Chip key={p.id} on={false} onClick={() => { onPick(p); setTerm(''); }}>{p.name}{p.price ? ` · ${formatPKR(p.price)}` : ''}</Chip>)}
        </div>
      )}
    </div>
  );
}

function SavedModal({ o, shopName, onClose, onAnother }: { o: CakeOrder; shopName: string; onClose: () => void; onAnother: () => void }) {
  const wa = waLink(o.customerPhone, cakeMessage(o, shopName));
  return (
    <Modal open onClose={onClose} size="sm" title={`Order ${o.orderNumber} ban gaya`} description={`${o.customerName} · ${dateTime(o.neededBy)}`}
      footer={<>
        <Button variant="ghost" onClick={onAnother}>Aur naya order</Button>
        <Button onClick={onClose}>Order dekhein</Button>
      </>}>
      <div className="space-y-2">
        <p className="flex items-center gap-2 rounded-xl bg-success-50 px-3 py-2.5 text-[0.8125rem] text-success-800 ring-1 ring-success-200"><CheckCircle2 className="h-4 w-4" />Kul {formatPKR(o.total)} · advance {formatPKR(o.paidAmount)} · baqi {formatPKR(Math.max(o.total - o.paidAmount, 0))}</p>
        {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success-600 text-[0.875rem] font-semibold text-white hover:bg-success-700"><MessageCircle className="h-4 w-4" />Customer ko WhatsApp par tasdeeq bhejein</a>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => printCakeSlip(o, shopName)} leftIcon={<Printer className="h-4 w-4" />}>Customer parchi</Button>
          <Button variant="secondary" onClick={() => printCakeSlip(o, shopName, true)} leftIcon={<ChefHat className="h-4 w-4" />}>Kitchen parchi</Button>
        </div>
        <Link to="/bakery/production" className="flex items-center justify-center gap-1.5 pt-1 text-[0.75rem] font-medium text-brand-700 hover:underline"><Sparkles className="h-3.5 w-3.5" />Us din ke baking plan me khud aa jayega</Link>
      </div>
    </Modal>
  );
}

function Chip({ on, onClick, tone, children }: { on: boolean; onClick: () => void; tone?: 'rose'; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1 transition',
        on ? (tone === 'rose' ? 'bg-rose-600 text-white ring-rose-600' : 'bg-brand-600 text-white ring-brand-600') : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
      {children}
    </button>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className={cn('tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-medium text-slate-800')}>{v}</dd></div>;
}

const T = ({ icon: Icon, children }: { icon: typeof Cake; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

