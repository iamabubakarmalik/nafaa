/**
 * Headline numbers every industry can offer. Industries add their own
 * (bakery: baking progress, orders due, expiring stock) next to these.
 */

import {
  AlertTriangle, Banknote, BookOpen, CalendarRange, Package, Receipt, ShoppingBasket, Smartphone, Target,
  TrendingUp, Users, Wallet,
} from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { KpiDef } from '../engine/types';
import { useMasked } from '../engine/useMasked';
import { fmtQty } from '../engine/parts';
import { useDayReport, useMoneyMap, useOverview } from '../data/queries';
import { splitHint } from '@modules/reports/ProfitSplit';
import { t } from '@core/i18n';

const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : undefined);

function useLast7(key: 'sales' | 'profit' | 'orders') {
  const { data } = useOverview();
  return (data?.salesTrend7Days ?? []).map((p) => Number(p[key] || 0));
}

export const commonKpis: Record<string, KpiDef> = {
  sales: {
    id: 'sales', label: t('Aaj ki sale'), icon: TrendingUp, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales, salesHidden } = useMasked();
      const trend = useLast7('sales');
      const s = data?.stats;
      return {
        loading: isLoading, value: sales(s?.salesToday), to: '/sales',
        change: salesHidden ? undefined : s?.salesGrowthVsYesterday, hint: t('kal se'),
        trend: salesHidden ? undefined : trend,
      };
    },
  },
  bills: {
    id: 'bills', label: t('Aaj ke bill'), icon: Receipt, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const trend = useLast7('orders');
      const s = data?.stats;
      return {
        loading: isLoading, value: s?.ordersToday ?? 0, to: '/sales',
        change: pctChange(s?.ordersToday ?? 0, s?.ordersYesterday ?? 0), hint: t('kal {{value}}', { value: s?.ordersYesterday ?? 0 }),
        trend,
      };
    },
  },
  average: {
    id: 'average', label: t('Ausat bill'), icon: ShoppingBasket, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales } = useMasked();
      const s = data?.stats;
      return { loading: isLoading, value: sales(s?.aovToday), hint: t('mahine ka {{aovMonth}}', { aovMonth: sales(s?.aovMonth) }) };
    },
  },
  profit: {
    id: 'profit', label: t('Aaj ka profit'), icon: Target, tone: 'success', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const trend = useLast7('profit');
      const s = data?.stats;
      // Khata bills: show what came in and what is still on khata, so nothing is hidden.
      return { loading: isLoading, value: formatPKR(s?.netProfitToday ?? 0), hint: splitHint(s?.profitSplitToday) ?? t('cost aur expense nikal kar'), trend, to: '/profit-report' };
    },
  },
  items: {
    id: 'items', label: t('Items biki'), icon: Package, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      return { loading: isLoading, value: fmtQty(data?.sales.itemsSold ?? 0), hint: t('{{value}} alag cheezein', { value: data?.items.length ?? 0 }), to: '/day-report' };
    },
  },
  cash: {
    id: 'cash', label: t('Galle me cash'), icon: Banknote, tone: 'success',
    useValue: () => {
      const { data: m, isLoading } = useMoneyMap();
      const { sales } = useMasked();
      return {
        loading: isLoading, to: '/cash-register',
        value: m?.cash.registerOpen ? sales(m.cash.expected) : '—',
        hint: m?.cash.registerOpen ? t('opening {{opening}}', { opening: sales(m.cash.opening) }) : t('Register band hai'),
      };
    },
  },
  online: {
    id: 'online', label: t('Aaj online aaya'), icon: Smartphone, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      const { sales } = useMasked();
      return { loading: isLoading, value: sales(data?.onlineCollected), hint: t('cash {{cashCollected}}', { cashCollected: sales(data?.cashCollected) }), to: '/day-report' };
    },
  },
  expenses: {
    id: 'expenses', label: t('Aaj ka expense'), icon: Wallet, tone: 'warning', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: formatPKR(s?.expensesToday ?? 0), hint: t('mahine {{value}}', { value: formatPKR(s?.expensesMonth ?? 0) }), to: '/expenses' };
    },
  },
  udhaar: {
    id: 'udhaar', label: t('Udhaar baqi'), icon: BookOpen, tone: 'danger', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: formatPKR(s?.totalUdhaar ?? 0), hint: t('{{value}} customers', { value: s?.customersWithUdhaar ?? 0 }), to: '/khata' };
    },
  },
  month: {
    id: 'month', label: t('Mahine ki sale'), icon: CalendarRange, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales, salesHidden } = useMasked();
      const s = data?.stats;
      return { loading: isLoading, value: sales(s?.salesMonth), change: salesHidden ? undefined : s?.salesGrowthVsLastMonth, hint: t('pichhle mahine se') };
    },
  },
  'low-stock': {
    id: 'low-stock', label: t('Kam stock'), icon: AlertTriangle, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: s?.lowStockCount ?? 0, hint: t('{{value}} khatam', { value: s?.outOfStockCount ?? 0 }), to: '/low-stock', alert: (s?.outOfStockCount ?? 0) > 0 };
    },
  },
  customers: {
    id: 'customers', label: t('Customers'), icon: Users, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useOverview();
      return { loading: isLoading, value: data?.stats.totalCustomers ?? 0, to: '/customers' };
    },
  },
};

export const commonKpiList = Object.values(commonKpis);
