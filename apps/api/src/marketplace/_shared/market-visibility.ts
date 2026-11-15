/**
 * Which shops customers may see on the Market.
 *
 * A shop is visible when the owner has published it. When the platform
 * setting `requireApproval` is on, it must also be approved by Nafaa staff
 * (`verifiedAt` set from the admin panel). Every customer-facing shop,
 * home and product query uses these helpers so the rule lives in one place.
 */
import type { MarketPlatformConfig } from './market-config';

type ApprovalRule = Pick<MarketPlatformConfig, 'requireApproval'>;

/** Where-clause fragment for ShopMarketplaceProfile: published (and approved when required). */
export function visibleShopWhere(cfg: ApprovalRule): { isListedOnMarketplace: true; verifiedAt?: { not: null } } {
  return cfg.requireApproval ? { isListedOnMarketplace: true, verifiedAt: { not: null } } : { isListedOnMarketplace: true };
}

/** Same rule for a profile already loaded (detail pages). */
export function isShopVisible(profile: { isListedOnMarketplace: boolean; verifiedAt?: Date | null } | null | undefined, cfg: ApprovalRule): boolean {
  if (!profile?.isListedOnMarketplace) return false;
  return !cfg.requireApproval || !!profile.verifiedAt;
}
