import { apiClient } from './client';

export interface BusinessFeatures {
  variants: boolean;
  variantImages: boolean;
  lengthWidthCalc: boolean;
  weightBased: boolean;
  imei: boolean;
  expiry: boolean;
  batches: boolean;
  warranty: boolean;
  emi: boolean;
  services: boolean;
  tables: boolean;
  appointments: boolean;
  kitchenPrinter: boolean;
  prescriptionRequired: boolean;
  multiUnit: boolean;
  sizeMatrix: boolean;
}

export interface BusinessConfig {
  businessType: string;
  defaultUnit: string;
  features: BusinessFeatures;
  template: {
    label: string;
    emoji: string;
    description: string;
    quickUnits: string[];
    suggestedCategories: string[];
    highlights: string[];
  };
}

const DEFAULT_FEATURES: BusinessFeatures = {
  variants: true,
  variantImages: false,
  lengthWidthCalc: false,
  weightBased: false,
  imei: false,
  expiry: false,
  batches: false,
  warranty: false,
  emi: false,
  services: false,
  tables: false,
  appointments: false,
  kitchenPrinter: false,
  prescriptionRequired: false,
  multiUnit: false,
  sizeMatrix: false,
};

const FALLBACK_TEMPLATE = {
  label: 'General Retail',
  emoji: '🏬',
  description: 'General business configuration',
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
