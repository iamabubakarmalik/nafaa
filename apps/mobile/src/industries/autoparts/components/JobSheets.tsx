/**
 * Sheets of one job card (web AddPartModal, AddWorkModal, EditJobModal,
 * DeliverJobModal): a part from the shelf, bought outside or brought by the
 * customer; labour and outside work; the job's details; and handing the vehicle
 * back (take what is left, next service reminder, warranty, old part as trade-in).
 */

import { AlertTriangle, Car, Hammer, Package, Receipt, Recycle, Truck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { jobDue } from '@nafaa/core/industries/autoparts';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, ChipGroup, DatePicker, Input, MoneyInput, Row, Segmented, Select, Sheet, Switch, Text, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker, type PickedProduct } from '@/modules/inventory/components/ProductPicker';
import { dateToKey, keyToDate, shiftKey, todayKey } from '../../_shared/deskKit';
import { MethodChips } from '../../_shared/deskKit';
import type { DeliverInput, ExternalInput, JobPriority, JobType, JobUpdateInput, LaborInput, MechanicProfile, PartCondition, PartInput, WorkshopJob, WorkshopJobDetail } from '../api';
import { CONDITIONS, JOB_TYPES, PRIORITIES, conditionOf, jobTypeOf, km, opt, priorityOf } from '../meta';
import { partFitsVehicle, usePartFacts } from './PartFacts';

/* ───────────── part ───────────── */

type Source = 'shelf' | 'outside' | 'customer';

