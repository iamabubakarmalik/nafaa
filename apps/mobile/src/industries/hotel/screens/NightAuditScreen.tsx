/** Night audit (web HotelReportsPage): the day's sold rooms, occupancy, ADR and RevPAR, who is in, arrivals still to come, money by method, and closing the day. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatMoney, formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, DetailRow, IconButton, ListRow, Row, Screen, Segmented, StatTile, Text, confirm, toast } from '@/design';
import { OfflineNote, errorText, shiftKey, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { hotelApi } from '../api';
import { OccupancyPanel } from './OccupancyPanel';
import { HOTEL_KEYS, refreshHotel } from '../meta';

export function NightAuditScreen() {
  const can = usePermission();
  const { guard } = useDeskOnline('hotelDesk');
  const [day, setDay] = useState(todayKey());
  const [tab, setTab] = useState<'audit' | 'occupancy'>('audit');
  const q = useQuery({ queryKey: [HOTEL_KEYS.audit, day], queryFn: () => hotelApi.nightAudit(day) });
  const d = q.data;
  const close = useMutation({ mutationFn: () => hotelApi.closeDay({ date: day }), onSuccess: () => { refreshHotel(); void q.refetch(); toast.success(t('Din band ho gaya')); }, onError: (e) => toast.error(errorText(e, t('Nahi hua'))) });
  const askClose = async () => { if (await confirm({ title: t('Din band karein?'), message: d && (d.inHouseDue > 0 || d.arrivalsPending.length) ? t('Kuch guests ka paisa ya arrival baqi hai.') : undefined, confirmLabel: t('Band karein') })) close.mutate(); };
  return (
    <Screen title={t('Night audit')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ gap: 12 }}>
        <OfflineNote feature="hotelDesk" />
        <Segmented value={tab} onChange={(v) => setTab(v as 'audit' | 'occupancy')} options={[{ value: 'audit', label: t('Night audit') }, { value: 'occupancy', label: t('Occupancy') }]} />
        {tab === 'occupancy' ? <OccupancyPanel /> : (<>
        <Row justify="between">
          <IconButton icon={ChevronLeft} flip label={t('Pichla din')} onPress={() => setDay(shiftKey(day, -1))} />
          <Text weight="bold">{formatWeekdayDate(`${day}T12:00:00+05:00`)}</Text>
          <IconButton icon={ChevronRight} flip label={t('Agla din')} disabled={day >= todayKey()} onPress={() => setDay(shiftKey(day, 1))} />
        </Row>
        {d && (
          <>
            <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Rooms bike')} value={`${d.night.sold}/${d.rooms}`} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Occupancy')} value={`${Math.round(d.night.occupancyPct)}%`} /></Row>
            <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label="ADR" value={formatMoney(d.night.adr)} /><StatTile style={{ flex: 1, minWidth: 0 }} label="RevPAR" value={formatMoney(d.night.revpar)} /></Row>
            <Card title={t('Paisa')}>
              <DetailRow label={t('Bills')} value={`${d.money.bills} · ${formatMoney(d.money.billed)}`} /><DetailRow label={t('Bill par liye')} value={<Text ltr>{formatMoney(d.money.takenAtBill)}</Text>} /><DetailRow label={t('Khata me')} value={<Text ltr>{formatMoney(d.money.onKhata)}</Text>} />
              <DetailRow label={t('Advance mile')} value={<Text ltr>{formatMoney(d.money.advances)}</Text>} />
              {Object.entries(d.money.byMethod).map(([m, a], i, arr) => <DetailRow key={m} label={m} value={<Text ltr>{formatMoney(a)}</Text>} last={i === arr.length - 1} />)}
            </Card>
            <Card title={t('Abhi andar ({{n}})', { n: d.inHouse.length })} flush>
              {d.inHouse.map((s, i) => <ListRow key={s.id} divider={i < d.inHouse.length - 1} title={s.guestName} subtitle={`${t('Room')} ${s.rooms}${s.leavingToday ? ` · ${t('Aaj jayega')}` : ''}${s.overdue ? ` · ${t('Der')}` : ''}`} trailing={s.due > 0 ? <Text size="sm" tone="warning" ltr>{formatMoney(s.due)}</Text> : undefined} />)}
              {d.inHouse.length === 0 && <View style={{ padding: 16 }}><Text tone="muted" size="sm">{t('Koi nahi')}</Text></View>}
            </Card>
            {d.arrivalsPending.length > 0 && <Card title={t('Aane wale jo abhi nahi aaye')} flush>{d.arrivalsPending.map((s, i) => <ListRow key={s.id} divider={i < d.arrivalsPending.length - 1} title={s.guestName} subtitle={`${t('Room')} ${s.rooms}${s.late ? ` · ${t('Late')}` : ''}`} />)}</Card>}
            {can(P.REPORTS_VIEW) && !d.closed && <Button icon={Lock} loading={close.isPending} onPress={() => guard(() => void askClose())}>{t('Din band karein')}</Button>}
            {d.closed && <Text tone="muted" align="center">{t('Ye din band ho chuka hai')}</Text>}
          </>
        )}
        </>)}
      </View>
    </Screen>
  );
}
