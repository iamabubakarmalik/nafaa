/** Game and gear profiles (web GamingProductsPage): platform, condition, rental rates and flags for each product; tap one to edit, or add one for a product. */

import { Gamepad2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { DeskList } from '../../_shared/serviceKit';
import { gamingApi, type GamingProductProfile } from '../api';
import { CONDITIONS, GAMING_KEYS, PLATFORMS } from '../meta';

export function ProductsScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('gamingDesk');
  return (
    <DeskList<GamingProductProfile[]> title={t('Game profiles')} queryKey={[GAMING_KEYS.profiles, 'all']} fetch={() => gamingApi.profiles.list()} feature="gamingDesk" emptyIcon={Gamepad2} empty={t('Abhi koi profile nahi')} searchPlaceholder={t('Naam, platform ya publisher')}
      filters={[{ value: 'all', label: t('Sab') }, { value: 'used', label: t('Used') }, { value: 'rent', label: t('Kiraye ke liye') }]}
      rows={(list) => list.map((p) => ({
        id: p.id, icon: Gamepad2, tone: p.conditionType === 'NEW_SEALED' ? 'accent' : 'warning', filter: p.conditionType !== 'NEW_SEALED' ? 'used' : p.isRentable ? 'rent' : 'all',
        search: `${p.product?.name ?? ''} ${p.platform} ${p.publisher ?? ''} ${p.genre.join(' ')}`, title: p.product?.name ?? '—',
        subtitle: [t(PLATFORMS[p.platform] ?? p.platform), t(CONDITIONS[p.conditionType] ?? p.conditionType), p.region].filter(Boolean).join(' · '),
        trailing: <Badge tone={p.isRentable ? 'info' : 'neutral'}>{formatMoney(p.product?.price ?? 0)}</Badge>,
        onPress: () => router.push({ pathname: '/gaming/products/[id]', params: { id: p.productId } } as never),
      }))}
      fab={canEdit ? { label: t('New'), onPress: () => guard(() => router.push('/gaming/products/new' as never)) } : undefined} />
  );
}
