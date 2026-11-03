/** Salon calendar (web CalendarViewPage): one day at a time, grouped by stylist, in time order. */

import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { formatMoney, formatWeekdayDate } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge, Card, EmptyState, IconButton, ListRow, Row, Screen, Text } from '@/design';
import { dateToKey, shiftKey, todayKey } from '../../_shared/deskKit';
import { salonApi, type Appointment } from '../api';
import { SALON_KEYS, STATUS, serviceLine, timeOf, toIso } from '../meta';
import { AppointmentSheet } from './AppointmentsScreen';

export function CalendarScreen() {
  const [day, setDay] = useState(todayKey());
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: [SALON_KEYS.calendar, day], queryFn: () => salonApi.appointments.calendar(toIso(day, '00:00'), toIso(day, '23:59')), refetchInterval: 60_000 });
  const groups = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    (q.data ?? []).filter((a) => a.status !== 'CANCELLED').sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart)).forEach((a) => {
      const key = a.services[0]?.staffName || t('Koi bhi stylist');
      m.set(key, [...(m.get(key) ?? []), a]);
    });
    return [...m.entries()];
  }, [q.data]);
  return (
    <Screen title={t('Calendar')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ gap: 12 }}>
        <Row justify="between">
          <IconButton icon={ChevronLeft} flip label={t('Pichla din')} onPress={() => setDay(shiftKey(day, -1))} />
          <Text weight="bold">{formatWeekdayDate(`${day}T12:00:00+05:00`)}</Text>
          <IconButton icon={ChevronRight} flip label={t('Agla din')} onPress={() => setDay(shiftKey(day, 1))} />
        </Row>
        {groups.length === 0 && !q.isLoading && <EmptyState title={t('Is din koi appointment nahi')} />}
        {groups.map(([name, list]) => (
          <Card key={name} flush title={name}>
            {list.map((a, i) => (
              <ListRow key={a.id} divider={i < list.length - 1} onPress={() => setOpen(a.id)} chevron title={`${timeOf(a.scheduledStart)} · ${a.customer?.name ?? a.customerName ?? t('Walk-in customer')}`} subtitle={serviceLine(a.services)}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Text size="sm" ltr>{formatMoney(a.total)}</Text><Badge tone={STATUS[a.status].tone}>{t(STATUS[a.status].label)}</Badge></View>} />
            ))}
          </Card>
        ))}
      </View>
      <AppointmentSheet id={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
