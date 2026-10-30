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
import { t } from '@core/i18n';

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
    { id: 'hero', title: t('Aaj — ek nazar me'), description: t('Aaj ki sale, din bhar ka graph, target aur cash/online'), size: 'full' },
    TodayHero,
  ),
  kpis: () => def(
    { id: 'kpis', title: t('Numbers'), description: t('Aap ke chune hue numbers — "Numbers" tab se badlein'), size: 'full' },
    KpiGrid,
  ),
  dayReport: () => def(
    { id: 'day-report', title: t('Din ka hisaab'), description: t('Opening se closing tak, har item aur payment — WhatsApp aur print'), size: 'full' },
    bind(DayReportView, {}),
  ),
  salesTrend: () => def(
    { id: 'sales-trend', title: t('Sale ka rujhan'), description: t('7 ya 30 din ki sale aur profit'), size: 'wide', sizes: ['half', 'wide', 'full'] },
    SalesTrend,
  ),
  peakHours: (opts: { openFrom?: number; hint?: string } = {}) => def(
    { id: 'peak-hours', title: t('Rush ka waqt'), description: t('Kis ghante sab se zyada sale hoti hai'), size: 'third', sizes: ['third', 'half', 'wide'] },
    bind(PeakHours, opts),
  ),
  paymentMix: () => def(
    { id: 'payment-mix', title: t('Paisa kaise aaya'), description: t('Cash, card, wallet aur udhaar ka hissa'), size: 'third', sizes: ['third', 'half'] },
    PaymentMix,
  ),
  profitLoss: () => def(
    { id: 'profit-loss', title: t('Nafa aur nuqsan'), description: t('Mahine ka poora silsila, sale se haath me bache tak'), size: 'wide', sizes: ['wide', 'full'], sensitive: true },
    ProfitLoss,
  ),
  moneyMap: (opts: MoneyMapOptions = {}) => def(
    { id: 'money-map', title: t('Paisa kahan hai'), description: t('Maal, expense, lena, dena aur cash'), size: 'full', sensitive: true },
    bind(MoneyMap, opts),
  ),
  categoryMix: () => def(
    { id: 'category-mix', title: t('Category ke hisaab se'), description: t('Har category ki sale, quantity aur profit'), size: 'half', sizes: ['half', 'wide', 'full'] },
    CategoryMix,
  ),
  staff: () => def(
    { id: 'staff', title: t('Staff ki sale'), description: t('Kis ne kitna becha — ranking'), size: 'half', sizes: ['third', 'half', 'wide'] },
    StaffBoard,
  ),
  weekday: () => def(
    { id: 'weekday', title: t('Hafte ke din'), description: t('Kaunsa din sab se acha jata hai'), size: 'third', sizes: ['third', 'half', 'wide'] },
    WeekdayPattern,
  ),
  topCustomers: () => def(
    { id: 'top-customers', title: t('Behtareen customers'), description: t('Sab se zyada khareedne wale'), size: 'third', sizes: ['third', 'half'] },
    TopCustomers,
  ),
  monthly: () => def(
    { id: 'monthly', title: t('6 mahine ka muqabla'), description: t('Har mahine ki sale, expense aur profit'), size: 'wide', sizes: ['half', 'wide', 'full'] },
    MonthlyTrend,
  ),
  expenses: () => def(
    { id: 'expenses', title: t('Expense kahan gaya'), description: t('Mahine ke expenses category ke hisaab se'), size: 'half', sizes: ANY_SIZE, sensitive: true },
    Expenses,
  ),
  purchases: () => def(
    { id: 'purchases', title: t('Maal ki purchase'), description: t('Haal ki purchase aur baqi amount'), size: 'half', sizes: ANY_SIZE, sensitive: true },
    Purchases,
  ),
  topProducts: (productPath: ProductPath, hint?: string) => def(
    { id: 'top-products', title: t('Sab se zyada bika'), description: t('Is mahine ki top cheezein'), size: 'half', sizes: ANY_SIZE },
    bind(TopProducts, { productPath, hint }),
  ),
  slowMovers: (productPath: ProductPath) => def(
    { id: 'slow-movers', title: t('Atka hua maal'), description: t('30 din se na bikne wali cheezein'), size: 'half', sizes: ANY_SIZE },
    bind(SlowMovers, { productPath }),
  ),
  recentSales: () => def(
    { id: 'recent-sales', title: t('Haaliya sale'), description: t('Aakhri bill'), size: 'half', sizes: ANY_SIZE },
    RecentSales,
  ),
  lowStock: (productPath: ProductPath, labels?: { title?: string; hint?: string }) => def(
    { id: 'low-stock', title: labels?.title ?? t('Kam stock'), description: t('Alert level se neeche wali cheezein'), size: 'half', sizes: ANY_SIZE },
    bind(LowStock, { productPath, ...labels }),
  ),
  quickActions: (useActions: () => QuickAction[]) => def(
    { id: 'quick-actions', title: t('Jaldi kaam'), description: t('Roz ke kaam ke shortcut'), size: 'full' },
    bind(QuickActions, { useActions }),
  ),
  commission: () => def(
    { id: 'commission', title: t('Staff commission'), description: t('Is mahine bandon ka hissa'), size: 'half', sizes: ANY_SIZE },
    CommissionWidget,
  ),
};

export { commonKpis, commonKpiList } from './kpis';
export { AttentionList, type AttentionItem } from './AttentionList';
export { MoneyNote, type MoneyTileProps } from './MoneyMap';
export type { QuickAction } from './QuickActions';
