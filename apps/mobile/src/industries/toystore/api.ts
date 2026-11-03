/**
 * Toy store endpoints (same paths and shapes as apps/web/src/industries/toystore/api):
 * birthday reminders, gift packs, the toy profile of a product and the
 * dashboard. They need the server; screens show the last saved data offline.
 */

import { apiClient } from '@/core/api/client';

const get = <T>(path: string, params?: object) => apiClient.get<T>(path, { params }).then((r) => r.data);
const post = <T>(path: string, body?: object) => apiClient.post<T>(path, body ?? {}).then((r) => r.data);
const patch = <T>(path: string, body?: object) => apiClient.patch<T>(path, body ?? {}).then((r) => r.data);
const del = <T>(path: string) => apiClient.delete<T>(path).then((r) => r.data);

/* ───────────── birthdays ───────────── */

export interface ToyBirthdayReminder {
  id: string; customerId?: string; customerName: string; customerPhone: string; childName: string; childBirthDate: string; childGender?: string;
  childInterests: string[]; parentRelation?: string; favoriteCategories: string[]; budgetRange?: string; reminderDaysBefore: number; isActive: boolean;
  lastReminderSent?: string; lastPurchaseDate?: string; lastGiftGiven?: string; totalPurchases: number; totalSpent: number; notes?: string;
  computed?: { currentAge: number; daysUntilBirthday: number; turningAge: number; shouldRemindNow?: boolean; avgSpend?: number };
}

export interface GiftIdea { productId: string; categoryType?: string; brand?: string; product: { name: string; price: number; stock: number } }
export interface GiftSuggestions {
  child: { name: string; turningAge: number; gender?: string; interests: string[] }; budgetCeiling: number | null; lastGiftGiven?: string; matchedAgeGroups: string[];
  products: GiftIdea[]; giftPacks: Array<{ id: string; name: string; giftPackPrice: number }>;
}

export type BirthdayBody = Partial<Pick<ToyBirthdayReminder, 'childName' | 'childBirthDate' | 'childGender' | 'customerName' | 'customerPhone' | 'parentRelation' | 'budgetRange' | 'reminderDaysBefore' | 'notes'>>;

export const toyBirthdaysApi = {
  create: (data: BirthdayBody) => post<ToyBirthdayReminder>('/toystore/birthday-reminders', data),
  list: (params?: { active?: boolean; customerId?: string; gender?: string; search?: string }) => get<ToyBirthdayReminder[]>('/toystore/birthday-reminders', params),
  getOne: (id: string) => get<ToyBirthdayReminder>(`/toystore/birthday-reminders/${id}`),
  giftSuggestions: (id: string, limit = 12) => get<GiftSuggestions>(`/toystore/birthday-reminders/${id}/gift-suggestions`, { limit }),
  update: (id: string, data: BirthdayBody) => patch<ToyBirthdayReminder>(`/toystore/birthday-reminders/${id}`, data),
  recordPurchase: (id: string, data: { giftDescription: string; amount: number; purchaseDate?: string }) => post<ToyBirthdayReminder>(`/toystore/birthday-reminders/${id}/record-purchase`, data),
  markReminderSent: (id: string) => post<ToyBirthdayReminder>(`/toystore/birthday-reminders/${id}/mark-reminder-sent`),
  remove: (id: string) => del<unknown>(`/toystore/birthday-reminders/${id}`),
};

/* ───────────── gift packs ───────────── */

export interface ToyGiftPack {
  id: string; name: string; description?: string; imageUrl?: string; targetAgeGroup?: string; targetGender?: string; occasion?: string;
  items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice: number; product?: { name: string; stock?: number; hasVariants?: boolean } }>;
  itemCount: number; originalPrice: number; giftPackPrice: number; savings: number; savingsPct: number; isGiftWrapped: boolean; includesCard: boolean;
  isActive: boolean; isFeatured: boolean; isSeasonal: boolean; seasonName?: string; validFrom?: string; validUntil?: string; totalSold: number;
}

export type GiftPackBody = Pick<ToyGiftPack, 'name' | 'giftPackPrice'> & Partial<Pick<ToyGiftPack,
  'description' | 'imageUrl' | 'targetAgeGroup' | 'targetGender' | 'occasion' | 'isGiftWrapped' | 'includesCard' | 'isActive' | 'isFeatured' | 'isSeasonal' | 'seasonName' | 'validFrom' | 'validUntil'>>
  & { items: Array<{ productId: string; variantId?: string; quantity: number; unitPrice?: number }> };

/** Save body of an existing pack, with optional changes (the API refuses any other field). */
export function packBody(p: ToyGiftPack, patchBody: Partial<GiftPackBody> = {}): GiftPackBody {
  return {
    name: p.name, description: p.description ?? undefined, imageUrl: p.imageUrl ?? undefined, targetAgeGroup: p.targetAgeGroup ?? undefined,
    targetGender: p.targetGender ?? undefined, occasion: p.occasion ?? undefined, giftPackPrice: p.giftPackPrice,
    items: p.items.map((i) => ({ productId: i.productId, ...(i.variantId ? { variantId: i.variantId } : {}), quantity: i.quantity, unitPrice: i.unitPrice })),
    isGiftWrapped: p.isGiftWrapped, includesCard: p.includesCard, isActive: p.isActive, isFeatured: p.isFeatured, isSeasonal: p.isSeasonal,
    seasonName: p.seasonName ?? undefined, validFrom: p.validFrom ?? undefined, validUntil: p.validUntil ?? undefined, ...patchBody,
  };
}

