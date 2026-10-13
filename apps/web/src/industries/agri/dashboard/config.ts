/**
 * Agri dashboard: the standard dashboard plus sowing season readiness,
 * farmer credit recovery, product registration and subsidy claims.
 */

import {
  BookOpen, Boxes, Calendar, Landmark, Leaf, Package, PiggyBank, Plus, Receipt, ShoppingCart, Sprout, Tractor, Users,
} from 'lucide-react';
import { createDashboard } from '@modules/dashboard/createDashboard';
import { ANY_SIZE, type QuickAction } from '@modules/dashboard/widgets';
import { useOverview } from '@modules/dashboard/data/queries';
import { useMasked } from '@modules/dashboard/engine';
import { useAgriOps } from './useAgriOps';
import {
  AgriRecovery, AgriRegistration, AgriSeason, AgriSubsidy, agriKpis, useAgriAttention, useAgriMoneyNotes, useAgriMoneyTiles,
} from './widgets';

const productPath = (id: string) => `/agri-products/${id}`;

function useAgriActions(): QuickAction[] {
  const { data } = useOverview();
  const { farmers, season, subsidy } = useAgriOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: 'Counter', hint: 'Sale karein' },
    { to: '/agri/farmers', icon: Tractor, label: 'Farmer', hint: farmers.overdue ? `${farmers.overdue} late` : `${farmers.total} log` },
    { to: '/agri/bulk-orders/new', icon: Boxes, label: 'Bara order', hint: 'Naya order' },
    { to: '/agri/bulk-orders', icon: Boxes, label: 'Bare order', hint: 'Sab dekhein' },
    { to: '/agri/seasonal-plans', icon: Calendar, label: 'Fasal calendar', hint: season.risky ? `${season.risky} ka maal kam` : 'Bijai ka waqt' },
    { to: '/agri/subsidy', icon: Landmark, label: 'Subsidy', hint: subsidy.count ? `${subsidy.count} baqi` : 'Claims' },
    { to: '/agri/advisory', icon: Leaf, label: 'Mashwara', hint: 'Fasal ki salah' },
    { to: '/agri-products/new', icon: Plus, label: 'Nayi cheez', hint: 'Maal me daalein' },
    { to: '/agri/products', icon: Package, label: 'Maal', hint: `${s?.totalProducts ?? 0} cheezein` },
    { to: '/customers', icon: Users, label: 'Customers', hint: `${s?.totalCustomers ?? 0} log` },
    { to: '/khata', icon: BookOpen, label: 'Khata', hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: 'Sale record', hint: 'Purane bill' },
    { to: '/profit-report', icon: PiggyBank, label: 'Profit', hint: 'Profit-loss' },
  ];
}

export const agriDashboard = createDashboard({
  label: 'Agri',
  productPath,
  openFrom: 7,
  primaryAction: { to: '/pos', label: 'Counter', icon: ShoppingCart },
  kpis: agriKpis,
  defaultKpis: ['agri-farmer-udhaar', 'agri-season', 'agri-registration', 'profit', 'cash', 'month'],
  useAttention: useAgriAttention,
  widgets: [
    { id: 'agri-season', title: 'Bijai qareeb hai', description: 'Kis fasal ki bijai aa rahi hai aur maal tayyar hai ya nahi', size: 'third', sizes: ANY_SIZE, Component: AgriSeason },
    { id: 'agri-recovery', title: 'Farmer receiving', description: 'Jin farmers ke udhaar ka waqt guzar gaya', size: 'third', sizes: ANY_SIZE, sensitive: true, Component: AgriRecovery },
    { id: 'agri-registration', title: 'Registration', description: 'Beej, khaad aur dawa ki registration khatam ya qareeb', size: 'third', sizes: ANY_SIZE, Component: AgriRegistration },
  ],
  lateWidgets: [
    { id: 'agri-subsidy', title: 'Subsidy claims', description: 'Sarkar ke paas atke claims', size: 'third', sizes: ANY_SIZE, sensitive: true, Component: AgriSubsidy },
  ],
  useQuickActions: useAgriActions,
  moneyMap: { useExtraTiles: useAgriMoneyTiles, useNotes: useAgriMoneyNotes, productsPath: '/agri/products' },
  guide: [
    { icon: Sprout, title: 'Bijai ka mausam', text: 'Bijai ka waqt hi wo waqt hai jab farmer sab se zyada kharch karta hai. Jis fasal ka maal kam ya khatam ho, wo laal me upar aati hai — pehle se mangwa lein.' },
    { icon: Tractor, title: 'Receiving aur registration', text: 'Har farmer ke udhaar ke din alag hain — jin ka waqt guzra wo upar. Registration khatam hone wala beej, khaad aur dawa bhi yahan nazar aata hai.' },
  ],
});
