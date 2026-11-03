/** Repair job card (web RepairTicketFormPage): the customer, the phone, what is wrong, the estimate and any advance. Also opens as a warranty claim of an earlier job. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useBillLanguage } from '@/core/receipt';
import { Card, ChipGroup, DatePicker, EmptyState, FormSection, FormTemplate, Input, MoneyInput, Skeleton, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { imeiApi, repairsApi, type PaymentMethod, type RepairPriority, type RepairTicketPayload } from '../api';
import { CustomerBox, ImeiInput, emptyCustomer, useShopId, type CustomerValue } from '../components/kit';
import { METHODS, PRIORITIES, REPAIR_KEY, dateISO, opt, priorityOf, refreshMobile } from '../meta';
import { repairSlip, sendSlip } from '../slips';

const BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo', 'Infinix', 'Tecno', 'Realme', 'OnePlus', 'Huawei', 'Nokia'];
const ISSUES = ['Screen toot gayi', 'Touch nahi chal raha', 'Charge nahi hota', 'Battery jaldi khatam', 'Paani laga', 'On nahi hota', 'Awaz nahi aati', 'Mic kharab', 'Camera kharab', 'Network nahi', 'Software masla'];
const WARRANTY = [0, 7, 15, 30, 90];

interface Draft {
  brand: string; model: string; color: string; imei1: string; imei2: string; passcode: string; hasSimCard: boolean; hasMemoryCard: boolean; issue: string; priority: RepairPriority;
  technician: string; readyAt: Date | null; estimate: number | null; advance: number | null; method: PaymentMethod; warrantyDays: number; warrantyOf: string; phoneClaim: boolean; notes: string;
}
const blank = (): Draft => ({ brand: '', model: '', color: '', imei1: '', imei2: '', passcode: '', hasSimCard: false, hasMemoryCard: false, issue: '', priority: 'NORMAL', technician: '', readyAt: null, estimate: null, advance: null, method: 'CASH', warrantyDays: 7, warrantyOf: '', phoneClaim: false, notes: '' });

export function RepairFormScreen() {
  const th = useTheme();
  const { id, warrantyOf: claimOfId = '' } = useLocalSearchParams<{ id?: string; warrantyOf?: string }>();
  const editing = !!id;
  const shopId = useShopId();
  const shopName = useAuthStore((s) => s.tenant?.name) ?? '';
  const lang = useBillLanguage();
  const [d, setD] = useState<Draft>(blank);
  const [person, setPerson] = useState<CustomerValue>(emptyCustomer);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDirty(true); setD((x) => ({ ...x, [k]: v })); };

  const ticketQ = useQuery({ queryKey: [REPAIR_KEY, 'one', id], queryFn: () => repairsApi.getOne(id!), enabled: editing });
  const techQ = useQuery({ queryKey: [REPAIR_KEY, 'technicians'], queryFn: () => repairsApi.technicians(), staleTime: 5 * 60_000 });
  const claimQ = useQuery({ queryKey: [REPAIR_KEY, 'one', claimOfId], queryFn: () => repairsApi.getOne(claimOfId), enabled: !editing && !!claimOfId });
  const tk = ticketQ.data;
  useEffect(() => {
    if (!tk) return;
    setD({ ...blank(), brand: tk.deviceBrand, model: tk.deviceModel, color: tk.deviceColor ?? '', imei1: tk.imei1 ?? '', imei2: tk.imei2 ?? '', passcode: tk.passcode ?? '', hasSimCard: tk.hasSimCard, hasMemoryCard: tk.hasMemoryCard, issue: tk.reportedIssue, priority: tk.priority, technician: tk.technicianName ?? '', readyAt: tk.estimatedReadyAt ? new Date(tk.estimatedReadyAt) : null, estimate: Number(tk.estimatedCost) || null, warrantyDays: tk.warrantyDays, notes: tk.notes ?? '' });
    setPerson({ customerId: tk.customerId ?? '', name: tk.customerName, phone: tk.customerPhone });
    setDirty(false);
  }, [tk]);
  const claim = claimQ.data;
  useEffect(() => {
    if (!claim) return;
    setD({ ...blank(), brand: claim.deviceBrand, model: claim.deviceModel, color: claim.deviceColor ?? '', imei1: claim.imei1 ?? '', imei2: claim.imei2 ?? '', passcode: claim.passcode ?? '', issue: claim.diagnosedIssue || claim.reportedIssue, technician: claim.technicianName ?? '', warrantyOf: claim.ticketNumber, estimate: 0, warrantyDays: claim.warrantyDays });
    setPerson({ customerId: claim.customerId ?? '', name: claim.customerName, phone: claim.customerPhone });
  }, [claim]);

  const lookup = useQuery({ queryKey: ['mobile-imei-lookup', d.imei1], queryFn: () => imeiApi.lookup(d.imei1), enabled: !editing && d.imei1.length === 15, retry: false });
  const soldHere = lookup.data?.newPhones.find((p) => p.status === 'SOLD');
  const lastRepair = lookup.data?.repairs[0];
  const claimable = lookup.data?.repairs.find((r) => r.warrantyActive);
  useEffect(() => { const p = soldHere?.product; if (p && !d.model) { setD((x) => ({ ...x, brand: p.brand?.name ?? x.brand, model: p.name })); } }, [soldHere?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const closed = editing && !!tk && (tk.status === 'DELIVERED' || tk.status === 'CANCELLED' || !!tk.saleId);
  const errors = useMemo(() => {
    const e: string[] = [];
    if (!person.name.trim()) e.push(t('Customer ka naam likhein'));
    if (!/^[0-9+\-\s]{10,15}$/.test(person.phone.trim())) e.push(t('Customer ka phone likhein'));
    if (!d.brand.trim()) e.push(t('Phone ka brand likhein'));
    if (!d.model.trim()) e.push(t('Phone ka model likhein'));
    if (d.imei1 && !/^\d{15}$/.test(d.imei1)) e.push(t('IMEI me 15 number hon (ya khali chhorein)'));
    if (d.imei2 && !/^\d{15}$/.test(d.imei2)) e.push(t('IMEI 2 me 15 number hon'));
    if (!d.issue.trim()) e.push(t('Kya kharabi hai — likhein'));
    if (d.readyAt && !editing && d.readyAt.getTime() < Date.now() - 86_400_000) e.push(t('Tayyar hone ka waqt guzra hua hai'));
    if (!editing && (d.advance ?? 0) > 0 && (d.estimate ?? 0) > 0 && (d.advance ?? 0) > (d.estimate ?? 0)) e.push(t('Advance andaze se zyada nahi ho sakta'));
    return e;
  }, [d, person, editing]);

  const save = async () => {
    setTouched(true);
    if (errors.length) { toast.error(errors[0]); return; }
    setSaving(true);
    try {
      const body: RepairTicketPayload = {
        deviceBrand: d.brand.trim(), deviceModel: d.model.trim(), deviceColor: opt(d.color), imei1: opt(d.imei1), imei2: opt(d.imei2), passcode: opt(d.passcode), hasSimCard: d.hasSimCard, hasMemoryCard: d.hasMemoryCard,
        customerId: person.customerId || undefined, customerName: person.name.trim(), customerPhone: person.phone.trim(), reportedIssue: d.issue.trim(), priority: d.priority, technicianName: opt(d.technician),
        estimatedReadyAt: d.readyAt ? dateISO(d.readyAt) : undefined, estimatedCost: d.estimate ?? 0, warrantyDays: d.warrantyDays,
        notes: opt([d.phoneClaim && soldHere ? `Phone warranty claim: bill ${soldHere.sale?.saleNumber ?? ''}` : '', d.notes].filter(Boolean).join('\n')),
      };
      const ticket = editing
        ? await repairsApi.update(id!, closed ? { notes: body.notes } as Partial<RepairTicketPayload> : body)
        : await repairsApi.create({ ...body, shopId: shopId ?? undefined, advancePaid: d.advance || undefined, advanceMethod: d.advance ? d.method : undefined, warrantyOf: d.warrantyOf || undefined });
      refreshMobile([REPAIR_KEY, 'repair-stats'], true);
      if (editing) toast.success(t('Save ho gaya'));
      else toast.success(t('Job {{ticketNumber}} ban gaya', { ticketNumber: ticket.ticketNumber }), { action: { label: t('Parchi print'), onPress: () => void sendSlip(repairSlip(ticket, lang), shopName, lang).catch(() => toast.error(t('Print nahi hua'))) } });
      setDirty(false);
      router.replace(`/mobile/repairs/${ticket.id}` as never);
    } catch (e) { toast.error(apiErrorMessage(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };

  if (editing && ticketQ.isLoading) return <FormTemplate title={t('Repair job')} onSave={() => undefined}><Skeleton height={200} /></FormTemplate>;
  if (editing && !tk) return <FormTemplate title={t('Repair job')} onSave={() => undefined}><EmptyState title={t('Ye job nahi mila')} /></FormTemplate>;
  const err = (c: boolean, m: string) => (touched && c ? m : undefined);
  const techs = techQ.data ?? [];

  return (
    <FormTemplate title={editing ? t('{{n}} — badlein', { n: tk?.ticketNumber ?? '' }) : d.warrantyOf ? t('Warranty claim') : t('Naya repair job')} dirty={dirty} saving={saving} onSave={() => void save()}>
      {d.warrantyOf ? <Card tone="info"><Text size="sm"><ShieldCheck size={14} color={th.colors.info.text} /> {t('Warranty claim — pehla job')} {d.warrantyOf}</Text></Card> : null}
      {closed && <Text size="sm" tone="warning">{t('Ye job band hai — sirf note badal sakte hain')}</Text>}
      {!closed && (
        <>
          <FormSection title={t('Customer')}>
            <CustomerBox value={person} onChange={(v) => { setDirty(true); setPerson(v); }} error={err(!person.name.trim(), t('Customer ka naam likhein'))} />
          </FormSection>
          <FormSection title={t('Phone')}>
            <ImeiInput label={t('IMEI')} value={d.imei1} onValue={(v) => set('imei1', v)} hint={t('Marzi hai — IMEI se warranty ka pata chalta hai')} error={err(!!d.imei1 && !/^\d{15}$/.test(d.imei1), t('IMEI me 15 number hon (ya khali chhorein)'))} />
            {soldHere && <Text size="sm" tone="success">{t('Ye phone yahan se bika: bill {{n}}', { n: soldHere.sale?.saleNumber ?? '' })}{soldHere.warranty.active ? ` · ${t('Warranty baqi — {{daysLeft}} din ({{end}} tak)', { daysLeft: soldHere.warranty.daysLeft ?? 0, end: formatDate(soldHere.warranty.end ?? '') })}` : ''}</Text>}
            {soldHere?.warranty.active && <Switch value={d.phoneClaim} onChange={(v) => set('phoneClaim', v)} label={t('Dukaan ki warranty claim')} />}
            {lastRepair && <Text size="sm" tone="info">{t('Pehle repair hua: {{n}}', { n: lastRepair.ticketNumber })}{claimable ? ` · ${t('Repair warranty {{end}} tak', { end: formatDate(claimable.warrantyEnds ?? '') })}` : ''}</Text>}
            <ChipGroup wrap value={BRANDS.includes(d.brand) ? d.brand : ''} onChange={(v) => set('brand', v)} options={BRANDS.map((b) => ({ value: b, label: b }))} />
            <Input label={t('Brand')} value={d.brand} onChangeText={(v) => set('brand', v)} error={err(!d.brand.trim(), t('Phone ka brand likhein'))} />
            <Input label={t('Model')} value={d.model} onChangeText={(v) => set('model', v)} error={err(!d.model.trim(), t('Phone ka model likhein'))} />
            <Input label={t('Rang')} value={d.color} onChangeText={(v) => set('color', v)} />
            <Input label={t('Lock code / pattern')} value={d.passcode} onChangeText={(v) => set('passcode', v)} ltr hint={t('Sirf is job ke liye — marzi hai')} />
            <Switch value={d.hasSimCard} onChange={(v) => set('hasSimCard', v)} label={t('SIM saath hai')} />
            <Switch value={d.hasMemoryCard} onChange={(v) => set('hasMemoryCard', v)} label={t('Memory card saath hai')} />
          </FormSection>
          <FormSection title={t('Kharabi')}>
            <ChipGroup wrap value="" onChange={(v) => set('issue', d.issue ? `${d.issue}, ${t(v)}` : t(v))} options={ISSUES.map((i) => ({ value: i, label: t(i) }))} />
            <TextArea label={t('Kya kharabi hai')} value={d.issue} onChangeText={(v) => set('issue', v)} error={err(!d.issue.trim(), t('Kya kharabi hai — likhein'))} />
            <ChipGroup wrap value={d.priority} onChange={(v) => set('priority', v)} options={PRIORITIES.map((p) => ({ value: p, label: t(priorityOf(p).label) }))} />
          </FormSection>
          <FormSection title={t('Kaam')}>
            <Input label={t('Kaun theek karega')} value={d.technician} onChangeText={(v) => set('technician', v)} />
            {techs.length > 0 && <ChipGroup wrap value={d.technician} onChange={(v) => set('technician', v)} options={techs.slice(0, 8).map((x) => ({ value: x.name, label: x.name }))} />}
            <DatePicker label={t('Kab tak tayyar')} value={d.readyAt} onChange={(v) => set('readyAt', v)} />
            <MoneyInput label={t('Andaza (Rs)')} value={d.estimate} onChangeValue={(v) => set('estimate', v)} />
            {!editing && <MoneyInput label={t('Advance abhi liya')} value={d.advance} onChangeValue={(v) => set('advance', v)} error={err((d.advance ?? 0) > 0 && (d.estimate ?? 0) > 0 && (d.advance ?? 0) > (d.estimate ?? 0), t('Advance andaze se zyada nahi ho sakta'))} />}
            {!editing && (d.advance ?? 0) > 0 && <ChipGroup wrap value={d.method} onChange={(v) => set('method', v as PaymentMethod)} options={METHODS.map((m) => ({ value: m.value, label: t(m.label) }))} />}
            <Text size="sm" weight="medium" tone="secondary">{t('Repair ki warranty (din)')}</Text>
            <ChipGroup wrap value={String(d.warrantyDays)} onChange={(v) => set('warrantyDays', Number(v))} options={WARRANTY.map((w) => ({ value: String(w), label: w === 0 ? t('Koi nahi') : t('{{w}} din', { w }) }))} />
          </FormSection>
        </>
      )}
      <FormSection title={t('Note')}><TextArea value={d.notes} onChangeText={(v) => set('notes', v)} /></FormSection>
    </FormTemplate>
  );
}
