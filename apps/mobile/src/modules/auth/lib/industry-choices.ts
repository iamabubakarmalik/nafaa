/**
 * Industry cards for sign-up and onboarding (same list, order and tailoring
 * as the web modules/auth/lib/industry-choices.ts).
 *
 * The sign-up picks wait on the device until the account exists, then
 * `setUpNewAccount()` applies them. Order matters: the free trial is created
 * by the first read of the current subscription, and until it exists the API
 * refuses business calls with 402 — so that read goes first, otherwise the
 * industry save fails silently.
 */

import type { LucideIcon } from 'lucide-react-native';
import { msg, t } from '@/core/i18n';
import { apiClient } from '@/core/api/client';
import { useAuthStore } from '@/core/auth/store';
import { cleanModels } from '@/core/business-models';
import { kv } from '@/core/storage/kv';
import { industryIdentity, PACK_TO_BUSINESS_TYPE } from '@/design';

export const GENERAL_TYPE = 'GENERAL';
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

const SELLS_TO_SHOPS: Tailored = [
  ['distribution', msg('FMCG distributor'), 'kiryana fmcg drinks snacks supply company'],
  ['retail', msg('Kiryana wholesale'), 'grocery general store wholesale'],
  ['pharmacy', msg('Pharma / medicine'), 'pharma medicine dawai'],
  ['hardware', msg('Hardware & paint'), 'paint sanitary electric'],
  ['garments', msg('Kapra / textile'), 'cloth textile clothing fabric'],
  ['electronics', msg('Electronics'), 'gadgets'],
  ['cosmetics', msg('Cosmetics'), 'beauty skincare'],
  ['agri', msg('Agri: khaad, beej'), 'fertilizer seeds pesticide'],
  ['autoparts', msg('Auto parts'), 'spare parts'],
  ['mobile', msg('Mobile & accessories'), 'phone'],
  ['bookstore', msg('Stationery'), 'books paper'],
];

const SELLS_ONLINE: Tailored = [
  ['garments', msg('Clothing / fashion'), 'kapre clothes fashion'],
  ['cosmetics', msg('Cosmetics & skincare'), 'beauty makeup'],
  ['electronics', msg('Electronics & gadgets'), 'gadgets'],
  ['mobile', msg('Mobile & accessories'), 'phone covers chargers'],
  ['shoe', msg('Shoes & bags'), 'joote bags'],
  ['jewelry', msg('Jewellery'), 'artificial gold'],
  ['toystore', msg('Toys & baby'), 'kids baby'],
  ['retail', msg('Grocery / general'), 'kiryana'],
];

export function industryChoices(models?: readonly string[]): IndustryChoice[] {
  const list = PACK_TO_BUSINESS_TYPE.map(([packId, businessType]) => {
    const look = industryIdentity(packId);
    return { packId, businessType, label: t(look.label), hint: `${look.label} ${businessType}`, icon: look.icon, color: look.color };
  });
  const picked = cleanModels(models);
  const tailored = picked.includes('WHOLESALE') || picked.includes('DISTRIBUTION') ? SELLS_TO_SHOPS : picked.includes('ONLINE') ? SELLS_ONLINE : null;
  let ordered: Array<IndustryChoice & { packId?: string }> = list;
  if (tailored) {
    const front: IndustryChoice[] = [];
    for (const [packId, label, keywords] of tailored) {
      const c = list.find((x) => x.packId === packId);
      if (c) front.push({ ...c, label: t(label), hint: `${c.label} ${c.hint ?? ''} ${keywords}` });
    }
    ordered = [...front, ...list.filter((c) => !tailored.some(([id]) => id === c.packId))];
  }
  const general = industryIdentity('standard');
  return [
    ...ordered.map(({ businessType, label, hint, icon, color }) => ({ businessType, label, hint, icon, color })),
    { businessType: GENERAL_TYPE, label: t('Koi aur kaam'), hint: 'General store other kiryana', icon: general.icon, color: general.color },
  ];
}

// ─── Carrying the sign-up picks past account creation ───────────

const SIGNUP_KEY = 'nafaa.signup-picks';

interface SignupPicks {
  businessType: string | null;
  models: string[] | null;
}

export function rememberSignupPicks(picks: SignupPicks) {
  kv.set(SIGNUP_KEY, picks);
}
export const readSignupPicks = (): SignupPicks => kv.get<SignupPicks>(SIGNUP_KEY, { businessType: null, models: null });
export const clearSignupPicks = () => kv.remove(SIGNUP_KEY);

interface BusinessConfig {
  businessType: string;
  features: Record<string, boolean>;
  defaultUnit: string;
}

/** Sets a brand-new account up with the sign-up picks (see the note at the top). */
export async function setUpNewAccount(businessType: string | null, models: readonly string[] | null): Promise<void> {
  try {
    await apiClient.get('/subscriptions/current');
  } catch {
    // The saves below may then fail; onboarding asks again.
  }
  if (businessType) {
    try {
      const { data } = await apiClient.post<BusinessConfig>('/onboarding/change-business-type', { businessType });
      useAuthStore.getState().updateTenant({ businessType: data.businessType, businessFeatures: data.features, defaultUnit: data.defaultUnit });
    } catch {
      // Onboarding step 1 sets it.
    }
  }
  const clean = cleanModels(models);
  if (clean.length) {
    try {
      const { data } = await apiClient.put<{ businessModels: string[] }>('/onboarding/business-models', { businessModels: clean });
      useAuthStore.getState().updateTenant({ businessModels: data.businessModels });
    } catch {
      // Onboarding step 1 saves it.
    }
  }
}
