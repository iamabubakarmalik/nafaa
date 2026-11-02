// apps/web/src/core/hooks/useBusinessFeatures.ts
import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { businessConfigApi, type BusinessConfig, type BusinessFeatures } from '@modules/organization/settings/api/business-config.api';
import { useAuthStore } from '@core/stores/auth.store';
import { t } from '@core/i18n';

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

// Per-industry feature presets — all 30 industries
const TEMPLATE_FEATURES: Record<string, Record<string, any>> = {
  CARPET: {
    variants: true, variantImages: true, lengthWidthCalc: true, multiUnit: true,
    carpetRolls: true, cutPieces: true, reservations: true,
    defaultUnit: 'sqft',
  },
  MOBILE: {
    variants: true, variantImages: true, imei: true, warranty: true, emi: true,
    services: true, repairs: true, usedItemsTrade: true, serialNumber: true,
    defaultUnit: 'pcs',
  },
  GROCERY: {
    weightBased: true, expiry: true, batches: true, multiUnit: true,
    combo: true, quickKeys: true, bulkPricing: true,
    defaultUnit: 'kg',
  },
  PHARMACY: {
    expiry: true, batches: true, prescriptionRequired: true, multiUnit: true,
    drugInteractions: true, quickKeys: true,
    defaultUnit: 'strip',
  },
  RESTAURANT: {
    variants: true, services: true, tables: true, kitchenPrinter: true,
    ingredientTracking: true, delivery: true, combo: true,
    defaultUnit: 'plate',
  },
  SALON: {
    services: true, appointments: true, membership: true, packages: true,
    defaultUnit: 'service',
  },
  CLOTHING: {
    variants: true, variantImages: true, sizeMatrix: true, lengthWidthCalc: true,
    tailoring: true, alterations: true, measurements: true, reservations: true, layaway: true,
    defaultUnit: 'pcs',
  },
  HARDWARE: {
    variants: true, lengthWidthCalc: true, weightBased: true, services: true,
    multiUnit: true, bulkPricing: true, quotations: true, projectTracking: true, delivery: true,
    defaultUnit: 'pcs',
  },
  STATIONERY: {
    variants: true, multiUnit: true, schoolLists: true, bookRentals: true,
    defaultUnit: 'pcs',
  },
  COSMETICS: {
    variants: true, variantImages: true, expiry: true, batches: true,
    defaultUnit: 'pcs',
  },
  BAKERY: {
    weightBased: true, expiry: true, variants: true,
    customCakes: true, productionPlanning: true, ingredientTracking: true, delivery: true,
    defaultUnit: 'pcs',
  },
  AUTO_PARTS: {
    variants: true, warranty: true, services: true, vehicleTracking: true,
    compatibilityMatrix: true, repairs: true, quotations: true, serialNumber: true,
    defaultUnit: 'pcs',
  },
  MEAT: {
    weightBased: true, expiry: true, slaughterLog: true, qualityTests: true,
    delivery: true, subscriptions: true, qurbani: true,
    defaultUnit: 'kg',
  },
  DAIRY: {
    weightBased: true, expiry: true, routes: true, delivery: true,
    subscriptions: true, qualityTests: true, farmerAccounts: true, credit: true,
    defaultUnit: 'liter',
  },
  AGRI: {
    weightBased: true, expiry: true, batches: true, multiUnit: true,
    farmerAccounts: true, credit: true, bulkPricing: true,
    cropAdvisory: true, seasonalPlans: true, govtSubsidy: true,
    defaultUnit: 'kg',
  },
  JEWELRY: {
    weightBased: true, purityTracking: true, hallmark: true, liveMetalRates: true,
    warranty: true, layaway: true, reservations: true,
    defaultUnit: 'gram',
  },
  HOTEL: {
    rooms: true, services: true, appointments: true, membership: true, credit: true,
    defaultUnit: 'night',
  },
  GYM: {
    services: true, appointments: true, membership: true, packages: true,
    bodyMeasurements: true, workoutTracking: true, dietPlans: true, classSchedule: true,
    defaultUnit: 'session',
  },
  CLINIC: {
    services: true, appointments: true, patientRecords: true,
    labTests: true, vaccinations: true, dentalCharts: true, antenatal: true, physioSessions: true,
    defaultUnit: 'consultation',
  },
  BOOKSTORE: {
    variants: true, multiUnit: true, schoolLists: true, bookRentals: true,
    defaultUnit: 'pcs',
  },
  SERVICE: {
    services: true, appointments: true, warranty: true,
    amc: true, technicianDispatch: true, quotations: true, credit: true,
    defaultUnit: 'job',
  },

  // ─── 10 NEW industries ───
  APPLIANCES: {
    variants: true, variantImages: true, serialNumber: true, warranty: true,
    emi: true, delivery: true, services: true, amc: true, technicianDispatch: true,
    repairs: true, quotations: true, layaway: true, bulkOrders: true,
    defaultUnit: 'pcs',
  },
  ELECTRONICS: {
    variants: true, variantImages: true, serialNumber: true, imei: true, warranty: true,
    emi: true, bulkPricing: true, combo: true, repairs: true, usedItemsTrade: true,
    defaultUnit: 'pcs',
  },
  FLORIST: {
    expiry: true, variants: true, customCakes: true, reservations: true,
    delivery: true, subscriptions: true, quotations: true,
    defaultUnit: 'pcs',
  },
  FURNITURE: {
    variants: true, variantImages: true, lengthWidthCalc: true, warranty: true,
    delivery: true, services: true, quotations: true, projectTracking: true,
    reservations: true, layaway: true, emi: true, bulkOrders: true,
    defaultUnit: 'pcs',
  },
  GAMING: {
    variants: true, variantImages: true, serialNumber: true, warranty: true,
    services: true, appointments: true, membership: true,
    usedItemsTrade: true, repairs: true, combo: true, subscriptions: true, packages: true,
    defaultUnit: 'pcs',
  },
  OPTICAL: {
    variants: true, variantImages: true, prescriptionRequired: true, warranty: true,
    services: true, appointments: true, patientRecords: true, measurements: true,
    membership: true, layaway: true,
    defaultUnit: 'pcs',
  },
  PETSHOP: {
    expiry: true, batches: true, weightBased: true, variants: true,
    services: true, appointments: true, subscriptions: true,
    vaccinations: true, patientRecords: true,
    defaultUnit: 'pcs',
  },
  SHOE: {
    variants: true, variantImages: true, sizeMatrix: true, warranty: true,
    repairs: true, reservations: true, layaway: true, bulkOrders: true,
    defaultUnit: 'pair',
  },
  TOYSTORE: {
    variants: true, variantImages: true, warranty: true,
    combo: true, bulkPricing: true, reservations: true,
    defaultUnit: 'pcs',
  },
  SPORTS: {
    variants: true, variantImages: true, sizeMatrix: true, warranty: true,
    tailoring: true, bulkOrders: true, quotations: true, reservations: true, membership: true,
    defaultUnit: 'pcs',
  },

  GENERAL: {
    variants: true,
    defaultUnit: 'pcs',
  },
};

