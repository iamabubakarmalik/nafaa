/**
 * Widgets every industry can use. Each factory returns a WidgetDef; call it
 * once at module level in an industry config, never inside a component, so
 * the widget component stays the same between renders.
 */

import { createElement, type ComponentType } from 'react';
import { CommissionCard } from '@modules/hr/commission/components/CommissionCard';
import { useCostHidden } from '@core/security/HiddenValue';
import type { WidgetDef } from '../engine/types';
import { Expenses } from './Expenses';
import { LowStock } from './LowStock';
import { MoneyMap, type MoneyMapOptions } from './MoneyMap';
import { PaymentMix } from './PaymentMix';
import { PeakHours } from './PeakHours';
import { ProfitLoss } from './ProfitLoss';
import { Purchases } from './Purchases';
import { QuickActions, type QuickAction } from './QuickActions';
import { RecentSales } from './RecentSales';
import { SalesTrend } from './SalesTrend';
import { SlowMovers } from './SlowMovers';
import { TopProducts } from './TopProducts';

type ProductPath = (id: string) => string;
type Def = Omit<WidgetDef, 'Component'>;

const def = (d: Def, Component: ComponentType): WidgetDef => ({ ...d, Component });

/** Binds props once, so the widget keeps one component identity. */
const bind = <P extends object>(C: ComponentType<P>, props: P): ComponentType => {
  const Bound = () => createElement(C, props);
  Bound.displayName = C.displayName ?? C.name;
  return Bound;
};

function CommissionWidget() {
  return createElement(CommissionCard, { tone: 'emerald', hideAmounts: useCostHidden() });
}

export const commonWidgets = {
  salesTrend: () => def(
    { id: 'sales-trend', title: 'Bikri ka rujhan', description: '7 ya 30 din ki bikri aur munafa', size: 'wide' },
    SalesTrend,
  ),
  peakHours: (opts: { openFrom?: number; hint?: string } = {}) => def(
    { id: 'peak-hours', title: 'Rush ka waqt', description: 'Kis ghante sab se zyada bikri hoti hai', size: 'third' },
    bind(PeakHours, opts),
  ),
  paymentMix: () => def(
    { id: 'payment-mix', title: 'Paisa kaise aaya', description: 'Cash, card, wallet aur udhaar ka hissa', size: 'third' },
    PaymentMix,
  ),
  profitLoss: () => def(
    { id: 'profit-loss', title: 'Nafa aur nuqsan', description: 'Mahine ka poora silsila, bikri se haath me bache tak', size: 'wide', sensitive: true },
    ProfitLoss,
  ),
  moneyMap: (opts: MoneyMapOptions = {}) => def(
    { id: 'money-map', title: 'Paisa kahan hai', description: 'Maal, kharcha, lena, dena aur cash', size: 'full', sensitive: true },
    bind(MoneyMap, opts),
  ),
  expenses: () => def(
    { id: 'expenses', title: 'Kharcha kahan gaya', description: 'Mahine ke kharche category ke hisaab se', size: 'half', sensitive: true },
    Expenses,
  ),
  purchases: () => def(
    { id: 'purchases', title: 'Maal ki kharidari', description: 'Haal ki kharidari aur baqi raqam', size: 'half', sensitive: true },
    Purchases,
  ),
  topProducts: (productPath: ProductPath, hint?: string) => def(
    { id: 'top-products', title: 'Sab se zyada bika', description: 'Is mahine ki top cheezein', size: 'half' },
    bind(TopProducts, { productPath, hint }),
  ),
  slowMovers: (productPath: ProductPath) => def(
    { id: 'slow-movers', title: 'Atka hua maal', description: '30 din se na bikne wali cheezein', size: 'half' },
    bind(SlowMovers, { productPath }),
  ),
  recentSales: () => def(
    { id: 'recent-sales', title: 'Haaliya bikri', description: 'Aakhri bill', size: 'half' },
    RecentSales,
  ),
  lowStock: (productPath: ProductPath, labels?: { title?: string; hint?: string }) => def(
    { id: 'low-stock', title: labels?.title ?? 'Kam stock', description: 'Alert level se neeche wali cheezein', size: 'half' },
    bind(LowStock, { productPath, ...labels }),
  ),
  quickActions: (useActions: () => QuickAction[]) => def(
    { id: 'quick-actions', title: 'Jaldi kaam', description: 'Roz ke kaam ke shortcut', size: 'full' },
    bind(QuickActions, { useActions }),
  ),
  commission: () => def(
    { id: 'commission', title: 'Staff commission', description: 'Is mahine bandon ka hissa', size: 'half' },
    CommissionWidget,
  ),
};

export { KpiStrip, type Kpi } from './KpiStrip';
export { AttentionList, type AttentionItem } from './AttentionList';
export { MoneyNote, type MoneyTileProps } from './MoneyMap';
export type { QuickAction } from './QuickActions';
