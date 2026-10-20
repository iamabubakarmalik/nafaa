/**
 * New glasses or repair order. Glasses: customer, their nuskha (picked from
 * saved prescriptions or typed in), frame from stock or the customer's own,
 * lens type, index and coating, lab and pickup date, prices and the advance.
 * Repair: the customer's frame, what is wrong, the charge and the date.
 * The advance is taken here and lands in today's drawer; the bill is made
 * when the glasses are handed over.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Eye, FlaskConical, Glasses, Package, Search, UserRound, Wallet, Wrench } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Switch, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { lensOrdersApi, type LensOrderInput } from '../api/lens-orders.api';
import { prescriptionsApi } from '../api/prescriptions.api';
import { Chips, CustomerFields, FormHeader, PowerGrid, PowerTable, emptyParty, emptyPower, partyErrors, powerDraftOf, powerOf, type PartyDraft, type PowerDraft } from '../components/ui';
import { factLine, useOpticalFacts } from '../hooks/useOpticalFacts';
import { useDebounced, useFormKeys } from '../hooks/usePageKeys';
import {
  COATINGS, LENS_INDEX, LENS_MATERIAL, LENS_TYPES, MONEY_KEYS, OPTICAL_KEYS, REPAIR, REPAIR_KINDS, apiError, dayOnly, moneyInput, powerErrors, powerSummary, todayInput,
} from '../lib/meta';

const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const T = ({ icon: Icon, children }: { icon: typeof Eye; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;

interface Frame { productId?: string; name: string; price: string; stock?: number }

export default function LensOrderFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const repair = params.get('type') === 'repair';
  const facts = useOpticalFacts();

  const [party, setParty] = useState<PartyDraft>(emptyParty);
  const [rxId, setRxId] = useState(params.get('rx') ?? '');
  const [power, setPower] = useState<PowerDraft>(emptyPower);
  const [frame, setFrame] = useState<Frame>({ name: '', price: '' });
  const [frameQ, setFrameQ] = useState('');
  const [ownFrame, setOwnFrame] = useState(repair);
  const [lensType, setLensType] = useState(repair ? REPAIR : 'Single vision');
  const [lensIndex, setLensIndex] = useState('1.56');
  const [material, setMaterial] = useState('');
  const [coatings, setCoatings] = useState<string[]>(['ARC (anti-glare)']);
  const [repairKinds, setRepairKinds] = useState<string[]>([]);
  const [lensPrice, setLensPrice] = useState('');
  const [lensCost, setLensCost] = useState('');
  const [fitting, setFitting] = useState('');
  const [labName, setLabName] = useState('');
  const [date, setDate] = useState(plusDays(repair ? 2 : 7));
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [tried, setTried] = useState(false);

  // A nuskha opened from its page brings its customer.
  const fromRx = useQuery({ queryKey: [OPTICAL_KEYS.rx, rxId], queryFn: () => prescriptionsApi.getOne(rxId), enabled: !!rxId && !party.name });
  useEffect(() => {
    const rx = fromRx.data;
    if (rx && !party.name) setParty({ customerId: rx.customerId ?? undefined, name: rx.customerName, phone: rx.customerPhone ?? '' });
  }, [fromRx.data, party.name]);

  const rxList = useQuery({ queryKey: [OPTICAL_KEYS.rx, 'customer', party.customerId], queryFn: () => prescriptionsApi.byCustomer(party.customerId!), enabled: !!party.customerId && !repair });
  const usable = (rxList.data ?? []).filter((r) => r.isActive && !r.computed?.isExpired);
  const rx = usable.find((r) => r.id === rxId) ?? (fromRx.data?.id === rxId ? fromRx.data : undefined);
  useEffect(() => { if (!rxId && usable.length && !repair) setRxId(usable[0].id); }, [usable, rxId, repair]);

  const q = useDebounced(frameQ.trim());
  const frames = useQuery({ queryKey: ['optical-frame-search', q], queryFn: () => productsApi.list({ search: q, limit: 8, isActive: true }), enabled: q.length >= 2 && !ownFrame });

  const p = powerOf(power);
  const pErr = rx ? {} : powerErrors(p);
  const pe = partyErrors(party);
  const lp = Number(lensPrice) || 0;
  const fp = ownFrame ? 0 : Number(frame.price) || 0;
  const fit = Number(fitting) || 0;
  const total = Math.round((fp + lp + fit) * 100) / 100;
  const adv = Number(advance) || 0;

  const errors = useMemo(() => {
    const e: Record<string, string> = { ...pe };
    if (!ownFrame && !frame.name.trim()) e.frame = 'Frame chunein ya "Customer ka apna frame" lagayein';
    if (repair && !frame.name.trim()) e.frame = 'Frame ka naam likhein (jaise: kala metal frame)';
    if (!repair && !rx && !Object.keys(p).length) e.power = 'Nuskha chunein ya number likhein';
    if (Object.keys(pErr).length) e.power = Object.values(pErr)[0];
    if (!(total > 0)) e.total = repair ? 'Repair ka charge likhein' : 'Qeemat likhein';
    if (adv > total + 0.01) e.advance = `Advance kul (${formatPKR(total)}) se zyada nahi`;
    if (Number(lensCost) > 0 && Number(lensCost) > lp && lp > 0) e.lensCost = 'Lab ka kharcha lens ki qeemat se zyada hai — dobara dekhein';
    return e;
  }, [pe, ownFrame, frame.name, repair, rx, p, pErr, total, adv, lensCost, lp]);
  const blocking = Object.keys(errors).filter((k) => k !== 'lensCost');

  const save = useMutation({
    mutationFn: () => {
      const body: LensOrderInput = {
        customerId: party.customerId, customerName: party.name.trim(), customerPhone: party.phone.trim(),
        prescriptionId: !repair && rx ? rx.id : undefined,
        ...(!repair && !rx ? p : {}),
        frameProductId: !ownFrame && frame.productId ? frame.productId : undefined,
        frameName: ownFrame ? (frame.name.trim() || 'Customer ka apna frame') : frame.name.trim(),
        lensType: repair ? REPAIR : lensType, lensIndex: repair ? undefined : lensIndex || undefined, lensMaterial: repair ? undefined : material || undefined,
        lensCoatings: repair ? [] : coatings,
        framePrice: fp || undefined, lensPrice: lp || undefined, lensCost: Number(lensCost) || undefined, fittingCharge: fit || undefined,
        labName: labName.trim() || undefined, expectedDate: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
        paidAmount: adv || undefined, paymentMethod: adv > 0 ? method : undefined,
        notes: [repair && repairKinds.length ? `Repair: ${repairKinds.join(', ')}` : '', notes.trim()].filter(Boolean).join('\n') || undefined,
      };
      return lensOrdersApi.create(body);
    },
    onSuccess: (o) => {
      toast.success(`${o.orderNumber} ban gaya${adv > 0 ? ` — ${formatPKR(adv)} advance` : ''}`);
      qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.orders] });
      if (adv > 0) MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/optical/lens-orders/${o.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiError(e, 'Order save nahi hua')),
  });
  const submit = () => {
    setTried(true);
    if (blocking.length) { toast.error(errors[blocking[0]]); return; }
    if (!save.isPending) save.mutate();
  };
  useFormKeys(submit);
  const show = (k: string) => (tried ? errors[k] : undefined);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={repair ? 'Repair order' : 'Chashma order'} onClose={guide.close}
          steps={repair ? [
            { icon: UserRound, color: '#2563eb', title: 'Customer', text: 'Naam aur mobile — tayyar hone par isi number par WhatsApp.' },
            { icon: Wrench, color: '#a16207', title: 'Kya kharab hai', text: 'Pech, nose pad, dandi… chunein aur charge likhein.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance aaj ke cash me aata hai; baqi dete waqt.' },
          ] : [
            { icon: Eye, color: '#2563eb', title: 'Nuskha', text: 'Saved customer ka nuskha khud aa jata hai. Bahar ka nuskha ho to number yahan likhein.' },
            { icon: Glasses, color: '#7c3aed', title: 'Frame', text: 'Stock se frame dhoondein — dete waqt stock se nikalta hai. Apna frame ho to switch lagayein.' },
            { icon: FlaskConical, color: '#0891b2', title: 'Lens aur lab', text: 'Lens type, index, coating. Lab ka kharcha likhein to profit sahi aata hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance aaj ke cash me; baqi customer ko dete waqt ya khata me.' },
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]} />
      )}
      <FormHeader title={repair ? 'Naya repair' : 'Naya chashma order'} hint={repair ? 'Customer ka frame, kya theek karna hai, charge aur date' : 'Customer, nuskha, frame, lens, lab aur advance'} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <CustomerFields value={party} onChange={(v) => { setParty(v); if (v.customerId !== party.customerId) setRxId(''); }} errors={tried ? pe : {}} />
          </Card>

          {!repair && (
            <Card className="rounded-2xl" title={<T icon={Eye}>Nuskha (number)</T>} description="Saved nuskha chunein, ya number yahan likhein">
              {usable.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {usable.map((r) => (
                    <button key={r.id} type="button" onClick={() => setRxId(rxId === r.id ? '' : r.id)} aria-pressed={rxId === r.id}
                      className={`rounded-xl px-3 py-2 text-left text-[0.8125rem] ring-1 ${rxId === r.id ? 'bg-brand-50 ring-brand-400' : 'bg-white ring-slate-200 hover:bg-slate-50'}`}>
                      <span className="font-semibold">{r.prescriptionNumber}</span> <span className="text-slate-500">· {dayOnly(r.prescriptionDate)}</span>
                      <span className="block font-mono text-[0.75rem] text-slate-600">{powerSummary(r) || '—'}</span>
                    </button>
                  ))}
                  {rxId && <button type="button" onClick={() => setRxId('')} className="rounded-xl px-3 py-2 text-[0.8125rem] font-medium text-brand-700 hover:bg-brand-50">Naya number likhein</button>}
                </div>
              )}
              {rx ? <PowerTable p={rx} /> : (
                <>
                  <PowerGrid value={power} onChange={setPower} errors={tried ? pErr : {}} />
                  {show('power') && !Object.keys(pErr).length && <p className="mt-1.5 text-[0.8125rem] font-medium text-rose-600">{show('power')}</p>}
                </>
              )}
            </Card>
          )}

          <Card className="rounded-2xl" title={<T icon={repair ? Wrench : Glasses}>{repair ? 'Frame aur kaam' : 'Frame'}</T>}>
            {!repair && (
              <label className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                <span className="text-[0.875rem] text-slate-800">Customer ka apna frame<span className="block text-[0.75rem] text-slate-500">Sirf lens lagane hain — frame ki qeemat nahi lagti</span></span>
                <Switch checked={ownFrame} onChange={(e) => { setOwnFrame(e.target.checked); setFrame({ name: '', price: '' }); }} aria-label="Apna frame" />
              </label>
            )}
            {!ownFrame ? (
              <div className="space-y-2">
                {frame.productId ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-200">
                    <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{frame.name}</p><p className="text-[0.75rem] text-slate-600">{factLine(facts.get(frame.productId)) ?? 'Stock se'} · stock {frame.stock ?? 0}</p></div>
                    <Button size="sm" variant="secondary" onClick={() => setFrame({ name: '', price: '' })}>Badlein</Button>
                  </div>
                ) : (
                  <>
                    <Input label="Frame dhoondein" value={frameQ} onChange={(e) => setFrameQ(e.target.value)} placeholder="Brand, model, rang ya barcode" leftIcon={<Search className="h-4 w-4" />} error={show('frame')} />
                    {(frames.data?.items ?? []).length > 0 && (
                      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl ring-1 ring-slate-200">
                        {frames.data!.items.map((pr) => (
                          <li key={pr.id}>
                            <button type="button" onClick={() => { setFrame({ productId: pr.id, name: pr.name, price: String(pr.price ?? ''), stock: pr.stock }); setFrameQ(''); }}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50">
                              <span className="min-w-0"><span className="block truncate font-medium text-slate-900">{pr.name}</span><span className="block truncate text-[0.75rem] text-slate-500">{factLine(facts.get(pr.id)) ?? pr.sku ?? ''}</span></span>
                              <span className="shrink-0 text-right text-[0.8125rem]"><span className="block font-semibold tabular-nums">{formatPKR(pr.price)}</span><span className={pr.stock > 0 ? 'text-slate-500' : 'text-rose-600'}>stock {pr.stock}</span></span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {q.length >= 2 && frames.isSuccess && !frames.data.items.length && <p className="text-[0.8125rem] text-slate-500">Stock me nahi mila — <button type="button" className="font-semibold text-brand-700 underline" onClick={() => { setFrame({ name: frameQ.trim(), price: '' }); setFrameQ(''); }}>"{frameQ.trim()}" naam se likhein</button> (stock se nahi niklega)</p>}
                    {!frame.productId && frame.name && <Input label="Frame (stock ke bagair)" value={frame.name} onChange={(e) => setFrame({ ...frame, name: e.target.value })} />}
                  </>
                )}
                <Input label="Frame ki qeemat" inputMode="decimal" value={frame.price} onChange={(e) => setFrame({ ...frame, price: moneyInput(e.target.value) })} placeholder="0" hint="Customer ko jo batayi" />
              </div>
            ) : (
              <div className="space-y-3">
                <Input label="Frame" value={frame.name} onChange={(e) => setFrame({ ...frame, name: e.target.value })} placeholder={repair ? 'Jaise: kala metal frame, Ray-Ban' : 'Customer ka apna frame'} error={show('frame')} maxLength={160} />
                {repair && (
                  <div>
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kya theek karna hai</span>
                    <div className="flex flex-wrap gap-1.5">
                      {REPAIR_KINDS.map((k) => (
                        <button key={k} type="button" aria-pressed={repairKinds.includes(k)} onClick={() => setRepairKinds((v) => (v.includes(k) ? v.filter((x) => x !== k) : [...v, k]))}
                          className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1 ${repairKinds.includes(k) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{k}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {!repair && (
            <Card className="rounded-2xl" title={<T icon={FlaskConical}>Lens</T>}>
              <div className="space-y-3">
                <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Lens type</span><Chips options={LENS_TYPES} value={lensType} onChange={setLensType} /></div>
                <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Index (patla-mota)</span><Chips options={LENS_INDEX} value={lensIndex} onChange={setLensIndex} clearable /></div>
                <div>
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Coating</span>
                  <div className="flex flex-wrap gap-1.5">
                    {COATINGS.map((c) => (
                      <button key={c} type="button" aria-pressed={coatings.includes(c)} onClick={() => setCoatings((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))}
                        className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1 ${coatings.includes(c) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <Select label="Material" value={material} onChange={(e) => setMaterial(e.target.value)} options={[{ value: '', label: '—' }, ...LENS_MATERIAL.map((m) => ({ value: m, label: m }))]} hint="Marzi hai" />
              </div>
            </Card>
          )}

          <Card className="rounded-2xl" title={<T icon={CalendarClock}>{repair ? 'Kab tayyar' : 'Lab aur date'}</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              {!repair && <Input label="Lab" value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Abhi na pata ho to baad me" hint="Lab bhejte waqt bhi likh sakte hain" maxLength={120} />}
              <Input label="Customer ko kab dena hai" type="date" min={todayInput()} value={date} onChange={(e) => setDate(e.target.value)} hint="Is date ke baad order 'Late' dikhta hai" />
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Card className="rounded-2xl" title={<T icon={Wallet}>Hisaab</T>}>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={repair ? 'Repair charge' : 'Lens ki qeemat'} inputMode="decimal" value={lensPrice} onChange={(e) => setLensPrice(moneyInput(e.target.value))} placeholder="0" error={show('total')} />
                <Input label="Lab / karigar ka kharcha" inputMode="decimal" value={lensCost} onChange={(e) => setLensCost(moneyInput(e.target.value))} placeholder="0" hint={errors.lensCost ?? 'Profit sahi aane ke liye'} />
                {!repair && <Input label="Fitting charge" inputMode="decimal" value={fitting} onChange={(e) => setFitting(moneyInput(e.target.value))} placeholder="0" hint="Marzi hai" />}
              </div>
              <dl className="space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-[0.875rem]">
                {!repair && <div className="flex justify-between"><dt className="text-slate-600">Frame</dt><dd className="tabular-nums">{formatPKR(fp)}</dd></div>}
                <div className="flex justify-between"><dt className="text-slate-600">{repair ? 'Repair' : 'Lens'}</dt><dd className="tabular-nums">{formatPKR(lp)}</dd></div>
                {fit > 0 && <div className="flex justify-between"><dt className="text-slate-600">Fitting</dt><dd className="tabular-nums">{formatPKR(fit)}</dd></div>}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(total)}</dd></div>
              </dl>
              <Input label="Advance (abhi)" inputMode="decimal" value={advance} onChange={(e) => setAdvance(moneyInput(e.target.value))} placeholder="0" error={show('advance') ?? (adv > total + 0.01 ? errors.advance : undefined)}
                hint={total > 0 ? `Baqi dete waqt: ${formatPKR(Math.max(total - adv, 0))}` : undefined} />
              {total > 0 && <div className="flex flex-wrap gap-1.5">{[0.5, 1].map((f) => <button key={f} type="button" onClick={() => setAdvance(String(Math.round(total * f)))} className="h-8 rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium ring-1 ring-slate-200 hover:bg-slate-50">{f === 1 ? 'Poora' : 'Aadha'} ({formatPKR(Math.round(total * f))})</button>)}</div>}
              {adv > 0 && <PaymentMethodPicker value={method} onChange={setMethod} label="Advance kaise mila" />}
              <Textarea label="Note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jaise: customer Friday ko aayega" hint="Marzi hai" maxLength={1000} />
              <Button fullWidth size="lg" onClick={submit} loading={save.isPending} leftIcon={<Package className="h-4 w-4" />}>{adv > 0 ? `Order + ${formatPKR(adv)} advance` : 'Order save karein'}</Button>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
