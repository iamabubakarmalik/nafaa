/**
 * Industry cards for sign-up and onboarding.
 *
 * The list comes from the industry registry (only registered packs are
 * offered), the look from the design-system identities, and each card maps to
 * the business-type key the API stores (BUSINESS_TEMPLATES in
 * apps/api/src/modules/onboarding/templates/business-templates.ts).
 * The order below is the order shown: most common shops first. A business
 * that sells to other shops or online sees the industries common for that
 * way of selling first, with labels that fit it (see TAILORED).
 */

import type { LucideIcon } from 'lucide-react';
import { IndustryRegistry } from '@industries/_shared/registry/IndustryRegistry';
import { industryIdentity } from '@/design-system';
import { useAuthStore } from '@core/stores/auth.store';
import { cleanModels } from '@core/lib/business-models';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { subscriptionsApi } from '@modules/billing/subscriptions/api/subscriptions.api';

const PACK_TO_BUSINESS_TYPE: ReadonlyArray<[packId: string, businessType: string]> = [
  ['retail', 'GROCERY'],
  ['pharmacy', 'PHARMACY'],
  ['mobile', 'MOBILE'],
  ['restaurant', 'RESTAURANT'],
  ['garments', 'CLOTHING'],
  ['bakery', 'BAKERY'],
  ['hardware', 'HARDWARE'],
  ['distribution', 'DISTRIBUTOR'],
  ['salon', 'SALON'],
  ['electronics', 'ELECTRONICS'],
  ['appliances', 'APPLIANCES'],
  ['cosmetics', 'COSMETICS'],
  ['shoe', 'SHOE'],
  ['bookstore', 'STATIONERY'],
  ['autoparts', 'AUTO_PARTS'],
  ['meat', 'MEAT'],
  ['dairy', 'DAIRY'],
  ['agri', 'AGRI'],
  ['jewelry', 'JEWELRY'],
  ['clinic', 'CLINIC'],
  ['optical', 'OPTICAL'],
  ['furniture', 'FURNITURE'],
  ['carpet', 'CARPET'],
  ['hotel', 'HOTEL'],
  ['gym', 'GYM'],
  ['services-biz', 'SERVICE'],
  ['florist', 'FLORIST'],
  ['gaming', 'GAMING'],
  ['petshop', 'PETSHOP'],
  ['toystore', 'TOYSTORE'],
  ['sports', 'SPORTS'],
];

/** "Any other shop" card; always last. */
const GENERAL_TYPE = 'GENERAL';

/** How many cards show before "Aur dekhein". */
export const POPULAR_COUNT = 8;

export interface IndustryChoice {
  businessType: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  color: string;
}

type Tailored = ReadonlyArray<[packId: string, label: string, keywords: string]>;

/** Wholesale and distribution: what Pakistani distributors and wholesalers mostly deal in. */
const SELLS_TO_SHOPS: Tailored = [
  ['distribution', 'FMCG distributor', 'kiryana fmcg drinks snacks supply company'],
  ['retail', 'Kiryana wholesale', 'grocery general store wholesale'],
  ['pharmacy', 'Pharma / medicine', 'pharma medicine dawai'],
  ['hardware', 'Hardware & paint', 'paint sanitary electric'],
  ['garments', 'Kapra / textile', 'cloth textile clothing fabric'],
  ['electronics', 'Electronics', 'gadgets'],
  ['cosmetics', 'Cosmetics', 'beauty skincare'],
  ['agri', 'Agri: khaad, beej', 'fertilizer seeds pesticide'],
  ['autoparts', 'Auto parts', 'spare parts'],
  ['mobile', 'Mobile & accessories', 'phone'],
  ['bookstore', 'Stationery', 'books paper'],
];

/** Online sellers: what sells most on Daraz, Shopify, Instagram and WhatsApp. */
const SELLS_ONLINE: Tailored = [
  ['garments', 'Clothing / fashion', 'kapre clothes fashion'],
  ['cosmetics', 'Cosmetics & skincare', 'beauty makeup'],
  ['electronics', 'Electronics & gadgets', 'gadgets'],
  ['mobile', 'Mobile & accessories', 'phone covers chargers'],
  ['shoe', 'Shoes & bags', 'joote bags'],
  ['jewelry', 'Jewellery', 'artificial gold'],
  ['toystore', 'Toys & baby', 'kids baby'],
  ['retail', 'Grocery / general', 'kiryana'],
];

