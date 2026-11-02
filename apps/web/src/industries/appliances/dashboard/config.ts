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
import { t } from '@core/i18n';

const productPath = (id: string) => `/appliance-products/${id}`;

function useAppliancesActions(): QuickAction[] {
  const { data } = useOverview();
  const { work, delivery, amc, claims, tech } = useAppliancesOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS counter'), hint: t('Sale karein') },
    { to: '/appliances/service-requests', icon: Wrench, label: t('Repair'), hint: work.repairsOpen ? t('{{repairsOpen}} khule', { repairsOpen: work.repairsOpen }) : t('Kaam darj karein') },
    { to: '/appliances/installations', icon: HardHat, label: t('Installation'), hint: t('{{installsToday}} aaj', { installsToday: work.installsToday }) },
    { to: '/appliances/deliveries', icon: Truck, label: t('Delivery'), hint: t('{{value}} baqi', { value: delivery?.open ?? 0 }) },
    { to: '/appliances/technicians', icon: Users, label: t('Technicians'), hint: t('{{value}} khali', { value: tech?.free ?? 0 }) },
    { to: '/appliances/amc-contracts', icon: ShieldCheck, label: t('AMC'), hint: t('{{value}} chal rahe', { value: amc?.active ?? 0 }) },
    { to: '/appliances/warranty-claims', icon: ShieldCheck, label: t('Warranty claims'), hint: t('{{value}} khule', { value: claims?.open ?? 0 }) },
    { to: '/appliances/serials', icon: Barcode, label: t('Serial register'), hint: t('Unit ka safar') },
    { to: '/appliance-products/new', icon: Plus, label: t('Naya product'), hint: t('Maal me daalein') },
    { to: '/appliance-products', icon: Package, label: t('Products'), hint: t('{{value}} items', { value: s?.totalProducts ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sales history'), hint: t('Purani receipts') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const appliancesDashboard = createDashboard({
  label: t('Appliances'),
  productPath,
  openFrom: 10,
  kpis: appliancesKpis,
  defaultKpis: ['appliances-repairs', 'appliances-installs', 'appliances-service-due', 'profit', 'cash', 'month'],
  useAttention: useAppliancesAttention,
  widgets: [
    { id: 'appliances-jobs', title: t('Aaj ka field kaam'), description: t('Aaj ki installation aur repair queue, late aur foran wale pehle'), size: 'half', sizes: ANY_SIZE, Component: AppliancesJobs },
    { id: 'appliances-services', title: t('Service ka haal'), description: t('Repair, installation, delivery, AMC, claims aur serial stock'), size: 'half', sizes: ['half', 'wide', 'full'], Component: AppliancesServices },
  ],
  lateWidgets: [
    { id: 'appliances-streams', title: t('Kamai kahan se'), description: t('Maal, installation, repair, AMC aur delivery ka 30 din ka hissa'), size: 'third', sizes: ['third', 'half', 'wide'], Component: AppliancesStreams },
    { id: 'appliances-technicians', title: t('Technicians'), description: t('Kis ke haath me kitna kaam, is mahine ki kamai aur rating'), size: 'third', sizes: ANY_SIZE, Component: AppliancesTechnicians },
  ],
  useQuickActions: useAppliancesActions,
  moneyMap: { useExtraTiles: useAppliancesMoneyTiles, productsPath: '/appliance-products' },
  guide: [
    { icon: HardHat, title: t('Field kaam'), text: t('Aaj ki installation aur repair ek hi list me — late aur foran wale upar. Jis kaam par "banda nahi laga" likha ho, subah hi technician de dein.') },
    { icon: ShieldCheck, title: t('Services aur claims'), text: t('Installation, repair aur AMC me margin sab se zyada hai. Warranty repair ka brand se claim zaroor banayein — warna wo paisa dukaan ki jeb se jata hai.') },
  ],
});
