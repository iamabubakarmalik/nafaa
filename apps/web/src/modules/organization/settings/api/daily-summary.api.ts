import { apiClient } from '@core/api/client';
import type { SummaryChannel } from './reports-config.api';

export interface DailySummaryStatus {
  enabled: boolean;
  time: string;
  timezone: string;
  dayStartHour: number;
  weekStart: number;
  nextRunAt: string | null;
  /** Business day the next automatic summary will cover. */
  nextDay: string;
  today: string;
  channels: SummaryChannel[];
  /** Shop-wide email switch (Settings → Notifications). */
  emailOn: boolean;
  /** Everyone who can get it; `selected` = chosen in Settings → Reports. */
  recipients: Array<{
    id: string; name: string; role: string; branch: string | null;
    selected: boolean; hasEmail: boolean; seesProfit: boolean; seesDrawer: boolean;
  }>;
  recent: Array<{ day: string; at: string; auto: boolean; people: number }>;
}

export interface DailySummary {
  day: string;
  isToday: boolean;
  shopName: string | null;
  sales: {
    gross: number; returns: number; returnCount: number; net: number; bills: number; average: number;
    discount: number; itemsSold: number; voided: number; voidedCount: number; credit: number;
  };
  compare: { previousDay: number; lastWeekSameDay: number; weekToDate: number; monthToDate: number; weekStart: string };
  money: {
    methods: Array<{ method: string; label: string; amount: number }>;
    cashSales: number; nonCash: number; khataCollected: number; cashRefunds: number;
    drawerNow: number | null; openDrawers: number; closedDrawers: number; shortExcess: number | null;
  };
  /** Left out by the server for people who may not see profit. */
  grossProfit?: number;
  netProfit?: number;
  expenses: { total: number; count: number; top: Array<{ name: string; amount: number }> };
  lowStock: { out: number; low: number };
  topItems: Array<{ name: string; qty: number; revenue: number }>;
  topStaff: Array<{ name: string; bills: number; total: number }>;
  branches: Array<{ id: string; name: string; sales: number; bills: number }>;
}

export interface DailySummaryPreview {
  summary: DailySummary;
  /** Drawer money is hidden from this user (Settings → Reports). */
  drawerHidden: boolean;
  message: { title: string; body: string };
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const dailySummaryApi = {
  status: () => apiClient.get('/reports/daily-summary').then((r) => unwrap<DailySummaryStatus>(r)),
  preview: (date?: string) =>
    apiClient.get('/reports/daily-summary/preview', { params: date ? { date } : {} }).then((r) => unwrap<DailySummaryPreview>(r)),
  send: (date?: string) =>
    apiClient.post('/reports/daily-summary/send', date ? { date } : {}).then((r) => unwrap<{ day: string; sent: number; emailed: number }>(r)),
};
