/**
 * Take a prescription in (web NewPrescriptionPage): the patient (from the
 * customer list or typed), the doctor (directory or typed), medicines with dose
 * and quantity, and an optional diagnosis and refill. Medicines picked from
 * stock carry their rate and formula; two salts that clash show a warning.
 * Needs the server (the prescription is a server record).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { AlertTriangle, Pill, Plus, Search, Trash2, UserRound } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { cnicOk, drName, formatCnic, saltKey, suggestQty } from '@nafaa/core/industries/pharmacy';
import { apiErrorMessage } from '@/core/api/errors';
import { businessDayKey, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { onlineNeededText, useCustomerSearch, useProductSearch } from '@/core/offline';
import { useOnlineStatus } from '@/core/net';
import { Amount, Button, Card, Chip, ChipGroup, DatePicker, FormSection, FormTemplate, IconButton, Input, ListRow, Row, SearchBar, Select, Sheet, Switch, Text, TextArea, toast, useDebouncedValue, useTheme } from '@/design';
import { useAuthStore } from '@/core/auth/store';
import { shopParam } from '@/core/auth/shopScope';
import { NumberInput } from '@/modules/inventory/components/fields';
import { doctorsApi, interactionsApi, prescriptionsApi, type PrescriptionType, type RefillFrequency } from '../api';
import { useMedicineFacts } from '../facts';
import { DASH_KEY, DOCTORS_KEY, DURATIONS, FREQS, INSTRUCTIONS, REFILLS, RX_KEY, RX_TYPES } from '../meta';

interface Line { key: number; productId: string; medicineName: string; strength: string; dose: string; frequency: string; duration: string; qty: number | null; unit: string; instructions: string; price: number }

let seq = 1;
const newLine = (): Line => ({ key: seq++, productId: '', medicineName: '', strength: '', dose: '', frequency: '', duration: '', qty: null, unit: 'tablet', instructions: '', price: 0 });
const opt = (v: string) => v.trim() || undefined;

function MedicineSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: { id: string; name: string; unit: string; price: number }) => void }) {
  const [q, setQ] = useState('');
  const needle = useDebouncedValue(q.trim(), 200);
  const facts = useMedicineFacts();
  const products = useProductSearch({ query: needle, limit: 30 }, { enabled: open && needle.length >= 2 });
  const list = needle.length >= 2 ? products.data ?? [] : [];
  return (
    <Sheet open={open} onClose={onClose} title={t('Dawai chunein')} height={0.85}>
      <View style={{ gap: 8 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder={t('Dawai ya formula likhein…')} />
        {needle.length < 2 ? <Text size="sm" tone="muted">{t('Kam az kam 2 harf likhein')}</Text>
          : list.length === 0 ? <Text size="sm" tone="muted">{t('Stock me nahi mili — naam haath se likh dein')}</Text>
            : <Card flush>{list.map((p, i) => (
              <ListRow key={p.id} divider={i < list.length - 1} icon={Pill} title={p.name} subtitle={facts.get(p.id)?.generic || p.categoryName || undefined}
                trailing={<View style={{ alignItems: 'flex-end' }}><Amount value={p.price} weight="bold" /><Text size="2xs" tone={(p.stock ?? 0) > 0 ? 'success' : 'danger'} ltr>{`${Number((p.stock ?? 0).toFixed(2))} ${p.unit}`}</Text></View>}
                onPress={() => { setQ(''); onPick({ id: p.id, name: p.name, unit: p.unit, price: p.price }); }} />
            ))}</Card>}
      </View>
    </Sheet>
  );
}

export function PrescriptionFormScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useOnlineStatus();
  const shopId = shopParam(useAuthStore((s) => s.currentShopId));
  const facts = useMedicineFacts();
  const lock = useRef(false);
  const [f, setF] = useState({
    type: 'WALK_IN' as PrescriptionType, customerId: '', patientName: '', patientAge: '', patientGender: '', patientPhone: '', patientCnic: '',
    doctorId: '', doctorName: '', doctorRegNumber: '', doctorSpeciality: '', hospitalName: '', prescriptionDate: new Date(),
    diagnosis: '', notes: '', isRefillable: false, refillsAllowed: 2, refillFrequency: 'MONTHLY' as RefillFrequency,
  });
  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [pickFor, setPickFor] = useState<number | null>(null);
  const [custQ, setCustQ] = useState('');
  const [tried, setTried] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const setLine = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const { data: doctors = [] } = useQuery({ queryKey: [DOCTORS_KEY, 'active'], queryFn: () => doctorsApi.list({ isActive: true }), staleTime: 5 * 60_000 });
  const cq = useDebouncedValue(custQ.trim(), 200);
  const customers = useCustomerSearch({ query: cq, limit: 6 } as never);
  const custList = cq.length >= 2 ? customers.data ?? [] : [];

  const saltIds = useMemo(() => [...new Set(lines.flatMap((l) => facts.get(l.productId)?.saltIds ?? []))].sort(), [lines, facts]);
  const clash = useQuery({ queryKey: ['pharmacy-interactions', saltKey(saltIds)], queryFn: () => interactionsApi.check(saltIds), enabled: saltIds.length >= 2, staleTime: 5 * 60_000 });

  const qtyOf = (l: Line) => l.qty ?? (Number(suggestQty(l.frequency, l.duration)) || 0);
  const used = lines.filter((l) => l.medicineName.trim() || l.qty);
  const problems: string[] = [];
  if (!f.patientName.trim() && !f.customerId) problems.push(t('Mareez ka naam likhein'));
  if (!cnicOk(f.patientCnic)) problems.push(t('CNIC 13 hindsay ka hota hai'));
  if (f.patientAge && !(Number(f.patientAge) >= 0 && Number(f.patientAge) <= 130)) problems.push(t('Umar theek nahi'));
  if (!used.length) problems.push(t('Kam az kam ek dawai likhein'));
  used.forEach((l, i) => {
    if (!l.medicineName.trim()) problems.push(t('Line {{value}}: dawai ka naam likhein', { value: i + 1 }));
    else if (!(qtyOf(l) > 0)) problems.push(t('{{medicineName}}: kitni deni hai likhein', { medicineName: l.medicineName }));
  });
  if (f.isRefillable && !(f.refillsAllowed > 0)) problems.push(t('Kitni dafa refill likhein'));
  const total = used.reduce((s, l) => s + l.price * qtyOf(l), 0);

  const save = useMutation({
    mutationFn: () => prescriptionsApi.create({
      type: f.type, shopId: shopId || undefined, customerId: f.customerId || undefined, doctorId: f.doctorId || undefined,
      patientName: opt(f.patientName), patientAge: f.patientAge ? Number(f.patientAge) : undefined, patientGender: opt(f.patientGender),
      patientPhone: opt(f.patientPhone), patientCnic: opt(f.patientCnic),
      doctorName: opt(f.doctorName), doctorRegNumber: opt(f.doctorRegNumber), doctorSpeciality: opt(f.doctorSpeciality), hospitalName: opt(f.hospitalName),
      prescriptionDate: businessDayKey(f.prescriptionDate), diagnosis: opt(f.diagnosis), notes: opt(f.notes), imageUrls: [],
      isRefillable: f.isRefillable, refillsAllowed: f.isRefillable ? f.refillsAllowed : 0, refillFrequency: f.isRefillable ? f.refillFrequency : undefined,
      items: used.map((l) => ({
        productId: l.productId || undefined, medicineName: l.medicineName.trim(), strength: opt(l.strength), dose: opt(l.dose),
        frequency: opt(l.frequency), duration: opt(l.duration), instructions: opt(l.instructions), prescribedQty: qtyOf(l), unit: l.unit,
      })),
    }),
    onSuccess: (rx) => {
      toast.success(t('Nuskha {{prescriptionNumber}} ban gaya', { prescriptionNumber: rx.prescriptionNumber }));
      void qc.invalidateQueries({ queryKey: [RX_KEY] });
      void qc.invalidateQueries({ queryKey: [DASH_KEY] });
      router.replace(`/pharmacy/prescriptions/${rx.id}` as never);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nuskha nahi bana'))),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    if (!online) { toast.warning(onlineNeededText('pharmacyDesk')); return; }
    if (problems.length) { toast.error(problems[0]); return; }
    if (lock.current) return;
    lock.current = true;
    save.mutate();
  };

  return (
    <FormTemplate title={t('Naya nuskha')} dirty={!!(f.patientName || used.length)} saving={save.isPending} onSave={submit} saveLabel={t('Nuskha save karein')}>
      <FormSection title={t('Nuskha kahan se aaya')}>
        <ChipGroup value={f.type} onChange={(v) => set('type', v as PrescriptionType)} options={RX_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))} />
      </FormSection>

      <FormSection title={t('Mareez')} description={t('Purana customer ho to dhoond kar chunein — naam, phone aur CNIC khud aa jate hain aur udhaar usi ke khate me jata hai.')}>
        {f.customerId ? (
          <Card><Row justify="between"><Row gap={2}><UserRound size={18} color={th.colors.brand.solid} /><Text weight="semibold">{f.patientName}</Text></Row>
            <Button size="sm" variant="ghost" onPress={() => setF((x) => ({ ...x, customerId: '' }))}>{t('Badlein')}</Button></Row></Card>
        ) : (
          <>
            <SearchBar value={custQ} onChangeText={setCustQ} placeholder={t('Customer dhoondein (naam ya phone)')} />
            {custList.length > 0 && <Card flush>{custList.map((c, i) => (
              <ListRow key={c.id} dense divider={i < custList.length - 1} icon={UserRound} title={c.name} subtitle={c.phone ?? undefined}
                onPress={() => { setF((x) => ({ ...x, customerId: c.id, patientName: x.patientName || c.name, patientPhone: x.patientPhone || (c.phone ?? ''), patientCnic: x.patientCnic || (c.cnic ?? '') })); setCustQ(''); }} />
            ))}</Card>}
          </>
        )}
        <Input label={t('Mareez ka naam')} value={f.patientName} onChangeText={(v) => set('patientName', v)} error={tried && !f.patientName.trim() && !f.customerId ? t('Mareez ka naam likhein') : undefined} />
        <Row gap={2}>
          <View style={{ flex: 1 }}><Input label={t('Umar')} value={f.patientAge} onChangeText={(v) => set('patientAge', v.replace(/\D/g, ''))} keyboardType="number-pad" ltr /></View>
          <View style={{ flex: 2 }}><Text size="sm" weight="medium">{t('Jins')}</Text>
            <ChipGroup value={f.patientGender} onChange={(v) => set('patientGender', v)} options={[{ value: 'MALE', label: t('Mard') }, { value: 'FEMALE', label: t('Aurat') }, { value: 'OTHER', label: t('Aur') }]} /></View>
        </Row>
        <Input label={t('Phone')} value={f.patientPhone} onChangeText={(v) => set('patientPhone', v)} keyboardType="phone-pad" ltr />
        <Input label={t('CNIC')} value={f.patientCnic} onChangeText={(v) => set('patientCnic', formatCnic(v))} keyboardType="number-pad" ltr error={tried && !cnicOk(f.patientCnic) ? t('CNIC 13 hindsay ka hota hai') : undefined} />
      </FormSection>

      <FormSection title={t('Doctor')} description={t('Directory se chunein ya naam aur PMDC likh dein. Narcotic dawai ke liye PMDC zaroor likhein.')}>
        {doctors.length > 0 && (
          <Select label={t('Directory se')} value={f.doctorId} placeholder={t('Doctor chunein')}
            options={doctors.map((d) => ({ value: d.id, label: drName(d.name), description: d.specialization ?? d.registrationNumber }))}
            onChange={(id) => { const d = doctors.find((x) => x.id === id); setF((x) => ({ ...x, doctorId: id, ...(d && { doctorName: d.name, doctorRegNumber: d.registrationNumber, doctorSpeciality: d.specialization ?? '', hospitalName: d.clinicName ?? d.hospitalAffiliation ?? '' }) })); }} />
        )}
        <Input label={t('Doctor ka naam')} value={f.doctorName} onChangeText={(v) => setF((x) => ({ ...x, doctorName: v, doctorId: '' }))} />
        <Input label={t('PMDC number')} value={f.doctorRegNumber} onChangeText={(v) => set('doctorRegNumber', v)} placeholder="12345-P" ltr />
        <Input label={t('Hospital / clinic')} value={f.hospitalName} onChangeText={(v) => set('hospitalName', v)} />
        <DatePicker label={t('Nuskhe ki tareekh')} value={f.prescriptionDate} onChange={(d) => set('prescriptionDate', d)} maximumDate={new Date()} />
        <Input label={t('Bimari')} value={f.diagnosis} onChangeText={(v) => set('diagnosis', v)} />
      </FormSection>

      <FormSection title={t('Dawaiyan')}>
        {clash.data?.hasWarnings ? (
          <Card tone={clash.data.hasMajor ? 'danger' : 'warning'}>
            {clash.data.interactions.slice(0, 3).map((x) => (
              <Row key={x.id} gap={2}><AlertTriangle size={16} color={th.colors.danger.text} /><Text size="sm" style={{ flex: 1 }}>{`${x.saltA?.name ?? ''} + ${x.saltB?.name ?? ''}: ${x.description}`}</Text></Row>
            ))}
          </Card>
        ) : null}
        {lines.map((l, i) => (
          <Card key={l.key}>
            <Row justify="between" gap={2}>
              <Text weight="semibold" style={{ flex: 1 }} numberOfLines={1}>{l.medicineName || t('Dawai {{value}}', { value: i + 1 })}</Text>
              <IconButton icon={Search} label={t('Stock se chunein')} onPress={() => setPickFor(l.key)} />
              {lines.length > 1 && <IconButton icon={Trash2} label={t('Hatayein')} variant="danger" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />}
            </Row>
            <Input label={t('Dawai ka naam')} value={l.medicineName} onChangeText={(v) => setLine(l.key, { medicineName: v })} />
            <Input label={t('Strength / formula')} value={l.strength} onChangeText={(v) => setLine(l.key, { strength: v })} ltr />
            <Text size="sm" weight="medium">{t('Roz kitni dafa')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{FREQS.map((v) => <Chip key={v} label={v} selected={l.frequency === v} onPress={() => setLine(l.key, { frequency: l.frequency === v ? '' : v })} />)}</View>
            <Text size="sm" weight="medium">{t('Kitne din')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{DURATIONS.map((v) => <Chip key={v} label={v} selected={l.duration === v} onPress={() => setLine(l.key, { duration: l.duration === v ? '' : v })} />)}</View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{INSTRUCTIONS.map((v) => <Chip key={v} label={t(v)} selected={l.instructions === v} onPress={() => setLine(l.key, { instructions: l.instructions === v ? '' : v })} />)}</View>
            <NumberInput label={t('Kitni deni hai')} value={l.qty ?? (suggestQty(l.frequency, l.duration) ? Number(suggestQty(l.frequency, l.duration)) : null)} onChangeValue={(v) => setLine(l.key, { qty: v })}
              hint={l.price ? `${formatMoney(l.price)} × ${qtyOf(l)} = ${formatMoney(l.price * qtyOf(l))}` : undefined} />
          </Card>
        ))}
        <Button variant="secondary" icon={Plus} onPress={() => setLines((ls) => [...ls, newLine()])}>{t('Aur dawai')}</Button>
        {total > 0 && <Row justify="between"><Text weight="semibold">{t('Andazan kul')}</Text><Amount value={total} weight="bold" /></Row>}
      </FormSection>

      <FormSection title={t('Refill')}>
        <Switch value={f.isRefillable} onChange={(v) => set('isRefillable', v)} label={t('Refill wala nuskha')} description={t('Har mahine wali dawai (sugar, BP) ke liye refill chalu karein')} />
        {f.isRefillable && (
          <>
            <NumberInput label={t('Kitni dafa')} integer value={f.refillsAllowed} onChangeValue={(v) => set('refillsAllowed', v ?? 0)} />
            <ChipGroup value={f.refillFrequency} onChange={(v) => set('refillFrequency', v as RefillFrequency)} options={REFILLS.map((x) => ({ value: x.value, label: t(x.label) }))} />
          </>
        )}
        <TextArea label={t('Note')} value={f.notes} onChangeText={(v) => set('notes', v)} />
      </FormSection>
      <MedicineSheet open={pickFor !== null} onClose={() => setPickFor(null)}
        onPick={(p) => { if (pickFor !== null) setLine(pickFor, { productId: p.id, medicineName: p.name, strength: facts.get(p.id)?.generic ?? '', unit: p.unit, price: p.price }); setPickFor(null); }} />
    </FormTemplate>
  );
}
