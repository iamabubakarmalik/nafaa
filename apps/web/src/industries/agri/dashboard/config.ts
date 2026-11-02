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
import { t } from '@core/i18n';

const productPath = (id: string) => `/agri-products/${id}`;

function useAgriActions(): QuickAction[] {
  const { data } = useOverview();
  const { farmers, season, subsidy } = useAgriOps();
  const { cost } = useMasked();
  const s = data?.stats;
  return [
    { to: '/pos', icon: ShoppingCart, label: t('Counter'), hint: t('Sale karein') },
    { to: '/agri/farmers', icon: Tractor, label: t('Farmer'), hint: farmers.overdue ? t('{{overdue}} late', { overdue: farmers.overdue }) : t('{{total}} log', { total: farmers.total }) },
    { to: '/agri/bulk-orders/new', icon: Boxes, label: t('Bara order'), hint: t('Naya order') },
    { to: '/agri/bulk-orders', icon: Boxes, label: t('Bare order'), hint: t('Sab dekhein') },
    { to: '/agri/seasonal-plans', icon: Calendar, label: t('Fasal calendar'), hint: season.risky ? t('{{risky}} ka maal kam', { risky: season.risky }) : t('Bijai ka waqt') },
    { to: '/agri/subsidy', icon: Landmark, label: t('Subsidy'), hint: subsidy.count ? t('{{count}} baqi', { count: subsidy.count }) : t('Claims') },
    { to: '/agri/advisory', icon: Leaf, label: t('Mashwara'), hint: t('Fasal ki salah') },
    { to: '/agri-products/new', icon: Plus, label: t('Nayi cheez'), hint: t('Maal me daalein') },
    { to: '/agri/products', icon: Package, label: t('Maal'), hint: t('{{value}} cheezein', { value: s?.totalProducts ?? 0 }) },
    { to: '/customers', icon: Users, label: t('Customers'), hint: t('{{value}} log', { value: s?.totalCustomers ?? 0 }) },
    { to: '/khata', icon: BookOpen, label: t('Khata'), hint: cost(s?.totalUdhaar) },
    { to: '/sales', icon: Receipt, label: t('Sale record'), hint: t('Purane bill') },
    { to: '/profit-report', icon: PiggyBank, label: t('Profit'), hint: t('Profit-loss') },
  ];
}

export const agriDashboard = createDashboard({
  label: t('Agri'),
  productPath,
  openFrom: 7,
  primaryAction: { to: '/pos', label: t('Counter'), icon: ShoppingCart },
  kpis: agriKpis,
  defaultKpis: ['agri-farmer-udhaar', 'agri-season', 'agri-registration', 'profit', 'cash', 'month'],
  useAttention: useAgriAttention,
  widgets: [
    { id: 'agri-season', title: t('Bijai qareeb hai'), description: t('Kis fasal ki bijai aa rahi hai aur maal tayyar hai ya nahi'), size: 'third', sizes: ANY_SIZE, Component: AgriSeason },
    { id: 'agri-recovery', title: t('Farmer receiving'), description: t('Jin farmers ke udhaar ka waqt guzar gaya'), size: 'third', sizes: ANY_SIZE, sensitive: true, Component: AgriRecovery },
    { id: 'agri-registration', title: t('Registration'), description: t('Beej, khaad aur dawa ki registration khatam ya qareeb'), size: 'third', sizes: ANY_SIZE, Component: AgriRegistration },
  ],
  lateWidgets: [
    { id: 'agri-subsidy', title: t('Subsidy claims'), description: t('Sarkar ke paas atke claims'), size: 'third', sizes: ANY_SIZE, sensitive: true, Component: AgriSubsidy },
  ],
  useQuickActions: useAgriActions,
  moneyMap: { useExtraTiles: useAgriMoneyTiles, useNotes: useAgriMoneyNotes, productsPath: '/agri/products' },
  guide: [
    { icon: Sprout, title: t('Bijai ka mausam'), text: t('Bijai ka waqt hi wo waqt hai jab farmer sab se zyada kharch karta hai. Jis fasal ka maal kam ya khatam ho, wo laal me upar aati hai — pehle se mangwa lein.') },
    { icon: Tractor, title: t('Receiving aur registration'), text: t('Har farmer ke udhaar ke din alag hain — jin ka waqt guzra wo upar. Registration khatam hone wala beej, khaad aur dawa bhi yahan nazar aata hai.') },
  ],
});
