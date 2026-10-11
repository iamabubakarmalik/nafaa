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

const productPath = (id: string) => `/jewelry-items/${id}`;

function useJewelryActions(): QuickAction[] {
  const { data } = useOverview();
  const { rates, orders, metal, karigars } = useJewelryOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Bikri karein' },
    { to: '/jewelry/metal-rates', icon: Coins, label: 'Aaj ka rate', hint: rates.stale ? `${rates.ageDays} din purana` : rates.list.length ? 'Update hai' : 'Lagayein' },
    { to: '/jewelry-items/new', icon: Plus, label: 'Naya zewar', hint: 'Maal me daalein' },
    { to: '/jewelry/custom-orders', icon: Palette, label: 'Custom order', hint: orders.late.length ? `${orders.late.length} late` : `${orders.pending} chaalu` },
    { to: '/jewelry/exchanges', icon: Repeat, label: 'Purana sona', hint: 'Exchange / buyback' },
    { to: '/jewelry/karigars', icon: Hammer, label: 'Karigar', hint: karigars.gramsOut > 0 ? `${fmtGrams(karigars.gramsOut)} baqi` : `${karigars.active} log` },
    { to: '/jewelry/metal-stock', icon: Scale, label: 'Metal stock', hint: `${fmtGrams(metal.gold)} sona` },
    { to: '/jewelry/products', icon: Gem, label: 'Zewar', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/jewelry/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const jewelryDashboard = createDashboard({
  label: 'Jewelry',
  productPath,
  openFrom: 10,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: jewelryKpis,
  defaultKpis: ['jewelry-gold-rate', 'jewelry-weight', 'jewelry-orders', 'profit', 'cash', 'month'],
  useAttention: useJewelryAttention,
  widgets: [
    { id: 'jewelry-rates', title: 'Aaj ke rate', description: 'Sona, chandi aur platinum ka fi gram rate', size: 'third', sizes: ['third', 'half'], Component: JewelryRates },
    { id: 'jewelry-orders', title: 'Custom order', description: 'Banwaye ja rahe zewar, waade ki tareekh se', size: 'third', sizes: ANY_SIZE, Component: JewelryOrders },
    { id: 'jewelry-weight', title: 'Wazan ka hisaab', description: '30 din me kitna sona-chandi bika aur purana kitna aaya', size: 'third', sizes: ['third', 'half', 'wide'], Component: JewelryWeight },
  ],
  lateWidgets: [
    { id: 'jewelry-metal', title: 'Kachcha metal', description: 'Tijori ka sona-chandi, aaj ke rate par', size: 'third', sizes: ANY_SIZE, sensitive: true, Component: JewelryMetal },
    { id: 'jewelry-karigars', title: 'Karigar', description: 'Kis karigar ke paas kitna metal baqi hai', size: 'third', sizes: ANY_SIZE, Component: JewelryKarigars },
  ],
  useQuickActions: useJewelryActions,
  moneyMap: { useExtraTiles: useJewelryMoneyTiles, productsPath: '/jewelry/products' },
  guide: [
    { icon: Coins, title: 'Rate roz subah', text: 'Har bill aaj ke rate par banta hai. Rate purana ho to "Aaj ka kaam" me yaad dilaya jata hai — subah dukaan kholte hi update karein.' },
    { icon: Hammer, title: 'Karigar aur custom order', text: 'Kis karigar ke paas kitna metal hai aur kaunsa order kab dena hai — late order sab se upar laal me aata hai.' },
  ],
});