export function PartSheet({ vehicle, open, pending, onAdd, onClose }: {
  vehicle: { makeName?: string | null; modelName?: string | null; year?: number | null }; open: boolean; pending: boolean; onAdd: (p: PartInput) => void; onClose: () => void;
}) {
  const th = useTheme();
  const facts = usePartFacts();
  const [source, setSource] = useState<Source>('shelf');
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<PickedProduct | null>(null);
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [qty, setQty] = useState<number | null>(1);
  const [price, setPrice] = useState<number | null>(null);
  const [condition, setCondition] = useState<PartCondition>('NEW');
  const [warranty, setWarranty] = useState(0);
  useEffect(() => { if (open) { setSource('shelf'); setChosen(null); setName(''); setPartNumber(''); setQty(1); setPrice(null); setCondition('NEW'); setWarranty(0); } }, [open]);

  const quantity = qty ?? 0;
  const unit = price ?? 0;
  const short = source === 'shelf' && !!chosen && chosen.stock != null && quantity > chosen.stock;
  const valid = quantity > 0 && (source === 'shelf' ? !!chosen : name.trim().length > 1) && (source === 'customer' || unit >= 0);
  const car = [vehicle.makeName, vehicle.modelName, vehicle.year].filter(Boolean).join(' ');

  const choose = (p: PickedProduct) => {
    const f = facts.get(p.product.id);
    setChosen(p); setName(p.product.name); setPartNumber(f?.partNumber ?? ''); setPrice(p.product.price); setCondition(f?.condition ?? 'NEW'); setWarranty(f?.warrantyMonths ?? 0);
  };
  const submit = () => {
    if (!valid || pending) return;
    onAdd({
      productId: source === 'shelf' ? chosen!.product.id : undefined, variantId: source === 'shelf' ? chosen!.variantId ?? undefined : undefined,
      partName: (source === 'shelf' ? chosen!.product.name : name.trim()), partNumber: opt(partNumber), quantity, unitPrice: source === 'customer' ? 0 : unit,
      condition, isCustomerSupplied: source === 'customer', warrantyMonths: warranty || undefined,
    });
  };

  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Part jorein')} description={car ? t('Gaari: {{car}}', { car }) : undefined}
        footer={<Button fullWidth size="lg" icon={Package} disabled={!valid} loading={pending} onPress={submit}>{`${source === 'shelf' ? t('Stock se lagayein') : t('Jorein')}${quantity > 0 && unit > 0 && source !== 'customer' ? ` — ${formatMoney(quantity * unit)}` : ''}`}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Segmented value={source} onChange={setSource} options={[{ value: 'shelf', label: t('Dukaan ka stock') }, { value: 'outside', label: t('Bahar se liya') }, { value: 'customer', label: t('Customer ka apna') }]} />
          {source === 'shelf' ? (
            <>
              <Button variant="secondary" icon={Package} onPress={() => setPicking(true)}>{chosen ? t('Doosra part chunein') : t('Naam, part number ya gaari — jaise “brake pad”')}</Button>
              {chosen && (
                <Card>
                  <Row justify="between">
                    <View style={{ flex: 1 }}>
                      <Text weight="semibold">{chosen.product.name}</Text>
                      <Text size="xs" tone="muted">{[facts.get(chosen.product.id)?.partNumber, facts.get(chosen.product.id)?.brand].filter(Boolean).join(' · ') || '—'}</Text>
                      {partFitsVehicle(facts.get(chosen.product.id), vehicle) ? <Row gap={1}><Car size={14} color={th.colors.success.text} /><Text size="xs" tone="success">{t('Is gaari me lagta hai')}</Text></Row> : null}
                    </View>
                    <Text size="sm" tone={(chosen.stock ?? 0) > 0 ? 'success' : 'danger'} ltr>{(chosen.stock ?? 0) > 0 ? t('{{value}} stock', { value: Number(Number(chosen.stock).toFixed(2)) }) : t('khatam')}</Text>
                  </Row>
                </Card>
              )}
            </>
          ) : (
            <>
              <Input label={t('Part ka naam')} value={name} onChangeText={setName} placeholder={t('Clutch plate')} />
              <Input label={t('Part number')} value={partNumber} onChangeText={setPartNumber} placeholder={t('Marzi hai')} ltr />
            </>
          )}
          <NumberInput label={t('Kitne')} value={qty} onChangeValue={setQty} error={quantity <= 0 ? t('Kam se kam 1') : undefined} />
          {source !== 'customer' && <MoneyInput label={t('Qeemat (ek ki)')} value={price} onChangeValue={setPrice} hint={source === 'outside' ? t('Customer se kitna lena hai') : undefined} />}
          <Select label={t('Warranty')} value={String(warranty)} onChange={(v) => setWarranty(Number(v))} options={[0, 1, 3, 6, 12].map((m) => ({ value: String(m), label: m ? t('{{m}} mahine', { m }) : t('Koi nahi') }))} />
          {source !== 'shelf' && <ChipGroup wrap value={condition} onChange={(v) => setCondition(v as PartCondition)} options={CONDITIONS.map((c) => ({ value: c, label: t(conditionOf(c).label) }))} />}
          {short && <Card tone="warning"><Row gap={2}><AlertTriangle size={16} color={th.colors.warning.text} /><Text size="sm" style={{ flex: 1 }}>{t('Stock me sirf {{value}} hai — pehle purchase karein ya “Bahar se liya” chunein.', { value: Number(Number(chosen!.stock).toFixed(2)) })}</Text></Row></Card>}
          {source === 'outside' ? <Text size="xs" tone="muted">{t('Bahar se liye part ki apni cost bill me nahi judti — purchase ya expense me likhein.')}</Text> : null}
        </View>
      </Sheet>
      <ProductPicker open={open && picking} onClose={() => setPicking(false)} title={t('Part chunein')} includeRaw={false} variants onPick={(p) => { choose(p); setPicking(false); }} />
    </>
  );
}

/* ───────────── labour and outside work ───────────── */

const LABOUR = ['Oil change', 'Tuning', 'Brake service', 'Clutch ka kaam', 'Suspension', 'AC gas', 'Wiring', 'Engine ka kaam', 'Alignment', 'Washing'];
const OUTSIDE = ['Painter', 'Denter', 'Machine shop', 'Rewinding', 'Radiator wala', 'Glass wala'];

