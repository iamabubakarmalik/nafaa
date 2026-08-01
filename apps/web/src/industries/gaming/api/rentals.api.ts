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

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const gamingRentalsApi = {
  create: (data: Partial<GamingRental>) =>
    apiClient.post('/gaming/rentals', data).then(unwrap<GamingRental>),

  list: (params?: { status?: string; customerId?: string; from?: string; to?: string; search?: string }) =>
    apiClient.get('/gaming/rentals', { params }).then(unwrap<GamingRental[]>),

  summary: () => apiClient.get('/gaming/rentals/summary').then(unwrap<any>),

  markOverdue: () => apiClient.post('/gaming/rentals/mark-overdue').then(unwrap<any>),

  getOne: (id: string) => apiClient.get('/gaming/rentals/' + id).then(unwrap<GamingRental>),

  returnRental: (id: string, data: {
    conditionAtReturn?: string; photosAtReturn?: string[];
    damageFee?: number; lateFee?: number; depositRefunded?: number;
  }) => apiClient.post('/gaming/rentals/' + id + '/return', data).then(unwrap<GamingRental>),

  updateStatus: (id: string, data: { status: GamingRentalStatus; notes?: string }) =>
    apiClient.patch('/gaming/rentals/' + id + '/status', data).then(unwrap<GamingRental>),
};
