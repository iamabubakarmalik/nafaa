/**
 * Customers report API. Periods are business-day keys (`from = 'all'` for
 * all time). Profit fields are removed by the server for users without cost
 * access, so they are optional here.
 */

import { apiClient } from '@core/api/client';

export interface Period { from: string; to: string }
interface Meta { from: string; to: string; grouping: 'day' | 'month' }

interface BuyerTotals {
  buyers: number; newBuyers: number; returning: number; repeat: number; repeatRate: number; signups: number;
  named: number; namedBills: number; newNet: number; returningNet: number; walkIn: number; walkInBills: number;
  namedShare: number; avgSpend: number; avgBasket: number; walkInBasket: number; avgVisits: number; credit: number;
  profit?: number; margin?: number;
}

export interface TopCustomer {
  id: string; name: string; phone: string | null; city: string | null; isVip: boolean; isActive: boolean;
  bills: number; visits: number; net: number; average: number; credit: number; profit?: number;
  lastAt: string; firstAt: string; isNew: boolean; daysSince: number;
}

interface PlaceGroup {
  rows: Array<{ name: string; buyers: number; net: number }>;
  others: { groups: number; buyers: number; net: number } | null;
  missing: { buyers: number; net: number };
}

export interface Overview extends Meta {
  totals: BuyerTotals;
  previous: BuyerTotals | null;
  trend: Array<{ key: string; newBuyers: number; returningBuyers: number; named: number; walkIn: number; namedBills: number; walkInBills: number }>;
  visits: Array<{ key: string; label: string; customers: number; net: number }>;
  frequency: { customers: number; avgDays: number | null; medianDays: number | null };
  top: { spend: TopCustomer[]; visits: TopCustomer[]; profit?: TopCustomer[]; credit: TopCustomer[] };
  cities: PlaceGroup;
  areas: PlaceGroup;
  genders: Array<{ key: 'MALE' | 'FEMALE' | 'OTHER'; buyers: number; net: number }>;
  branches: Array<{ id: string | null; name: string; buyers: number; named: number; walkIn: number }>;
}

export type SegmentKey = 'champions' | 'loyal' | 'promising' | 'attention' | 'atRisk' | 'lost' | 'never';

interface SegmentSummary {
  key: Exclude<SegmentKey, 'never'>; customers: number; net: number; share: number;
  avgDays: number; avgVisits: number; avgSpend: number; withPhone: number; owing: number;
}

export interface SegmentCustomer {
  id: string; name: string; phone: string | null; city: string | null; gender: string | null; isVip: boolean;
  lastAt: string | null; firstAt: string | null; joinedAt: string | null; days: number | null;
  visits: number; bills: number; net: number; lifetime: number; average: number; balance: number; points: number;
  r: number | null; f: number | null;
}

export interface Segments {
  asOf: string; customers: number; activeYear: number; net: number; never: number;
  segments: SegmentSummary[];
  grid: number[][];
  segment: SegmentKey | null;
  rows: SegmentCustomer[] | null;
}

export interface Cohorts {
  months: number; from: string; to: string; newCustomers: number;
  cohorts: Array<{ key: string; size: number; net: number; cells: Array<{ offset: number; customers: number; pct: number; net: number }> }>;
  curve: Array<{ offset: number; pct: number | null; cohorts: number }>;
}

export type AgeKey = 'd30' | 'd60' | 'd90' | 'd180' | 'old';

export interface Debtor {
  id: string; name: string; phone: string | null; city: string | null; gender: string | null; isVip: boolean; isActive: boolean;
  balance: number; creditLimit: number; overLimit: boolean; oldestDays: number | null; over60: number;
  ages: Record<AgeKey, number>; lastPaymentAt: string | null; daysSincePayment: number | null; paidInPeriod: number;
}

export interface Khata extends Meta {
  totals: {
    receivable: number; owing: number; advance: number; advanceCount: number; overLimit: number; noPayment60: number; over60: number;
    opening: number; closing: number; given: number; received: number; reduced: number;
    payments: number; payers: number; takers: number; creditBills: number; creditShare: number;
    collectionRate: number | null; daysToCollect: number | null;
  };
  previous: { given: number; received: number; collectionRate: number | null; daysToCollect: number | null } | null;
  aging: Array<{ key: AgeKey; label: string; amount: number; customers: number }>;
  trend: Array<{ key: string; given: number; received: number }>;
  rows: Debtor[];
}

interface LoyaltyTotals {
  issued: number; redeemed: number; expired: number; adjusted: number; earners: number; redeemers: number;
  issuedValue: number; redeemRate: number | null;
}

export interface Loyalty extends Meta {
  enabled: boolean;
  settings: { pointsPerRupee: number; redemptionRate: number; expiryDays: number; minRedeem: number };
  outstanding: { points: number; value: number; holders: number };
  totals: LoyaltyTotals & { redeemedValue: number; redeemBills: number; memberShare: number };
  previous: LoyaltyTotals | null;
  trend: Array<{ key: string; issued: number; redeemed: number }>;
  top: Array<{ id: string; name: string; phone: string | null; city: string | null; gender: string | null; isVip: boolean; points: number; value: number; spent: number }>;
}

const BASE = '/reports/customer-insights';
const get = <T>(path: string, params: object) =>
  apiClient.get<{ data: T }>(`${BASE}/${path}`, { params }).then((res) => res.data.data);

/** `branch` narrows the owner's all-branches view to one branch. */
export const customersReportApi = {
  overview: (p: Period, branch?: string) => get<Overview>('overview', { ...p, branch }),
  segments: (segment?: SegmentKey, branch?: string) => get<Segments>('segments', { segment, branch }),
  cohorts: (months: number, branch?: string) => get<Cohorts>('cohorts', { months, branch }),
  khata: (p: Period, branch?: string) => get<Khata>('khata', { ...p, branch }),
  loyalty: (p: Period, branch?: string) => get<Loyalty>('loyalty', { ...p, branch }),
};

/** Query key root for every customers report call. */
export const CUSTOMERS_REPORT_KEY = 'customers-report';
