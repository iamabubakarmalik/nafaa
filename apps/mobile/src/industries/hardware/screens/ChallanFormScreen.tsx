/**
 * New delivery challan (web DeliveryFormPage). From a bill, the lines show what
 * was sold, what earlier challans already carried and what is left, so one bill
 * can go out in parts. Without a bill (goods to be billed later) items come from
 * the catalog. A challan never moves stock or money.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Receipt, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { qty, slipUnit } from '@nafaa/core/industries/hardware';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, Card, DatePicker, EmptyState, FormSection, FormTemplate, IconButton, Input, ListRow, MoneyInput, Row, Select, Sheet, Skeleton, Text, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { ProductPicker } from '@/modules/inventory/components/ProductPicker';
import { salesHistoryApi } from '@/modules/sales/api/history';
import { dateToKey, errText, keyToDate, opt, todayKey, useDeskOnline } from '../../_shared/trade/desk';
import { deliveriesApi, projectsApi } from '../api';
import { KEYS, UNIT_LABEL, VEHICLES, refreshHardware } from '../meta';

interface Line { key: string; productId?: string; itemName: string; unit: string; unitPrice: number; max?: number; sold?: number; sent?: number; qty: number | null }

export function ChallanFormScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ sale?: string; project?: string }>();
  const [saleId, setSaleId] = useState(params.sale ?? '');
  const { guard } = useDeskOnline('hardwareDesk');
  const bill = useQuery({ queryKey: [KEYS.billLines, saleId], queryFn: () => deliveriesApi.billLines(saleId), enabled: !!saleId });
  const projects = useQuery({ queryKey: [KEYS.projects, 'active'], queryFn: () => projectsApi.list({ active: true }).catch(() => []), staleTime: 60_000 });
  const [lines, setLines] = useState<Line[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [projectId, setProjectId] = useState(params.project ?? '');
  const [siteContact, setSiteContact] = useState('');
  const [vehicleType, setVehicleType] = useState('PICKUP');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState<number | null>(null);
  const [labour, setLabour] = useState<number | null>(null);
  const [instructions, setInstructions] = useState('');
  const [pickBill, setPickBill] = useState(false);
  const [pickItem, setPickItem] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const mark = <T,>(set: (v: T) => void) => (v: T) => { setDirty(true); set(v); };

  const b = bill.data;
  useEffect(() => {
    if (!b) return;
    const c = b.sale.customer;
    setName(c?.name ?? t('Walk-in customer')); setPhone(c?.phone ?? ''); setAddress([c?.address, c?.area, c?.city].filter(Boolean).join(', '));
    setLines(b.lines.filter((l) => l.remaining > 0).map((l) => ({ key: l.productId, productId: l.productId, itemName: l.name, unit: l.unit, unitPrice: l.price, max: l.remaining, sold: l.sold, sent: l.sent, qty: l.remaining })));
  }, [b]);
  const project = projects.data?.find((p) => p.id === projectId);
  useEffect(() => {
    if (!project) return;
    if (!address) setAddress(project.siteAddress);
    if (!siteContact && project.siteContactPhone) setSiteContact(project.siteContactPhone);
    if (!saleId && !name) { setName(project.customerName); setPhone(project.customerPhone ?? ''); }
  }, [project]); // eslint-disable-line react-hooks/exhaustive-deps

  const sending = lines.filter((l) => (l.qty ?? 0) > 0);
  const phoneLoose = (v: string) => !v.trim() || /^[0-9+\-\s]{10,15}$/.test(v.trim());
  const lineErr = (l: Line) => ((l.qty ?? 0) < 0 ? t('Manfi nahi') : l.max != null && (l.qty ?? 0) > l.max + 1e-6 ? t('Sirf {{qty}} baqi hai', { qty: qty(l.max) }) : undefined);
  const problems = [
    !name.trim() && t('Customer ka naam likhein'), !address.trim() && t('Site ka pata likhein — driver isi par jayega'), !phoneLoose(phone) && t('Phone number theek likhein'), !phoneLoose(driverPhone) && t('Phone number theek likhein'),
    !sending.length && t('Kam se kam ek item ki quantity likhein'), lines.some((l) => lineErr(l)) && t('Quantity theek karein'), ((deliveryCharge ?? 0) < 0 || (labour ?? 0) < 0) && t('Kiraya manfi nahi ho sakta'),
  ].filter(Boolean) as string[];

  const submit = () => guard(async () => {
    setTouched(true);
    if (problems.length) { toast.error(problems[0]); return; }
    setSaving(true);
    try {
      const d = await deliveriesApi.create({
        saleId: saleId || undefined, projectId: projectId || undefined, customerId: b?.sale.customerId ?? undefined, customerName: name.trim(), customerPhone: opt(phone), deliveryAddress: address.trim(), siteContactPhone: opt(siteContact),
        vehicleType, vehicleNumber: opt(vehicleNumber), driverName: opt(driverName), driverPhone: opt(driverPhone), scheduledDate: date || undefined, scheduledTime: opt(time), deliveryCharge: deliveryCharge ?? 0, laborCharge: labour ?? 0,
        driverInstructions: opt(instructions), items: sending.map((l) => ({ productId: l.productId, itemName: l.itemName, orderedQty: l.qty, unit: slipUnit(l.unit), unitPrice: l.unitPrice })),
      });
      setDirty(false);
      refreshHardware([KEYS.deliveries, KEYS.billLines, KEYS.deliverySummary]);
      toast.success(t('Challan {{deliveryNumber}} ban gaya — print kar ke driver ko dein', { deliveryNumber: d.deliveryNumber }));
      router.replace(`/hardware/deliveries/${d.id}` as never);
    } catch (e) { toast.error(errText(e, t('Challan nahi bana'))); } finally { setSaving(false); }
  });
  const allSent = !!b && b.lines.length > 0 && b.lines.every((l) => l.remaining <= 0);
  const e = (v?: string) => (touched ? v : undefined);

  return (
    <FormTemplate title={t('Naya challan')} subtitle={b ? t('Bill {{saleNumber}} · {{challanCount}} challan pehle', { saleNumber: b.sale.saleNumber, challanCount: b.challanCount }) : t('Bill se ya bagair bill')} dirty={dirty} saving={saving} onSave={submit} saveDisabled={allSent}>
      <View style={{ gap: th.space(4) }}>
        <FormSection title={t('Bill')} description={t('Bill chunein — us ka baqi maal khud aa jata hai')}>
          <ListRow icon={Receipt} iconTone="brand" title={b ? `${b.sale.saleNumber} · ${b.sale.customer?.name ?? t('Walk-in')}` : t('Bill chunein (marzi)')} subtitle={b ? formatMoney(b.sale.total) : t('Bill ke bagair maal catalog se bhi ja sakta hai')} chevron onPress={() => setPickBill(true)} />
          {saleId ? <Button variant="ghost" size="sm" onPress={() => { setSaleId(''); setLines([]); }}>{t('Bill hatayein')}</Button> : null}
          {bill.isLoading && <Skeleton height={60} />}
          {allSent && <Text size="sm" tone="warning">{t('Is bill ka sab maal pehle challan par ja chuka hai.')}</Text>}
        </FormSection>
        <FormSection title={t('Maal')}>
          {lines.map((l) => (
            <Card key={l.key} style={{ gap: th.space(2) }}>
              <Row gap={2} style={{ alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text weight="semibold">{l.itemName}</Text>
                  {l.sold != null ? <Text size="xs" tone="muted">{t('Bika {{sold}} · pehle gaya {{sent}} · baqi {{left}}', { sold: qty(l.sold), sent: qty(l.sent), left: qty(l.max) })}</Text> : null}
                </View>
                {l.sold == null && <IconButton icon={Trash2} label={t('Line hatayein')} variant="danger" onPress={() => { setDirty(true); setLines((p) => p.filter((z) => z.key !== l.key)); }} />}
              </Row>
              <NumberInput label={`${t('Kitna jaye')} (${UNIT_LABEL(slipUnit(l.unit))})`} value={l.qty} onChangeValue={(v) => { setDirty(true); setLines((p) => p.map((z) => (z.key === l.key ? { ...z, qty: v } : z))); }} error={e(lineErr(l))} />
            </Card>
          ))}
          {!saleId && <Button variant="soft" icon={Plus} onPress={() => setPickItem(true)}>{t('Item chunein')}</Button>}
          {touched && !sending.length && <Text size="xs" tone="danger">{t('Kam se kam ek item ki quantity likhein')}</Text>}
        </FormSection>
        <FormSection title={t('Kahan')}>
          <Input label={t('Customer ka naam')} value={name} onChangeText={mark(setName)} error={e(!name.trim() ? t('Customer ka naam likhein') : undefined)} />
          <Input label={t('Phone')} value={phone} onChangeText={mark(setPhone)} keyboardType="phone-pad" ltr error={e(!phoneLoose(phone) ? t('Phone number theek likhein') : undefined)} />
          <Select label={t('Site / project')} value={projectId} onChange={mark(setProjectId)} placeholder={t('Koi site nahi')} options={[{ value: '', label: t('Koi site nahi') }, ...(projects.data ?? []).map((p) => ({ value: p.id, label: `${p.name} · ${p.customerName}` }))]} />
          <TextArea label={t('Site ka pata')} value={address} onChangeText={mark(setAddress)} error={e(!address.trim() ? t('Site ka pata likhein — driver isi par jayega') : undefined)} />
          <Input label={t('Site par rabta')} value={siteContact} onChangeText={mark(setSiteContact)} keyboardType="phone-pad" ltr hint={t('Munshi / mistri')} />
        </FormSection>
        <FormSection title={t('Gaari')}>
          <Select label={t('Gaari')} value={vehicleType} onChange={mark(setVehicleType)} options={VEHICLES.map((v) => ({ value: v.value, label: t(v.label) }))} />
          <Input label={t('Gaari number')} value={vehicleNumber} onChangeText={mark(setVehicleNumber)} autoCapitalize="characters" ltr />
          <Input label={t('Driver')} value={driverName} onChangeText={mark(setDriverName)} />
          <Input label={t('Driver phone')} value={driverPhone} onChangeText={mark(setDriverPhone)} keyboardType="phone-pad" ltr error={e(!phoneLoose(driverPhone) ? t('Phone number theek likhein') : undefined)} />
          <DatePicker label={t('Tareekh')} value={keyToDate(date)} minimumDate={new Date()} onChange={(d) => { setDirty(true); setDate(dateToKey(d)); }} />
          <Input label={t('Waqt')} value={time} onChangeText={mark(setTime)} placeholder="14:00" ltr />
          <MoneyInput label={t('Kiraya')} value={deliveryCharge} onChangeValue={mark(setDeliveryCharge)} hint={t('Bill par pehle lag chuka ho to 0')} />
          <MoneyInput label={t('Mazdoori')} value={labour} onChangeValue={mark(setLabour)} />
          <TextArea label={t('Driver ke liye hidayat')} value={instructions} onChangeText={mark(setInstructions)} placeholder={t('Gali tang hai, chhoti gaari bhejein')} />
        </FormSection>
      </View>
      <BillLookup open={pickBill} onClose={() => setPickBill(false)} onPick={(id) => { setDirty(true); setSaleId(id); setPickBill(false); }} />
      <ProductPicker open={pickItem} onClose={() => setPickItem(false)} includeRaw={false} variants={false} keepOpen title={t('Item chunein')} pickedIds={new Set(lines.map((l) => l.productId).filter((z): z is string => !!z))}
        onPick={(p) => { setDirty(true); setLines((prev) => (prev.some((l) => l.productId === p.product.id) ? prev : [...prev, { key: p.product.id, productId: p.product.id, itemName: p.product.name, unit: p.product.unit, unitPrice: p.product.price, qty: 1 }])); }} />
    </FormTemplate>
  );
}

function BillLookup({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const term = useDebouncedValue(q.trim(), 250);
  const res = useQuery({ queryKey: [KEYS.billLines, 'lookup', term], queryFn: () => salesHistoryApi.list({ from: 'all', to: todayKey(), status: 'active', search: term, sort: 'new' }, 1, 8), enabled: open && term.length >= 2 });
  useEffect(() => { if (open) setQ(''); }, [open]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Bill chunein')}>
      <View style={{ gap: 8 }}>
        <Input value={q} onChangeText={setQ} placeholder={t('Bill number, customer ya phone…')} autoFocus />
        {(res.data?.items ?? []).map((s, i, arr) => (
          <ListRow key={s.id} dense divider={i < arr.length - 1} title={`${s.saleNumber} · ${s.customer?.name ?? t('Walk-in')}`} subtitle={t('{{n}} items', { n: s.items.length })} trailing={<Text size="sm" weight="bold" ltr>{formatMoney(s.total)}</Text>} onPress={() => onPick(s.id)} chevron />
        ))}
        {term.length >= 2 && !res.isFetching && !(res.data?.items ?? []).length && <EmptyState title={t('Koi bill nahi mila')} />}
      </View>
    </Sheet>
  );
}
