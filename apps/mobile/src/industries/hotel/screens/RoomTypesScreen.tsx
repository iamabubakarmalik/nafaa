/** Room types (web RoomTypesPage + wizard): rate, weekend rate, people and extra bed; a new type can bring its rooms with it. */

import { Bed } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, toast } from '@/design';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { hotelApi, type HotelRoomType } from '../api';
import { HOTEL_KEYS, refreshHotel } from '../meta';

const TYPES = ['SINGLE', 'DOUBLE', 'TWIN', 'TRIPLE', 'FAMILY', 'SUITE', 'DELUXE', 'EXECUTIVE', 'DORMITORY', 'STUDIO', 'APARTMENT', 'VILLA', 'OTHER'];

export function RoomTypesScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('hotelDesk');
  const [form, setForm] = useState<HotelRoomType | 'new' | null>(null);
  return (
    <DeskList<HotelRoomType[]> title={t('Room types')} queryKey={[HOTEL_KEYS.roomTypes, 'all']} fetch={() => hotelApi.roomTypes.list()} feature="hotelDesk" emptyIcon={Bed} empty={t('Abhi koi room type nahi')}
      rows={(list) => list.map((r) => ({
        id: r.id, icon: Bed, tone: r.isActive ? 'accent' : 'neutral', search: `${r.name} ${r.code}`, title: r.name, subtitle: `${r.code} · ${t('{{a}} bare, {{c}} bachche', { a: r.maxAdults, c: r.maxChildren })} · ${t('{{n}} rooms', { n: r.rooms?.length ?? 0 })}`,
        trailing: <Badge tone={r.isActive ? 'success' : 'neutral'}>{formatMoney(r.basePrice)}</Badge>, onPress: canEdit ? () => guard(() => setForm(r)) : undefined,
      }))}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New room type') : t('Edit room type')} onClose={() => setForm(null)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'code', label: t('Code'), required: true }, { key: 'type', label: t('Qism'), kind: 'select', options: TYPES.map((v) => ({ value: v, label: v[0] + v.slice(1).toLowerCase() })) }, { key: 'basePrice', label: t('Rate / raat'), kind: 'money', required: true }, { key: 'weekendPrice', label: t('Weekend rate (Jumma, Hafta)'), kind: 'money' }, { key: 'maxAdults', label: t('Bare'), kind: 'number' }, { key: 'maxChildren', label: t('Bachche'), kind: 'number' }, { key: 'extraBedAllowed', label: t('Extra bed mil sakta hai'), kind: 'switch' }, { key: 'extraBedPrice', label: t('Extra bed rate'), kind: 'money', when: (v) => !!v.extraBedAllowed }, { key: 'roomNumbers', label: t('Rooms ke number (comma se alag)'), when: () => form === 'new' }, { key: 'isActive', label: t('Chalu'), kind: 'switch' }]}
        initial={form && form !== 'new' ? { ...form } : { type: 'DOUBLE', maxAdults: 2, maxChildren: 1, isActive: true }}
        onSubmit={async (v) => {
          const { roomNumbers, ...rest } = v;
          const body = clean({ ...rest, rooms: undefined, maxAdults: rest.maxAdults ?? 2, maxChildren: rest.maxChildren ?? 0, maxOccupancy: (rest.maxAdults ?? 2) + (rest.maxChildren ?? 0), bedType: rest.bedType ?? 'DOUBLE_BED', bedCount: rest.bedCount ?? 1, extraBedAllowed: !!rest.extraBedAllowed, extraBedPrice: rest.extraBedPrice ?? 0, isActive: rest.isActive ?? true, amenities: rest.amenities ?? [], imageUrls: rest.imageUrls ?? [] });
          if (form === 'new') await hotelApi.roomTypes.create({ ...body, rooms: String(roomNumbers ?? '').split(',').map((x) => x.trim()).filter(Boolean).map((roomNumber) => ({ roomNumber })) });
          else { delete (body as any).rooms; await hotelApi.roomTypes.update((form as HotelRoomType).id, body); }
          refreshHotel(); toast.success(t('Save ho gaya'));
        }} />
    </DeskList>
  );
}
