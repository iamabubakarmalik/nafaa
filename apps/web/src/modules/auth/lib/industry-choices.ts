/**
 * Industry cards for sign-up and onboarding.
 *
 * The list comes from the industry registry (only registered packs are
 * offered), the look from the design-system identities, and each card maps to
 * the business-type key the API stores (BUSINESS_TEMPLATES in
 * apps/api/src/modules/onboarding/templates/business-templates.ts).
 * The order below is the order shown: most common shops first.
 */

import type { LucideIcon } from 'lucide-react';
import { IndustryRegistry } from '@industries/_shared/registry/IndustryRegistry';
import { industryIdentity } from '@/design-system';
import { useAuthStore } from '@core/stores/auth.store';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';

const PACK_TO_BUSINESS_TYPE: ReadonlyArray<[packId: string, businessType: string]> = [
  ['retail', 'GROCERY'],
  ['pharmacy', 'PHARMACY'],
  ['mobile', 'MOBILE'],
  ['restaurant', 'RESTAURANT'],
  ['garments', 'CLOTHING'],
  ['bakery', 'BAKERY'],
  ['hardware', 'HARDWARE'],
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

export function industryChoices(): IndustryChoice[] {
  const list: IndustryChoice[] = [];
  for (const [packId, businessType] of PACK_TO_BUSINESS_TYPE) {
    const pack = IndustryRegistry.get(packId);
    if (!pack) continue;
    const look = industryIdentity(packId);
    list.push({ businessType, label: look.label, hint: pack.shortName ?? pack.name, icon: look.icon, color: look.color });
  }
  const general = industryIdentity('standard');
  list.push({ businessType: GENERAL_TYPE, label: 'Koi aur dukaan', hint: 'General store', icon: general.icon, color: general.color });
  return list;
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
