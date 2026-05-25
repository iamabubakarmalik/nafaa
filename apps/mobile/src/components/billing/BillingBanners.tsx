import { View } from 'react-native';
import { TrialBanner } from './TrialBanner';
import { PendingUpgradeBanner } from './PendingUpgradeBanner';

export function BillingBanners() {
  return (
    <View>
      <PendingUpgradeBanner />
      <TrialBanner />
    </View>
  );
}
