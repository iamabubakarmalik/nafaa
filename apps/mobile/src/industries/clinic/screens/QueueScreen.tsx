/** Live queue (web QueuePage): today's patients in calling order (emergency, in the room, waiting, booked); one tap moves each along. */

import { useQuery } from '@tanstack/react-query';
import { Timer } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { isLate, queueOrder } from '@nafaa/core/industries/clinic';
import { t } from '@/core/i18n';
import { Badge, Chip, ListRow, Screen, Text, EmptyState, Card } from '@/design';
import { OfflineNote, todayKey } from '../../_shared/deskKit';
import { clinicApi } from '../api';
import { APT_STATUS, CLINIC_KEYS, doctorName } from '../meta';
import { VisitSheet } from './VisitSheet';
import { formatTime } from '@/core/format';

export function QueueScreen() {
  const [doctor, setDoctor] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const docs = useQuery({ queryKey: [CLINIC_KEYS.doctors, 'active'], queryFn: () => clinicApi.doctors.list({ active: true }) });
  const q = useQuery({ queryKey: [CLINIC_KEYS.queue, doctor], queryFn: () => clinicApi.appointments.queue(doctor || undefined, todayKey()), refetchInterval: 15_000 });
  const list = queueOrder(q.data ?? []);
  const now = Date.now();
  return (
    <Screen title={t('Live queue')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ gap: 12 }}>
        <OfflineNote feature="clinicDesk" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('Sab doctors')} selected={!doctor} onPress={() => setDoctor('')} />
          {(docs.data ?? []).map((d) => <Chip key={d.id} label={doctorName(d)} selected={doctor === d.id} onPress={() => setDoctor(d.id)} />)}
        </View>
        {list.length === 0 && !q.isLoading && <EmptyState icon={Timer} title={t('Abhi koi mareez nahi')} />}
        <Card flush>
          {list.map((a, i) => (
            <ListRow key={a.id} divider={i < list.length - 1} chevron onPress={() => setOpen(a.id)} icon={Timer} iconTone={a.isEmergency ? 'danger' : APT_STATUS[a.status].tone}
              title={`${a.tokenNumber ? `#${a.tokenNumber} · ` : ''}${a.patient?.fullName ?? ''}`} subtitle={`${doctorName(a.doctor)} · ${formatTime(a.scheduledStart)}${a.chiefComplaint ? ` · ${a.chiefComplaint}` : ''}`}
              trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}>{a.isEmergency && <Badge tone="danger">{t('Emergency')}</Badge>}{isLate(a, now) && <Text size="2xs" tone="warning">{t('Late')}</Text>}<Badge tone={APT_STATUS[a.status].tone}>{t(APT_STATUS[a.status].label)}</Badge></View>} />
          ))}
        </Card>
      </View>
      <VisitSheet id={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}
