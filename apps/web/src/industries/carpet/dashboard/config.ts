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
import { t } from '@core/i18n';

const productPath = (id: string) => `/carpet-products/${id}`;

function useCarpetActions(): QuickAction[] {
  const { data } = useOverview();
  const c = useCarpetOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('POS'), hint: t('Sale karein') },
    { to: '/carpet-products/new', icon: Plus, label: t('Naya carpet'), hint: t('Maal me daalein') },
    { to: '/carpet-rolls', icon: Layers, label: t('Rolls'), hint: t('{{rolls}} chaalu', { rolls: c.rolls }) },
    { to: '/carpet-cut-pieces', icon: Scissors, label: t('Cut pieces'), hint: t('{{pieces}} pieces', { pieces: c.pieces }) },
    { to: '/reports', icon: BarChart3, label: t('Carpet reports'), hint: t('Sqft ka hisaab') },
    { to: '/carpet-bulk-import', icon: Download, label: t('Bulk import'), hint: t('Excel / CSV') },
    { to: '/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
  ];
}

export const carpetDashboard = createDashboard({
  label: t('Carpet'),
  productPath,
  openFrom: 9,
  kpis: carpetKpis,
  defaultKpis: ['carpet-sqft', 'carpet-rolls', 'carpet-short-rolls', 'profit', 'cash', 'month'],
  useAttention: useCarpetAttention,
  widgets: [
    { id: 'carpet-stock', title: t('Rolls ka stock'), description: t('Rolls, lambai, sqft aur cut pieces'), size: 'wide', sizes: ['half', 'wide', 'full'], Component: CarpetStock },
    { id: 'carpet-short-rolls', title: t('Chhote rolls'), description: t('10 ft se kam lambai wale rolls'), size: 'third', sizes: ANY_SIZE, Component: CarpetShortRolls },
  ],
  lateWidgets: [
    { id: 'carpet-recent-rolls', title: t('Naye rolls'), description: t('Haal hi me aaye rolls aur un ka rate'), size: 'third', sizes: ANY_SIZE, Component: CarpetRecentRolls },
  ],
  useQuickActions: useCarpetActions,
  moneyMap: { useExtraTiles: useCarpetMoneyTiles },
  guide: [
    { icon: Ruler, title: t('Rolls aur sqft'), text: t('Har roll ki baqi lambai aur sqft yahan jama hoti hai. "Rolls theek" ka matlab hai kitne rolls me abhi 10 ft se zyada maal hai.') },
    { icon: Scissors, title: t('Cut pieces'), text: t('Roll se bacha tukda cut piece ban jata hai. Chhote order par pehle ye dikhayein — paisa phansa nahi rehta.') },
  ],
});
