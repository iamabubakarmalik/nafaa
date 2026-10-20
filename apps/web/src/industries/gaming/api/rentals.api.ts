import { apiClient } from '@core/api/client';

export type GamingRentalStatus = 'RESERVED' | 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'DAMAGED' | 'LOST' | 'CANCELLED';

export interface GamingRental {
  id: string;
  rentalNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerCnic?: string;
  productId?: string;
  productName: string;
  serialNumber?: string;
  status: GamingRentalStatus;
  rentalStartDate: string;
  rentalEndDate: string;
  actualReturnDate?: string;
  daysRented: number;
  hoursRented?: number;
  pricePerDay: number;
  totalPrice: number;
  depositAmount: number;
  depositRefunded: number;
  paidAmount: number;
  remainingAmount: number;
  conditionAtCheckout?: string;
  conditionAtReturn?: string;
  damageFee: number;
  lateFee: number;
  photosAtCheckout: string[];
  photosAtReturn: string[];
  customerSignatureUrl?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  securityDocument?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data?: { data?: unknown } }): T => (res.data?.data ?? res.data) as T;

export interface RentalInput {
  customerId?: string; customerName: string; customerPhone?: string; customerCnic?: string;
  productId?: string; productName: string; serialNumber?: string;
  rentalStartDate: string; rentalEndDate: string; daysRented: number; pricePerDay: number;
  depositAmount?: number; paidAmount?: number; paymentMethod?: string;
  conditionAtCheckout?: string; guarantorName?: string; guarantorPhone?: string; securityDocument?: string; notes?: string;
}
export interface RentalSummary { active: number; overdue: number; returned: number; totalRevenue: number; collected: number; due: number; depositsHeld: number }
export interface RentalPage { items: GamingRental[]; total: number; page: number; limit: number }

export const gamingRentalsApi = {
  create: (data: RentalInput) => apiClient.post('/gaming/rentals', data).then(unwrap<GamingRental>),
  page: (params: { status?: string; search?: string; from?: string; to?: string; page: number; limit: number }) =>
    apiClient.get('/gaming/rentals', { params }).then(unwrap<RentalPage>),
  summary: () => apiClient.get('/gaming/rentals/summary').then(unwrap<RentalSummary>),
  returnRental: (id: string, data: { conditionAtReturn?: string; damageFee?: number; lateFee?: number; paidAmount?: number; paymentMethod?: string }) =>
    apiClient.post('/gaming/rentals/' + id + '/return', data).then(unwrap<GamingRental>),
  updateStatus: (id: string, data: { status: GamingRentalStatus; notes?: string }) =>
    apiClient.patch('/gaming/rentals/' + id + '/status', data).then(unwrap<GamingRental>),
};
