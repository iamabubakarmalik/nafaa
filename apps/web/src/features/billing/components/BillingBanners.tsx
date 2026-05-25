import { TrialBanner } from './TrialBanner';
import { PendingUpgradeBanner } from './PendingUpgradeBanner';

export function BillingBanners() {
  return (
    <>
      <PendingUpgradeBanner />
      <TrialBanner />
    </>
  );
}