// Aliases for legacy business types
const ALIAS_MAP: Record<string, string> = {
  KIRYANA: 'GROCERY',
  MOBILE_SHOP: 'MOBILE',
  GAMING_SHOP: 'GAMING',
  CYBER_CAFE: 'GAMING',
  ESPORTS: 'GAMING',
  PET_SHOP: 'PETSHOP',
  PET_STORE: 'PETSHOP',
  SHOE_STORE: 'SHOE',
  FOOTWEAR: 'SHOE',
  TOY_STORE: 'TOYSTORE',
  TOYS: 'TOYSTORE',
  SPORTS_SHOP: 'SPORTS',
  SPORTS_STORE: 'SPORTS',
  FLOWER_SHOP: 'FLORIST',
  FLOWERS: 'FLORIST',
  FURNITURE_STORE: 'FURNITURE',
  OPTICAL_STORE: 'OPTICAL',
  EYEWEAR: 'OPTICAL',
  HOME_APPLIANCES: 'APPLIANCES',
  APPLIANCE_STORE: 'APPLIANCES',
  ELECTRONICS_STORE: 'ELECTRONICS',
  GADGETS: 'ELECTRONICS',
  OTHER: 'GENERAL',
};

function normalizeType(type?: string | null): string {
  if (!type) return 'GENERAL';
  const upper = String(type).toUpperCase().trim();
  return ALIAS_MAP[upper] || upper;
}

