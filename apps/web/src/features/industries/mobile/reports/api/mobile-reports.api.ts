import { apiClient } from '@/api/client';
import type { PtaStatus } from '../../api/imei.api';
import type { UsedPhoneCondition } from '../../api/used-phones.api';
import type { RepairStatus } from '../../repairs/api/repairs.api';
import type { EmiPlanStatus } from '../../emi/api/emi.api';

export interface MobileDashboard {
  newPhonesInStock: number;
  newPhonesStockValue: number;
  ptaTaxLocked: number;
  usedPhonesInStock: number;
  usedPhonesStockValue: number;
  usedPhonesPotentialRevenue: number;
  openRepairTickets: number;
  activeEmiPlans: number;
  emiOutstanding: number;
  monthRevenue: number;
  monthCogs: number;
  monthProfit: number;
  monthSalesCount: number;
}

export interface PtaBreakdownRow {
  ptaStatus: PtaStatus;
  count: number;
  taxPaid: number;
  stockValue: number;
}

export interface TopBrand {
  brandId: string;
  brandName: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface RepairAnalytics {
  byStatus: { status: RepairStatus; count: number }[];
  delivered: number;
  totalRevenue: number;
  partsCost: number;
  laborRevenue: number;
  collected: number;
  grossProfit: number;
  topBrands: { brand: string; count: number }[];
}

export interface EmiAnalytics {
  byStatus: { status: EmiPlanStatus; count: number; financed: number; remaining: number }[];
  activeFinanced: number;
  activePaid: number;
  activeRemaining: number;
  overdueCount: number;
  overdueAmount: number;
  collectedThisMonth: number;
  collectedCountThisMonth: number;
}

export interface UsedPhoneAnalytics {
  byCondition: { condition: UsedPhoneCondition; count: number; totalCost: number; resalePrice: number }[];
  soldCount: number;
  soldRevenue: number;
  soldCogs: number;
  soldProfit: number;
  inStockCount: number;
  inStockCost: number;
  inStockResale: number;
  inStockPotentialProfit: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const mobileReportsApi = {
  dashboard: () =>
    apiClient.get('/mobile-reports/dashboard').then(unwrap) as Promise<MobileDashboard>,
  ptaBreakdown: () =>
    apiClient.get('/mobile-reports/pta-breakdown').then(unwrap) as Promise<PtaBreakdownRow[]>,
  topBrands: (days = 30) =>
    apiClient.get('/mobile-reports/top-brands', { params: { days } }).then(unwrap) as Promise<TopBrand[]>,
  repairAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/repair-analytics', { params: { days } }).then(unwrap) as Promise<RepairAnalytics>,
  emiAnalytics: () =>
    apiClient.get('/mobile-reports/emi-analytics').then(unwrap) as Promise<EmiAnalytics>,
  usedPhoneAnalytics: (days = 30) =>
    apiClient.get('/mobile-reports/used-phone-analytics', { params: { days } }).then(unwrap) as Promise<UsedPhoneAnalytics>,
};
