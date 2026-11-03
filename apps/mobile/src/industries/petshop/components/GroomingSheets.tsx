/** Sheets on a grooming visit: the visit, "ready" (extra / discount), pickup bill, advance and rating. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CheckCircle2, Pencil, Phone, Receipt, Star, UserX, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { groomingDue, groomingTotal, groomingTotalIssue } from '@nafaa/core/industries/petshop';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Button, Card, DetailRow, MoneyInput, PressableScale, Row, Sheet, Text, TextArea, confirm, toast, useTheme } from '@/design';
import { PaySheet, errorText } from '../../_shared/deskKit';
import { groomingApi, type Grooming } from '../api';
import { GROOM_STATUS, PET_KEYS, refreshPet, serviceLabel, speciesLabel } from '../meta';

export type GroomAction = 'view' | 'complete' | 'pickup' | 'advance' | 'rate' | null;

export function VisitSheet({ a, canWork, onAction, onClose }: { a: Grooming | null; canWork: boolean; onAction: (k: Exclude<GroomAction, null>) => void; onClose: () => void }) {
  const th = useTheme();
  const detail = useQuery({ queryKey: [PET_KEYS.grooming, 'one', a?.id], queryFn: () => groomingApi.getOne(a!.id), enabled: !!a });
  const full = detail.data ?? a;
  const act = useMutation({
    mutationFn: (v: { kind: 'noshow' | 'cancel' }) => (v.kind === 'cancel' ? groomingApi.cancel(a!.id) : groomingApi.updateStatus(a!.id, { status: 'NO_SHOW' })),
    onSuccess: (r) => { refreshPet([PET_KEYS.grooming], true); toast.success(r.status === 'CANCELLED' ? (r.paidAmount > 0 ? t('Cancel — advance customer ke khate me jama hai') : t('Appointment cancel')) : t('Groomer ka waqt khali ho gaya')); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  if (!full) return <Sheet open={false} onClose={onClose}><View /></Sheet>;
  const owed = groomingDue(full);
  const booking = full.status === 'SCHEDULED' || full.status === 'CONFIRMED';
  const open = booking || full.status === 'IN_PROGRESS' || full.status === 'READY_FOR_PICKUP';
  const st = GROOM_STATUS[full.status];
  const ask = async (kind: 'noshow' | 'cancel') => {
    const ok = await confirm({
      title: kind === 'cancel' ? t('Appointment cancel?') : t('Customer nahi aaye?'), tone: 'danger', confirmLabel: kind === 'cancel' ? t('Haan, cancel') : t('Haan, nahi aaye'),
      message: kind === 'cancel' ? (full.paidAmount > 0 ? t('{{paidAmount}} advance customer ke khate me jama rahega — wapas dena ho to Khata se dein.', { paidAmount: formatMoney(full.paidAmount) }) : t('Record rehta hai, sirf cancel likha jata hai.')) : t('Groomer ka waqt khali ho jayega. Baad me aayein to dobara booking karein.'),
    });
    if (ok) act.mutate({ kind });
  };
  return (
    <Sheet open={!!a} onClose={onClose} title={`${full.petName} · ${t(st.label)}`} description={`${full.appointmentNumber} · ${formatDate(full.scheduledDate, { year: true })} ${full.scheduledSlot ?? ''}`.trim()}
      footer={canWork && open ? (
        <Row gap={2}>
          {full.status === 'IN_PROGRESS' && <Button style={{ flex: 1 }} icon={CheckCircle2} onPress={() => onAction('complete')}>{t('Tayyar')}</Button>}
          {full.status === 'READY_FOR_PICKUP' && <Button style={{ flex: 1 }} icon={Receipt} onPress={() => onAction('pickup')}>{t('Le jayein (bill)')}</Button>}
          {owed > 0.009 && full.status !== 'READY_FOR_PICKUP' && <Button variant="secondary" style={{ flex: 1 }} icon={Wallet} onPress={() => onAction('advance')}>{t('Advance')}</Button>}
        </Row>
      ) : undefined}>
      <View style={{ gap: th.space(3) }}>
        <Card flush>
          <DetailRow label={t('Pet')} value={`${full.petName} · ${speciesLabel(full.petSpecies)}`} />
          {!!(full.petBreed || full.petWeightKg || full.petTemperament) && <DetailRow label={t('Nasal')} value={[full.petBreed, full.petWeightKg ? `${full.petWeightKg} kg` : null, full.petTemperament].filter(Boolean).join(' · ')} />}
          {!!full.petAllergies && <DetailRow label={t('Allergy')} value={<Text size="sm" weight="semibold" tone="danger">{full.petAllergies}</Text>} />}
          <DetailRow label={t('Malik')} value={full.customerName} />
          <DetailRow label={t('Phone')} value={<PressableScale onPress={() => void Linking.openURL(`tel:${full.customerPhone}`)}><Row gap={1}><Phone size={14} color={th.colors.brand.solid} /><Text size="sm" weight="semibold" tone="brand" ltr>{full.customerPhone}</Text></Row></PressableScale>} />
          {!!full.groomerName && <DetailRow label={t('Groomer')} value={full.groomerName} />}
          <DetailRow label={serviceLabel(full.serviceType)} value={formatMoney(full.serviceFee)} />
          {full.additionalCharges > 0 && <DetailRow label={t('Extra ({{value}})', { value: full.additionalServices.map(serviceLabel).join(', ') || t('service') })} value={formatMoney(full.additionalCharges)} />}
          {full.discount > 0 && <DetailRow label={t('Discount')} value={`−${formatMoney(full.discount)}`} />}
          <DetailRow label={t('Total · mila {{paidAmount}}', { paidAmount: formatMoney(full.paidAmount) })} value={<Text weight="bold" ltr>{formatMoney(full.totalFee)}</Text>} last />
        </Card>
        {!!full.petSpecialInstructions && <Text size="sm" tone="secondary">{full.petSpecialInstructions}</Text>}
        {!!full.groomerNotes && <Text size="sm" tone="secondary">{full.groomerNotes}</Text>}
        {!!full.customerRating && <Badge tone="warning">{`${'★'.repeat(full.customerRating)}${full.customerFeedback ? ` — ${full.customerFeedback}` : ''}`}</Badge>}
        {(full.previousVisits?.length ?? 0) > 0 && (
          <View style={{ gap: 4 }}>
            <Text size="xs" weight="semibold" tone="muted">{t('Pichli visits')}</Text>
            {full.previousVisits!.slice(0, 5).map((v) => <Text key={v.id} size="xs" tone="secondary">{`${formatDate(v.scheduledDate)} · ${v.petName} · ${serviceLabel(v.serviceType)} · ${formatMoney(v.totalFee)}`}</Text>)}
          </View>
        )}
        {canWork && (
          <Row gap={2} wrap>
            {booking && <Button size="sm" variant="secondary" icon={Pencil} onPress={() => { onClose(); router.push(`/petshop/grooming/${full.id}/edit` as never); }}>{t('Badlein')}</Button>}
            {booking && <Button size="sm" variant="secondary" icon={UserX} onPress={() => void ask('noshow')}>{t('Nahi aaye')}</Button>}
            {booking && <Button size="sm" variant="secondary" icon={XCircle} onPress={() => void ask('cancel')}>{t('Cancel')}</Button>}
            {full.status === 'COMPLETED' && !full.customerRating && <Button size="sm" variant="secondary" icon={Star} onPress={() => onAction('rate')}>{t('Rating')}</Button>}
          </Row>
        )}
      </View>
    </Sheet>
  );
}

export function CompleteSheet({ a, onClose }: { a: Grooming | null; onClose: () => void }) {
  const th = useTheme();
  const [extra, setExtra] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  useEffect(() => { if (a) { setExtra(a.additionalCharges || null); setDiscount(a.discount || null); setNotes(''); } }, [a]);
  const total = a ? groomingTotal(a.serviceFee, extra ?? 0, discount ?? 0) : 0;
  const issue = a && groomingTotalIssue(total, a.paidAmount) ? t('{{paidAmount}} pehle mil chuke — total us se kam nahi', { paidAmount: formatMoney(a.paidAmount) }) : '';
  const save = useMutation({
    mutationFn: () => groomingApi.complete(a!.id, { additionalCharges: extra ?? 0, discount: discount ?? 0, groomerNotes: notes.trim() || undefined }),
    onSuccess: () => { refreshPet([PET_KEYS.grooming]); toast.success(t('{{petName}} tayyar — malik ko bulayein', { petName: a!.petName })); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!a} onClose={onClose} title={t('{{petName}} tayyar', { petName: a?.petName })} description={t('Extra service ya discount ho to likhein')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!issue} onPress={() => save.mutate()}>{t('Tayyar hai')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Extra (Rs)')} value={extra} onChangeValue={setExtra} hint={t('Pissu, nakhun waghera')} />
        <MoneyInput label={t('Discount (Rs)')} value={discount} onChangeValue={setDiscount} error={issue || undefined} />
        <TextArea label={t('Groomer ka note (marzi)')} value={notes} onChangeText={setNotes} placeholder={t('Kaan me infection — doctor ko dikhayein')} />
        {a && <Text weight="semibold">{t('Total {{total}} · baqi {{value}}', { total: formatMoney(total), value: formatMoney(Math.max(total - a.paidAmount, 0)) })}</Text>}
      </View>
    </Sheet>
  );
}

export function PickupSheet({ a, onClose }: { a: Grooming | null; onClose: () => void }) {
  const owed = a ? groomingDue(a) : 0;
  return (
    <PaySheet open={!!a} title={t('{{petName}} le jayein?', { petName: a?.petName })} name={a?.customerName ?? ''} due={owed} cta={t('Bill banayein')} onClose={onClose}
      onConfirm={async (pay) => {
        const r = await groomingApi.pickup(a!.id, { paymentMethod: pay.paymentMethod, paidAmount: pay.paidAmount });
        refreshPet([PET_KEYS.grooming], true);
        const change = r.change ?? 0;
        toast.success(t('Bill {{value}} ban gaya{{value2}}', { value: r.sale?.saleNumber ?? '', value2: change > 0.009 ? t(' — Rs {{change}} wapas dein', { change }) : '' }));
      }} />
  );
}

export function AdvanceSheet({ a, onClose }: { a: Grooming | null; onClose: () => void }) {
  const owed = a ? groomingDue(a) : 0;
  return (
    <PaySheet open={!!a} advance title={t('Advance lein')} name={a ? `${a.petName} · ${a.customerName}` : ''} due={owed} cta={t('Advance lein')} onClose={onClose}
      onConfirm={async (pay) => {
        await groomingApi.payment(a!.id, { amount: pay.paidAmount, paymentMethod: pay.paymentMethod });
        refreshPet([PET_KEYS.grooming], true);
        toast.success(t('{{amt}} advance khate me jama', { amt: formatMoney(pay.paidAmount) }));
      }} />
  );
}

export function RateSheet({ a, onClose }: { a: Grooming | null; onClose: () => void }) {
  const th = useTheme();
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { if (a) { setRating(5); setFeedback(''); } }, [a]);
  const save = useMutation({
    mutationFn: () => groomingApi.rate(a!.id, { rating, feedback: feedback.trim() || undefined }),
    onSuccess: () => { refreshPet([PET_KEYS.grooming]); toast.success(t('Rating save')); onClose(); },
    onError: (e) => toast.error(errorText(e, t('Save nahi hua'))),
  });
  return (
    <Sheet open={!!a} onClose={onClose} title={t('Customer ki rating')} description={a?.petName}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{t('Save')}</Button>}>
      <View style={{ gap: 12 }}>
        <Row gap={2}>{[1, 2, 3, 4, 5].map((n) => <PressableScale key={n} onPress={() => setRating(n)} accessibilityLabel={t('{{n}} star', { n })}><Star size={34} color={th.colors.warning.solid} fill={n <= rating ? th.colors.warning.solid : 'transparent'} /></PressableScale>)}</Row>
        <TextArea label={t('Kya kaha (marzi)')} value={feedback} onChangeText={setFeedback} />
      </View>
    </Sheet>
  );
}
