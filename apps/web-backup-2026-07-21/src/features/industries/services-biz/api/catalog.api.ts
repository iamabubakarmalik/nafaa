import { apiClient } from '@/api/client';

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

export type TechLevel = 'APPRENTICE' | 'JUNIOR' | 'SENIOR' | 'EXPERT' | 'MASTER' | 'SUPERVISOR' | 'MANAGER';
export type WarrantyType = 'MANUFACTURER' | 'SERVICE_PROVIDER' | 'EXTENDED' | 'PARTS_ONLY' | 'LABOR_ONLY' | 'FULL' | 'NONE';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category: ServiceCategory;
  businessType?: BusinessType;
  chargeType: ChargeType;
  baseCharge: number;
  hourlyRate: number;
  visitCharge: number;
  minCharge: number;
  maxCharge?: number;
  emergencyCharge: number;
  weekendCharge: number;
  nightCharge: number;
  outOfCityCharge: number;
  estimatedDurationMin: number;
  requiredSkillLevel: TechLevel;
  requiredTools: string[];
  requiredParts: string[];
  requiresLicense: boolean;
  licenseType?: string;
  warrantyDays: number;
  warrantyType: WarrantyType;
  warrantyTerms?: string;
  isEmergency: boolean;
  isRemoteAvailable: boolean;
  requiresQuote: boolean;
  requiresAdvance: boolean;
  advancePct: number;
  imageUrl?: string;
  imageUrls: string[];
  videoUrl?: string;
  displayOrder: number;
  isPopular: boolean;
  isFeatured: boolean;
  isActive: boolean;
  totalJobs: number;
  totalRevenue: number;
  avgRating?: number;
  createdAt: string;
  updatedAt: string;
}

const unwrap = <T,>(res: any): T => res.data?.data ?? res.data;

export const catalogApi = {
  create: (data: Partial<ServiceCatalogItem>) => apiClient.post('/services-biz/catalog', data).then(unwrap<ServiceCatalogItem>),
  list: (params?: any) => apiClient.get('/services-biz/catalog', { params }).then(unwrap<ServiceCatalogItem[]>),
  byCategory: () => apiClient.get('/services-biz/catalog/by-category').then(unwrap<Record<string, ServiceCatalogItem[]>>),
  byBusinessType: () => apiClient.get('/services-biz/catalog/by-business-type').then(unwrap<Record<string, ServiceCatalogItem[]>>),
  getOne: (id: string) => apiClient.get('/services-biz/catalog/' + id).then(unwrap<ServiceCatalogItem>),
  update: (id: string, data: Partial<ServiceCatalogItem>) => apiClient.patch('/services-biz/catalog/' + id, data).then(unwrap<ServiceCatalogItem>),
  remove: (id: string) => apiClient.delete('/services-biz/catalog/' + id).then(unwrap),
};
