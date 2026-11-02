/**
 * Toy store dashboard: the standard dashboard plus child birthdays,
 * age-group sales, gift packs and safety checks.
 */

import { BarChart3, BookOpen, Cake, Gift, Package, Plus, Receipt, ShieldAlert, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useToystoreOps } from './useToystoreOps';
import { ToystoreAgeGroups, ToystoreBirthdays, ToystoreGiftPacks, toystoreKpis, useToystoreAttention } from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/toystore-products/${id}`;

function useToystoreActions(): QuickAction[] {
  const { data } = useOverview();
  const { birthdays, giftPacks, safetyIssues, totalProducts } = useToystoreOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/toystore/gift-finder', icon: Sparkles, label: t('Gift finder'), hint: t('Umar aur budget se') },
    { to: '/toystore/birthdays', icon: Cake, label: t('Saalgirah'), hint: birthdays.week ? t('{{week}} is hafte', { week: birthdays.week }) : t('{{registered}} darj', { registered: birthdays.registered }) },
    { to: '/toystore/gift-packs', icon: Gift, label: t('Gift packs'), hint: t('{{active}} chaalu', { active: giftPacks.active }) },
    { to: '/toystore/safety-review', icon: ShieldAlert, label: t('Safety'), hint: safetyIssues ? t('{{safetyIssues}} check karein', { safetyIssues }) : t('Sab theek') },
    { to: '/toystore-products/new', icon: Plus, label: t('Naya khilona'), hint: t('Maal me daalein') },
    { to: '/products', icon: Package, label: t('Khilone'), hint: t('{{value}} items', { value: totalProducts || s?.totalProducts || 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const toystoreDashboard = createDashboard({
  label: t('Toy store'),
  productPath,
  openFrom: 10,
  kpis: toystoreKpis,
  defaultKpis: ['toystore-birthdays', 'toystore-safety', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useToystoreAttention,
  widgets: [
    { id: 'toystore-birthdays', title: t('Aane wali saalgirah'), description: t('Agle 30 din me bachon ki saalgirah — parents ko yaad dilayein'), size: 'half', sizes: ANY_SIZE, Component: ToystoreBirthdays },
    { id: 'toystore-age-groups', title: t('Umar ke hisaab se'), description: t('Kis umar ke khilone sab se zyada bikte hain'), size: 'half', sizes: ['third', 'half', 'wide'], Component: ToystoreAgeGroups },
  ],
  lateWidgets: [
    { id: 'toystore-gift-packs', title: t('Top gift packs'), description: t('Sab se zyada bikne wale gift packs'), size: 'third', sizes: ANY_SIZE, Component: ToystoreGiftPacks },
  ],
  useQuickActions: useToystoreActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: Cake, title: t('Saalgirah se sale'), text: t('Bachon ki saalgirah darj karein. Saalgirah se pehle parents ko gift idea bhejein — yeh sab se pakka dobara aane wala customer hai.') },
    { icon: ShieldAlert, title: t('Safety aur umar'), text: t('Jin khilonon par certificate ya choking warning nahi wo "Aaj ka kaam" me aate hain. Umar ke hisaab se sale dekh kar maal mangwayein.') },
  ],
});
