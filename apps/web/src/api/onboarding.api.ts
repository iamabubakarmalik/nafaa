import { apiClient } from './client';

export interface OnboardingProgress {
  id: string;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  progressPercent: number;
  totalSteps: number;
  businessType?: string | null;
  businessSize?: string | null;
  city?: string | null;
  province?: string | null;
  avatarUrl?: string | null;
  whatsappNumber?: string | null;
  cnic?: string | null;
  preferredLanguage?: string | null;
  shopAddress?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];
  taxNumber?: string | null;
  enabledCategories: string[];
  paymentMethods: string[];
  receiptTemplate?: string | null;
  lowStockThreshold: number;
  productsAddedCount: number;
  teamMembersAdded: number;
  wantsTutorial: boolean;
}

export interface OnboardingOptions {
  cities: string[];
  provinces: string[];
  businessTypes: Array<{ value: string; label: string; emoji: string; category: string }>;
  businessSizes: Array<{ value: string; label: string; desc: string; icon: string }>;
  languages: Array<{ value: string; label: string; english: string }>;
  receiptTemplates: Array<{ value: string; label: string; desc: string }>;
  paymentMethods: Array<{ value: string; label: string; emoji: string }>;
  workingDays: Array<{ value: string; label: string; short: string }>;
  suggestedCategories: Record<string, string[]>;
  totalSteps: number;
}

const unwrap = <T>(res: any): T => (res?.data?.data !== undefined ? res.data.data : res?.data);

export const onboardingApi = {
  getOptions: () =>
    apiClient.get<{ data: OnboardingOptions }>('/onboarding/options').then(unwrap) as Promise<OnboardingOptions>,
  get: () =>
    apiClient.get<{ data: OnboardingProgress }>('/onboarding').then(unwrap) as Promise<OnboardingProgress>,
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
  skip: (step: number) =>
    apiClient.post<{ data: OnboardingProgress }>('/onboarding/skip', { step }).then(unwrap) as Promise<OnboardingProgress>,
  complete: () =>
    apiClient.post<{ data: OnboardingProgress }>('/onboarding/complete').then(unwrap) as Promise<OnboardingProgress>,
};