const TEMPLATE_META: Record<string, { label: string; emoji: string; description: string; quickUnits: string[] }> = {
  CARPET: { label: t('Carpets / Flooring'), emoji: '🏪', description: t('Carpet shop'), quickUnits: ['sqft', 'sqm', 'meter'] },
  MOBILE: { label: t('Mobile / Electronics'), emoji: '📱', description: t('Mobile shop'), quickUnits: ['pcs', 'set'] },
  GROCERY: { label: t('Grocery / Kiryana'), emoji: '🛒', description: t('Kiryana store'), quickUnits: ['kg', 'gram', 'liter', 'pcs'] },
  PHARMACY: { label: t('Pharmacy'), emoji: '💊', description: t('Medical store'), quickUnits: ['strip', 'tablet', 'bottle'] },
  RESTAURANT: { label: t('Restaurant'), emoji: '🍽️', description: t('Restaurant/Cafe'), quickUnits: ['plate', 'cup', 'glass'] },
  SALON: { label: t('Salon / Beauty'), emoji: '💇', description: t('Beauty parlour'), quickUnits: ['service', 'session'] },
  CLOTHING: { label: t('Clothing / Garments'), emoji: '👕', description: t('Clothing store'), quickUnits: ['pcs', 'meter', 'gaj'] },
  HARDWARE: { label: t('Hardware'), emoji: '🔧', description: t('Hardware store'), quickUnits: ['pcs', 'kg', 'meter', 'bag'] },
  STATIONERY: { label: t('Stationery'), emoji: '📚', description: t('Stationery'), quickUnits: ['pcs', 'pack', 'box'] },
  COSMETICS: { label: t('Cosmetics'), emoji: '💄', description: t('Cosmetics shop'), quickUnits: ['pcs', 'ml', 'gram'] },
  BAKERY: { label: t('Bakery'), emoji: '🍰', description: t('Bakery/Cake shop'), quickUnits: ['pcs', 'kg', 'dozen'] },
  AUTO_PARTS: { label: t('Auto Parts'), emoji: '🔩', description: t('Auto parts'), quickUnits: ['pcs', 'set', 'liter'] },
  MEAT: { label: t('Meat / Butchery'), emoji: '🥩', description: t('Meat shop'), quickUnits: ['kg', 'gram', 'piece'] },
  DAIRY: { label: t('Dairy'), emoji: '🥛', description: t('Milk shop'), quickUnits: ['liter', 'kg', 'packet'] },
  AGRI: { label: t('Agri'), emoji: '🌾', description: t('Agri store'), quickUnits: ['kg', 'bag', 'liter'] },
  JEWELRY: { label: t('Jewelry'), emoji: '💎', description: t('Sunar shop'), quickUnits: ['gram', 'tola', 'piece'] },
  HOTEL: { label: t('Hotel'), emoji: '🏨', description: t('Hotel/Guest house'), quickUnits: ['night', 'day', 'hour'] },
  GYM: { label: t('Gym'), emoji: '💪', description: t('Gym/Fitness'), quickUnits: ['session', 'month', 'class'] },
  CLINIC: { label: t('Clinic'), emoji: '⚕️', description: t('Clinic/Doctor'), quickUnits: ['consultation', 'session'] },
  BOOKSTORE: { label: t('Bookstore'), emoji: '📚', description: t('Bookstore'), quickUnits: ['pcs', 'pack', 'box'] },
  SERVICE: { label: t('Service Business'), emoji: '🔧', description: t('Service business'), quickUnits: ['job', 'hour', 'visit'] },
  APPLIANCES: { label: t('Home Appliances'), emoji: '🏠', description: t('Appliances showroom'), quickUnits: ['pcs', 'set'] },
  ELECTRONICS: { label: t('Electronics'), emoji: '🔌', description: t('Electronics store'), quickUnits: ['pcs', 'pack', 'set'] },
  FLORIST: { label: t('Florist'), emoji: '🌸', description: t('Flower shop'), quickUnits: ['pcs', 'bouquet', 'bunch'] },
  FURNITURE: { label: t('Furniture'), emoji: '🪑', description: t('Furniture store'), quickUnits: ['pcs', 'set', 'sqft'] },
  GAMING: { label: t('Gaming Shop'), emoji: '🎮', description: t('Gaming/Cyber cafe'), quickUnits: ['pcs', 'hour', 'session'] },
  OPTICAL: { label: t('Optical'), emoji: '👓', description: t('Optical store'), quickUnits: ['pcs', 'pair', 'box'] },
  PETSHOP: { label: t('Pet Shop'), emoji: '🐾', description: t('Pet shop/Vet'), quickUnits: ['pcs', 'kg', 'pack'] },
  SHOE: { label: t('Shoe Store'), emoji: '👟', description: t('Footwear'), quickUnits: ['pair', 'pcs', 'box'] },
  TOYSTORE: { label: t('Toy Store'), emoji: '🧸', description: t('Toy shop'), quickUnits: ['pcs', 'pack', 'set'] },
  SPORTS: { label: t('Sports Shop'), emoji: '🏏', description: t('Sports store'), quickUnits: ['pcs', 'pair', 'set'] },
  GENERAL: { label: t('General Retail'), emoji: '🏬', description: t('General store'), quickUnits: ['pcs', 'kg', 'meter'] },
};

function buildFallbackConfig(tenant: any): BusinessConfig {
  const type = normalizeType(tenant?.businessType);
  const template = TEMPLATE_FEATURES[type] || TEMPLATE_FEATURES.GENERAL;
  const meta = TEMPLATE_META[type] || TEMPLATE_META.GENERAL;

  return {
    businessType: type,
    defaultUnit: tenant?.defaultUnit || template.defaultUnit || 'pcs',
    features: {
      ...DEFAULT_FEATURES,
      ...(template || {}),
      ...(tenant?.businessFeatures || {}),
    },
    template: {
      label: meta.label,
      emoji: meta.emoji,
      description: meta.description,
      quickUnits: meta.quickUnits,
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
