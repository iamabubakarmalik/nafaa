import { apiClient } from './client';

export interface OnboardingProgress {
  id: string;
  tenantId: string;
  userId: string;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  isSkipped: boolean;
  progressPercent: number;
  totalSteps: number;
  startedAt: string;
  completedAt?: string | null;

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
  paymentMethods: Array<{ value: string; label: string; emoji: string; default?: boolean }>;
  workingDays: Array<{ value: string; label: string; short: string }>;
  suggestedCategories: Record<string, string[]>;
  totalSteps: number;
}

function unwrap<T>(res: any): T {
  const body = res?.data;
  if (body?.data !== undefined) return body.data as T;
  return body as T;
}

export const onboardingApi = {
  getOptions: (): Promise<OnboardingOptions> =>
    apiClient.get('/onboarding/options').then((r) => unwrap<OnboardingOptions>(r)),

  get: (): Promise<OnboardingProgress> =>
    apiClient.get('/onboarding').then((r) => unwrap<OnboardingProgress>(r)),

  step1: (data: { businessType: string; businessSize: string; city: string; province?: string }) =>
    apiClient.patch('/onboarding/step/1', data).then((r) => unwrap<OnboardingProgress>(r)),

  step2: (data: { avatarUrl?: string; whatsappNumber?: string; cnic?: string; preferredLanguage?: string }) =>
    apiClient.patch('/onboarding/step/2', data).then((r) => unwrap<OnboardingProgress>(r)),

  step3: (data: { shopAddress?: string; openTime?: string; closeTime?: string; workingDays?: string[]; taxNumber?: string }) =>
    apiClient.patch('/onboarding/step/3', data).then((r) => unwrap<OnboardingProgress>(r)),

  step4: (data: { enabledCategories?: string[]; paymentMethods?: string[]; receiptTemplate?: string; lowStockThreshold?: number }) =>
    apiClient.patch('/onboarding/step/4', data).then((r) => unwrap<OnboardingProgress>(r)),

  step5: (data: { products?: Array<{ name: string; price: number; costPrice?: number; stock?: number; category?: string; unit?: string }> }) =>
    apiClient.patch('/onboarding/step/5', data).then((r) => unwrap<OnboardingProgress>(r)),

  step6: (data: { teamMembers?: Array<{ fullName: string; email: string; password: string; role: 'MANAGER' | 'CASHIER' | 'STAFF' }>; wantsTutorial?: boolean }) =>
    apiClient.patch('/onboarding/step/6', data).then((r) => unwrap<OnboardingProgress>(r)),

  skip: (step: number) =>
    apiClient.post('/onboarding/skip', { step }).then((r) => unwrap<OnboardingProgress>(r)),

  complete: () =>
    apiClient.post('/onboarding/complete').then((r) => unwrap<OnboardingProgress>(r)),
};
