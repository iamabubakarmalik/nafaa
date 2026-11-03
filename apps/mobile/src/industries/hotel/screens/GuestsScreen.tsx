/** Hotel guests (web GuestsPage): ID, stays and spend; VIP and blacklist, add and edit. */

import { Star, Users } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, confirm, toast } from '@/design';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { hotelApi, type HotelGuest } from '../api';
import { HOTEL_KEYS, ID_TYPES, dateOf, opts, refreshHotel } from '../meta';

type Row = HotelGuest & { inHouse: { rooms: string } | null };

export function GuestsScreen() {
  const canEdit = usePermission()(P.SERVICE_BOOKINGS_MANAGE);
  const { guard } = useDeskOnline('hotelDesk');
  const [form, setForm] = useState<HotelGuest | 'new' | null>(null);
  const blacklist = async (g: HotelGuest) => {
    if (g.isBlacklisted) { await hotelApi.guests.unblacklist(g.id); refreshHotel(); toast.success(t('List se hata diya')); return; }
    if (await confirm({ title: t('Blacklist karein?'), message: g.fullName, tone: 'danger', confirmLabel: t('Haan') })) { await hotelApi.guests.blacklist(g.id, t('Blacklist')); refreshHotel(); toast.success(t('Blacklist ho gaya')); }
  };
  return (
    <DeskList<{ items: Row[] }> title={t('Guests')} queryKey={[HOTEL_KEYS.guests]} fetch={() => hotelApi.guests.page({ limit: 100 })} feature="hotelDesk" emptyIcon={Users} empty={t('Abhi koi guest nahi')} searchPlaceholder={t('Naam ya phone')}
      filters={[{ value: 'all', label: t('Sab') }, { value: 'vip', label: 'VIP' }, { value: 'in', label: t('Andar') }]}
      rows={(d) => d.items.map((g) => ({
        id: g.id, icon: g.isVIP ? Star : Users, tone: g.isBlacklisted ? 'danger' : g.inHouse ? 'success' : 'neutral', search: `${g.fullName} ${g.phone} ${g.guestNumber}`, filter: g.isVIP ? 'vip' : g.inHouse ? 'in' : 'other',
        title: g.fullName, subtitle: `${g.phone} · ${t('{{n}} stays', { n: g.totalStays })}${g.inHouse ? ` · ${t('Room')} ${g.inHouse.rooms}` : g.lastStayAt ? ` · ${dateOf(g.lastStayAt)}` : ''}`,
        trailing: <Badge tone={g.isBlacklisted ? 'danger' : 'neutral'}>{g.isBlacklisted ? t('Blacklist') : formatMoney(g.totalSpent)}</Badge>, onPress: canEdit ? () => guard(() => setForm(g)) : undefined,
      }))}
      fab={canEdit ? { label: t('New guest'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New guest') : t('Edit guest')} onClose={() => setForm(null)}
        fields={[{ key: 'fullName', label: t('Naam'), required: true }, { key: 'phone', label: t('Phone'), kind: 'phone', required: true }, { key: 'idType', label: t('ID'), kind: 'select', options: opts(ID_TYPES) }, { key: 'idNumber', label: t('ID number') }, { key: 'city', label: t('Shehr') }, { key: 'isVIP', label: 'VIP', kind: 'switch' }, { key: 'notes', label: t('Note'), kind: 'multiline' }]}
        initial={form && form !== 'new' ? { ...form, fullName: form.fullName } : { idType: 'CNIC' }}
        extra={form && form !== 'new' ? <Button variant={form.isBlacklisted ? 'secondary' : 'danger'} onPress={() => { const g = form; setForm(null); void blacklist(g); }}>{form.isBlacklisted ? t('Blacklist se hataein') : t('Blacklist')}</Button> : undefined}
        onSubmit={async (v) => { const parts = String(v.fullName).trim().split(/\s+/); const body = clean({ firstName: parts[0], lastName: parts.slice(1).join(' ') || undefined, phone: v.phone, idType: v.idNumber ? v.idType : undefined, idNumber: v.idNumber, city: v.city, isVIP: !!v.isVIP, notes: v.notes }); if (form === 'new') await hotelApi.guests.create(body); else await hotelApi.guests.update((form as HotelGuest).id, body); refreshHotel(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
