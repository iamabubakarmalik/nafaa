/**
 * Home widgets in default order. Ids, titles and widths are the web's
 * (modules/dashboard/createDashboard.ts), so a layout saved on either side
 * means the same here. Differences on the phone: "Jaldi kaam" sits right
 * under the numbers by default, and an industry shop gets its pack dashboard
 * as one widget ('industry') after the day report, where the web puts the
 * industry widgets.
 */

import {
  BarChart3, Building2, CalendarDays, CalendarRange, ClipboardList, Hourglass, LayoutGrid, LineChart as LineIcon, ListChecks, Package,
  PieChart, Receipt, Sparkles, Sun, Target, TrendingUp, Users, Wallet, Zap, type LucideIcon,
} from 'lucide-react-native';
import { createElement } from 'react';
import { t } from '@/core/i18n';
import { industryIdentity } from '@/design';
import { loadIndustryDashboard } from '@/industries/dashboards';
import type { HomeWidget, WidgetSize } from '../layout/layout';
import { CategoryMix, MonthlyTrend, PaymentMix, PeakHours, SalesTrend, StaffBoard, TopCustomers, WeekdayPattern } from './Charts';
import { AiMorning, COMMISSION_ICON, CommissionWidget, IndustryWidget } from './Extras';
import { KpiGrid } from './Kpis';
import { LowStock, RecentSales, SlowMovers, TopProducts } from './Lists';
import { ExpensesCard, MoneyMapCard, ProfitLoss, PurchasesCard } from './Money';
import { TodayHero } from './TodayHero';
import { Attention, DayReportCard, QuickActions } from './Today';

const ANY: WidgetSize[] = ['third', 'half', 'wide', 'full'];

