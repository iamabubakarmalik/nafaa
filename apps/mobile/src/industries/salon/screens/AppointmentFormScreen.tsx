/** New booking or walk-in (web NewAppointmentPage): customer, day and time, then services with the stylist for each. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Button, DatePicker, FormSection, FormTemplate, IconButton, Input, Row, Select, Switch, Text, toast, useTheme } from '@/design';
import { CustomerField, type PickedCustomer } from '../../_shared/serviceKit';
import { dateToKey, errorText, todayKey } from '../../_shared/deskKit';
import { salonApi } from '../api';
import { SALON_KEYS, refreshSalon, staffName, toIso } from '../meta';

interface Line { key: number; serviceId: string; staffProfileId: string }
let seq = 1;

export function AppointmentFormScreen() {
  const th = useTheme();
  const services = useQuery({ queryKey: [SALON_KEYS.services, 'active'], queryFn: () => salonApi.services.list({ active: true }) });
  const staff = useQuery({ queryKey: [SALON_KEYS.staff, 'bookable'], queryFn: () => salonApi.staff.list({ bookable: true }) });
  const [customer, setCustomer] = useState<PickedCustomer | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [guests, setGuests] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([{ key: seq++, serviceId: '', staffProfileId: '' }]);
  const [saving, setSaving] = useState(false);
  const svc = services.data ?? [];
  const total = lines.reduce((s, l) => s + (svc.find((x) => x.id === l.serviceId)?.discountPrice ?? svc.find((x) => x.id === l.serviceId)?.price ?? 0), 0);
  const set = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const save = async () => {
    const chosen = lines.filter((l) => l.serviceId);
    if (!chosen.length) { toast.warning(t('Kam az kam ek service chunein')); return; }
    if (!customer && !name.trim()) { toast.warning(t('Customer ya naam likhein')); return; }
    setSaving(true);
    try {
      const day = walkIn ? todayKey() : dateToKey(date);
      const start = walkIn ? new Date().toISOString() : toIso(day, hhmm(time));
      const a = await salonApi.appointments.create({
        customerId: customer?.id, customerName: customer ? undefined : name.trim(), customerPhone: customer?.phone || undefined, customerNotes: notes.trim() || undefined,
        scheduledStart: start, walkIn: walkIn || undefined, numberOfGuests: guests && guests > 1 ? guests : undefined,
        services: chosen.map((l) => ({ serviceId: l.serviceId, staffProfileId: l.staffProfileId || undefined })),
      });
      refreshSalon();
      toast.success(t('Booking ho gayi'), { message: a.appointmentNumber });
      router.back();
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  return (
    <FormTemplate title={t('New booking')} dirty={lines.some((l) => l.serviceId) || !!customer} saving={saving} onSave={() => void save()}>
      <FormSection title={t('Customer')}>
        <CustomerField value={customer} onChange={setCustomer} optional />
        {!customer && <Input label={t('Walk-in naam')} value={name} onChangeText={setName} />}
        <Switch label={t('Walk-in (abhi)')} value={walkIn} onChange={setWalkIn} />
        {!walkIn && (
          <Row gap={2}>
            <View style={{ flex: 1 }}><DatePicker label={t('Din')} value={date} onChange={setDate} minimumDate={new Date()} /></View>
            <View style={{ flex: 1 }}><DatePicker mode="time" label={t('Waqt')} value={time} onChange={setTime} /></View>
          </Row>
        )}
      </FormSection>
      <FormSection title={t('Services')}>
        {lines.map((l) => (
          <View key={l.key} style={{ gap: th.space(2), padding: th.space(3), borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }}>
            <Select label={t('Service')} value={l.serviceId || null} onChange={(v) => set(l.key, { serviceId: v })} options={svc.map((s) => ({ value: s.id, label: s.name, description: formatMoney(s.discountPrice ?? s.price) }))} />
            <Select label={t('Stylist')} value={l.staffProfileId || null} onChange={(v) => set(l.key, { staffProfileId: v })} options={[{ value: '', label: t('Koi bhi') }, ...(staff.data ?? []).map((s) => ({ value: s.id, label: staffName(s) }))]} />
            {lines.length > 1 && <IconButton icon={Trash2} label={t('Delete')} variant="danger" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />}
          </View>
        ))}
        <Button variant="soft" icon={Plus} onPress={() => setLines((ls) => [...ls, { key: seq++, serviceId: '', staffProfileId: '' }])}>{t('Aur service')}</Button>
        <Row justify="between"><Text tone="muted">{t('Total')}</Text><Text weight="bold" ltr>{formatMoney(total)}</Text></Row>
        <Input label={t('Kitne log')} hint={t('Bridal party / group')} keyboardType="number-pad" ltr value={guests ? String(guests) : ''} onChangeText={(v) => setGuests(Number(v.replace(/\D/g, '')) || null)} />
        <Input label={t('Note')} value={notes} onChangeText={setNotes} multiline />
      </FormSection>
    </FormTemplate>
  );
}
