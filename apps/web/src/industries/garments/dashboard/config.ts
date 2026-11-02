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
  GarmentsAlterations, GarmentsCatalog, GarmentsReorder, GarmentsTailoring, GarmentsWorkshop, garmentsKpis, useGarmentsAttention,
} from './widgets';
import { t } from '@core/i18n';

const productPath = (id: string) => `/garment-products/${id}`;

function useGarmentsActions(): QuickAction[] {
  const { data } = useOverview();
  const g = useGarmentsOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/garments/tailoring/new', icon: Scissors, label: t('Silai order'), hint: t('Naya order') },
    { to: '/garments/tailoring', icon: Scissors, label: t('Silai'), hint: t('{{tailoring}} chal rahi', { tailoring: g.pending.tailoring }) },
    { to: '/garments/alterations', icon: Ruler, label: t('Alterations'), hint: t('{{alterations}} baqi', { alterations: g.pending.alterations }) },
    { to: '/garments/measurements', icon: Ruler, label: t('Naap'), hint: t('{{totalMeasurements}} customers', { totalMeasurements: g.totals.totalMeasurements }) },
    { to: '/garments/reservations', icon: BookmarkPlus, label: t('Hold'), hint: t('{{reservations}} chaalu', { reservations: g.pending.reservations }) },
    { to: '/garments/layaway', icon: CreditCard, label: t('Qist plan'), hint: t('{{layaway}} chaalu', { layaway: g.pending.layaway }) },
    { to: '/garments/collections', icon: Palette, label: t('Collections'), hint: t('{{activeCollections}} chaalu', { activeCollections: g.totals.activeCollections }) },
    { to: '/garments/size-charts', icon: Table2, label: t('Size charts'), hint: t('Size ka hisaab') },
    { to: '/garment-products/new', icon: Plus, label: t('Naya kapra'), hint: t('Maal me daalein') },
    { to: '/garments/products', icon: Shirt, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
  ];
}

export const garmentsDashboard = createDashboard({
  label: t('Garments'),
  productPath,
  openFrom: 10,
  kpis: garmentsKpis,
  defaultKpis: ['garments-tailoring', 'garments-alterations', 'profit', 'cash', 'month', 'low-stock'],
  useAttention: useGarmentsAttention,
  widgets: [
    { id: 'garments-tailoring', title: t('Silai — agle 7 din'), description: t('Jo silai order is hafte dene hain'), size: 'third', sizes: ANY_SIZE, Component: GarmentsTailoring },
    { id: 'garments-alterations', title: t('Alterations — agle 7 din'), description: t('Jo alteration is hafte deni hai'), size: 'third', sizes: ANY_SIZE, Component: GarmentsAlterations },
    { id: 'garments-workshop', title: t('Silai ka kaam'), description: t('Silai, alteration, hold, qist aur silai ki kamai'), size: 'third', sizes: ['third', 'half'], Component: GarmentsWorkshop },
  ],
  lateWidgets: [
    { id: 'garments-reorder', title: t('Size reorder'), description: t('Bikne wale size aur rang jo khatam ho rahe'), size: 'third', sizes: ANY_SIZE, Component: GarmentsReorder },
    { id: 'garments-catalog', title: t('Maal ka mix'), description: t('Season aur gender ke hisaab se products'), size: 'half', sizes: ['half', 'wide', 'full'], Component: GarmentsCatalog },
  ],
  useQuickActions: useGarmentsActions,
  moneyMap: { productsPath: '/garments/products' },
  guide: [
    { icon: Scissors, title: t('Silai aur alteration'), text: t('Is hafte jo order dene hain wo date ke saath upar hain. Aaj aur kal wale peele/laal me — taa ke koi customer khali haath na lautay.') },
    { icon: BookmarkPlus, title: t('Hold aur qist'), text: t('Jo kapra kisi ke liye rakha hai aur jin ki qist chal rahi hai — dono ki ginti yahan hai, yaad dilana na bhoolein.') },
  ],
});
