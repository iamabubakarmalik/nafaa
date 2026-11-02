/**
 * Jewelry dashboard: the standard dashboard plus metal rates, raw metal,
 * custom orders, weight sold and karigar balances.
 */

import {
  BarChart3, BookOpen, Coins, Gem, Hammer, Palette, Plus, Receipt, Repeat, Scale, ShoppingCart, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { fmtGrams, useJewelryOps } from './useJewelryOps';
import {
  JewelryKarigars, JewelryMetal, JewelryOrders, JewelryRates, JewelryWeight, jewelryKpis, useJewelryAttention, useJewelryMoneyTiles,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/jewelry-items/${id}`;

function useJewelryActions(): QuickAction[] {
  const { data } = useOverview();
  const { rates, orders, metal, karigars } = useJewelryOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/jewelry/metal-rates', icon: Coins, label: t('Aaj ka rate'), hint: rates.stale ? t('{{ageDays}} din purana', { ageDays: rates.ageDays }) : rates.list.length ? t('Update hai') : t('Lagayein') },
    { to: '/jewelry-items/new', icon: Plus, label: t('Naya zewar'), hint: t('Maal me daalein') },
    { to: '/jewelry/custom-orders', icon: Palette, label: t('Custom order'), hint: orders.late.length ? t('{{count}} late', { count: orders.late.length }) : t('{{pending}} chaalu', { pending: orders.pending }) },
    { to: '/jewelry/exchanges', icon: Repeat, label: t('Purana sona'), hint: t('Exchange / buyback') },
    { to: '/jewelry/karigars', icon: Hammer, label: t('Karigar'), hint: karigars.gramsOut > 0 ? t('{{gramsOut}} baqi', { gramsOut: fmtGrams(karigars.gramsOut) }) : t('{{active}} log', { active: karigars.active }) },
    { to: '/jewelry/metal-stock', icon: Scale, label: t('Metal stock'), hint: t('{{gold}} sona', { gold: fmtGrams(metal.gold) }) },
    { to: '/jewelry/products', icon: Gem, label: t('Zewar'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/jewelry/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const jewelryDashboard = createDashboard({
  label: t('Jewelry'),
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: jewelryKpis,
  defaultKpis: ['jewelry-gold-rate', 'jewelry-weight', 'jewelry-orders', 'profit', 'cash', 'month'],
  useAttention: useJewelryAttention,
  widgets: [
    { id: 'jewelry-rates', title: t('Aaj ke rate'), description: t('Sona, chandi aur platinum ka fi gram rate'), size: 'third', sizes: ['third', 'half'], Component: JewelryRates },
    { id: 'jewelry-orders', title: t('Custom order'), description: t('Banwaye ja rahe zewar, waade ki date se'), size: 'third', sizes: ANY_SIZE, Component: JewelryOrders },
    { id: 'jewelry-weight', title: t('Wazan ka hisaab'), description: t('30 din me kitna sona-chandi bika aur purana kitna aaya'), size: 'third', sizes: ['third', 'half', 'wide'], Component: JewelryWeight },
  ],
  lateWidgets: [
    { id: 'jewelry-metal', title: t('Kachcha metal'), description: t('Tijori ka sona-chandi, aaj ke rate par'), size: 'third', sizes: ANY_SIZE, sensitive: true, Component: JewelryMetal },
    { id: 'jewelry-karigars', title: t('Karigar'), description: t('Kis karigar ke paas kitna metal baqi hai'), size: 'third', sizes: ANY_SIZE, Component: JewelryKarigars },
  ],
  useQuickActions: useJewelryActions,
  moneyMap: { useExtraTiles: useJewelryMoneyTiles, productsPath: '/jewelry/products' },
  guide: [
    { icon: Coins, title: t('Rate roz subah'), text: t('Har bill aaj ke rate par banta hai. Rate purana ho to "Aaj ka kaam" me yaad dilaya jata hai — subah dukaan kholte hi update karein.') },
    { icon: Hammer, title: t('Karigar aur custom order'), text: t('Kis karigar ke paas kitna metal hai aur kaunsa order kab dena hai — late order sab se upar laal me aata hai.') },
  ],
});
