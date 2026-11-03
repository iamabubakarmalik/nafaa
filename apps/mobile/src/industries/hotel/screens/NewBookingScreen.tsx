/**
 * New booking (web NewBookingPage): dates and guest, check which room types are
 * free with the nightly rates (weekend and season rates included), pick a room,
 * take an advance, and save as booked or check in right now.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { nightsBetween } from '@nafaa/core/industries/hotel';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Amount, Button, Card, Chip, DatePicker, FormSection, FormTemplate, Input, MoneyInput, Row, Select, Switch, Text, toast } from '@/design';
import { MethodChips, dateToKey, errorText, numIn, shiftKey, todayKey } from '../../_shared/deskKit';
import { hotelApi } from '../api';
import { HOTEL_KEYS, ID_TYPES, MEAL_PLANS, SOURCES, opts, refreshHotel } from '../meta';

export function NewBookingScreen() {
  const [inDate, setIn] = useState(todayKey());
  const [outDate, setOut] = useState(shiftKey(todayKey(), 1));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [idType, setIdType] = useState('CNIC');
  const [idNumber, setIdNumber] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [source, setSource] = useState('WALK_IN');
  const [meal, setMeal] = useState('ROOM_ONLY');
  const [pick, setPick] = useState<{ typeId: string; roomId: string } | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [method, setMethod] = useState('CASH');
  const [now, setNow] = useState(inDate === todayKey());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const nights = nightsBetween(inDate, outDate);
  const quote = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'quote', inDate, outDate, source], queryFn: () => hotelApi.bookings.quote({ checkInDate: inDate, checkOutDate: outDate, source }), enabled: nights >= 1 && nights <= 365 });
  const types = quote.data?.types ?? [];
  const chosen = types.find((x) => x.roomTypeId === pick?.typeId);
  const room = chosen?.free.find((r) => r.id === pick?.roomId);
  const total = room?.total ?? 0;
  const save = async () => {
    if (!name.trim() || phone.trim().length < 10) { toast.warning(t('Guest ka naam aur phone likhein')); return; }
    if (!pick) { toast.warning(t('Room chunein')); return; }
    if (now && inDate === todayKey() && !idNumber.trim()) { toast.warning(t('Check-in ke liye guest ka CNIC ya passport number likhein')); return; }
    setSaving(true);
    try {
      const b = await hotelApi.bookings.create({
        guestName: name.trim(), guestPhone: phone.trim(), idType: idNumber.trim() ? idType : undefined, idNumber: idNumber.trim() || undefined, totalAdults: Number(adults) || 1, totalChildren: Number(children) || 0,
        checkInDate: inDate, checkOutDate: outDate, rooms: [{ roomId: pick.roomId, roomTypeId: pick.typeId, adults: Number(adults) || 1 }], source, mealPlan: meal, status: 'CONFIRMED',
        specialRequests: notes.trim() || undefined, advancePaid: advance || undefined, paymentMethod: advance ? method : undefined, checkInNow: now && inDate === todayKey() ? true : undefined,
      });
      refreshHotel(true); toast.success(t('Booking ho gayi'), { message: b.bookingNumber }); router.replace(`/hotel/bookings/${b.id}` as never);
    } catch (e) { toast.error(errorText(e, t('Save nahi hua'))); } finally { setSaving(false); }
  };
  return (
    <FormTemplate title={t('New booking')} dirty={!!name || !!pick} saving={saving} onSave={() => void save()}>
      <FormSection title={t('Dates')}>
        <Row gap={2}>
          <View style={{ flex: 1 }}><DatePicker label={t('Check-in')} value={new Date(`${inDate}T12:00:00`)} minimumDate={new Date()} onChange={(d) => { const k = dateToKey(d); setIn(k); if (k >= outDate) setOut(shiftKey(k, 1)); setPick(null); }} /></View>
          <View style={{ flex: 1 }}><DatePicker label={t('Check-out')} value={new Date(`${outDate}T12:00:00`)} minimumDate={new Date(`${shiftKey(inDate, 1)}T12:00:00`)} onChange={(d) => { setOut(dateToKey(d)); setPick(null); }} /></View>
        </Row>
        <Text size="sm" tone="muted">{nights >= 1 ? t('{{n}} raat', { n: nights }) : t('Check-out, check-in ke baad ki date honi chahiye')}</Text>
        <Select label={t('Booking kahan se')} value={source} onChange={setSource} options={opts(SOURCES)} />
      </FormSection>
      <FormSection title={t('Room')}>
        {quote.isLoading && <Text tone="muted">{t('Rate dekh rahe hain…')}</Text>}
        {types.map((ty) => (
          <Card key={ty.roomTypeId} title={ty.name} flush>
            <Text size="xs" tone="muted" style={{ paddingHorizontal: 16 }} ltr>{t('Avg {{rate}} / raat · {{n}} khali', { rate: formatMoney(ty.avgRate), n: ty.free.length })}</Text>
            {ty.free.length === 0 && <View style={{ padding: 12 }}><Text size="sm" tone="danger">{t('Is waqt koi room khali nahi')}</Text></View>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }}>
              {ty.free.map((r) => <Chip key={r.id} label={`${r.roomNumber} · ${formatMoney(r.total)}`} selected={pick?.roomId === r.id} onPress={() => setPick({ typeId: ty.roomTypeId, roomId: r.id })} />)}
            </View>
          </Card>
        ))}
      </FormSection>
      <FormSection title={t('Guest')}>
        <Input label={t('Naam')} value={name} onChangeText={setName} />
        <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr />
        <Row gap={2}><View style={{ flex: 1 }}><Select label={t('ID')} value={idType} onChange={setIdType} options={opts(ID_TYPES)} /></View><View style={{ flex: 1 }}><Input label={t('ID number')} value={idNumber} onChangeText={setIdNumber} ltr /></View></Row>
        <Row gap={2}><View style={{ flex: 1 }}><Input label={t('Bare')} value={adults} onChangeText={(s) => setAdults(String(numIn(s) ?? ''))} keyboardType="number-pad" ltr /></View><View style={{ flex: 1 }}><Input label={t('Bachche')} value={children} onChangeText={(s) => setChildren(String(numIn(s) ?? ''))} keyboardType="number-pad" ltr /></View></Row>
        <Select label={t('Khana')} value={meal} onChange={setMeal} options={opts(MEAL_PLANS)} />
        <Input label={t('Khaas darkhwast')} value={notes} onChangeText={setNotes} multiline />
      </FormSection>
      <FormSection title={t('Advance')}>
        <MoneyInput label={t('Advance')} value={advance} onChangeValue={setAdvance} />
        {!!advance && <MethodChips value={method} onChange={setMethod} />}
        {inDate === todayKey() && <Switch label={t('Abhi check-in karein')} value={now} onChange={setNow} />}
        <Row justify="between"><Text tone="muted">{t('Room ka kiraya')}</Text><Amount value={total} weight="bold" /></Row>
      </FormSection>
    </FormTemplate>
  );
}
