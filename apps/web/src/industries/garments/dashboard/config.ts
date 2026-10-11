/**
 * Garments dashboard: the standard dashboard plus tailoring, alterations,
 * holds and the catalogue mix.
 */

import {
  BookmarkPlus, BookOpen, CreditCard, Palette, Plus, Receipt, Ruler, Scissors, Shirt, ShoppingCart, Table2, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useGarmentsOps } from './useGarmentsOps';
import {
  GarmentsAlterations, GarmentsCatalog, GarmentsTailoring, GarmentsWorkshop, garmentsKpis, useGarmentsAttention,
} from './widgets';

const productPath = (id: string) => `/garment-products/${id}`;

function useGarmentsActions(): QuickAction[] {
  const { data } = useOverview();
  const g = useGarmentsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Bikri karein' },
    { to: '/garments/tailoring/new', icon: Scissors, label: 'Silai order', hint: 'Naya order' },
    { to: '/garments/tailoring', icon: Scissors, label: 'Silai', hint: `${g.pending.tailoring} chal rahi` },
    { to: '/garments/alterations', icon: Ruler, label: 'Alterations', hint: `${g.pending.alterations} baqi` },
    { to: '/garments/measurements', icon: Ruler, label: 'Naap', hint: `${g.totals.totalMeasurements} customers` },
    { to: '/garments/reservations', icon: BookmarkPlus, label: 'Hold', hint: `${g.pending.reservations} chaalu` },
    { to: '/garments/layaway', icon: CreditCard, label: 'Qist plan', hint: `${g.pending.layaway} chaalu` },
    { to: '/garments/collections', icon: Palette, label: 'Collections', hint: `${g.totals.activeCollections} chaalu` },
    { to: '/garments/size-charts', icon: Table2, label: 'Size charts', hint: 'Size ka hisaab' },
    { to: '/garment-products/new', icon: Plus, label: 'Naya kapra', hint: 'Maal me daalein' },
    { to: '/garments/products', icon: Shirt, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
  ];
}

export const garmentsDashboard = createDashboard({
  label: 'Garments',
  productPath,
  openFrom: 10,
  kpis: garmentsKpis,
  defaultKpis: ['garments-tailoring', 'garments-alterations', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useGarmentsAttention,
  widgets: [
    { id: 'garments-tailoring', title: 'Silai — agle 7 din', description: 'Jo silai order is hafte dene hain', size: 'third', sizes: ANY_SIZE, Component: GarmentsTailoring },
    { id: 'garments-alterations', title: 'Alterations — agle 7 din', description: 'Jo alteration is hafte deni hai', size: 'third', sizes: ANY_SIZE, Component: GarmentsAlterations },
    { id: 'garments-workshop', title: 'Silai ka kaam', description: 'Silai, alteration, hold, qist aur silai ki kamai', size: 'third', sizes: ['third', 'half'], Component: GarmentsWorkshop },
  ],
  lateWidgets: [
    { id: 'garments-catalog', title: 'Maal ka mix', description: 'Season aur gender ke hisaab se products', size: 'half', sizes: ['half', 'wide', 'full'], Component: GarmentsCatalog },
  ],
  useQuickActions: useGarmentsActions,
  moneyMap: { productsPath: '/garments/products' },
  guide: [
    { icon: Scissors, title: 'Silai aur alteration', text: 'Is hafte jo order dene hain wo tareekh ke saath upar hain. Aaj aur kal wale peele/laal me — taa ke koi customer khali haath na lautay.' },
    { icon: BookmarkPlus, title: 'Hold aur qist', text: 'Jo kapra kisi ke liye rakha hai aur jin ki qist chal rahi hai — dono ki ginti yahan hai, yaad dilana na bhoolein.' },
  ],
});
