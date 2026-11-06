/**
 * App Store rule (guidelines 3.1.1 and 3.1.3): on iOS the app must not offer,
 * price or link to buying a Nafaa plan outside Apple's in-app purchase. Plans
 * are bought on the web or Android; the iOS app shows the plan, usage and
 * bills read-only. Every buy / upgrade / renew / pay entry point checks this
 * one helper, so `grep canPurchaseInApp` lists them all:
 *
 *   modules/billing        BillingScreen (Plans tab), PlanSummary, UsageMeters,
 *                          InvoiceScreen, PayInvoiceScreen, meta (status hints)
 *   modules/shell          SubscriptionGate (plan ended), nav-config (Plan, Referrals)
 *   modules/home           trial banner
 *   modules/distribution   DistributionGate, DistributionSettingsScreen
 *   modules/help           billing help topic
 *   modules/notifications  pay links open the bill instead
 */

import { Platform } from 'react-native';
import { msg } from '@/core/i18n';

/** False on iOS: no purchase, upgrade, renew or payment actions, links or prices. */
export function canPurchaseInApp(): boolean {
  return Platform.OS !== 'ios';
}

/** Neutral text for iOS when the plan is not active (no prices, no links). */
export const PLAN_INACTIVE_TEXT = msg('Aap ka plan active nahi hai. Account ke malik ya Nafaa support se rabta karein.');

/** Neutral text for iOS where a feature needs a bigger plan. */
export const PLAN_FEATURE_TEXT = msg('Ye feature aap ke maujooda plan me shamil nahi hai. Account ke malik ya Nafaa support se rabta karein.');

/**
 * App Store rule (guideline 3.1.1, review of 2.0.1): on iOS a business account
 * is not created in the app, because the account leads to a plan bought
 * outside the app. iOS only signs in to existing accounts; new businesses join
 * on the web or Android. Entry points: LoginScreen footer, the /register and
 * /google-complete routes, and the Google / Apple sign-in hooks.
 */
export function canRegisterInApp(): boolean {
  return Platform.OS !== 'ios';
}

/** iOS: Google or Apple sign-in found no existing Nafaa account. */
export const NO_ACCOUNT_TEXT = msg('Is email se koi Nafaa account nahi mila. Apne business ke malik ya admin se login details lein.');
