import { apiClient } from '@core/api/client';

export interface ServiceCustomerProfile {
  id: string;
  customerId: string;
  propertyType?: string;
  propertySize?: string;
  ownershipType?: string;
  preferredTechnicianId?: string;
  preferredTimeSlot?: string;
  paymentPreference?: string;
  assetsOwned?: any;
  emergencyAccessInstructions?: string;
  hasSecurityGuard: boolean;
  hasPets: boolean;
  petDetails?: string;
  gateCode?: string;
  buildingName?: string;
  floorNumber?: string;
  flatNumber?: string;
  preferredContact: string;
  bestTimeToCall?: string;
  totalJobs: number;
  totalSpent: number;
  lastServiceAt?: string;
  avgRating?: number;
  isVip: boolean;
  hasActiveAmc: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const serviceCustomerProfilesApi = {
  upsert: (data: Partial<ServiceCustomerProfile>) => apiClient.post('/services-biz/customer-profiles', data).then(unwrap<ServiceCustomerProfile>),
  list: (params?: any) => apiClient.get('/services-biz/customer-profiles', { params }).then(unwrap<ServiceCustomerProfile[]>),
  byCustomer: (customerId: string) => apiClient.get('/services-biz/customer-profiles/by-customer/' + customerId).then(unwrap<ServiceCustomerProfile | null>),
};
