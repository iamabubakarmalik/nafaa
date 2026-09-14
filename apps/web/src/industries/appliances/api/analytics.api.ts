import { apiClient } from '@core/api/client';
import type { ApplianceCategoryType, ApplianceEnergyRating } from './products.api';

/**
 * Appliances analytics — backend:
 *   apps/api/src/industries/appliances/analytics/
 *
 * Chaar endpoint:
 *   profit      — maal + installation + repair + AMC + delivery
 *   low-stock   — kya khatam ho raha hai
 *   stock       — kitna paisa phansa hai, warranty kab khatam
 *   service     — service desk: technician, waqt, baqi paisa
 */

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

/* ═══════════ PROFIT ═══════════ */
export interface ProfitBucket {
  revenue: number;
  cost: number;
  profit: number;
  units: number;
  margin: number;
}

export interface RevenueStream {
  key: 'GOODS' | 'INSTALLATION' | 'SERVICE' | 'AMC' | 'DELIVERY' | 'POS_SERVICES';
  label: string;
  revenue: number;
  cost: number;
  profit: number;
  count: number;
}

export interface AppliancesProfit {
  range: { from: string; to: string };
  totals: {
    revenue: number; cost: number; profit: number; margin: number;
    units: number; salesCount: number;
  };
  /** Sirf maal ka munafa — services alag */
  goods: ProfitBucket;
  /** Paanch kamai ke raste */
  streams: RevenueStream[];
  installations: {
    jobs: number; revenue: number; materialCost: number; profit: number;
    freeJobs: number; avgTicket: number;
  };
  services: {
    jobs: number; revenue: number; partsCost: number; profit: number;
    warrantyJobs: number; amcJobs: number; unpaid: number; avgTicket: number;
  };
  amc: {
    contracts: number; billed: number; collected: number; pending: number;
    byType: { type: string; count: number; value: number; paid: number }[];
  };
  delivery: { trips: number; revenue: number; avgTrip: number };
  byCategory: (ProfitBucket & { categoryType: ApplianceCategoryType })[];
  byEnergyRating: (ProfitBucket & { energyRating: ApplianceEnergyRating })[];
  topBrands: (ProfitBucket & { id: string; name: string })[];
  topProducts: (ProfitBucket & { id: string; name: string; category: ApplianceCategoryType | null })[];
  byServiceType: { type: string; jobs: number; revenue: number; cost: number; profit: number }[];
  topIssues: { issue: string; jobs: number; revenue: number }[];
  daily: { date: string; revenue: number; profit: number; services: number }[];
}

/* ═══════════ LOW STOCK ═══════════ */
export interface ApplianceLowStockRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  category: string | null;
  categoryType: ApplianceCategoryType | null;
  modelNumber: string | null;
  capacity: string | null;
  energyRating: string | null;
  requiresSerial: boolean;
  requiresInstallation: boolean;
  installationCharge: number;
  warrantyMonths: number;
  stock: number;
  lowStockAlert: number;
  price: number;
  costPrice: number;
  stockValue: number;
  /** Dobara mangwane par kitna paisa lagega */
  reorderCost: number;
  isOut: boolean;
  notInShop: boolean;
}

export interface AppliancesLowStock {
  items: ApplianceLowStockRow[];
  byCategory: { categoryType: string; count: number; value: number }[];
  summary: {
    totalLow: number;
    totalOut: number;
    serialTrackedLow: number;
    valueAtRisk: number;
    reorderCost: number;
  };
}

/* ═══════════ STOCK REPORT ═══════════ */
export interface StockSerialRow {
  id: string;
  productId: string;
  name: string;
  brand: string | null;
  categoryType: ApplianceCategoryType | null;
  capacity: string | null;
  energyRating: string | null;
  serialNumber: string;
  modelNumber: string | null;
  batchNumber: string | null;
  manufactureDate: string | null;
  cost: number;
  price: number;
  ageDays: number;
  bucket: string;
  installationStatus: string;
  warrantyEndDate: string | null;
  warrantyDaysLeft: number | null;
  compressorWarrantyEndDate: string | null;
  compressorDaysLeft: number | null;
  motorWarrantyEndDate: string | null;
  motorDaysLeft: number | null;
  expiringKind?: string;
  expiringDays?: number;
}

