import { TrialBanner } from './TrialBanner';
import { PendingUpgradeBanner } from './PendingUpgradeBanner';
import { PastDueBanner } from './PastDueBanner';

export function BillingBanners() {
  return (
    <>
      <PastDueBanner />
      <PendingUpgradeBanner />
      <TrialBanner />
    </>
  );
}