function common(): HomeWidget[] {
  return [
    { id: 'hero', title: t('Aaj — ek nazar me'), description: t('Aaj ki sale, din bhar ka graph, target aur cash/online'), icon: Sun, preview: 'hero', size: 'full', Component: TodayHero },
    { id: 'kpis', title: t('Numbers'), description: t('Aap ke chune hue numbers — "Numbers" tab se badlein'), icon: LayoutGrid, preview: 'numbers', size: 'full', Component: KpiGrid },
    { id: 'quick-actions', title: t('Jaldi kaam'), description: t('Roz ke kaam ke shortcut'), icon: Zap, preview: 'grid', size: 'full', Component: QuickActions },
    { id: 'ai-morning', title: t('Subah ka khulasa (Nafaa AI)'), description: t('Kal ki sale, profit, udhaar aur stock ek nazar me'), icon: Sparkles, preview: 'ai', size: 'full', sizes: ['half', 'wide', 'full'], Component: AiMorning },
    { id: 'attention', title: t('Aaj ka kaam'), description: t('Jo abhi karna hai, sab se zaroori upar'), icon: ListChecks, preview: 'alert', size: 'full', sizes: ['half', 'wide', 'full'], Component: Attention },
    { id: 'day-report', title: t('Din ka hisaab'), description: t('Opening se closing tak, har item aur payment — WhatsApp aur print'), icon: ClipboardList, preview: 'report', size: 'full', Component: DayReportCard },
    { id: 'sales-trend', title: t('Sale ka rujhan'), description: t('7 ya 30 din ki sale aur profit'), icon: LineIcon, preview: 'line', size: 'wide', sizes: ['half', 'wide', 'full'], Component: SalesTrend },
    { id: 'peak-hours', title: t('Rush ka waqt'), description: t('Kis ghante sab se zyada sale hoti hai'), icon: Hourglass, preview: 'bars', size: 'third', sizes: ['third', 'half', 'wide'], Component: () => createElement(PeakHours, {}) },
    { id: 'top-products', title: t('Sab se zyada bika'), description: t('Is mahine ki top cheezein'), icon: TrendingUp, preview: 'list', size: 'half', sizes: ANY, Component: TopProducts },
    { id: 'slow-movers', title: t('Atka hua maal'), description: t('30 din se na bikne wali cheezein'), icon: Package, preview: 'list', size: 'half', sizes: ANY, Component: SlowMovers },
    { id: 'category-mix', title: t('Category ke hisaab se'), description: t('Har category ki sale, quantity aur profit'), icon: PieChart, preview: 'donut', size: 'half', sizes: ['half', 'wide', 'full'], Component: CategoryMix },
    { id: 'staff', title: t('Staff ki sale'), description: t('Kis ne kitna becha — ranking'), icon: Users, preview: 'rows', size: 'half', sizes: ['third', 'half', 'wide'], Component: StaffBoard },
    { id: 'money-map', title: t('Paisa kahan hai'), description: t('Maal, expense, lena, dena aur cash'), icon: Wallet, preview: 'numbers', size: 'full', sensitive: true, Component: MoneyMapCard },
    { id: 'profit-loss', title: t('Nafa aur nuqsan'), description: t('Mahine ka poora silsila, sale se haath me bache tak'), icon: Target, preview: 'report', size: 'wide', sizes: ['wide', 'full'], sensitive: true, Component: ProfitLoss },
    { id: 'payment-mix', title: t('Paisa kaise aaya'), description: t('Cash, card, wallet aur udhaar ka hissa'), icon: PieChart, preview: 'donut', size: 'third', sizes: ['third', 'half'], Component: PaymentMix },
    { id: 'monthly', title: t('6 mahine ka muqabla'), description: t('Har mahine ki sale, expense aur profit'), icon: CalendarRange, preview: 'bars', size: 'wide', sizes: ['half', 'wide', 'full'], Component: MonthlyTrend },
    { id: 'weekday', title: t('Hafte ke din'), description: t('Kaunsa din sab se acha jata hai'), icon: CalendarDays, preview: 'bars', size: 'third', sizes: ['third', 'half', 'wide'], Component: WeekdayPattern },
    { id: 'top-customers', title: t('Behtareen customers'), description: t('Sab se zyada khareedne wale'), icon: Users, preview: 'list', size: 'third', sizes: ['third', 'half'], Component: TopCustomers },
    { id: 'recent-sales', title: t('Haaliya sale'), description: t('Aakhri bill'), icon: Receipt, preview: 'list', size: 'half', sizes: ANY, Component: RecentSales },
    { id: 'low-stock', title: t('Kam stock'), description: t('Alert level se neeche wali cheezein'), icon: BarChart3, preview: 'list', size: 'half', sizes: ANY, Component: LowStock },
    { id: 'expenses', title: t('Expense kahan gaya'), description: t('Mahine ke expenses category ke hisaab se'), icon: Wallet, preview: 'donut', size: 'half', sizes: ANY, sensitive: true, Component: ExpensesCard },
    { id: 'purchases', title: t('Maal ki purchase'), description: t('Haal ki purchase aur baqi amount'), icon: Building2, preview: 'list', size: 'half', sizes: ANY, sensitive: true, Component: PurchasesCard },
    { id: 'commission', title: t('Staff commission'), description: t('Is mahine bandon ka hissa'), icon: COMMISSION_ICON, preview: 'rows', size: 'half', sizes: ANY, Component: CommissionWidget },
  ];
}

const cache = new Map<string, HomeWidget[]>();

/** Widgets for a shop; `packId` adds the industry pack's dashboard. Built once per pack. */
export function homeWidgets(packId: string | null): HomeWidget[] {
  const key = packId ?? '-';
  const hit = cache.get(key);
  if (hit) return hit;
  const list = common();
  if (packId) {
    const identity = industryIdentity(packId);
    const label = t(identity.label);
    const Screen = loadIndustryDashboard(packId);
    if (Screen) {
      const href = `/${packId}`;
      const Component = () => createElement(IndustryWidget, { title: t('{{label}} — aaj', { label }), href, Component: Screen });
      const icon: LucideIcon = identity.icon;
      const at = list.findIndex((w) => w.id === 'day-report') + 1;
      list.splice(at, 0, { id: 'industry', title: t('{{label}} — aaj', { label }), description: t('{{label}} ka apna hisaab: kaam, orders aur shortcut', { label }), icon, preview: 'industry', size: 'full', Component });
    }
  }
  cache.set(key, list);
  return list;
}
