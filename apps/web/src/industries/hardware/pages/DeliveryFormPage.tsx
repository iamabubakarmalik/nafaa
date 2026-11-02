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
import { t } from '@core/i18n';

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
      <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Bill number, customer ya phone…')}
        className="h-11 w-full rounded-xl border-0 bg-slate-100 ps-10 pe-3 text-[0.9375rem] outline-none ring-1 ring-transparent focus:bg-white focus:ring-2 focus:ring-brand-500" />
      {term.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {(data?.items ?? []).map((s) => (
            <button key={s.id} type="button" onClick={() => { onPick(s.id); setQ(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-start hover:bg-brand-50">
              <Receipt className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{s.saleNumber} · {s.customer?.name ?? t('Walk-in')}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{t('{{value}} · {{count}} items', { value: new Date(s.soldAt).toLocaleDateString('en-PK'), count: s.items.length })}</span>
              </span>
              <span className="text-[0.875rem] font-semibold tabular-nums">{formatPKR(s.total)}</span>
            </button>
          ))}
          {!isFetching && !(data?.items ?? []).length && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">{t('Koi bill nahi mila')}</p>}
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
    if (lines.some((l) => l.productId === i.id)) { toast.info(t('{{name}} pehle se challan me hai', { name: i.name })); return; }
    setLines((p) => [...p, { key: i.id, productId: i.id, itemName: i.name, unit: i.unit, unitPrice: i.price, qty: 1 }]);
  };
  const setQty = (k: string, v: number) => setLines((p) => p.map((l) => (l.key === k ? { ...l, qty: v } : l)));
  const sending = useMemo(() => lines.filter((l) => l.qty > 0), [lines]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = t('Customer ka naam likhein');
    if (!address.trim()) e.address = t('Site ka pata likhein — driver isi par jayega');
    if (phone.trim() && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) e.phone = t('Phone number theek likhein');
    if (driverPhone.trim() && !/^[0-9+\-\s]{10,15}$/.test(driverPhone.trim())) e.driverPhone = t('Phone number theek likhein');
    if (!sending.length) e.items = t('Kam se kam ek item ki quantity likhein');
    lines.forEach((l) => {
      if (l.qty < 0) e[l.key] = t('Manfi nahi');
      else if (l.max != null && l.qty > l.max + 1e-6) e[l.key] = t('Sirf {{qty}} baqi hai', { qty: qty(l.max) });
    });
    if (deliveryCharge < 0 || labour < 0) e.charges = t('Kiraya manfi nahi ho sakta');
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
      toast.success(t('Challan {{deliveryNumber}} ban gaya — print kar ke driver ko dein', { deliveryNumber: d.deliveryNumber }));
      navigate(`/hardware/deliveries/${d.id}`);
    },
    onError: (e) => toast.error(errorText(e, t('Challan nahi bana'))),
  });
  const submit = () => { if (save.isPending) return; if (validate()) save.mutate(); else toast.error(t('Laal nishan wali jagah theek karein')); };
  useSaveKey(submit);

  const allSent = bill && bill.lines.length > 0 && bill.lines.every((l) => l.remaining <= 0);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Naya challan')} onClose={guide.close}
          steps={[
            { icon: Receipt, color: '#2563eb', title: t('Bill chunein'), text: t('Bill number likhein — us ka baqi maal khud aa jata hai. Aaj jitna ja raha hai utni quantity rakhein.') },
            { icon: MapPin, color: '#16a34a', title: t('Site ka pata'), text: t('Pata aur site par kis se baat karni hai — challan par chhapta hai.') },
            { icon: Truck, color: '#7c3aed', title: t('Gaari'), text: t('Gaari, number aur driver. Kiraya bill par pehle lag chuka ho to yahan 0 rakhein.') },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}

      <PageHero title={<HeroBack to="/hardware/deliveries" label={t('Challan')}>{t('Naya challan')}</HeroBack>}
        meta={bill ? t('Bill {{saleNumber}} · {{challanCount}} challan pehle', { saleNumber: bill.sale.saleNumber, challanCount: bill.challanCount }) : t('Bill se ya bagair bill')}
        actions={<>
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> {' '}{t('save')}</span>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[{ label: t('Items'), value: String(sending.length) }, { label: t('Maal ki value'), value: formatPKR(sending.reduce((s, l) => s + l.qty * l.unitPrice, 0)) }]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card title={t('Maal')} description={bill ? t('Bill ka baqi maal — aaj jitna bhejna hai utna rakhein') : t('Bill chunein, ya bagair bill ke items dalein')}
            actions={saleId ? <button type="button" onClick={() => { setParams({}); setLines([]); }} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-slate-600 hover:bg-slate-100"><X className="h-4 w-4" />{t('Bill hatayein')}</button> : undefined}>
            {!saleId && (
              <div className="space-y-3">
                <BillLookup onPick={(id) => setParams({ sale: id })} />
                <div className="flex items-center gap-2 text-[0.75rem] text-slate-400"><span className="h-px flex-1 bg-slate-200" />{t('ya bagair bill')}<span className="h-px flex-1 bg-slate-200" /></div>
                <ItemPick onPick={addItem} />
              </div>
            )}
            {saleId && billLoading && <Skeleton className="h-32 rounded-xl" />}
            {saleId && billError && <p className="text-[0.875rem] text-rose-600">{errorText(billError, t('Bill nahi mila'))}</p>}
            {allSent && <p className="rounded-xl bg-emerald-50 px-3 py-3 text-[0.875rem] text-emerald-800 ring-1 ring-emerald-200">{t('Is bill ka sara maal challan par ja chuka hai.')}</p>}
            {errors.items && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{errors.items}</p>}
            {lines.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {lines.map((l) => (
                  <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_7rem_2.25rem] items-center gap-2 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium text-slate-900"><Package className="h-4 w-4 shrink-0 text-slate-400" />{l.itemName}</p>
                      {l.max != null && <p className="text-[0.75rem] text-slate-500">{t('Bika {{qty}} · ja chuka {{qty2}} ·', { qty: qty(l.sold ?? 0), qty2: qty(l.sent ?? 0) })}{' '} <strong className="text-slate-700">{t('baqi {{max}}', { max: qty(l.max) })}</strong> {l.unit}</p>}
                      {errors[l.key] && <p className="text-[0.75rem] font-medium text-rose-600">{errors[l.key]}</p>}
                    </div>
                    <label className="block">
                      <span className="sr-only">{t('Quantity')}</span>
                      <input inputMode="decimal" value={l.qty || ''} placeholder="0" onChange={(e) => setQty(l.key, Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
                        className={cn('h-10 w-full rounded-lg border bg-white px-2.5 text-end text-[0.9375rem] font-semibold tabular-nums outline-none focus:ring-2 focus:ring-brand-500/20', errors[l.key] ? 'border-rose-400' : 'border-slate-300')} />
                    </label>
                    <button type="button" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label={t('Hatayein')} className="flex h-10 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t('Kahan jana hai')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t('Customer')} required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
              <Input label={t('Phone')} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} inputMode="tel" placeholder="03xx-xxxxxxx" />
              <Select label={t('Site / project')} value={projectId} onChange={(e) => setProjectId(e.target.value)}
                options={[{ value: '', label: t('Koi site nahi') }, ...projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.customerName}` }))]} />
              <Input label={t('Site par rabta')} value={siteContact} onChange={(e) => setSiteContact(e.target.value)} placeholder={t('Munshi / mistri ka phone')} inputMode="tel" />
              <Textarea wrapperClassName="sm:col-span-2" label={t('Pata')} required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} error={errors.address} hint={t('Gali, makan number, nishani')} />
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card title={t('Gaari aur waqt')}>
            <div className="space-y-3">
              <Select label={t('Gaari')} value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)} options={VEHICLES} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('Gaari number')} value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder={t('LES-1234')} />
                <Input label={t('Driver')} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <Input label={t('Driver phone')} value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} error={errors.driverPhone} inputMode="tel" />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('Tareekh')} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <Input label={t('Waqt')} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('Kiraya')} inputMode="decimal" value={deliveryCharge || ''} onChange={(e) => setDeliveryCharge(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} placeholder="0" hint={t('Driver ka hisaab')} />
                <Input label={t('Mazdoori')} inputMode="decimal" value={labour || ''} onChange={(e) => setLabour(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)} placeholder="0" />
              </div>
              {errors.charges && <p className="text-[0.8125rem] font-medium text-rose-600">{errors.charges}</p>}
              <p className="text-[0.75rem] text-slate-500">{t('Customer se kiraya lena hai to bill par Delivery charge lagayein — challan ka kiraya sale me nahi ginta.')}</p>
              <Textarea label={t('Driver ke liye hidayat')} rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={t('Pehle cement utarna, sarya peeche')} />
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/hardware/deliveries')}>{t('Wapas')}</Button>
            <Button className="flex-1" onClick={submit} loading={save.isPending} disabled={!!allSent} leftIcon={<Save className="h-4 w-4" />}>{t('Challan banayein')}</Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