export const toyGiftPacksApi = {
  create: (data: GiftPackBody) => post<ToyGiftPack>('/toystore/gift-packs', data),
  list: (params?: { active?: boolean; featured?: boolean; seasonal?: boolean; ageGroup?: string; gender?: string; occasion?: string; search?: string }) => get<ToyGiftPack[]>('/toystore/gift-packs', params),
  getOne: (id: string) => get<ToyGiftPack>(`/toystore/gift-packs/${id}`),
  update: (id: string, data: GiftPackBody) => patch<ToyGiftPack>(`/toystore/gift-packs/${id}`, data),
  duplicate: (id: string) => post<ToyGiftPack>(`/toystore/gift-packs/${id}/duplicate`),
  recordSale: (id: string, quantity = 1) => post<ToyGiftPack>(`/toystore/gift-packs/${id}/record-sale`, { quantity }),
  remove: (id: string) => del<unknown>(`/toystore/gift-packs/${id}`),
};

/* ───────────── toy profile of a product ───────────── */

export interface ToyProductProfile {
  id: string; productId: string; categoryType?: string; ageGroup: string; ageGroups: string[]; ageMinYears?: number; ageMaxYears?: number; genderTarget: string;
  brand?: string; characterFranchise?: string; isEducational: boolean; material?: string; numberOfPieces?: number;
  requiresBatteries: boolean; batteriesIncluded: boolean; batteryType?: string; batteryQuantity?: number; isRemoteControlled: boolean;
  safetyCertifications: string[]; chokingHazard: boolean; smallPartsWarning: boolean; isNonToxic: boolean;
  mrp?: number; warrantyMonths?: number; giftWrapAvailable: boolean; isEidGift: boolean; isBirthdayGift: boolean; notes?: string;
}

/** Slim toy details of one catalog item (GET /toystore/products/facts). */
export interface ToyFact {
  productId: string; categoryType?: string | null; ageGroup: string; ageGroups: string[]; ageMinYears?: number | null; ageMaxYears?: number | null; genderTarget: string;
  brand?: string | null; characterFranchise?: string | null; isEducational: boolean; requiresBatteries: boolean; batteriesIncluded: boolean;
  batteryType?: string | null; batteryQuantity?: number | null; isRemoteControlled: boolean; chokingHazard: boolean; smallPartsWarning: boolean;
  safetyCertifications: string[]; isEidGift: boolean; isBirthdayGift: boolean; giftWrapAvailable: boolean;
}

export interface GiftWrap { id: string; name: string; price: number; isActive: boolean }

export interface ForAgeItem {
  productId: string; categoryType?: string; brand?: string; isEducational: boolean; chokingHazard: boolean; requiresBatteries: boolean; batteriesIncluded: boolean;
  batteryType?: string; batteryQuantity?: number; product: { id: string; name: string; price: number; stock: number; images?: Array<{ url: string }> };
}

export interface SafetyRow {
  id: string; productId: string; ageGroup?: string; ageMinYears?: number | null; ageMaxYears?: number | null;
  riskFlags: Array<'UNDER_THREE' | 'CHOKING_HAZARD' | 'SMALL_PARTS' | 'NOT_CERTIFIED_NON_TOXIC' | 'NO_SAFETY_CERTIFICATION'>;
  product: { id: string; name: string; sku?: string | null; price: number; stock: number };
}

export const toyProductsApi = {
  upsert: (data: Record<string, unknown>) => post<ToyProductProfile>('/toystore/products', data),
  forAge: (params: { years: number; gender?: string; maxBudget?: number; educationalOnly?: boolean; safeOnly?: boolean }) => get<{ items: ForAgeItem[] }>('/toystore/products/for-age', params),
  facts: () => get<ToyFact[]>('/toystore/products/facts'),
  giftWrap: () => get<GiftWrap | null>('/toystore/products/gift-wrap'),
  setGiftWrap: (body: { price: number; name?: string }) => post<GiftWrap>('/toystore/products/gift-wrap', body),
  safetyReview: () => get<SafetyRow[]>('/toystore/products/safety-review'),
  byProduct: (productId: string) => get<ToyProductProfile | null>(`/toystore/products/by-product/${productId}`),
  variantStockSplit: (productId: string) => post<unknown>(`/toystore/products/${productId}/variant-stock-split`),
};

/* ───────────── dashboard ───────────── */

export interface UpcomingBirthday { id: string; childName: string; customerName?: string | null; customerPhone?: string | null; budgetRange?: string | null; lastGiftGiven?: string | null; daysUntil: number; turningAge: number }
export interface ToystoreOverview {
  totals?: { totalProducts?: number; educationalCount?: number; activeGiftPacks?: number; giftPacksSold?: number; birthdaysRegistered?: number };
  alerts?: { safetyIssues?: number; batteryUpsellOpportunities?: number; birthdaysThisWeek?: number; birthdaysThisMonth?: number };
  upcomingBirthdays?: UpcomingBirthday[];
  topGiftPacks?: Array<{ id: string; name: string; itemCount?: number; totalSold?: number; savingsPct?: number; giftPackPrice?: number }>;
  byAgeGroup?: Array<{ ageGroup: string; count: number; revenue: number }>;
}

export const toystoreDashboardApi = {
  overview: () => get<ToystoreOverview>('/toystore/dashboard/overview'),
};
