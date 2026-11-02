/**
 * Pet-shop dashboard: the standard dashboard plus grooming, pet pickups,
 * animal health and medicine expiry.
 */

import { Activity, BarChart3, BookOpen, Heart, Package, PawPrint, Plus, Receipt, Scissors, ShoppingCart, UserCheck, Users } from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { usePetshopOps } from './usePetshopOps';
import {
  PetshopGrooming, PetshopHealth, PetshopMedicines, PetshopPickup, petshopKpis, usePetshopAttention, usePetshopMoneyTiles,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/petshop-products/${id}`;

function usePetshopActions(): QuickAction[] {
  const { data } = useOverview();
  const { grooming, animals, groomers } = usePetshopOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/petshop/grooming/new', icon: Scissors, label: t('Grooming book'), hint: t('Nayi appointment') },
    { to: '/petshop/grooming', icon: Scissors, label: t('Grooming'), hint: t('{{today}} aaj', { today: grooming.today }) },
    { to: '/petshop/live-animals/new', icon: Heart, label: t('Naya janwar'), hint: t('Stock me daalein') },
    { to: '/petshop/live-animals', icon: PawPrint, label: t('Janwar'), hint: t('{{available}} bikne wale', { available: animals.available }) },
    { to: '/petshop/groomers', icon: UserCheck, label: t('Groomers'), hint: t('{{groomers}} chaalu', { groomers }) },
    { to: '/petshop-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/petshop-products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/reports', icon: BarChart3, label: t('Reports'), hint: t('Poora hisaab') },
  ];
}

export const petshopDashboard = createDashboard({
  label: t('Pet shop'),
  productPath,
  openFrom: 9,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: petshopKpis,
  defaultKpis: ['petshop-grooming', 'petshop-pickup', 'petshop-animals', 'sales', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: usePetshopAttention,
  widgets: [
    { id: 'petshop-grooming', title: t('Aaj ki grooming'), description: t('Aaj ki appointments, waqt aur halat'), size: 'half', sizes: ANY_SIZE, Component: PetshopGrooming },
    { id: 'petshop-pickup', title: t('Pet lene aana hai'), description: t('Grooming mukammal, maalik ka intezar'), size: 'half', sizes: ANY_SIZE, Component: PetshopPickup },
  ],
  lateWidgets: [
    { id: 'petshop-health', title: t('Janwaron ki sehat'), description: t('Jin ki vaccine ya deworming baqi hai'), size: 'third', sizes: ANY_SIZE, Component: PetshopHealth },
    { id: 'petshop-medicines', title: t('Dawai ki expiry'), description: t('90 din me expire hone wali dawai aur khurak'), size: 'third', sizes: ANY_SIZE, Component: PetshopMedicines },
  ],
  useQuickActions: usePetshopActions,
  moneyMap: { useExtraTiles: usePetshopMoneyTiles, productsPath: '/petshop-products' },
  guide: [
    { icon: Scissors, title: t('Grooming'), text: t('Aaj kaunsa pet kab aana hai, kis ka kaam chal raha hai aur kaunsa tayyar ho kar maalik ka intezar kar raha hai — upar hi dikhta hai.') },
    { icon: Activity, title: t('Sehat aur expiry'), text: t('Jin janwaron ki vaccine ya deworming baqi hai, aur jo dawai jald expire hogi — dono ki list neeche hai, taa ke kuch nuqsan na ho.') },
  ],
});
