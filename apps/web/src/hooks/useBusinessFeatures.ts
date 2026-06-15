import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessConfigApi, type BusinessConfig, type BusinessFeatures } from '@/api/business-config.api';
import { useAuthStore } from '@/store/auth.store';

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

const TEMPLATE_FEATURES: Record<string, Partial<BusinessFeatures> & { defaultUnit?: string }> = {
  CARPET: {
    variants: true,
    variantImages: true,
    lengthWidthCalc: true,
    multiUnit: true,
    defaultUnit: 'sqft',
  },
  MOBILE: {
    variants: true,
    variantImages: true,
    imei: true,
    warranty: true,
    emi: true,
    services: true,
    defaultUnit: 'pcs',
  },
  GROCERY: {
    weightBased: true,
    expiry: true,
    batches: true,
    multiUnit: true,
    defaultUnit: 'kg',
  },
  PHARMACY: {
    expiry: true,
    batches: true,
    prescriptionRequired: true,
    multiUnit: true,
    defaultUnit: 'strip',
  },
  RESTAURANT: {
    variants: true,
    services: true,
    tables: true,
    kitchenPrinter: true,
    defaultUnit: 'plate',
  },
  SALON: {
    services: true,
    appointments: true,
    defaultUnit: 'service',
  },
  CLOTHING: {
    variants: true,
    variantImages: true,
    sizeMatrix: true,
    lengthWidthCalc: true,
    services: true,
    defaultUnit: 'pcs',
  },
  HARDWARE: {
    variants: true,
    lengthWidthCalc: true,
    weightBased: true,
    services: true,
    multiUnit: true,
    defaultUnit: 'pcs',
  },
  STATIONERY: {
    variants: true,
    multiUnit: true,
    defaultUnit: 'pcs',
  },
  COSMETICS: {
    variants: true,
    variantImages: true,
    expiry: true,
    defaultUnit: 'pcs',
  },
  BAKERY: {
    weightBased: true,
    expiry: true,
    variants: true,
    defaultUnit: 'pcs',
  },
  GENERAL: {
    variants: true,
    defaultUnit: 'pcs',
  },
};

function normalizeType(type?: string | null) {
  if (!type) return 'GENERAL';
  if (type === 'KIRYANA') return 'GROCERY';
  if (type === 'MOBILE_SHOP') return 'MOBILE';
  if (type === 'OTHER') return 'GENERAL';
  return type;
}

function buildFallbackConfig(tenant: any): BusinessConfig {
  const type = normalizeType(tenant?.businessType);
  const template = TEMPLATE_FEATURES[type] || TEMPLATE_FEATURES.GENERAL;

  return {
    businessType: type,
    defaultUnit: tenant?.defaultUnit || template.defaultUnit || 'pcs',
    features: {
      ...DEFAULT_FEATURES,
      ...(template || {}),
      ...(tenant?.businessFeatures || {}),
    },
    template: {
      label: type,
      emoji: '🏬',
      description: 'Business configuration',
      quickUnits: ['pcs', 'kg', 'meter'],
      suggestedCategories: [],
      highlights: [],
    },
  };
}

export function useBusinessFeatures() {
  const tenant = useAuthStore((s) => s.tenant);
  const updateTenant = useAuthStore((s) => s.updateTenant);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['business-config'],
    queryFn: businessConfigApi.get,
    staleTime: 0,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const config = useMemo(() => {
    if (data) return data;
    return buildFallbackConfig(tenant);
  }, [data, tenant]);

  useEffect(() => {
    if (!data) return;
    updateTenant({
      businessType: data.businessType,
      businessFeatures: data.features as any,
      defaultUnit: data.defaultUnit,
    });
  }, [data, updateTenant]);

  return {
    config,
    features: config.features,
    businessType: config.businessType,
    defaultUnit: config.defaultUnit,
    template: config.template,
    quickUnits: config.template?.quickUnits ?? ['pcs', 'kg', 'meter'],
    suggestedCategories: config.template?.suggestedCategories ?? [],
    isLoading,
    error,
    refetch,
    has: (feature: keyof BusinessFeatures): boolean =>
      config.features?.[feature] ?? DEFAULT_FEATURES[feature],
  };
}

export function useFeature(feature: keyof BusinessFeatures): boolean {
  const { has } = useBusinessFeatures();
  return has(feature);
}
