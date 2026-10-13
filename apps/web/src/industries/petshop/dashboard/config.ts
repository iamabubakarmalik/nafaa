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

const productPath = (id: string) => `/petshop-products/${id}`;

function usePetshopActions(): QuickAction[] {
  const { data } = useOverview();
  const { grooming, animals, groomers } = usePetshopOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/petshop/grooming/new', icon: Scissors, label: 'Grooming book', hint: 'Nayi appointment' },
    { to: '/petshop/grooming', icon: Scissors, label: 'Grooming', hint: `${grooming.today} aaj` },
    { to: '/petshop/live-animals/new', icon: Heart, label: 'Naya janwar', hint: 'Stock me daalein' },
    { to: '/petshop/live-animals', icon: PawPrint, label: 'Janwar', hint: `${animals.available} bikne wale` },
    { to: '/petshop/groomers', icon: UserCheck, label: 'Groomers', hint: `${groomers} chaalu` },
    { to: '/petshop-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/petshop-products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/reports', icon: BarChart3, label: 'Reports', hint: 'Poora hisaab' },
  ];
}

export const petshopDashboard = createDashboard({
  label: 'Pet shop',
  productPath,
  openFrom: 9,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: petshopKpis,
  defaultKpis: ['petshop-grooming', 'petshop-pickup', 'petshop-animals', 'sales', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: usePetshopAttention,
  widgets: [
    { id: 'petshop-grooming', title: 'Aaj ki grooming', description: 'Aaj ki appointments, waqt aur halat', size: 'half', sizes: ANY_SIZE, Component: PetshopGrooming },
    { id: 'petshop-pickup', title: 'Pet lene aana hai', description: 'Grooming mukammal, maalik ka intezar', size: 'half', sizes: ANY_SIZE, Component: PetshopPickup },
  ],
  lateWidgets: [
    { id: 'petshop-health', title: 'Janwaron ki sehat', description: 'Jin ki vaccine ya deworming baqi hai', size: 'third', sizes: ANY_SIZE, Component: PetshopHealth },
    { id: 'petshop-medicines', title: 'Dawai ki expiry', description: '90 din me expire hone wali dawai aur khurak', size: 'third', sizes: ANY_SIZE, Component: PetshopMedicines },
  ],
  useQuickActions: usePetshopActions,
  moneyMap: { useExtraTiles: usePetshopMoneyTiles, productsPath: '/petshop-products' },
  guide: [
    { icon: Scissors, title: 'Grooming', text: 'Aaj kaunsa pet kab aana hai, kis ka kaam chal raha hai aur kaunsa tayyar ho kar maalik ka intezar kar raha hai — upar hi dikhta hai.' },
    { icon: Activity, title: 'Sehat aur expiry', text: 'Jin janwaron ki vaccine ya deworming baqi hai, aur jo dawai jald expire hogi — dono ki list neeche hai, taa ke kuch nuqsan na ho.' },
  ],
});
