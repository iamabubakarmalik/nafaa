// apps/web/src/modules/organization/settings/api/business-config.api.ts
import { apiClient } from '@core/api/client';

export interface BusinessFeatures {
  // Core inventory
  variants: boolean;
  variantImages: boolean;
  lengthWidthCalc: boolean;
  weightBased: boolean;
  multiUnit: boolean;
  sizeMatrix: boolean;
  bulkPricing: boolean;
  combo: boolean;
  quickKeys: boolean;

  // Tracking
  imei: boolean;
  serialNumber: boolean;
  expiry: boolean;
  batches: boolean;
  warranty: boolean;

  // Payment
  emi: boolean;
  layaway: boolean;
  membership: boolean;
  packages: boolean;
  credit: boolean;

  // Operations
  services: boolean;
  tables: boolean;
  appointments: boolean;
  kitchenPrinter: boolean;
  rooms: boolean;
  routes: boolean;
  delivery: boolean;

  // Customer
  prescriptionRequired: boolean;
  measurements: boolean;
  vehicleTracking: boolean;
  patientRecords: boolean;

  // Industry-specific
  slaughterLog: boolean;
  qualityTests: boolean;
  farmerAccounts: boolean;
  hallmark: boolean;
  purityTracking: boolean;
  liveMetalRates: boolean;
  amc: boolean;
  technicianDispatch: boolean;
  bookRentals: boolean;
  schoolLists: boolean;
  compatibilityMatrix: boolean;
  reservations: boolean;
  tailoring: boolean;
  alterations: boolean;
  qurbani: boolean;
  subscriptions: boolean;
  cropAdvisory: boolean;
  seasonalPlans: boolean;
  govtSubsidy: boolean;
  productionPlanning: boolean;
  ingredientTracking: boolean;
  customCakes: boolean;
  bodyMeasurements: boolean;
  workoutTracking: boolean;
  dietPlans: boolean;
  classSchedule: boolean;
  labTests: boolean;
  vaccinations: boolean;
  dentalCharts: boolean;
  antenatal: boolean;
  physioSessions: boolean;
  drugInteractions: boolean;
  usedItemsTrade: boolean;
  repairs: boolean;
  carpetRolls: boolean;
  cutPieces: boolean;
  projectTracking: boolean;
  quotations: boolean;
  bulkOrders: boolean;

  [key: string]: boolean;
}

export interface BusinessConfig {
  businessType: string;
  defaultUnit: string;
  currency?: string;
  features: BusinessFeatures;
  template: {
    label: string;
    labelUrdu?: string;
    emoji: string;
    description: string;
    color?: string;
    quickUnits: string[];
    suggestedCategories: string[];
    highlights: string[];
  };
}

const DEFAULT_FEATURES: BusinessFeatures = {
  // Core
  variants: true, variantImages: false, lengthWidthCalc: false, weightBased: false,
  multiUnit: false, sizeMatrix: false, bulkPricing: false, combo: false, quickKeys: false,
  // Tracking
  imei: false, serialNumber: false, expiry: false, batches: false, warranty: false,
  // Payment
  emi: false, layaway: false, membership: false, packages: false, credit: true,
  // Operations
  services: false, tables: false, appointments: false, kitchenPrinter: false,
  rooms: false, routes: false, delivery: false,
  // Customer
  prescriptionRequired: false, measurements: false, vehicleTracking: false, patientRecords: false,
  // Industry-specific
  slaughterLog: false, qualityTests: false, farmerAccounts: false,
  hallmark: false, purityTracking: false, liveMetalRates: false,
  amc: false, technicianDispatch: false, bookRentals: false, schoolLists: false,
  compatibilityMatrix: false, reservations: false, tailoring: false, alterations: false,
  qurbani: false, subscriptions: false, cropAdvisory: false, seasonalPlans: false, govtSubsidy: false,
  productionPlanning: false, ingredientTracking: false, customCakes: false,
  bodyMeasurements: false, workoutTracking: false, dietPlans: false, classSchedule: false,
  labTests: false, vaccinations: false, dentalCharts: false, antenatal: false, physioSessions: false,
  drugInteractions: false, usedItemsTrade: false, repairs: false,
  carpetRolls: false, cutPieces: false, projectTracking: false, quotations: false, bulkOrders: false,
};

const FALLBACK_TEMPLATE = {
  label: 'General Retail',
  labelUrdu: '',
  emoji: '🏬',
  description: 'General business configuration',
  color: '#6b7280',
  quickUnits: ['pcs', 'kg', 'meter'],
  suggestedCategories: [],
  highlights: [],
};

const unwrapRaw = (res: any) =>
  res?.data?.data !== undefined ? res.data.data : res?.data;

function normalizeConfig(raw: any): BusinessConfig {
  const data = raw?.data && !raw?.businessType ? raw.data : raw;

  const features = {
    ...DEFAULT_FEATURES,
    ...(data?.features || data?.businessFeatures || {}),
  };

  return {
    businessType: data?.businessType || 'GENERAL',
    defaultUnit: data?.defaultUnit || 'pcs',
    currency: data?.currency,
    features,
    template: {
      ...FALLBACK_TEMPLATE,
      ...(data?.template || {}),
    },
  };
}

export const businessConfigApi = {
  get: async (): Promise<BusinessConfig> => {
    const res = await apiClient.get('/onboarding/business-config');
    return normalizeConfig(unwrapRaw(res));
  },

  updateFeatures: async (
    features: Partial<BusinessFeatures>,
  ): Promise<{ features: BusinessFeatures }> => {
    const res = await apiClient.patch('/onboarding/business-features', {
      features,
    });
    const raw = unwrapRaw(res);
    return {
      features: {
        ...DEFAULT_FEATURES,
        ...(raw?.features || {}),
      },
    };
  },

  changeType: async (businessType: string): Promise<BusinessConfig> => {
    const res = await apiClient.post('/onboarding/change-business-type', {
      businessType,
    });
    return normalizeConfig(unwrapRaw(res));
  },
};

export const DEFAULT_BUSINESS_FEATURES = DEFAULT_FEATURES;
