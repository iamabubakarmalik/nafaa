/** Onboarding endpoints (apps/api/src/modules/onboarding), same as the web onboarding.api.ts. */

import { apiClient } from '@/core/api/client';

export interface OnboardingProgress {
  id: string;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  detectedCity?: string | null;
  businessType?: string | null;
  businessSize?: string | null;
  city?: string | null;
  province?: string | null;
  whatsappNumber?: string | null;
  shopAddress?: string | null;
  shopArea?: string | null;
  shopLandmark?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  workingDays: string[];
  taxNumber?: string | null;
  enabledCategories: string[];
  paymentMethods: string[];
  receiptTemplate?: string | null;
  lowStockThreshold: number;
  enableTax?: boolean;
  taxRate?: number;
  productsAddedCount: number;
  usedSampleData?: boolean;
  teamMembersAdded: number;
  wantsTutorial: boolean;
  subscribedToTips?: boolean;
}

export interface OnboardingOptions {
  cities: Array<string | { name: string; province?: string }>;
  businessTypes: Array<{ value: string; label: string }>;
  businessTemplates?: Record<string, { receiptSize?: string; suggestedCategories?: string[] }>;
  paymentMethods: Array<{ value: string; label: string; default?: boolean }>;
  workingDays: Array<{ value: string; label: string; short: string }>;
}

const get = <T>(url: string) => apiClient.get<T>(url).then((r) => r.data);
const patch = <T>(url: string, body: unknown) => apiClient.patch<T>(url, body).then((r) => r.data);
const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data);

export const onboardingApi = {
  options: () => get<OnboardingOptions>('/onboarding/options'),
  progress: () => get<OnboardingProgress>('/onboarding'),
  step: (n: number, data: unknown) => patch<OnboardingProgress>(`/onboarding/step/${n}`, data),
  skip: (step: number) => post<OnboardingProgress>('/onboarding/skip', { step }),
  complete: () => post<OnboardingProgress>('/onboarding/complete'),
  recordTime: (seconds: number) => post('/onboarding/time-spent', { seconds }).catch(() => null),
};
