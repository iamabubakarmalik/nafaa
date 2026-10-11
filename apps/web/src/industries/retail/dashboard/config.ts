/**
 * Retail dashboard: today's sales and stock health first, then the money.
 * Order here is the default; each user can rearrange it.
 */

import {
  Banknote, BarChart3, BookOpen, Building2, Clock, Hourglass, Layers, Package, PiggyBank, Plus, Receipt,
  RefreshCw, ShoppingBag, ShoppingCart, Sparkles, Tag, Target, Upload, Users, Wallet, Zap, AlertTriangle,
} from 'lucide-react';
import type { DashboardConfig } from '@modules/dashboard/engine';
import { useMasked } from '@modules/dashboard/engine';
import { commonKpiList, commonWidgets, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview, useRetailAlerts } from '@modules/dashboard/data/queries';
import { RetailAttention } from './widgets';

const productPath = (id: string) => `/retail-products/${id}`;

function useRetailActions(): QuickAction[] {
  const { data } = useOverview();
  const { data: alerts = {} } = useRetailAlerts();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'POS counter', hint: 'Sale karein' },
    { to: '/retail-products/new', icon: Plus, label: 'Naya product', hint: 'Maal me daalein' },
    { to: '/products', icon: Package, label: 'Products', hint: `${s?.totalProducts ?? 0} items` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sales history', hint: 'Purani receipts' },
    { to: '/purchases', icon: ShoppingBag, label: 'Kharidari', hint: 'Maal mangwayein' },
    { to: '/suppliers', icon: Building2, label: 'Suppliers', hint: `${s?.totalSuppliers ?? 0} parties` },
    { to: '/expenses', icon: Wallet, label: 'Kharche', hint: 'Bijli, kiraya' },
    { to: '/cash-register', icon: Banknote, label: 'Cash register', hint: 'Galle ka hisaab' },
    { to: '/retail/reorders', icon: RefreshCw, label: 'Smart reorder', hint: alerts.pendingReorders ? `${alerts.pendingReorders} tayyar` : 'Kya mangwana hai' },
    { to: '/retail/damage', icon: AlertTriangle, label: 'Damage log', hint: `${alerts.damagesToday ?? 0} aaj` },
    { to: '/retail/combos', icon: Sparkles, label: 'Combos', hint: 'Bundle deals' },
    { to: '/retail/product-units', icon: Layers, label: 'Multi-units', hint: 'Piece / dozen' },
    { to: '/retail/quick-keys', icon: Zap, label: 'Quick keys', hint: 'POS shortcuts' },
    { to: '/barcode-labels', icon: Tag, label: 'Barcode labels', hint: 'Print karein' },
    { to: '/retail/bulk-import', icon: Upload, label: 'Bulk import', hint: 'Excel / CSV' },
    { to: '/profit-report', icon: PiggyBank, label: 'Profit report', hint: 'Nafa-nuqsan' },
  ];
}

export const retailDashboard: DashboardConfig = {
  label: 'Retail',
  primaryAction: { to: '/pos', label: 'POS', icon: ShoppingCart },
  kpis: commonKpiList,
  defaultKpis: ['profit', 'month', 'cash', 'online', 'low-stock', 'udhaar'],
  widgets: [
    commonWidgets.hero(),
    commonWidgets.kpis(),
    { id: 'attention', title: 'Aaj ka kaam', description: 'Khatam stock, reorder, transfers', size: 'full', sizes: ['half', 'wide', 'full'], Component: RetailAttention },
    commonWidgets.dayReport(),
    commonWidgets.salesTrend(),
    commonWidgets.peakHours({ openFrom: 8, hint: 'Staff isi hisaab se lagayein' }),
    commonWidgets.categoryMix(),
    commonWidgets.staff(),
    commonWidgets.moneyMap({ productsPath: '/products' }),
    commonWidgets.profitLoss(),
    commonWidgets.paymentMix(),
    commonWidgets.monthly(),
    commonWidgets.weekday(),
    commonWidgets.quickActions(useRetailActions),
    commonWidgets.topProducts(productPath),
    commonWidgets.slowMovers(productPath),
    commonWidgets.topCustomers(),
    commonWidgets.recentSales(),
    commonWidgets.lowStock(productPath),
    commonWidgets.expenses(),
    commonWidgets.purchases(),
    commonWidgets.commission(),
  ],
  guide: [
    { icon: Receipt, title: 'Din ka hisaab', text: 'Opening se closing tak: kaunsi cheez kitni biki, cash aur online kitna aaya, kharcha kitna. Purana din bhi khol sakte hain — WhatsApp par bhejein ya print karein.' },
    { icon: Target, title: 'Aaj ka kaam', text: 'Khatam stock, kam stock, reorder aur aane wale transfers — sab se zaroori upar, har line par seedha button.' },
    { icon: BarChart3, title: 'Bikri ka rujhan', text: '7 ya 30 din ki bikri, aur cost khuli ho to munafa bhi. Gir rahi ho to yahan pehle nazar aata hai.' },
    { icon: Clock, title: 'Rush ka waqt', text: 'Gehra rang sab se masroof ghanta hai. Staff aur maal ki bharai us se pehle karein. "Hafta" asli aadat dikhata hai.' },
    { icon: PiggyBank, title: 'Paisa kahan hai', text: 'Dukaan ka maal, kharidari, kharcha, logon se lena, suppliers ko dena aur galle ka cash — har khana apni screen par le jata hai.' },
    { icon: Wallet, title: 'Nafa-nuqsan', text: 'Bikri → lagat → seedha munafa → kharche → haath me bacha. Pata chalta hai ke munafa rate se gaya ya kharchon se.' },
    { icon: Hourglass, title: 'Atka hua maal', text: '30 din se na bikne wali cheezein. Deal banayein ya dobara mat mangwayein.' },
    { icon: Users, title: 'Apni marzi ka dashboard', text: '"Customize" se hisse chhupayein, ghaseet kar tarteeb badlein, chaurai (S/M/L/Full) chunein, upar ke numbers chunein aur rozana target lagayein. Aap ke account me save hota hai — har device par wahi.' },
  ],
};