export interface StockProductRow {
  productId: string;
  name: string;
  sku: string | null;
  unit: string;
  brand: string | null;
  categoryType: ApplianceCategoryType | null;
  stock: number;
  unitCost: number;
  price: number;
  value: number;
  retailValue: number;
}

export interface AppliancesStockReport {
  buckets: { key: string; label: string; units: number; value: number }[];
  byCategory: { categoryType: string; units: number; value: number }[];
  serials: StockSerialRow[];
  products: StockProductRow[];
  deadStock: { count: number; value: number; items: StockSerialRow[] };
  expiringWarranty: { count: number; items: StockSerialRow[] };
  /** Bik gaya lekin abhi laga nahi */
  pendingInstall: { count: number; items: StockSerialRow[] };
  totals: {
    serialUnits: number;
    serialValue: number;
    productLines: number;
    productUnits: number;
    productValue: number;
    totalValue: number;
    totalRetailValue: number;
    potentialProfit: number;
  };
}

/* ═══════════ SERVICE DESK ═══════════ */
export interface TechnicianPerf {
  id: string;
  name: string;
  phone: string;
  employeeCode: string;
  isActive: boolean;
  zone: string | null;
  specializations: string[];
  serviceJobs: number;
  installJobs: number;
  totalJobs: number;
  completed: number;
  open: number;
  revenue: number;
  partsCost: number;
  profit: number;
  commission: number;
  unpaid: number;
  avgRating: number | null;
  avgHours: number;
  completionRate: number;
}

export interface AppliancesServiceAnalytics {
  range: { from: string; to: string };
  totals: {
    serviceJobs: number; installJobs: number; completed: number;
    open: number; overdue: number; unresolved: number;
    revenue: number; collected: number; outstanding: number;
    cost: number; profit: number;
  };
  quality: {
    avgResolutionHours: number;
    sameDayFixes: number;
    sameDayRate: number;
    firstVisitFix: number;
    firstVisitFixRate: number;
    avgRating: number | null;
    ratingCount: number;
    warrantyJobs: number;
    amcJobs: number;
    paidJobs: number;
  };
  statusFunnel: { status: string; count: number }[];
  technicians: TechnicianPerf[];
  topIssues: { issue: string; jobs: number; revenue: number; avgHours: number }[];
  problemProducts: { productName: string; jobs: number; revenue: number; warrantyJobs: number }[];
  repeatCustomers: { phone: string; name: string; jobs: number; revenue: number; lastAt: string }[];
  zones: { zone: string; jobs: number; revenue: number }[];
  daily: { date: string; requested: number; completed: number; revenue: number }[];
  pendingFollowUps: {
    id: string; requestNumber: string; customerName: string; customerPhone: string;
    productName: string; followUpDate: string; followUpReason: string | null; isDue: boolean;
  }[];
  overdueJobs: {
    id: string; requestNumber: string; customerName: string; customerPhone: string;
    productName: string; status: string; scheduledDate: string;
    technicianName: string | null; daysLate: number;
  }[];
  amcExpiring: {
    id: string; contractNumber: string; customerName: string; customerPhone: string;
    expiryDate: string; daysLeft: number; visitsLeft: number; pending: number;
    freeVisitsAllowed: number; freeVisitsUsed: number; contractValue: number; paidAmount: number;
  }[];
}

export interface RangeParams { from?: string; to?: string }

export const appliancesAnalyticsApi = {
  profit: (params?: RangeParams) =>
    apiClient.get('/appliances/analytics/profit', { params }).then(unwrap<AppliancesProfit>),

  lowStock: () =>
    apiClient.get('/appliances/analytics/low-stock').then(unwrap<AppliancesLowStock>),

  stock: () =>
    apiClient.get('/appliances/analytics/stock').then(unwrap<AppliancesStockReport>),

  serviceDesk: (params?: RangeParams) =>
    apiClient.get('/appliances/analytics/service', { params }).then(unwrap<AppliancesServiceAnalytics>),
};
