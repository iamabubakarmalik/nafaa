/**
 * Quotation (estimate) form, for a new quotation or a revision of an open
 * one: customer and site, items from the catalog at retail or contractor
 * rate (quantity rates apply by themselves), extra charges, validity and
 * terms. The server prices the lines again on save.
 *
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Building2, CalendarClock, FileText, GraduationCap, HardHat, Package, Save, Store, Tags, Trash2, UserRound } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Segmented, Select, Skeleton, Textarea, heroIconButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { HeroBack } from '@core/components/HeroBack';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PosItem } from '@modules/pos/engine';
import { quotationsApi, type QuotationInput } from '../api/quotations.api';
import { projectsApi } from '../api/projects.api';
import type { Unit } from '../api/products.api';
import { CustomerPick, type PickedCustomer } from '../components/CustomerPick';
import { ItemPick } from '../components/ItemPick';
import { tierFor, useTiers } from '../hooks/useHardwareFacts';
import { useSaveKey } from '../hooks/usePageKeys';
import { UNIT_LABEL, errorText, slipUnit } from '../lib/meta';

interface Line {
  key: string;
  productId?: string;
  itemName: string;
  specifications: string;
  quantity: number;
  unit: Unit;
  unitPrice: number;
  /** Retail and wholesale rate of a catalog item, for the rate switch. */
  retail?: number;
  wholesale?: number;
  discount: number;
}

const VALIDITY = [7, 15, 30];
const key = () => Math.random().toString(36).slice(2, 9);
const r2 = (n: number) => Math.round(n * 100) / 100;

