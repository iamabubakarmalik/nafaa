/**
 * Widgets every industry can use. Each factory returns a WidgetDef; call it
 * once at module level in an industry config, never inside a component, so
 * the widget component stays the same between renders.
 */

import { createElement, type ComponentType } from 'react';
import { CommissionCard } from '@modules/hr/commission/components/CommissionCard';
import { useCostHidden } from '@core/security/HiddenValue';
import type { WidgetDef, WidgetSize } from '../engine/types';
import { DayReportView } from '../day-report/DayReportView';
import { Expenses } from './Expenses';
import { CategoryMix, MonthlyTrend, StaffBoard, TopCustomers, WeekdayPattern } from './Insights';
import { KpiGrid } from './KpiGrid';
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
import { TodayHero } from './TodayHero';
import { TopProducts } from './TopProducts';

type ProductPath = (id: string) => string;
type Def = Omit<WidgetDef, 'Component'>;

/** Widths for list-style widgets that read well at any size. */
export const ANY_SIZE: WidgetSize[] = ['third', 'half', 'wide', 'full'];

const def = (d: Def, Component: ComponentType): WidgetDef => ({ ...d, Component });

/** Binds props once, so the widget keeps one component identity. */
const bind = <P extends object>(C: ComponentType<P>, props: P): ComponentType => {
  const Bound = () => createElement(C, props);
  Bound.displayName = C.displayName ?? C.name;
  return Bound;
};

function CommissionWidget() {
  return createElement(CommissionCard, { hideAmounts: useCostHidden() });
}

export const commonWidgets = {
  hero: () => def(
    { id: 'hero', title: 'Aaj — ek nazar me', description: 'Aaj ki bikri, din bhar ka graph, target aur cash/online', size: 'full' },
    TodayHero,
  ),
  kpis: () => def(
    { id: 'kpis', title: 'Numbers', description: 'Aap ke chune hue numbers — "Numbers" tab se badlein', size: 'full' },
    KpiGrid,
  ),
  dayReport: () => def(
    { id: 'day-report', title: 'Din ka hisaab', description: 'Opening se closing tak, har item aur payment — WhatsApp aur print', size: 'full' },
    bind(DayReportView, {}),
  ),
  salesTrend: () => def(
    { id: 'sales-trend', title: 'Bikri ka rujhan', description: '7 ya 30 din ki bikri aur munafa', size: 'wide', sizes: ['half', 'wide', 'full'] },
    SalesTrend,
  ),
  peakHours: (opts: { openFrom?: number; hint?: string } = {}) => def(
    { id: 'peak-hours', title: 'Rush ka waqt', description: 'Kis ghante sab se zyada bikri hoti hai', size: 'third', sizes: ['third', 'half', 'wide'] },
    bind(PeakHours, opts),
  ),
  paymentMix: () => def(
    { id: 'payment-mix', title: 'Paisa kaise aaya', description: 'Cash, card, wallet aur udhaar ka hissa', size: 'third', sizes: ['third', 'half'] },
    PaymentMix,
  ),
  profitLoss: () => def(
    { id: 'profit-loss', title: 'Nafa aur nuqsan', description: 'Mahine ka poora silsila, bikri se haath me bache tak', size: 'wide', sizes: ['wide', 'full'], sensitive: true },
    ProfitLoss,
  ),
  moneyMap: (opts: MoneyMapOptions = {}) => def(
    { id: 'money-map', title: 'Paisa kahan hai', description: 'Maal, kharcha, lena, dena aur cash', size: 'full', sensitive: true },
    bind(MoneyMap, opts),
  ),
  categoryMix: () => def(
    { id: 'category-mix', title: 'Category ke hisaab se', description: 'Har category ki bikri, quantity aur munafa', size: 'half', sizes: ['half', 'wide', 'full'] },
    CategoryMix,
  ),
  staff: () => def(
    { id: 'staff', title: 'Staff ki bikri', description: 'Kis ne kitna becha — ranking', size: 'half', sizes: ['third', 'half', 'wide'] },
    StaffBoard,
  ),
  weekday: () => def(
    { id: 'weekday', title: 'Hafte ke din', description: 'Kaunsa din sab se acha jata hai', size: 'third', sizes: ['third', 'half', 'wide'] },
    WeekdayPattern,
  ),
  topCustomers: () => def(
    { id: 'top-customers', title: 'Behtareen customers', description: 'Sab se zyada khareedne wale', size: 'third', sizes: ['third', 'half'] },
    TopCustomers,
  ),
  monthly: () => def(
    { id: 'monthly', title: '6 mahine ka muqabla', description: 'Har mahine ki bikri, kharcha aur munafa', size: 'wide', sizes: ['half', 'wide', 'full'] },
    MonthlyTrend,
  ),
  expenses: () => def(
    { id: 'expenses', title: 'Kharcha kahan gaya', description: 'Mahine ke kharche category ke hisaab se', size: 'half', sizes: ANY_SIZE, sensitive: true },
    Expenses,
  ),
  purchases: () => def(
    { id: 'purchases', title: 'Maal ki kharidari', description: 'Haal ki kharidari aur baqi raqam', size: 'half', sizes: ANY_SIZE, sensitive: true },
    Purchases,
  ),
  topProducts: (productPath: ProductPath, hint?: string) => def(
    { id: 'top-products', title: 'Sab se zyada bika', description: 'Is mahine ki top cheezein', size: 'half', sizes: ANY_SIZE },
    bind(TopProducts, { productPath, hint }),
  ),
  slowMovers: (productPath: ProductPath) => def(
    { id: 'slow-movers', title: 'Atka hua maal', description: '30 din se na bikne wali cheezein', size: 'half', sizes: ANY_SIZE },
    bind(SlowMovers, { productPath }),
  ),
  recentSales: () => def(
    { id: 'recent-sales', title: 'Haaliya bikri', description: 'Aakhri bill', size: 'half', sizes: ANY_SIZE },
    RecentSales,
  ),
  lowStock: (productPath: ProductPath, labels?: { title?: string; hint?: string }) => def(
    { id: 'low-stock', title: labels?.title ?? 'Kam stock', description: 'Alert level se neeche wali cheezein', size: 'half', sizes: ANY_SIZE },
    bind(LowStock, { productPath, ...labels }),
  ),
  quickActions: (useActions: () => QuickAction[]) => def(
    { id: 'quick-actions', title: 'Jaldi kaam', description: 'Roz ke kaam ke shortcut', size: 'full' },
    bind(QuickActions, { useActions }),
  ),
  commission: () => def(
    { id: 'commission', title: 'Staff commission', description: 'Is mahine bandon ka hissa', size: 'half', sizes: ANY_SIZE },
    CommissionWidget,
  ),
};

export { commonKpis, commonKpiList } from './kpis';
export { AttentionList, type AttentionItem } from './AttentionList';
export { MoneyNote, type MoneyTileProps } from './MoneyMap';
export type { QuickAction } from './QuickActions';
