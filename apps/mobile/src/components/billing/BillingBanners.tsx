import { TrialBanner } from './TrialBanner';
import { PendingUpgradeBanner } from './PendingUpgradeBanner';
import { TrialExpiredModal } from './TrialExpiredModal';

/**
 * Stacked banners for billing-related notifications.
 * Order matters:
 * 1. TrialExpiredModal (highest priority — soft banner now)
 * 2. PendingUpgradeBanner (active upgrade in progress)
 * 3. TrialBanner (active trial countdown)
 */
export function BillingBanners() {
  return (
    <>
      <TrialExpiredModal />
      <PendingUpgradeBanner />
      <TrialBanner />
    </>
  );
}
