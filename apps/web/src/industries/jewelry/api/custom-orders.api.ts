import { apiClient } from '@core/api/client';

export interface CustomOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderDate: string;
  promisedDate?: string;
  status: string;
  category: string;
  metalType: string;
  purity: string;
  style: string;
  expectedGrossWeight: number;
  expectedNetWeight?: number;
  expectedMakingCharges?: number;
  advancePayment: number;
  estimatedPrice: number;
  finalPrice?: number;
  designDescription: string;
  referenceImageUrls: string[];
  approvedDesignUrl?: string;
  hasGemstones: boolean;
  gemstonesRequired?: any;
  hasEngraving: boolean;
  engravingText?: string;
  designedBy?: string;
  assignedKarigarId?: string;
  assignedKarigarName?: string;
  metalIssuedGrams?: number;
  metalIssuedDate?: string;
  metalReceivedGrams?: number;
  metalReceivedDate?: string;
  wastageGrams?: number;
  designStartedAt?: string;
  designApprovedAt?: string;
  productionStartedAt?: string;
  polishingStartedAt?: string;
  qualityCheckedAt?: string;
  hallmarkedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  customerRating?: number;
  customerFeedback?: string;
  paidAmount: number;
  paymentStatus: string;
  hallmarkNumber?: string;
  certificateNumber?: string;
  internalNotes?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderView = 'active' | 'today' | 'late' | 'work' | 'ready' | 'unpaid' | 'done' | 'all';

/** A row of the orders page: the order, old gold given toward it and what is still due. */
export interface CustomOrderRow extends CustomOrder {
  goldAdvance: { grams: number; value: number; count: number };
  due: number;
}

export interface CustomOrderPage {
  view: OrderView; page: number; limit: number; total: number; pages: number;
  counts: Record<OrderView, number>;
  totals: { value: number; paid: number };
  items: CustomOrderRow[];
}

export interface CustomOrderSummary { active: number; today: number; late: number; ready: number; work: number; value: number; advance: number; grams: number }

export interface CustomOrderQuery { view?: OrderView; search?: string; karigarId?: string; from?: string; to?: string; page?: number; limit?: number; sort?: 'due' | 'recent' | 'amount' }

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const customOrdersApi = {
  page: (params: CustomOrderQuery) => apiClient.get('/jewelry/custom-orders/page', { params }).then(unwrap<CustomOrderPage>),
  summary: () => apiClient.get('/jewelry/custom-orders/summary').then(unwrap<CustomOrderSummary>),
  goldAdvance: (id: string, data: { grams: number; purity: string; deductionPct?: number; value?: number; testedBy?: string; notes?: string }) =>
    apiClient.post('/jewelry/custom-orders/' + id + '/gold-advance', data).then(unwrap<unknown>),
  create: (data: any) => apiClient.post('/jewelry/custom-orders', data).then(unwrap<CustomOrder>),
  update: (id: string, data: any) => apiClient.patch('/jewelry/custom-orders/' + id, data).then(unwrap<CustomOrder>),
  updateStatus: (id: string, status: string, reason?: string, managerPin?: string) =>
    apiClient.post('/jewelry/custom-orders/' + id + '/status', { status, reason, ...(managerPin && { managerPin }) }).then(unwrap<CustomOrder>),
  issueMetal: (id: string, data: { grams: number; purity?: string; karigarId?: string }) => apiClient.post('/jewelry/custom-orders/' + id + '/issue-metal', data).then(unwrap<CustomOrder>),
  receiveMetal: (id: string, data: { receivedGrams: number; wastageGrams?: number; returnedGrams?: number }) => apiClient.post('/jewelry/custom-orders/' + id + '/receive-metal', data).then(unwrap<CustomOrder>),
  addPayment: (id: string, amount: number, paymentMethod?: string) => apiClient.post('/jewelry/custom-orders/' + id + '/payment', { amount, paymentMethod }).then(unwrap<CustomOrder>),
};
