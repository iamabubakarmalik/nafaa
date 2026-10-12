/**
 * Carpet dashboard: the standard dashboard plus roll stock, short rolls,
 * new rolls and cut pieces.
 */

import {
  BarChart3, BookOpen, Download, Layers, Package, Plus, Receipt, Ruler, Scissors, ShoppingCart, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useCarpetOps } from './useCarpetOps';
import {
  CarpetRecentRolls, CarpetShortRolls, CarpetStock, carpetKpis, useCarpetAttention, useCarpetMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/carpet-products/${id}`;

function useCarpetActions(): QuickAction[] {
  const { data } = useOverview();
  const c = useCarpetOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS', hint: 'Bikri karein' },
    { to: '/carpet-products/new', icon: Plus, label: 'Naya carpet', hint: 'Maal me daalein' },
    { to: '/carpet-rolls', icon: Layers, label: 'Rolls', hint: `${c.rolls} chaalu` },
    { to: '/carpet-cut-pieces', icon: Scissors, label: 'Cut pieces', hint: `${c.pieces} pieces` },
    { to: '/reports', icon: BarChart3, label: 'Carpet reports', hint: 'Sqft ka hisaab' },
    { to: '/carpet-bulk-import', icon: Download, label: 'Bulk import', hint: 'Excel / CSV' },
    { to: '/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Bikri record', hint: 'Purane bill' },
  ];
}

export const carpetDashboard = createDashboard({
  label: 'Carpet',
  productPath,
  openFrom: 9,
  kpis: carpetKpis,
  defaultKpis: ['carpet-sqft', 'carpet-rolls', 'carpet-short-rolls', 'profit', 'cash', 'month'],
  useAttention: useCarpetAttention,
  widgets: [
    { id: 'carpet-stock', title: 'Rolls ka stock', description: 'Rolls, lambai, sqft aur cut pieces', size: 'wide', sizes: ['half', 'wide', 'full'], Component: CarpetStock },
    { id: 'carpet-short-rolls', title: 'Chhote rolls', description: '10 ft se kam lambai wale rolls', size: 'third', sizes: ANY_SIZE, Component: CarpetShortRolls },
  ],
  lateWidgets: [
    { id: 'carpet-recent-rolls', title: 'Naye rolls', description: 'Haal hi me aaye rolls aur un ka rate', size: 'third', sizes: ANY_SIZE, Component: CarpetRecentRolls },
  ],
  useQuickActions: useCarpetActions,
  moneyMap: { useExtraTiles: useCarpetMoneyTiles },
  guide: [
    { icon: Ruler, title: 'Rolls aur sqft', text: 'Har roll ki baqi lambai aur sqft yahan jama hoti hai. "Rolls theek" ka matlab hai kitne rolls me abhi 10 ft se zyada maal hai.' },
    { icon: Scissors, title: 'Cut pieces', text: 'Roll se bacha tukda cut piece ban jata hai. Chhote order par pehle ye dikhayein — paisa phansa nahi rehta.' },
  ],
});