/**
 * Industry cards in the order to show. `models` (how the business sells)
 * moves the industries common for that way of selling to the front.
 */
export function industryChoices(models?: readonly string[]): IndustryChoice[] {
  const list: Array<IndustryChoice & { packId: string }> = [];
  for (const [packId, businessType] of PACK_TO_BUSINESS_TYPE) {
    const pack = IndustryRegistry.get(packId);
    if (!pack) continue;
    const look = industryIdentity(packId);
    list.push({ packId, businessType, label: look.label, hint: pack.shortName ?? pack.name, icon: look.icon, color: look.color });
  }
  const picked = cleanModels(models);
  const tailored = picked.includes('WHOLESALE') || picked.includes('DISTRIBUTION')
    ? SELLS_TO_SHOPS
    : picked.includes('ONLINE') ? SELLS_ONLINE : null;
  let ordered: IndustryChoice[] = list;
  if (tailored) {
    const front: IndustryChoice[] = [];
    for (const [packId, label, keywords] of tailored) {
      const c = list.find((x) => x.packId === packId);
      if (c) front.push({ ...c, label, hint: `${c.label} ${c.hint ?? ''} ${keywords}` });
    }
    ordered = [...front, ...list.filter((c) => !tailored.some(([id]) => id === c.packId))];
  }
  const general = industryIdentity('standard');
  return [
    ...ordered.map(({ businessType, label, hint, icon, color }) => ({ businessType, label, hint, icon, color })),
    { businessType: GENERAL_TYPE, label: 'Koi aur kaam', hint: 'General store other', icon: general.icon, color: general.color },
  ];
}

// ─── Carrying the sign-up pick into onboarding ──────────────────
// Sign-up cannot store the industry itself (the register API has no field
// for it), so the pick waits here until the account exists.

const SIGNUP_INDUSTRY_KEY = 'nafaa.signup-industry';

export function rememberSignupIndustry(businessType: string): void {
  try { sessionStorage.setItem(SIGNUP_INDUSTRY_KEY, businessType); } catch { /* storage blocked */ }
}

export function readSignupIndustry(): string | null {
  try { return sessionStorage.getItem(SIGNUP_INDUSTRY_KEY); } catch { return null; }
}

export function clearSignupIndustry(): void {
  try { sessionStorage.removeItem(SIGNUP_INDUSTRY_KEY); } catch { /* storage blocked */ }
}

/**
 * Sets a brand-new account up with the sign-up picks. The free trial is
 * created on the first read of the current subscription, and until it exists
 * the API refuses the business calls (402), so that read goes first. The two
 * saves run one after the other because both can switch distribution on.
 */
export async function setUpNewAccount(businessType: string | null, models: readonly string[] | null): Promise<void> {
  try { await subscriptionsApi.current(); } catch { /* the saves below then fail quietly; onboarding asks again */ }
  await applySignupIndustry(businessType);
  await applySignupModels(models);
}

/**
 * Saves how the business sells right after sign-up. Onboarding shows the
 * same cards again, so a failure here is not shown.
 */
export async function applySignupModels(models: readonly string[] | null): Promise<void> {
  const clean = cleanModels(models);
  if (!clean.length) return;
  try {
    const saved = await onboardingApi.setBusinessModels(clean);
    useAuthStore.getState().updateTenant({ businessModels: saved.businessModels });
  } catch {
    /* onboarding step 1 saves it */
  }
}

/**
 * Applies the industry picked at sign-up to the new account so the right
 * pack loads even if the owner skips onboarding. Onboarding asks again, so a
 * failure here is not shown.
 */
export async function applySignupIndustry(businessType: string | null): Promise<void> {
  if (!businessType) return;
  try {
    const config = await onboardingApi.changeBusinessType(businessType);
    useAuthStore.getState().updateTenant({
      businessType: config.businessType,
      businessFeatures: config.features,
      defaultUnit: config.defaultUnit,
    });
  } catch {
    /* onboarding step 1 sets it */
  }
}
