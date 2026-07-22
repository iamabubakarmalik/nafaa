import { apiClient } from '@/api/client';

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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const customOrdersApi = {
  create: (data: any) => apiClient.post('/jewelry/custom-orders', data).then(unwrap<CustomOrder>),
  list: (params?: any) => apiClient.get('/jewelry/custom-orders', { params }).then(unwrap<CustomOrder[]>),
  getOne: (id: string) => apiClient.get('/jewelry/custom-orders/' + id).then(unwrap<CustomOrder>),
  update: (id: string, data: any) => apiClient.patch('/jewelry/custom-orders/' + id, data).then(unwrap<CustomOrder>),
  updateStatus: (id: string, status: string, reason?: string) => apiClient.post('/jewelry/custom-orders/' + id + '/status', { status, reason }).then(unwrap<CustomOrder>),
  issueMetal: (id: string, grams: number) => apiClient.post('/jewelry/custom-orders/' + id + '/issue-metal', { grams }).then(unwrap<CustomOrder>),
  receiveMetal: (id: string, receivedGrams: number, wastageGrams: number) => apiClient.post('/jewelry/custom-orders/' + id + '/receive-metal', { receivedGrams, wastageGrams }).then(unwrap<CustomOrder>),
  approveDesign: (id: string, designUrl: string) => apiClient.post('/jewelry/custom-orders/' + id + '/approve-design', { designUrl }).then(unwrap<CustomOrder>),
  addPayment: (id: string, amount: number) => apiClient.post('/jewelry/custom-orders/' + id + '/payment', { amount }).then(unwrap<CustomOrder>),
  rate: (id: string, rating: number, feedback?: string) => apiClient.post('/jewelry/custom-orders/' + id + '/rate', { rating, feedback }).then(unwrap<CustomOrder>),
};
