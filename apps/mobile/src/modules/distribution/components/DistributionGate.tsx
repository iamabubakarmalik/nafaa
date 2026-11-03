/**
 * Wraps every manager screen. Explains why the module is unavailable while
 * the plan lacks the feature or the switch is off, instead of showing a
 * screen full of refused requests.
 */

import { router } from 'expo-router';
import { Lock, Settings, Truck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { t } from '@/core/i18n';
import { PLAN_FEATURE_TEXT, canPurchaseInApp } from '@/core/platform/purchases';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, EmptyState, Screen, SkeletonRows } from '@/design';
import { useDistributionState } from '../hooks/useDistribution';

export function DistributionGate({ children, title }: { children: ReactNode; title?: string }) {
  const { state, data } = useDistributionState();
  const can = usePermission();
  if (state === 'on') return <>{children}</>;
  const head = title ?? t('Distribution');
  if (state === 'loading') return <Screen title={head}><SkeletonRows count={5} /></Screen>;
  const plan = state === 'plan';
  // iOS: no link to plans (App Store rule).
  const canFix = plan ? can(P.BILLING_VIEW) && canPurchaseInApp() : can(P.SETTINGS_EDIT);
  return (
    <Screen title={head}>
      <EmptyState
        icon={plan ? Lock : Truck}
        title={plan ? t('Aap ke plan{{value}} me Distribution shamil nahi', { value: data?.access.planName ? ` (${data.access.planName})` : '' }) : t('Distribution abhi band hai')}
        message={plan ? (canPurchaseInApp() ? t('Aap ka setup tayyar hai — plan upgrade karte hi ye sab yahin chalu ho jayega:') : t(PLAN_FEATURE_TEXT)) : t('Settings me Distribution on karein — phir orders, load sheets aur recoveries yahan dikhenge.')}
        action={canFix
          ? <Button icon={plan ? undefined : Settings} onPress={() => router.push(plan ? '/billing' : '/settings')}>{plan ? t('See plans') : t('Settings kholein')}</Button>
          : undefined}
      />
    </Screen>
  );
}
