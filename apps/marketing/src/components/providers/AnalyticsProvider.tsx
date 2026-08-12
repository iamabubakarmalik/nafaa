'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { GoogleAnalytics, GoogleTagManager } from '@next/third-parties/google';
import Script from 'next/script';
import { GA_ID, GTM_ID, pageview, setConsentDefaults, grantConsent } from '@/lib/analytics/gtag';

export function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track SPA route changes
  useEffect(() => {
    if (pathname) pageview(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));
  }, [pathname, searchParams]);

  // Consent Mode v2 — denied by default, grant if user previously accepted
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;
    setConsentDefaults();
    if (localStorage.getItem('nafaa-cookies') === 'all') grantConsent();
  }, [pathname]);

  return (
    <>
      {GTM_ID && <GoogleTagManager gtmId={GTM_ID} />}
      {GA_ID && <GoogleAnalytics gaId={GA_ID} />}
    </>
  );
}
