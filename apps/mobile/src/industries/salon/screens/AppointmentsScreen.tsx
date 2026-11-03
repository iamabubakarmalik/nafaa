/**
 * Salon appointments (web AppointmentsPage + AppointmentDetailPage): views for
 * today, the waiting queue, upcoming, done and missed; one tap opens the visit
 * with its next step (arrived, in the chair, bill), advance, cancel and no-show.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Banknote, CalendarClock, CalendarDays, Plus, Receipt, Scissors, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { appointmentNext } from '@nafaa/core/industries/salon';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, DatePicker, DetailRow, EmptyState, ListTemplate, ListRow, Input, Row, Sheet, StatusPill, Text, confirm, toast, useTheme } from '@/design';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, PaySheet, dateToKey, errorText, useDeskOnline } from '../../_shared/deskKit';
import { salonApi, type Appointment, type AppointmentView } from '../api';
import { SALON_KEYS, STATUS, dateOf, refreshSalon, serviceLine, timeOf, toIso } from '../meta';

const VIEWS: Array<{ value: AppointmentView; label: string }> = [
  { value: 'today', label: t('Aaj') }, { value: 'queue', label: t('Queue') }, { value: 'upcoming', label: t('Aage') }, { value: 'done', label: t('Ho gaye') }, { value: 'missed', label: t('Missed') }, { value: 'all', label: t('Sab') },
];

export function AppointmentsScreen() {
  const th = useTheme();
  const can = usePermission();
  const [view, setView] = useState<AppointmentView>('today');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const query = useQuery({ queryKey: [SALON_KEYS.appointments, view, q], queryFn: () => salonApi.appointments.page({ view, search: q || undefined, limit: 60 }), refetchInterval: 30_000 });
  const data = query.data;
  return (
    <>
      <ListTemplate<Appointment>
        title={t('Appointments')}
        search={{ value: q, onChange: setQ, placeholder: t('Naam, phone ya number') }}
        filters={{ value: view, onChange: (v) => setView(v as AppointmentView), options: VIEWS.map((v) => ({ value: v.value, label: data ? `${v.label} ${data.counts[v.value] ?? 0}` : v.label })) }}
        summary={<View style={{ gap: th.space(2) }}><OfflineNote feature="salonDesk" /><CachedNote query={query} /></View>}
        data={data?.items} loading={query.isLoading} error={data ? null : query.error} onRetry={() => void query.refetch()} refreshing={query.isRefetching} onRefresh={() => void query.refetch()}
        keyExtractor={(a) => a.id}
        renderItem={({ item: a }) => (
          <ListRow icon={Scissors} iconTone={STATUS[a.status].tone} divider onPress={() => setOpen(a.id)} chevron
            title={a.customer?.name ?? a.customerName ?? t('Walk-in customer')}
            subtitle={`${dateOf(a.scheduledStart)} · ${timeOf(a.scheduledStart)} · ${serviceLine(a.services)}`}
            trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text weight="bold" ltr>{formatMoney(a.total)}</Text><Badge tone={STATUS[a.status].tone}>{t(STATUS[a.status].label)}</Badge></View>} />
        )}
        empty={<EmptyState icon={CalendarDays} title={t('Koi appointment nahi')} />}
        fab={can(P.SERVICE_BOOKINGS_MANAGE) ? { icon: Plus, label: t('New booking'), onPress: () => router.push('/salon/appointments/new' as never) } : undefined}
      />
      <AppointmentSheet id={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function AppointmentSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const can = usePermission();
  const { guard } = useDeskOnline('salonDesk');
  const [pay, setPay] = useState(false);
  const [move2, setMove2] = useState(false);
  const [day, setDay] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [why, setWhy] = useState('');
  const q = useQuery({ queryKey: [SALON_KEYS.appointments, 'one', id], queryFn: () => salonApi.appointments.getOne(id!), enabled: !!id });
  const a = q.data;
  const step = a ? appointmentNext(a.status) : null;
  const move = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) => salonApi.appointments.status(id!, status, reason),
    onSuccess: () => { refreshSalon(); toast.success(t('Ho gaya')); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });
  const cancel = async () => {
    if (await confirm({ title: t('Appointment cancel karein?'), tone: 'danger', confirmLabel: t('Haan, cancel') })) move.mutate({ status: 'CANCELLED', reason: t('Customer ne cancel kiya') });
  };
  const openMove = () => { if (a) { setDay(new Date(a.scheduledStart)); setTime(new Date(a.scheduledStart)); setWhy(''); setMove2(true); } };
  const saveMove = async () => {
    if (!a) return;
    const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
    const start = new Date(toIso(dateToKey(day), hhmm));
    const mins = Math.max((new Date(a.scheduledEnd).getTime() - new Date(a.scheduledStart).getTime()) / 60000, 15);
    try {
      await salonApi.appointments.reschedule(a.id, { scheduledStart: start.toISOString(), scheduledEnd: new Date(start.getTime() + mins * 60000).toISOString(), reason: why.trim() || undefined });
      refreshSalon(); toast.success(t('Waqt badal gaya')); setMove2(false);
    } catch (e) { toast.error(errorText(e, t('Nahi hua'))); }
  };
  const movable = a && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED');
  const due = a ? Math.max(a.total - a.paidAmount, 0) : 0;
  const canBook = can(P.SERVICE_BOOKINGS_MANAGE);
  const next = step === 'arrive' ? { label: t('Aa gaye'), status: 'ARRIVED' } : step === 'start' ? { label: t('Chair par'), status: 'IN_PROGRESS' } : null;
  return (
    <>
      <Sheet open={!!id} onClose={onClose} title={a ? (a.customer?.name ?? a.customerName ?? t('Walk-in customer')) : t('Appointment')} description={a ? `${a.appointmentNumber} · ${dateOf(a.scheduledStart)} ${timeOf(a.scheduledStart)}` : undefined}
        footer={a && canBook ? (
          <Row gap={2}>
            {next && <Button style={{ flex: 1 }} loading={move.isPending} onPress={() => guard(() => move.mutate({ status: next.status }))}>{next.label}</Button>}
            {step === 'bill' && can(P.POS_USE) && <Button style={{ flex: 1 }} icon={Receipt} onPress={() => { onClose(); router.push({ pathname: '/salon/counter', params: { appointment: a.id } } as never); }}>{t('Bill')}</Button>}
            {step && <Button variant="secondary" icon={XCircle} onPress={() => guard(() => void cancel())}>{t('Cancel')}</Button>}
          </Row>
        ) : undefined}>
        {a && (
          <View style={{ gap: 4 }}>
            <Row gap={2}><StatusPill tone={STATUS[a.status].tone}>{t(STATUS[a.status].label)}</StatusPill>{a.customer?.phone && <Text size="sm" tone="muted" ltr>{a.customer.phone}</Text>}</Row>
            {a.services.map((s, i) => (
              <DetailRow key={s.id ?? i} label={`${s.serviceName ?? t('Service')}${s.staffName ? ` · ${s.staffName}` : ''}`} value={<View style={{ alignItems: 'flex-end' }}><Text weight="semibold" ltr>{formatMoney(s.total)}</Text>{!!s.commissionAmount && <Text size="2xs" tone="muted" ltr>{t('Commission')} {formatMoney(s.commissionAmount)}</Text>}</View>} />
            ))}
            <DetailRow label={t('Total')} value={<Text weight="bold" ltr>{formatMoney(a.total)}</Text>} />
            <DetailRow label={t('Advance')} value={<Text ltr>{formatMoney(a.paidAmount)}</Text>} last={!a.sale} />
            {a.sale && <DetailRow label={t('Bill')} value={<Text ltr>{a.sale.saleNumber}</Text>} last />}
            {canBook && movable && <Button variant="ghost" icon={CalendarClock} onPress={() => guard(openMove)}>{t('Waqt badlein')}</Button>}
            {canBook && step && due > 0 && a.status !== 'COMPLETED' && <Button variant="soft" icon={Banknote} onPress={() => guard(() => setPay(true))}>{t('Advance lein')}</Button>}
          </View>
        )}
      </Sheet>
      <Sheet open={move2} onClose={() => setMove2(false)} title={t('Waqt badlein')} footer={<Button fullWidth size="lg" onPress={() => void saveMove()}>{t('Save')}</Button>}>
        <View style={{ gap: 12 }}>
          <Row gap={2}>
            <View style={{ flex: 1 }}><DatePicker label={t('Din')} value={day} onChange={setDay} minimumDate={new Date()} /></View>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={time} onChange={setTime} /></View>
          </Row>
          <Input label={t('Wajah')} value={why} onChangeText={setWhy} />
        </View>
      </Sheet>
      <PaySheet open={pay} onClose={() => setPay(false)} title={t('Advance lein')} name={a?.customerName ?? ''} due={due} allowPart advance cta={t('Save')}
        onConfirm={async (p) => { await salonApi.appointments.pay(id!, { amount: p.paidAmount, paymentMethod: p.paymentMethod }); refreshSalon([], true); toast.success(t('Advance lag gaya')); }} />
    </>
  );
}
