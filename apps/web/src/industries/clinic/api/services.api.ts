import { apiClient } from '@core/api/client';

export type ServiceCategory =
  | 'CONSULTATION' | 'PROCEDURE' | 'SURGERY' | 'DIAGNOSTIC'
  | 'LAB_TEST' | 'IMAGING' | 'VACCINATION' | 'DENTAL'
  | 'PHYSIOTHERAPY' | 'COUNSELING' | 'HEALTH_PACKAGE'
  | 'EMERGENCY' | 'HOME_VISIT' | 'TELEMEDICINE' | 'OTHER';

export interface ClinicService {
  id: string;
  name?: string;
  productId: string;
  serviceCode?: string;
  category: ServiceCategory;
  subcategory?: string;
  durationMin?: number;
  requiresDoctor: boolean;
  requiresAppointment: boolean;
  requiresFasting: boolean;
  requiresPrepInstructions?: string;
  basePrice: number;
  followUpPrice?: number;
  emergencyPrice?: number;
  telemedicinePrice?: number;
  homeVisitPrice?: number;
  discountedPrice?: number;
  packageIncludes: string[];
  contraindications?: string;
  sideEffects?: string;
  prepInstructions?: string;
  postCareInstructions?: string;
  isActive: boolean;
  isPopular: boolean;
  isFeatured: boolean;
  isDiscounted: boolean;
  imageUrls: string[];
  descriptionLong?: string;
  product?: any;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: { data?: { data?: T } & T }): T => (res.data?.data ?? res.data) as T;

export const clinicServicesApi = {
  list: (params?: Record<string, unknown>) => apiClient.get('/clinic/services', { params }).then(unwrap<ClinicService[]>),
  getOne: (id: string) => apiClient.get('/clinic/services/' + id).then(unwrap<ClinicService>),
  byProduct: (productId: string) => apiClient.get('/clinic/services/by-product/' + productId).then(unwrap<ClinicService | null>),
  /** Creates the service for a product, or updates the one already tied to it. */
  upsert: (data: Partial<ClinicService>) => apiClient.post('/clinic/services', data).then(unwrap<ClinicService>),
  update: (id: string, data: Partial<ClinicService>) => apiClient.patch('/clinic/services/' + id, data).then(unwrap<ClinicService>),
  remove: (id: string) => apiClient.delete('/clinic/services/' + id).then(unwrap),
};
