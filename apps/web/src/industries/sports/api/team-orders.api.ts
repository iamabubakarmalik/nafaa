import { apiClient } from '@core/api/client';

export type TeamOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type TeamView = 'active' | 'quote' | 'production' | 'ready' | 'late' | 'unpaid' | 'done' | 'all';

export interface TeamOrderItem {
  productId: string;
  variantId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  /** Name / number printing per piece, on top of the rate. */
  printingPrice?: number;
  total: number;
  size?: string;
  color?: string;
  customizationNotes?: string;
}

/** A player on the printing list. */
export interface RosterRow { name: string; number: string; size: string }

export interface SportsTeamOrder {
  id: string;
  orderNumber: string;
  /** The team's khata, once an advance or bill put money there. */
  customerId?: string | null;
  teamName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string | null;
  organization?: string | null;
  city?: string | null;
  address?: string | null;
  status: TeamOrderStatus;
  items: TeamOrderItem[];
  totalQuantity: number;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  taxAmount: number;
  shippingCharge: number;
  totalAmount: number;
  hasCustomJerseys: boolean;
  customizationDetails?: string | null;
  playerNames?: RosterRow[] | null;
  teamLogoUrl?: string | null;
  advancePaid: number;
  balanceAmount: number;
  paymentMethod?: string | null;
  quotedAt?: string | null;
  confirmedAt?: string | null;
  expectedDeliveryDate?: string | null;
  deliveredAt?: string | null;
  invoiceUrl?: string | null;
  poNumber?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** One order with its delivery bill and the advance already given back. */
export interface TeamOrderDetail extends SportsTeamOrder {
  sale: { id: string; saleNumber: string } | null;
  refunded: number;
}

export interface TeamOrderInput {
  teamName: string; contactPerson: string; contactPhone: string; organization?: string; city?: string; address?: string;
  items: Array<Omit<TeamOrderItem, 'total'>>;
  discountPct?: number; shippingCharge?: number;
  hasCustomJerseys?: boolean; customizationDetails?: string; playerNames?: RosterRow[];
  advancePaid?: number; paymentMethod?: string; expectedDeliveryDate?: string; poNumber?: string; notes?: string; internalNotes?: string;
}

export interface TeamPage {
  items: SportsTeamOrder[];
  total: number;
  page: number;
  pages: number;
  counts: Record<TeamView, number>;
  totals: { value: number; advance: number; due: number };
}

export interface TeamQuery { view?: TeamView; search?: string; from?: string; to?: string; page?: number; limit?: number }

const unwrap = <T,>(res: { data: { data?: T } | T }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const teamOrdersApi = {
  create: (data: TeamOrderInput) => apiClient.post('/sports/team-orders', data).then(unwrap<SportsTeamOrder>),
  page: (params: TeamQuery) => apiClient.get('/sports/team-orders/page', { params }).then(unwrap<TeamPage>),
  summary: () => apiClient.get('/sports/team-orders/summary').then(unwrap<unknown>),
  getOne: (id: string) => apiClient.get('/sports/team-orders/' + id).then(unwrap<TeamOrderDetail>),
  update: (id: string, data: Partial<TeamOrderInput>) => apiClient.patch('/sports/team-orders/' + id, data).then(unwrap<SportsTeamOrder>),
  updateStatus: (id: string, data: { status: TeamOrderStatus; notes?: string; paidNow?: number; paymentMethod?: string }) =>
    apiClient.patch('/sports/team-orders/' + id + '/status', data).then(unwrap<SportsTeamOrder>),
  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; notes?: string }) =>
    apiClient.post('/sports/team-orders/' + id + '/payment', data).then(unwrap<SportsTeamOrder>),
  /** Gives back in cash the advance of a cancelled order. */
  refund: (id: string, managerPin?: string) => apiClient.post('/sports/team-orders/' + id + '/refund', { managerPin }).then(unwrap<SportsTeamOrder>),
  /** Cancels the order; nothing is deleted. */
  cancel: (id: string) => apiClient.delete('/sports/team-orders/' + id).then(unwrap<SportsTeamOrder>),
};
