/**
 * Service reminders (web ServiceRemindersPage): oil changes and services that
 * are due (by date or meter), and insurance, token tax and fitness renewals.
 * Each reminder goes to the vehicle owner on WhatsApp in one tap; done ones are
 * marked, others put off to a later date. Reminders come from delivered jobs
 * ("next service") and from vehicle paper dates.
 */

import { useQuery } from '@tanstack/react-query';
import { AlarmClock, Bell, CalendarClock, CheckCircle2, Clock, MessageCircle, Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { daysUntil } from '@nafaa/core/industries/autoparts';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Badge, Button, ChipGroup, DatePicker, EmptyState, Input, ListRow, ListTemplate, Row, Select, Sheet, Text, toast, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { usePaged } from '@/modules/inventory/stock/usePaged';
import { CachedNote } from '@/modules/sales/components/CachedNote';
import { OfflineNote, dateToKey, keyToDate, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { Meta, RowCard, StatGrid } from '../../_shared/trade/kit';
import { serviceRemindersApi, type ReminderRow, type ReminderView } from '../api';
import { VehiclePickSheet } from '../components/VehiclePick';
import { REMINDER_KEY, REMINDER_TYPES, dayOnly, km, reminderTypeOf, refreshAuto, vehicleName, waLink } from '../meta';
import { reminderMessage } from '../slip';

const LIMIT = 40;

export function ServiceRemindersScreen() {
  const th = useTheme();
  const can = usePermission();
  const { guard } = useDeskOnline('autopartsDesk');
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Shop';
  const lang = useBillLanguage();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const [view, setView] = useState<ReminderView>('due');
  const [search, setSearch] = useState('');
  const [snoozeOf, setSnoozeOf] = useState<ReminderRow | null>(null);
  const [adding, setAdding] = useState(false);
  const q = { view, search: search.trim() || undefined, limit: LIMIT };
  const list = usePaged([REMINDER_KEY, 'page', q], (page) => serviceRemindersApi.page({ ...q, page }).then((r) => ({ ...r, pages: r.totalPages })));
  const stats = useQuery({ queryKey: [REMINDER_KEY, 'stats'], queryFn: () => serviceRemindersApi.stats() });
  const s = stats.data;

  const setStatus = (r: ReminderRow, status: string) => guard(async () => {
    try { await serviceRemindersApi.updateStatus(r.id, status); toast.success(status === 'DONE' ? t('Ho gaya') : status === 'SENT' ? t('Bhej diya — likh liya') : t('Badal diya')); refreshAuto([REMINDER_KEY]); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); }
  });
  const send = (r: ReminderRow) => {
    const link = waLink(r.vehicle?.ownerPhone, reminderMessage(r, shopName, lang));
    if (!link) { toast.error(t('Is gaari ke malik ka phone likha nahi')); return; }
    void Linking.openURL(link);
    if (canEdit && r.status !== 'SENT') void setStatus(r, 'SENT');
  };

  const views: Array<{ value: ReminderView; label: string }> = [{ value: 'due', label: t('Abhi karne wale') }, { value: 'overdue', label: t('Guzar gaye') }, { value: 'upcoming', label: t('Agle 30 din') }, { value: 'done', label: t('Ho gaye') }, { value: 'all', label: t('Sab') }];
  const summary = (
    <View style={{ gap: th.space(3) }}>
      <StatGrid items={[
        { icon: Clock, tone: s?.overdue ? 'danger' : 'neutral', label: t('Guzar gaye'), loading: stats.isLoading, value: String(s?.overdue ?? 0), onPress: () => setView('overdue') },
        { icon: AlarmClock, tone: 'warning', label: t('Is hafte'), loading: stats.isLoading, value: String(s?.week ?? 0), onPress: () => setView('due') },
        { icon: CalendarClock, tone: 'info', label: t('Is mahine'), loading: stats.isLoading, value: String(s?.month ?? 0), onPress: () => setView('upcoming') },
        { icon: CheckCircle2, tone: 'success', label: t('Ho gaye'), loading: stats.isLoading, value: String(s?.done ?? 0), onPress: () => setView('done') },
      ]} />
      <OfflineNote feature="autopartsDesk" />
      <CachedNote query={stats} />
      <ChipGroup value={view} onChange={(v) => setView(v as ReminderView)} style={{ marginHorizontal: -th.space(4) }} options={views} />
      <AddReminderSheet open={adding} onClose={() => setAdding(false)} />
      <SnoozeSheet r={snoozeOf} onClose={() => setSnoozeOf(null)} />
    </View>
  );

  return (
    <ListTemplate<ReminderRow>
      title={t('Service reminders')}
      subtitle={t('Oil change, service, insurance, token — malik ko WhatsApp')}
      grouped={false}
      search={{ value: search, onChange: setSearch, placeholder: t('Gaari number, malik, phone…') }}
      summary={summary}
      data={list.items}
      loading={list.loading}
      error={list.error}
      onRetry={list.refetch}
      refreshing={list.refreshing}
      onRefresh={() => { list.refetch(); void stats.refetch(); }}
      onEndReached={list.loadMore}
      keyExtractor={(r) => r.id}
      renderItem={({ item: r }) => {
        const v = r.vehicle;
        const left = daysUntil(r.dueDate);
        const kmLeft = r.dueOdometerKm && (v?.odometerKm ?? v?.lastOdometerKm) ? r.dueOdometerKm - Number(v?.odometerKm ?? v?.lastOdometerKm) : null;
        const done = r.status === 'DONE';
        const over = !done && ((left !== null && left < 0) || (kmLeft !== null && kmLeft <= 0));
        return (
          <RowCard>
            <ListRow
              icon={Bell} iconTone={done ? 'success' : over ? 'danger' : 'warning'}
              title={<Row gap={1.5} wrap><Text weight="semibold" style={{ flexShrink: 1 }}>{r.title}</Text><Badge tone="neutral">{reminderTypeOf(r.reminderType)}</Badge>{r.status === 'SENT' ? <Badge tone="info">{t('Bheja {{sentAt}}', { sentAt: dayOnly(r.sentAt) })}</Badge> : null}{r.status === 'SNOOZED' ? <Badge tone="accent">{t('Aage kiya')}</Badge> : null}</Row>}
              subtitle={<View style={{ gap: 3 }}>
                <Text size="xs" tone="secondary" numberOfLines={1}>{v ? `${v.registrationNumber} ${vehicleName(v)} · ${[v.ownerName, v.ownerPhone].filter(Boolean).join(' · ') || t('Malik nahi likha')}` : t('Gaari nahi mili')}</Text>
                <Text size="xs" tone={over ? 'danger' : 'muted'}>{done ? t('Ho gaya {{doneAt}}', { doneAt: dayOnly(r.doneAt) }) : [
                  r.dueDate ? (left! < 0 ? t('{{value}} din guzar gaye ({{dueDate}})', { value: -left!, dueDate: dayOnly(r.dueDate) }) : left === 0 ? t('Aaj') : t('{{left}} din me ({{dueDate}})', { left, dueDate: dayOnly(r.dueDate) })) : null,
                  r.dueOdometerKm ? t('{{dueOdometerKm}} par{{value}}', { dueOdometerKm: km(r.dueOdometerKm), value: kmLeft !== null ? kmLeft <= 0 ? t(' — meter guzar gaya') : t(' — {{kmLeft}} baqi', { kmLeft: km(kmLeft) }) : '' }) : null,
                ].filter(Boolean).join(' · ')}</Text>
                {!done ? (
                  <Row gap={1} wrap>
                    <Button size="sm" variant="secondary" icon={MessageCircle} onPress={() => send(r)}>{t('WhatsApp')}</Button>
                    {canEdit ? <><Button size="sm" variant="ghost" onPress={() => guard(() => setSnoozeOf(r))}>{t('Aage karein')}</Button><Button size="sm" variant="ghost" icon={CheckCircle2} onPress={() => void setStatus(r, 'DONE')}>{t('Ho gaya')}</Button></> : null}
                  </Row>
                ) : null}
              </View>}
            />
          </RowCard>
        );
      }}
      empty={<EmptyState icon={Bell} title={search ? t('Koi reminder nahi mila') : view === 'due' ? t('Abhi koi reminder baqi nahi') : t('Is list me koi reminder nahi')} message={t('Gaari dete waqt agli service ka km ya date likhein — reminder khud ban jata hai.')} />}
      fab={canEdit ? { icon: Plus, label: t('Naya reminder'), onPress: () => guard(() => setAdding(true)) } : undefined}
    />
  );
}

function SnoozeSheet({ r, onClose }: { r: ReminderRow | null; onClose: () => void }) {
  const th = useTheme();
  const [day, setDay] = useState(shiftKey(todayKey(), 7));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (r) setDay(shiftKey(todayKey(), 7)); }, [r]);
  const ok = !!day && day > todayKey();
  const save = async () => {
    if (!r) return;
    setBusy(true);
    try { await serviceRemindersApi.snooze(r.id, new Date(`${day}T09:00:00`).toISOString()); toast.success(t('Aage kar diya')); refreshAuto([REMINDER_KEY]); onClose(); }
    catch (e) { toast.error(apiErrorMessage(e, t('Nahi hua'))); } finally { setBusy(false); }
  };
  return (
    <Sheet open={!!r} onClose={onClose} title={t('Aage karein')} description={r ? `${r.title} — ${r.vehicle?.registrationNumber ?? ''}` : undefined} footer={<Button fullWidth size="lg" disabled={!ok} loading={busy} onPress={() => void save()}>{t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <DatePicker label={t('Nayi date')} value={keyToDate(day)} minimumDate={new Date()} onChange={(x) => setDay(dateToKey(x))} error={day && !ok ? t('Aage ki date chunein') : undefined} />
        <ChipGroup value={day} onChange={setDay} options={[[3, t('3 din')], [7, t('1 hafta')], [15, t('15 din')], [30, t('1 mahina')]].map(([d, label]) => ({ value: shiftKey(todayKey(), Number(d)), label: String(label) }))} />
      </View>
    </Sheet>
  );
}

function AddReminderSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [vehicle, setVehicle] = useState<{ id: string; label: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const [type, setType] = useState('OIL_CHANGE');
  const [title, setTitle] = useState(reminderTypeOf('OIL_CHANGE'));
  const [day, setDay] = useState(shiftKey(todayKey(), 90));
  const [dueKm, setDueKm] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setVehicle(null); setType('OIL_CHANGE'); setTitle(reminderTypeOf('OIL_CHANGE')); setDay(shiftKey(todayKey(), 90)); setDueKm(null); } }, [open]);
  const ok = !!vehicle && (!!day || !!dueKm);
  const create = async () => {
    if (!vehicle) return;
    setBusy(true);
    try {
      await serviceRemindersApi.create({ vehicleId: vehicle.id, reminderType: type, title: title.trim() || reminderTypeOf(type), dueDate: day ? new Date(`${day}T09:00:00`).toISOString() : undefined, dueOdometerKm: dueKm ?? undefined });
      toast.success(t('Reminder ban gaya')); refreshAuto([REMINDER_KEY]); onClose();
    } catch (e) { toast.error(apiErrorMessage(e, t('Reminder nahi bana'))); } finally { setBusy(false); }
  };
  return (
    <>
      <Sheet open={open && !picking} onClose={onClose} title={t('Naya reminder')} footer={<Button fullWidth size="lg" disabled={!ok} loading={busy} onPress={() => void create()}>{t('Banayein')}</Button>}>
        <View style={{ gap: th.space(3) }}>
          <Button variant="secondary" onPress={() => setPicking(true)}>{vehicle ? vehicle.label : t('Gaari ka number')}</Button>
          <Select label={t('Kis cheez ka')} value={type} onChange={(v) => { setType(v); setTitle(reminderTypeOf(v)); }} options={REMINDER_TYPES.map((x) => ({ value: x.value, label: t(x.label) }))} />
          <Input label={t('Likhna')} value={title} onChangeText={setTitle} />
          <DatePicker label={t('Date')} value={keyToDate(day)} onChange={(x) => setDay(dateToKey(x))} />
          <NumberInput label={t('Ya meter (km)')} integer value={dueKm} onChangeValue={setDueKm} placeholder={t('Marzi hai')} />
          {!ok && vehicle ? <Text size="sm" tone="danger">{t('Date ya km me se ek likhein')}</Text> : null}
        </View>
      </Sheet>
      <VehiclePickSheet open={open && picking} onClose={() => setPicking(false)} onPick={(v) => { setVehicle({ id: v.id, label: `${v.registrationNumber} ${vehicleName(v)}` }); setPicking(false); }} />
    </>
  );
}
