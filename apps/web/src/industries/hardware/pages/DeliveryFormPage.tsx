/**
 * New delivery challan. From a bill, the lines show what was sold, what
 * earlier challans already carried and what is left, so one bill can go
 * out in parts. Without a bill (goods to be billed later) items come from
 * the catalog. A challan never moves stock or money.
 *
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GraduationCap, MapPin, Package, Receipt, Save, Search, Trash2, Truck, X } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Textarea, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { salesHistoryApi } from '@modules/sales/history/api';
import type { PosItem } from '@modules/pos/engine';
import { deliveriesApi, type VehicleType } from '../api/deliveries.api';
import { projectsApi } from '../api/projects.api';
import { ItemPick } from '../components/ItemPick';
import { useDebounced, useSaveKey } from '../hooks/usePageKeys';
import { VEHICLES, errorText, qty, slipUnit } from '../lib/meta';

interface Line { key: string; productId?: string; itemName: string; unit: string; unitPrice: number; max?: number; sold?: number; sent?: number; qty: number }

const today = () => new Date().toLocaleDateString('en-CA');

function BillLookup({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['hardware-bill-lookup', term],
    queryFn: () => salesHistoryApi.list({ from: 'all', to: today(), status: 'active', search: term, sort: 'new' }, 1, 8),
    enabled: term.length >= 2,
  });
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bill number, customer ya phone…"
        className="h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
      {term.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {(data?.items ?? []).map((s) => (
            <button key={s.id} type="button" onClick={() => { onPick(s.id); setQ(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50">
              <Receipt className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{s.saleNumber} · {s.customer?.name ?? 'Walk-in'}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{new Date(s.soldAt).toLocaleDateString('en-PK')} · {s.items.length} items</span>
              </span>
              <span className="text-[0.875rem] font-semibold tabular-nums">{formatPKR(s.total)}</span>
            </button>
          ))}
          {!isFetching && !(data?.items ?? []).length && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi bill nahi mila</p>}
        </div>
      )}
    </div>
  );
}

export default function DeliveryFormPage() {
  const [params, setParams] = useSearchParams();
  const saleId = params.get('sale') ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();

  const { data: bill, isLoading: billLoading, error: billError } = useQuery({ queryKey: ['hardware-bill-lines', saleId], queryFn: () => deliveriesApi.billLines(saleId), enabled: !!saleId });
  const { data: projects = [] } = useQuery({ queryKey: ['hardware-projects', 'active'], queryFn: () => projectsApi.list({ active: true }).catch(() => []), staleTime: 60_000 });

  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [siteContact, setSiteContact] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('PICKUP');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [labour, setLabour] = useState(0);
  const [instructions, setInstructions] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!bill) return;
    const c = bill.sale.customer;
    setName(c?.name ?? 'Walk-in customer');
    setPhone(c?.phone ?? '');
    setAddress([c?.address, c?.area, c?.city].filter(Boolean).join(', '));
    setLines(bill.lines.filter((l) => l.remaining > 0).map((l) => ({
      key: l.productId, productId: l.productId, itemName: l.name, unit: l.unit, unitPrice: l.price, max: l.remaining, sold: l.sold, sent: l.sent, qty: l.remaining,
    })));
  }, [bill]);

  const project = projects.find((p) => p.id === projectId);
  useEffect(() => {
    if (!project) return;
    if (!address) setAddress(project.siteAddress);
    if (!siteContact && project.siteContactPhone) setSiteContact(project.siteContactPhone);
    if (!saleId && !name) { setName(project.customerName); setPhone(project.customerPhone ?? ''); }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = (i: PosItem) => {
    if (lines.some((l) => l.productId === i.id)) { toast.info(`${i.name} pehle se challan me hai`); return; }
    setLines((p) => [...p, { key: i.id, productId: i.id, itemName: i.name, unit: i.unit, unitPrice: i.price, qty: 1 }]);
  };
  const setQty = (k: string, v: number) => setLines((p) => p.map((l) => (l.key === k ? { ...l, qty: v } : l)));
  const sending = useMemo(() => lines.filter((l) => l.qty > 0), [lines]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Customer ka naam likhein';
    if (!address.trim()) e.address = 'Site ka pata likhein — driver isi par jayega';
    if (phone.trim() && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) e.phone = 'Phone number theek likhein';
    if (driverPhone.trim() && !/^[0-9+\-\s]{10,15}$/.test(driverPhone.trim())) e.driverPhone = 'Phone number theek likhein';
    if (!sending.length) e.items = 'Kam se kam ek item ki quantity likhein';
    lines.forEach((l) => {
      if (l.qty < 0) e[l.key] = 'Manfi nahi';
      else if (l.max != null && l.qty > l.max + 1e-6) e[l.key] = `Sirf ${qty(l.max)} baqi hai`;
    });
    if (deliveryCharge < 0 || labour < 0) e.charges = 'Kiraya manfi nahi ho sakta';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => deliveriesApi.create({
      saleId: saleId || undefined, projectId: projectId || undefined, customerId: bill?.sale.customerId ?? undefined,
      customerName: name.trim(), customerPhone: phone.trim() || undefined, deliveryAddress: address.trim(),
      siteContactPhone: siteContact.trim() || undefined, vehicleType, vehicleNumber: vehicleNumber.trim() || undefined,
      driverName: driverName.trim() || undefined, driverPhone: driverPhone.trim() || undefined,
      scheduledDate: date || undefined, scheduledTime: time || undefined, deliveryCharge, laborCharge: labour,
      driverInstructions: instructions.trim() || undefined,
      items: sending.map((l) => ({ productId: l.productId, itemName: l.itemName, orderedQty: l.qty, unit: slipUnit(l.unit), unitPrice: l.unitPrice })),
    }),
    onSuccess: (d) => {
      ['hardware-deliveries', 'hardware-bill-lines', 'hardware-sale-challans', 'hardware-deliveries-summary', 'hardware-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Challan ${d.deliveryNumber} ban gaya — print kar ke driver ko dein`);
      navigate(`/hardware/deliveries/${d.id}`);
    },
    onError: (e) => toast.error(errorText(e, 'Challan nahi bana')),
  });
  const submit = () => { if (save.isPending) return; if (validate()) save.mutate(); else toast.error('Laal nishan wali jagah theek karein'); };
  useSaveKey(submit);

  const allSent = bill && bill.lines.length > 0 && bill.lines.every((l) => l.remaining <= 0);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Naya challan" onClose={guide.close}
          steps={[
            { icon: Receipt, color: '#2563eb', title: 'Bill chunein', text: 'Bill number likhein — us ka baqi maal khud aa jata hai. Aaj jitna ja raha hai utni quantity rakhein.' },
            { icon: MapPin, color: '#16a34a', title: 'Site ka pata', text: 'Pata aur site par kis se baat karni hai — challan par chhapta hai.' },
            { icon: Truck, color: '#7c3aed', title: 'Gaari', text: 'Gaari, number aur driver. Kiraya bill par pehle lag chuka ho to yahan 0 rakhein.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}

      <PageHero title={<HeroBack to="/hardware/deliveries" label="Challan">Naya challan</HeroBack>}
        meta={bill ? `Bill ${bill.sale.saleNumber} · ${bill.challanCount} challan pehle` : 'Bill se ya bagair bill'}
        actions={<>
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[{ label: 'Items', value: String(sending.length) }, { label: 'Maal ki value', value: formatPKR(sending.reduce((s, l) => s + l.qty * l.unitPrice, 0)) }]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card title="Maal" description={bill ? 'Bill ka baqi maal — aaj jitna bhejna hai utna rakhein' : 'Bill chunein, ya bagair bill ke items dalein'}
            actions={saleId ? <button type="button" onClick={() => { setParams({}); setLines([]); }} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />Bill hatayein</button> : undefined}>
            {!saleId && (
              <div className="space-y-3">
                <BillLookup onPick={(id) => setParams({ sale: id })} />
                <div className="flex items-center gap-2 text-[0.75rem] text-slate-400"><span className="h-px flex-1 bg-slate-200" />ya bagair bill<span className="h-px flex-1 bg-slate-200" /></div>
                <ItemPick onPick={addItem} />
              </div>
            )}
            {saleId && billLoading && <Skeleton className="h-32 rounded-xl" />}
            {saleId && billError && <p className="text-[0.875rem] text-rose-600">{errorText(billError, 'Bill nahi mila')}</p>}
            {allSent && <p className="rounded-xl bg-emerald-50 px-3 py-3 text-[0.875rem] text-emerald-800 ring-1 ring-emerald-200">Is bill ka sara maal challan par ja chuka hai.</p>}
            {errors.items && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{errors.items}</p>}
            {lines.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {lines.map((l) => (
                  <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_7rem_2.25rem] items-center gap-2 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium text-slate-900"><Package className="h-4 w-4 shrink-0 text-slate-400" />{l.itemName}</p>
                      {l.max != null && <p className="text-[0.75rem] text-slate-500">Bika {qty(l.sold ?? 0)} · ja chuka {qty(l.sent ?? 0)} · <strong className="text-slate-700">baqi {qty(l.max)}</strong> {l.unit}</p>}
                      {errors[l.key] && <p className="text-[0.75rem] font-medium text-rose-600">{errors[l.key]}</p>}
                    </div>
                    <label className="block">
                      <span className="sr-only">Quantity</span>
                      <input inputMode="decimal" value={l.qty || ''} placeholder="0" onChange={(e) => setQty(l.key, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                        className={cn('h-10 w-full rounded-lg border bg-white px-2.5 text-right text-[0.9375rem] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-brand-500/20', errors[l.key] ? 'border-rose-400' : 'border-slate-300')} />
                    </label>
                    <button type="button" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label="Hatayein" className="flex h-10 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Kahan jana hai">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Customer" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} inputMode="tel" placeholder="03xx-xxxxxxx" />
              <Select label="Site / project" value={projectId} onChange={(e) => setProjectId(e.target.value)}
                options={[{ value: '', label: 'Koi site nahi' }, ...projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.customerName}` }))]} />
              <Input label="Site par rabta" value={siteContact} onChange={(e) => setSiteContact(e.target.value)} placeholder="Munshi / mistri ka phone" inputMode="tel" />
              <Textarea wrapperClassName="sm:col-span-2" label="Pata" required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} hint="Gali, makan number, nishani" />
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card title="Gaari aur waqt">
            <div className="space-y-3">
              <Select label="Gaari" value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} options={VEHICLES} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Gaari number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="LES-1234" />
                <Input label="Driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <Input label="Driver phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} error={errors.driverPhone} inputMode="tel" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tareekh" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label="Waqt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Kiraya" inputMode="decimal" value={deliveryCharge || ''} onChange={(e) => setDeliveryCharge(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} placeholder="0" hint="Driver ka hisaab" />
                <Input label="Mazdoori" inputMode="decimal" value={labour || ''} onChange={(e) => setLabour(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} placeholder="0" />
              </div>
              {errors.charges && <p className="text-[0.8125rem] font-medium text-rose-600">{errors.charges}</p>}
              <p className="text-[0.75rem] text-slate-500">Customer se kiraya lena hai to bill par Delivery charge lagayein — challan ka kiraya sale me nahi ginta.</p>
              <Textarea label="Driver ke liye hidayat" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Pehle cement utarna, sarya peeche" />
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/hardware/deliveries')}>Wapas</Button>
            <Button className="flex-1" onClick={submit} loading={save.isPending} disabled={!!allSent} leftIcon={<Save className="h-4 w-4" />}>Challan banayein</Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
