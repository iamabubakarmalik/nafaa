/**
 * New or edit a custom order: customer, what to make (design, wood, polish,
 * fabric, size, sketch), price with fitting, advance asked, days to make,
 * karigar and delivery address. An advance taken while booking is recorded
 * right after the order is saved (drawer + khata). The price changes only
 * while the order is a quotation.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { LucideIcon } from 'lucide-react';
import { GraduationCap, Hammer, Image as ImageIcon, Palette, Ruler, Truck, UserRound, Wallet, X } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Select, Skeleton, Switch, Textarea, heroIconButton } from '@/design-system/components';
import { UploadDropzone } from '@core/components/uploads';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { isDialogOpen } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { CustomerPicker } from '@modules/customers/directory/components/KhataTools';
import { customOrdersApi, type OrderInput } from '../api/custom-orders.api';
import { carpentersApi } from '../api/carpenters.api';
import { useSaveKey } from '../hooks/usePageKeys';
import {
  CATEGORY_GROUPS, FABRICS, FURNITURE_KEYS, MATERIALS, MONEY_KEYS, PAY_METHODS, POLISHES, WOODS, addDays, dayKey, errorText, moneyText, numIn, phoneOk, shortDate,
} from '../lib/meta';

interface Draft {
  customerId: string; customerName: string; customerPhone: string; customerCnic: string; customerAddress: string;
  productType: string; categoryType: string; material: string; description: string; woodType: string; polishRequested: string; colorRequested: string; upholsteryFabric: string;
  lengthCm: string; widthCm: string; heightCm: string; customDimensions: string; designNotes: string; sketchUrls: string[];
  quotedPrice: string; depositAmount: string; estimatedDays: string; requiresInstallation: boolean; installationCharge: string; warrantyMonths: string;
  carpenterId: string; workshopLocation: string; deliveryAddress: string; deliveryCity: string; deliveryArea: string; notes: string;
  advanceNow: string; advanceMethod: string;
}

const EMPTY: Draft = {
  customerId: '', customerName: '', customerPhone: '', customerCnic: '', customerAddress: '',
  productType: '', categoryType: '', material: '', description: '', woodType: '', polishRequested: '', colorRequested: '', upholsteryFabric: '',
  lengthCm: '', widthCm: '', heightCm: '', customDimensions: '', designNotes: '', sketchUrls: [],
  quotedPrice: '', depositAmount: '', estimatedDays: '21', requiresInstallation: false, installationCharge: '', warrantyMonths: '12',
  carpenterId: '', workshopLocation: '', deliveryAddress: '', deliveryCity: '', deliveryArea: '', notes: '',
  advanceNow: '', advanceMethod: 'CASH',
};
const ITEMS = ['Double bed', 'Sofa set 7 seater', 'Almari 3 door', 'Dining table 6 kursi', 'Dressing table', 'Center table', 'TV console', 'Kitchen cabinet'];
const DAYS = [7, 15, 21, 30, 45];
const ADVANCE_PCT = [25, 40, 50];

const opt = (v: string) => v.trim() || undefined;
const num = (v: string) => { const n = numIn(v); return n === null ? undefined : n; };

function Chips({ list, value, onPick }: { list: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((v) => (
        <button key={v} type="button" onClick={() => onPick(value === v ? '' : v)}
          className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ${value === v ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{v}</button>
      ))}
    </div>
  );
}

const T = ({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) => <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

export default function CustomOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canTakeMoney = usePermission(PERMISSIONS.POS_USE);
  const [d, setD] = useState<Draft>(EMPTY);
  const [tried, setTried] = useState(false);
  const [picking, setPicking] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  const orderQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'one', id], queryFn: () => customOrdersApi.getOne(id!), enabled: editing });
  const carpentersQ = useQuery({ queryKey: [FURNITURE_KEYS.carpenters, 'active'], queryFn: () => carpentersApi.list({ active: true }), staleTime: 60_000 });
  const o = orderQ.data;
  useEffect(() => {
    if (!o) return;
    const s = (v?: string | number | null) => (v === null || v === undefined ? '' : String(v));
    setD({
      ...EMPTY,
      customerId: s(o.customerId), customerName: o.customerName, customerPhone: o.customerPhone, customerCnic: s(o.customerCnic), customerAddress: s(o.customerAddress),
      productType: o.productType, categoryType: s(o.categoryType), material: s(o.material), description: o.description, woodType: s(o.woodType),
      polishRequested: s(o.polishRequested), colorRequested: s(o.colorRequested), upholsteryFabric: s(o.upholsteryFabric),
      lengthCm: s(o.lengthCm), widthCm: s(o.widthCm), heightCm: s(o.heightCm), customDimensions: s(o.customDimensions), designNotes: s(o.designNotes), sketchUrls: o.sketchUrls ?? [],
      quotedPrice: s(o.quotedPrice), depositAmount: s(o.depositAmount), estimatedDays: s(o.estimatedDays), requiresInstallation: o.requiresInstallation,
      installationCharge: s(o.installationCharge), warrantyMonths: s(o.warrantyMonths), carpenterId: s(o.carpenterId), workshopLocation: s(o.workshopLocation),
      deliveryAddress: s(o.deliveryAddress), deliveryCity: s(o.deliveryCity), deliveryArea: s(o.deliveryArea), notes: s(o.notes),
    });
  }, [o]);

  const priceOpen = !editing || o?.status === 'QUOTATION';
  const price = numIn(d.quotedPrice) ?? 0;
  const fitting = d.requiresInstallation ? numIn(d.installationCharge) ?? 0 : 0;
  const total = price + fitting;
  const advance = numIn(d.advanceNow) ?? 0;
  const days = Math.round(Number(d.estimatedDays) || 0);
  const errors = useMemo(() => ({
    customerName: !d.customerName.trim() ? 'Customer ka naam likhein' : undefined,
    customerPhone: !d.customerPhone.trim() ? 'Phone likhein — khata isi se banta hai' : !phoneOk(d.customerPhone) ? '10 se 15 hindse' : undefined,
    productType: !d.productType.trim() ? 'Kya banana hai' : undefined,
    description: !d.description.trim() ? 'Design ya tafseel likhein' : undefined,
    quotedPrice: !(price > 0) ? 'Qeemat likhein' : undefined,
    depositAmount: (numIn(d.depositAmount) ?? 0) > total ? 'Advance qeemat se zyada hai' : undefined,
    estimatedDays: days < 1 || days > 365 ? '1 se 365 din' : undefined,
    advanceNow: advance > total ? `Kul ${money(total)} hai` : undefined,
  }), [d, price, total, advance, days, money]);
  const bad = Object.values(errors).some(Boolean);

  const refresh = () => [FURNITURE_KEYS.orders, FURNITURE_KEYS.carpenters, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const save = useMutation({
    mutationFn: async () => {
      const payload: OrderInput = {
        customerId: opt(d.customerId), customerName: d.customerName.trim(), customerPhone: d.customerPhone.trim(), customerCnic: opt(d.customerCnic), customerAddress: opt(d.customerAddress),
        productType: d.productType.trim(), description: d.description.trim(), categoryType: opt(d.categoryType), material: opt(d.material),
        woodType: opt(d.woodType), polishRequested: opt(d.polishRequested), colorRequested: opt(d.colorRequested), upholsteryFabric: opt(d.upholsteryFabric),
        lengthCm: num(d.lengthCm), widthCm: num(d.widthCm), heightCm: num(d.heightCm), customDimensions: opt(d.customDimensions), designNotes: opt(d.designNotes), sketchUrls: d.sketchUrls,
        quotedPrice: price, depositAmount: numIn(d.depositAmount) ?? 0, estimatedDays: days, requiresInstallation: d.requiresInstallation,
        installationCharge: d.requiresInstallation ? numIn(d.installationCharge) ?? 0 : undefined, warrantyMonths: num(d.warrantyMonths),
        carpenterId: editing ? undefined : opt(d.carpenterId), workshopLocation: opt(d.workshopLocation),
        deliveryAddress: opt(d.deliveryAddress), deliveryCity: opt(d.deliveryCity), deliveryArea: opt(d.deliveryArea), notes: opt(d.notes),
      };
      const saved = editing ? await customOrdersApi.update(id!, payload) : await customOrdersApi.create(payload);
      if (!editing && advance > 0) {
        try { await customOrdersApi.recordPayment(saved.id, { amount: advance, paymentMethod: d.advanceMethod, isDeposit: true }); }
        catch (e) { toast.error(errorText(e, 'Order ban gaya, advance save nahi hua — order kholkar dobara lein')); }
      }
      return saved;
    },
    onSuccess: (r) => { toast.success(editing ? 'Order save' : `${r.orderNumber} ban gaya`); refresh(); navigate(`/furniture/custom-orders/${r.id}`, { replace: true }); },
    onError: (e) => toast.error(errorText(e, 'Order save nahi hua')),
  });
  const submit = () => {
    setTried(true);
    if (bad) { toast.error(Object.values(errors).find(Boolean)!); return; }
    if (!save.isPending) save.mutate();
  };
  useSaveKey(submit);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isDialogOpen()) navigate(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const e = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  if (editing && orderQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editing && !o) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Order nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/furniture/custom-orders')}>Orders par wapas</Button></div></PageShell>;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Order form — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#0891b2', title: 'Customer', text: 'Purana customer chunein ya naam aur phone likhein — advance aur baqi paisa isi ke khate me jata hai.' },
            { icon: Palette, color: '#a16207', title: 'Design', text: 'Lakri, polish, kapra aur size likhein. Sketch ya photo lagayein — karigar ko yahi dikhana hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Qeemat aur advance', text: 'Qeemat me fitting alag likh sakte hain. "Advance abhi mila" likhein to usi waqt drawer aur khate me jata hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}

      <PageHero
        title={editing ? `${o?.orderNumber} — badlein` : 'Naya custom order'}
        subtitle={editing ? (priceOpen ? 'Quotation hai — sab badal sakta hai' : 'Advance mil chuka — qeemat ab nahi badalti, baqi details badal sakti hain') : 'Customer, design, qeemat aur advance'}
        back={() => navigate(-1)}
        backLabel="Wapas (Esc)"
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>}
        actions={<button type="button" onClick={guide.open} title="Guide (G)" aria-label="Guide" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <div className="space-y-3">
              {d.customerId ? (
                <div className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-[0.875rem] text-brand-900 ring-1 ring-brand-100">
                  <UserRound className="h-4 w-4" /><span className="min-w-0 flex-1 truncate font-semibold">{d.customerName} · {d.customerPhone}</span>
                  {!editing && <button type="button" onClick={() => set({ customerId: '' })} aria-label="Hatayein" className="rounded-lg p-1 hover:bg-brand-100"><X className="h-4 w-4" /></button>}
                </div>
              ) : !editing && <Button variant="secondary" size="sm" onClick={() => setPicking(true)}>Purana customer chunein</Button>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Naam" required value={d.customerName} onChange={(x) => set({ customerName: x.target.value })} placeholder="Imran Sahib" error={e('customerName')} disabled={!!d.customerId} />
                <Input label="Phone" required inputMode="tel" value={d.customerPhone} onChange={(x) => set({ customerPhone: x.target.value })} placeholder="03001234567" error={e('customerPhone')} disabled={!!d.customerId} hint="Advance aur baqi isi khate me" />
                <Input label="CNIC" inputMode="numeric" value={d.customerCnic} onChange={(x) => set({ customerCnic: x.target.value })} placeholder="35202-1234567-1" hint="Bara order ho to likhein" />
                <Input label="Ghar ka pata" value={d.customerAddress} onChange={(x) => set({ customerAddress: x.target.value })} hint="Marzi hai" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Palette}>Kya banana hai</T>}>
            <div className="space-y-3">
              <Input label="Cheez" required value={d.productType} onChange={(x) => set({ productType: x.target.value })} placeholder="Double bed with side tables" error={e('productType')} />
              <Chips list={ITEMS} value={d.productType} onPick={(v) => set({ productType: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Kis cheez ka order" value={d.categoryType} onChange={(x) => set({ categoryType: x.target.value })} placeholder="Chunein"
                  options={CATEGORY_GROUPS.flatMap((g) => g.items.map(([v, l]) => ({ value: v, label: `${g.label} · ${l}` })))} hint="Reports me group isi se banta hai" />
                <Select label="Main material" value={d.material} onChange={(x) => set({ material: x.target.value })} placeholder="Chunein" options={Object.entries(MATERIALS).map(([value, label]) => ({ value, label }))} />
              </div>
              <Textarea label="Design / tafseel" required rows={3} value={d.description} onChange={(x) => set({ description: x.target.value })} error={e('description')}
                placeholder="Headboard par cushion, 2 side table, neeche storage box" />
              <Input label="Lakri" value={d.woodType} onChange={(x) => set({ woodType: x.target.value })} placeholder="Sheesham" />
              <Chips list={WOODS} value={d.woodType} onPick={(v) => set({ woodType: v })} />
              <Input label="Polish" value={d.polishRequested} onChange={(x) => set({ polishRequested: x.target.value })} placeholder="Walnut matte" />
              <Chips list={POLISHES} value={d.polishRequested} onPick={(v) => set({ polishRequested: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Rang" value={d.colorRequested} onChange={(x) => set({ colorRequested: x.target.value })} placeholder="Dark brown" />
                <Input label="Kapra (sofa / cushion)" value={d.upholsteryFabric} onChange={(x) => set({ upholsteryFabric: x.target.value })} placeholder="Velvet, grey" />
              </div>
              <Chips list={FABRICS} value={d.upholsteryFabric} onPick={(v) => set({ upholsteryFabric: v })} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Ruler}>Size aur sketch</T>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Lambai (cm)" inputMode="decimal" value={d.lengthCm} onChange={(x) => set({ lengthCm: moneyText(x.target.value) })} />
                <Input label="Chaurai (cm)" inputMode="decimal" value={d.widthCm} onChange={(x) => set({ widthCm: moneyText(x.target.value) })} />
                <Input label="Unchai (cm)" inputMode="decimal" value={d.heightCm} onChange={(x) => set({ heightCm: moneyText(x.target.value) })} />
              </div>
              <Input label="Ya size aise likhein" value={d.customDimensions} onChange={(x) => set({ customDimensions: x.target.value })} placeholder="6.5 × 7 feet (king)" />
              <Textarea label="Karigar ke liye note" rows={2} value={d.designNotes} onChange={(x) => set({ designNotes: x.target.value })} placeholder="Drawer soft-close, handle golden" />
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><ImageIcon className="h-4 w-4" />Sketch / photo</p>
                {d.sketchUrls.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {d.sketchUrls.map((u) => (
                      <span key={u} className="relative">
                        <img src={u} alt="Sketch" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
                        <button type="button" onClick={() => set({ sketchUrls: d.sketchUrls.filter((x) => x !== u) })} aria-label="Hatayein" className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 shadow ring-1 ring-slate-200"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
                {d.sketchUrls.length < 20 && <UploadDropzone purpose="product-gallery" maxFiles={6} hint="Customer ki di hui photo ya hath ka sketch" onUploaded={(recs) => set({ sketchUrls: [...d.sketchUrls, ...recs.map((r) => r.url)].slice(0, 20) })} />}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Wallet}>Qeemat aur advance</T>}>
            <fieldset disabled={!priceOpen} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Qeemat (Rs)" required inputMode="decimal" value={d.quotedPrice} onChange={(x) => set({ quotedPrice: moneyText(x.target.value) })} error={e('quotedPrice')} hint="Furniture ki tay shuda qeemat" />
                <Input label="Advance kitna lena hai" inputMode="decimal" value={d.depositAmount} onChange={(x) => set({ depositAmount: moneyText(x.target.value) })} error={e('depositAmount')} hint="Itna milne par order 'Advance mila' ho jata hai" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ADVANCE_PCT.map((p) => <button key={p} type="button" onClick={() => set({ depositAmount: String(Math.round((total * p) / 100)) })} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50" disabled={!total}>{p}%</button>)}
              </div>
              <Switch checked={d.requiresInstallation} onChange={(x) => set({ requiresInstallation: x.target.checked })} label="Ghar par fitting" description="Fitting ka charge bill me alag line" />
              {d.requiresInstallation && <Input label="Fitting charge (Rs)" inputMode="decimal" value={d.installationCharge} onChange={(x) => set({ installationCharge: moneyText(x.target.value) })} placeholder="0" hint="0 = free fitting" />}
              <div className="rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem]">
                <div className="flex justify-between"><span>Kul bill</span><span className="font-bold tabular-nums">{money(total)}</span></div>
                {editing && o && <div className="flex justify-between text-slate-600"><span>Mil chuka</span><span className="tabular-nums">{money(o.totalPaid)}</span></div>}
              </div>
            </fieldset>
            {!editing && canTakeMoney && (
              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                <Input label="Advance abhi mila (Rs)" inputMode="decimal" value={d.advanceNow} onChange={(x) => set({ advanceNow: moneyText(x.target.value) })} error={e('advanceNow')}
                  hint={advance > 0 ? `Drawer aur ${d.customerName || 'customer'} ke khate me` : 'Nahi mila to khali chhorein'} />
                <Select label="Kaise mila" value={d.advanceMethod} onChange={(x) => set({ advanceMethod: x.target.value })} options={PAY_METHODS} />
              </div>
            )}
          </Card>

          <Card className="rounded-2xl" title={<T icon={Hammer}>Kab aur kaun banayega</T>}>
            <div className="space-y-3">
              <Input label="Kitne din lagenge" required inputMode="numeric" value={d.estimatedDays} onChange={(x) => set({ estimatedDays: x.target.value.replace(/\D/g, '') })} error={e('estimatedDays')}
                hint={days > 0 ? `Dene ki date ${shortDate(addDays(editing && o ? dayKey(new Date(o.quotationDate)) : dayKey(), days))}` : undefined} />
              <div className="flex flex-wrap gap-1.5">{DAYS.map((n) => <button key={n} type="button" onClick={() => set({ estimatedDays: String(n) })} className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold ring-1 ${days === n ? 'bg-brand-600 text-brand-fg ring-brand-600' : 'ring-slate-200 hover:bg-slate-50'}`}>{n} din</button>)}</div>
              {!editing && (
                <Select label="Karigar" value={d.carpenterId} onChange={(x) => set({ carpenterId: x.target.value })} placeholder="Baad me dein"
                  options={(carpentersQ.data ?? []).map((c) => ({ value: c.id, label: `${c.name}${c.activeProjects ? ` — ${c.activeProjects} kaam haath me` : ''}` }))}
                  hint="Order page se bhi de sakte hain" />
              )}
              <Input label="Workshop" value={d.workshopLocation} onChange={(x) => set({ workshopLocation: x.target.value })} placeholder="Main workshop" hint="Marzi hai" />
              <Input label="Warranty (mahine)" inputMode="numeric" value={d.warrantyMonths} onChange={(x) => set({ warrantyMonths: x.target.value.replace(/\D/g, '') })} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Truck}>Delivery</T>}>
            <div className="space-y-3">
              <Input label="Delivery ka pata" value={d.deliveryAddress} onChange={(x) => set({ deliveryAddress: x.target.value })} placeholder="Ghar ka pata se alag ho to" hint="Khali ho to ghar ka pata" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Shehar" value={d.deliveryCity} onChange={(x) => set({ deliveryCity: x.target.value })} placeholder="Lahore" />
                <Input label="Ilaqa" value={d.deliveryArea} onChange={(x) => set({ deliveryArea: x.target.value })} placeholder="DHA Phase 5" />
              </div>
              <Textarea label="Note" rows={2} value={d.notes} onChange={(x) => set({ notes: x.target.value })} />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>Wapas</Button>
            <Button className="flex-1" loading={save.isPending} onClick={submit}>{editing ? 'Save karein' : advance > 0 ? `Order + ${money(advance)} advance` : 'Order banayein'}</Button>
          </div>
        </div>
      </div>

      {picking && <CustomerPicker title="Customer chunein" money={money} onClose={() => setPicking(false)}
        onPick={(c) => { set({ customerId: c.id, customerName: c.name, customerPhone: c.phone ?? '', customerCnic: c.cnic ?? d.customerCnic }); setPicking(false); }} />}
    </PageShell>
  );
}
