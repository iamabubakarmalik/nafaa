import { apiClient } from '@/api/client';

export interface CarpetOverview {
  activeRollCount: number;
  finishedRollCount: number;
  damagedRollCount: number;
  cutPieceAvailableCount: number;
  cutPieceSoldCount: number;
  totalSqftAvailable: number;
  cutPiecesSqft: number;
  grandTotalSqft: number;
  totalStockCost: number;
  totalStockSaleValue: number;
  potentialProfit: number;
  cutPiecesCost: number;
  cutPiecesSaleValue: number;
}

export interface RollProfitRow {
  id: string;
  rollNumber: string;
  productName: string;
  variantName: string | null;
  variantColor: string | null;
  shopName: string | null;
  status: string;
  originalLengthFt: number;
  remainingLengthFt: number;
  originalSqft: number;
  remainingSqft: number;
  costPerSqft: number;
  salePricePerSqft: number;
  soldLengthFt: number;
  soldSqft: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  usagePercent: number;
  salesCount: number;
  receivedAt: string;
  lastSaleDate: string | null;
}

export interface SlowMovingRoll {
  id: string;
  rollNumber: string;
  productName: string;
  variantName: string | null;
  shopName: string | null;
  remainingLengthFt: number;
  remainingSqft: number;
  costPerSqft: number;
  stockValueCost: number;
  stockValueSale: number;
  receivedAt: string;
  lastSaleDate: string | null;
  daysSinceLastActivity: number;
}

export interface TodaysCut {
  id: string;
  rollNumber: string;
  productName: string;
  variantName: string | null;
  variantColor: string | null;
  shopName: string | null;
  lengthFt: number;
  sqft: number;
  note: string | null;
  saleId: string | null;
  createdAt: string;
}

export interface TodaysCutsResponse {
  cutCount: number;
  totalSqftSold: number;
  totalLengthSoldFt: number;
  cuts: TodaysCut[];
}

export interface TopDesign {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  variantColor: string | null;
  totalSqft: number;
  totalLengthFt: number;
  salesCount: number;
  revenue: number;
}

export interface CutPieceItem {
  id: string;
  pieceCode: string;
  productName: string;
  variantName: string | null;
  variantColor: string | null;
  shopName: string | null;
  sourceRoll: string | null;
  widthFt: number;
  lengthFt: number;
  totalSqft: number;
  costAmount: number;
  salePrice: number;
  status: string;
  condition: string | null;
  createdAt: string;
  soldAt: string | null;
}

export interface CutPiecesReport {
  totalCount: number;
  availableCount: number;
  soldCount: number;
  damagedCount: number;
  availableSqft: number;
  availableValue: number;
  availableCost: number;
  potentialProfit: number;
  soldRevenue: number;
  pieces: CutPieceItem[];
}

const unwrap = <T>(res: { data: { data: T } }): T => res.data.data;

export const carpetReportsApi = {
  overview: (shopId?: string) =>
    apiClient
      .get<{ data: CarpetOverview }>('/carpet-reports/overview', {
        params: { shopId },
      })
      .then(unwrap),

  rollProfit: (shopId?: string) =>
    apiClient
      .get<{ data: RollProfitRow[] }>('/carpet-reports/roll-profit', {
        params: { shopId },
      })
      .then(unwrap),

  slowMoving: (days = 30, shopId?: string) =>
    apiClient
      .get<{ data: SlowMovingRoll[] }>('/carpet-reports/slow-moving', {
        params: { days, shopId },
      })
      .then(unwrap),

  todaysCuts: (shopId?: string) =>
    apiClient
      .get<{ data: TodaysCutsResponse }>('/carpet-reports/todays-cuts', {
        params: { shopId },
      })
      .then(unwrap),

  topDesigns: (days = 30, shopId?: string) =>
    apiClient
      .get<{ data: TopDesign[] }>('/carpet-reports/top-designs', {
        params: { days, shopId },
      })
      .then(unwrap),

  cutPiecesReport: (shopId?: string) =>
    apiClient
      .get<{ data: CutPiecesReport }>('/carpet-reports/cut-pieces', {
        params: { shopId },
      })
      .then(unwrap),
};
