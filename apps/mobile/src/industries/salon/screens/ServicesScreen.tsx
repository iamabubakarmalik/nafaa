/** Salon services and rates (web ServicesPage): list by category, add and edit with price, time, buffers and the service's commission. */

import { Scissors } from 'lucide-react-native';
import { router } from 'expo-router';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge } from '@/design';
import { DeskList } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { salonApi, type SalonService } from '../api';
import { SALON_KEYS, categoryLabel, minutesText } from '../meta';

export function ServicesScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('salonDesk');
  return (
    <DeskList<SalonService[]> title={t('Services')} queryKey={[SALON_KEYS.services, 'all']} fetch={() => salonApi.services.list()} feature="salonDesk" emptyIcon={Scissors} empty={t('Abhi koi service nahi')}
      searchPlaceholder={t('Service ka naam')}
      rows={(list) => list.map((s) => ({
        id: s.id, icon: Scissors, tone: s.isActive ? 'accent' : 'neutral', search: `${s.name} ${categoryLabel(s.category)}`,
        title: s.name, subtitle: `${categoryLabel(s.category)} · ${minutesText(s.durationMinutes)}`,
        trailing: <><Badge tone={s.isActive ? 'success' : 'neutral'}>{formatMoney(s.discountPrice ?? s.price)}</Badge></>,
        onPress: () => router.push({ pathname: '/salon/services/[id]', params: { id: s.id } } as never),
      }))}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => router.push('/salon/services/new' as never)) } : undefined}>
    </DeskList>
  );
}
