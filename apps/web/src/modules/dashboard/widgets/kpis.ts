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

const pctChange = (now: number, before: number) => (before > 0 ? ((now - before) / before) * 100 : undefined);

function useLast7(key: 'sales' | 'profit' | 'orders') {
  const { data } = useOverview();
  return (data?.salesTrend7Days ?? []).map((p) => Number(p[key] || 0));
}

export const commonKpis: Record<string, KpiDef> = {
  sales: {
    id: 'sales', label: 'Aaj ki bikri', icon: TrendingUp, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales, salesHidden } = useMasked();
      const trend = useLast7('sales');
      const s = data?.stats;
      return {
        loading: isLoading, value: sales(s?.salesToday), to: '/sales',
        change: salesHidden ? undefined : s?.salesGrowthVsYesterday, hint: 'kal se',
        trend: salesHidden ? undefined : trend,
      };
    },
  },
  bills: {
    id: 'bills', label: 'Aaj ke bill', icon: Receipt, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const trend = useLast7('orders');
      const s = data?.stats;
      return {
        loading: isLoading, value: s?.ordersToday ?? 0, to: '/sales',
        change: pctChange(s?.ordersToday ?? 0, s?.ordersYesterday ?? 0), hint: `kal ${s?.ordersYesterday ?? 0}`,
        trend,
      };
    },
  },
  average: {
    id: 'average', label: 'Ausat bill', icon: ShoppingBasket, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales } = useMasked();
      const s = data?.stats;
      return { loading: isLoading, value: sales(s?.aovToday), hint: `mahine ka ${sales(s?.aovMonth)}` };
    },
  },
  profit: {
    id: 'profit', label: 'Aaj ka munafa', icon: Target, tone: 'success', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const trend = useLast7('profit');
      const s = data?.stats;
      return { loading: isLoading, value: formatPKR(s?.netProfitToday ?? 0), hint: 'lagat aur kharcha nikal kar', trend, to: '/profit-report' };
    },
  },
  items: {
    id: 'items', label: 'Items biki', icon: Package, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      return { loading: isLoading, value: fmtQty(data?.sales.itemsSold ?? 0), hint: `${data?.items.length ?? 0} alag cheezein`, to: '/day-report' };
    },
  },
  cash: {
    id: 'cash', label: 'Galle me cash', icon: Banknote, tone: 'success',
    useValue: () => {
      const { data: m, isLoading } = useMoneyMap();
      const { sales } = useMasked();
      return {
        loading: isLoading, to: '/cash-register',
        value: m?.cash.registerOpen ? sales(m.cash.expected) : '—',
        hint: m?.cash.registerOpen ? `opening ${sales(m.cash.opening)}` : 'Register band hai',
      };
    },
  },
  online: {
    id: 'online', label: 'Aaj online aaya', icon: Smartphone, tone: 'info',
    useValue: () => {
      const { data, isLoading } = useDayReport();
      const { sales } = useMasked();
      return { loading: isLoading, value: sales(data?.onlineCollected), hint: `cash ${sales(data?.cashCollected)}`, to: '/day-report' };
    },
  },
  expenses: {
    id: 'expenses', label: 'Aaj ka kharcha', icon: Wallet, tone: 'warning', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: formatPKR(s?.expensesToday ?? 0), hint: `mahine ${formatPKR(s?.expensesMonth ?? 0)}`, to: '/expenses' };
    },
  },
  udhaar: {
    id: 'udhaar', label: 'Udhaar baqi', icon: BookOpen, tone: 'danger', sensitive: true,
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: formatPKR(s?.totalUdhaar ?? 0), hint: `${s?.customersWithUdhaar ?? 0} customers`, to: '/khata' };
    },
  },
  month: {
    id: 'month', label: 'Mahine ki bikri', icon: CalendarRange, tone: 'brand',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const { sales, salesHidden } = useMasked();
      const s = data?.stats;
      return { loading: isLoading, value: sales(s?.salesMonth), change: salesHidden ? undefined : s?.salesGrowthVsLastMonth, hint: 'pichhle mahine se' };
    },
  },
  'low-stock': {
    id: 'low-stock', label: 'Kam stock', icon: AlertTriangle, tone: 'warning',
    useValue: () => {
      const { data, isLoading } = useOverview();
      const s = data?.stats;
      return { loading: isLoading, value: s?.lowStockCount ?? 0, hint: `${s?.outOfStockCount ?? 0} khatam`, to: '/low-stock', alert: (s?.outOfStockCount ?? 0) > 0 };
    },
  },
  customers: {
    id: 'customers', label: 'Customers', icon: Users, tone: 'neutral',
    useValue: () => {
      const { data, isLoading } = useOverview();
      return { loading: isLoading, value: data?.stats.totalCustomers ?? 0, to: '/customers' };
    },
  },
};

export const commonKpiList = Object.values(commonKpis);