export default function NewQuotationPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const tiers = useTiers();
  const editing = !!id;

  const { data: existing, isLoading } = useQuery({ queryKey: ['hardware-quotation', id], queryFn: () => quotationsApi.getOne(id!), enabled: editing });
  const { data: projects = [] } = useQuery({ queryKey: ['hardware-projects', 'active'], queryFn: () => projectsApi.list({ active: true }).catch(() => []), staleTime: 60_000 });

  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [projectId, setProjectId] = useState(params.get('project') ?? '');
  const [rate, setRate] = useState<'retail' | 'wholesale'>('retail');
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxPct, setTaxPct] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [labour, setLabour] = useState(0);
  const [other, setOther] = useState(0);
  const [validity, setValidity] = useState(15);
  const [paymentTerms, setPaymentTerms] = useState('50% advance, baqi delivery par');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [internal, setInternal] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!existing) return;
    setName(existing.customerName); setPhone(existing.customerPhone ?? ''); setAddress(existing.customerAddress ?? '');
    if (existing.customerId) setCustomer({ id: existing.customerId, name: existing.customerName, phone: existing.customerPhone ?? null, address: existing.customerAddress ?? null, balance: 0, creditLimit: 0 });
    setProjectId(existing.projectId ?? '');
    setLines(existing.items.map((i) => ({
      key: key(), productId: i.productId, itemName: i.itemName, specifications: i.specifications ?? '', quantity: i.quantity,
      unit: (i.unit as Unit) || 'PIECE', unitPrice: i.unitPrice, discount: i.discount,
    })));
    setDiscount(existing.discount); setTaxPct(existing.taxPct); setDelivery(existing.deliveryCharges); setLabour(existing.laborCharges); setOther(existing.otherCharges);
    setValidity(existing.validityDays); setPaymentTerms(existing.paymentTerms ?? ''); setDeliveryTerms(existing.deliveryTerms ?? '');
    setNotes(existing.customerNotes ?? ''); setInternal(existing.internalNotes ?? '');
  }, [existing]);

  // A site carries its customer.
  const project = projects.find((p) => p.id === projectId);
  useEffect(() => {
    if (!project || editing || customer || name) return;
    setName(project.customerName); setPhone(project.customerPhone ?? ''); setAddress(project.siteAddress);
  }, [project, editing, customer, name]);

  const pickCustomer = (c: PickedCustomer | null) => {
    setCustomer(c);
    if (c) { setName(c.name); setPhone(c.phone ?? ''); setAddress(c.address ?? ''); }
  };

  const priceFor = (l: Pick<Line, 'productId' | 'retail' | 'wholesale'>, quantity: number, mode = rate) => {
    const base = mode === 'wholesale' && l.wholesale && l.wholesale > 0 ? l.wholesale : l.retail ?? 0;
    const t = l.productId ? tierFor(tiers.get(l.productId), quantity) : null;
    return t && t.price < base ? t.price : base;
  };
  const addItem = (i: PosItem, facts?: string) => {
    if (lines.some((l) => l.productId === i.id)) { toast.info(`${i.name} pehle se list me hai — quantity badlein`); return; }
    const l = { productId: i.id, retail: i.price, wholesale: Number(i.product.wholesalePrice) || undefined };
    setLines((p) => [...p, { key: key(), ...l, itemName: i.name, specifications: facts ?? '', quantity: 1, unit: slipUnit(i.unit), unitPrice: priceFor(l, 1), discount: 0 }]);
  };
  const addCustom = (itemName: string) => setLines((p) => [...p, { key: key(), itemName, specifications: '', quantity: 1, unit: 'PIECE', unitPrice: 0, discount: 0 }]);
  const update = (k: string, patch: Partial<Line>) => setLines((p) => p.map((l) => {
    if (l.key !== k) return l;
    const next = { ...l, ...patch };
    // Changing the quantity of a catalog item follows its quantity rate, unless the rate was typed by hand.
    if (patch.quantity != null && l.productId && l.unitPrice === priceFor(l, l.quantity)) next.unitPrice = priceFor(next, next.quantity);
    return next;
  }));
  const switchRate = (mode: 'retail' | 'wholesale') => {
    setRate(mode);
    setLines((p) => p.map((l) => (l.productId && l.retail != null ? { ...l, unitPrice: priceFor(l, l.quantity, mode) } : l)));
  };

  const totals = useMemo(() => {
    const subtotal = r2(lines.reduce((s, l) => s + Math.max(l.quantity * l.unitPrice - l.discount, 0), 0));
    const disc = Math.min(discount, subtotal);
    const tax = r2(((subtotal - disc) * taxPct) / 100);
    return { subtotal, disc, tax, total: r2(subtotal - disc + tax + delivery + labour + other) };
  }, [lines, discount, taxPct, delivery, labour, other]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Customer ka naam likhein';
    if (phone.trim() && !/^[0-9+\-\s]{10,15}$/.test(phone.trim())) e.phone = 'Phone number theek likhein (03xx-xxxxxxx)';
    if (!lines.length) e.items = 'Kam se kam ek item dalein';
    lines.forEach((l) => {
      if (!l.itemName.trim()) e[`n-${l.key}`] = 'Naam likhein';
      if (!(l.quantity > 0)) e[`q-${l.key}`] = 'Quantity 0 se zyada';
      if (!(l.unitPrice >= 0)) e[`p-${l.key}`] = 'Rate theek likhein';
      if (l.discount < 0 || l.discount > l.quantity * l.unitPrice) e[`d-${l.key}`] = 'Discount line se zyada nahi';
    });
    if ([discount, taxPct, delivery, labour, other].some((v) => v < 0)) e.charges = 'Koi amount manfi nahi ho sakti';
    if (discount > totals.subtotal) e.charges = 'Discount items se zyada hai';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = useMutation({
    mutationFn: () => {
      const body: QuotationInput = {
        projectId: projectId || undefined, customerId: customer?.id, customerName: name.trim(), customerPhone: phone.trim() || undefined,
        customerAddress: address.trim() || undefined, validityDays: validity, discount: totals.disc, taxPct, deliveryCharges: delivery,
        laborCharges: labour, otherCharges: other, paymentTerms: paymentTerms.trim() || undefined, deliveryTerms: deliveryTerms.trim() || undefined,
        customerNotes: notes.trim() || undefined, internalNotes: internal.trim() || undefined,
        items: lines.map((l) => ({ productId: l.productId, itemName: l.itemName.trim(), specifications: l.specifications.trim() || undefined, quantity: l.quantity, unit: l.unit, unitPrice: l.unitPrice, discount: l.discount || undefined })),
      };
      return editing ? quotationsApi.revise(id!, body) : quotationsApi.create(body);
    },
    onSuccess: (q) => {
      qc.invalidateQueries({ queryKey: ['hardware-quotations'] });
      qc.invalidateQueries({ queryKey: ['hardware-quotation', q.id] });
      qc.invalidateQueries({ queryKey: ['hardware-quotations-summary'] });
      toast.success(editing ? `${q.quotationNumber} ki nayi revision save ho gayi` : `Quotation ${q.quotationNumber} ban gayi`);
      navigate(`/hardware/quotations/${q.id}`);
    },
    onError: (e) => toast.error(errorText(e, 'Quotation save nahi hui')),
  });
  const submit = () => { if (!save.isPending && validate()) save.mutate(); else if (!save.isPending) toast.error('Laal nishan wali jagah theek karein'); };
  useSaveKey(submit);

  if (editing && isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></PageShell>;
  if (editing && existing?.status === 'CONVERTED') {
    return (
      <PageShell>
        <PageHero title={<HeroBack to={`/hardware/quotations/${id}`} label="Quotation">{existing.quotationNumber}</HeroBack>} meta="Is quotation ka bill ban chuka hai" />
        <Card><p className="text-[0.9375rem] text-slate-700">Bill ban chuki quotation badli nahi ja sakti. Nayi quotation banayein.</p></Card>
      </PageShell>
    );
  }

  const field = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-[0.875rem] tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';
  const money = (label: string, value: number, set: (n: number) => void, hint?: string) => (
    <Input label={label} hint={hint} inputMode="decimal" value={value || ''} onChange={(e) => set(Math.max(Number(e.target.value.replace(/[^\d.]/g, '')) || 0, 0))} placeholder="0" />
  );

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Quotation — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Customer aur site', text: 'Purana customer dhoondein ya naam aur phone likhein. Site chunein to pata khud aa jata hai.' },
            { icon: Package, color: '#a16207', title: 'Items', text: 'Naam, size ya code likh kar Enter. Catalog me na ho to "catalog ke bagair line" — magar bill ke liye item catalog me hona chahiye.' },
            { icon: HardHat, color: '#16a34a', title: 'Thekedar rate', text: 'Upar "Thekedar rate" chunein to wholesale rate lagta hai; zyada quantity par quantity rate khud lagta hai.' },
            { icon: CalendarClock, color: '#d97706', title: 'Kitne din chalegi', text: 'Rate badalte rehte hain — quotation 7, 15 ya 30 din tak. Phir "Waqt guzar gaya" ho jati hai.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['G', 'guide']]} />
      )}

      <PageHero
        title={<HeroBack to={editing ? `/hardware/quotations/${id}` : '/hardware/quotations'} label="Quotations">{editing ? `Revision · ${existing?.quotationNumber ?? ''}` : 'Nayi quotation'}</HeroBack>}
        meta="Estimate jo customer ko diya jata hai — maan le to ek click me bill"
        actions={<>
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[{ label: 'Kul amount', value: formatPKR(totals.total) }, { label: 'Items', value: String(lines.length) }, { label: 'Chalegi', value: `${validity} din` }]} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Card title="Customer aur site" description="Kis ke liye aur kahan ka maal">
            <div className="space-y-3">
              <CustomerPick value={customer} onChange={pickCustomer} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Naam" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} hint="Quotation par yahi naam chhapta hai" />
                <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} inputMode="tel" placeholder="03xx-xxxxxxx" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Site / project" value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  options={[{ value: '', label: 'Koi site nahi' }, ...projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.customerName}` }))]}
                  hint={<Link to="/hardware/projects" className="text-brand-700 hover:underline">Nayi site banayein</Link>} />
                <Input label="Pata" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Site ya ghar ka pata" />
              </div>
            </div>
          </Card>

          <Card title="Items" description="Rate quotation ke din ka — bill banate waqt yahi rate lagta hai"
            actions={<Segmented label="Rate" value={rate} onChange={switchRate} items={[
              { value: 'retail', label: <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5" />Retail</span> },
              { value: 'wholesale', label: <span className="inline-flex items-center gap-1"><HardHat className="h-3.5 w-3.5" />Thekedar</span> },
            ]} />}>
            <ItemPick onPick={addItem} onCustom={addCustom} />
            {errors.items && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{errors.items}</p>}
            {lines.length > 0 && (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {lines.map((l, i) => {
                  const t = l.productId ? tierFor(tiers.get(l.productId), l.quantity) : null;
                  return (
                    <li key={l.key} className="grid gap-2 p-3 sm:grid-cols-[1.5rem_minmax(0,1fr)_6rem_5.5rem_7rem_6rem_2.25rem] sm:items-start">
                      <span className="hidden pt-2.5 text-[0.75rem] font-semibold text-slate-400 sm:block">{i + 1}</span>
                      <div className="min-w-0 space-y-1">
                        <input value={l.itemName} onChange={(e) => update(l.key, { itemName: e.target.value })} aria-label="Item" className={cn(field, 'font-medium', errors[`n-${l.key}`] && 'border-rose-400')} />
                        <input value={l.specifications} onChange={(e) => update(l.key, { specifications: e.target.value })} placeholder="Size, shade, brand (marzi)" aria-label="Tafseel" className={cn(field, 'h-8 text-[0.8125rem] text-slate-600')} />
                        {!l.productId && <p className="text-[0.6875rem] text-amber-700">Catalog me nahi — bill se pehle product banayein</p>}
                        {t && l.unitPrice === t.price && <p className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-emerald-700"><Tags className="h-3 w-3" />{t.minQuantity}+ wala rate</p>}
                      </div>
                      <label className="block"><span className="text-[0.6875rem] text-slate-500 sm:hidden">Quantity</span>
                        <input inputMode="decimal" value={l.quantity || ''} onChange={(e) => update(l.key, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} aria-label="Quantity" className={cn(field, errors[`q-${l.key}`] && 'border-rose-400')} /></label>
                      <label className="block"><span className="text-[0.6875rem] text-slate-500 sm:hidden">Unit</span>
                        <select value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value as Unit })} aria-label="Unit" className={field}>
                          {Object.entries(UNIT_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                        </select></label>
                      <label className="block"><span className="text-[0.6875rem] text-slate-500 sm:hidden">Rate</span>
                        <input inputMode="decimal" value={l.unitPrice || ''} onChange={(e) => update(l.key, { unitPrice: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} aria-label="Rate" className={cn(field, errors[`p-${l.key}`] && 'border-rose-400')} /></label>
                      <p className="pt-2.5 text-right text-[0.875rem] font-semibold tabular-nums">{formatPKR(Math.max(l.quantity * l.unitPrice - l.discount, 0))}</p>
                      <button type="button" onClick={() => setLines((p) => p.filter((x) => x.key !== l.key))} aria-label="Line hatayein" className="flex h-10 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Shartein aur note" description="Quotation par chhapti hain">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Payment" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="50% advance, baqi delivery par" />
              <Input label="Delivery" value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} placeholder="3 din me site par" />
              <Textarea label="Customer ke liye note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Textarea label="Andar ka note" hint="Sirf dukaan wale dekhte hain" rows={2} value={internal} onChange={(e) => setInternal(e.target.value)} />
            </div>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card title="Hisaab">
            <div className="space-y-3">
              {money('Discount (Rs)', discount, setDiscount)}
              <Input label="Tax %" inputMode="decimal" value={taxPct || ''} onChange={(e) => setTaxPct(Math.min(Math.max(Number(e.target.value.replace(/[^\d.]/g, '')) || 0, 0), 100))} placeholder="0" />
              {money('Delivery / kiraya', delivery, setDelivery)}
              {money('Mazdoori', labour, setLabour, 'Utarai, fitting')}
              {money('Aur kharcha', other, setOther)}
              {errors.charges && <p className="text-[0.8125rem] font-medium text-rose-600">{errors.charges}</p>}
              <dl className="space-y-1 border-t border-slate-100 pt-3 text-[0.875rem]">
                <div className="flex justify-between"><dt className="text-slate-500">Items</dt><dd className="tabular-nums">{formatPKR(totals.subtotal)}</dd></div>
                {totals.disc > 0 && <div className="flex justify-between"><dt className="text-slate-500">Discount</dt><dd className="tabular-nums">−{formatPKR(totals.disc)}</dd></div>}
                {totals.tax > 0 && <div className="flex justify-between"><dt className="text-slate-500">Tax</dt><dd className="tabular-nums">{formatPKR(totals.tax)}</dd></div>}
                {delivery + labour + other > 0 && <div className="flex justify-between"><dt className="text-slate-500">Kiraya / mazdoori</dt><dd className="tabular-nums">{formatPKR(delivery + labour + other)}</dd></div>}
                <div className="flex justify-between border-t border-slate-100 pt-2 text-[1.0625rem] font-bold"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(totals.total)}</dd></div>
              </dl>
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitne din chalegi</span>
                <div className="flex gap-1.5">
                  {VALIDITY.map((d) => (
                    <button key={d} type="button" onClick={() => setValidity(d)}
                      className={cn('h-9 flex-1 rounded-lg text-[0.8125rem] font-semibold ring-1', validity === d ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{d} din</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => navigate(editing ? `/hardware/quotations/${id}` : '/hardware/quotations')}>Wapas</Button>
            <Button className="flex-1" onClick={submit} loading={save.isPending} leftIcon={<Save className="h-4 w-4" />}>{editing ? 'Revision save' : 'Save'}</Button>
          </div>
          {projectId && <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Building2 className="h-3.5 w-3.5" />Site: {project?.name}</p>}
          {!editing && <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><FileText className="h-3.5 w-3.5" />Save ke baad print, WhatsApp aur bill wahan se</p>}
        </aside>
      </div>
    </PageShell>
  );
}
