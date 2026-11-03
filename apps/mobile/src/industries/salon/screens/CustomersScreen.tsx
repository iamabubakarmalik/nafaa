/** Salon customers (web CustomersPage): visits, spend and the hair or skin notes kept for each, with search. */

import { Heart } from 'lucide-react-native';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { Badge } from '@/design';
import { DeskList } from '../../_shared/serviceKit';
import { salonApi, type ProfileRow } from '../api';
import { SALON_KEYS, dateOf } from '../meta';

export function SalonCustomersScreen() {
  return (
    <DeskList<{ items: ProfileRow[] }> title={t('Salon customers')} queryKey={[SALON_KEYS.customers]} fetch={() => salonApi.customers.page({ limit: 100 })} feature="salonDesk" emptyIcon={Heart} empty={t('Abhi koi customer nahi')}
      searchPlaceholder={t('Naam ya phone')}
      rows={(d) => d.items.map((r) => ({
        id: r.customer.id, icon: Heart, tone: r.profile?.allergies?.length ? 'danger' : 'accent', search: `${r.customer.name} ${r.customer.phone ?? ''}`,
        title: r.customer.name, subtitle: `${r.customer.phone ?? ''}${r.profile?.lastVisitAt ? ` · ${t('Akhri visit')} ${dateOf(r.profile.lastVisitAt)}` : ''}`,
        trailing: <Badge tone="neutral">{t('{{n}} visits · {{amount}}', { n: r.profile?.totalVisits ?? 0, amount: formatMoney(r.profile?.totalSpent ?? 0) })}</Badge>,
      }))} />
  );
}
