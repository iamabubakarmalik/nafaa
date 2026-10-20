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

const productPath = (id: string) => `/toystore-products/${id}`;

function useToystoreActions(): QuickAction[] {
  const { data } = useOverview();
  const { birthdays, giftPacks, safetyIssues, totalProducts } = useToystoreOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Sale karein' },
    { to: '/toystore/gift-finder', icon: Sparkles, label: 'Gift finder', hint: 'Umar aur budget se' },
    { to: '/toystore/birthdays', icon: Cake, label: 'Saalgirah', hint: birthdays.week ? `${birthdays.week} is hafte` : `${birthdays.registered} darj` },
    { to: '/toystore/gift-packs', icon: Gift, label: 'Gift packs', hint: `${giftPacks.active} chaalu` },
    { to: '/toystore/safety-review', icon: ShieldAlert, label: 'Safety', hint: safetyIssues ? `${safetyIssues} check karein` : 'Sab theek' },
    { to: '/toystore-products/new', icon: Plus, label: 'Naya khilona', hint: 'Maal me daalein' },
    { to: '/products', icon: Package, label: 'Khilone', hint: `${totalProducts || s?.totalProducts || 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const toystoreDashboard = createDashboard({
  label: 'Toy store',
  productPath,
  openFrom: 10,
  kpis: toystoreKpis,
  defaultKpis: ['toystore-birthdays', 'toystore-safety', 'profit', 'month', 'cash', 'low-stock'],
  useAttention: useToystoreAttention,
  widgets: [
    { id: 'toystore-birthdays', title: 'Aane wali saalgirah', description: 'Agle 30 din me bachon ki saalgirah — parents ko yaad dilayein', size: 'half', sizes: ANY_SIZE, Component: ToystoreBirthdays },
    { id: 'toystore-age-groups', title: 'Umar ke hisaab se', description: 'Kis umar ke khilone sab se zyada bikte hain', size: 'half', sizes: ['third', 'half', 'wide'], Component: ToystoreAgeGroups },
  ],
  lateWidgets: [
    { id: 'toystore-gift-packs', title: 'Top gift packs', description: 'Sab se zyada bikne wale gift packs', size: 'third', sizes: ANY_SIZE, Component: ToystoreGiftPacks },
  ],
  useQuickActions: useToystoreActions,
  moneyMap: { productsPath: '/products' },
  guide: [
    { icon: Cake, title: 'Saalgirah se sale', text: 'Bachon ki saalgirah darj karein. Saalgirah se pehle parents ko gift idea bhejein — yeh sab se pakka dobara aane wala customer hai.' },
    { icon: ShieldAlert, title: 'Safety aur umar', text: 'Jin khilonon par certificate ya choking warning nahi wo "Aaj ka kaam" me aate hain. Umar ke hisaab se sale dekh kar maal mangwayein.' },
  ],
});
