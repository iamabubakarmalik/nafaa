/**
 * Industry packs, loaded on demand. Each pack registers its parts (POS config,
 * product editor, receipt rows, sales extras ...) when it loads. Only the
 * signed-in shop's pack is needed, so `startIndustryPacks()` (called from
 * app/_layout.tsx once the session is read) loads that one pack and loads
 * again when the shop's business type changes (sign-in, workspace switch,
 * onboarding). Packs mirror apps/web/src/industries/<id>.
 *
 * A new pack: add its folder and one line to PACKS.
 */

import { useAuthStore } from '@/core/auth/store';
import { industryIdForBusinessType } from '@/design/industries/businessTypes';

/* eslint-disable @typescript-eslint/no-require-imports */
const PACKS: Record<string, () => unknown> = {
  restaurant: () => require('./restaurant'),
  bakery: () => require('./bakery'),
  retail: () => require('./retail'),
  pharmacy: () => require('./pharmacy'),
  cosmetics: () => require('./cosmetics'),
  garments: () => require('./garments'),
  shoe: () => require('./shoe'),
  sports: () => require('./sports'),
  toystore: () => require('./toystore'),
  bookstore: () => require('./bookstore'),
  florist: () => require('./florist'),
  petshop: () => require('./petshop'),
  jewelry: () => require('./jewelry'),
  optical: () => require('./optical'),
  agri: () => require('./agri'),
  appliances: () => require('./appliances'),
  carpet: () => require('./carpet'),
  mobile: () => require('./mobile'),
  dairy: () => require('./dairy'),
  electronics: () => require('./electronics'),
  hardware: () => require('./hardware'),
  furniture: () => require('./furniture'),
  meat: () => require('./meat'),
  autoparts: () => require('./autoparts'),
  salon: () => require('./salon'),
  gym: () => require('./gym'),
  hotel: () => require('./hotel'),
  gaming: () => require('./gaming'),
  clinic: () => require('./clinic'),
  'services-biz': () => require('./services-biz'),
};
/* eslint-enable @typescript-eslint/no-require-imports */

/** Industry ids that share another pack (registered as aliases inside it). */
const ALIASES: Record<string, string> = { services: 'services-biz' };

const loaded = new Set<string>();

/** Loads (and so registers) one industry pack. Unknown ids and repeats do nothing. */
export function loadIndustryPack(industryId: string | null | undefined): void {
  const id = industryId ? ALIASES[industryId] ?? industryId : null;
  if (!id || loaded.has(id) || !PACKS[id]) return;
  loaded.add(id);
  PACKS[id]();
}

/** Industry ids that have a pack (tests and tooling). */
export const INDUSTRY_PACK_IDS = Object.keys(PACKS);

let started = false;

/** Loads the current shop's pack now and whenever the business type changes. */
export function startIndustryPacks(): void {
  if (started) return;
  started = true;
  const load = (businessType: string | null | undefined) => loadIndustryPack(industryIdForBusinessType(businessType));
  load(useAuthStore.getState().tenant?.businessType);
  // Zustand calls this synchronously inside setState, so the pack is
  // registered before React renders anything for the new shop.
  useAuthStore.subscribe((s, prev) => {
    if (s.tenant?.businessType !== prev.tenant?.businessType) load(s.tenant?.businessType);
  });
}
