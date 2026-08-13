'use client';

import { ANALYTICS } from '../config';

/**
 * Google Ads conversion tracking
 * GA4 se linked hone chahiye Google Ads mein for automatic import
 */

export function trackGoogleAdsConversion(
  conversionLabel: string,
  value?: number,
  currency = 'PKR',
  transactionId?: string,
) {
  if (typeof window === 'undefined' || !window.gtag || !conversionLabel) return;

  window.gtag('event', 'conversion', {
    send_to: conversionLabel,
    value,
    currency,
    transaction_id: transactionId,
  });
}

export const googleAds = {
  signup: () => trackGoogleAdsConversion(ANALYTICS.googleAds.conversions.signup),
  lead: (value?: number) => trackGoogleAdsConversion(ANALYTICS.googleAds.conversions.lead, value),
  demo: () => trackGoogleAdsConversion(ANALYTICS.googleAds.conversions.demo),
  purchase: (value: number, txId?: string) =>
    trackGoogleAdsConversion(ANALYTICS.googleAds.conversions.purchase, value, 'PKR', txId),
};
