import { apiClient } from '@core/api/client';

export type TeamOrderStatus = 'DRAFT' | 'QUOTED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface TeamOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  size?: string;
  color?: string;
  customizationNotes?: string;
}

export interface SportsTeamOrder {
  id: string;
  orderNumber: string;
  teamName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  organization?: string;
  city?: string;
  address?: string;
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
  customizationDetails?: string;
  playerNames?: any;
  playerNumbers?: any;
  teamLogoUrl?: string;
  advancePaid: number;
  balanceAmount: number;
  paymentMethod?: string;
  quotedAt?: string;
  confirmedAt?: string;
  expectedDeliveryDate?: string;
  deliveredAt?: string;
  quotationUrl?: string;
  invoiceUrl?: string;
  poNumber?: string;
  notes?: string;
  internalNotes?: string;
  handledById?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const teamOrdersApi = {
  create: (data: Partial<SportsTeamOrder>) =>
    apiClient.post('/sports/team-orders', data).then(unwrap<SportsTeamOrder>),

  list: (params?: { status?: string; hasCustomJerseys?: boolean; from?: string; to?: string; search?: string }) =>
    apiClient.get('/sports/team-orders', { params }).then(unwrap<SportsTeamOrder[]>),

  summary: () => apiClient.get('/sports/team-orders/summary').then(unwrap<any>),

  upcomingDeliveries: (days = 14) =>
    apiClient.get('/sports/team-orders/upcoming-deliveries', { params: { days } }).then(unwrap<SportsTeamOrder[]>),

  getOne: (id: string) =>
    apiClient.get('/sports/team-orders/' + id).then(unwrap<SportsTeamOrder>),

  update: (id: string, data: Partial<SportsTeamOrder>) =>
    apiClient.patch('/sports/team-orders/' + id, data).then(unwrap<SportsTeamOrder>),

  updateStatus: (id: string, data: { status: TeamOrderStatus; notes?: string }) =>
    apiClient.patch('/sports/team-orders/' + id + '/status', data).then(unwrap<SportsTeamOrder>),

  recordPayment: (id: string, data: { amount: number; paymentMethod?: string; notes?: string }) =>
    apiClient.post('/sports/team-orders/' + id + '/payment', data).then(unwrap<SportsTeamOrder>),

  remove: (id: string) =>
    apiClient.delete('/sports/team-orders/' + id).then(unwrap),
};