export function WorkSheet({ kind, open, mechanics, defaultMechanicId, pending, onLabour, onOutside, onClose }: {
  kind: 'labour' | 'outside'; open: boolean; mechanics: MechanicProfile[]; defaultMechanicId?: string | null; pending: boolean;
  onLabour: (v: LaborInput) => void; onOutside: (v: ExternalInput) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [tab, setTab] = useState(kind);
  const [desc, setDesc] = useState('');
  const [byHour, setByHour] = useState(false);
  const [hours, setHours] = useState<number | null>(1);
  const [amount, setAmount] = useState<number | null>(null);
  const [mechanicId, setMechanicId] = useState(defaultMechanicId ?? '');
  const [vendor, setVendor] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [cost, setCost] = useState<number | null>(null);
  const [markup, setMarkup] = useState<number | null>(null);
  useEffect(() => { if (open) { setTab(kind); setDesc(''); setByHour(false); setHours(1); setAmount(null); setMechanicId(defaultMechanicId ?? ''); setVendor(''); setVendorPhone(''); setCost(null); setMarkup(null); } }, [open, kind, defaultMechanicId]);

  const h = byHour ? hours ?? 0 : 1;
  const rate = amount ?? 0;
  const labourTotal = h * rate;
  const outsideTotal = (cost ?? 0) + (markup ?? 0);
  const valid = desc.trim().length > 1 && (tab === 'labour' ? h > 0 && rate >= 0 : (cost ?? 0) >= 0);
  const submit = () => {
    if (!valid || pending) return;
    if (tab === 'labour') onLabour({ description: desc.trim(), hours: h, ratePerHour: rate, mechanicId: mechanicId || undefined });
    else onOutside({ description: desc.trim(), vendorName: opt(vendor), vendorPhone: opt(vendorPhone), cost: cost ?? 0, markup: markup ?? 0 });
  };
  return (
    <Sheet open={open} onClose={onClose} title={tab === 'labour' ? t('Mazdoori jorein') : t('Bahar ka kaam jorein')}
      footer={<Button fullWidth size="lg" disabled={!valid} loading={pending} onPress={submit}>{t('Jorein — {{formatPKR}}', { formatPKR: formatMoney(tab === 'labour' ? labourTotal : outsideTotal) })}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Segmented value={tab} onChange={(v) => { setTab(v); setDesc(''); }} options={[{ value: 'labour', label: t('Workshop ka kaam'), icon: Hammer }, { value: 'outside', label: t('Bahar bheja'), icon: Truck }]} />
        <Input label={t('Kya kaam')} value={desc} onChangeText={setDesc} placeholder={tab === 'labour' ? t('Brake service') : t('Bumper paint')} />
        <ChipGroup wrap value="" onChange={(x) => setDesc(tab === 'labour' ? x : `${x}: `)} options={(tab === 'labour' ? LABOUR : OUTSIDE).map((x) => ({ value: x, label: x }))} />
        {tab === 'labour' ? (
          <>
            {byHour && <NumberInput label={t('Ghante')} value={hours} onChangeValue={setHours} />}
            <MoneyInput label={byHour ? t('Rate (ek ghante ka)') : t('Mazdoori (Rs)')} value={amount} onChangeValue={setAmount} />
            <Button variant="link" size="sm" onPress={() => setByHour(!byHour)}>{byHour ? t('Seedhi amount likhein') : t('Ghante ke hisaab se')}</Button>
            <Select label={t('Mechanic')} value={mechanicId} onChange={setMechanicId} placeholder={t('Koi nahi')} hint={t('Mazdoori isi ke kaam me ginti hoti hai (commission ke liye)')}
              options={[{ value: '', label: t('Koi nahi') }, ...mechanics.map((m) => ({ value: m.id, label: m.staff?.fullName ?? t('Mechanic') }))]} />
          </>
        ) : (
          <>
            <Input label={t('Kis ke paas')} value={vendor} onChangeText={setVendor} placeholder={t('Akram painter')} />
            <Input label={t('Us ka phone')} keyboardType="phone-pad" ltr value={vendorPhone} onChangeText={setVendorPhone} placeholder={t('Marzi hai')} />
            <MoneyInput label={t('Us ko kitna dena hai')} value={cost} onChangeValue={setCost} hint={t('Ye aap ki cost hai')} />
            <MoneyInput label={t('Upar se apna')} value={markup} onChangeValue={setMarkup} hint={t('Customer se cost + ye lena hai')} />
            <Text size="xs" tone="muted">{t('Bahar wale ko jab paisa dein to Expense me “Bahar ka kaam” likhein — galla aur profit dono theek rehte hain.')}</Text>
          </>
        )}
      </View>
    </Sheet>
  );
}

/* ───────────── edit ───────────── */

export function EditJobSheet({ job, open, mechanics, pending, onSave, onClose }: { job: WorkshopJob; open: boolean; mechanics: MechanicProfile[]; pending: boolean; onSave: (v: JobUpdateInput) => void; onClose: () => void }) {
  const th = useTheme();
  const init = () => ({
    complaint: job.customerComplaint ?? '', diagnosis: job.diagnosis ?? '', recommendations: job.recommendations ?? '', mechanicId: job.primaryMechanicId ?? '',
    promisedDay: job.promisedAt ? job.promisedAt.slice(0, 10) : '', odometer: job.odometerKm ?? null, priority: job.priority as JobPriority, jobType: job.jobType as JobType,
    discount: job.discount || null, name: job.customerName ?? '', phone: job.customerPhone ?? '', notes: job.internalNotes ?? '',
  });
  const [f, setF] = useState(init);
  useEffect(() => { if (open) setF(init()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<ReturnType<typeof init>>) => setF((x) => ({ ...x, ...p }));
  const gross = Number(job.subtotal) + Number(job.taxAmount || 0);
  const disc = f.discount ?? 0;
  const phoneBad = !!f.phone && f.phone.replace(/\D/g, '').length < 10;
  const problem = disc > gross ? t('Discount bill ({{formatPKR}}) se zyada nahi ho sakta', { formatPKR: formatMoney(gross) }) : phoneBad ? t('Phone number poora likhein') : '';
  const submit = () => {
    if (problem || pending) return;
    // A promised day keeps its original time when the day did not change.
    const promisedAt = f.promisedDay ? (job.promisedAt && job.promisedAt.slice(0, 10) === f.promisedDay ? job.promisedAt : new Date(`${f.promisedDay}T18:00:00`).toISOString()) : '';
    onSave({
      customerComplaint: f.complaint, diagnosis: f.diagnosis, recommendations: f.recommendations, primaryMechanicId: f.mechanicId, promisedAt, odometerKm: f.odometer ?? undefined,
      priority: f.priority, jobType: f.jobType, discount: disc, customerName: f.name, customerPhone: f.phone, internalNotes: f.notes,
    });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Job badlein — {{jobNumber}}', { jobNumber: job.jobNumber })} height={0.92}
      footer={<Button fullWidth size="lg" disabled={!!problem} loading={pending} onPress={submit}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Shikayat')} value={f.complaint} onChangeText={(v) => set({ complaint: v })} multiline />
        <Input label={t('Check me kya nikla')} value={f.diagnosis} onChangeText={(v) => set({ diagnosis: v })} placeholder={t('Mechanic ne kya dekha')} multiline />
        <Input label={t('Customer ke liye mashwara')} value={f.recommendations} onChangeText={(v) => set({ recommendations: v })} placeholder={t('Agli dafa tyre badal lein…')} hint={t('Parchi par nahi, WhatsApp me bata sakte hain')} multiline />
        <Select label={t('Mechanic')} value={f.mechanicId} onChange={(v) => set({ mechanicId: v })} placeholder={t('Koi nahi')} options={[{ value: '', label: t('Koi nahi') }, ...mechanics.map((m) => ({ value: m.id, label: m.staff?.fullName ?? t('Mechanic') }))]} />
        <Select label={t('Kaam')} value={f.jobType} searchable onChange={(v) => set({ jobType: v as JobType })} options={JOB_TYPES.map((x) => ({ value: x, label: jobTypeOf(x) }))} />
        <Select label={t('Jaldi')} value={f.priority} onChange={(v) => set({ priority: v as JobPriority })} options={PRIORITIES.map((p) => ({ value: p, label: t(priorityOf(p).label) }))} />
        <DatePicker label={t('Gaari kab deni hai')} value={keyToDate(f.promisedDay)} onChange={(x) => set({ promisedDay: dateToKey(x) })} />
        <NumberInput label={t('Meter (km)')} integer value={f.odometer} onChangeValue={(v) => set({ odometer: v })} />
        <MoneyInput label={t('Discount (Rs)')} value={f.discount} onChangeValue={(v) => set({ discount: v })} error={disc > gross ? t('Bill se zyada') : undefined} hint={t('Bill {{gross}}', { gross: formatMoney(gross) })} />
        <Input label={t('Customer ka naam')} value={f.name} onChangeText={(v) => set({ name: v })} />
        <Input label={t('Phone')} keyboardType="phone-pad" ltr value={f.phone} onChangeText={(v) => set({ phone: v })} error={phoneBad ? t('Poora likhein') : undefined} />
        <Input label={t('Andar ka note')} value={f.notes} onChangeText={(v) => set({ notes: v })} hint={t('Sirf staff ke liye')} />
      </View>
    </Sheet>
  );
}

/* ───────────── hand the vehicle back ───────────── */

const NEXT_KM = [1000, 3000, 5000, 10000];
const WARRANTY = [0, 1, 3, 6];

export function DeliverSheet({ job, open, pending, onConfirm, onClose }: {
  job: (WorkshopJob & Pick<Partial<WorkshopJobDetail>, 'coreReturns'>) | null; open: boolean; pending: boolean; onConfirm: (v: DeliverInput) => void; onClose: () => void;
}) {
  const th = useTheme();
  const total = Number(job?.total) || 0;
  const paid = Number(job?.paidAmount) || 0;
  const balance = Math.max(total - paid, 0);
  const heldCores = (job?.coreReturns ?? []).filter((c) => c.status === 'HELD' && !c.saleId);
  const held = heldCores.reduce((s, c) => s + Number(c.value || 0), 0);
  const [coreOn, setCoreOn] = useState(false);
  const [coreName, setCoreName] = useState('');
  const [coreValue, setCoreValue] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [nextKm, setNextKm] = useState<number | null>(null);
  const [nextDay, setNextDay] = useState('');
  const [warranty, setWarranty] = useState(0);
  useEffect(() => {
    if (!open || !job) return;
    const oil = job.jobType === 'OIL_CHANGE';
    setCoreOn(false); setCoreName(''); setCoreValue(null); setMethod('CASH'); setWarranty(job.warrantyMonths || 0);
    setAmount(balance - held > 0 ? balance - held : null);
    setNextKm(oil && job.odometerKm ? job.odometerKm + 3000 : null);
    setNextDay(oil ? shiftKey(todayKey(), 90) : '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!job) return null;
  const newCore = coreOn ? coreValue ?? 0 : 0;
  const coreTotal = held + newCore;
  const entered = amount ?? 0;
  const left = Math.max(balance - coreTotal - entered, 0);
  const tooMuch = entered + coreTotal > balance + 0.01;
  const coreBad = coreOn && (!coreName.trim() || !(newCore > 0));
  const noName = left > 0 && !job.customerId && !job.customerName?.trim() && !job.customerPhone?.trim();
  const kmLow = !!nextKm && !!job.odometerKm && nextKm <= job.odometerKm;
  const submit = () => {
    if (tooMuch || noName || kmLow || coreBad || pending) return;
    onConfirm({
      amount: entered, paymentMethod: method as DeliverInput['paymentMethod'], warrantyMonths: warranty || undefined,
      ...(coreOn && { coreReturn: { description: coreName.trim(), value: newCore } }),
      nextServiceKm: nextKm || undefined, nextServiceDate: nextDay ? new Date(`${nextDay}T09:00:00`).toISOString() : undefined,
    });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Gaari wapas dein — {{jobNumber}}', { jobNumber: job.jobNumber })} height={0.92}
      description={[job.registrationNumber, job.makeName, job.modelName, job.customerName].filter(Boolean).join(' · ')}
      footer={<Button fullWidth size="lg" variant="success" icon={Receipt} disabled={tooMuch || noName || kmLow || coreBad} loading={pending} onPress={submit}>
        {total <= 0 ? t('Gaari de di') : left > 0 ? t('De dein — {{left}} khata me', { left: formatMoney(left) }) : t('Paisa le kar gaari dein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Card tone="default">
          <Row justify="between"><Text size="sm" tone="muted">{t('Kul bill')}</Text><Text weight="semibold" ltr>{formatMoney(total)}</Text></Row>
          <Row justify="between"><Text size="sm" tone="muted">{t('Pehle mila (advance)')}</Text><Text size="sm" ltr>{formatMoney(paid)}</Text></Row>
          {coreTotal > 0 ? <Row justify="between"><Text size="sm" tone="muted">{t('Purana part (trade-in)')}</Text><Text size="sm" ltr>− {formatMoney(coreTotal)}</Text></Row> : null}
          <Row justify="between"><Text weight="medium">{t('Baqi')}</Text><Text size="lg" weight="bold" ltr>{formatMoney(balance)}</Text></Row>
        </Card>
        {total <= 0 ? <Text size="sm" tone="secondary">{t('Is kaam ka koi bill nahi (warranty ya muft) — sirf gaari wapas hogi.')}</Text> : balance > 0 && (
          <>
            <Switch value={coreOn} onChange={setCoreOn} label={t('Customer ne purana part diya')}
              description={heldCores.length ? t('Pehle se liya: {{value}} ({{held}}) — bill se kat jayega', { value: heldCores.map((c) => c.description).join(', '), held: formatMoney(held) }) : t('Purani battery, dynamo, brake shoe — qeemat bill se kat jati hai')} />
            {coreOn && (
              <>
                <Input label={t('Kaunsa part')} value={coreName} onChangeText={setCoreName} placeholder={t('Purani battery 12V')} />
                <MoneyInput label={t('Qeemat')} value={coreValue} onChangeValue={setCoreValue} />
              </>
            )}
            <MoneyInput label={t('Abhi kitna liya')} value={amount} onChangeValue={setAmount} size="xl" error={tooMuch ? t('Baqi sirf {{formatPKR}} hai', { formatPKR: formatMoney(Math.max(balance - coreTotal, 0)) }) : undefined} />
            <MethodChips value={method} onChange={setMethod} />
            {left > 0 && (
              <Card tone={noName ? 'danger' : 'warning'}><Row gap={2}><AlertTriangle size={16} color={noName ? th.colors.danger.text : th.colors.warning.text} />
                <Text size="sm" style={{ flex: 1 }}>{noName ? t('Udhaar ke liye pehle job me customer ka naam ya phone likhein.') : t('{{left}} {{value}} ke khata me udhaar likha jayega.', { left: formatMoney(left), value: job.customerName ?? 'customer' })}</Text></Row></Card>
            )}
          </>
        )}
        <Text size="sm" weight="semibold">{t('Agli service ki yaad-dihani')}</Text>
        <NumberInput label={t('Kitne km par')} integer value={nextKm} onChangeValue={setNextKm} placeholder={job.odometerKm ? String(job.odometerKm + 3000) : '85000'} hint={job.odometerKm ? t('Abhi {{odometerKm}}', { odometerKm: km(job.odometerKm) }) : undefined} error={kmLow ? t('Abhi ke meter se zyada likhein') : undefined} />
        {job.odometerKm ? <ChipGroup wrap value="" onChange={(d) => setNextKm((job.odometerKm ?? 0) + Number(d))} options={NEXT_KM.map((d) => ({ value: String(d), label: `+${d.toLocaleString('en-PK')}` }))} /> : null}
        <DatePicker label={t('Ya is date par')} value={keyToDate(nextDay)} onChange={(x) => setNextDay(dateToKey(x))} hint={t('Khali chhorein to reminder nahi banega')} />
        <Text size="sm" weight="semibold">{t('Kaam ki warranty')}</Text>
        <ChipGroup value={String(warranty)} onChange={(m) => setWarranty(Number(m))} options={WARRANTY.map((m) => ({ value: String(m), label: m === 0 ? t('Koi nahi') : t('{{m}} mahina', { m }) }))} />
      </View>
    </Sheet>
  );
}
