/** Room board (web RoomsPage): every room by its live state (free, in use, arriving, cleaning); tap a room for the stay, housekeeping and status. */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Chip, DetailRow, Row, Screen, Sheet, StatTile, Text, PressableScale, toast, useLayout, useTheme } from '@/design';
import { OfflineNote, errorText, useDeskOnline } from '../../_shared/deskKit';
import { FormSheet } from '../../_shared/serviceKit';
import { hotelApi, type BoardRoom, type HousekeepingStatus, type RoomStatus } from '../api';
import { HK_STATUS, HOTEL_KEYS, ROOM_STATUS, refreshHotel, shortDate } from '../meta';

export function RoomBoardScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const { guard } = useDeskOnline('hotelDesk');
  const [filter, setFilter] = useState<RoomStatus | 'all'>('all');
  const [open, setOpen] = useState<BoardRoom | null>(null);
  const [add, setAdd] = useState(false);
  const board = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'board'], queryFn: () => hotelApi.rooms.board(), refetchInterval: 30_000 });
  const types = useQuery({ queryKey: [HOTEL_KEYS.roomTypes], queryFn: () => hotelApi.roomTypes.list() });
  const sum = useQuery({ queryKey: [HOTEL_KEYS.rooms, 'summary'], queryFn: () => hotelApi.rooms.summary() });
  const rooms = (board.data?.rooms ?? []).filter((r) => filter === 'all' || r.live === filter);
  const cols = isTablet ? 6 : 3;
  const set = async (fn: () => Promise<unknown>) => { try { await fn(); refreshHotel(); setOpen(null); } catch (e) { toast.error(errorText(e, t('Nahi hua'))); } };
  const manage = can(P.SERVICE_BOOKINGS_MANAGE);
  return (
    <Screen title={t('Room board')} onRefresh={() => { void board.refetch(); void sum.refetch(); }} refreshing={board.isRefetching} actions={can(P.PRODUCTS_EDIT) ? <Button size="sm" variant="ghost" icon={Plus} onPress={() => guard(() => setAdd(true))}>{t('Room')}</Button> : undefined}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="hotelDesk" />
        <Row gap={2}>
          <StatTile style={{ flex: 1, minWidth: 0 }} label={t('Occupancy')} value={`${Math.round(sum.data?.occupancyPct ?? 0)}%`} />
          <StatTile style={{ flex: 1, minWidth: 0 }} label={t('Khali')} value={String(sum.data?.available ?? 0)} />
          <StatTile style={{ flex: 1, minWidth: 0 }} label={t('Ganda')} value={String(sum.data?.dirty ?? 0)} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('Sab')} selected={filter === 'all'} onPress={() => setFilter('all')} />
          {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'] as RoomStatus[]).map((s) => <Chip key={s} label={t(ROOM_STATUS[s].label)} selected={filter === s} onPress={() => setFilter(s)} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {rooms.map((r) => {
            const tone = th.colors[ROOM_STATUS[r.live].tone === 'neutral' ? 'surface' : (ROOM_STATUS[r.live].tone as 'success')];
            return (
              <PressableScale key={r.id} onPress={() => setOpen(r)} style={{ width: `${100 / cols - 2.2}%` as `${number}%`, minHeight: 84, padding: 10, borderRadius: th.radius('lg'), backgroundColor: (tone as { soft?: string })?.soft ?? th.colors.surface, borderWidth: 1, borderColor: th.colors.border, gap: 2 }}>
                <Text weight="bold" size="lg" ltr>{r.roomNumber}</Text>
                <Text size="2xs" tone="muted" numberOfLines={1}>{r.current?.guestName ?? r.arrival?.guestName ?? t(ROOM_STATUS[r.live].label)}</Text>
                {r.overdue ? <Badge tone="danger">{t('Der')}</Badge> : r.departingToday ? <Badge tone="warning">{t('Aaj jayega')}</Badge> : r.housekeepingStatus === 'DIRTY' ? <Badge tone="danger">{t('Ganda')}</Badge> : null}
              </PressableScale>
            );
          })}
        </View>
        {rooms.length === 0 && !board.isLoading && <Text tone="muted" align="center">{t('Is filter me koi room nahi')}</Text>}
      </View>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={`${t('Room')} ${open?.roomNumber ?? ''}`} description={open ? `${open.roomType?.name ?? ''}${open.floor ? ` · ${t('Floor')} ${open.floor}` : ''}` : undefined}>
        {open && (
          <View style={{ gap: 10 }}>
            <Row gap={2}><Badge tone={ROOM_STATUS[open.live].tone}>{t(ROOM_STATUS[open.live].label)}</Badge><Badge tone={HK_STATUS[open.housekeepingStatus].tone}>{t(HK_STATUS[open.housekeepingStatus].label)}</Badge></Row>
            {(open.current ?? open.arrival) && (() => { const s = (open.current ?? open.arrival)!; return (
              <>
                <DetailRow label={open.current ? t('Abhi ruka hua') : t('Aane wala')} value={s.guestName} />
                <DetailRow label={t('Muddat')} value={`${shortDate(s.checkInDate)} → ${shortDate(s.checkOutDate)}`} />
                {s.balanceAmount > 0 && <DetailRow label={t('Baqi')} value={<Text ltr>{formatMoney(s.balanceAmount)}</Text>} />}
                <Button variant="soft" onPress={() => { setOpen(null); router.push(`/hotel/bookings/${s.id}` as never); }}>{t('Booking kholen')}</Button>
              </>
            ); })()}
            {manage && (
              <>
                <Text size="sm" weight="semibold" tone="secondary">{t('Safai')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['DIRTY', 'CLEAN', 'INSPECTED', 'MAINTENANCE_REQUIRED'] as HousekeepingStatus[]).map((h) => <Chip key={h} label={t(HK_STATUS[h].label)} selected={open.housekeepingStatus === h} onPress={() => guard(() => void set(() => hotelApi.rooms.housekeeping(open.id, h)))} />)}
                </View>
                {!open.current && (
                  <>
                    <Text size="sm" weight="semibold" tone="secondary">{t('Room ka haal')}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_ORDER', 'BLOCKED'] as RoomStatus[]).map((s) => <Chip key={s} label={t(ROOM_STATUS[s].label)} selected={open.status === s} onPress={() => guard(() => void set(() => hotelApi.rooms.status(open.id, s)))} />)}
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </Sheet>
      <FormSheet open={add} title={t('New room')} onClose={() => setAdd(false)}
        fields={[{ key: 'roomTypeId', label: t('Room type'), kind: 'select', required: true, options: (types.data ?? []).map((x) => ({ value: x.id, label: x.name })) }, { key: 'roomNumber', label: t('Room number'), required: true }, { key: 'floor', label: t('Floor') }, { key: 'customPrice', label: t('Khaas rate (marzi)'), kind: 'money' }]}
        onSubmit={async (v) => { await hotelApi.rooms.create({ roomTypeId: v.roomTypeId, roomNumber: v.roomNumber.trim(), floor: v.floor || undefined, customPrice: v.customPrice || undefined }); refreshHotel(); toast.success(t('Room ban gaya')); }} />
    </Screen>
  );
}
