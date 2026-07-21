import { apiClient } from '../../../api/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OnboardingProgress {
  id: string;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  isSkipped?: boolean;
  progressPercent?: number;
  totalSteps?: number;

  // Detected metadata
  detectedCity?: string | null;
  detectedProvince?: string | null;
  detectedCountry?: string | null;
  detectedTimezone?: string | null;

  // Step 1
  businessType?: string | null;
  businessSize?: string | null;
  city?: string | null;
  province?: string | null;

  // Step 2
  avatarUrl?: string | null;
  whatsappNumber?: string | null;
  cnic?: string | null;
  preferredLanguage?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;

  // Step 3
  shopAddress?: string | null;
  shopArea?: string | null;
  shopLandmark?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];
  taxNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Step 4
  enabledCategories: string[];
  paymentMethods: string[];
  receiptTemplate?: string | null;
  lowStockThreshold: number;
  currency?: string;
  enableTax?: boolean;
  taxRate?: number;

  // Step 5
  enabledFeatures?: Record<string, boolean>;

  // Step 6
  productsAddedCount: number;
  usedSampleData?: boolean;

  // Step 7
  teamMembersAdded: number;

  // Step 8
  wantsTutorial: boolean;
  subscribedToTips?: boolean;

  // UI helpers
  estimatedMinutesLeft?: number;
  stepLabels?: Record<number, { title: string; desc: string; emoji: string; estimatedMin: number }>;

  // Timestamps
  startedAt?: string;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessTypeOption {
  value: string;
  label: string;
  labelUrdu?: string;
  emoji: string;
  category: string;
  description?: string;
  color?: string;
  popular?: boolean;
  highlights?: string[];
  defaultUnit?: string;
  featureCount?: number;
}

export interface CityInfo {
  name: string;
  province: string;
  provinceLabel: string;
  timezone?: string;
  isMajor: boolean;
}

export interface OnboardingOptions {
  cities: any[]; // string[] (old) or CityInfo[] (new)
  majorCities?: CityInfo[];
  provinces: any[]; // string[] (old) or {value,label}[] (new)
  businessTypes: BusinessTypeOption[];
  businessTypesLegacy?: any[];
  businessTemplates?: Record<string, any>;
  businessSizes: Array<{
    value: string;
    label: string;
    desc: string;
    icon: string;
    staffRange?: string;
    monthlyRevenue?: string;
  }>;
  languages: Array<{ value: string; label: string; english: string }>;
  receiptTemplates: Array<{ value: string; label: string; desc: string; icon?: string }>;
  paymentMethods: Array<{ value: string; label: string; emoji: string; default?: boolean }>;
  workingDays: Array<{ value: string; label: string; short: string; urdu?: string }>;
  currencies?: Array<{ value: string; label: string; symbol: string; default?: boolean }>;
  teamRoles?: Array<{ value: string; label: string; desc: string; icon: string }>;
  suggestedCategories?: Record<string, string[]>;
  stepLabels?: Record<number, { title: string; desc: string; emoji: string; estimatedMin: number }>;
  totalSteps: number;
}

export interface BusinessConfig {
  businessType: string;
  defaultUnit: string;
  currency?: string;
  features: Record<string, boolean>;
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

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const unwrap = <T>(res: any): T =>
  (res?.data?.data !== undefined ? res.data.data : res?.data);

// ═══════════════════════════════════════════════════════════════
// API CLIENT
// ═══════════════════════════════════════════════════════════════

export const onboardingApi = {
  // ─── Read ─────────────────────────────────────────────────
  getOptions: () =>
    apiClient.get<{ data: OnboardingOptions }>('/onboarding/options').then(unwrap) as Promise<OnboardingOptions>,

  get: () =>
    apiClient.get<{ data: OnboardingProgress }>('/onboarding').then(unwrap) as Promise<OnboardingProgress>,

  getBusinessConfig: () =>
    apiClient.get<{ data: BusinessConfig }>('/onboarding/business-config').then(unwrap) as Promise<BusinessConfig>,

  // ─── Features ─────────────────────────────────────────────
  updateFeatures: (features: Record<string, boolean>) =>
    apiClient.patch<{ data: BusinessConfig }>('/onboarding/business-features', { features }).then(unwrap) as Promise<BusinessConfig>,

  changeBusinessType: (businessType: string) =>
    apiClient.post<{ data: BusinessConfig }>('/onboarding/change-business-type', { businessType }).then(unwrap) as Promise<BusinessConfig>,

  // ─── Steps ────────────────────────────────────────────────
  step1: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/1', data).then(unwrap) as Promise<OnboardingProgress>,
  step2: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/2', data).then(unwrap) as Promise<OnboardingProgress>,
  step3: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/3', data).then(unwrap) as Promise<OnboardingProgress>,
  step4: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/4', data).then(unwrap) as Promise<OnboardingProgress>,
  step5: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/5', data).then(unwrap) as Promise<OnboardingProgress>,
  step6: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/6', data).then(unwrap) as Promise<OnboardingProgress>,
  step7: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/7', data).then(unwrap) as Promise<OnboardingProgress>,
  step8: (data: any) =>
    apiClient.patch<{ data: OnboardingProgress }>('/onboarding/step/8', data).then(unwrap) as Promise<OnboardingProgress>,

  // ─── Lifecycle ────────────────────────────────────────────
  skip: (step: number) =>
    apiClient.post<{ data: OnboardingProgress }>('/onboarding/skip', { step }).then(unwrap) as Promise<OnboardingProgress>,

  complete: () =>
    apiClient.post<{ data: OnboardingProgress }>('/onboarding/complete').then(unwrap) as Promise<OnboardingProgress>,

  reset: () =>
    apiClient.post<{ data: OnboardingProgress }>('/onboarding/reset').then(unwrap) as Promise<OnboardingProgress>,

  // ─── Analytics (silent — don't crash if backend missing) ──
  recordTime: (seconds: number) =>
    apiClient
      .post<{ data: any }>('/onboarding/time-spent', { seconds })
      .then(unwrap)
      .catch(() => null),
};
