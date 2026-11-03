/** Season rates (web RatePlansPage): a price change between two dates, as a percent or an amount, for the nights it covers. */

import { Award } from 'lucide-react-native';
import { router } from 'expo-router';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, confirm, toast } from '@/design';
import { DeskList } from '../../_shared/serviceKit';
import { useDeskOnline } from '../../_shared/deskKit';
import { hotelApi, type RatePlan } from '../api';
import { HOTEL_KEYS, dateOf, refreshHotel } from '../meta';

const PLAN_TYPES = [['SEASON', t('Season')], ['PEAK', t('Peak')], ['OFF_SEASON', t('Off season')], ['WEEKEND', t('Weekend')], ['PROMO', t('Offer')], ['CORPORATE', t('Company')], ['LONG_STAY', t('Lamba qayam')]] as const;

export function RatePlansScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('hotelDesk');
  const off = async (p: RatePlan) => {
    if (!(await confirm({ title: t('Ye rate band karein?'), tone: 'danger', confirmLabel: t('Haan') }))) return;
    await hotelApi.ratePlans.remove(p.id); refreshHotel(); toast.success(t('Band ho gayi'));
  };
  return (
    <DeskList<RatePlan[]> title={t('Season rates')} queryKey={[HOTEL_KEYS.ratePlans]} fetch={() => hotelApi.ratePlans.list()} feature="hotelDesk" emptyIcon={Award} empty={t('Abhi koi season rate nahi')}
      rows={(list) => list.map((p) => ({
        id: p.id, icon: Award, tone: p.isActive ? 'accent' : 'neutral', search: `${p.name} ${p.code}`, title: p.name, subtitle: `${dateOf(p.startDate)} – ${dateOf(p.endDate)}`,
        trailing: <Badge tone={p.adjustment >= 0 ? 'warning' : 'success'}>{`${p.adjustment >= 0 ? '+' : ''}${p.adjustment}${p.isPercentage ? '%' : ''}`}</Badge>, onPress: canEdit ? () => guard(() => router.push({ pathname: '/hotel/rate-plans/[id]', params: { id: p.id } } as never)) : undefined,
      }))}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => router.push('/hotel/rate-plans/new' as never)) } : undefined}>
    </DeskList>
  );
}
