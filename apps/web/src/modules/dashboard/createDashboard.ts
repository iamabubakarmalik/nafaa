/**
 * Builds an industry's DashboardConfig from the few things that differ
 * between industries. Everything else (hero, numbers, day report, charts,
 * money, lists) is the same standard set, so every industry gets the full
 * dashboard and improvements land everywhere at once.
 *
 *   export const pharmacyDashboard = createDashboard({
 *     label: 'Pharmacy',
 *     productPath: (id) => `/pharmacy-products/${id}`,
 *     kpis: pharmacyKpis, defaultKpis: ['ph-expiry', 'profit', ...],
 *     useAttention: usePharmacyAttention,
 *     widgets: [expiryWidget, prescriptionsWidget],
 *     useQuickActions: usePharmacyActions,
 *   });
 *
 * Call it at module level.
 */

import { BarChart3, Clock, FileText, Hourglass, PiggyBank, ShoppingCart, Target, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { DashboardConfig, GuideItem, KpiDef, WidgetDef } from './engine/types';
import { commonKpiList, commonWidgets, type QuickAction } from './widgets';
import type { AttentionItem } from './widgets/AttentionList';
import { makeAttention } from './widgets/CommonAttention';
import { MorningSummaryWidget } from '@modules/ai-assistant/components/MorningSummaryWidget';
import type { MoneyMapOptions } from './widgets/MoneyMap';
import { t } from '@core/i18n';

export interface DashboardSpec {
  label: string;
  productPath: (id: string) => string;
  /** Industry headline numbers, offered before the common ones. */
  kpis?: KpiDef[];
  /** Default cards; falls back to a sensible common set. */
  defaultKpis?: string[];
  /** Industry items for "Aaj ka kaam"; stock and register items are added automatically. */
  useAttention?: () => AttentionItem[];
  /** Industry widgets, placed right after the day report. */
  widgets?: WidgetDef[];
  /** Industry widgets placed further down, after the money section. */
  lateWidgets?: WidgetDef[];
  useQuickActions: () => QuickAction[];
  moneyMap?: MoneyMapOptions;
  /** First trading hour for the rush chart. */
  openFrom?: number;
  primaryAction?: { to: string; label: string; icon: LucideIcon };
  /** Industry guide entries, shown before the standard ones. */
  guide?: GuideItem[];
  /** Hide standard widgets that make no sense here (e.g. 'slow-movers' for services). */
  omit?: string[];
}

const STANDARD_GUIDE: GuideItem[] = [
  { icon: FileText, title: t('Din ka hisaab'), text: t('Opening se closing tak: kaunsi cheez kitni biki, cash aur online kitna aaya, expense kitna. Purana din bhi khol sakte hain — WhatsApp par bhejein ya print (A4 ya thermal) karein.') },
  { icon: Target, title: t('Aaj ka kaam'), text: t('Jo abhi karna hai, sab se zaroori upar — har line par seedha button.') },
  { icon: BarChart3, title: t('Rujhan aur muqabla'), text: t('Sale ka rujhan, hafte ke din, 6 mahine ka muqabla aur category ka hissa — har chart par period badal sakte hain.') },
  { icon: Clock, title: t('Rush ka waqt'), text: t('Gehra rang sab se masroof ghanta hai. Staff aur maal us se pehle tayyar rakhein.') },
  { icon: PiggyBank, title: t('Paisa kahan hai'), text: t('Dukaan ka maal, purchase, expense, logon se lena, suppliers ko dena aur galle ka cash.') },
  { icon: Wallet, title: t('Profit-loss'), text: t('Sale → cost → seedha profit → expenses → haath me bacha.') },
  { icon: Hourglass, title: t('Lists par poora control'), text: t('Sab se zyada bika, atka maal, kam stock aur haaliya sale — har list me period, sort, kitne items aur category chun sakte hain, aur print bhi.') },
  { icon: Users, title: t('Apni marzi ka dashboard'), text: t('"Customize" se hisse chhupayein, ghaseet kar sort badlein, chaurai (S/M/L/Full) chunein, upar ke numbers chunein aur rozana target lagayein. Aap ke account me save hota hai — har device par wahi.') },
];

/** Nafaa AI's morning summary (yesterday's sale, profit, udhaar). Renders nothing without `ai.use`. */
const aiMorning: WidgetDef = {
  id: 'ai-morning', title: t('Subah ka khulasa (Nafaa AI)'), description: t('Kal ki sale, profit, udhaar aur stock ek nazar me'),
  size: 'full', sizes: ['half', 'wide', 'full'], Component: MorningSummaryWidget,
};

export function createDashboard(spec: DashboardSpec): DashboardConfig {
  const omit = new Set(spec.omit ?? []);
  const attention: WidgetDef = {
    id: 'attention', title: t('Aaj ka kaam'), description: t('Jo abhi karna hai, sab se zaroori upar'),
    size: 'full', sizes: ['half', 'wide', 'full'], Component: makeAttention(spec.useAttention),
  };
  const widgets: WidgetDef[] = [
    commonWidgets.hero(),
    commonWidgets.kpis(),
    aiMorning,
    attention,
    commonWidgets.dayReport(),
    ...(spec.widgets ?? []),
    commonWidgets.salesTrend(),
    commonWidgets.peakHours({ openFrom: spec.openFrom ?? 8 }),
    commonWidgets.topProducts(spec.productPath),
    commonWidgets.slowMovers(spec.productPath),
    commonWidgets.categoryMix(),
    commonWidgets.staff(),
    commonWidgets.moneyMap(spec.moneyMap ?? {}),
    commonWidgets.profitLoss(),
    commonWidgets.paymentMix(),
    ...(spec.lateWidgets ?? []),
    commonWidgets.monthly(),
    commonWidgets.weekday(),
    commonWidgets.quickActions(spec.useQuickActions),
    commonWidgets.topCustomers(),
    commonWidgets.recentSales(),
    commonWidgets.lowStock(spec.productPath),
    commonWidgets.expenses(),
    commonWidgets.purchases(),
    commonWidgets.commission(),
  ].filter((w) => !omit.has(w.id));

  const kpis = [...(spec.kpis ?? []), ...commonKpiList];
  return {
    label: spec.label,
    primaryAction: spec.primaryAction ?? { to: '/pos', label: t('POS'), icon: ShoppingCart },
    kpis,
    defaultKpis: spec.defaultKpis ?? ['profit', 'month', 'cash', 'online', 'low-stock', 'udhaar'],
    widgets,
    guide: [...(spec.guide ?? []), ...STANDARD_GUIDE],
  };
}
