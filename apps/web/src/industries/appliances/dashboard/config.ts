/**
 * Appliances dashboard: the standard dashboard plus field work (repairs,
 * installations), service health, revenue by stream and technicians.
 */

import {
  BarChart3, Barcode, BookOpen, HardHat, Package, Plus, Receipt, ShieldCheck, ShoppingCart, Truck, Users, Wrench,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useAppliancesOps } from './useAppliancesOps';
import {
  AppliancesJobs, AppliancesServices, AppliancesStreams, AppliancesTechnicians, appliancesKpis, useAppliancesAttention,
  useAppliancesMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/appliance-products/${id}`;

function useAppliancesActions(): QuickAction[] {
  const { data } = useOverview();
  const { work, delivery, amc, claims, tech } = useAppliancesOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Bikri karein' },
    { to: '/appliances/service-requests', icon: Wrench, label: 'Repair', hint: work.repairsOpen ? `${work.repairsOpen} khule` : 'Kaam darj karein' },
    { to: '/appliances/installations', icon: HardHat, label: 'Installation', hint: `${work.installsToday} aaj` },
    { to: '/appliances/deliveries', icon: Truck, label: 'Delivery', hint: `${delivery?.open ?? 0} baqi` },
    { to: '/appliances/technicians', icon: Users, label: 'Technicians', hint: `${tech?.free ?? 0} khali` },
    { to: '/appliances/amc-contracts', icon: ShieldCheck, label: 'AMC', hint: `${amc?.active ?? 0} chal rahe` },
    { to: '/appliances/warranty-claims', icon: ShieldCheck, label: 'Warranty claims', hint: `${claims?.open ?? 0} khule` },
    { to: '/appliances/serials', icon: Barcode, label: 'Serial register', hint: 'Unit ka safar' },
    { to: '/appliance-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/appliance-products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const appliancesDashboard = createDashboard({
  label: 'Appliances',
  productPath,
  openFrom: 10,
  kpis: appliancesKpis,
  defaultKpis: ['appliances-repairs', 'appliances-installs', 'appliances-service-due', 'profit', 'cash', 'month'],
  useAttention: useAppliancesAttention,
  widgets: [
    { id: 'appliances-jobs', title: 'Aaj ka field kaam', description: 'Aaj ki installation aur repair queue, late aur foran wale pehle', size: 'half', sizes: ANY_SIZE, Component: AppliancesJobs },
    { id: 'appliances-services', title: 'Service ka haal', description: 'Repair, installation, delivery, AMC, claims aur serial stock', size: 'half', sizes: ['half', 'wide', 'full'], Component: AppliancesServices },
  ],
  lateWidgets: [
    { id: 'appliances-streams', title: 'Kamai kahan se', description: 'Maal, installation, repair, AMC aur delivery ka 30 din ka hissa', size: 'third', sizes: ['third', 'half', 'wide'], Component: AppliancesStreams },
    { id: 'appliances-technicians', title: 'Technicians', description: 'Kis ke haath me kitna kaam, is mahine ki kamai aur rating', size: 'third', sizes: ANY_SIZE, Component: AppliancesTechnicians },
  ],
  useQuickActions: useAppliancesActions,
  moneyMap: { useExtraTiles: useAppliancesMoneyTiles, productsPath: '/appliance-products' },
  guide: [
    { icon: HardHat, title: 'Field kaam', text: 'Aaj ki installation aur repair ek hi list me — late aur foran wale upar. Jis kaam par "banda nahi laga" likha ho, subah hi technician de dein.' },
    { icon: ShieldCheck, title: 'Services aur claims', text: 'Installation, repair aur AMC me margin sab se zyada hai. Warranty repair ka brand se claim zaroor banayein — warna wo paisa dukaan ki jeb se jata hai.' },
  ],
});
