/**
 * Cafe live (web GamingCafeLivePage): every station with a running clock and
 * the bill so far; start a session on a free station, pause, resume, and end
 * with food, discount and payment. The server posts the bill.
 */

import { useQuery } from '@tanstack/react-query';
import { Monitor, Play } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, EmptyState, Row, Screen, StatTile, Text, toast, useLayout, useTheme } from '@/design';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { FormSheet, clean } from '../../_shared/serviceKit';
import { EndSessionFlow, SessionCard } from '../components';
import { gamingApi, type GamingSession, type GamingStation } from '../api';
import { GAMING_KEYS, STATION_TYPES, refreshGaming } from '../meta';

export function CafeLiveScreen() {
  const th = useTheme();
  const { isTablet } = useLayout();
  const can = usePermission();
  const manage = can(P.POS_USE);
  const { guard } = useDeskOnline('gamingDesk');
  const sessions = useQuery({ queryKey: [GAMING_KEYS.active], queryFn: () => gamingApi.sessions.active(), refetchInterval: 20_000 });
  const stations = useQuery({ queryKey: [GAMING_KEYS.stations], queryFn: () => gamingApi.stations.list({ active: true }) });
  const [start, setStart] = useState<GamingStation | null>(null);
  const [end, setEnd] = useState<GamingSession | null>(null);
  const busy = new Set((sessions.data ?? []).map((s) => s.stationId));
  const free = (stations.data ?? []).filter((s) => !busy.has(s.id) && !s.isUnderMaintenance);
  return (
    <Screen title={t('Cafe live')} onRefresh={() => { void sessions.refetch(); void stations.refetch(); }} refreshing={sessions.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <OfflineNote feature="gamingDesk" />
        <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Chal rahe')} value={String(sessions.data?.length ?? 0)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Khali stations')} value={String(free.length)} /></Row>
        {(sessions.data ?? []).length === 0 && !sessions.isLoading && <EmptyState icon={Monitor} title={t('Abhi koi session nahi chal raha')} />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
          {(sessions.data ?? []).map((s) => <View key={s.id} style={{ width: isTablet ? '49%' : '100%' }}><SessionCard s={s} canManage={manage} onEnd={(x) => guard(() => setEnd(x))} /></View>)}
        </View>
        {manage && free.length > 0 && (
          <Card title={t('Khali stations')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {free.map((s) => <Button key={s.id} variant="secondary" icon={Play} onPress={() => guard(() => setStart(s))}>{`${s.name} · ${STATION_TYPES[s.stationType] ? t(STATION_TYPES[s.stationType]) : ''}`}</Button>)}
            </View>
            <Text size="xs" tone="muted" style={{ marginTop: 8 }}>{t('Station par tap karke session shuru karein.')}</Text>
          </Card>
        )}
      </View>
      <FormSheet open={!!start} title={t('Session shuru')} description={start ? `${start.name} · ${start.pricePerHour}/${t('ghanta')}` : undefined} onClose={() => setStart(null)} submitLabel={t('Shuru karein')}
        fields={[{ key: 'customerName', label: t('Player ka naam') }, { key: 'customerPhone', label: t('Phone'), kind: 'phone' }, { key: 'playerCount', label: t('Players'), kind: 'number' }, { key: 'gameSelected', label: t('Game') }, { key: 'ratePerHour', label: t('Rate / ghanta'), kind: 'money', hint: t('Khali chhorein to station ka rate lagega') }]}
        initial={{ playerCount: 1 }}
        onSubmit={async (v) => { await gamingApi.sessions.start(clean({ stationId: start!.id, customerName: v.customerName?.trim(), customerPhone: v.customerPhone?.trim(), playerCount: v.playerCount ?? 1, gameSelected: v.gameSelected?.trim(), ratePerHour: v.ratePerHour || undefined }) as any); refreshGaming(); toast.success(t('Session shuru ho gaya')); }} />
      <EndSessionFlow s={end} onClose={() => setEnd(null)} />
    </Screen>
  );
}
