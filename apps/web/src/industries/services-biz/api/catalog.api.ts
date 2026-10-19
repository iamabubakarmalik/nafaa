import { apiClient } from '@core/api/client';

export type BusinessType = 'ELECTRICIAN' | 'PLUMBER' | 'AC_TECHNICIAN' | 'APPLIANCE_REPAIR'
  | 'MOBILE_REPAIR' | 'COMPUTER_REPAIR' | 'IT_SERVICES' | 'CLEANING' | 'PEST_CONTROL'
  | 'CARPENTRY' | 'PAINTING' | 'MASONRY' | 'WELDING' | 'GLASS_WORK' | 'CCTV_INSTALLATION'
  | 'SOLAR_INSTALLATION' | 'GENERATOR_SERVICE' | 'UPS_SERVICE' | 'WATER_TANK_CLEANING'
  | 'HOME_MAINTENANCE' | 'OFFICE_MAINTENANCE' | 'AUTOMOBILE_MECHANIC' | 'MOTORCYCLE_MECHANIC'
  | 'MOVERS_PACKERS' | 'INTERIOR_DESIGN' | 'LANDSCAPING' | 'HVAC' | 'ELEVATOR_MAINTENANCE'
  | 'FIRE_SAFETY' | 'SECURITY_SYSTEMS' | 'OTHER';

export type ServiceCategory = 'INSTALLATION' | 'REPAIR' | 'MAINTENANCE' | 'INSPECTION'
  | 'CLEANING_SERVICE' | 'UPGRADE' | 'REPLACEMENT' | 'DIAGNOSTIC' | 'EMERGENCY'
  | 'CONSULTATION' | 'AMC_VISIT' | 'WARRANTY_CLAIM' | 'RETURN_VISIT' | 'OTHER_SERVICE';

export type ChargeType = 'FIXED' | 'HOURLY' | 'PER_VISIT' | 'DISTANCE_BASED'
  | 'COMPLEXITY_BASED' | 'QUOTE_BASED' | 'FREE_UNDER_WARRANTY' | 'FREE_UNDER_AMC';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  category: ServiceCategory;
  businessType?: BusinessType | null;
  chargeType: ChargeType;
  baseCharge: number;
  hourlyRate: number;
  visitCharge: number;
  minCharge: number;
  maxCharge?: number | null;
  emergencyCharge: number;
  weekendCharge: number;
  nightCharge: number;
  outOfCityCharge: number;
  estimatedDurationMin: number;
  warrantyDays: number;
  warrantyTerms?: string | null;
  isEmergency: boolean;
  requiresQuote: boolean;
  requiresAdvance: boolean;
  advancePct: number;
  isPopular: boolean;
  isFeatured: boolean;
  isActive: boolean;
  totalJobs: number;
  totalRevenue: number;
  /** The matching counter product (unit "service"). */
  productId?: string | null;
  createdAt: string;
  /** Returned by the API but not edited from the service form; read by the shared catalog. */
  requiredSkillLevel: string;
  requiresLicense: boolean;
  licenseType?: string | null;
  warrantyType: string;
  isRemoteAvailable: boolean;
  imageUrl?: string | null;
  imageUrls: string[];
}

export interface ServiceDetail extends ServiceCatalogItem {
  jobsByStatus: Array<{ status: string; count: number }>;
  recentJobs: Array<{ id: string; jobNumber: string; customerName?: string | null; status: string; totalCharge: number; createdAt: string }>;
}

export type ServiceInput = Partial<Omit<ServiceCatalogItem, 'id' | 'totalJobs' | 'totalRevenue' | 'productId' | 'createdAt'>> & { name: string };

const unwrap = <T,>(res: { data: unknown }): T => ((res.data as { data?: T })?.data ?? res.data) as T;

export const catalogApi = {
  create: (data: ServiceInput) => apiClient.post('/services-biz/catalog', data).then(unwrap<ServiceCatalogItem>),
  list: (params?: { search?: string; category?: string; businessType?: string; active?: boolean }) =>
    apiClient.get('/services-biz/catalog', { params }).then(unwrap<ServiceCatalogItem[]>),
  getOne: (id: string) => apiClient.get(`/services-biz/catalog/${id}`).then(unwrap<ServiceDetail>),
  update: (id: string, data: ServiceInput) => apiClient.patch(`/services-biz/catalog/${id}`, data).then(unwrap<ServiceCatalogItem>),
  remove: (id: string) => apiClient.delete(`/services-biz/catalog/${id}`).then(unwrap<ServiceCatalogItem>),
  syncProducts: () => apiClient.post('/services-biz/catalog/sync-products').then(unwrap<{ created: number; total: number }>),
};
