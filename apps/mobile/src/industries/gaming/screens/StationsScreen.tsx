/** Stations (web GamingStationsPage): consoles and PCs with their hourly rate and minimum time; add, edit, send for maintenance. */

import { Monitor } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, toast } from '@/design';
import { DeskList, FormSheet, clean } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { gamingApi, type GamingStation } from '../api';
import { GAMING_KEYS, STATION_TYPES, refreshGaming, stationTypeOptions } from '../meta';

export function StationsScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('gamingDesk');
  const [form, setForm] = useState<GamingStation | 'new' | null>(null);
  return (
    <DeskList<GamingStation[]> title={t('Stations')} queryKey={[GAMING_KEYS.stations, 'all']} fetch={() => gamingApi.stations.list()} feature="gamingDesk" emptyIcon={Monitor} empty={t('Abhi koi station nahi')}
      rows={(list) => list.map((s) => ({
        id: s.id, icon: Monitor, tone: !s.isActive ? 'neutral' : s.isUnderMaintenance ? 'warning' : s.currentSession ? 'success' : 'accent', search: `${s.name} ${s.stationNumber}`, title: s.name,
        subtitle: `${s.stationNumber} · ${t(STATION_TYPES[s.stationType] ?? s.stationType)} · ${t('Kam az kam {{n}} min', { n: s.minimumMinutes })}`,
        trailing: <Badge tone={s.isUnderMaintenance ? 'warning' : s.currentSession ? 'success' : 'neutral'}>{s.isUnderMaintenance ? t('Maintenance') : `${formatMoney(s.pricePerHour)}/${t('ghanta')}`}</Badge>, onPress: canEdit ? () => guard(() => setForm(s)) : undefined,
      }))}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => setForm('new')) } : undefined}>
      <FormSheet open={!!form} title={form === 'new' ? t('New station') : t('Edit station')} onClose={() => setForm(null)}
        fields={[{ key: 'name', label: t('Naam'), required: true }, { key: 'stationType', label: t('Qism'), kind: 'select', options: stationTypeOptions(), required: true }, { key: 'pricePerHour', label: t('Rate / ghanta'), kind: 'money', required: true }, { key: 'minimumMinutes', label: t('Kam az kam minute'), kind: 'number' }, { key: 'location', label: t('Jagah') }, { key: 'isActive', label: t('Chalu'), kind: 'switch' }]}
        initial={form && form !== 'new' ? { ...form } : { stationType: 'PS5_STATION', minimumMinutes: 15, isActive: true }}
        extra={form && form !== 'new' ? <Button variant="soft" onPress={() => { const f = form; setForm(null); guard(() => void gamingApi.stations.maintenance(f.id).then(() => { refreshGaming(); toast.success(t('Ho gaya')); })); }}>{form.isUnderMaintenance ? t('Maintenance khatam') : t('Maintenance par bhejein')}</Button> : undefined}
        onSubmit={async (v) => { const b = clean({ ...v, pricePerHour: v.pricePerHour ?? 0, minimumMinutes: v.minimumMinutes ?? 0, isActive: v.isActive ?? true, installedGames: (form !== 'new' && form?.installedGames) || [] }); if (form === 'new') await gamingApi.stations.create(b); else await gamingApi.stations.update((form as GamingStation).id, b); refreshGaming(); toast.success(t('Save ho gaya')); }} />
    </DeskList>
  );
}
