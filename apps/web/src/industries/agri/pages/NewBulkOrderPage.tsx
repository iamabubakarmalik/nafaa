/**
 * New bulk order: the farmer, season and crop, the bags and bottles with
 * their rates, delivery, and an advance taken now. Stock moves only when
 * the order is marked "Pahunch gaya", which makes the bill.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Boxes, GraduationCap, Package, Sprout, Tractor, Trash2, Truck, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Switch, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { FarmerPick } from '../components/FarmerPick';
import { ProductPick } from '../components/ProductPick';
import { useSaveKey } from '../hooks/usePageKeys';
import { CROPS, PAY_METHODS, SEASON_LABEL, amountInput, errorText, phoneOk } from '../lib/meta';

interface Line { key: string; productId?: string; productName: string; category?: string; unit: string; quantity: string; pricePerUnit: string; discount: string; bulkMin?: number; bulkPct?: number }

const lineTotal = (l: Line) => Math.max((Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0) - (Number(l.discount) || 0), 0);
/** Current Pakistani crop season for a date. */
const seasonNow = () => { const m = new Date().getMonth() + 1; return m >= 4 && m <= 9 ? 'KHARIF' : 'RABI'; };

export default function NewBulkOrderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const lock = useRef(false);
  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [walkIn, setWalkIn] = useState({ name: '', phone: '' });
  const [season, setSeason] = useState(seasonNow());
  const [crop, setCrop] = useState('');
  const [acres, setAcres] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('');
  const [delivery, setDelivery] = useState({ on: false, address: '', charges: '', vehicle: '', date: '' });
  const [other, setOther] = useState('');
  const [credit, setCredit] = useState(true);
  const [advance, setAdvance] = useState({ amount: '', method: 'CASH' });
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  const farmerId = params.get('farmer');
  const farmerQ = useQuery({ queryKey: ['agri-farmer', farmerId], queryFn: () => farmersApi.getOne(farmerId!), enabled: !!farmerId });
  useEffect(() => { if (farmerQ.data) setFarmer(farmerQ.data); }, [farmerQ.data]);
  useEffect(() => {
    if (!farmer) return;
    setAcres((a) => a || (farmer.landAreaAcres ? String(farmer.landAreaAcres) : ''));
    setCrop((c) => c || farmer.currentCrop || farmer.primaryCrops[0] || '');
    setDelivery((d) => ({ ...d, address: d.address || farmer.address || [farmer.village, farmer.district].filter(Boolean).join(', ') }));
  }, [farmer]);

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => {
    if (l.key !== key) return l;
    const next = { ...l, ...patch };
    // The product's bulk rate follows the quantity, as at the counter.
    if (patch.quantity !== undefined && next.bulkMin && next.bulkPct && !patch.pricePerUnit) {
      const base = Number(l.pricePerUnit) / (Number(l.quantity) >= (l.bulkMin ?? Infinity) ? 1 - (l.bulkPct ?? 0) / 100 : 1);
      const rate = Number(patch.quantity) >= next.bulkMin ? base * (1 - next.bulkPct / 100) : base;
      next.pricePerUnit = String(Math.round(rate * 100) / 100);
    }
    return next;
  }));
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const total = Math.max(subtotal - (Number(discount) || 0) + (delivery.on ? Number(delivery.charges) || 0 : 0) + (Number(other) || 0), 0);
  const adv = Number(advance.amount) || 0;

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!farmer && !walkIn.name.trim()) out.push('Farmer chunein ya naam likhein');
    if (!farmer && walkIn.phone && !phoneOk(walkIn.phone)) out.push('Phone poora likhein');
    if (!lines.length) out.push('Kam az kam ek cheez daalein');
    lines.forEach((l) => {
      if (!(Number(l.quantity) > 0)) out.push(`${l.productName}: quantity likhein`);
      if (!(Number(l.pricePerUnit) >= 0) || l.pricePerUnit === '') out.push(`${l.productName}: rate likhein`);
      if ((Number(l.discount) || 0) > (Number(l.quantity) || 0) * (Number(l.pricePerUnit) || 0)) out.push(`${l.productName}: discount zyada hai`);
    });
    if ((Number(discount) || 0) > subtotal) out.push('Discount maal se zyada hai');
    if (adv > total + 0.01) out.push('Advance kul se zyada hai');
    if (credit && (farmer?.status === 'SUSPENDED')) out.push(`${farmer.fullName} ka udhaar roka hua hai — "Baqi udhaar me" band karein`);
    return out;
  }, [farmer, walkIn, lines, discount, subtotal, adv, total, credit]);

  const save = useMutation({
    mutationFn: async () => {
      const order = await bulkOrdersApi.create({
        farmerId: farmer?.id, customerName: farmer?.fullName ?? walkIn.name.trim(), customerPhone: farmer?.phone ?? (walkIn.phone.trim() || undefined),
        season, cropTarget: crop || undefined, landAreaAcres: Number(acres) || undefined,
        deliveryDate: delivery.date || undefined, isDelivery: delivery.on, deliveryAddress: delivery.on ? delivery.address || undefined : undefined,
        deliveryCharges: delivery.on ? Number(delivery.charges) || 0 : 0, vehicleNumber: delivery.on ? delivery.vehicle || undefined : undefined,
        bulkDiscount: Number(discount) || 0, otherCharges: Number(other) || 0, isCredit: credit, farmerNotes: notes.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, productName: l.productName, category: l.category, unit: l.unit, quantity: Number(l.quantity), pricePerUnit: Number(l.pricePerUnit), discount: Number(l.discount) || 0 })),
      });
      let advanceSaved = true;
      if (adv > 0) {
        try { await bulkOrdersApi.addPayment(order.id, adv, advance.method); } catch { advanceSaved = false; }
      }
      return { order, advanceSaved };
    },
    onSuccess: ({ order, advanceSaved }) => {
      qc.invalidateQueries({ queryKey: ['agri-bulk-orders'] });
      qc.invalidateQueries({ queryKey: ['agri-farmers'] });
      if (advanceSaved) toast.success(`Order ${order.orderNumber} ban gaya${adv > 0 ? ` — ${formatPKR(adv)} advance khate me` : ''}`);
      else toast.error(`Order ${order.orderNumber} ban gaya magar advance nahi likha — order khol kar "Advance" se dobara likhein`);
      navigate(`/agri/bulk-orders?search=${order.orderNumber}`);
    },
    onError: (e) => toast.error(errorText(e, 'Order nahi bana')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    if (problems.length) { toast.error(problems[0]); return; }
    if (lock.current || save.isPending) return;
    lock.current = true;
    save.mutate();
  };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Naya bulk order" onClose={guide.close}
          steps={[
            { icon: Tractor, color: '#65a30d', title: 'Farmer', text: 'Farmer chunein — order aur advance usi ke khate me jate hain. Naya ho to sirf naam aur phone likh dein.' },
            { icon: Package, color: '#2563eb', title: 'Maal', text: 'Naam ya fasal likh kar maal chunein. Bulk rate wali cheez par quantity poori hote hi rate khud kam hota hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Jo paisa abhi mila wo likhein — aaj ki day book me aata hai. Baqi pahunchne par season ke udhaar me jata hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">Naya bulk order</h1>
          <p className="text-[0.8125rem] text-white/75">Season ka maal pehle se book — stock pahunchne par ghatta hai</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Tractor className="h-4 w-4 text-brand-600" />Farmer</span>}>
            <FarmerPick value={farmer} onChange={setFarmer} error={tried && !farmer && !walkIn.name.trim() ? 'Farmer chunein ya neeche naam likhein' : undefined} />
            {!farmer && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Input label="Ya naam (farmer list me nahi)" value={walkIn.name} onChange={(e) => setWalkIn((w) => ({ ...w, name: e.target.value }))} placeholder="Customer ka naam" hint="Isi naam/phone se customer khata banega" />
                <Input label="Phone" inputMode="tel" value={walkIn.phone} onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))} placeholder="03001234567" />
              </div>
            )}
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Select label="Season" value={season} onChange={(e) => setSeason(e.target.value)} options={['RABI', 'KHARIF', 'ZAID'].map((v) => ({ value: v, label: SEASON_LABEL[v] }))} />
              <Select label="Fasal" value={crop} onChange={(e) => setCrop(e.target.value)} options={[{ value: '', label: '—' }, ...CROPS.map((c) => ({ value: c, label: c }))]} />
              <Input label="Zameen (acre)" inputMode="decimal" value={acres} onChange={(e) => setAcres(amountInput(e.target.value))} placeholder="12" hint="Dose ka andaza" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-brand-600" />Maal</span>} description="Catalog ka maal stock se nikalta hai; bagair catalog wali line bill me charge banti hai">
            <ProductPick
              onPick={(i, f) => setLines((ls) => [...ls, {
                key: `${i.id}-${Date.now()}`, productId: i.id, productName: i.name, category: f?.category, unit: i.unit, quantity: '1', pricePerUnit: String(i.price), discount: '',
                bulkMin: Number(f?.bulkDiscountThreshold) || undefined, bulkPct: Number(f?.bulkDiscountPct) || undefined,
              }])}
              onCustom={(name) => setLines((ls) => [...ls, { key: `c-${Date.now()}`, productName: name, unit: 'bag', quantity: '1', pricePerUnit: '', discount: '' }])} />
            {lines.length === 0 ? <p className={cn('mt-3 rounded-xl px-3 py-6 text-center text-[0.8125rem]', tried ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500')}>Upar se maal chunein — urea, DAP, beej, spray…</p> : (
              <ul className="mt-3 space-y-2">
                {lines.map((l) => (
                  <li key={l.key} className="rounded-xl p-3 ring-1 ring-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-slate-900">{l.productName}{!l.productId && <span className="ml-1 text-[0.6875rem] font-normal text-slate-500">(catalog ke bagair)</span>}</span>
                      <span className="text-[0.9375rem] font-bold tabular-nums">{formatPKR(lineTotal(l))}</span>
                      <button type="button" aria-label="Hatayein" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <Input size="sm" label={`Qty (${l.unit})`} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: amountInput(e.target.value) })} error={tried && !(Number(l.quantity) > 0) ? 'Likhein' : undefined} />
                      <Input size="sm" label="Rate" inputMode="decimal" value={l.pricePerUnit} onChange={(e) => setLine(l.key, { pricePerUnit: amountInput(e.target.value) })} error={tried && l.pricePerUnit === '' ? 'Likhein' : undefined} />
                      <Input size="sm" label="Discount (Rs)" inputMode="decimal" value={l.discount} onChange={(e) => setLine(l.key, { discount: amountInput(e.target.value) })} />
                    </div>
                    {l.bulkMin && l.bulkPct ? <p className="mt-1 text-[0.6875rem] text-emerald-700">{l.bulkMin}+ par {l.bulkPct}% kam rate khud lagta hai</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />Delivery</span>}>
            <div className="space-y-3">
              <Input label="Kab chahiye" type="date" value={delivery.date} onChange={(e) => setDelivery((d) => ({ ...d, date: e.target.value }))} hint="Bijai se pehle ki date" />
              <Switch checked={delivery.on} onChange={(e) => setDelivery((d) => ({ ...d, on: e.target.checked }))} label="Gaon tak pohanchana hai" description="Kiraya bill me jurta hai" />
              {delivery.on && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input wrapperClassName="sm:col-span-3" label="Pata" value={delivery.address} onChange={(e) => setDelivery((d) => ({ ...d, address: e.target.value }))} placeholder="Chak, raasta" />
                  <Input label="Kiraya (Rs)" inputMode="decimal" value={delivery.charges} onChange={(e) => setDelivery((d) => ({ ...d, charges: amountInput(e.target.value) }))} placeholder="0" />
                  <Input label="Gaari number" value={delivery.vehicle} onChange={(e) => setDelivery((d) => ({ ...d, vehicle: e.target.value }))} placeholder="LHR-1234" />
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-brand-600" />Hisaab</span>}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Discount (Rs)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(amountInput(e.target.value))} placeholder="0" hint="Poore order par" />
                <Input label="Doosre charges" inputMode="decimal" value={other} onChange={(e) => setOther(amountInput(e.target.value))} placeholder="0" hint="Loading, mazdoori" />
              </div>
              <dl className="space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem]">
                <div className="flex justify-between"><dt className="text-slate-500">Maal</dt><dd className="tabular-nums">{formatPKR(subtotal)}</dd></div>
                {Number(discount) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">-{formatPKR(Number(discount))}</dd></div>}
                {delivery.on && Number(delivery.charges) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Kiraya</dt><dd className="tabular-nums">{formatPKR(Number(delivery.charges))}</dd></div>}
                {Number(other) > 0 && <div className="flex justify-between"><dt className="text-slate-500">Doosre charges</dt><dd className="tabular-nums">{formatPKR(Number(other))}</dd></div>}
                <div className="flex justify-between border-t border-slate-200 pt-1 text-[1rem] font-bold"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(total)}</dd></div>
              </dl>
              <Input label="Advance abhi (Rs)" inputMode="decimal" value={advance.amount} onChange={(e) => setAdvance((a) => ({ ...a, amount: amountInput(e.target.value) }))} placeholder="0"
                error={tried && adv > total + 0.01 ? 'Kul se zyada' : undefined} hint={adv > 0 ? `Baqi ${formatPKR(Math.max(total - adv, 0))}` : 'Farmer ke khate me aaj jama hoga'} className="text-right font-semibold tabular-nums" />
              {adv > 0 && (
                <div className="flex flex-wrap gap-1.5">{PAY_METHODS.map((m) => (
                  <button key={m.value} type="button" onClick={() => setAdvance((a) => ({ ...a, method: m.value }))} className={cn('h-8 rounded-lg px-2.5 text-[0.75rem] font-semibold ring-1', advance.method === m.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200')}>{m.label}</button>
                ))}</div>
              )}
              <Switch checked={credit} onChange={(e) => setCredit(e.target.checked)} label="Baqi season ke udhaar me" description="Pahunchne par jo baqi ho wo farmer ke khate me katai tak" />
            </div>
          </Card>
          <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Sprout className="h-4 w-4 text-brand-600" />Note</span>}>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Farmer ki farmaish, delivery ka waqt…" maxLength={2000} />
          </Card>
          {tried && problems.length > 0 && <ul className="space-y-1 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-800 ring-1 ring-rose-200">{problems.slice(0, 4).map((p) => <li key={p}>{p}</li>)}</ul>}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Wapas</Button>
            <Button className="flex-1" loading={save.isPending} onClick={submit}>Order banayein</Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
